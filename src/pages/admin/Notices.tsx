import { App, Button, Card, Form, Input, Select, Switch, Table, Tag, Typography } from 'antd';
import { useStore } from '../../store';
import { audienceStudents, readCount } from '../../lib/admin';
import type { Notice } from '../../types';
type Draft = Pick<Notice, 'title' | 'content' | 'type' | 'audience' | 'pinned'>;
export default function Notices() {
  const notices = useStore((s) => s.notices);
  const user = useStore((s) => s.currentUser)!;
  const [form] = Form.useForm<Draft>();
  const { message } = App.useApp();
  return <div><Typography.Title level={3}>通知发布</Typography.Title><Typography.Paragraph type="secondary">明确对象，一次发布，实时追踪已读</Typography.Paragraph>
    <Card title="发布新通知" style={{ marginBottom: 20 }}><Form form={form} layout="vertical" initialValues={{ type: '通知', audience: '全体学生', pinned: false }} onFinish={(values) => {
      useStore.getState().publishNotice({ ...values, title: values.title.trim(), content: values.content.trim(), id: crypto.randomUUID(), publisher: user.name, createdAt: Date.now(), readBy: [] });
      form.resetFields(); message.success('通知已发布');
    }}>
      <Form.Item name="title" label="通知标题" rules={[{ required: true, whitespace: true }]}><Input maxLength={100} /></Form.Item>
      <Form.Item name="content" label="通知正文" rules={[{ required: true, whitespace: true }]}><Input.TextArea rows={4} /></Form.Item>
      <div className="notice-form-options"><Form.Item name="type" label="通知类型"><Select options={['通知', '活动', '提醒'].map((value) => ({ value, label: value }))} /></Form.Item>
        <Form.Item name="audience" label="发布对象"><Select options={['全体学生', '学生会干部', '2024级'].map((value) => ({ value, label: value }))} /></Form.Item>
        <Form.Item name="pinned" label="是否置顶" valuePropName="checked"><Switch /></Form.Item></div>
      <Button htmlType="submit" type="primary">发布通知</Button>
    </Form></Card>
    <Card title="已发布通知"><Table<Notice> rowKey="id" scroll={{ x: 800 }} dataSource={[...notices].sort((a, b) => b.createdAt - a.createdAt)} columns={[
      { title: '标题', dataIndex: 'title' }, { title: '类型', dataIndex: 'type', render: (type) => <Tag>{type}</Tag> }, { title: '对象', dataIndex: 'audience' },
      { title: '已读 / 可见人数', render: (_, notice) => <span data-testid={`read-${notice.id}`}>{readCount(notice)} / {audienceStudents(notice).length}</span> },
      { title: '发布人', dataIndex: 'publisher' }, { title: '发布时间', dataIndex: 'createdAt', render: (time) => new Date(time).toLocaleString('zh-CN') },
    ]} /></Card>
  </div>;
}
