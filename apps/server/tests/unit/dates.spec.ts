import { describe, expect, it } from 'vitest';

import {
  addDays,
  diffInDays,
  eachDay,
  endOfMonth,
  isIsoDate,
  isoWeekday,
  parseIsoDate,
  startOfIsoWeek,
  startOfMonth,
  toIsoDate,
  todayInTimezone,
} from '../../src/domain/dates.js';

describe('dates', () => {
  it('распознаёт корректные календарные даты', () => {
    expect(isIsoDate('2026-11-13')).toBe(true);
    expect(isIsoDate('2024-02-29')).toBe(true); // високосный год
    expect(isIsoDate('2026-02-28')).toBe(true);
  });

  it('отвергает несуществующие даты и неверный формат', () => {
    expect(isIsoDate('2026-02-31')).toBe(false);
    expect(isIsoDate('2025-02-29')).toBe(false);
    expect(isIsoDate('13.11.2026')).toBe(false);
    expect(isIsoDate('2026-1-1')).toBe(false);
  });

  it('переводит дату в Date по UTC без сдвига', () => {
    const date = parseIsoDate('2026-11-13');
    expect(date.getUTCFullYear()).toBe(2026);
    expect(date.getUTCMonth()).toBe(10);
    expect(date.getUTCDate()).toBe(13);
    expect(toIsoDate(date)).toBe('2026-11-13');
  });

  it('сдвигает даты через границы месяцев и лет', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29');
  });

  it('определяет день недели по ISO (1 = понедельник)', () => {
    expect(isoWeekday('2026-11-09')).toBe(1);
    expect(isoWeekday('2026-11-13')).toBe(5);
    expect(isoWeekday('2026-11-15')).toBe(7);
  });

  it('находит границы недели и месяца', () => {
    expect(startOfIsoWeek('2026-11-13')).toBe('2026-11-09');
    expect(startOfIsoWeek('2026-11-09')).toBe('2026-11-09');
    expect(startOfMonth('2026-11-13')).toBe('2026-11-01');
    expect(endOfMonth('2026-11-13')).toBe('2026-11-30');
    expect(endOfMonth('2026-02-10')).toBe('2026-02-28');
    expect(endOfMonth('2024-02-10')).toBe('2024-02-29');
  });

  it('считает разницу в днях', () => {
    expect(diffInDays('2026-11-13', '2026-11-01')).toBe(12);
    expect(diffInDays('2026-11-01', '2026-11-13')).toBe(-12);
  });

  it('перебирает диапазон дат включительно', () => {
    expect(eachDay('2026-11-01', '2026-11-03')).toEqual([
      '2026-11-01',
      '2026-11-02',
      '2026-11-03',
    ]);
    expect(eachDay('2026-11-03', '2026-11-01')).toEqual([]);
  });

  it('учитывает часовой пояс пользователя', () => {
    const now = new Date('2026-11-13T22:30:00.000Z');
    expect(todayInTimezone('UTC', now)).toBe('2026-11-13');
    // Москва: UTC+3 → уже 14 ноября
    expect(todayInTimezone('Europe/Moscow', now)).toBe('2026-11-14');
    expect(todayInTimezone('America/New_York', now)).toBe('2026-11-13');
  });

  it('не падает на некорректном часовом поясе', () => {
    expect(todayInTimezone('Invalid/Zone', new Date('2026-11-13T12:00:00.000Z'))).toBe(
      '2026-11-13',
    );
  });
});
