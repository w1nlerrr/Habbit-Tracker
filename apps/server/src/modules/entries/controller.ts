import type { Request, Response } from 'express';

import type { EntryUpsertInput } from '@habit/shared';

import { requireAuth } from '../../middleware/authenticate.js';
import { getBody, getParams, getQuery } from '../../middleware/validate.js';
import { entriesService } from './service.js';

export const entriesController = {
  async list(req: Request, res: Response): Promise<void> {
    const { userId } = requireAuth(req);
    const { id } = getParams<{ id: string }>(req);
    const { from, to } = getQuery<{ from: string; to: string }>(req);

    const items = await entriesService.list(userId, id, from, to);
    res.status(200).json({ items, total: items.length });
  },

  async upsert(req: Request, res: Response): Promise<void> {
    const { userId } = requireAuth(req);
    const { id, date } = getParams<{ id: string; date: string }>(req);
    const { note } = getBody<EntryUpsertInput>(req);

    const result = await entriesService.upsert(userId, id, date, note);
    res.status(200).json(result);
  },

  async remove(req: Request, res: Response): Promise<void> {
    const { userId } = requireAuth(req);
    const { id, date } = getParams<{ id: string; date: string }>(req);

    const result = await entriesService.remove(userId, id, date);
    res.status(200).json(result);
  },
};
