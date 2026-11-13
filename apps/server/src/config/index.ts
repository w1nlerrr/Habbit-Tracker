import { config as loadEnv } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

/**
 * .env лежит в корне монорепозитория.
 * Путь считается от этого файла, поэтому одинаково работает и в src, и в dist.
 */
loadEnv({
  path: fileURLToPath(new URL('../../../../.env', import.meta.url)),
  quiet: true,
});

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().min(1).default('127.0.0.1'),
  PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),
  CORS_ORIGIN: z.string().min(1).default('http://localhost:5173'),
  TRUST_PROXY: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL обязателен (роль ht_app)'),
  MIGRATE_DATABASE_URL: z.string().optional(),

  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET должен быть не короче 32 символов'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET должен быть не короче 32 символов'),
  ACCESS_TOKEN_TTL: z.string().default('15m'),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).max(365).default(30),

  BACKUP_DIR: z.string().default('./data/backups'),
  BACKUP_KEEP_DAYS: z.coerce.number().int().min(1).max(3650).default(14),

  /** Раздавать ли собранный SPA с API-сервера (production / launcher). */
  SERVE_CLIENT: z.enum(['true', 'false']).optional(),

  /**
   * Флаг Secure для refresh-cookie.
   * По умолчанию включён в production; для локального HTTP-запуска ставится false.
   */
  COOKIE_SECURE: z.enum(['true', 'false']).optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // Fail-fast: приложение не должно стартовать с неполной конфигурацией.
  console.error('❌ Некорректная конфигурация окружения:');
  for (const issue of parsed.error.issues) {
    console.error(`   • ${issue.path.join('.') || '(корень)'}: ${issue.message}`);
  }
  process.exit(1);
}

export const config = Object.freeze({
  ...parsed.data,
  isDev: parsed.data.NODE_ENV === 'development',
  isTest: parsed.data.NODE_ENV === 'test',
  isProd: parsed.data.NODE_ENV === 'production',
  serveClient:
    parsed.data.SERVE_CLIENT === undefined
      ? parsed.data.NODE_ENV === 'production'
      : parsed.data.SERVE_CLIENT === 'true',
  cookieSecure:
    parsed.data.COOKIE_SECURE === undefined
      ? parsed.data.NODE_ENV === 'production'
      : parsed.data.COOKIE_SECURE === 'true',
});

export type AppConfig = typeof config;
