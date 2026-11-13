import {
  LIMITS,
  type HabitCreateInput,
  type HabitFrequency,
  type HabitReorderInput,
  type HabitUpdateInput,
} from '@habit/shared';

import { ConflictError, NotFoundError, ValidationError } from '../../errors/app-error.js';
import { parseIsoDate, toIsoDate, todayInTimezone } from '../../domain/dates.js';
import { normalizeWeekdays } from '../../domain/schedule.js';
import { computeHabitStatistics } from '../../domain/streak.js';
import { getActiveUser as requireUser } from '../users/service.js';
import { getOwnedHabit as requireHabit } from './access.js';
import { habitsRepository } from './repository.js';


export const habitsService = {
  async list(userId: string, includeArchived: boolean) {
    await requireUser(userId);
    return habitsRepository.listByUser(userId, includeArchived);
  },

  async get(userId: string, habitId: string) {
    await requireUser(userId);
    return requireHabit(userId, habitId);
  },

  async create(userId: string, input: HabitCreateInput) {
    const user = await requireUser(userId);

    const activeCount = await habitsRepository.countActive(userId);
    if (activeCount >= LIMITS.habitsPerUser) {
      throw new ConflictError(
        `Достигнут лимит активных привычек (${LIMITS.habitsPerUser}). Архивируйте или удалите часть привычек.`,
      );
    }

    const today = todayInTimezone(user.timezone);
    const startDate = input.startDate ?? today;
    if (startDate > today) {
      throw new ValidationError('Дата начала не может быть в будущем', [
        { path: 'startDate', message: 'Выберите сегодняшнюю или более раннюю дату' },
      ]);
    }

    const weekdays = normalizeWeekdays(input.weekdays, input.frequency);
    if (weekdays.length === 0) {
      throw new ValidationError('Выберите хотя бы один день недели', [
        { path: 'weekdays', message: 'Расписание не может быть пустым' },
      ]);
    }

    const maxOrder = await habitsRepository.maxSortOrder(userId);
    const sortOrder = (maxOrder._max.sortOrder ?? -1) + 1;

    return habitsRepository.create({
      userId,
      title: input.title,
      description: input.description ?? null,
      color: input.color,
      icon: input.icon,
      frequency: input.frequency,
      startDate: parseIsoDate(startDate),
      sortOrder,
      weekdays,
      stats: {
        currentStreak: 0,
        longestStreak: 0,
        totalDone: 0,
        lastEntryDate: null,
      },
    });
  },

  async update(userId: string, habitId: string, input: HabitUpdateInput) {
    const user = await requireUser(userId);
    const habit = await requireHabit(userId, habitId);
    const today = todayInTimezone(user.timezone);

    const nextStartDate = input.startDate ?? toIsoDate(habit.startDate);
    if (nextStartDate > today) {
      throw new ValidationError('Дата начала не может быть в будущем', [
        { path: 'startDate', message: 'Выберите сегодняшнюю или более раннюю дату' },
      ]);
    }

    const currentWeekdays = habit.schedule.map((item) => item.weekday).sort((a, b) => a - b);
    const frequency = (input.frequency ?? habit.frequency) as HabitFrequency;

    const scheduleTouched = input.weekdays !== undefined || input.frequency !== undefined;
    const nextWeekdays = scheduleTouched
      ? normalizeWeekdays(input.weekdays ?? currentWeekdays, frequency)
      : currentWeekdays;

    if (nextWeekdays.length === 0) {
      throw new ValidationError('Выберите хотя бы один день недели', [
        { path: 'weekdays', message: 'Расписание не может быть пустым' },
      ]);
    }

    const updated = await habitsRepository.updateFields(habitId, {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined ? { description: input.description ?? null } : {}),
      ...(input.color !== undefined ? { color: input.color } : {}),
      ...(input.icon !== undefined ? { icon: input.icon } : {}),
      ...(input.frequency !== undefined ? { frequency: input.frequency } : {}),
      ...(input.startDate !== undefined ? { startDate: parseIsoDate(input.startDate) } : {}),
    });

    const scheduleChanged =
      nextWeekdays.length !== currentWeekdays.length ||
      nextWeekdays.some((day) => !currentWeekdays.includes(day));
    const startChanged = nextStartDate !== toIsoDate(habit.startDate);

    if (!scheduleChanged && !startChanged) {
      return updated;
    }

    // Расписание или дата начала изменились — серии могли стать другими.
    const entries = await habitsRepository.listEntryDates(habitId);
    const stats = computeHabitStatistics({
      entryDates: entries.map((entry) => toIsoDate(entry.entryDate)),
      weekdays: nextWeekdays,
      startDate: nextStartDate,
      today,
    });

    return habitsRepository.replaceSchedule(habitId, nextWeekdays, {
      currentStreak: stats.currentStreak,
      longestStreak: stats.longestStreak,
      totalDone: stats.totalDone,
      lastEntryDate: stats.lastEntryDate ? parseIsoDate(stats.lastEntryDate) : null,
    });
  },

  async setArchived(userId: string, habitId: string, archived: boolean) {
    await requireUser(userId);
    const habit = await requireHabit(userId, habitId);

    if (archived && habit.archivedAt !== null) return habit;
    if (!archived && habit.archivedAt === null) return habit;

    return habitsRepository.setArchived(habitId, archived ? new Date() : null);
  },

  async remove(userId: string, habitId: string) {
    await requireUser(userId);
    await requireHabit(userId, habitId);
    await habitsRepository.remove(habitId);
  },

  async reorder(userId: string, input: HabitReorderInput) {
    await requireUser(userId);

    const ids = input.habits.map((item) => item.id);
    const owned = await habitsRepository.countOwned(userId, ids);
    if (owned !== new Set(ids).size) {
      throw new NotFoundError('Одна или несколько привычек не найдены');
    }

    await habitsRepository.reorder(input.habits, userId);
  },
};
