import type { Category, KbDoc, Notice, QaLog, Ticket } from '../types';
import { MOCK_STUDENTS } from '../types';
export const CATEGORIES: Category[] = ['综测评奖', '奖助申请', '团务转接', '活动报名', '其他'];
export const audienceStudents = (notice: Notice) => MOCK_STUDENTS.filter((student) => notice.audience === '全体学生' || student.id === 'stu001');
export const readCount = (notice: Notice) => audienceStudents(notice).filter((student) => notice.readBy.includes(student.id)).length;
export const urgentFirst = (a: Ticket, b: Ticket) => Number(b.reason === '疑似紧急') - Number(a.reason === '疑似紧急') || b.createdAt - a.createdAt;
export function ticketDocument(ticket: Ticket, now = Date.now()): KbDoc {
  if (!ticket.reply?.trim()) throw new Error('请先回复，再沉淀到知识库');
  return { id: `ticket-${ticket.id}`, title: `${ticket.question}（咨询答复）`, category: ticket.category,
    content: `问：${ticket.question}\n答：${ticket.reply.trim()}`, source: 'ticket', updatedAt: now };
}
export function dashboardMetrics(qaLogs: QaLog[], tickets: Ticket[], notices: Notice[], now = Date.now()) {
  const start = new Date(now); start.setHours(0, 0, 0, 0);
  const end = new Date(start); end.setDate(end.getDate() + 1);
  const recent = qaLogs.filter((log) => log.createdAt >= now - 7 * 86400000 && log.createdAt <= now);
  return {
    today: qaLogs.filter((log) => log.createdAt >= +start && log.createdAt < +end).length,
    aiRate: recent.length ? recent.filter((log) => log.resolvedByAI).length / recent.length * 100 : 0,
    pending: tickets.filter((ticket) => ticket.status === '待处理').length,
    readRate: notices.length ? notices.reduce((sum, notice) => sum + readCount(notice) / audienceStudents(notice).length, 0) / notices.length * 100 : 0,
    recent,
  };
}
