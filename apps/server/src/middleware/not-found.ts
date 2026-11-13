import type { RequestHandler } from 'express';

import { NotFoundError } from '../errors/app-error.js';

/** Любой несуществующий маршрут превращается в единую ошибку 404. */
export const notFound: RequestHandler = (req, _res, next) => {
  next(new NotFoundError(`Маршрут ${req.method} ${req.originalUrl} не найден`));
};
