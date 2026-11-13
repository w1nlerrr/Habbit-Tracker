import type {
  EntriesListResponse,
  EntryRemoveResponse,
  EntryResponse,
} from '@habit/shared';

import { apiRequest } from './http';

export const entriesApi = {
  list: (habitId: string, from: string, to: string) =>
    apiRequest<EntriesListResponse>(`/habits/${habitId}/entries?from=${from}&to=${to}`),

  set: (habitId: string, date: string, note?: string | null) =>
    apiRequest<EntryResponse>(`/habits/${habitId}/entries/${date}`, {
      method: 'PUT',
      body: note === undefined ? {} : { note },
    }),

  remove: (habitId: string, date: string) =>
    apiRequest<EntryRemoveResponse>(`/habits/${habitId}/entries/${date}`, { method: 'DELETE' }),
};
