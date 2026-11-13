import type {
  HabitsListResponse,
  HabitCreateInput,
  HabitResponse,
  HabitUpdateInput,
} from '@habit/shared';

import { apiRequest } from './http';

export const habitsApi = {
  list: (includeArchived = false) =>
    apiRequest<HabitsListResponse>(`/habits?includeArchived=${includeArchived ? 'true' : 'false'}`),

  get: (habitId: string) => apiRequest<HabitResponse>(`/habits/${habitId}`),

  create: (input: HabitCreateInput) =>
    apiRequest<HabitResponse>('/habits', { method: 'POST', body: input }),

  update: (habitId: string, input: HabitUpdateInput) =>
    apiRequest<HabitResponse>(`/habits/${habitId}`, { method: 'PATCH', body: input }),

  archive: (habitId: string, archived: boolean) =>
    apiRequest<HabitResponse>(`/habits/${habitId}/archive`, {
      method: 'PATCH',
      body: { archived },
    }),

  remove: (habitId: string) => apiRequest<void>(`/habits/${habitId}`, { method: 'DELETE' }),

  reorder: (items: Array<{ id: string; sortOrder: number }>) =>
    apiRequest<void>('/habits/reorder', { method: 'PUT', body: { habits: items } }),
};
