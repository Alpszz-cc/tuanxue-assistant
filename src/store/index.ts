import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
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
export const STORAGE_KEY = 'txzs_tuanxue';
export const useStore = create<TxzsState>()(
  persist(
    (set) => ({
      ...freshSeed(),
      currentUser: null,
      login: (user) => set({ currentUser: user }),
      logout: () => set({ currentUser: null }),
      resetDemoData: () => set(freshSeed()),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      version: 1,
      // 身份仅在窗口内保存，防止学生端与管理端互相覆盖身份。
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
