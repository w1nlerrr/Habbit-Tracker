import type { UserRole } from '@habit/shared';

declare global {
  namespace Express {
    interface Request {
      /** Данные, прошедшие валидацию Zod в middleware `validate`. */
      validated?: {
        body?: unknown;
        query?: unknown;
        params?: unknown;
      };
      /** Контекст аутентифицированного пользователя. */
      auth?: {
        userId: string;
        role: UserRole;
      };
    }
  }
}

export {};
