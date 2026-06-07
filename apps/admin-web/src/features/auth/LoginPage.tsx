import { Button, Form, Input, message } from 'antd';
import { useMutation } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const setSession = useAuthStore((state) => state.setSession);
  const mutation = useMutation({
    mutationFn: api.login,
    onSuccess: (session) => {
      setSession(session);
      const fromQuery = new URLSearchParams(location.search).get('from');
      const base = import.meta.env.BASE_URL === '/' ? '' : import.meta.env.BASE_URL.replace(/\/$/, '');
      const normalizedFrom = fromQuery?.startsWith(base) ? fromQuery.slice(base.length) || '/dashboard' : fromQuery;
      navigate(normalizedFrom || (location.state as { from?: string } | null)?.from || '/dashboard', { replace: true });
    },
    onError: (error) => message.error(error.message),
  });

  return (
    <main className="login-page">
      <section className="login-panel">
        <h1 className="page-title">Enterprise Admin</h1>
        <div className="page-subtitle">集团级运营、审批、权限与审计平台</div>
        <Form
          layout="vertical"
          style={{ marginTop: 26 }}
          initialValues={{ username: 'admin', password: 'admin123' }}
          onFinish={(values) => mutation.mutate(values)}
        >
          <Form.Item name="username" label="账号" rules={[{ required: true }]}>
            <Input size="large" autoComplete="username" />
          </Form.Item>
          <Form.Item name="password" label="密码" rules={[{ required: true }]}>
            <Input.Password size="large" autoComplete="current-password" />
          </Form.Item>
          <Button block type="primary" size="large" htmlType="submit" loading={mutation.isPending}>
            登录
          </Button>
        </Form>
      </section>
    </main>
  );
}
