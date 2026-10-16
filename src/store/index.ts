import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { MOCK_STUDENTS, MOCK_ADMINS } from '../types';
import type { KbDoc, Notice, ChatMessage, Ticket, QaLog, MockUser } from '../types';
import { noticeDocument } from '../data/demoNotice';
import { ticketDocument } from '../lib/admin';
import type { AnswerResult } from '../lib/answerEngine';
import { SEED_DOCS, SEED_NOTICES, SEED_TICKETS, SEED_QALOGS } from '../data/seed';

interface DemoData {
  docs: KbDoc[];
  notices: Notice[];
  chats: Record<string, ChatMessage[]>;
  tickets: Ticket[];
  qaLogs: QaLog[];
  answerMode: 'offline' | 'hermes';
  lastBootAt: number;
}
interface TxzsState extends DemoData {
  currentUser: MockUser | null;
  login: (user: MockUser) => void;
  logout: () => void;
  resetDemoData: () => void;
  setAnswerMode: (mode: 'offline' | 'hermes') => void;
  addQuestion: (studentId: string, message: ChatMessage) => void;
  finishAnswer: (student: MockUser, question: string, reply: AnswerResult) => string;
  escalateMessage: (student: MockUser, messageId: string, question: string) => void;
  feedback: (studentId: string, messageId: string, value: 'up' | 'down') => void;
  markNoticeRead: (noticeId: string, studentId: string) => void;
  markTicketSeen: (ticketId: string, studentId: string) => void;
  addDoc: (doc: KbDoc) => void;
  removeDoc: (id: string) => void;
  restoreSeedDocs: () => void;
  publishNotice: (notice: Notice, syncToKb?: boolean) => void;
  replyTicket: (id: string, reply: string, repliedBy: string) => void;
  closeTicket: (id: string) => void;
  addDocFromTicket: (id: string) => void;
}
function freshSeed(): DemoData {
  return {
    docs: structuredClone(SEED_DOCS),
    notices: structuredClone(SEED_NOTICES),
    chats: { stu001: [], stu002: [] },
    tickets: structuredClone(SEED_TICKETS),
    qaLogs: structuredClone(SEED_QALOGS),
    answerMode: 'offline',
    lastBootAt: Date.now(),
  };
}
const IDENTITY_KEY = 'txzs_identity';
function initialUser(): MockUser | null {
  const params = new URLSearchParams(window.location.hash.split('?')[1] ?? '');
  const id = params.get('as') ?? sessionStorage.getItem(IDENTITY_KEY);
  const user = [...MOCK_STUDENTS, ...MOCK_ADMINS].find((item) => item.id === id) ?? null;
  if (user) sessionStorage.setItem(IDENTITY_KEY, user.id);
  return user;
}
export const STORAGE_KEY = 'txzs_tuanxue';
export const useStore = create<TxzsState>()(
  persist(
    (set, get) => ({
      ...freshSeed(),
      currentUser: initialUser(),
      login: (user) => { sessionStorage.setItem(IDENTITY_KEY, user.id); set({ currentUser: user }); },
      logout: () => { sessionStorage.removeItem(IDENTITY_KEY); set({ currentUser: null }); },
      setAnswerMode: (answerMode) => set({ answerMode }),
      resetDemoData: () => set(freshSeed()),
      addDoc: (doc) => set((state) => ({ docs: [doc, ...state.docs] })),
      removeDoc: (id) => set((state) => ({ docs: state.docs.filter((doc) => doc.id !== id) })),
      restoreSeedDocs: () => set((state) => ({ docs: [...structuredClone(SEED_DOCS), ...state.docs.filter((doc) => doc.source !== 'seed')] })),
      publishNotice: (notice, syncToKb = true) => set((state) => ({ notices: [notice, ...state.notices], docs: syncToKb ? [noticeDocument(notice), ...state.docs] : state.docs })),
      replyTicket: (id, reply, repliedBy) => set((state) => ({ tickets: state.tickets.map((ticket) => ticket.id === id
        ? { ...ticket, reply, repliedBy, repliedAt: Date.now(), status: '已回复', studentSeen: false } : ticket) })),
      closeTicket: (id) => set((state) => ({ tickets: state.tickets.map((ticket) => ticket.id === id ? { ...ticket, status: '已关闭' } : ticket) })),
      addDocFromTicket: (id) => {
        const ticket = get().tickets.find((item) => item.id === id);
        if (!ticket?.reply || ticket.addedToKb) return;
        const doc = ticketDocument(ticket);
        set((state) => ({ docs: [doc, ...state.docs], tickets: state.tickets.map((item) => item.id === id ? { ...item, addedToKb: true } : item) }));
      },
      addQuestion: (studentId, message) => set((state) => ({ chats: { ...state.chats,
        [studentId]: [...(state.chats[studentId] ?? []), message] } })),
      finishAnswer: (student, question, reply) => {
        const id = crypto.randomUUID();
        const ticketId = reply.escalated ? crypto.randomUUID() : undefined;
        const createdAt = Date.now();
        // 回复、工单和咨询日志一次写入，避免跨窗口看到不一致的中间状态。
        set((state) => ({
          chats: { ...state.chats, [student.id]: [...(state.chats[student.id] ?? []),
            { id, role: 'assistant', content: reply.content, sources: reply.sources,
              escalated: reply.escalated, offlineFallback: reply.offlineFallback, ticketId, createdAt }] },
          tickets: ticketId && reply.escalated ? [{ id: ticketId, studentId: student.id,
            studentName: student.name, question, aiAnswer: reply.content, category: reply.category,
            reason: reply.escalated, status: '待处理', createdAt }, ...state.tickets] : state.tickets,
          qaLogs: [...state.qaLogs, { id, studentId: student.id, question, category: reply.category,
            resolvedByAI: !reply.escalated, createdAt }],
        }));
        return id;
      },
      escalateMessage: (student, messageId, question) => {
        const message = get().chats[student.id]?.find((item) => item.id === messageId);
        if (!message || message.ticketId) return;
        const ticketId = crypto.randomUUID();
        set((state) => ({
          chats: { ...state.chats, [student.id]: state.chats[student.id].map((item) => item.id === messageId
            ? { ...item, ticketId, escalated: '学生申请人工' } : item) },
          tickets: [{ id: ticketId, studentId: student.id, studentName: student.name,
            question, aiAnswer: message.content, category: state.qaLogs.find((log) => log.id === messageId)?.category ?? '其他',
            reason: '学生申请人工', status: '待处理', createdAt: Date.now() }, ...state.tickets],
          qaLogs: state.qaLogs.map((log) => log.id === messageId ? { ...log, resolvedByAI: false } : log),
        }));
      },
      feedback: (studentId, messageId, value) => set((state) => ({ chats: { ...state.chats,
        [studentId]: (state.chats[studentId] ?? []).map((item) => item.id === messageId
          ? { ...item, feedback: item.feedback === value ? undefined : value } : item) } })),
      markNoticeRead: (noticeId, studentId) => set((state) => ({ notices: state.notices.map((item) =>
        item.id === noticeId && !item.readBy.includes(studentId)
          ? { ...item, readBy: [...item.readBy, studentId] } : item) })),
      markTicketSeen: (ticketId, studentId) => set((state) => ({ tickets: state.tickets.map((item) =>
        item.id === ticketId && item.studentId === studentId ? { ...item, studentSeen: true } : item) })),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      version: 1,
      // 身份用 sessionStorage 按标签页保存，业务数据跨窗口共享。
      partialize: ({ docs, notices, chats, tickets, qaLogs, answerMode, lastBootAt }) =>
        ({ docs, notices, chats, tickets, qaLogs, answerMode, lastBootAt }),
    },
  ),
);

export function setupCrossTabSync() {
  const sync = (event: StorageEvent) => {
    if (event.storageArea === localStorage && (event.key === STORAGE_KEY || event.key === null)) {
      void useStore.persist.rehydrate();
    }
  };
  window.addEventListener('storage', sync);
  return () => window.removeEventListener('storage', sync);
}

export function noticeVisibleTo(notice: Notice, user: MockUser | null): boolean {
  if (!user || user.role !== 'student') return false;
  return notice.audience === '全体学生' ||
    (notice.audience === '学生会干部' && user.id === 'stu001') ||
    (notice.audience === '2024级' && user.id === 'stu001');
}
