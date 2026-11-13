/**
 * Общие константы клиента и сервера.
 * Единый источник истины для перечислений и лимитов.
 */

export const API_PREFIX = '/api/v1';

export const HABIT_FREQUENCIES = ['daily', 'custom'] as const;
export type HabitFrequency = (typeof HABIT_FREQUENCIES)[number];

export const USER_ROLES = ['user', 'admin'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const ENTRY_SOURCES = ['manual', 'import'] as const;
export type EntrySource = (typeof ENTRY_SOURCES)[number];

/** Дни недели: 1 — понедельник, 7 — воскресенье (ISO 8601). */
export const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export const WEEKDAY_LABELS: Record<Weekday, string> = {
  1: 'Пн',
  2: 'Вт',
  3: 'Ср',
  4: 'Чт',
  5: 'Пт',
  6: 'Сб',
  7: 'Вс',
};

export const LIMITS = {
  habitTitleMax: 120,
  habitDescriptionMax: 1000,
  habitNoteMax: 500,
  habitsPerUser: 100,
  displayNameMax: 80,
  emailMax: 254,
  passwordMin: 8,
  passwordMax: 128,
  colorLength: 7,
  iconMax: 40,
  pageSizeMax: 100,
  exportPayloadMaxBytes: 5 * 1024 * 1024,
} as const;

export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;
export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

/** Формат даты календарного дня: YYYY-MM-DD. */
export const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
/** Формат цвета: #RRGGBB. */
export const COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;
