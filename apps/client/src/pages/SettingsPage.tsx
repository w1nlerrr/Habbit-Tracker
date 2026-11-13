import { Settings } from 'lucide-react';

import { PagePlaceholder } from '../components/layout/PagePlaceholder';

export function SettingsPage(): React.ReactElement {
  return (
    <PagePlaceholder
      title="Настройки"
      description="Профиль, часовой пояс и резервное копирование"
      icon={<Settings className="size-6" />}
    />
  );
}
