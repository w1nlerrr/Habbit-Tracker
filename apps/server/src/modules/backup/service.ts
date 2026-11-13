import { createHash } from 'node:crypto';

import type {
  BackupFileInput,
  BackupImportInput,
  BackupImportResult,
  BackupJobDto,
} from '@habit/shared';

import { parseIsoDate, toIsoDate, todayInTimezone } from '../../domain/dates.js';
import { normalizeWeekdays } from '../../domain/schedule.js';
import { computeHabitStatistics } from '../../domain/streak.js';
import { prisma } from '../../infra/db.js';
import { getActiveUser } from '../users/service.js';
import { backupRepository, type BackupJobRecord } from './repository.js';

export type ExportResult = {
  json: string;
  fileName: string;
  checksum: string;
  sizeBytes: number;
};

function toJobDto(job: BackupJobRecord): BackupJobDto {
  return {
    id: job.id,
    kind: job.kind,
    status: job.status,
    fileName: job.fileName,
    sizeBytes: job.sizeBytes,
    checksum: job.checksum,
    startedAt: job.startedAt.toISOString(),
    finishedAt: job.finishedAt ? job.finishedAt.toISOString() : null,
    error: job.error,
  };
}

export const backupService = {
  /** Формирует JSON-резервную копию данных пользователя и фиксирует операцию. */
  async exportUserData(userId: string): Promise<ExportResult> {
    const user = await getActiveUser(userId);
    const today = todayInTimezone(user.timezone);
    const habits = await backupRepository.loadUserHabits(userId);

    const payload: BackupFileInput = {
      format: 'habit-tracker-backup',
      version: 1,
      exportedAt: new Date().toISOString(),
      habits: habits.map((habit) => ({
        title: habit.title,
        description: habit.description,
        color: habit.color,
        icon: habit.icon,
        frequency: habit.frequency,
        startDate: toIsoDate(habit.startDate),
        sortOrder: habit.sortOrder,
        archivedAt: habit.archivedAt ? habit.archivedAt.toISOString() : null,
        weekdays: habit.schedule.map((item) => item.weekday).sort((a, b) => a - b),
        entries: habit.entries.map((entry) => ({
          date: toIsoDate(entry.entryDate),
          note: entry.note,
          source: entry.source === 'import' ? 'import' : 'manual',
        })),
      })),
    };

    const json = JSON.stringify(payload, null, 2);
    const sizeBytes = Buffer.byteLength(json, 'utf8');
    const checksum = createHash('sha256').update(json).digest('hex');
    const fileName = `habit-tracker-backup-${today}.json`;

    const job = await backupRepository.createJob({
      userId,
      kind: 'export',
      fileName,
      sizeBytes,
      checksum,
    });
    await backupRepository.finishJob(job.id, { status: 'success', sizeBytes, checksum });

    await backupRepository.writeAudit({
      userId,
      action: 'backup.export',
      entityId: String(job.id),
      payload: { habits: payload.habits.length, sizeBytes, checksum },
    });

    return { json, fileName, checksum, sizeBytes };
  },

  /** Импорт резервной копии: replace — заменить данные, merge — добавить новые. */
  async importUserData(
    userId: string,
    input: BackupImportInput,
  ): Promise<BackupImportResult> {
    const user = await getActiveUser(userId);
    const today = todayInTimezone(user.timezone);
    const sizeBytes = Buffer.byteLength(JSON.stringify(input.data), 'utf8');

    const job = await backupRepository.createJob({
      userId,
      kind: 'import',
      fileName: `import-${input.mode}.json`,
      sizeBytes,
    });

    try {
      const result = await prisma.$transaction(
        async (tx) => {
          if (input.mode === 'replace') {
            await tx.habit.deleteMany({ where: { userId } });
          }

          const existing = await tx.habit.findMany({
            where: { userId, archivedAt: null },
            select: { title: true },
          });
          const existingTitles = new Set(existing.map((item) => item.title.toLowerCase()));

          let imported = 0;
          let skipped = 0;

          for (const [index, habit] of input.data.habits.entries()) {
            const titleKey = habit.title.toLowerCase();
            if (input.mode === 'merge' && existingTitles.has(titleKey)) {
              skipped += 1;
              continue;
            }

            const weekdays = normalizeWeekdays(habit.weekdays, habit.frequency);
            const startDate = habit.startDate;

            const created = await tx.habit.create({
              data: {
                userId,
                title: habit.title,
                description: habit.description ?? null,
                color: habit.color,
                icon: habit.icon,
                frequency: habit.frequency,
                startDate: parseIsoDate(startDate),
                sortOrder: habit.sortOrder ?? index,
                archivedAt: habit.archivedAt ? new Date(habit.archivedAt) : null,
                schedule: {
                  create: weekdays.map((weekday) => ({ weekday })),
                },
              },
            });

            // Отметки вне допустимого диапазона отбрасываются, чтобы не нарушить
            // ограничения БД (дата раньше начала привычки или в будущем).
            const validEntries = habit.entries.filter(
              (entry) => entry.date >= startDate && entry.date <= today,
            );

            if (validEntries.length > 0) {
              await tx.habitEntry.createMany({
                data: validEntries.map((entry) => ({
                  habitId: created.id,
                  userId,
                  entryDate: parseIsoDate(entry.date),
                  note: entry.note ?? null,
                  source: 'import',
                })),
              });
            }

            const stats = computeHabitStatistics({
              entryDates: validEntries.map((entry) => entry.date),
              weekdays,
              startDate,
              today,
            });

            await tx.habitStats.create({
              data: {
                habitId: created.id,
                currentStreak: stats.currentStreak,
                longestStreak: stats.longestStreak,
                totalDone: stats.totalDone,
                lastEntryDate: stats.lastEntryDate ? parseIsoDate(stats.lastEntryDate) : null,
              },
            });

            imported += 1;
            existingTitles.add(titleKey);
          }

          return { imported, skipped };
        },
        { timeout: 30_000 },
      );

      await backupRepository.finishJob(job.id, { status: 'success', sizeBytes });

      await backupRepository.writeAudit({
        userId,
        action: 'backup.import',
        entityId: String(job.id),
        payload: { mode: input.mode, imported: result.imported, skipped: result.skipped },
      });

      return { ...result, mode: input.mode };
    } catch (error) {
      await backupRepository.finishJob(job.id, {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Неизвестная ошибка импорта',
      });
      throw error;
    }
  },

  async history(userId: string, take: number): Promise<BackupJobDto[]> {
    await getActiveUser(userId);
    const jobs = await backupRepository.listJobs(userId, take);
    return jobs.map(toJobDto);
  },
};
