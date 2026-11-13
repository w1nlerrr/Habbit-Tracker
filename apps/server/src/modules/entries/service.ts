import { ConflictError, ValidationError } from '../../errors/app-error.js';
import {
  isIsoDate,
  parseIsoDate,
  toIsoDate,
  todayInTimezone,
  type IsoDate,
} from '../../domain/dates.js';
import { isScheduledDay } from '../../domain/schedule.js';
import { computeHabitStatistics } from '../../domain/streak.js';
import { getOwnedHabit, type HabitRecord } from '../habits/access.js';
import type { StatsData } from '../habits/repository.js';
import { getActiveUser } from '../users/service.js';
import type { EntryDto, HabitStatsSnapshot } from './dto.js';
import { toEntryDto } from './dto.js';
import { entriesRepository } from './repository.js';

function assertIsoDate(value: string, field: string): IsoDate {
  if (!isIsoDate(value)) {
    throw new ValidationError(`Некорректная дата в поле «${field}»`, [
      { path: field, message: 'Ожидается существующая дата в формате ГГГГ-ММ-ДД' },
    ]);
  }
  return value;
}

function toStatsData(stats: {
  currentStreak: number;
  longestStreak: number;
  totalDone: number;
  lastEntryDate: string | null;
}): StatsData {
  return {
    currentStreak: stats.currentStreak,
    longestStreak: stats.longestStreak,
    totalDone: stats.totalDone,
    lastEntryDate: stats.lastEntryDate ? parseIsoDate(stats.lastEntryDate) : null,
  };
}

function snapshot(
  habit: HabitRecord,
  dates: Iterable<IsoDate>,
  today: IsoDate,
  date: IsoDate,
): HabitStatsSnapshot {
  const weekdays = habit.schedule.map((item) => item.weekday);
  const stats = computeHabitStatistics({
    entryDates: dates,
    weekdays,
    startDate: toIsoDate(habit.startDate),
    today,
  });

  return { ...stats, planned: isScheduledDay(weekdays, date) };
}

export const entriesService = {
  async list(userId: string, habitId: string, from: string, to: string): Promise<EntryDto[]> {
    await getActiveUser(userId);
    await getOwnedHabit(userId, habitId);

    const fromDate = assertIsoDate(from, 'from');
    const toDate = assertIsoDate(to, 'to');

    const entries = await entriesRepository.listForHabit(
      habitId,
      parseIsoDate(fromDate),
      parseIsoDate(toDate),
    );
    return entries.map(toEntryDto);
  },

  async upsert(
    userId: string,
    habitId: string,
    date: string,
    note: string | null | undefined,
  ): Promise<{ entry: EntryDto; stats: HabitStatsSnapshot }> {
    const user = await getActiveUser(userId);
    const habit = await getOwnedHabit(userId, habitId);

    if (habit.archivedAt !== null) {
      throw new ConflictError('Нельзя отметить выполнение привычки, находящейся в архиве');
    }

    const entryDate = assertIsoDate(date, 'date');
    const today = todayInTimezone(user.timezone);
    const startDate = toIsoDate(habit.startDate);

    if (entryDate > today) {
      throw new ValidationError('Нельзя отметить выполнение в будущем', [
        { path: 'date', message: 'Дата не может быть позже сегодняшней' },
      ]);
    }

    if (entryDate < startDate) {
      throw new ValidationError('Дата раньше начала привычки', [
        { path: 'date', message: `Привычка начинается ${startDate}` },
      ]);
    }

    const existing = await entriesRepository.listDatesForHabit(habitId);
    const dates = new Set(existing.map((item) => toIsoDate(item.entryDate)));
    dates.add(entryDate);

    const stats = snapshot(habit, dates, today, entryDate);

    const entry = await entriesRepository.upsertAndReplaceStats({
      habitId,
      userId,
      entryDate: parseIsoDate(entryDate),
      note: note ?? null,
      source: 'manual',
      stats: toStatsData(stats),
    });

    return { entry: toEntryDto(entry), stats };
  },

  async remove(
    userId: string,
    habitId: string,
    date: string,
  ): Promise<{ removed: number; stats: HabitStatsSnapshot }> {
    const user = await getActiveUser(userId);
    const habit = await getOwnedHabit(userId, habitId);

    const entryDate = assertIsoDate(date, 'date');
    const today = todayInTimezone(user.timezone);

    const existing = await entriesRepository.listDatesForHabit(habitId);
    const dates = existing
      .map((item) => toIsoDate(item.entryDate))
      .filter((item) => item !== entryDate);

    const stats = snapshot(habit, dates, today, entryDate);

    const removed = await entriesRepository.deleteAndReplaceStats({
      habitId,
      entryDate: parseIsoDate(entryDate),
      stats: toStatsData(stats),
    });

    return { removed, stats };
  },
};

export type EntriesService = typeof entriesService;
