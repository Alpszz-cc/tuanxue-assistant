import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Badge } from 'antd';
import {
  MessageOutlined,
  NotificationOutlined,
  CustomerServiceOutlined,
} from '@ant-design/icons';
import { noticeVisibleTo, useStore } from '../store';
import type { MockUser } from '../types';

/**
 * 学生端布局（第 6 节）：手机版式，内容区最大宽 480px 居中；
 * 底部 Tab：问答 / 通知（未读角标）/ 我的咨询（新回复角标）。
 * antd 6 没有 TabBar 组件，用 antd Badge + 自定义导航条实现（不引入 antd-mobile）。
 */
const TABS = [
  { key: 'chat', title: '问答', icon: <MessageOutlined /> },
  { key: 'notices', title: '通知', icon: <NotificationOutlined /> },
  { key: 'tickets', title: '我的咨询', icon: <CustomerServiceOutlined /> },
];

export default function StudentLayout() {
  const currentUser = useStore((s) => s.currentUser) as MockUser;
  const notices = useStore((s) => s.notices);
  const tickets = useStore((s) => s.tickets);
  const location = useLocation();
  const navigate = useNavigate();

  const visible = notices.filter((n) => noticeVisibleTo(n, currentUser));
  const unread = visible.filter((n) => !n.readBy.includes(currentUser.id)).length;
  const newReplies = tickets.filter(
    (t) => t.studentId === currentUser.id && t.status === '已回复' && !t.studentSeen
  ).length;

  const badgeOf = (key: string): number =>
    key === 'notices' ? unread : key === 'tickets' ? newReplies : 0;

  const activeKey = location.pathname.split('/').pop() ?? 'chat';

  return (
    <div className="student-viewport">
      <div className="student-shell">
        <div className="student-body">
          <Outlet />
        </div>
        <div
          style={{
            borderTop: '1px solid #f0f0f0',
            display: 'flex',
            background: '#fff',
            paddingBottom: 'env(safe-area-inset-bottom)',
          }}
        >
          {TABS.map((tab) => {
            const active = activeKey === tab.key;
            const count = badgeOf(tab.key);
            return (
              <button
                type="button"
                aria-label={tab.title}
                aria-current={active ? 'page' : undefined}
                key={tab.key}
                onClick={() => navigate(`/student/${tab.key}`)}
                style={{
                  flex: 1,
                  border: 0,
                  background: 'transparent',
                  fontFamily: 'inherit',
                  textAlign: 'center',
                  padding: '8px 0 10px',
                  cursor: 'pointer',
                  color: active ? '#C8102E' : '#666',
                  fontSize: 12,
                  userSelect: 'none',
                }}
              >
                <Badge count={count} size="small" offset={[2, -2]}>
                  <div style={{ fontSize: 22, lineHeight: '26px' }}>{tab.icon}</div>
                </Badge>
                <div style={{ marginTop: 2 }}>{tab.title}</div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
