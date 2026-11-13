import { PrismaPg } from '@prisma/adapter-pg';

import { config } from '../config/index.js';
import { PrismaClient } from '../generated/prisma/client.js';
import { logger } from './logger.js';

/**
 * Подключение к PostgreSQL.
 * Используется роль ht_app с минимальными правами (только DML, без DDL).
 */
const adapter = new PrismaPg(
  {
    connectionString: config.DATABASE_URL,
    max: 10,
    application_name: 'habit-tracker-api',
  },
  { schema: 'public' },
);

export const prisma = new PrismaClient({ adapter });

export type DatabaseHealth = {
  ok: boolean;
  latencyMs: number;
  error?: string;
};

/** Проверка доступности БД для /api/health. */
export async function checkDatabase(): Promise<DatabaseHealth> {
  const startedAt = performance.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { ok: true, latencyMs: Math.round(performance.now() - startedAt) };
  } catch (error) {
    logger.error({ err: error }, 'Проверка доступности БД не удалась');
    return {
      ok: false,
      latencyMs: Math.round(performance.now() - startedAt),
      error: error instanceof Error ? error.message : 'unknown error',
    };
  }
}

/** Аккуратное закрытие соединений при остановке приложения. */
export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
}
