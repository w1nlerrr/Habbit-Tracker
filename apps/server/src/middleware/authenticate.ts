import type { Request, RequestHandler } from 'express';

import type { UserRole } from '@habit/shared';

import { UnauthorizedError } from '../errors/app-error.js';
import { verifyAccessToken } from '../infra/tokens.js';

/**
 * Проверка Bearer-токена. При успехе в req.auth попадает контекст пользователя.
 */
export const authenticate: RequestHandler = async (req, _res, next) => {
  try {
    const header = req.headers.authorization;

    if (!header || !header.startsWith('Bearer ')) {
      throw new UnauthorizedError('Не передан заголовок Authorization: Bearer <token>');
    }

    const token = header.slice('Bearer '.length).trim();
    if (!token) {
      throw new UnauthorizedError('Пустой токен доступа');
    }

    const payload = await verifyAccessToken(token);
    req.auth = { userId: payload.sub, role: payload.role };
    next();
  } catch (error) {
    next(
      error instanceof UnauthorizedError
        ? error
        : new UnauthorizedError('Токен недействителен или истёк'),
    );
  }
};

/** Гарантирует, что маршрут защищён middleware `authenticate`. */
export function requireAuth(req: Request): { userId: string; role: UserRole } {
  if (!req.auth) {
    throw new UnauthorizedError();
  }
  return req.auth;
}
