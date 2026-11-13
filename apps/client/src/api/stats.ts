import type { CalendarDto, DashboardDto, PeriodStatsDto, StatsPeriod } from '@habit/shared';

import { apiRequest } from './http';

export const statsApi = {
  dashboard: () => apiRequest<DashboardDto>('/stats/dashboard'),

  habit: (habitId: string, period: StatsPeriod) =>
    apiRequest<PeriodStatsDto>(`/stats/habits/${habitId}?period=${period}`),

  calendar: (month: string) => apiRequest<CalendarDto>(`/stats/calendar?month=${month}`),
};
