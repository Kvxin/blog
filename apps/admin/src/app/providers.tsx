import type { PropsWithChildren } from 'react';
import { App, ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../features/auth/AuthProvider';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

export function Providers({ children }: PropsWithChildren) {
  return (
    <ConfigProvider locale={zhCN} theme={{ token: { colorPrimary: '#315efb', borderRadius: 8 } }}>
      <App>
        <QueryClientProvider client={queryClient}><AuthProvider>{children}</AuthProvider></QueryClientProvider>
      </App>
    </ConfigProvider>
  );
}
