import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import type { LoginInput, LoginResponse, RegisterInput, UserDto } from '@habit/shared';

import { authApi } from '../api/auth';
import { setAccessToken, setRefreshHandler } from '../api/http';

type AuthStatus = 'loading' | 'authenticated' | 'anonymous';

type AuthContextValue = {
  user: UserDto | null;
  status: AuthStatus;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: UserDto) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }): ReactNode {
  const [user, setUser] = useState<UserDto | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');
  const bootstrapped = useRef(false);

  const applySession = useCallback((payload: LoginResponse) => {
    setAccessToken(payload.accessToken);
    setUser(payload.user);
    setStatus('authenticated');
  }, []);

  /**
   * Восстановление сессии: refresh-cookie → новый access-токен.
   * Токен доступа живёт только в памяти вкладки.
   */
  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;

    const refresh = async (): Promise<boolean> => {
      try {
        const response = await authApi.refresh();
        applySession(response);
        return true;
      } catch {
        setAccessToken(null);
        setUser(null);
        setStatus('anonymous');
        return false;
      }
    };

    setRefreshHandler(refresh);
    void refresh();

    return () => setRefreshHandler(null);
  }, [applySession]);

  const login = useCallback(
    async (input: LoginInput) => {
      applySession(await authApi.login(input));
    },
    [applySession],
  );

  const register = useCallback(
    async (input: RegisterInput) => {
      applySession(await authApi.register(input));
    },
    [applySession],
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      setAccessToken(null);
      setUser(null);
      setStatus('anonymous');
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, status, login, register, logout, setUser }),
    [user, status, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth должен использоваться внутри AuthProvider');
  }
  return context;
}
