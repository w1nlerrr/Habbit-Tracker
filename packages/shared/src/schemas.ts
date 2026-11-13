import { z } from 'zod';

import {
  COLOR_PATTERN,
  HABIT_FREQUENCIES,
  ISO_DATE_PATTERN,
  LIMITS,
} from './constants.js';

/* ────────────────────────────── Общие ────────────────────────────── */

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, 'Адрес электронной почты слишком короткий')
  .max(LIMITS.emailMax, `Адрес электронной почты длиннее ${LIMITS.emailMax} символов`)
  .email('Некорректный адрес электронной почты');

export const passwordSchema = z
  .string()
  .min(LIMITS.passwordMin, `Пароль должен содержать минимум ${LIMITS.passwordMin} символов`)
  .max(LIMITS.passwordMax, `Пароль длиннее ${LIMITS.passwordMax} символов`);

export const displayNameSchema = z
  .string()
  .trim()
  .min(1, 'Укажите имя')
  .max(LIMITS.displayNameMax, `Имя длиннее ${LIMITS.displayNameMax} символов`);

export const timezoneSchema = z
  .string()
  .trim()
  .min(1, 'Укажите часовой пояс')
  .max(64, 'Название часового пояса слишком длинное');

/** Календарный день в формате YYYY-MM-DD. */
export const isoDateSchema = z
  .string()
  .regex(ISO_DATE_PATTERN, 'Ожидается дата в формате ГГГГ-ММ-ДД');

export const colorSchema = z
  .string()
  .regex(COLOR_PATTERN, 'Цвет должен быть в формате #RRGGBB');

export const uuidSchema = z.string().uuid('Некорректный идентификатор');

/* ────────────────────────── Аутентификация ───────────────────────── */

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  displayName: displayNameSchema,
  timezone: timezoneSchema.default('Europe/Moscow'),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Введите пароль').max(LIMITS.passwordMax),
});

export const updateProfileSchema = z
  .object({
    displayName: displayNameSchema.optional(),
    timezone: timezoneSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Нет данных для изменения',
  });

/* ──────────────────────────── Привычки ───────────────────────────── */

export const weekdaySchema = z.number().int().min(1).max(7);

const habitBaseSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Укажите название привычки')
    .max(LIMITS.habitTitleMax, `Название длиннее ${LIMITS.habitTitleMax} символов`),
  description: z
    .string()
    .trim()
    .max(LIMITS.habitDescriptionMax, `Описание длиннее ${LIMITS.habitDescriptionMax} символов`)
    .nullish(),
  color: colorSchema.default('#6366F1'),
  icon: z.string().trim().min(1).max(LIMITS.iconMax).default('star'),
  frequency: z.enum(HABIT_FREQUENCIES).default('daily'),
  startDate: isoDateSchema.optional(),
  weekdays: z.array(weekdaySchema).max(7, 'В неделе всего 7 дней').optional(),
});

export const habitCreateSchema = habitBaseSchema.superRefine((value, ctx) => {
  if (value.frequency === 'custom' && (!value.weekdays || value.weekdays.length === 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['weekdays'],
      message: 'Для привычки с индивидуальным расписанием выберите хотя бы один день недели',
    });
  }
});

export const habitUpdateSchema = habitBaseSchema.partial();

export const habitReorderSchema = z.object({
  habits: z
    .array(z.object({ id: uuidSchema, sortOrder: z.number().int().min(0) }))
    .min(1, 'Передайте хотя бы одну привычку')
    .max(200),
});

/* ───────────────────────────── Отметки ───────────────────────────── */

export const entryUpsertSchema = z.object({
  note: z
    .string()
    .trim()
    .max(LIMITS.habitNoteMax, `Заметка длиннее ${LIMITS.habitNoteMax} символов`)
    .nullish(),
});

export const dateRangeQuerySchema = z
  .object({
    from: isoDateSchema,
    to: isoDateSchema,
  })
  .refine((value) => value.from <= value.to, {
    message: 'Дата начала не может быть позже даты окончания',
    path: ['to'],
  });

export const monthQuerySchema = z.object({
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Ожидается месяц в формате ГГГГ-ММ'),
});

export const statsPeriodSchema = z.enum(['week', 'month']);

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(LIMITS.pageSizeMax).default(20),
});

/* ───────────────────────────── Параметры ─────────────────────────── */

export const habitIdParamSchema = z.object({ id: uuidSchema });

export const entryParamSchema = z.object({
  id: uuidSchema,
  date: isoDateSchema,
});

/* ───────────────────────────── Типы ──────────────────────────────── */

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type HabitCreateInput = z.infer<typeof habitCreateSchema>;
export type HabitUpdateInput = z.infer<typeof habitUpdateSchema>;
export type HabitReorderInput = z.infer<typeof habitReorderSchema>;
export type EntryUpsertInput = z.infer<typeof entryUpsertSchema>;
export type DateRangeQuery = z.infer<typeof dateRangeQuerySchema>;
export type MonthQuery = z.infer<typeof monthQuerySchema>;
export type StatsPeriod = z.infer<typeof statsPeriodSchema>;
export type PaginationQuery = z.infer<typeof paginationSchema>;
