import { lazy, Suspense, type ReactElement } from 'react';
import { createBrowserRouter } from 'react-router-dom';

import { AppLayout } from './components/layout/AppLayout';
import { RequireAuth } from './components/layout/RequireAuth';
import { Spinner } from './components/ui';
import { DashboardPage } from './pages/DashboardPage';
import { HabitDetailsPage } from './pages/HabitDetailsPage';
import { HabitsPage } from './pages/HabitsPage';
import { LoginPage } from './pages/LoginPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { RegisterPage } from './pages/RegisterPage';
import { SettingsPage } from './pages/SettingsPage';

// Тяжёлая библиотека графиков (Recharts) подгружается только на странице статистики.
const StatsPage = lazy(async () => {
  const module = await import('./pages/StatsPage');
  return { default: module.StatsPage };
});

function LazyPage({ children }: { children: ReactElement }): ReactElement {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-24 text-indigo-600">
          <Spinner className="size-8" />
        </div>
      }
    >
      {children}
    </Suspense>
  );
}

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: 'habits', element: <HabitsPage /> },
          { path: 'habits/:habitId', element: <HabitDetailsPage /> },
          { path: 'stats', element: <LazyPage><StatsPage /></LazyPage> },
          { path: 'settings', element: <SettingsPage /> },
        ],
      },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
]);
