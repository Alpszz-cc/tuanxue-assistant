import { Card, Collapse, Empty, Space, Tag, Typography } from 'antd';
import { useStore } from '../../store';
export default function MyTickets() {
  const student = useStore((s) => s.currentUser)!;
  const tickets = useStore((s) => s.tickets);
  const markSeen = useStore((s) => s.markTicketSeen);
  const mine = tickets.filter((ticket) => ticket.studentId === student.id).sort((a, b) => b.createdAt - a.createdAt);
  return <div className="student-page"><Typography.Title level={4}>我的咨询</Typography.Title>
    <Typography.Paragraph type="secondary">老师和学生会的回复，会留在这里</Typography.Paragraph>
    <Space orientation="vertical" size="middle" style={{ width: '100%' }}>{mine.map((ticket) => <Card key={ticket.id} size="small">
      <Space wrap><Tag color={ticket.status === '已回复' ? 'green' : ticket.status === '待处理' ? 'gold' : 'default'}>{ticket.status}</Tag>
        <Tag color={ticket.reason === '疑似紧急' ? 'red' : undefined}>{ticket.reason}</Tag><Tag>{ticket.category}</Tag></Space>
      <Typography.Paragraph style={{ marginTop: 12, fontWeight: 600 }}>{ticket.question}</Typography.Paragraph>
      <Typography.Text type="secondary">提交于 {new Date(ticket.createdAt).toLocaleString('zh-CN')}</Typography.Text>
      {ticket.reply ? <Collapse style={{ marginTop: 12 }} onChange={(keys) => { if (keys.length) markSeen(ticket.id, student.id); }} items={[{
        key: ticket.id, label: <span>{!ticket.studentSeen ? '● 新回复 · ' : ''}{ticket.repliedBy}的回复</span>,
        children: <><Typography.Paragraph className="plain-content">{ticket.reply}</Typography.Paragraph><Typography.Text type="secondary">{ticket.repliedBy} · {ticket.repliedAt ? new Date(ticket.repliedAt).toLocaleString('zh-CN') : ''}</Typography.Text></>,
      }]} /> : <Typography.Paragraph style={{ marginTop: 12 }} type="secondary">已收到，请等待老师/学生会处理。</Typography.Paragraph>}
    </Card>)}</Space>{!mine.length ? <Empty description="还没有咨询记录" /> : null}
  </div>;
}
