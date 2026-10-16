import logo from '../assets/logo.svg';
import { useState } from 'react';
import { Card, Typography, Button, Space, Divider, Tag, App } from 'antd';
import { QuestionCircleOutlined, TeamOutlined, UserOutlined, CrownOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { MOCK_STUDENTS, MOCK_ADMINS } from '../types';
import type { MockUser } from '../types';

const { Title, Text } = Typography;

/**
 * 登录页（第 6 节）：不做真实登录。
 * 两张大卡片「我是学生」「我是老师 / 学生干部」→ 选中后再选具体 mock 身份。
 */
export default function Login() {
  const { message } = App.useApp();
  const login = useStore((s) => s.login);
  const currentUser = useStore((s) => s.currentUser);
  const navigate = useNavigate();
  const [picked, setPicked] = useState<'student' | 'admin' | null>(null);

  const enter = (user: MockUser) => {
    login(user);
    message.success(`欢迎，${user.name}`);
    navigate(user.role === 'student' ? '/student/chat' : '/admin/dashboard', { replace: true });
  };

  const users = picked === 'student' ? MOCK_STUDENTS : picked === 'admin' ? MOCK_ADMINS : [];

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(160deg, #fff5f6 0%, #f5f5f5 55%, #ffe9ec 100%)',
        padding: 24,
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: 36 }}>
        <img src={logo} width={72} height={72} alt="猫头鹰对话 Logo" />
        <Title level={2} style={{ marginBottom: 8, color: '#C8102E' }}>
          武汉大学哲学学院团学事务助手
        </Title>
        <Text type="secondary" style={{ fontSize: 16 }}>
          综测 · 奖助 · 团务 · 活动 —— 制度问答与事务办理一站式服务
        </Text>
      </div>

      {picked === null ? (
        <Space size="large" wrap style={{ justifyContent: 'center' }}>
          <Card
            hoverable
            role="button"
            tabIndex={0}
            style={{ width: 280, textAlign: 'center', borderColor: '#ffd6dd' }}
            onClick={() => setPicked('student')}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setPicked('student'); } }}
          >
            <UserOutlined style={{ fontSize: 48, color: '#C8102E' }} />
            <Title level={4} style={{ marginTop: 12, marginBottom: 4 }}>
              我是学生
            </Title>
            <Text type="secondary">查通知 · 问制度 · 追踪我的咨询</Text>
          </Card>
          <Card
            hoverable
            role="button"
            tabIndex={0}
            style={{ width: 280, textAlign: 'center', borderColor: '#ffd6dd' }}
            onClick={() => setPicked('admin')}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setPicked('admin'); } }}
          >
            <TeamOutlined style={{ fontSize: 48, color: '#C8102E' }} />
            <Title level={4} style={{ marginTop: 12, marginBottom: 4 }}>
              我是老师 / 学生干部
            </Title>
            <Text type="secondary">建知识库 · 发通知 · 处理咨询</Text>
          </Card>
        </Space>
      ) : (
        <Card style={{ width: 420, maxWidth: '100%' }}>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            {users.map((u) => (
              <Button
                key={u.id}
                size="large"
                block
                icon={u.role === 'admin' ? <CrownOutlined /> : <QuestionCircleOutlined />}
                onClick={() => enter(u)}
                style={{ textAlign: 'left', height: 'auto', padding: '12px 16px' }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: 16 }}>{u.name}</div>
                  <Text type="secondary">{u.title}</Text>
                </div>
              </Button>
            ))}
          </Space>
          <Divider />
          <Button type="link" onClick={() => setPicked(null)} style={{ padding: 0 }}>
            ← 返回重选身份类型
          </Button>
        </Card>
      )}

      <div style={{ marginTop: 40 }}>
        <Tag color="red">演示 Demo</Tag>
        <Tag>数据仅存于本浏览器 localStorage</Tag>
        {currentUser && (
          <Button type="link" onClick={() => enter(currentUser)}>
            继续上次身份（{currentUser.name}）
          </Button>
        )}
      </div>
    </div>
  );
}
