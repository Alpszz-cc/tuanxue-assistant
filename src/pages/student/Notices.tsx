import { useState } from 'react';
import { Badge, Button, Card, Drawer, Empty, Space, Tag, Typography } from 'antd';
import { PushpinOutlined } from '@ant-design/icons';
import { noticeVisibleTo, useStore } from '../../store';
export default function Notices() {
  const student = useStore((s) => s.currentUser)!;
  const notices = useStore((s) => s.notices);
  const markRead = useStore((s) => s.markNoticeRead);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const visible = notices.filter((notice) => noticeVisibleTo(notice, student))
    .sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned) || b.createdAt - a.createdAt);
  const selected = visible.find((notice) => notice.id === selectedId);
  return <div className="student-page"><Typography.Title level={4}>通知</Typography.Title>
    <Typography.Paragraph type="secondary">与你相关的学院消息，及时查收</Typography.Paragraph>
    <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
      {visible.map((notice) => { const unread = !notice.readBy.includes(student.id); return <Card key={notice.id} size="small">
        <Space wrap><Tag color="red">{notice.type}</Tag><Tag>{notice.audience}</Tag>{notice.pinned ? <Tag icon={<PushpinOutlined />}>置顶</Tag> : null}<Badge dot={unread} /></Space>
        <Button type="link" className="notice-title" style={{ fontWeight: unread ? 700 : 400 }} onClick={() => { setSelectedId(notice.id); markRead(notice.id, student.id); }}>{notice.title}</Button>
        <Typography.Text type="secondary">{notice.publisher} · {new Date(notice.createdAt).toLocaleDateString('zh-CN')}</Typography.Text>
      </Card>; })}
    </Space>
    {!visible.length ? <Empty description="暂无与你相关的通知" /> : null}
    <Drawer title={selected?.title ?? '通知详情'} open={!!selected} onClose={() => setSelectedId(null)} size={Math.min(window.innerWidth, 480)}>
      {selected ? <><Space wrap><Tag>{selected.type}</Tag><Tag>{selected.audience}</Tag></Space><Typography.Paragraph className="plain-content">{selected.content}</Typography.Paragraph>
        <Typography.Text type="secondary">{selected.publisher} · {new Date(selected.createdAt).toLocaleString('zh-CN')}</Typography.Text></> : null}
    </Drawer>
  </div>;
}
