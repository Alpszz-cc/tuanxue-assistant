import { useState } from 'react';
import { App, Button, Form, Input, Modal, Popconfirm, Select, Space, Table, Tag, Typography } from 'antd';
import { useStore } from '../../store';
import { CATEGORIES, urgentFirst } from '../../lib/admin';
import type { Ticket } from '../../types';
export default function Tickets() {
  const tickets = useStore((s) => s.tickets);
  const user = useStore((s) => s.currentUser)!;
  const [status, setStatus] = useState<string>();
  const [category, setCategory] = useState<string>();
  const [reason, setReason] = useState<string>();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form] = Form.useForm<{ reply: string }>();
  const { message } = App.useApp();
  const selected = tickets.find((ticket) => ticket.id === selectedId);
  const filtered = tickets.filter((ticket) => (!status || ticket.status === status) && (!category || ticket.category === category) && (!reason || ticket.reason === reason)).sort(urgentFirst);
  return <div><Typography.Title level={3}>咨询汇总</Typography.Title><Typography.Paragraph type="secondary">接住每个需要人工帮助的问题，回复可沉淀为知识</Typography.Paragraph>
    <Space wrap style={{ marginBottom: 16 }}>
      <Select aria-label="按状态筛选" placeholder="全部状态" allowClear style={{ width: 150 }} value={status} onChange={setStatus} options={['待处理', '已回复', '已关闭'].map((value) => ({ value, label: value }))} />
      <Select aria-label="按分类筛选" placeholder="全部分类" allowClear style={{ width: 150 }} value={category} onChange={setCategory} options={CATEGORIES.map((value) => ({ value, label: value }))} />
      <Select aria-label="按原因筛选" placeholder="全部原因" allowClear style={{ width: 180 }} value={reason} onChange={setReason} options={['AI无法解答', '需人工核实', '疑似紧急', '学生申请人工'].map((value) => ({ value, label: value }))} />
    </Space>
    <Table<Ticket> rowKey="id" scroll={{ x: 1100 }} dataSource={filtered} rowClassName={(ticket) => ticket.reason === '疑似紧急' ? 'urgent-row' : ''} columns={[
      { title: '学生', dataIndex: 'studentName', width: 85 }, { title: '问题 / 回复', width: 340, render: (_, ticket) => <><div>{ticket.question}</div>{ticket.reply ? <Typography.Paragraph type="secondary" style={{ marginTop: 8 }}>{ticket.repliedBy}：{ticket.reply}</Typography.Paragraph> : null}</> },
      { title: '分类', dataIndex: 'category', width: 100 }, { title: '原因', dataIndex: 'reason', width: 120, render: (value) => <Tag color={value === '疑似紧急' ? 'red' : undefined}>{value}</Tag> },
      { title: '状态', dataIndex: 'status', width: 90, render: (value) => <Tag color={value === '待处理' ? 'gold' : value === '已回复' ? 'green' : undefined}>{value}</Tag> },
      { title: '提交时间', dataIndex: 'createdAt', width: 155, render: (time) => new Date(time).toLocaleString('zh-CN') },
      { title: '操作', width: 190, fixed: 'right', render: (_, ticket) => <Space orientation="vertical" size={0}>
        <Button type="link" onClick={() => { setSelectedId(ticket.id); form.setFieldsValue({ reply: ticket.reply ?? '' }); }}>{ticket.reply ? '修改回复' : '回复'}</Button>
        <Button type="link" disabled={!ticket.reply || ticket.addedToKb} onClick={() => { useStore.getState().addDocFromTicket(ticket.id); message.success('已沉淀到知识库'); }}>{ticket.addedToKb ? '已沉淀' : '沉淀到知识库'}</Button>
        {ticket.status !== '已关闭' ? <Popconfirm title="关闭这条咨询？" onConfirm={() => useStore.getState().closeTicket(ticket.id)}><Button type="link">关闭</Button></Popconfirm> : null}
      </Space> },
    ]} />
    <Modal title="回复咨询" open={!!selected} onCancel={() => setSelectedId(null)} onOk={() => form.submit()} okText="发送回复">
      <Typography.Paragraph>{selected?.studentName}：{selected?.question}</Typography.Paragraph>
      <Form form={form} layout="vertical" onFinish={({ reply }) => { if (!selected) return; useStore.getState().replyTicket(selected.id, reply.trim(), user.name); setSelectedId(null); message.success('回复已发送'); }}>
        <Form.Item label="老师回复" name="reply" rules={[{ required: true, whitespace: true, message: '请输入回复' }]}><Input.TextArea rows={6} /></Form.Item>
      </Form>
    </Modal>
  </div>;
}
