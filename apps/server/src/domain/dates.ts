import { ISO_DATE_PATTERN } from '@habit/shared';

/** Календарный день в формате YYYY-MM-DD (без времени и часового пояса). */
export type IsoDate = string;

const MS_PER_DAY = 86_400_000;

/** Проверяет формат и существование календарной даты. */
export function isIsoDate(value: string): boolean {
  if (!ISO_DATE_PATTERN.test(value)) return false;
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/** Преобразует YYYY-MM-DD в Date (UTC, полночь). */
export function parseIsoDate(value: IsoDate): Date {
  if (!isIsoDate(value)) {
    throw new Error(`Некорректная календарная дата: ${value}`);
  }
  return new Date(
    Date.UTC(Number(value.slice(0, 4)), Number(value.slice(5, 7)) - 1, Number(value.slice(8, 10))),
  );
}

/** Преобразует Date в YYYY-MM-DD по UTC. */
export function toIsoDate(date: Date): IsoDate {
  return date.toISOString().slice(0, 10);
}

/** Сдвигает дату на указанное число дней (может быть отрицательным). */
export function addDays(value: IsoDate, days: number): IsoDate {
  return toIsoDate(new Date(parseIsoDate(value).getTime() + days * MS_PER_DAY));
}

/** День недели по ISO: 1 — понедельник … 7 — воскресенье. */
export function isoWeekday(value: IsoDate): number {
  const day = parseIsoDate(value).getUTCDay();
  return day === 0 ? 7 : day;
}

/** Сегодняшняя дата в часовом поясе пользователя. */
export function todayInTimezone(timeZone: string, now: Date = new Date()): IsoDate {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(now);
    const pick = (type: string): string => parts.find((part) => part.type === type)?.value ?? '';
    const result = `${pick('year')}-${pick('month')}-${pick('day')}`;
    return isIsoDate(result) ? result : toIsoDate(now);
  } catch {
    return toIsoDate(now);
  }
}

/** Разница в календарных днях (a − b). */
export function diffInDays(a: IsoDate, b: IsoDate): number {
  return Math.round((parseIsoDate(a).getTime() - parseIsoDate(b).getTime()) / MS_PER_DAY);
}

/** Начало недели (понедельник) для указанной даты. */
export function startOfIsoWeek(value: IsoDate): IsoDate {
  return addDays(value, -(isoWeekday(value) - 1));
}

/** Начало месяца для указанной даты. */
export function startOfMonth(value: IsoDate): IsoDate {
  return `${value.slice(0, 7)}-01`;
}

/** Последний день месяца для указанной даты. */
export function endOfMonth(value: IsoDate): IsoDate {
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${value.slice(0, 7)}-${String(lastDay).padStart(2, '0')}`;
}

/** Перебирает даты включительно. */
export function eachDay(from: IsoDate, to: IsoDate): IsoDate[] {
  const days: IsoDate[] = [];
  for (let cursor = from; cursor <= to; cursor = addDays(cursor, 1)) {
    days.push(cursor);
  }
  return days;
}
