import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { Spinner } from '../ui';
import { useAuth } from '../../store/auth-context';

export function RequireAuth(): React.ReactElement {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center text-primary-text">
        <Spinner className="size-8" />
      </div>
    );
  }

  if (status === 'anonymous') {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
