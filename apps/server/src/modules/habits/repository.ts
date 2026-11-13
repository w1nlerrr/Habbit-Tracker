import type { HabitFrequency } from '@habit/shared';

import { prisma } from '../../infra/db.js';

export type StatsData = {
  currentStreak: number;
  longestStreak: number;
  totalDone: number;
  lastEntryDate: Date | null;
};

export type CreateHabitData = {
  userId: string;
  title: string;
  description: string | null;
  color: string;
  icon: string;
  frequency: HabitFrequency;
  startDate: Date;
  sortOrder: number;
  weekdays: number[];
  stats: StatsData;
};

export type UpdateHabitFields = {
  title?: string;
  description?: string | null;
  color?: string;
  icon?: string;
  frequency?: HabitFrequency;
  startDate?: Date;
};

const withRelations = { schedule: true, stats: true } as const;

export const habitsRepository = {
  listByUser(userId: string, includeArchived: boolean) {
    return prisma.habit.findMany({
      where: { userId, ...(includeArchived ? {} : { archivedAt: null }) },
      include: withRelations,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  },

  findByIdForUser(habitId: string, userId: string) {
    return prisma.habit.findFirst({
      where: { id: habitId, userId },
      include: withRelations,
    });
  },

  countActive(userId: string) {
    return prisma.habit.count({ where: { userId, archivedAt: null } });
  },

  maxSortOrder(userId: string) {
    return prisma.habit.aggregate({
      where: { userId },
      _max: { sortOrder: true },
    });
  },

  /** Создание привычки вместе с расписанием и начальным кэшем статистики. */
  create(data: CreateHabitData) {
    return prisma.$transaction(async (tx) => {
      const habit = await tx.habit.create({
        data: {
          userId: data.userId,
          title: data.title,
          description: data.description,
          color: data.color,
          icon: data.icon,
          frequency: data.frequency,
          startDate: data.startDate,
          sortOrder: data.sortOrder,
          schedule: {
            create: data.weekdays.map((weekday) => ({ weekday })),
          },
        },
      });

      await tx.habitStats.create({
        data: { habitId: habit.id, ...data.stats },
      });

      return tx.habit.findUniqueOrThrow({
        where: { id: habit.id },
        include: withRelations,
      });
    });
  },

  updateFields(habitId: string, data: UpdateHabitFields) {
    return prisma.habit.update({
      where: { id: habitId },
      data,
      include: withRelations,
    });
  },

  /** Атомарная замена расписания и кэша статистики. */
  replaceSchedule(habitId: string, weekdays: number[], stats: StatsData) {
    return prisma.$transaction(async (tx) => {
      await tx.habitScheduleDay.deleteMany({ where: { habitId } });

      if (weekdays.length > 0) {
        await tx.habitScheduleDay.createMany({
          data: weekdays.map((weekday) => ({ habitId, weekday })),
        });
      }

      await tx.habitStats.upsert({
        where: { habitId },
        create: { habitId, ...stats },
        update: stats,
      });

      return tx.habit.findUniqueOrThrow({
        where: { id: habitId },
        include: withRelations,
      });
    });
  },

  upsertStats(habitId: string, stats: StatsData) {
    return prisma.habitStats.upsert({
      where: { habitId },
      create: { habitId, ...stats },
      update: stats,
    });
  },

  listEntryDates(habitId: string) {
    return prisma.habitEntry.findMany({
      where: { habitId },
      select: { entryDate: true },
      orderBy: { entryDate: 'asc' },
    });
  },

  setArchived(habitId: string, archivedAt: Date | null) {
    return prisma.habit.update({
      where: { id: habitId },
      data: { archivedAt },
      include: withRelations,
    });
  },

  remove(habitId: string) {
    return prisma.habit.delete({ where: { id: habitId } });
  },

  countOwned(userId: string, habitIds: string[]) {
    return prisma.habit.count({ where: { userId, id: { in: habitIds } } });
  },

  reorder(
    items: Array<{ id: string; sortOrder: number }>,
    userId: string,
  ) {
    return prisma.$transaction(
      items.map((item) =>
        prisma.habit.updateMany({
          where: { id: item.id, userId },
          data: { sortOrder: item.sortOrder },
        }),
      ),
    );
  },
};

export type HabitsRepository = typeof habitsRepository;
