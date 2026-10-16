import { App, Popconfirm, Card, Typography, Alert, Button } from 'antd';
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
  const answerMode = useStore((s) => s.answerMode);

  return (
    <div style={{ maxWidth: 640 }}>
      <Title level={4}>设置</Title>

      <Card title="问答模式" style={{ marginBottom: 16 }}>
        <Alert
          type="info"
          showIcon
          title={`当前模式：${
            answerMode === 'offline' ? '离线演示模式（本地检索 + 模板回答）' : 'Hermes 模式（调用本地智能体）'
          }`}
          description="模式切换与「测试连接」将在第 5 步接入 Hermes API Server 时开放。答辩现场建议使用离线模式，稳定不依赖网络。"
        />
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
