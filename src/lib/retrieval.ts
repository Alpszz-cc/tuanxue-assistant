import type { Category, KbDoc } from '../types';

export interface SearchHit { docId: string; title: string; snippet: string; score: number }
// 通用领域词归一；不包含完整问题、答案映射或按测试题分支。
const synonyms: [RegExp, string][] = [
  [/([一二三])等奖学金/g, '$1等奖 奖学金'],
  [/论文/g, '文章'], [/三下乡/g, '社会实践'],
  [/团关系|团员关系/g, '团组织关系'],
  [/学生工作/g, '学生会'], [/时长/g, '小时'],
  [/去不了|不能去|无法参加|没法参加/g, '不能参加'],
  [/要求|申请者须/g, '条件'],
  [/发放|发到|到账/g, '发'], [/申诉|复核/g, '异议'],
];
const stopwords = /怎么办|为什么|怎么|什么|多少|可以|能否|哪里|如何|是否|哪些|几个|多久|几天|找谁|什么时候|需要|结果|能|吗|呢|几|要|的|了|我|在|里|有|后|了/g;
export function normalize(text: string): string {
  return synonyms.reduce((value, [pattern, replacement]) => value.replace(pattern, replacement), text)
    .toLowerCase().replace(/\d+(?:[.,、－—-]\d+)*/g, '').replace(stopwords, '').replace(/[\s\p{P}\p{S}]/gu, '');
}
function bigrams(text: string): Set<string> {
  const result = new Set<string>();
  for (let i = 0; i < text.length - 1; i++) result.add(text.slice(i, i + 2));
  return result;
}
export function categoryOf(question: string): Category {
  question = normalize(question);
  if (/综测|加分|扣分|竞赛|学生工作/.test(question)) return '综测评奖';
  if (/奖学金|助学|奖助|困难|补助/.test(question)) return '奖助申请';
  if (/团关系|团组织|团员|团建|转接/.test(question)) return '团务转接';
  if (/活动|报名|第二课堂|学分|参加/.test(question)) return '活动报名';
  return '其他';
}
export function splitDoc(doc: KbDoc): string[] {
  const clauses = doc.content.match(/第[一二三四五六七八九十百\d]+条[^\n]*(?:\n(?!\s*\n|第[一二三四五六七八九十百\d]+条)[^\n]+)*/g);
  if (clauses) return clauses.map((s) => s.trim());
  return doc.content.split(/\n\s*\n/).map((s) => s.trim())
    .filter((s) => s && !s.includes('本文件为演示用虚构示例'));
}
export function retrieve(question: string, docs: KbDoc[], topK = 6): SearchHit[] {
  const segments = docs.flatMap((doc) => splitDoc(doc).map((snippet) => {
    const questionText = snippet.match(/^问：([^\n]+)/)?.[1];
    const body = bigrams(normalize(questionText ?? snippet));
    const context = bigrams(normalize(`${doc.title} ${doc.category}`));
    return { doc, snippet, body, context, grams: new Set([...body, ...context]) };
  }));
  const frequency = new Map<string, number>();
  for (const segment of segments) for (const gram of segment.grams) frequency.set(gram, (frequency.get(gram) ?? 0) + 1);
  const idf = (gram: string) => Math.log(1 + (segments.length + 1) / ((frequency.get(gram) ?? 0) + 1));
  const query = bigrams(normalize(question));
  // 消除停用词后产生的跨词边界二元组可能不在任何段落中，仍保留部分惩罚。
  const total = [...query].reduce((sum, gram) => sum + idf(gram) * (frequency.has(gram) ? 1 : 0.3), 0);
  return segments.map(({ doc, snippet, body, context }) => {
    const overlap = [...query].reduce((sum, gram) => sum + idf(gram) * (body.has(gram) ? 1 : context.has(gram) ? 1 : 0), 0);
    const evidence = [...query].filter((gram) => body.has(gram)).length;
    const density = Math.sqrt(query.size / Math.max(body.size, query.size, 1));
    const category = categoryOf(question);
    const categoryWeight = category !== '其他' && doc.category !== '其他' && doc.category !== category ? 0.5 : 1;
    const score = evidence ? overlap / Math.max(total, 1) * (0.9 + 0.1 * density) * categoryWeight * (/^第[^条]+条/.test(snippet) ? 1.15 : 1) : 0;
    return { docId: doc.id, title: doc.title, snippet, score };
  }).filter((hit) => hit.score > 0).sort((a, b) => b.score - a.score).slice(0, topK);
}
