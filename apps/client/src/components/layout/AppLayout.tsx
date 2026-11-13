import {
  BarChart3,
  CalendarCheck,
  LayoutDashboard,
  LogOut,
  Settings,
  Sparkles,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';

import { Button } from '../ui';
import { ThemeToggle } from '../ui/ThemeToggle';
import { pageVariants } from '../../lib/motion';
import { useAuth } from '../../store/auth-context';

const navItems = [
  { to: '/', label: 'Дашборд', icon: LayoutDashboard, end: true },
  { to: '/habits', label: 'Привычки', icon: CalendarCheck, end: false },
  { to: '/stats', label: 'Статистика', icon: BarChart3, end: false },
  { to: '/settings', label: 'Настройки', icon: Settings, end: false },
];

function NavItems(): React.ReactElement {
  return (
    <>
      {navItems.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            [
              'flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition',
              isActive
                ? 'bg-primary/10 text-primary-text'
                : 'text-muted hover:bg-surface-muted hover:text-foreground',
            ].join(' ')
          }
        >
          <Icon className="size-4.5" />
          {label}
        </NavLink>
      ))}
    </>
  );
}

export function AppLayout(): React.ReactElement {
  const { user, logout } = useAuth();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-page text-foreground lg:flex">
      <aside className="hidden w-64 shrink-0 border-r border-border bg-surface lg:flex lg:flex-col">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-white">
            <Sparkles className="size-5" />
          </span>
          <div>
            <p className="text-sm font-bold leading-tight text-foreground">Habit Tracker</p>
            <p className="text-xs text-muted">трекер привычек</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3">
          <NavItems />
        </nav>

        <div className="border-t border-border p-4">
          <p className="truncate text-sm font-medium text-foreground">{user?.displayName}</p>
          <p className="truncate text-xs text-muted">{user?.email}</p>
          <div className="mt-3 flex gap-2">
            <ThemeToggle withLabel />
            <Button
              variant="secondary"
              size="sm"
              className="flex-1"
              icon={<LogOut className="size-4" />}
              onClick={() => void logout()}
            >
              Выйти
            </Button>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-border bg-surface/90 backdrop-blur lg:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-white">
                <Sparkles className="size-4" />
              </span>
              <span className="text-sm font-bold text-foreground">Habit Tracker</span>
            </div>
            <div className="flex items-center gap-1">
              <ThemeToggle />
              <Button
                variant="ghost"
                size="sm"
                icon={<LogOut className="size-4" />}
                onClick={() => void logout()}
                aria-label="Выйти"
              />
            </div>
          </div>
          <nav className="flex gap-1 overflow-x-auto px-2 pb-2">
            <NavItems />
          </nav>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 lg:px-8">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={location.pathname}
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
