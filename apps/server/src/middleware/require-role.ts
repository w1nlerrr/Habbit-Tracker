import type { RequestHandler } from 'express';

import type { UserRole } from '@habit/shared';

import { ForbiddenError } from '../errors/app-error.js';
import { requireAuth } from './authenticate.js';

/** Проверка роли пользователя (RBAC). */
export function requireRole(...allowedRoles: UserRole[]): RequestHandler {
  return (req, _res, next) => {
    try {
      const { role } = requireAuth(req);
      if (!allowedRoles.includes(role)) {
        throw new ForbiddenError('Недостаточно прав для выполнения операции');
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}
