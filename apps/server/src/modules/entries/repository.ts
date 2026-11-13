import { prisma } from '../../infra/db.js';
import type { StatsData } from '../habits/repository.js';

export type UpsertEntryData = {
  habitId: string;
  userId: string;
  entryDate: Date;
  note: string | null;
  source: string;
  stats: StatsData;
};

export const entriesRepository = {
  listForHabit(habitId: string, from: Date, to: Date) {
    return prisma.habitEntry.findMany({
      where: { habitId, entryDate: { gte: from, lte: to } },
      orderBy: { entryDate: 'asc' },
    });
  },

  listDatesForHabit(habitId: string) {
    return prisma.habitEntry.findMany({
      where: { habitId },
      select: { entryDate: true },
      orderBy: { entryDate: 'asc' },
    });
  },

  /** Отметки пользователя за период — используется статистикой. */
  listForUserInRange(userId: string, from: Date, to: Date) {
    return prisma.habitEntry.findMany({
      where: { userId, entryDate: { gte: from, lte: to } },
      select: { habitId: true, entryDate: true },
    });
  },

  findOne(habitId: string, entryDate: Date) {
    return prisma.habitEntry.findUnique({
      where: { habitId_entryDate: { habitId, entryDate } },
    });
  },

  /**
   * Идемпотентная отметка + обновление кэша статистики в одной транзакции.
   * Повторный вызов на ту же дату не создаёт дубль (UNIQUE(habit_id, entry_date)).
   */
  upsertAndReplaceStats(data: UpsertEntryData) {
    return prisma.$transaction(async (tx) => {
      const entry = await tx.habitEntry.upsert({
        where: {
          habitId_entryDate: {
            habitId: data.habitId,
            entryDate: data.entryDate,
          },
        },
        create: {
          habitId: data.habitId,
          userId: data.userId,
          entryDate: data.entryDate,
          note: data.note,
          source: data.source,
        },
        update: { note: data.note },
      });

      await tx.habitStats.upsert({
        where: { habitId: data.habitId },
        create: { habitId: data.habitId, ...data.stats },
        update: data.stats,
      });

      return entry;
    });
  },

  /** Снятие отметки (идемпотентно) + пересчёт статистики в одной транзакции. */
  deleteAndReplaceStats(data: { habitId: string; entryDate: Date; stats: StatsData }) {
    return prisma.$transaction(async (tx) => {
      const result = await tx.habitEntry.deleteMany({
        where: { habitId: data.habitId, entryDate: data.entryDate },
      });

      await tx.habitStats.upsert({
        where: { habitId: data.habitId },
        create: { habitId: data.habitId, ...data.stats },
        update: data.stats,
      });

      return result.count;
    });
  },
};

export type EntriesRepository = typeof entriesRepository;
