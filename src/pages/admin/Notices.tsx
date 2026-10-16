import { Result } from 'antd';

/** 通知发布 —— 第 3 步实现发布表单 + 已发布列表（已读 x / 可见人数 y），本步先占位 */
export default function Notices() {
  return (
    <Result
      icon="📣"
      title="通知发布"
      subTitle="第 3 步实现：发布表单（标题/正文/类型/对象/置顶）+ 已发布列表（已读 x / 可见人数 y）；第 6 步加「从聊天记录生成通知」"
    />
  );
}
