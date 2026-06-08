import { Layout, Menu, Button, Avatar, Space, Breadcrumb } from 'antd';
import {
  ClipboardList,
  Github,
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

const routeLabels: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /^\/tickets\/new$/, label: '新建工单' },
  { pattern: /^\/tickets\/[^/]+$/, label: '工单详情' },
  { pattern: /^\/workflow\/kanban$/, label: '任务看板' },
  { pattern: /^\/workflow\/templates$/, label: '流程模板' },
  { pattern: /^\/workflow\/tasks$/, label: '审批任务' },
  { pattern: /^\/system\/monitor$/, label: '系统监控' },
];

export function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, menus, clear } = useAuthStore();
  const selectedMenu = findSelectedMenu(menus, location.pathname);
  const selectedKey = selectedMenu?.path;
  const leafLabel = routeLabels.find((item) => item.pattern.test(location.pathname))?.label;
  const breadcrumbItems = [
    { title: '首页' },
    ...(selectedMenu ? [{ title: selectedMenu.title }] : []),
    ...(leafLabel && leafLabel !== selectedMenu?.title ? [{ title: leafLabel }] : []),
  ];

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
          selectedKeys={selectedKey ? [selectedKey] : []}
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
            <Button
              icon={<Github size={16} />}
              href="https://github.com/beikeliu/enterprise-admin-platform"
              target="_blank"
            >
              GitHub
            </Button>
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
          <Breadcrumb className="app-breadcrumb" items={breadcrumbItems} />
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}

function findSelectedMenu(menus: Array<{ path: string; title: string }>, pathname: string) {
  const exact = menus.find((item) => item.path === pathname);
  if (exact) return exact;
  return menus
    .filter((item) => pathname === item.path || pathname.startsWith(`${item.path}/`))
    .sort((a, b) => b.path.length - a.path.length)[0];
}
