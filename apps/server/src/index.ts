import { createApp } from './app.js';
import { config } from './config/index.js';
import { disconnectDatabase } from './infra/db.js';
import { logger } from './infra/logger.js';

const app = createApp();

const server = app.listen(config.PORT, config.HOST, () => {
  logger.info(
    { host: config.HOST, port: config.PORT, env: config.NODE_ENV },
    `API запущен: http://${config.HOST}:${config.PORT}/api/health`,
  );
});

let shuttingDown = false;

async function shutdown(signal: NodeJS.Signals): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, 'Останавливаем сервер…');

  const forceExit = setTimeout(() => {
    logger.error('Не удалось корректно завершить работу за 10 секунд');
    process.exit(1);
  }, 10_000);
  forceExit.unref();

  server.close(async () => {
    try {
      await disconnectDatabase();
      logger.info('Соединение с БД закрыто, завершение работы');
      process.exit(0);
    } catch (error) {
      logger.error({ err: error }, 'Ошибка при закрытии соединения с БД');
      process.exit(1);
    }
  });
}

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => void shutdown(signal));
}

process.on('unhandledRejection', (reason) => {
  logger.error({ err: reason }, 'Необработанный rejected promise');
});

process.on('uncaughtException', (error) => {
  logger.fatal({ err: error }, 'Необработанное исключение — аварийное завершение');
  process.exit(1);
});
