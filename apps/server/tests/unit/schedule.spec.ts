import { describe, expect, it } from 'vitest';

import {
  isScheduledDay,
  normalizeWeekdays,
  plannedDaysPerWeek,
} from '../../src/domain/schedule';

describe('schedule', () => {
  it('для ежедневной привычки возвращает все 7 дней', () => {
    expect(normalizeWeekdays([], 'daily')).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(normalizeWeekdays(undefined, 'daily')).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('для индивидуальной привычки убирает дубли, сортирует и отбрасывает мусор', () => {
    expect(normalizeWeekdays([5, 1, 5, 9, 0, 3], 'custom')).toEqual([1, 3, 5]);
    expect(normalizeWeekdays([2.5, 4], 'custom')).toEqual([4]);
    expect(normalizeWeekdays([], 'custom')).toEqual([]);
    expect(normalizeWeekdays(undefined, 'custom')).toEqual([]);
  });

  it('определяет, запланирован ли день', () => {
    // 13.11.2026 — пятница
    expect(isScheduledDay([1, 3, 5], '2026-11-13')).toBe(true);
    expect(isScheduledDay([1, 3], '2026-11-13')).toBe(false);
    expect(isScheduledDay([], '2026-11-13')).toBe(false);
  });

  it('считает количество запланированных дней в неделю', () => {
    expect(plannedDaysPerWeek([1, 2, 3, 4, 5, 6, 7])).toBe(7);
    expect(plannedDaysPerWeek([2, 4, 6])).toBe(3);
    expect(plannedDaysPerWeek([])).toBe(0);
  });
});
