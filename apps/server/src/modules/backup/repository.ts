import { prisma } from '../../infra/db.js';
import type { Prisma } from '../../generated/prisma/client.js';

export type JobKind = 'export' | 'import' | 'backup' | 'restore';
export type JobStatus = 'running' | 'success' | 'failed';

export const backupRepository = {
  /** Все привычки пользователя с расписанием и отметками — для экспорта. */
  loadUserHabits(userId: string) {
    return prisma.habit.findMany({
      where: { userId },
      include: {
        schedule: true,
        entries: { orderBy: { entryDate: 'asc' } },
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  },

  createJob(data: {
    userId: string;
    kind: JobKind;
    fileName?: string | null;
    sizeBytes?: number | null;
    checksum?: string | null;
  }) {
    return prisma.backupJob.create({
      data: {
        createdBy: data.userId,
        kind: data.kind,
        status: 'running',
        fileName: data.fileName ?? null,
        sizeBytes: data.sizeBytes ?? null,
        checksum: data.checksum ?? null,
      },
    });
  },

  finishJob(
    jobId: number,
    data: { status: JobStatus; sizeBytes?: number; checksum?: string; error?: string },
  ) {
    return prisma.backupJob.update({
      where: { id: jobId },
      data: {
        status: data.status,
        finishedAt: new Date(),
        ...(data.sizeBytes === undefined ? {} : { sizeBytes: data.sizeBytes }),
        ...(data.checksum === undefined ? {} : { checksum: data.checksum }),
        ...(data.error === undefined ? {} : { error: data.error.slice(0, 1000) }),
      },
    });
  },

  listJobs(userId: string, take: number) {
    return prisma.backupJob.findMany({
      where: { createdBy: userId },
      orderBy: { startedAt: 'desc' },
      take,
    });
  },

  countJobs(userId: string) {
    return prisma.backupJob.count({ where: { createdBy: userId } });
  },

  writeAudit(data: {
    userId: string;
    action: string;
    entity?: string;
    entityId?: string;
    payload?: Prisma.InputJsonValue;
    ip?: string;
  }) {
    return prisma.auditLog.create({
      data: {
        userId: data.userId,
        action: data.action,
        entity: data.entity ?? 'backup',
        entityId: data.entityId ?? null,
        payload: data.payload,
        ip: data.ip ?? null,
      },
    });
  },
};

export type BackupRepository = typeof backupRepository;
export type BackupJobRecord = Awaited<ReturnType<typeof backupRepository.createJob>>;
