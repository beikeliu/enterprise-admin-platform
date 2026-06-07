import { Layout, Menu, Button, Avatar, Space } from 'antd';
import {
  ClipboardList,
  GitPullRequest,
  LayoutDashboard,
  LogOut,
  Settings,
  ShieldCheck,
} from 'lucide-react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/lib/auth-store';

const { Header, Sider, Content } = Layout;

const icons = {
  LayoutDashboard: <LayoutDashboard size={18} />,
  ClipboardList: <ClipboardList size={18} />,
  GitPullRequest: <GitPullRequest size={18} />,
  Settings: <Settings size={18} />,
  ShieldCheck: <ShieldCheck size={18} />,
};

export function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, menus, clear } = useAuthStore();

  return (
    <Layout className="app-shell">
      <Sider width={232} className="app-sider">
        <div className="app-logo">
          <div className="app-logo-mark">E</div>
          <span>Enterprise Admin</span>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menus.map((item) => ({
            key: item.path,
            icon: icons[item.icon as keyof typeof icons],
            label: <Link to={item.path}>{item.title}</Link>,
          }))}
        />
      </Sider>
      <Layout>
        <Header className="app-header">
          <div>
            <strong>企业级运营管理平台</strong>
          </div>
          <Space>
            <Avatar>{user?.displayName.slice(0, 1)}</Avatar>
            <span>{user?.displayName}</span>
            <Button
              icon={<LogOut size={16} />}
              onClick={() => {
                clear();
                navigate('/login');
              }}
            >
              退出
            </Button>
          </Space>
        </Header>
        <Content className="app-content">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
