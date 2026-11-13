import { Router } from 'express';

import { activityQuerySchema, habitIdParamSchema, monthQuerySchema, statsQuerySchema } from '@habit/shared';

import { authenticate } from '../../middleware/authenticate.js';
import { validate } from '../../middleware/validate.js';
import { statsController } from './controller.js';

export const statsRouter = Router();

statsRouter.use(authenticate);

statsRouter.get('/dashboard', statsController.dashboard);
statsRouter.get('/calendar', validate({ query: monthQuerySchema }), statsController.calendar);
statsRouter.get('/activity', validate({ query: activityQuerySchema }), statsController.activity);
statsRouter.get(
  '/habits/:id',
  validate({ params: habitIdParamSchema, query: statsQuerySchema }),
  statsController.habit,
);
