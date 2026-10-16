import { Result } from 'antd';

/** 通知页 —— 第 2 步实现通知列表 + Drawer 详情 + 已读标记，本步先占位 */
export default function Notices() {
  return (
    <div style={{ padding: 16 }}>
      <Result
        icon="📢"
        title="通知"
        subTitle="第 2 步实现：可见通知列表（未读加粗+红点、类型 Tag、置顶在前）+ Drawer 详情"
      />
    </div>
  );
}
