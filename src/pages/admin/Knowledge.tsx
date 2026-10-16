import { useState } from 'react';
import { App, Button, Drawer, Form, Input, Modal, Popconfirm, Select, Space, Table, Tag, Typography, Upload } from 'antd';
import { PlusOutlined, UploadOutlined } from '@ant-design/icons';
import { useStore } from '../../store';
import { CATEGORIES } from '../../lib/admin';
import type { Category, KbDoc } from '../../types';
interface Draft { title: string; category: Category; content: string }
export default function Knowledge() {
  const docs = useStore((s) => s.docs);
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [viewId, setViewId] = useState<string | null>(null);
  const [form] = Form.useForm<Draft>();
  const { message } = App.useApp();
  const selected = docs.find((doc) => doc.id === viewId);
  const save = (values: Draft) => {
    useStore.getState().addDoc({ ...values, title: values.title.trim(), content: values.content.trim(), id: crypto.randomUUID(), source: 'upload', updatedAt: Date.now() });
    setOpen(false); form.resetFields(); message.success('资料已保存，学生端可立即检索');
  };
  return <div><Typography.Title level={3}>知识库</Typography.Title><Typography.Paragraph type="secondary">管理制度资料，让每个回答有据可查</Typography.Paragraph>
    <Space wrap style={{ marginBottom: 16 }}><Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setOpen(true); }}>新增资料</Button>
      <Button icon={<UploadOutlined />} onClick={() => { form.resetFields(); setOpen(true); }}>上传资料</Button>
      <Popconfirm title="恢复全部示例制度？" description="保留上传和工单沉淀资料。" onConfirm={() => useStore.getState().restoreSeedDocs()}><Button>恢复示例资料</Button></Popconfirm>
    </Space>
    <Table<KbDoc> rowKey="id" dataSource={docs} scroll={{ x: 850 }} columns={[
      { title: '标题', dataIndex: 'title', render: (title, doc) => <Button type="link" className="table-title" onClick={() => setViewId(doc.id)}>{title}</Button> },
      { title: '分类', dataIndex: 'category', width: 100 }, { title: '来源', dataIndex: 'source', width: 100, render: (source: KbDoc['source']) => <Tag>{({ seed: '示例', upload: '上传/新增', ticket: '工单沉淀', notice: '通知同步' })[source]}</Tag> },
      { title: '字数', width: 80, render: (_, doc) => doc.content.length }, { title: '更新时间', dataIndex: 'updatedAt', width: 165, render: (time) => new Date(time).toLocaleString('zh-CN') },
      { title: '操作', width: 80, render: (_, doc) => <Popconfirm title="删除这份资料？" onConfirm={() => useStore.getState().removeDoc(doc.id)}><Button type="link" danger>删除</Button></Popconfirm> },
    ]} />
    <Modal title="新增 / 上传资料" open={open} onCancel={() => setOpen(false)} onOk={() => form.submit()} okText="保存资料" confirmLoading={uploading}>
      <Form form={form} layout="vertical" initialValues={{ category: '其他' }} onFinish={save}>
        <Form.Item label="资料标题" name="title" rules={[{ required: true, whitespace: true, message: '请输入标题' }]}><Input maxLength={100} /></Form.Item>
        <Form.Item label="资料分类" name="category" rules={[{ required: true }]}><Select options={CATEGORIES.map((value) => ({ value, label: value }))} /></Form.Item>
        <Upload accept=".txt,.md,.docx" showUploadList={false} beforeUpload={async (file) => {
          setUploading(true);
          try {
            const extension = file.name.split('.').pop()?.toLowerCase();
            if (!['txt', 'md', 'docx'].includes(extension ?? '')) throw new Error('仅支持 .txt、.md、.docx');
            const content = extension === 'docx' ? (await (await import('mammoth')).extractRawText({ arrayBuffer: await file.arrayBuffer() })).value : await file.text();
            if (!content.trim()) throw new Error('文档没有可读取的文字');
            form.setFieldsValue({ title: file.name.replace(/\.[^.]+$/, ''), content });
            message.success('文件已读取，请选择分类后保存');
          } catch (error) { message.error(error instanceof Error ? error.message : '读取失败'); }
          finally { setUploading(false); }
          return false;
        }}><Button loading={uploading} icon={<UploadOutlined />}>选择 .txt / .md / .docx 文件</Button></Upload>
        <Form.Item label="正文（可直接粘贴）" name="content" style={{ marginTop: 16 }} rules={[{ required: true, whitespace: true, message: '请输入正文' }]}><Input.TextArea rows={9} /></Form.Item>
      </Form>
    </Modal>
    <Drawer title={selected?.title} open={!!selected} onClose={() => setViewId(null)} size={640}><Tag>{selected?.category}</Tag><Typography.Paragraph className="plain-content">{selected?.content}</Typography.Paragraph></Drawer>
  </div>;
}
