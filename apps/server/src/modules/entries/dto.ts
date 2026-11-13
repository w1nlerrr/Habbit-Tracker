import type { EntryDto } from '@habit/shared';

import { toIsoDate } from '../../domain/dates.js';
import type { HabitEntry } from '../../generated/prisma/client.js';

export function toEntryDto(entry: HabitEntry): EntryDto {
  return {
    id: entry.id,
    habitId: entry.habitId,
    date: toIsoDate(entry.entryDate),
    note: entry.note,
    source: entry.source,
    createdAt: entry.createdAt.toISOString(),
  };
}
