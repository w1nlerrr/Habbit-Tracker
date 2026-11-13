/**
 * Демонстрационные данные для разработки и защиты проекта.
 * Запуск: npm run db:seed
 *
 * Внимание: скрипт удаляет всех пользователей (и каскадно — их данные).
 * Предназначен только для локального стенда.
 */
import { hash } from '@node-rs/argon2';

import { addDays, parseIsoDate, todayInTimezone, type IsoDate } from '../src/domain/dates.js';
import { normalizeWeekdays } from '../src/domain/schedule.js';
import { computeHabitStatistics } from '../src/domain/streak.js';
import { disconnectDatabase, prisma } from '../src/infra/db.js';
import { logger } from '../src/infra/logger.js';

const DEMO_EMAIL = 'demo@habit.local';
const DEMO_PASSWORD = 'Demo12345!';
const ADMIN_EMAIL = 'admin@habit.local';
const ADMIN_PASSWORD = 'Admin12345!';

type SeedHabit = {
  title: string;
  description: string;
  color: string;
  icon: string;
  frequency: 'daily' | 'custom';
  weekdays: number[];
  /** Функция «выполнено ли в этот день» — детерминированная, без случайности. */
  isDone: (date: IsoDate, index: number) => boolean;
};

const HABITS: SeedHabit[] = [
  {
    title: 'Зарядка 15 минут',
    description: 'Лёгкая разминка и растяжка сразу после подъёма',
    color: '#22C55E',
    icon: 'activity',
    frequency: 'daily',
    weekdays: [],
    isDone: () => true,
  },
  {
    title: 'Чтение 20 минут',
    description: 'Художественная или профессиональная литература',
    color: '#6366F1',
    icon: 'book-open',
    frequency: 'daily',
    weekdays: [],
    isDone: (_date, index) => index % 7 !== 3,
  },
  {
    title: 'Бассейн',
    description: 'Тренировка в бассейне по вторникам, четвергам и субботам',
    color: '#0EA5E9',
    icon: 'waves',
    frequency: 'custom',
    weekdays: [2, 4, 6],
    isDone: (_date, index) => index % 5 !== 0,
  },
];

async function main(): Promise<void> {
  logger.info('Очистка демонстрационных данных…');
  await prisma.backupJob.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.session.deleteMany();
  // Каскадно удалит привычки, расписание, отметки и кэш статистики.
  await prisma.user.deleteMany();

  const [demoPasswordHash, adminPasswordHash] = await Promise.all([
    hash(DEMO_PASSWORD),
    hash(ADMIN_PASSWORD),
  ]);

  const demoUser = await prisma.user.create({
    data: {
      email: DEMO_EMAIL,
      passwordHash: demoPasswordHash,
      displayName: 'Демо-пользователь',
      timezone: 'Europe/Moscow',
      role: 'user',
    },
  });

  await prisma.user.create({
    data: {
      email: ADMIN_EMAIL,
      passwordHash: adminPasswordHash,
      displayName: 'Администратор',
      timezone: 'Europe/Moscow',
      role: 'admin',
    },
  });

  const today = todayInTimezone(demoUser.timezone);
  const startDate = addDays(today, -59);
  const totalDays = 60;

  for (const [habitIndex, seed] of HABITS.entries()) {
    const weekdays = normalizeWeekdays(seed.weekdays, seed.frequency);

    const habit = await prisma.habit.create({
      data: {
        userId: demoUser.id,
        title: seed.title,
        description: seed.description,
        color: seed.color,
        icon: seed.icon,
        frequency: seed.frequency,
        startDate: parseIsoDate(startDate),
        sortOrder: habitIndex,
        schedule: {
          create: weekdays.map((weekday) => ({ weekday })),
        },
      },
    });

    const entryDates: IsoDate[] = [];
    for (let index = 0; index < totalDays; index += 1) {
      const date = addDays(startDate, index);
      const weekday = new Date(parseIsoDate(date)).getUTCDay() || 7;
      if (!weekdays.includes(weekday)) continue;
      if (!seed.isDone(date, index)) continue;
      entryDates.push(date);
    }

    if (entryDates.length > 0) {
      await prisma.habitEntry.createMany({
        data: entryDates.map((date) => ({
          habitId: habit.id,
          userId: demoUser.id,
          entryDate: parseIsoDate(date),
          source: 'import',
        })),
      });
    }

    const stats = computeHabitStatistics({ entryDates, weekdays, startDate, today });

    await prisma.habitStats.create({
      data: {
        habitId: habit.id,
        currentStreak: stats.currentStreak,
        longestStreak: stats.longestStreak,
        totalDone: stats.totalDone,
        lastEntryDate: stats.lastEntryDate ? parseIsoDate(stats.lastEntryDate) : null,
      },
    });

    logger.info(
      {
        habit: seed.title,
        entries: entryDates.length,
        currentStreak: stats.currentStreak,
        longestStreak: stats.longestStreak,
      },
      'Привычка создана',
    );
  }

  await prisma.auditLog.create({
    data: {
      userId: demoUser.id,
      action: 'seed.demo_data_created',
      entity: 'user',
      entityId: demoUser.id,
      payload: { habits: HABITS.length, days: totalDays },
    },
  });

  logger.info(
    { demoEmail: DEMO_EMAIL, demoPassword: DEMO_PASSWORD, adminEmail: ADMIN_EMAIL, adminPassword: ADMIN_PASSWORD },
    'Демонстрационные данные готовы',
  );
}

main()
  .then(async () => {
    await disconnectDatabase();
    process.exit(0);
  })
  .catch(async (error: unknown) => {
    logger.error({ err: error }, 'Не удалось заполнить базу демонстрационными данными');
    await disconnectDatabase();
    process.exit(1);
  });
