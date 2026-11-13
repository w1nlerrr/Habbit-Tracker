import { zodResolver } from '@hookform/resolvers/zod';
import { Sparkles } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { registerSchema, type RegisterInput } from '@habit/shared';

import { ApiError } from '../api/http';
import { Button, Card, Input } from '../components/ui';
import { useAuth } from '../store/auth-context';

export function RegisterPage(): React.ReactElement {
  const { status, register: registerUser } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
      password: '',
      displayName: '',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Moscow',
    },
  });

  if (status === 'authenticated') {
    return <Navigate to="/" replace />;
  }

  const onSubmit = async (values: RegisterInput): Promise<void> => {
    try {
      await registerUser(values);
      toast.success('Аккаунт создан. Добро пожаловать!');
      navigate('/', { replace: true });
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : 'Не удалось зарегистрироваться',
      );
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-200">
            <Sparkles className="size-6" />
          </span>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Habit Tracker</h1>
            <p className="text-sm text-slate-500">Начните формировать полезные привычки</p>
          </div>
        </div>

        <Card className="p-6">
          <h2 className="text-lg font-semibold text-slate-900">Создание аккаунта</h2>
          <p className="mt-1 text-sm text-slate-500">Все данные хранятся только в вашем экземпляре</p>

          <form className="mt-5 space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
            <Input
              label="Имя"
              autoComplete="name"
              placeholder="Как к вам обращаться"
              error={errors.displayName?.message}
              {...register('displayName')}
            />
            <Input
              label="Электронная почта"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              error={errors.email?.message}
              {...register('email')}
            />
            <Input
              label="Пароль"
              type="password"
              autoComplete="new-password"
              placeholder="Минимум 8 символов"
              hint="Используйте буквы разного регистра, цифры и символы"
              error={errors.password?.message}
              {...register('password')}
            />

            <Button type="submit" className="w-full" loading={isSubmitting}>
              Создать аккаунт
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-slate-600">
            Уже есть аккаунт?{' '}
            <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
              Войти
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
}
