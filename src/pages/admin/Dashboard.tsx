import { Card, Col, Empty, Progress, Row, Space, Statistic, Table, Tag, Tooltip, Typography } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store';
import { CATEGORIES, dashboardMetrics, urgentFirst } from '../../lib/admin';

export default function Dashboard() {
  const qaLogs = useStore((s) => s.qaLogs);
  const tickets = useStore((s) => s.tickets);
  const notices = useStore((s) => s.notices);
  const navigate = useNavigate();
  const metrics = dashboardMetrics(qaLogs, tickets, notices);
  const counts = new Map<string, number>();
  metrics.recent.forEach((log) => counts.set(log.question, (counts.get(log.question) ?? 0) + 1));
  const top = [...counts].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const cards = [
    ['今日咨询数', metrics.today, '今天本地时间 00:00 至 24:00 的 QaLog 条数', ''],
    ['AI 解答率', metrics.aiRate, '近 7 天（当前时刻往前 7×24 小时）resolvedByAI=true 的 QaLog 占比；无咨询显示 0%', '%'],
    ['待处理转人工', metrics.pending, '所有状态为“待处理”的工单数量', ''],
    ['通知平均已读率', metrics.readRate, '各通知（已读人数 / 可见人数）的算术平均值；全体学生=2、学生会干部=1、2024级=1；无通知显示 0%', '%'],
  ] as const;
  return <div><Typography.Title level={3}>工作台</Typography.Title><Typography.Paragraph type="secondary">学院团学事务概览 · 数据随咨询与通知实时更新</Typography.Paragraph>
    <Row gutter={[16, 16]}>{cards.map(([title, value, tip, suffix]) => <Col xs={24} sm={12} xl={6} key={title}>
      <Card><Statistic title={<Tooltip title={tip}><span>{title} <InfoCircleOutlined /></span></Tooltip>} value={value} suffix={suffix} precision={suffix ? 1 : 0} /></Card>
    </Col>)}</Row>
    <Row gutter={[16, 16]} style={{ marginTop: 16 }}><Col xs={24} lg={12}><Card title="近 7 天咨询分类">
      {CATEGORIES.map((category) => { const count = metrics.recent.filter((log) => log.category === category).length; return <div key={category}>
        <Space><span>{category}</span><Typography.Text type="secondary">{count} 次</Typography.Text></Space>
        <Progress percent={metrics.recent.length ? Math.round(count / metrics.recent.length * 100) : 0} strokeColor="#C8102E" />
      </div>; })}</Card></Col><Col xs={24} lg={12}><Card title="近 7 天高频问题 Top 5">
      {top.length ? top.map(([question, count], index) => <div className="top-question" key={question}><Tag color={index === 0 ? 'red' : undefined}>{index + 1}</Tag><span>{question}</span><b>{count} 次</b></div>) : <Empty description="暂无咨询" />}
    </Card></Col></Row>
    <Card title="最新待处理工单" style={{ marginTop: 16 }} extra={<a onClick={() => navigate('/admin/tickets')}>查看咨询汇总</a>}>
      <Table size="small" rowKey="id" pagination={false} dataSource={tickets.filter((ticket) => ticket.status === '待处理').sort(urgentFirst).slice(0, 5)} rowClassName={(ticket) => ticket.reason === '疑似紧急' ? 'urgent-row' : ''} columns={[
        { title: '学生', dataIndex: 'studentName', width: 90 }, { title: '问题', dataIndex: 'question' },
        { title: '原因', dataIndex: 'reason', width: 120, render: (reason) => <Tag color={reason === '疑似紧急' ? 'red' : 'gold'}>{reason}</Tag> },
      ]} />
    </Card>
  </div>;
}
