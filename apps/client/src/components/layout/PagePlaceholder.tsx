import type { ReactNode } from 'react';

import { Card, EmptyState } from '../ui';

export function PagePlaceholder({
  title,
  description,
  icon,
  action,
}: {
  title: string;
  description: string;
  icon?: ReactNode;
  action?: ReactNode;
}): React.ReactElement {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-foreground">{title}</h1>
        <p className="mt-1 text-sm text-muted">{description}</p>
      </header>

      <Card>
        <EmptyState
          icon={icon}
          title="Раздел в разработке"
          description="Функциональность появится на следующем этапе."
          action={action}
        />
      </Card>
    </div>
  );
}
