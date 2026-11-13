import { describe, expect, it } from 'vitest';

import {
  computeCurrentStreak,
  computeHabitStatistics,
  computeLongestStreak,
  type StreakInput,
} from '../../src/domain/streak';

const base: StreakInput = {
  entryDates: [],
  weekdays: [1, 2, 3, 4, 5, 6, 7],
  startDate: '2026-11-01',
  today: '2026-11-13',
};

describe('computeCurrentStreak', () => {
  it('считает серию, включая сегодняшний день', () => {
    expect(
      computeCurrentStreak({
        ...base,
        entryDates: ['2026-11-11', '2026-11-12', '2026-11-13'],
      }),
    ).toBe(3);
  });

  it('не обнуляет серию, если сегодня ещё не отмечено', () => {
    expect(
      computeCurrentStreak({
        ...base,
        entryDates: ['2026-11-11', '2026-11-12'],
      }),
    ).toBe(2);
  });

  it('останавливается на первом пропущенном дне', () => {
    expect(
      computeCurrentStreak({
        ...base,
        entryDates: ['2026-11-10', '2026-11-12', '2026-11-13'],
      }),
    ).toBe(2);
  });

  it('возвращает 0 при отсутствии отметок', () => {
    expect(computeCurrentStreak(base)).toBe(0);
  });

  it('не учитывает дни до даты начала привычки', () => {
    expect(
      computeCurrentStreak({
        ...base,
        startDate: '2026-11-10',
        entryDates: [
          '2026-11-08',
          '2026-11-09',
          '2026-11-10',
          '2026-11-11',
          '2026-11-12',
          '2026-11-13',
        ],
      }),
    ).toBe(4);
  });

  it('для индивидуального расписания пропуск незапланированного дня не рвёт серию', () => {
    // Пн 09, Ср 11, Пт 13 — привычка только по [1, 3, 5]
    expect(
      computeCurrentStreak({
        ...base,
        weekdays: [1, 3, 5],
        entryDates: ['2026-11-09', '2026-11-11', '2026-11-13'],
      }),
    ).toBe(3);
  });

  it('для индивидуального расписания пропущенный запланированный день рвёт серию', () => {
    expect(
      computeCurrentStreak({
        ...base,
        weekdays: [1, 3, 5],
        entryDates: ['2026-11-09', '2026-11-13'],
      }),
    ).toBe(1);
  });

  it('отметка в незапланированный день не увеличивает серию', () => {
    // Вт 12 не входит в расписание [1, 3, 5]
    expect(
      computeCurrentStreak({
        ...base,
        weekdays: [1, 3, 5],
        entryDates: ['2026-11-09', '2026-11-11', '2026-11-12', '2026-11-13'],
      }),
    ).toBe(3);
  });

  it('пустое расписание даёт нулевую серию', () => {
    expect(
      computeCurrentStreak({
        ...base,
        weekdays: [],
        entryDates: ['2026-11-13'],
      }),
    ).toBe(0);
  });
});

describe('computeLongestStreak', () => {
  it('запоминает самую длинную серию в прошлом', () => {
    expect(
      computeLongestStreak({
        ...base,
        entryDates: [
          '2026-11-01',
          '2026-11-02',
          '2026-11-03',
          '2026-11-04',
          '2026-11-05',
          '2026-11-11',
          '2026-11-12',
          '2026-11-13',
        ],
      }),
    ).toBe(5);
  });

  it('учитывает расписание при расчёте максимума', () => {
    // Ср 04, Пт 06, Пн 09, Ср 11, Пт 13 — все запланированные дни отмечены
    expect(
      computeLongestStreak({
        ...base,
        weekdays: [1, 3, 5],
        startDate: '2026-11-04',
        entryDates: ['2026-11-04', '2026-11-06', '2026-11-09', '2026-11-11', '2026-11-13'],
      }),
    ).toBe(5);
  });

  it('возвращает 0 без отметок', () => {
    expect(computeLongestStreak(base)).toBe(0);
  });
});

describe('computeHabitStatistics', () => {
  it('считает агрегаты без дублей и определяет последнюю дату', () => {
    expect(
      computeHabitStatistics({
        ...base,
        entryDates: ['2026-11-12', '2026-11-13', '2026-11-13'],
      }),
    ).toEqual({
      currentStreak: 2,
      longestStreak: 2,
      totalDone: 2,
      lastEntryDate: '2026-11-13',
    });
  });

  it('возвращает нули для пустой истории', () => {
    expect(computeHabitStatistics(base)).toEqual({
      currentStreak: 0,
      longestStreak: 0,
      totalDone: 0,
      lastEntryDate: null,
    });
  });
});
