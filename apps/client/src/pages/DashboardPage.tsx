import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { CalendarCheck, Check, Flame, Target, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import type { TodayHabitDto } from '@habit/shared';

import { entriesApi } from '../api/entries';
import { ApiError } from '../api/http';
import { statsApi } from '../api/stats';
import { Button, Card, CardHeader, EmptyState, Spinner } from '../components/ui';
import { HabitIcon } from '../components/ui/HabitIcon';
import { habitAccent, withTint } from '../lib/colors';
import { useAuth } from '../store/auth-context';
import { useTheme } from '../store/theme-context';

function StatCard({
  label,
  value,
  hint,
  icon,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: React.ReactNode;
  accent: string;
}): React.ReactElement {
  const { resolved } = useTheme();
  const isDark = resolved === 'dark';

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
          <p className="mt-1.5 text-2xl font-bold text-foreground">{value}</p>
          {hint ? <p className="mt-0.5 text-xs text-muted">{hint}</p> : null}
        </div>
        <span
          className="flex size-10 shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: withTint(accent, 18), color: habitAccent(accent, isDark) }}
        >
          {icon}
        </span>
      </div>
    </Card>
  );
}

function ProgressBar({ value }: { value: number }): React.ReactElement {
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-muted">
      <div
        className="h-full rounded-full bg-primary transition-all"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

export function DashboardPage(): React.ReactElement {
  const { user } = useAuth();
  const { resolved } = useTheme();
  const isDark = resolved === 'dark';
  const queryClient = useQueryClient();

  const dashboardQuery = useQuery({
    queryKey: ['dashboard'],
    queryFn: statsApi.dashboard,
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ habit, date }: { habit: TodayHabitDto; date: string }) => {
      if (habit.done) {
        await entriesApi.remove(habit.habitId, date);
      } else {
        await entriesApi.set(habit.habitId, date);
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      void queryClient.invalidateQueries({ queryKey: ['habits'] });
      void queryClient.invalidateQueries({ queryKey: ['habit-stats'] });
    },
    onError: (error: unknown) => {
      toast.error(error instanceof ApiError ? error.message : 'Не удалось обновить отметку');
    },
  });

  if (dashboardQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-primary-text">
        <Spinner className="size-8" />
      </div>
    );
  }

  if (dashboardQuery.isError || !dashboardQuery.data) {
    return (
      <Card className="p-6">
        <p className="text-sm font-medium text-danger">Не удалось загрузить статистику</p>
        <p className="mt-1 text-sm text-muted">
          {dashboardQuery.error instanceof ApiError
            ? dashboardQuery.error.message
            : 'Проверьте соединение с сервером и повторите попытку.'}
        </p>
        <Button className="mt-4" onClick={() => void dashboardQuery.refetch()}>
          Повторить
        </Button>
      </Card>
    );
  }

  const data = dashboardQuery.data;
  const todayLabel = format(new Date(`${data.today}T00:00:00`), 'd MMMM, EEEE', { locale: ru });
  const pending = data.habits.plannedToday - data.habits.doneToday;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Привет, {user?.displayName ?? 'друг'}!
          </h1>
          <p className="mt-1 text-sm text-muted">
            Сегодня {todayLabel}.{' '}
            {pending > 0
              ? `Осталось отметить ${pending}.`
              : 'Все привычки на сегодня отмечены 🎉'}
          </p>
        </div>
        <Link to="/habits">
          <Button variant="secondary" icon={<CalendarCheck className="size-4" />}>
            Мои привычки
          </Button>
        </Link>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Лучшая серия"
          value={`${data.streaks.best} дн.`}
          hint={`Суммарно сейчас: ${data.streaks.totalCurrent}`}
          icon={<Flame className="size-5" />}
          accent="#F97316"
        />
        <StatCard
          label="Сегодня"
          value={`${data.habits.doneToday} из ${data.habits.plannedToday}`}
          hint={`Активных привычек: ${data.habits.active}`}
          icon={<Target className="size-5" />}
          accent="#4F46E5"
        />
        <StatCard
          label="Неделя"
          value={`${data.week.completionPct}%`}
          hint={`${data.week.done} из ${data.week.planned} запланированных`}
          icon={<TrendingUp className="size-5" />}
          accent="#22C55E"
        />
        <StatCard
          label="Месяц"
          value={`${data.month.completionPct}%`}
          hint={`${data.month.done} из ${data.month.planned} запланированных`}
          icon={<CalendarCheck className="size-5" />}
          accent="#0EA5E9"
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Привычки на сегодня"
            subtitle="Нажмите на кнопку, чтобы отметить выполнение"
          />

          {data.todayList.length === 0 ? (
            <EmptyState
              icon={<CalendarCheck className="size-6" />}
              title="Пока нет привычек"
              description="Создайте первую привычку — и она появится в этом списке."
              action={
                <Link to="/habits">
                  <Button>Создать привычку</Button>
                </Link>
              }
            />
          ) : (
            <ul className="divide-y divide-border">
              {data.todayList.map((habit) => {
                const isToggling =
                  toggleMutation.isPending &&
                  toggleMutation.variables?.habit.habitId === habit.habitId;

                return (
                  <li key={habit.habitId} className="flex items-center gap-3 px-5 py-3">
                    <span
                      className="flex size-10 shrink-0 items-center justify-center rounded-xl"
                      style={{
                        backgroundColor: withTint(habit.color),
                        color: habitAccent(habit.color, isDark),
                      }}
                    >
                      <HabitIcon name={habit.icon} className="size-5" />
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{habit.title}</p>
                      <p className="text-xs text-muted">
                        {habit.planned
                          ? 'Запланировано на сегодня'
                          : 'Не запланировано (можно отметить бонусом)'}
                        {habit.currentStreak > 0 ? ` · серия ${habit.currentStreak} дн.` : ''}
                      </p>
                    </div>

                    <Button
                      size="sm"
                      variant={habit.done ? 'primary' : 'secondary'}
                      loading={isToggling}
                      icon={<Check className="size-4" />}
                      onClick={() => toggleMutation.mutate({ habit, date: data.today })}
                    >
                      {habit.done ? 'Выполнено' : 'Отметить'}
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title="Прогресс недели" subtitle={`${data.week.from} — ${data.week.to}`} />
          <div className="space-y-4 px-5 py-4">
            <div>
              <div className="mb-1.5 flex items-center justify-between text-sm">
                <span className="text-muted">Выполнение</span>
                <span className="font-semibold text-foreground">{data.week.completionPct}%</span>
              </div>
              <ProgressBar value={data.week.completionPct} />
              <p className="mt-1.5 text-xs text-muted">
                {data.week.done} из {data.week.planned} запланированных дней
              </p>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between text-sm">
                <span className="text-muted">Месяц</span>
                <span className="font-semibold text-foreground">{data.month.completionPct}%</span>
              </div>
              <ProgressBar value={data.month.completionPct} />
              <p className="mt-1.5 text-xs text-muted">
                {data.month.done} из {data.month.planned} запланированных дней
              </p>
            </div>

            <div className="rounded-xl bg-surface-muted px-3 py-2.5 text-xs text-muted">
              Всего выполнено за всё время: <strong>{data.totalDone}</strong>
            </div>

            <Link to="/stats" className="block">
              <Button variant="secondary" className="w-full">
                Подробная статистика
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
