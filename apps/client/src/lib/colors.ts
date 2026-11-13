/** Полупрозрачный оттенок привычки (работает в обеих темах). */
export function withTint(hex: string, percent = 14): string {
  return `color-mix(in srgb, ${hex} ${percent}%, transparent)`;
}

/** Цвет текста/иконки привычки: в тёмной теме слегка осветляем. */
export function habitAccent(hex: string, isDark: boolean): string {
  return isDark ? `color-mix(in srgb, ${hex} 78%, white)` : hex;
}

/** Палитра календаря активности для светлой и тёмной темы. */
export type HeatPalette = {
  empty: string;
  missed: string;
  done: string;
};

export const HEAT_PALETTE: Record<'light' | 'dark', HeatPalette> = {
  light: { empty: '#f1f5f9', missed: '#e2e8f0', done: '#10b981' },
  dark: { empty: '#1b2740', missed: '#334155', done: '#34d399' },
};

