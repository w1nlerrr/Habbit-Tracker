import { useMutation } from '@tanstack/react-query';
import { Clock, LogOut, Mail, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { authApi } from '../api/auth';
import { ApiError } from '../api/http';
import { Button, Card, CardHeader, Input } from '../components/ui';
import { BackupSection } from '../features/backup/BackupSection';
import { useAuth } from '../store/auth-context';

const TIMEZONES = [
  'Europe/Kaliningrad',
  'Europe/Moscow',
  'Europe/Samara',
  'Asia/Yekaterinburg',
  'Asia/Omsk',
  'Asia/Novosibirsk',
  'Asia/Krasnoyarsk',
  'Asia/Irkutsk',
  'Asia/Yakutsk',
  'Asia/Vladivostok',
  'Asia/Magadan',
  'Asia/Kamchatka',
  'UTC',
];

export function SettingsPage(): React.ReactElement {
  const { user, setUser, logout } = useAuth();
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [timezone, setTimezone] = useState(user?.timezone ?? 'Europe/Moscow');

  const updateMutation = useMutation({
    mutationFn: () =>
      authApi.updateProfile({
        displayName: displayName.trim(),
        timezone,
      }),
    onSuccess: (data) => {
      setUser(data.user);
      toast.success('Профиль сохранён');
    },
    onError: (error: unknown) => {
      toast.error(error instanceof ApiError ? error.message : 'Не удалось сохранить профиль');
    },
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Настройки</h1>
        <p className="mt-1 text-sm text-slate-500">Профиль, часовой пояс и данные аккаунта</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Профиль"
            subtitle="Часовой пояс определяет, какой день считается «сегодня»"
          />
          <form
            className="space-y-4 p-5"
            onSubmit={(event) => {
              event.preventDefault();
              updateMutation.mutate();
            }}
          >
            <Input
              label="Имя"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              maxLength={80}
            />

            <div className="space-y-1.5">
              <label htmlFor="timezone" className="block text-sm font-medium text-slate-700">
                Часовой пояс
              </label>
              <select
                id="timezone"
                value={timezone}
                onChange={(event) => setTimezone(event.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:outline-none"
              >
                {TIMEZONES.map((zone) => (
                  <option key={zone} value={zone}>
                    {zone}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500">
                Сейчас в браузере: {Intl.DateTimeFormat().resolvedOptions().timeZone}
              </p>
            </div>

            <Button type="submit" loading={updateMutation.isPending}>
              Сохранить изменения
            </Button>
          </form>
        </Card>

        <Card>
          <CardHeader title="Аккаунт" subtitle="Данные текущей сессии" />
          <div className="space-y-3 p-5 text-sm">
            <p className="flex items-center gap-2 text-slate-600">
              <Mail className="size-4 text-slate-400" />
              {user?.email}
            </p>
            <p className="flex items-center gap-2 text-slate-600">
              <ShieldCheck className="size-4 text-slate-400" />
              Роль: {user?.role === 'admin' ? 'администратор' : 'пользователь'}
            </p>
            <p className="flex items-center gap-2 text-slate-600">
              <Clock className="size-4 text-slate-400" />
              Часовой пояс: {user?.timezone}
            </p>

            <div className="pt-2">
              <Button
                variant="secondary"
                icon={<LogOut className="size-4" />}
                onClick={() => void logout()}
              >
                Выйти из аккаунта
              </Button>
            </div>
          </div>
        </Card>

        <div className="lg:col-span-2">
          <BackupSection />
        </div>
      </div>
    </div>
  );
}

