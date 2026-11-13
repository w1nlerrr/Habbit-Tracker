/**
 * Типы ответов статистики живут в общем пакете @habit/shared,
 * чтобы клиент и сервер использовали один контракт.
 */
export type {
  CalendarDayDto,
  CalendarDto,
  DashboardDto,
  DayCellDto,
  PeriodStatsDto,
  RangeSummaryDto,
} from '@habit/shared';

