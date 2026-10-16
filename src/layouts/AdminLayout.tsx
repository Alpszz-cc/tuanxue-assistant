import logo from '../assets/logo.svg';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Layout, Menu, Button, Space, Tag, Dropdown } from 'antd';
import {
  DashboardOutlined,
  DatabaseOutlined,
  NotificationOutlined,
  CustomerServiceOutlined,
  SettingOutlined,
  LogoutOutlined,
  SwapOutlined,
} from '@ant-design/icons';
import { useStore } from '../store';
import type { MockUser } from '../types';

const { Sider, Header, Content } = Layout;

/** 管理端布局（第 6 节）：左侧菜单 + 顶栏显示当前身份、「打开学生端」按钮 */
export default function AdminLayout() {
  const currentUser = useStore((s) => s.currentUser) as MockUser;
  const logout = useStore((s) => s.logout);
  const location = useLocation();
  const navigate = useNavigate();

  const selected = location.pathname.match(/\/admin\/(\w+)/)?.[1] ?? 'dashboard';

  return (
    <Layout className="admin-layout" style={{ minHeight: '100vh' }}>
      <Sider breakpoint="lg" collapsedWidth={64} width={200} theme="light" style={{ borderRight: '1px solid #f0f0f0' }}>
        <div className="admin-brand" title="武汉大学哲学学院团学事务助手">
          <img src={logo} width={36} height={36} alt="猫头鹰对话 Logo" />
          <div className="brand-full"><div className="school-name">武汉大学哲学学院</div><strong>团学事务助手</strong></div>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[selected]}
          onClick={({ key }) => navigate(`/admin/${key}`)}
          items={[
            { key: 'dashboard', icon: <DashboardOutlined />, label: '工作台' },
            { key: 'knowledge', icon: <DatabaseOutlined />, label: '知识库' },
            { key: 'notices', icon: <NotificationOutlined />, label: '通知发布' },
            { key: 'tickets', icon: <CustomerServiceOutlined />, label: '咨询汇总' },
            { key: 'settings', icon: <SettingOutlined />, label: '设置' },
          ]}
        />
      </Sider>
      <Layout style={{ minWidth: 0 }}>
        <Header
          className="admin-header"
          style={{
            background: '#fff',
            borderBottom: '1px solid #f0f0f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 24px',
            height: 56,
            lineHeight: '56px',
          }}
        >
          <Space className="admin-identity" wrap>
            <Tag color="red">演示 Demo</Tag>
            <span>
              当前身份：<b>{currentUser.name}</b><span className="admin-user-title">（{currentUser.title}）</span>
            </span>
          </Space>
          <Space>
            <Button
              icon={<SwapOutlined />}
              onClick={() => window.open('#/student/chat?as=stu001', '_blank')}
            >
              打开学生端
            </Button>
            <Dropdown
              menu={{
                items: [
                  {
                    key: 'logout',
                    icon: <LogoutOutlined />,
                    label: '退出登录',
                    onClick: () => {
                      logout();
                      navigate('/login', { replace: true });
                    },
                  },
                ],
              }}
            >
              <Button type="text">{currentUser.name}</Button>
            </Dropdown>
          </Space>
        </Header>
        <Content style={{ minWidth: 0, padding: 20, overflow: 'auto' }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
