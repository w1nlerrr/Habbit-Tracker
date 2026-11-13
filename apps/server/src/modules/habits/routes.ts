import { Router } from 'express';

import {
  habitArchiveSchema,
  habitCreateSchema,
  habitIdParamSchema,
  habitListQuerySchema,
  habitReorderSchema,
  habitUpdateSchema,
} from '@habit/shared';

import { authenticate } from '../../middleware/authenticate.js';
import { validate } from '../../middleware/validate.js';
import { habitsController } from './controller.js';

export const habitsRouter = Router();

// Все операции с привычками доступны только аутентифицированным пользователям.
habitsRouter.use(authenticate);

habitsRouter.get('/', validate({ query: habitListQuerySchema }), habitsController.list);
habitsRouter.post('/', validate({ body: habitCreateSchema }), habitsController.create);

// Важно: статический маршрут объявлен раньше параметризованного.
habitsRouter.put('/reorder', validate({ body: habitReorderSchema }), habitsController.reorder);

habitsRouter.get('/:id', validate({ params: habitIdParamSchema }), habitsController.get);
habitsRouter.patch(
  '/:id',
  validate({ params: habitIdParamSchema, body: habitUpdateSchema }),
  habitsController.update,
);
habitsRouter.patch(
  '/:id/archive',
  validate({ params: habitIdParamSchema, body: habitArchiveSchema }),
  habitsController.archive,
);
habitsRouter.delete('/:id', validate({ params: habitIdParamSchema }), habitsController.remove);
