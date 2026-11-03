import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Alert, App, Button, Card, Form, Input, Typography } from 'antd';
import { Navigate, useNavigate } from 'react-router-dom';
import { login, errorMessage } from '../../lib/api-client';
import { useAuth } from './AuthProvider';

export function LoginPage() {
  const auth = useAuth();
  const client = useQueryClient();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const [busy, setBusy] = useState(false);
  if (auth.session) return <Navigate to="/" replace />;
  const submit = async (values: { email: string; password: string }) => {
    setBusy(true);
    try {
      const session = await login(values.email, values.password);
      client.setQueryData(['session'], session);
      navigate('/', { replace: true });
    } catch (error) { message.error(errorMessage(error)); }
    finally { setBusy(false); }
  };
  return (
    <main className="login-page">
      <Card className="login-card">
        <Typography.Title level={2}>Blog Console</Typography.Title>
        <Typography.Paragraph type="secondary">管理员登录 · 无公开注册</Typography.Paragraph>
        {location.protocol !== 'https:' && <Alert type="warning" showIcon title="当前连接没有 HTTPS"
          description="HTTP 无法保护登录密码。建议通过 SSH 隧道在本机访问，或配置 HTTPS 后再公网登录。" style={{ marginBottom: 24 }} />}
        <Form layout="vertical" onFinish={submit}>
          <Form.Item name="email" label="邮箱" rules={[{ required: true, type: 'email', message: '请输入邮箱' }]}>
            <Input autoComplete="username" maxLength={254} />
          </Form.Item>
          <Form.Item name="password" label="密码" rules={[{ required: true, message: '请输入密码' }]}>
            <Input.Password autoComplete="current-password" maxLength={256} />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={busy}>登录</Button>
        </Form>
      </Card>
    </main>
  );
}
