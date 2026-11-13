import type { HabitFrequency, Weekday } from '@habit/shared';

import { toIsoDate } from '../../domain/dates.js';
import type { Habit, HabitScheduleDay, HabitStats } from '../../generated/prisma/client.js';

export type HabitStatsDto = {
  currentStreak: number;
  longestStreak: number;
  totalDone: number;
  lastEntryDate: string | null;
};

export type HabitDto = {
  id: string;
  title: string;
  description: string | null;
  color: string;
  icon: string;
  frequency: HabitFrequency;
  startDate: string;
  sortOrder: number;
  weekdays: Weekday[];
  archivedAt: string | null;
  stats: HabitStatsDto;
  createdAt: string;
  updatedAt: string;
};

export type HabitWithRelations = Habit & {
  schedule: HabitScheduleDay[];
  stats: HabitStats | null;
};

/** Преобразование модели БД в публичное представление привычки. */
export function toHabitDto(habit: HabitWithRelations): HabitDto {
  const weekdays = habit.schedule
    .map((item) => item.weekday)
    .filter((day): day is Weekday => day >= 1 && day <= 7)
    .sort((a, b) => a - b);

  return {
    id: habit.id,
    title: habit.title,
    description: habit.description,
    color: habit.color,
    icon: habit.icon,
    frequency: habit.frequency as HabitFrequency,
    startDate: toIsoDate(habit.startDate),
    sortOrder: habit.sortOrder,
    weekdays,
    archivedAt: habit.archivedAt ? habit.archivedAt.toISOString() : null,
    stats: {
      currentStreak: habit.stats?.currentStreak ?? 0,
      longestStreak: habit.stats?.longestStreak ?? 0,
      totalDone: habit.stats?.totalDone ?? 0,
      lastEntryDate: habit.stats?.lastEntryDate ? toIsoDate(habit.stats.lastEntryDate) : null,
    },
    createdAt: habit.createdAt.toISOString(),
    updatedAt: habit.updatedAt.toISOString(),
  };
}
