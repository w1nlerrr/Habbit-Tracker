import { toIsoDate } from '../../domain/dates.js';
import type { HabitEntry } from '../../generated/prisma/client.js';

export type EntryDto = {
  id: number;
  habitId: string;
  date: string;
  note: string | null;
  source: string;
  createdAt: string;
};

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

export type HabitStatsSnapshot = {
  currentStreak: number;
  longestStreak: number;
  totalDone: number;
  lastEntryDate: string | null;
  planned: boolean;
};
