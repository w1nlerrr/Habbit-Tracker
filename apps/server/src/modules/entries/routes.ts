import { Router } from 'express';

import {
  dateRangeQuerySchema,
  entryParamSchema,
  entryUpsertSchema,
  habitIdParamSchema,
} from '@habit/shared';

import { authenticate } from '../../middleware/authenticate.js';
import { validate } from '../../middleware/validate.js';
import { entriesController } from './controller.js';

export const entriesRouter = Router();

entriesRouter.use(authenticate);

entriesRouter.get(
  '/:id/entries',
  validate({ params: habitIdParamSchema, query: dateRangeQuerySchema }),
  entriesController.list,
);

entriesRouter.put(
  '/:id/entries/:date',
  validate({ params: entryParamSchema, body: entryUpsertSchema }),
  entriesController.upsert,
);

entriesRouter.delete(
  '/:id/entries/:date',
  validate({ params: entryParamSchema }),
  entriesController.remove,
);
