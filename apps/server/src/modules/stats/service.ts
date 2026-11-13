import {
  addDays,
  eachDay,
  endOfMonth,
  parseIsoDate,
  startOfIsoWeek,
  startOfMonth,
  toIsoDate,
  todayInTimezone,
  type IsoDate,
} from '../../domain/dates.js';
import { isScheduledDay } from '../../domain/schedule.js';
import { entriesRepository } from '../entries/repository.js';
import { getOwnedHabit } from '../habits/access.js';
import { habitsRepository } from '../habits/repository.js';
import { getActiveUser } from '../users/service.js';
import type {
  ActivityDto,
  CalendarDto,
  DashboardDto,
  PeriodStatsDto,
  RangeSummaryDto,
} from './dto.js';

type HabitWithRelations = Awaited<ReturnType<typeof habitsRepository.listByUser>>[number];
type EntryRow = { habitId: string; entryDate: Date };

export function completionPct(done: number, planned: number): number {
  if (planned === 0) return 0;
  return Math.round((done / planned) * 1000) / 10;
}

function groupByHabit(entries: EntryRow[]): Map<string, Set<IsoDate>> {
  const result = new Map<string, Set<IsoDate>>();
  for (const entry of entries) {
    const date = toIsoDate(entry.entryDate);
    const set = result.get(entry.habitId) ?? new Set<IsoDate>();
    set.add(date);
    result.set(entry.habitId, set);
  }
  return result;
}

function weekdaysOf(habit: HabitWithRelations): number[] {
  return habit.schedule.map((item) => item.weekday);
}

function aggregate(
  habits: HabitWithRelations[],
  done: Map<string, Set<IsoDate>>,
  from: IsoDate,
  to: IsoDate,
): RangeSummaryDto {
  let planned = 0;
  let doneCount = 0;

  for (const habit of habits) {
    const weekdays = weekdaysOf(habit);
    const doneSet = done.get(habit.id) ?? new Set<IsoDate>();

    for (let day = from; day <= to; day = addDays(day, 1)) {
      if (!isScheduledDay(weekdays, day)) continue;
      planned += 1;
      if (doneSet.has(day)) doneCount += 1;
    }
  }

  return { from, to, planned, done: doneCount, completionPct: completionPct(doneCount, planned) };
}

function summarizeDay(
  habits: HabitWithRelations[],
  done: Map<string, Set<IsoDate>>,
  date: IsoDate,
): { date: IsoDate; plannedCount: number; doneCount: number; completionPct: number } {
  let plannedCount = 0;
  let doneCount = 0;

  for (const habit of habits) {
    if (!isScheduledDay(weekdaysOf(habit), date)) continue;
    plannedCount += 1;
    if (done.get(habit.id)?.has(date) ?? false) doneCount += 1;
  }

  return { date, plannedCount, doneCount, completionPct: completionPct(doneCount, plannedCount) };
}

export const statsService = {
  async dashboard(userId: string): Promise<DashboardDto> {
    const user = await getActiveUser(userId);
    const today = todayInTimezone(user.timezone);
    const weekStart = startOfIsoWeek(today);
    const monthStart = startOfMonth(today);
    // Неделя может начинаться в предыдущем месяце — берём более раннюю границу.
    const from = weekStart < monthStart ? weekStart : monthStart;

    const habits = await habitsRepository.listByUser(userId, false);
    const entries = await entriesRepository.listForUserInRange(
      userId,
      parseIsoDate(from),
      parseIsoDate(today),
    );
    const done = groupByHabit(entries);

    const plannedToday = habits.filter((habit) =>
      isScheduledDay(weekdaysOf(habit), today),
    ).length;
    const doneToday = habits.filter((habit) => done.get(habit.id)?.has(today) ?? false).length;

    const streaks = habits.map((habit) => habit.stats?.currentStreak ?? 0);

    const todayList = habits.map((habit) => ({
      habitId: habit.id,
      title: habit.title,
      color: habit.color,
      icon: habit.icon,
      planned: isScheduledDay(weekdaysOf(habit), today),
      done: done.get(habit.id)?.has(today) ?? false,
      currentStreak: habit.stats?.currentStreak ?? 0,
    }));

    return {
      today,
      habits: {
        active: habits.length,
        plannedToday,
        doneToday,
      },
      streaks: {
        best: streaks.length === 0 ? 0 : Math.max(...streaks),
        totalCurrent: streaks.reduce((sum, value) => sum + value, 0),
      },
      week: aggregate(habits, done, weekStart, today),
      month: aggregate(habits, done, monthStart, today),
      totalDone: habits.reduce((sum, habit) => sum + (habit.stats?.totalDone ?? 0), 0),
      todayList,
    };
  },

  async habitPeriod(
    userId: string,
    habitId: string,
    period: 'week' | 'month',
  ): Promise<PeriodStatsDto> {
    const user = await getActiveUser(userId);
    const habit = await getOwnedHabit(userId, habitId);
    const today = todayInTimezone(user.timezone);
    const from = period === 'week' ? startOfIsoWeek(today) : startOfMonth(today);

    const entries = await entriesRepository.listForHabit(
      habitId,
      parseIsoDate(from),
      parseIsoDate(today),
    );
    const doneSet = new Set(entries.map((entry) => toIsoDate(entry.entryDate)));
    const weekdays = weekdaysOf(habit);

    const days = eachDay(from, today).map((date) => ({
      date,
      planned: isScheduledDay(weekdays, date),
      done: doneSet.has(date),
    }));

    const planned = days.filter((day) => day.planned).length;
    const done = days.filter((day) => day.planned && day.done).length;

    return {
      habitId,
      period,
      from,
      to: today,
      planned,
      done,
      completionPct: completionPct(done, planned),
      currentStreak: habit.stats?.currentStreak ?? 0,
      longestStreak: habit.stats?.longestStreak ?? 0,
      totalDone: habit.stats?.totalDone ?? 0,
      days,
    };
  },

  async calendar(userId: string, month: string): Promise<CalendarDto> {
    const user = await getActiveUser(userId);
    const today = todayInTimezone(user.timezone);

    const from = `${month}-01`;
    const monthEnd = endOfMonth(from);
    const to = monthEnd < today ? monthEnd : today;

    const habits = await habitsRepository.listByUser(userId, false);

    if (from > to) {
      return {
        month,
        from,
        to: from,
        days: [],
        totals: { planned: 0, done: 0, completionPct: 0 },
      };
    }

    const entries = await entriesRepository.listForUserInRange(
      userId,
      parseIsoDate(from),
      parseIsoDate(to),
    );
    const done = groupByHabit(entries);

    const days = eachDay(from, to).map((date) => summarizeDay(habits, done, date));

    const planned = days.reduce((sum, day) => sum + day.plannedCount, 0);
    const doneTotal = days.reduce((sum, day) => sum + day.doneCount, 0);

    return {
      month,
      from,
      to,
      days,
      totals: {
        planned,
        done: doneTotal,
        completionPct: completionPct(doneTotal, planned),
      },
    };
  },

  async activity(userId: string, days: number): Promise<ActivityDto> {
    const user = await getActiveUser(userId);
    const today = todayInTimezone(user.timezone);
    const from = addDays(today, -(days - 1));

    const habits = await habitsRepository.listByUser(userId, false);
    const entries = await entriesRepository.listForUserInRange(
      userId,
      parseIsoDate(from),
      parseIsoDate(today),
    );
    const done = groupByHabit(entries);

    const rows = eachDay(from, today).map((date) => summarizeDay(habits, done, date));
    const planned = rows.reduce((sum, row) => sum + row.plannedCount, 0);
    const doneTotal = rows.reduce((sum, row) => sum + row.doneCount, 0);

    return {
      from,
      to: today,
      days: rows.map((row) => ({
        date: row.date,
        planned: row.plannedCount,
        done: row.doneCount,
        completionPct: row.completionPct,
      })),
      totals: {
        planned,
        done: doneTotal,
        completionPct: completionPct(doneTotal, planned),
      },
    };
  },
};
