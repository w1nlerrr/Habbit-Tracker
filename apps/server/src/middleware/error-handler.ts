import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';

import { ERROR_CODES } from '@habit/shared';

import { logger } from '../infra/logger.js';

type ErrorPayload = {
  error: {
    code: string;
    message: string;
    details?: unknown;
    requestId?: string;
  };
};

function isZodError(error: unknown): error is ZodError {
  return (
    error instanceof ZodError ||
    (typeof error === 'object' &&
      error !== null &&
      (error as { name?: unknown }).name === 'ZodError')
  );
}

function isAppError(
  error: unknown,
): error is { status: number; code: string; message: string; details?: unknown; toJSON(): ErrorPayload } {
  return (
    typeof error === 'object' &&
    error !== null &&
    typeof (error as { status?: unknown }).status === 'number' &&
    typeof (error as { code?: unknown }).code === 'string' &&
    typeof (error as { toJSON?: unknown }).toJSON === 'function'
  );
}

function isPrismaKnownError(error: unknown): error is { code: string; meta?: unknown } {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { name?: unknown }).name === 'PrismaClientKnownRequestError' &&
    typeof (error as { code?: unknown }).code === 'string'
  );
}

function prismaErrorMessage(code: string): { status: number; message: string } | null {
  switch (code) {
    case 'P2002':
      return { status: 409, message: 'Запись с такими данными уже существует' };
    case 'P2003':
      return { status: 409, message: 'Нарушена ссылочная целостность данных' };
    case 'P2025':
      return { status: 404, message: 'Запись не найдена' };
    default:
      return null;
  }
}

/**
 * Единый обработчик ошибок.
 * Наружу отдаётся предсказуемая структура и никогда — стектрейс.
 */
export const errorHandler: ErrorRequestHandler = (error, req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  const requestId = String((req as { id?: unknown }).id ?? '');
  const withId = (payload: ErrorPayload): ErrorPayload => ({
    error: { ...payload.error, ...(requestId ? { requestId } : {}) },
  });

  if (isZodError(error)) {
    const details = error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    }));
    logger.warn({ requestId, details }, 'Ошибка валидации входных данных');
    res.status(400).json(
      withId({
        error: {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'Проверьте корректность введённых данных',
          details,
        },
      }),
    );
    return;
  }

  if (isAppError(error)) {
    const level = error.status >= 500 ? 'error' : 'warn';
    logger[level]({ requestId, code: error.code, status: error.status }, error.message);
    res.status(error.status).json(withId(error.toJSON()));
    return;
  }

  if (isPrismaKnownError(error)) {
    const mapped = prismaErrorMessage(error.code);
    if (mapped) {
      logger.warn({ requestId, prismaCode: error.code }, mapped.message);
      res.status(mapped.status).json(
        withId({
          error: {
            code: mapped.status === 404 ? ERROR_CODES.NOT_FOUND : ERROR_CODES.CONFLICT,
            message: mapped.message,
          },
        }),
      );
      return;
    }
  }

  logger.error({ requestId, err: error }, 'Необработанная ошибка сервера');
  res.status(500).json(
    withId({
      error: {
        code: ERROR_CODES.INTERNAL_ERROR,
        message: 'Внутренняя ошибка сервера',
      },
    }),
  );
};
