import type { Request, Response } from 'express';

import type { BackupImportInput } from '@habit/shared';

import { requireAuth } from '../../middleware/authenticate.js';
import { getBody, getQuery } from '../../middleware/validate.js';
import { backupService } from './service.js';

export const backupController = {
  async exportData(req: Request, res: Response): Promise<void> {
    const { userId } = requireAuth(req);
    const result = await backupService.exportUserData(userId);

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${result.fileName}"`,
    );
    res.setHeader('X-Backup-Sha256', result.checksum);
    res.status(200).send(result.json);
  },

  async importData(req: Request, res: Response): Promise<void> {
    const { userId } = requireAuth(req);
    const input = getBody<BackupImportInput>(req);

    const result = await backupService.importUserData(userId, input);
    res.status(200).json(result);
  },

  async history(req: Request, res: Response): Promise<void> {
    const { userId } = requireAuth(req);
    const { page, pageSize } = getQuery<{ page: number; pageSize: number }>(req);

    const items = await backupService.history(userId, Math.min(pageSize * page, 100));
    res.status(200).json({ items, total: items.length });
  },
};
