import { WEEKDAYS, type HabitFrequency } from '@habit/shared';

import type { IsoDate } from './dates.js';
import { isoWeekday } from './dates.js';

/**
 * Приводит расписание привычки к списку дней недели.
 * Для ежедневной привычки это все 7 дней, для индивидуальной — выбранные.
 */
export function normalizeWeekdays(
  weekdays: readonly number[] | undefined,
  frequency: HabitFrequency,
): number[] {
  if (frequency === 'daily') {
    return [...WEEKDAYS];
  }

  const unique = new Set<number>();
  for (const day of weekdays ?? []) {
    if (Number.isInteger(day) && day >= 1 && day <= 7) {
      unique.add(day);
    }
  }

  return [...unique].sort((a, b) => a - b);
}

/** Запланирована ли привычка на указанный календарный день. */
export function isScheduledDay(weekdays: readonly number[], date: IsoDate): boolean {
  return weekdays.includes(isoWeekday(date));
}

/** Количество запланированных дней в недельном цикле. */
export function plannedDaysPerWeek(weekdays: readonly number[]): number {
  return weekdays.length;
}
