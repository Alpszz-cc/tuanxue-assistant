import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { MOCK_STUDENTS, MOCK_ADMINS } from '../types';
import type { KbDoc, Notice, ChatMessage, Ticket, QaLog, MockUser } from '../types';
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
    (set) => ({
      ...freshSeed(),
      currentUser: initialUser(),
      login: (user) => { sessionStorage.setItem(IDENTITY_KEY, user.id); set({ currentUser: user }); },
      logout: () => { sessionStorage.removeItem(IDENTITY_KEY); set({ currentUser: null }); },
      resetDemoData: () => set(freshSeed()),
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
