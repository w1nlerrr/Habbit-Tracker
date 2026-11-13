import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addDays, format, startOfWeek, subDays } from 'date-fns';
import { ru } from 'date-fns/locale';
import { ArrowLeft, Check, Flame, Target, Trophy } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import type { StatsPeriod } from '@habit/shared';

import { entriesApi } from '../api/entries';
import { habitsApi } from '../api/habits';
import { ApiError } from '../api/http';
import { statsApi } from '../api/stats';
import { Button, Card, CardHeader, Spinner } from '../components/ui';
import { HabitIcon } from '../components/ui/HabitIcon';
import { HEAT_PALETTE, habitAccent, withTint, type HeatPalette } from '../lib/colors';
import { useTheme } from '../store/theme-context';

const HEATMAP_WEEKS = 12;

function isoWeekday(date: Date): number {
  const day = date.getDay();
  return day === 0 ? 7 : day;
}

function heatColor(
  planned: boolean,
  done: boolean,
  future: boolean,
  palette: HeatPalette,
): string {
  if (future) return 'transparent';
  if (!planned) return palette.empty;
  return done ? palette.done : palette.missed;
}

export function HabitDetailsPage(): React.ReactElement {
  const { habitId = '' } = useParams<{ habitId: string }>();
  const [period, setPeriod] = useState<StatsPeriod>('week');
  const queryClient = useQueryClient();
  const { resolved } = useTheme();
  const heat = HEAT_PALETTE[resolved];
  const isDark = resolved === 'dark';

  const habitQuery = useQuery({
    queryKey: ['habit', habitId],
    queryFn: () => habitsApi.get(habitId),
    enabled: habitId.length > 0,
  });

  const statsQuery = useQuery({
    queryKey: ['habit-stats', habitId, period],
    queryFn: () => statsApi.habit(habitId, period),
    enabled: habitId.length > 0,
  });

  const today = statsQuery.data?.to ?? '';
  const heatFrom = today
    ? format(subDays(new Date(`${today}T00:00:00`), HEATMAP_WEEKS * 7 - 1), 'yyyy-MM-dd')
    : '';

  const entriesQuery = useQuery({
    queryKey: ['entries', habitId, heatFrom, today],
    queryFn: () => entriesApi.list(habitId, heatFrom, today),
    enabled: Boolean(today) && habitId.length > 0,
  });

  const invalidate = (): void => {
    void queryClient.invalidateQueries({ queryKey: ['habit', habitId] });
    void queryClient.invalidateQueries({ queryKey: ['habit-stats', habitId] });
    void queryClient.invalidateQueries({ queryKey: ['entries', habitId] });
    void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    void queryClient.invalidateQueries({ queryKey: ['habits'] });
  };

  const doneDates = new Set((entriesQuery.data?.items ?? []).map((entry) => entry.date));
  const doneToday = doneDates.has(today);

  const toggleMutation = useMutation({
    mutationFn: async () => {
      if (!today) {
        throw new ApiError(0, 'NO_DATE', 'Не удалось определить текущую дату');
      }
      if (doneToday) {
        await entriesApi.remove(habitId, today);
      } else {
        await entriesApi.set(habitId, today);
      }
    },
    onSuccess: invalidate,
    onError: (error: unknown) => {
      toast.error(error instanceof ApiError ? error.message : 'Не удалось обновить отметку');
    },
  });

  if (habitQuery.isLoading || statsQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-primary-text">
        <Spinner className="size-8" />
      </div>
    );
  }

  if (habitQuery.isError || !habitQuery.data || statsQuery.isError || !statsQuery.data) {
    return (
      <Card className="p-6">
        <p className="text-sm font-medium text-danger">Не удалось загрузить привычку</p>
        <Link to="/habits" className="mt-4 inline-block">
          <Button variant="secondary" icon={<ArrowLeft className="size-4" />}>
            К списку привычек
          </Button>
        </Link>
      </Card>
    );
  }

  const habit = habitQuery.data.habit;
  const stats = statsQuery.data;

  const weekdays = habit.weekdays;
  const start = today
    ? startOfWeek(subDays(new Date(`${today}T00:00:00`), (HEATMAP_WEEKS - 1) * 7), {
        weekStartsOn: 1,
      })
    : new Date();

  const cells = Array.from({ length: HEATMAP_WEEKS * 7 }, (_, index) => addDays(start, index));

  return (
    <div className="space-y-6">
      <Link
        to="/habits"
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> К списку привычек
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span
            className="flex size-12 shrink-0 items-center justify-center rounded-2xl"
            style={{ backgroundColor: withTint(habit.color), color: habitAccent(habit.color, isDark) }}
          >
            <HabitIcon name={habit.icon} className="size-6" />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{habit.title}</h1>
            <p className="mt-0.5 text-sm text-muted">
              {habit.description ?? 'Без описания'}
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {habit.weekdays.map((day) => (
                <span
                  key={day}
                  className="rounded bg-surface-muted px-1.5 py-0.5 text-[10px] font-medium text-muted"
                >
                  {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'][day - 1]}
                </span>
              ))}
            </div>
          </div>
        </div>

        <Button
          variant={doneToday ? 'primary' : 'secondary'}
          loading={toggleMutation.isPending}
          icon={<Check className="size-4" />}
          onClick={() => toggleMutation.mutate()}
        >
          {doneToday ? 'Выполнено сегодня' : 'Отметить сегодня'}
        </Button>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="flex items-center gap-3 p-4">
          <Flame className="size-6 text-orange-500" />
          <div>
            <p className="text-xl font-bold text-foreground">{stats.currentStreak}</p>
            <p className="text-xs text-muted">текущая серия</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3 p-4">
          <Trophy className="size-6 text-warning" />
          <div>
            <p className="text-xl font-bold text-foreground">{stats.longestStreak}</p>
            <p className="text-xs text-muted">рекорд</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3 p-4">
          <Target className="size-6 text-primary-text" />
          <div>
            <p className="text-xl font-bold text-foreground">{stats.totalDone}</p>
            <p className="text-xs text-muted">всего выполнено</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3 p-4">
          <Check className="size-6 text-success" />
          <div>
            <p className="text-xl font-bold text-foreground">{stats.completionPct}%</p>
            <p className="text-xs text-muted">
              {period === 'week' ? 'за неделю' : 'за месяц'} ({stats.done}/{stats.planned})
            </p>
          </div>
        </Card>
      </section>

      <Card>
        <CardHeader
          title="Календарь активности"
          subtitle="Последние 12 недель"
          action={
            <div className="flex gap-1.5">
              <Button
                size="sm"
                variant={period === 'week' ? 'primary' : 'secondary'}
                onClick={() => setPeriod('week')}
              >
                Неделя
              </Button>
              <Button
                size="sm"
                variant={period === 'month' ? 'primary' : 'secondary'}
                onClick={() => setPeriod('month')}
              >
                Месяц
              </Button>
            </div>
          }
        />

        <div className="px-5 py-4">
          <div className="flex gap-2">
            <div className="grid grid-rows-7 gap-1 text-[10px] leading-[14px] text-muted">
              {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((label) => (
                <span key={label} className="h-3.5">
                  {label}
                </span>
              ))}
            </div>

            <div className="grid grid-rows-7 grid-flow-col gap-1">
              {cells.map((date) => {
                const isoDate = format(date, 'yyyy-MM-dd');
                const weekday = isoWeekday(date);
                const planned = weekdays.some((day) => day === weekday);
                const done = doneDates.has(isoDate);
                const future = isoDate > today;
                const beforeStart = isoDate < habit.startDate;

                const label = future
                  ? `${isoDate}: будущее`
                  : beforeStart
                    ? `${isoDate}: до начала привычки`
                    : `${isoDate}: ${planned ? (done ? 'выполнено' : 'пропущено') : 'не запланировано'}`;

                return (
                  <div
                    key={isoDate}
                    title={label}
                    className="size-3.5 rounded-sm"
                    style={{
                      backgroundColor: heatColor(
                        planned && !beforeStart,
                        done,
                        future || beforeStart,
                        heat,
                      ),
                    }}
                  />
                );
              })}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-muted">
            <span className="flex items-center gap-1">
              <span className="size-3 rounded-sm" style={{ backgroundColor: heat.missed }} />
              пропущено
            </span>
            <span className="flex items-center gap-1">
              <span className="size-3 rounded-sm" style={{ backgroundColor: heat.done }} />
              выполнено
            </span>
            <span className="flex items-center gap-1">
              <span className="size-3 rounded-sm" style={{ backgroundColor: heat.empty }} />
              не запланировано
            </span>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="Детализация" subtitle={`${stats.from} — ${stats.to}`} />
        <ul className="max-h-80 divide-y divide-border overflow-y-auto">
          {stats.days.map((day) => (
            <li
              key={day.date}
              className="flex items-center justify-between gap-3 px-5 py-2 text-sm"
            >
              <span className="text-foreground">
                {format(new Date(`${day.date}T00:00:00`), 'd MMMM, EEEE', { locale: ru })}
              </span>
              <span
                className={
                  !day.planned
                    ? 'text-xs text-muted'
                    : day.done
                      ? 'text-xs font-medium text-success'
                      : 'text-xs font-medium text-danger'
                }
              >
                {!day.planned ? 'не запланировано' : day.done ? 'выполнено' : 'пропущено'}
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

