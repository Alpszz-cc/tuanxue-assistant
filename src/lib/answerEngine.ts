import type { Category, ChatMessage, EscalateReason, KbDoc } from '../types';
import { categoryOf, retrieve, splitDoc } from './retrieval';

export interface AnswerRequest { question: string; docs: KbDoc[]; mode?: 'offline' | 'hermes' }
export interface AnswerResult {
  content: string;
  sources: NonNullable<ChatMessage['sources']>;
  category: Category;
  escalated?: EscalateReason;
}
export const RECOMMENDED = [
  { category: '综测评奖', questions: ['志愿服务在综测里怎么加分', '学生工作在综测里怎么加分'] },
  { category: '奖助申请', questions: ['一等奖学金有什么要求', '家庭经济困难认定需要哪些材料'] },
  { category: '团务转接', questions: ['毕业了团关系怎么转', '团组织关系转接审核要多久'] },
  { category: '活动报名', questions: ['报名后去不了怎么办', '第二课堂学分要修多少'] },
];
const reasons: EscalateReason[] = ['AI无法解答', '需人工核实', '疑似紧急', '学生申请人工'];
export function parseEscalation(text: string): { content: string; escalated?: EscalateReason } {
  const reason = text.match(/\[\[ESCALATE:([^\]]+)\]\]/)?.[1];
  return { content: text.replace(/\[\[ESCALATE:[^\]]+\]\]/g, '').trim(),
    escalated: reasons.find((item) => item === reason) };
}
function result(content: string, category: Category, sources: AnswerResult['sources'] = []): AnswerResult {
  return { ...parseEscalation(content), category, sources };
}
export function answerOffline({ question, docs }: AnswerRequest): AnswerResult {
  const category = categoryOf(question);
  if (/不想活|自杀|自残|伤害自己|活不下去|想死|崩溃|撑不下去|很绝望|情绪困扰/.test(question)) {
    return result('听起来你现在很难受，谢谢你愿意说出来。请先到安全的地方，找信任的人陪着你，并联系辅导员（联系方式：示例）或心理中心（联系方式：示例）。我会将情况转交老师，请尽快寻求身边人的帮助。[[ESCALATE:疑似紧急]]', category);
  }
  if (/我的.*(为什么|为何|扣分|没通过|不通过|比.*低)|扣分|投诉|审批|批准|申诉/.test(question)) {
    const process = retrieve(category === '奖助申请' ? '评定申请公示申诉' : '综测评议公示申诉', docs.filter((doc) => doc.category === category))
      .find((hit) => hit.score >= 0.3 && /公示/.test(hit.snippet));
    const general = process ? `一般流程：${process.snippet.replace(/^第[^条]+条\s*/, '')}\n依据：《${process.title}》${process.snippet.match(/^第[^条]+条/)?.[0] ?? ''}` : '一般流程：先核对本人提交材料，并向负责老师提出核实申请；现有资料未说明具体办理细节。';
    return result(`${general}\n你的具体情况需要老师核实，已为你转交。[[ESCALATE:需人工核实]]`, category, process ? [process] : []);
  }
  const hits = retrieve(question, docs);
  const first = hits[0];
  if (!first || first.score < 0.36) {
    return result('制度资料里暂时没有这方面的明确规定，已转交老师/学生会为你解答。[[ESCALATE:AI无法解答]]', category);
  }
  let selected = [first];
  // 毕业转接既需要申请入口，也需要明确转至何处，补齐同文的相邻条文。
  if (/毕业/.test(question) && category === '团务转接') {
    const doc = docs.find((item) => item.id === first.docId);
    if (doc) selected = splitDoc(doc).filter((snippet) => /^第[一二]条/.test(snippet))
      .map((snippet) => ({ ...first, snippet }));
  }
  const sources = selected.map(({ docId, title, snippet }) => ({ docId, title, snippet }));
  const body = selected.map((hit) => hit.snippet.replace(/^第[^条]+条\s*/, '')).join('\n');
  const clauses = selected.map((hit) => hit.snippet.match(/^第[^条]+条/)?.[0]).filter(Boolean).join('、');
  const citation = `依据：《${first.title}》${clauses || '常见问题'}`;
  // 给出处预留长度，确保即使上传长段落也不超过 250 字。
  const maxBody = Math.max(0, 249 - citation.length - 1);
  const concise = body.length > maxBody ? body.slice(0, maxBody - 1) + '…' : body;
  return result(`${concise}\n${citation}`, category, sources);
}
// 后续 Hermes 模式接入此接口，本步仅运行可离线复现的引擎。
export async function answer(request: AnswerRequest): Promise<AnswerResult> { return answerOffline(request); }
