import { pino } from 'pino';

import { config } from '../config/index.js';

/**
 * Единый логгер приложения.
 * В development — человекочитаемый вывод, в production — JSON для сборщиков логов.
 */
export const logger = pino({
  level: config.LOG_LEVEL,
  base: { service: 'habit-tracker-api', env: config.NODE_ENV },
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'res.headers["set-cookie"]',
      'password',
      '*.password',
      '*.passwordHash',
      '*.token',
      '*.refreshToken',
    ],
    censor: '[REDACTED]',
  },
  ...(config.isDev
    ? {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss.l',
            ignore: 'pid,hostname,service,env',
          },
        },
      }
    : {}),
});
