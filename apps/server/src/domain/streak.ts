import { addDays, type IsoDate } from './dates.js';
import { isScheduledDay } from './schedule.js';

export type StreakInput = {
  /** Даты, в которые привычка была выполнена. */
  entryDates: Iterable<IsoDate>;
  /** Дни недели, когда привычка запланирована (1…7). */
  weekdays: readonly number[];
  /** Дата начала привычки — раньше неё серия не считается. */
  startDate: IsoDate;
  /** «Сегодня» в часовом поясе пользователя. */
  today: IsoDate;
};

export type HabitStatistics = {
  currentStreak: number;
  longestStreak: number;
  totalDone: number;
  lastEntryDate: IsoDate | null;
};

/**
 * Текущая серия дней подряд.
 *
 * Правила:
 *  1. Дни, не входящие в расписание, серию не рвут.
 *  2. Если сегодня запланировано, но ещё не отмечено — серия не обнуляется
 *     до конца дня, проверка начинается со вчерашнего дня.
 *  3. Раньше startDate серия не продолжается.
 */
export function computeCurrentStreak({ entryDates, weekdays, startDate, today }: StreakInput): number {
  if (weekdays.length === 0) return 0;

  const done = new Set(entryDates);

  let cursor: IsoDate = today;
  if (isScheduledDay(weekdays, cursor) && !done.has(cursor)) {
    cursor = addDays(cursor, -1);
  }

  let streak = 0;
  while (cursor >= startDate) {
    if (!isScheduledDay(weekdays, cursor)) {
      cursor = addDays(cursor, -1);
      continue;
    }
    if (!done.has(cursor)) break;
    streak += 1;
    cursor = addDays(cursor, -1);
  }

  return streak;
}

/** Максимальная серия за всё время существования привычки. */
export function computeLongestStreak({ entryDates, weekdays, startDate, today }: StreakInput): number {
  if (weekdays.length === 0) return 0;

  const done = new Set(entryDates);
  let longest = 0;
  let current = 0;

  for (let cursor = startDate; cursor <= today; cursor = addDays(cursor, 1)) {
    if (!isScheduledDay(weekdays, cursor)) continue;

    if (done.has(cursor)) {
      current += 1;
      if (current > longest) longest = current;
    } else {
      current = 0;
    }
  }

  return longest;
}

/** Полный набор агрегатов для кэша habit_stats. */
export function computeHabitStatistics(input: StreakInput): HabitStatistics {
  const dates = [...new Set(input.entryDates)].sort();
  const lastEntryDate = dates.length > 0 ? (dates[dates.length - 1] ?? null) : null;

  return {
    currentStreak: computeCurrentStreak(input),
    longestStreak: computeLongestStreak(input),
    totalDone: dates.length,
    lastEntryDate,
  };
}
