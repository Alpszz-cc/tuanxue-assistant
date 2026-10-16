import { useEffect, useRef, useState } from 'react';
import Actions from '@ant-design/x/es/actions';
import Bubble from '@ant-design/x/es/bubble';
import Sender from '@ant-design/x/es/sender';
import Sources from '@ant-design/x/es/sources';
import Welcome from '@ant-design/x/es/welcome';
import { Alert, App, Avatar, Button, Tag, Typography } from 'antd';
import { LikeOutlined, DislikeOutlined, CopyOutlined, CustomerServiceOutlined, RobotOutlined, UserOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store';
import { answer, RECOMMENDED } from '../../lib/answerEngine';
import type { ChatMessage } from '../../types';

const EMPTY: ChatMessage[] = [];
export default function Chat() {
  const student = useStore((s) => s.currentUser)!;
  const chats = useStore((s) => s.chats[student.id] ?? EMPTY);
  const [showQuestions, setShowQuestions] = useState(false);
  const mode = useStore((s) => s.answerMode);
  const [streamText, setStreamText] = useState('');
  const [requesting, setRequesting] = useState(false);
  const [progress, setProgress] = useState(false);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  const [value, setValue] = useState('');
  const [pendingId, setPendingId] = useState<string | null>(null);
  const busy = useRef(false);
  const end = useRef<HTMLDivElement>(null);
  const { message } = App.useApp();
  const navigate = useNavigate();
  const scrollToBottom = () => requestAnimationFrame(() => {
    const body = end.current?.closest('.student-body');
    if (body) body.scrollTop = body.scrollHeight;
  });
  useEffect(() => { scrollToBottom(); }, [chats.length]);

  const send = async (input: string) => {
    const question = input.trim();
    if (!question || busy.current) return;
    busy.current = true;
    setValue(''); setShowQuestions(false);
    setStreamText(''); setProgress(false); setRequesting(true);
    controller.current = new AbortController();
    try {
      const store = useStore.getState();
      store.addQuestion(student.id, { id: crypto.randomUUID(), role: 'user', content: question, createdAt: Date.now() });
      const reply = await answer({ question, docs: store.docs, mode, history: store.chats[student.id], signal: controller.current.signal,
        onToken: (text) => { setStreamText((previous) => previous + text); scrollToBottom(); }, onProgress: () => setProgress(true) });
      const id = useStore.getState().finishAnswer(student, question, reply);
      setPendingId(mode === 'offline' || reply.offlineFallback ? id : null);
      if (mode === 'hermes' && !reply.offlineFallback) busy.current = false;
    } catch {
      if (controller.current?.signal.aborted) { busy.current = false; return; }
      message.error('本次回答未能保存，请检查浏览器存储后重试。');
      busy.current = false;
    } finally { setRequesting(false); setStreamText(''); setProgress(false); }
  };
  const finishTyping = (id: string) => {
    if (pendingId === id) { setPendingId(null); busy.current = false; scrollToBottom(); }
  };
  const act = (key: string, item: ChatMessage, index: number) => {
    const store = useStore.getState();
    if (key === 'up' || key === 'down') store.feedback(student.id, item.id, key);
    if (key === 'copy') void navigator.clipboard.writeText(item.content).then(() => message.success('已复制'), () => message.error('复制失败，请选择回答文本复制'));
    if (key === 'human') store.escalateMessage(student, item.id, chats.slice(0, index).reverse().find((entry) => entry.role === 'user')?.content ?? '学生申请人工');
  };
  return (
    <div className="chat-page">
      <div className="student-heading"><div className="student-brand"><Typography.Title level={4}>团学问答</Typography.Title>
        <Typography.Text type="secondary">{student.name}，有问题随时问</Typography.Text></div><Tag color="red">{mode === 'hermes' ? '智能体' : '离线演示'}</Tag></div>
      {chats.length ? <Button className="faq-toggle" onClick={() => setShowQuestions((value) => !value)}>常见问题</Button> : null}
      {!chats.length ? <Welcome icon={<RobotOutlined />} title="欢迎使用武汉大学哲学学院团学事务助手" description="查阅学院通知与制度，核对出处；个人事项交给老师处理。内置制度均为虚构示例。" /> : null}
      {(!chats.length || showQuestions) ? <div className="question-groups">
        {RECOMMENDED.map((group) => <div key={group.category} className="question-group"><small>{group.category}</small><div className="question-tags">
          {group.questions.map((question) => <Button key={question} size="small" disabled={requesting || pendingId !== null} onClick={() => { void send(question); }}>{question}</Button>)}
        </div></div>)}
      </div> : null}
      <Bubble.List autoScroll={false} className="chat-bubbles" items={chats.map((item, index) => ({
        key: item.id, role: item.role === 'user' ? 'user' : 'ai', content: item.content,
        placement: item.role === 'user' ? 'end' : 'start',
        avatar: <Avatar size="small" style={{ background: item.role === 'user' ? '#777' : '#C8102E' }} icon={item.role === 'user' ? <UserOutlined /> : <RobotOutlined />} />,
        typing: item.id === pendingId ? { effect: 'typing' as const, step: 2, interval: 18 } : false,
        onTyping: () => { if (item.id === pendingId) scrollToBottom(); },
        onTypingComplete: () => finishTyping(item.id),
        styles: { content: { whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' } },
        footer: item.role === 'assistant' && item.id !== pendingId ? <div className="answer-footer">
          {item.sources?.length ? <Sources title="参考资料（点击展开）" defaultExpanded={false}>
            {item.sources.map((source, i) => <div className="source-excerpt" key={`${source.docId}-${i}`}>
              <Typography.Text strong>{source.title}</Typography.Text>
              <Typography.Paragraph>{source.snippet}</Typography.Paragraph>
            </div>)}
          </Sources> : null}
          <Actions items={[
            { key: 'up', label: '有帮助', icon: <LikeOutlined style={{ color: item.feedback === 'up' ? '#C8102E' : undefined }} /> },
            { key: 'down', label: '待改进', icon: <DislikeOutlined style={{ color: item.feedback === 'down' ? '#C8102E' : undefined }} /> },
            { key: 'copy', label: '复制', icon: <CopyOutlined /> },
            ...(item.ticketId ? [] : [{ key: 'human', label: '转人工', icon: <CustomerServiceOutlined /> }]),
          ].map((action) => ({ ...action, actionRender: <Button type="text" size="small" aria-label={action.label}
            onClick={() => act(action.key, item, index)}>{action.icon}{action.label}</Button> }))} />
          {item.offlineFallback ? <Typography.Paragraph type="secondary" style={{ fontSize: 12 }}>智能体暂不可用，已切换离线模式</Typography.Paragraph> : null}
          {item.ticketId ? <Alert type={item.escalated === '疑似紧急' ? 'error' : 'info'} showIcon title="已转交老师/学生会处理"
            description={<><span>原因：{item.escalated}。回复后会在「我的咨询」通知你。</span><Button type="link" onClick={() => navigate('/student/tickets')}>查看我的咨询</Button></>} /> : null}
        </div> : undefined,
      }))} />
      {requesting ? <div aria-live="polite" className="stream-reply">
        {progress ? <Typography.Paragraph type="secondary">正在查阅制度资料…</Typography.Paragraph> : null}
        <div style={{ whiteSpace: 'pre-wrap' }}>{streamText.split('[[')[0]}</div>
      </div> : null}
      <div ref={end} />
      <div className="chat-sender"><Sender value={value} onChange={setValue} placeholder="请输入团学事务问题…" loading={requesting || pendingId !== null}
        onSubmit={(text) => { void send(text); }} onCancel={() => { controller.current?.abort(); setPendingId(null); busy.current = false; }} />
        <div className="demo-caption">依据学院已发布的通知与制度作答 · 个人事项请老师核实</div></div>
    </div>
  );
}
