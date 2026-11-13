import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { BarChart3, Flame, Target, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { habitsApi } from '../api/habits';
import { statsApi } from '../api/stats';
import { Button, Card, CardHeader, Skeleton } from '../components/ui';
import { HabitIcon } from '../components/ui/HabitIcon';
import { useChartTheme } from '../lib/chart-theme';
import { habitAccent, withTint } from '../lib/colors';
import { useTheme } from '../store/theme-context';

const WEEKDAY_NAMES = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

function isoWeekday(date: Date): number {
  const day = date.getDay();
  return day === 0 ? 7 : day;
}

export function StatsPage(): React.ReactElement {
  const chart = useChartTheme();
  const { resolved } = useTheme();
  const isDark = resolved === 'dark';

  const dashboardQuery = useQuery({ queryKey: ['dashboard'], queryFn: statsApi.dashboard });
  const activityQuery = useQuery({
    queryKey: ['activity', 30],
    queryFn: () => statsApi.activity(30),
  });
  const habitsQuery = useQuery({
    queryKey: ['habits', false],
    queryFn: () => habitsApi.list(false),
  });

  if (dashboardQuery.isLoading || activityQuery.isLoading || habitsQuery.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((index) => (
            <Skeleton key={index} className="h-20" />
          ))}
        </div>
        <Skeleton className="h-72" />
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!dashboardQuery.data || !activityQuery.data || !habitsQuery.data) {
    return (
      <Card className="p-6">
        <p className="text-sm font-medium text-danger">Не удалось загрузить статистику</p>
        <Button
          className="mt-4"
          onClick={() => {
            void dashboardQuery.refetch();
            void activityQuery.refetch();
            void habitsQuery.refetch();
          }}
        >
          Повторить
        </Button>
      </Card>
    );
  }

  const dashboard = dashboardQuery.data;
  const activity = activityQuery.data;
  const leaders = [...habitsQuery.data.items]
    .sort((a, b) => b.stats.currentStreak - a.stats.currentStreak)
    .slice(0, 5);

  const areaData = activity.days.map((day) => ({
    date: format(parseISO(day.date), 'd MMM'),
    value: day.completionPct,
  }));

  const weekdayData = WEEKDAY_NAMES.map((name, index) => {
    const weekday = index + 1;
    const rows = activity.days.filter((day) => isoWeekday(parseISO(day.date)) === weekday);
    return {
      name,
      planned: rows.reduce((sum, day) => sum + day.planned, 0),
      done: rows.reduce((sum, day) => sum + day.done, 0),
    };
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-foreground">Статистика</h1>
        <p className="mt-1 text-sm text-muted">
          Динамика выполнения за последние 30 дней и текущие серии
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="flex items-center gap-3 p-4">
          <TrendingUp className="size-6 text-success" />
          <div>
            <p className="text-xl font-bold text-foreground">{dashboard.week.completionPct}%</p>
            <p className="text-xs text-muted">
              неделя: {dashboard.week.done}/{dashboard.week.planned}
            </p>
          </div>
        </Card>
        <Card className="flex items-center gap-3 p-4">
          <BarChart3 className="size-6 text-sky-500" />
          <div>
            <p className="text-xl font-bold text-foreground">{dashboard.month.completionPct}%</p>
            <p className="text-xs text-muted">
              месяц: {dashboard.month.done}/{dashboard.month.planned}
            </p>
          </div>
        </Card>
        <Card className="flex items-center gap-3 p-4">
          <Flame className="size-6 text-orange-500" />
          <div>
            <p className="text-xl font-bold text-foreground">{dashboard.streaks.best}</p>
            <p className="text-xs text-muted">лучшая серия, дней</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3 p-4">
          <Target className="size-6 text-primary-text" />
          <div>
            <p className="text-xl font-bold text-foreground">{dashboard.totalDone}</p>
            <p className="text-xs text-muted">всего выполнений</p>
          </div>
        </Card>
      </section>

      <Card>
        <CardHeader
          title="Динамика выполнения"
          subtitle={`${activity.from} — ${activity.to}, процент выполненных запланированных дней`}
        />
        <div className="h-64 w-full px-2 py-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={areaData} margin={{ top: 5, right: 16, bottom: 0, left: -8 }}>
              <defs>
                <linearGradient id="fillPct" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={chart.series} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={chart.series} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: chart.axis }}
                interval={4}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 11, fill: chart.axis }}
                width={46}
                tickFormatter={(value: number) => `${value}%`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: chart.tooltipBg,
                  border: `1px solid ${chart.tooltipBorder}`,
                  borderRadius: 12,
                  color: chart.tooltipText,
                }}
                labelStyle={{ color: chart.tooltipText }}
                itemStyle={{ color: chart.tooltipText }}
              />
              <Area
                type="monotone"
                dataKey="value"
                name="Выполнение, %"
                stroke={chart.series}
                strokeWidth={2}
                fill="url(#fillPct)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="По дням недели" subtitle="План и факт за 30 дней" />
          <div className="h-64 w-full px-2 py-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekdayData} margin={{ top: 5, right: 16, bottom: 0, left: -8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: chart.axis }} />
                <YAxis
                  tick={{ fontSize: 11, fill: chart.axis }}
                  width={36}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: chart.tooltipBg,
                    border: `1px solid ${chart.tooltipBorder}`,
                    borderRadius: 12,
                    color: chart.tooltipText,
                  }}
                  labelStyle={{ color: chart.tooltipText }}
                  itemStyle={{ color: chart.tooltipText }}
                />
                <Legend wrapperStyle={{ fontSize: 12, color: chart.axis }} />
                <Bar
                  dataKey="planned"
                  name="Запланировано"
                  fill={chart.seriesSoft}
                  radius={[4, 4, 0, 0]}
                />
                <Bar dataKey="done" name="Выполнено" fill={chart.series} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Лидеры по серии"
            action={
              <Link to="/habits">
                <Button variant="ghost" size="sm">
                  Все привычки
                </Button>
              </Link>
            }
          />
          {leaders.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-muted">Пока нет привычек</p>
          ) : (
            <ul className="divide-y divide-border">
              {leaders.map((habit) => (
                <li key={habit.id} className="flex items-center gap-3 px-5 py-3">
                  <span
                    className="flex size-9 shrink-0 items-center justify-center rounded-lg"
                    style={{
                      backgroundColor: withTint(habit.color),
                      color: habitAccent(habit.color, isDark),
                    }}
                  >
                    <HabitIcon name={habit.icon} className="size-4" />
                  </span>
                  <Link
                    to={`/habits/${habit.id}`}
                    className="min-w-0 flex-1 truncate text-sm font-medium text-foreground hover:text-primary-text"
                  >
                    {habit.title}
                  </Link>
                  <span className="text-sm font-semibold text-foreground">
                    {habit.stats.currentStreak} дн.
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

