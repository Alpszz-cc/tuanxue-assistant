import { useState } from 'react';
import { testConnection } from '../../lib/hermesClient';
import { Radio, Space, App, Popconfirm, Card, Typography, Alert, Button } from 'antd';
import { ClearOutlined } from '@ant-design/icons';
import { useStore } from '../../store';

const { Title, Paragraph, Text } = Typography;

/**
 * 设置页：保留离线演示说明与数据重置。
 * 问答模式切换与「测试连接」在第 5 步（接入 Hermes）时实现。
 */
export default function Settings() {
  const { message } = App.useApp();
  const resetDemoData = useStore((s) => s.resetDemoData);
  const [connection, setConnection] = useState<{ ok: boolean; text: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const answerMode = useStore((s) => s.answerMode);

  return (
    <div style={{ maxWidth: 640 }}>
      <Title level={4}>设置</Title>

      <Card title="问答模式" style={{ marginBottom: 16 }}>
        <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
          <Radio.Group value={answerMode} onChange={(event) => useStore.getState().setAnswerMode(event.target.value)} options={[{ label: '离线演示', value: 'offline' }, { label: '智能体', value: 'hermes' }]} />
          <Typography.Text type="secondary">演示推荐离线模式。智能体不可用时自动降级；连接参数在服务器环境变量中配置。</Typography.Text>
          <Button loading={testing} onClick={async () => { setTesting(true); try { const models = await testConnection(); setConnection({ ok: true, text: `连接成功：${models}` }); } catch (error) { setConnection({ ok: false, text: `连接失败：${error instanceof Error ? error.message : '网络不可用'}` }); } finally { setTesting(false); } }}>测试连接</Button>
          {connection ? <Alert type={connection.ok ? 'success' : 'error'} showIcon title={connection.text} /> : null}
        </Space>
      </Card>

      <Card title="演示数据">
        <Paragraph>
          <Text type="secondary">
            所有业务数据保存在本浏览器 localStorage（存储键 txzs_tuanxue）。两个窗口并排演示时数据自动同步；
            若演示数据被弄乱，可一键重置回初始状态。
          </Text>
        </Paragraph>
        <Popconfirm
          title="确认重置全部演示数据？"
          description="将清空所有对话、工单、通知已读记录与上传的知识库文档，恢复为初始示例数据。此操作不可撤销。"
          okText="重置"
          okButtonProps={{ danger: true }}
          cancelText="取消"
          onConfirm={() => {
            resetDemoData();
            message.success('已重置为初始演示数据');
          }}
        >
          <Button danger icon={<ClearOutlined />}>
            重置全部演示数据
          </Button>
        </Popconfirm>
      </Card>
    </div>
  );
}
