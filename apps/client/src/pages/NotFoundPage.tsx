import { Link } from 'react-router-dom';

import { Button, Card } from '../components/ui';

export function NotFoundPage(): React.ReactElement {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <Card className="w-full max-w-md p-8 text-center">
        <p className="text-5xl font-black text-indigo-600">404</p>
        <h1 className="mt-3 text-lg font-semibold text-slate-900">Страница не найдена</h1>
        <p className="mt-1 text-sm text-slate-500">
          Возможно, ссылка устарела или адрес введён с ошибкой.
        </p>
        <Link to="/" className="mt-5 inline-block">
          <Button>На главную</Button>
        </Link>
      </Card>
    </div>
  );
}
