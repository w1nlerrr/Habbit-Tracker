export type RangeSummaryDto = {
  from: string;
  to: string;
  planned: number;
  done: number;
  completionPct: number;
};

export type DashboardDto = {
  today: string;
  habits: {
    active: number;
    plannedToday: number;
    doneToday: number;
  };
  streaks: {
    best: number;
    totalCurrent: number;
  };
  week: RangeSummaryDto;
  month: RangeSummaryDto;
  totalDone: number;
};

export type DayCellDto = {
  date: string;
  planned: boolean;
  done: boolean;
};

export type PeriodStatsDto = {
  habitId: string;
  period: 'week' | 'month';
  from: string;
  to: string;
  planned: number;
  done: number;
  completionPct: number;
  currentStreak: number;
  longestStreak: number;
  totalDone: number;
  days: DayCellDto[];
};

export type CalendarDayDto = {
  date: string;
  plannedCount: number;
  doneCount: number;
  completionPct: number;
};

export type CalendarDto = {
  month: string;
  from: string;
  to: string;
  days: CalendarDayDto[];
  totals: {
    planned: number;
    done: number;
    completionPct: number;
  };
};
