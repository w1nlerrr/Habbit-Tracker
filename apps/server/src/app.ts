import { randomUUID } from 'node:crypto';

import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';

import { API_PREFIX } from '@habit/shared';

import { config } from './config/index.js';
import { logger } from './infra/logger.js';
import { errorHandler } from './middleware/error-handler.js';
import { notFound } from './middleware/not-found.js';
import { authRouter } from './modules/auth/routes.js';
import { habitsRouter } from './modules/habits/routes.js';
import { healthRouter } from './modules/health/routes.js';

/**
 * Сборка Express-приложения.
 * Вынесена из index.ts, чтобы integration-тесты могли поднимать приложение
 * без реального прослушивания порта.
 */
export function createApp(): express.Express {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', config.TRUST_PROXY ? 1 : false);

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'same-site' } }));
  app.use(
    cors({
      origin: config.CORS_ORIGIN,
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    }),
  );
  app.use(compression());
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  app.use(
    pinoHttp({
      logger,
      genReqId: (req, res) => {
        const headerValue = req.headers['x-request-id'];
        const requestId = (Array.isArray(headerValue) ? headerValue[0] : headerValue) ?? randomUUID();
        res.setHeader('x-request-id', requestId);
        return requestId;
      },
      autoLogging: {
        ignore: (req) => req.url === '/api/health',
      },
    }),
  );

  app.use(
    '/api',
    rateLimit({
      windowMs: 60_000,
      limit: 300,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
      message: {
        error: {
          code: 'RATE_LIMITED',
          message: 'Слишком много запросов. Попробуйте позже.',
        },
      },
    }),
  );

  app.use('/api', healthRouter);
  app.use(`${API_PREFIX}/auth`, authRouter);
  app.use(`${API_PREFIX}/habits`, habitsRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
