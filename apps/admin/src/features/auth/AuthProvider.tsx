import { createContext, useContext, useEffect, type PropsWithChildren } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Spin } from 'antd';
import { Navigate, Outlet } from 'react-router-dom';
import type { AuthResponse } from '@blog/contracts';
import { getSession } from '../../lib/api-client';

type AuthState = { session: AuthResponse | null | undefined; loading: boolean; error: boolean; refresh: () => void };
const AuthContext = createContext<AuthState | null>(null);
export function AuthProvider({ children }: PropsWithChildren) {
  const client = useQueryClient();
  const query = useQuery({ queryKey: ['session'], queryFn: getSession, retry: false, staleTime: 60_000 });
  useEffect(() => {
    const expired = async () => {
      await client.cancelQueries({ queryKey: ['session'] });
      client.removeQueries({ predicate: (q) => q.queryKey[0] !== 'session' && q.queryKey[0] !== 'health' });
      client.setQueryData(['session'], null);
    };
    window.addEventListener('session-expired', expired);
    return () => window.removeEventListener('session-expired', expired);
  }, [client]);
  return <AuthContext.Provider value={{ session: query.data, loading: query.isPending, error: query.isError, refresh: () => void query.refetch() }}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('AuthProvider is missing');
  return context;
}
export function RequireAuth() {
  const auth = useAuth();
  if (auth.loading) return <div className="auth-loading"><Spin size="large" /></div>;
  if (auth.error) return <div className="auth-loading"><Alert type="error" title="无法检查登录状态" action={<Button onClick={auth.refresh}>重试</Button>} /></div>;
  if (!auth.session) return <Navigate to="/login" replace />;
  return <Outlet />;
}
