import { useEffect, useRef, useState } from 'react';
import { DEMO_NOTICE_TITLE, DEMO_NOTICE_CONTENT } from '../../data/demoNotice';
import { EXAMPLE_CHAT, summarizeChat, draftContent } from '../../lib/noticeDraft';
import type { NoticeDraft } from '../../lib/noticeDraft';
import { Alert, Modal, Space, App, Button, Card, Form, Input, Select, Switch, Table, Tag, Typography } from 'antd';
import { useStore } from '../../store';
import { audienceStudents, readCount } from '../../lib/admin';
import type { Notice } from '../../types';
type Draft = Pick<Notice, 'title' | 'content' | 'type' | 'audience' | 'pinned'> & { syncToKb: boolean };
export default function Notices() {
  const [chatOpen, setChatOpen] = useState(false);
  const [chat, setChat] = useState('');
  const [draft, setDraft] = useState<NoticeDraft | null>(null);
  const [generating, setGenerating] = useState(false);
  const [fallback, setFallback] = useState(false);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  const mode = useStore((s) => s.answerMode);
  const notices = useStore((s) => s.notices);
  const user = useStore((s) => s.currentUser)!;
  const [form] = Form.useForm<Draft>();
  const { message } = App.useApp();
  return <div><Typography.Title level={3}>通知发布</Typography.Title><Typography.Paragraph type="secondary">明确对象，一次发布，实时追踪已读</Typography.Paragraph>
    <Button style={{ marginBottom: 16 }} onClick={() => setChatOpen(true)}>从聊天记录生成通知</Button>
    <Modal title="从聊天记录生成通知" open={chatOpen} width={760} styles={{ body: { maxHeight: '65vh', overflowY: 'auto' } }} footer={draft ? <Button type="primary" onClick={() => { form.setFieldsValue({ title: draft.title, content: draftContent(draft), type: '通知', audience: '学生会干部', pinned: false }); setChatOpen(false); message.success('已填入表单，请核对后发布给学生会干部'); }}>填入发布表单</Button> : null} onCancel={() => { controller.current?.abort(); setChatOpen(false); }}>
      <Space orientation="vertical" style={{ width: '100%' }} size="middle">
        <Typography.Text type="secondary">保留最终修改意见，整理通知、负责人和截止时间。离线模式支持内置示例。</Typography.Text>
        <Button onClick={() => { setChat(EXAMPLE_CHAT); setDraft(null); }}>填入示例</Button>
        <Input.TextArea aria-label="群聊记录" value={chat} rows={7} maxLength={12000} onChange={(event) => { setChat(event.target.value); setDraft(null); }} />
        <Button type="primary" loading={generating} onClick={async () => {
          setGenerating(true); setDraft(null); controller.current = new AbortController();
          try { const result = await summarizeChat(chat, mode, controller.current.signal); setDraft(result.draft); setFallback(result.fallback); }
          catch (error) { if (!controller.current.signal.aborted) message.error(error instanceof Error ? error.message : '整理失败'); }
          finally { setGenerating(false); }
        }}>整理成通知</Button>
        {draft ? <Card size="small" title="整理预览">
          {fallback ? <Alert type="info" title="智能体暂不可用，已使用内置示例整理结果" style={{ marginBottom: 12 }} /> : null}
          <Typography.Title level={5}>{draft.title}</Typography.Title><Typography.Paragraph className="plain-content">{draftContent(draft)}</Typography.Paragraph>
        </Card> : null}
      </Space>
    </Modal>
    <Card title="发布新通知" style={{ marginBottom: 20 }}><Form form={form} layout="vertical" initialValues={{ type: '通知', audience: '全体学生', pinned: false, syncToKb: true }} onFinish={({ syncToKb, ...values }) => {
      useStore.getState().publishNotice({ ...values, title: values.title.trim(), content: values.content.trim(), id: crypto.randomUUID(), publisher: user.name, createdAt: Date.now(), readBy: [] }, syncToKb);
      form.resetFields(); message.success('通知已发布');
    }}>
      <Button style={{ marginBottom: 16 }} onClick={() => form.setFieldsValue({ title: DEMO_NOTICE_TITLE, content: DEMO_NOTICE_CONTENT, type: '通知', audience: '全体学生', pinned: true, syncToKb: true })}>填入示例通知</Button>
      <Form.Item name="title" label="通知标题" rules={[{ required: true, whitespace: true }]}><Input maxLength={100} /></Form.Item>
      <Form.Item name="content" label="通知正文" rules={[{ required: true, whitespace: true }]}><Input.TextArea rows={4} /></Form.Item>
      <div className="notice-form-options"><Form.Item name="type" label="通知类型"><Select options={['通知', '活动', '提醒'].map((value) => ({ value, label: value }))} /></Form.Item>
        <Form.Item name="audience" label="发布对象"><Select options={['全体学生', '学生会干部', '2024级'].map((value) => ({ value, label: value }))} /></Form.Item>
        <Form.Item name="pinned" label="是否置顶" valuePropName="checked"><Switch /></Form.Item></div>
      <Form.Item name="syncToKb" label="同步到知识库（学生可直接提问）" valuePropName="checked"><Switch /></Form.Item>
      <Button htmlType="submit" type="primary">发布通知</Button>
    </Form></Card>
    <Card title="已发布通知"><Table<Notice> rowKey="id" scroll={{ x: 800 }} dataSource={[...notices].sort((a, b) => b.createdAt - a.createdAt)} columns={[
      { title: '标题', dataIndex: 'title' }, { title: '类型', dataIndex: 'type', render: (type) => <Tag>{type}</Tag> }, { title: '对象', dataIndex: 'audience' },
      { title: '已读 / 可见人数', render: (_, notice) => <span data-testid={`read-${notice.id}`}>{readCount(notice)} / {audienceStudents(notice).length}</span> },
      { title: '发布人', dataIndex: 'publisher' }, { title: '发布时间', dataIndex: 'createdAt', render: (time) => new Date(time).toLocaleString('zh-CN') },
    ]} /></Card>
  </div>;
}
