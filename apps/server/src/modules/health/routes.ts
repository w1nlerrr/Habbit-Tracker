import { Router } from 'express';

import { checkDatabase, prisma } from '../../infra/db.js';

export const healthRouter = Router();

/**
 * GET /api/health — проверка живучести API и доступности базы данных.
 * Используется мониторингом и smoke-тестами после развёртывания.
 */
healthRouter.get('/health', async (_req, res) => {
  const database = await checkDatabase();

  let postgresVersion: string | null = null;
  if (database.ok) {
    try {
      const rows = await prisma.$queryRaw<Array<{ version: string }>>`SELECT version() AS version`;
      postgresVersion = rows[0]?.version ?? null;
    } catch {
      postgresVersion = null;
    }
  }

  res.status(database.ok ? 200 : 503).json({
    status: database.ok ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    uptimeSec: Math.round(process.uptime()),
    database,
    postgresVersion,
  });
});
