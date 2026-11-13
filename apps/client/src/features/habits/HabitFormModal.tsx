import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { habitCreateSchema, WEEKDAY_LABELS, type HabitDto, type Weekday } from '@habit/shared';

import { habitsApi } from '../../api/habits';
import { ApiError } from '../../api/http';
import { Button, Input, Modal } from '../../components/ui';
import { HABIT_COLORS, HABIT_ICON_NAMES, HabitIcon } from '../../components/ui/HabitIcon';

type FormInput = z.input<typeof habitCreateSchema>;

const WEEKDAYS: Weekday[] = [1, 2, 3, 4, 5, 6, 7];

const DEFAULTS: FormInput = {
  title: '',
  description: '',
  color: '#6366F1',
  icon: 'star',
  frequency: 'daily',
  weekdays: WEEKDAYS,
};

export function HabitFormModal({
  open,
  habit,
  onClose,
  onSaved,
}: {
  open: boolean;
  habit: HabitDto | null;
  onClose: () => void;
  onSaved: () => void;
}): React.ReactElement {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormInput>({
    // zodResolver типизирует вход и выход схемы по-разному,
    // а форме достаточно входного типа: значения по умолчанию подставит сервер.
    resolver: zodResolver(habitCreateSchema) as Resolver<FormInput>,
    defaultValues: DEFAULTS,
  });

  const frequency = watch('frequency') ?? 'daily';
  const selectedWeekdays = watch('weekdays') ?? [];
  const selectedColor = watch('color') ?? '#6366F1';
  const selectedIcon = watch('icon') ?? 'star';

  useEffect(() => {
    if (!open) return;

    reset(
      habit
        ? {
            title: habit.title,
            description: habit.description ?? '',
            color: habit.color,
            icon: habit.icon,
            frequency: habit.frequency,
            weekdays: habit.weekdays,
          }
        : DEFAULTS,
    );
  }, [open, habit, reset]);

  const toggleWeekday = (day: Weekday): void => {
    const next = selectedWeekdays.includes(day)
      ? selectedWeekdays.filter((item) => item !== day)
      : [...selectedWeekdays, day].sort((a, b) => a - b);
    setValue('weekdays', next, { shouldValidate: true });
  };

  const onSubmit = handleSubmit(async (values) => {
    const payload = {
      title: values.title,
      description: values.description?.trim() ? values.description.trim() : null,
      color: values.color ?? '#6366F1',
      icon: values.icon ?? 'star',
      frequency: values.frequency ?? 'daily',
      weekdays: (values.frequency ?? 'daily') === 'custom' ? values.weekdays : undefined,
    };

    try {
      if (habit) {
        await habitsApi.update(habit.id, payload);
        toast.success('Привычка обновлена');
      } else {
        await habitsApi.create(payload);
        toast.success('Привычка создана');
      }
      onSaved();
      onClose();
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : 'Не удалось сохранить привычку',
      );
    }
  });

  return (
    <Modal
      open={open}
      title={habit ? 'Редактирование привычки' : 'Новая привычка'}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Отмена
          </Button>
          <Button onClick={() => void onSubmit()} loading={isSubmitting}>
            {habit ? 'Сохранить' : 'Создать'}
          </Button>
        </>
      }
    >
      <form className="space-y-4" onSubmit={onSubmit} noValidate>
        <Input
          label="Название"
          placeholder="Например: Зарядка 15 минут"
          error={errors.title?.message}
          {...register('title')}
        />

        <div className="space-y-1.5">
          <label htmlFor="habit-description" className="block text-sm font-medium text-foreground">
            Описание (необязательно)
          </label>
          <textarea
            id="habit-description"
            rows={3}
            placeholder="Зачем эта привычка и как её выполнять"
            className="w-full resize-none rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm shadow-sm transition placeholder:text-muted/70 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
            {...register('description')}
          />
          {errors.description?.message ? (
            <p className="text-xs text-danger">{errors.description.message}</p>
          ) : null}
        </div>

        <div>
          <p className="mb-1.5 text-sm font-medium text-foreground">Цвет</p>
          <div className="flex flex-wrap gap-2">
            {HABIT_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                aria-label={`Цвет ${color}`}
                aria-pressed={selectedColor === color}
                className={`size-8 rounded-full border-2 transition ${
                  selectedColor === color ? 'scale-110 border-foreground' : 'border-transparent'
                }`}
                style={{ backgroundColor: color }}
                onClick={() => setValue('color', color, { shouldValidate: true })}
              />
            ))}
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-sm font-medium text-foreground">Иконка</p>
          <div className="grid grid-cols-7 gap-2">
            {HABIT_ICON_NAMES.map((icon) => (
              <button
                key={icon}
                type="button"
                aria-label={`Иконка ${icon}`}
                aria-pressed={selectedIcon === icon}
                className={`flex h-9 items-center justify-center rounded-lg border transition ${
                  selectedIcon === icon
                    ? 'border-primary bg-primary/10 text-primary-text'
                    : 'border-border text-muted hover:bg-surface-muted'
                }`}
                onClick={() => setValue('icon', icon, { shouldValidate: true })}
              >
                <HabitIcon name={icon} className="size-4" />
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-sm font-medium text-foreground">Расписание</p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={frequency === 'daily' ? 'primary' : 'secondary'}
              onClick={() => {
                setValue('frequency', 'daily', { shouldValidate: true });
                setValue('weekdays', WEEKDAYS, { shouldValidate: true });
              }}
            >
              Каждый день
            </Button>
            <Button
              size="sm"
              variant={frequency === 'custom' ? 'primary' : 'secondary'}
              onClick={() => {
                setValue('frequency', 'custom', { shouldValidate: true });
                if (selectedWeekdays.length === 0) {
                  setValue('weekdays', [1, 3, 5], { shouldValidate: true });
                }
              }}
            >
              Выбранные дни
            </Button>
          </div>

          {frequency === 'custom' ? (
            <>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {WEEKDAYS.map((day) => (
                  <button
                    key={day}
                    type="button"
                    aria-pressed={selectedWeekdays.includes(day)}
                    className={`h-8 rounded-lg px-2.5 text-xs font-medium transition ${
                      selectedWeekdays.includes(day)
                        ? 'bg-primary text-white'
                        : 'bg-surface-muted text-muted hover:bg-surface-muted'
                    }`}
                    onClick={() => toggleWeekday(day)}
                  >
                    {WEEKDAY_LABELS[day]}
                  </button>
                ))}
              </div>
              {errors.weekdays?.message ? (
                <p className="mt-1 text-xs text-danger">{errors.weekdays.message}</p>
              ) : null}
            </>
          ) : null}
        </div>
      </form>
    </Modal>
  );
}
