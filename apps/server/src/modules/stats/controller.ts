import type { Request, Response } from 'express';

import type { ActivityQuery, StatsQuery } from '@habit/shared';

import { requireAuth } from '../../middleware/authenticate.js';
import { getParams, getQuery } from '../../middleware/validate.js';
import { statsService } from './service.js';

export const statsController = {
  async dashboard(req: Request, res: Response): Promise<void> {
    const { userId } = requireAuth(req);
    const data = await statsService.dashboard(userId);
    res.status(200).json(data);
  },

  async habit(req: Request, res: Response): Promise<void> {
    const { userId } = requireAuth(req);
    const { id } = getParams<{ id: string }>(req);
    const { period } = getQuery<StatsQuery>(req);

    const data = await statsService.habitPeriod(userId, id, period);
    res.status(200).json(data);
  },

  async calendar(req: Request, res: Response): Promise<void> {
    const { userId } = requireAuth(req);
    const { month } = getQuery<{ month: string }>(req);

    const data = await statsService.calendar(userId, month);
    res.status(200).json(data);
  },

  async activity(req: Request, res: Response): Promise<void> {
    const { userId } = requireAuth(req);
    const { days } = getQuery<ActivityQuery>(req);

    const data = await statsService.activity(userId, days);
    res.status(200).json(data);
  },
};
