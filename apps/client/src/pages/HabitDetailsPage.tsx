import { CalendarDays } from 'lucide-react';

import { PagePlaceholder } from '../components/layout/PagePlaceholder';

export function HabitDetailsPage(): React.ReactElement {
  return (
    <PagePlaceholder
      title="Привычка"
      description="Календарь активности и подробная статистика"
      icon={<CalendarDays className="size-6" />}
    />
  );
}
