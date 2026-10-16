// 数据模型 —— 与 docs/PLAN.md 第 5 节一致
export type Category = '综测评奖' | '奖助申请' | '团务转接' | '活动报名' | '其他';
export type EscalateReason = 'AI无法解答' | '需人工核实' | '疑似紧急' | '学生申请人工';

export interface KbDoc {
  id: string;
  title: string;
  category: Category;
  content: string;
  source: 'seed' | 'upload' | 'ticket';
  repliedBy?: string;
  updatedAt: number;
}

export interface Notice {
  id: string;
  title: string;
  content: string;
  type: '通知' | '活动' | '提醒';
  audience: '全体学生' | '学生会干部' | '2024级';
  publisher: string;
  createdAt: number;
  pinned?: boolean;
  readBy: string[]; // 学生 id
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
  sources?: { docId: string; title: string; snippet: string }[];
  escalated?: EscalateReason;
  ticketId?: string;
  feedback?: 'up' | 'down';
  offlineFallback?: boolean;
}

export interface Ticket {
  id: string;
  studentId: string;
  studentName: string;
  question: string;
  aiAnswer?: string;
  category: Category;
  reason: EscalateReason;
  status: '待处理' | '已回复' | '已关闭';
  reply?: string;
  repliedBy?: string;
  createdAt: number;
  repliedAt?: number;
  addedToKb?: boolean;
  studentSeen?: boolean;
}

export interface QaLog {
  id: string;
  studentId: string;
  question: string;
  category: Category;
  resolvedByAI: boolean;
  createdAt: number;
}

/** 登录身份（mock，不做真实登录） */
export type Role = 'student' | 'admin';

export interface MockUser {
  id: string;
  name: string;
  role: Role;
  /** 学生年级标签，用于通知可见性过滤 */
  grade?: '2024级' | '2023级';
  /** 是否学生会干部（stu001 是） */
  cadre?: boolean;
  title: string;
}

export const MOCK_STUDENTS: MockUser[] = [
  {
    id: 'stu001',
    name: '张同学',
    role: 'student',
    grade: '2024级',
    cadre: true,
    title: '2024级 · 学生会宣传部干事',
  },
  { id: 'stu002', name: '李同学', role: 'student', grade: '2023级', title: '2023级' },
];

export const MOCK_ADMINS: MockUser[] = [
  { id: 'admin_wang', name: '王老师', role: 'admin', title: '团委指导老师' },
  { id: 'admin_chen', name: '陈同学', role: 'admin', title: '学生会主席' },
];
