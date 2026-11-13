import type { Request, RequestHandler } from 'express';
import type { ZodTypeAny } from 'zod';

export type ValidationSchemas = {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
};

/**
 * Валидация входных данных на границе приложения.
 * Проверенные значения складываются в req.validated — контроллеры не парсят
 * «сырые» данные повторно.
 */
export function validate(schemas: ValidationSchemas): RequestHandler {
  return (req, _res, next) => {
    try {
      req.validated = {
        body: schemas.body ? schemas.body.parse(req.body) : undefined,
        query: schemas.query ? schemas.query.parse(req.query) : undefined,
        params: schemas.params ? schemas.params.parse(req.params) : undefined,
      };
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function getBody<T>(req: Request): T {
  return (req.validated?.body ?? {}) as T;
}

export function getQuery<T>(req: Request): T {
  return (req.validated?.query ?? {}) as T;
}

export function getParams<T>(req: Request): T {
  return (req.validated?.params ?? {}) as T;
}
