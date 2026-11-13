import { Router } from 'express';

import { backupImportSchema, paginationSchema } from '@habit/shared';

import { authenticate } from '../../middleware/authenticate.js';
import { validate } from '../../middleware/validate.js';
import { backupController } from './controller.js';

export const backupRouter = Router();

backupRouter.use(authenticate);

backupRouter.get('/export', backupController.exportData);
backupRouter.post(
  '/import',
  validate({ body: backupImportSchema }),
  backupController.importData,
);
backupRouter.get('/history', validate({ query: paginationSchema }), backupController.history);
