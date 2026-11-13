import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Archive, ArchiveRestore, Check, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import { WEEKDAY_LABELS, type HabitDto } from '@habit/shared';

import { entriesApi } from '../api/entries';
import { habitsApi } from '../api/habits';
import { ApiError } from '../api/http';
import { statsApi } from '../api/stats';
import { Button, Card, EmptyState, Spinner } from '../components/ui';
import { HabitIcon } from '../components/ui/HabitIcon';
import { HabitFormModal } from '../features/habits/HabitFormModal';
import { habitAccent, withTint } from '../lib/colors';
import { useTheme } from '../store/theme-context';

export function HabitsPage(): React.ReactElement {
  const [showArchived, setShowArchived] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<HabitDto | null>(null);
  const queryClient = useQueryClient();
  const { resolved } = useTheme();
  const isDark = resolved === 'dark';

  const habitsQuery = useQuery({
    queryKey: ['habits', showArchived],
    queryFn: () => habitsApi.list(showArchived),
  });

  const dashboardQuery = useQuery({
    queryKey: ['dashboard'],
    queryFn: statsApi.dashboard,
  });

  const today = dashboardQuery.data?.today ?? '';
  const doneMap = new Map(
    (dashboardQuery.data?.todayList ?? []).map((item) => [item.habitId, item]),
  );

  const invalidate = (): void => {
    void queryClient.invalidateQueries({ queryKey: ['habits'] });
    void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    void queryClient.invalidateQueries({ queryKey: ['habit-stats'] });
  };

  const toggleMutation = useMutation({
    mutationFn: async (habit: HabitDto) => {
      if (!today) {
        throw new ApiError(0, 'NO_DATE', 'Не удалось определить текущую дату');
      }
      if (doneMap.get(habit.id)?.done) {
        await entriesApi.remove(habit.id, today);
      } else {
        await entriesApi.set(habit.id, today);
      }
    },
    onSuccess: invalidate,
    onError: (error: unknown) => {
      toast.error(error instanceof ApiError ? error.message : 'Не удалось обновить отметку');
    },
  });

  const archiveMutation = useMutation({
    mutationFn: ({ habit, archived }: { habit: HabitDto; archived: boolean }) =>
      habitsApi.archive(habit.id, archived),
    onSuccess: (_data, variables) => {
      toast.success(variables.archived ? 'Привычка перемещена в архив' : 'Привычка восстановлена');
      invalidate();
    },
    onError: (error: unknown) => {
      toast.error(error instanceof ApiError ? error.message : 'Не удалось изменить архив');
    },
  });

  const removeMutation = useMutation({
    mutationFn: (habit: HabitDto) => habitsApi.remove(habit.id),
    onSuccess: () => {
      toast.success('Привычка удалена');
      invalidate();
    },
    onError: (error: unknown) => {
      toast.error(error instanceof ApiError ? error.message : 'Не удалось удалить привычку');
    },
  });

  const openCreate = (): void => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (habit: HabitDto): void => {
    setEditing(habit);
    setModalOpen(true);
  };

  const confirmRemove = (habit: HabitDto): void => {
    const confirmed = window.confirm(
      `Удалить привычку «${habit.title}»? Вся история отметок будет удалена безвозвратно.`,
    );
    if (confirmed) removeMutation.mutate(habit);
  };

  const habits = habitsQuery.data?.items ?? [];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Привычки</h1>
          <p className="mt-1 text-sm text-muted">
            Управляйте расписанием и отмечайте выполнение
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            icon={
              showArchived ? (
                <ArchiveRestore className="size-4" />
              ) : (
                <Archive className="size-4" />
              )
            }
            onClick={() => setShowArchived((value) => !value)}
          >
            {showArchived ? 'Активные' : 'Архив'}
          </Button>
          <Button onClick={openCreate} icon={<Plus className="size-4" />}>
            Новая привычка
          </Button>
        </div>
      </header>

      {habitsQuery.isLoading ? (
        <div className="flex items-center justify-center py-24 text-primary-text">
          <Spinner className="size-8" />
        </div>
      ) : habitsQuery.isError ? (
        <Card className="p-6">
          <p className="text-sm font-medium text-danger">Не удалось загрузить привычки</p>
          <Button className="mt-4" onClick={() => void habitsQuery.refetch()}>
            Повторить
          </Button>
        </Card>
      ) : habits.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Archive className="size-6" />}
            title={showArchived ? 'Архив пуст' : 'Привычек пока нет'}
            description={
              showArchived
                ? 'Архивированные привычки появятся здесь.'
                : 'Создайте первую привычку и начните отслеживать прогресс.'
            }
            action={
              showArchived ? undefined : (
                <Button onClick={openCreate} icon={<Plus className="size-4" />}>
                  Создать привычку
                </Button>
              )
            }
          />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {habits.map((habit) => {
            const todayState = doneMap.get(habit.id);
            const isToggling =
              toggleMutation.isPending && toggleMutation.variables?.id === habit.id;
            const isArchived = habit.archivedAt !== null;

            return (
              <Card key={habit.id} className="flex flex-col p-4">
                <div className="flex items-start gap-3">
                  <span
                    className="flex size-11 shrink-0 items-center justify-center rounded-xl"
                    style={{
                      backgroundColor: withTint(habit.color),
                      color: habitAccent(habit.color, isDark),
                    }}
                  >
                    <HabitIcon name={habit.icon} className="size-5" />
                  </span>

                  <div className="min-w-0 flex-1">
                    <Link
                      to={`/habits/${habit.id}`}
                      className="block truncate text-sm font-semibold text-foreground hover:text-primary-text"
                    >
                      {habit.title}
                    </Link>
                    {habit.description ? (
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted">
                        {habit.description}
                      </p>
                    ) : null}

                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {habit.weekdays.map((day) => (
                        <span
                          key={day}
                          className="rounded bg-surface-muted px-1.5 py-0.5 text-[10px] font-medium text-muted"
                        >
                          {WEEKDAY_LABELS[day]}
                        </span>
                      ))}
                      {isArchived ? (
                        <span className="rounded bg-warning/10 px-1.5 py-0.5 text-[10px] font-medium text-warning">
                          архив
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-surface-muted px-3 py-2 text-center">
                  <div>
                    <p className="text-sm font-bold text-foreground">
                      {habit.stats.currentStreak}
                    </p>
                    <p className="text-[10px] uppercase text-muted">серия</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">
                      {habit.stats.longestStreak}
                    </p>
                    <p className="text-[10px] uppercase text-muted">рекорд</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">{habit.stats.totalDone}</p>
                    <p className="text-[10px] uppercase text-muted">всего</p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  {isArchived ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      icon={<ArchiveRestore className="size-4" />}
                      onClick={() => archiveMutation.mutate({ habit, archived: false })}
                    >
                      Вернуть
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant={todayState?.done ? 'primary' : 'secondary'}
                      loading={isToggling}
                      icon={<Check className="size-4" />}
                      onClick={() => toggleMutation.mutate(habit)}
                    >
                      {todayState?.done ? 'Выполнено' : 'Отметить'}
                    </Button>
                  )}

                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label="Редактировать"
                    icon={<Pencil className="size-4" />}
                    onClick={() => openEdit(habit)}
                  />

                  {isArchived ? null : (
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label="В архив"
                      icon={<Archive className="size-4" />}
                      onClick={() => archiveMutation.mutate({ habit, archived: true })}
                    />
                  )}

                  <Button
                    size="sm"
                    variant="ghost"
                    className="ml-auto text-danger hover:bg-danger/10"
                    aria-label="Удалить"
                    icon={<Trash2 className="size-4" />}
                    onClick={() => confirmRemove(habit)}
                  />
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <HabitFormModal
        open={modalOpen}
        habit={editing}
        onClose={() => setModalOpen(false)}
        onSaved={invalidate}
      />
    </div>
  );
}

