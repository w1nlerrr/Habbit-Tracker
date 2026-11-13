import type { HabitFrequency, UserRole, Weekday } from './constants.js';

/* ─────────────────────────── Пользователь ─────────────────────────── */

export type UserDto = {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  timezone: string;
  createdAt: string;
};

/* ───────────────────────────── Привычки ───────────────────────────── */

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

/* ───────────────────────────── Отметки ────────────────────────────── */

export type EntryDto = {
  id: number;
  habitId: string;
  date: string;
  note: string | null;
  source: string;
  createdAt: string;
};

export type HabitStatsSnapshot = HabitStatsDto & {
  planned: boolean;
};

/* ──────────────────────────── Статистика ──────────────────────────── */

export type RangeSummaryDto = {
  from: string;
  to: string;
  planned: number;
  done: number;
  completionPct: number;
};

export type TodayHabitDto = {
  habitId: string;
  title: string;
  color: string;
  icon: string;
  planned: boolean;
  done: boolean;
  currentStreak: number;
};

export type DashboardDto = {
  today: string;
  habits: {
    active: number;
    plannedToday: number;
    doneToday: number;
  };
  streaks: {
    best: number;
    totalCurrent: number;
  };
  week: RangeSummaryDto;
  month: RangeSummaryDto;
  totalDone: number;
  todayList: TodayHabitDto[];
};

export type DayCellDto = {
  date: string;
  planned: boolean;
  done: boolean;
};

export type PeriodStatsDto = {
  habitId: string;
  period: 'week' | 'month';
  from: string;
  to: string;
  planned: number;
  done: number;
  completionPct: number;
  currentStreak: number;
  longestStreak: number;
  totalDone: number;
  days: DayCellDto[];
};

export type CalendarDayDto = {
  date: string;
  plannedCount: number;
  doneCount: number;
  completionPct: number;
};

export type CalendarDto = {
  month: string;
  from: string;
  to: string;
  days: CalendarDayDto[];
  totals: {
    planned: number;
    done: number;
    completionPct: number;
  };
};

/* ───────────────────────────── Ответы API ─────────────────────────── */

export type LoginResponse = {
  user: UserDto;
  accessToken: string;
  expiresInSec: number;
};

export type HabitsListResponse = {
  items: HabitDto[];
  total: number;
};

export type HabitResponse = {
  habit: HabitDto;
};

export type EntriesListResponse = {
  items: EntryDto[];
  total: number;
};

export type EntryResponse = {
  entry: EntryDto;
  stats: HabitStatsSnapshot;
};

export type EntryRemoveResponse = {
  removed: number;
  stats: HabitStatsSnapshot;
};

export type ApiErrorBody = {
  error: {
    code: string;
    message: string;
    details?: unknown;
    requestId?: string;
  };
};
