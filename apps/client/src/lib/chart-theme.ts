import { useTheme } from '../store/theme-context';

export type ChartTheme = {
  grid: string;
  axis: string;
  series: string;
  seriesSoft: string;
  tooltipBg: string;
  tooltipBorder: string;
  tooltipText: string;
};

const LIGHT: ChartTheme = {
  grid: '#e2e8f0',
  axis: '#64748b',
  series: '#6366f1',
  seriesSoft: '#c7d2fe',
  tooltipBg: '#ffffff',
  tooltipBorder: '#e2e8f0',
  tooltipText: '#0f172a',
};

const DARK: ChartTheme = {
  grid: '#22304a',
  axis: '#94a3b8',
  series: '#818cf8',
  seriesSoft: '#4f46e5',
  tooltipBg: '#16213a',
  tooltipBorder: '#22304a',
  tooltipText: '#e6edf7',
};

export function useChartTheme(): ChartTheme {
  const { resolved } = useTheme();
  return resolved === 'dark' ? DARK : LIGHT;
}
