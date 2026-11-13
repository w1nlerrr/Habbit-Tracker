import { zodResolver } from '@hookform/resolvers/zod';
import { Sparkles } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { loginSchema, type LoginInput } from '@habit/shared';

import { ApiError } from '../api/http';
import { Button, Card, Input } from '../components/ui';
import { useAuth } from '../store/auth-context';

export function LoginPage(): React.ReactElement {
  const { status, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  if (status === 'authenticated') {
    return <Navigate to="/" replace />;
  }

  const onSubmit = async (values: LoginInput): Promise<void> => {
    try {
      await login(values);
      toast.success('С возвращением!');
      const from = (location.state as { from?: string } | null)?.from;
      navigate(from && from !== '/login' ? from : '/', { replace: true });
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Не удалось войти');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-page px-4 py-10 text-foreground">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-primary text-white shadow-lg shadow-primary/20">
            <Sparkles className="size-6" />
          </span>
          <div>
            <h1 className="text-xl font-bold text-foreground">Habit Tracker</h1>
            <p className="text-sm text-muted">Отслеживайте привычки каждый день</p>
          </div>
        </div>

        <Card className="p-6">
          <h2 className="text-lg font-semibold text-foreground">Вход в аккаунт</h2>
          <p className="mt-1 text-sm text-muted">Введите почту и пароль, чтобы продолжить</p>

          <form className="mt-5 space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
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
              autoComplete="current-password"
              placeholder="••••••••"
              error={errors.password?.message}
              {...register('password')}
            />

            <Button type="submit" className="w-full" loading={isSubmitting}>
              Войти
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-muted">
            Нет аккаунта?{' '}
            <Link
              to="/register"
              className="font-medium text-primary-text transition hover:opacity-80"
            >
              Зарегистрироваться
            </Link>
          </p>
        </Card>

        <div className="mt-4 rounded-xl border border-border bg-surface/70 px-4 py-3 text-xs text-muted">
          <p className="font-medium text-foreground">Демонстрационный доступ</p>
          <p className="mt-1">
            demo@habit.local / Demo12345!
            <br />
            admin@habit.local / Admin12345!
          </p>
        </div>
      </div>
    </div>
  );
}

