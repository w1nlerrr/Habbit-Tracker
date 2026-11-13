import type { Request, Response } from 'express';

import type {
  HabitArchiveInput,
  HabitCreateInput,
  HabitListQuery,
  HabitReorderInput,
  HabitUpdateInput,
} from '@habit/shared';

import { requireAuth } from '../../middleware/authenticate.js';
import { getBody, getParams, getQuery } from '../../middleware/validate.js';
import { toHabitDto } from './dto.js';
import { habitsService } from './service.js';

export const habitsController = {
  async list(req: Request, res: Response): Promise<void> {
    const { userId } = requireAuth(req);
    const query = getQuery<HabitListQuery>(req);

    const habits = await habitsService.list(userId, query.includeArchived);
    res.status(200).json({ items: habits.map(toHabitDto), total: habits.length });
  },

  async get(req: Request, res: Response): Promise<void> {
    const { userId } = requireAuth(req);
    const { id } = getParams<{ id: string }>(req);

    const habit = await habitsService.get(userId, id);
    res.status(200).json({ habit: toHabitDto(habit) });
  },

  async create(req: Request, res: Response): Promise<void> {
    const { userId } = requireAuth(req);
    const input = getBody<HabitCreateInput>(req);

    const habit = await habitsService.create(userId, input);
    res.status(201).json({ habit: toHabitDto(habit) });
  },

  async update(req: Request, res: Response): Promise<void> {
    const { userId } = requireAuth(req);
    const { id } = getParams<{ id: string }>(req);
    const input = getBody<HabitUpdateInput>(req);

    const habit = await habitsService.update(userId, id, input);
    res.status(200).json({ habit: toHabitDto(habit) });
  },

  async archive(req: Request, res: Response): Promise<void> {
    const { userId } = requireAuth(req);
    const { id } = getParams<{ id: string }>(req);
    const { archived } = getBody<HabitArchiveInput>(req);

    const habit = await habitsService.setArchived(userId, id, archived);
    res.status(200).json({ habit: toHabitDto(habit) });
  },

  async remove(req: Request, res: Response): Promise<void> {
    const { userId } = requireAuth(req);
    const { id } = getParams<{ id: string }>(req);

    await habitsService.remove(userId, id);
    res.status(204).send();
  },

  async reorder(req: Request, res: Response): Promise<void> {
    const { userId } = requireAuth(req);
    const input = getBody<HabitReorderInput>(req);

    await habitsService.reorder(userId, input);
    res.status(204).send();
  },
};
