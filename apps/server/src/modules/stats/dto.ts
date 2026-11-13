/**
 * Типы ответов статистики живут в общем пакете @habit/shared,
 * чтобы клиент и сервер использовали один контракт.
 */
export type {
  ActivityDayDto,
  ActivityDto,
  CalendarDayDto,
  CalendarDto,
  DashboardDto,
  DayCellDto,
  PeriodStatsDto,
  RangeSummaryDto,
  TodayHabitDto,
} from '@habit/shared';

