import { config as loadEnv } from 'dotenv';
import { defineConfig } from 'prisma/config';

// .env лежит в корне монорепозитория; npm-скрипты запускаются из apps/server
loadEnv({ path: '../../.env' });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // Миграции выполняются владельцем схемы (ht_owner), а не рабочим пользователем БД.
    url: process.env.MIGRATE_DATABASE_URL ?? process.env.DATABASE_URL,
  },
});
