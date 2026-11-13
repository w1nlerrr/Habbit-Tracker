import { BarChart3 } from 'lucide-react';

import { PagePlaceholder } from '../components/layout/PagePlaceholder';

export function StatsPage(): React.ReactElement {
  return (
    <PagePlaceholder
      title="Статистика"
      description="Выполнение за неделю и месяц, динамика серий"
      icon={<BarChart3 className="size-6" />}
    />
  );
}
