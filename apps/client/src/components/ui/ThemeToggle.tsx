import { Monitor, Moon, Sun } from 'lucide-react';

import { useTheme, type ThemeMode } from '../../store/theme-context';
import { Button } from './Button';

/** Компактный переключатель светлая ↔ тёмная. */
export function ThemeToggle({ withLabel = false }: { withLabel?: boolean }): React.ReactElement {
  const { resolved, toggle } = useTheme();
  const isDark = resolved === 'dark';

  return (
    <Button
      variant="ghost"
      size="sm"
      aria-label={isDark ? 'Включить светлую тему' : 'Включить тёмную тему'}
      title={isDark ? 'Светлая тема' : 'Тёмная тема'}
      icon={isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
      onClick={toggle}
    >
      {withLabel ? (isDark ? 'Светлая' : 'Тёмная') : null}
    </Button>
  );
}

const OPTIONS: Array<{ value: ThemeMode; label: string; icon: React.ReactNode }> = [
  { value: 'light', label: 'Светлая', icon: <Sun className="size-4" /> },
  { value: 'dark', label: 'Тёмная', icon: <Moon className="size-4" /> },
  { value: 'system', label: 'Системная', icon: <Monitor className="size-4" /> },
];

/** Три режима темы — для страницы настроек. */
export function ThemeModeSelect(): React.ReactElement {
  const { mode, setMode } = useTheme();

  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Тема оформления">
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={mode === option.value}
          onClick={() => setMode(option.value)}
          className={[
            'inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-sm font-medium transition',
            mode === option.value
              ? 'border-primary/40 bg-primary/10 text-primary-text'
              : 'border-border bg-surface text-muted hover:bg-surface-muted hover:text-foreground',
          ].join(' ')}
        >
          {option.icon}
          {option.label}
        </button>
      ))}
    </div>
  );
}
