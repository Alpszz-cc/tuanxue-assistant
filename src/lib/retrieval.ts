import type { Category, KbDoc } from '../types';

export interface SearchHit {
  docId: string;
  title: string;
  snippet: string;
  score: number;
}

// 只做词义归一，不预置问题答案；任何回复仍须来自当前知识库。
const synonyms: [RegExp, string][] = [
  [/学生工作/g, '学生会'],
  [/团关系|团员关系|团组织关系/g, '团组织关系'],
  [/怎么转|转至|转出|转入/g, '转接'],
  [/去不了|不能去|没法参加|无法参加/g, '不能参加'],
  [/一等奖学金|一等奖/g, '一等奖'],
  [/要求|资格/g, '条件'],
  [/要修|修多少|要多少|几个/g, '修满'],
  [/时长/g, '小时'],
];
export function normalize(text: string): string {
  return synonyms.reduce((value, [pattern, replacement]) => value.replace(pattern, replacement), text)
    .toLowerCase().replace(/[\s\p{P}\p{S}]/gu, '');
}
function bigrams(text: string): Set<string> {
  const result = new Set<string>();
  for (let i = 0; i < text.length - 1; i++) result.add(text.slice(i, i + 2));
  return result;
}
const keywords = ['志愿', '综测', '加分', '学生会', '学生工作', '干事', '竞赛', '一等奖', '奖学金',
  '助学金', '困难', '认定', '材料', '毕业', '升学', '转接', '审核', '密码', '报名',
  '不能参加', '请假', '第二课堂', '学分', '修满', '投诉', '申诉', '公示', '扣分'];
export function categoryOf(question: string): Category {
  if (/综测|加分|扣分|竞赛|学生工作/.test(question)) return '综测评奖';
  if (/奖学金|助学|奖助|困难|补助/.test(question)) return '奖助申请';
  if (/团关系|团组织|团员|团建|转接/.test(question)) return '团务转接';
  if (/活动|报名|第二课堂|学分|参加/.test(question)) return '活动报名';
  return '其他';
}
export function splitDoc(doc: KbDoc): string[] {
  // 编号条文单独切开，标题、章节名和示例声明不参与作答；FAQ 保留问答整段。
  const clauses = doc.content.match(/第[一二三四五六七八九十百\d]+条[^\n]*(?:\n(?!\s*\n|第[一二三四五六七八九十百\d]+条)[^\n]+)*/g);
  if (clauses) return clauses.map((s) => s.trim());
  return doc.content.split(/\n\s*\n/).map((s) => s.trim())
    .filter((s) => s && !s.includes('本文件为演示用虚构示例'));
}
export function retrieve(question: string, docs: KbDoc[], topK = 6): SearchHit[] {
  const query = normalize(question);
  const grams = bigrams(query);
  const allTerms = [...new Set(keywords.map(normalize))].filter((word) => query.includes(word));
  const specific = allTerms.filter((word) => !['综测', '加分', '材料', '转接', '学分'].includes(word));
  const terms = specific.length ? specific : allTerms;
  const category = categoryOf(question);
  const hits: SearchHit[] = [];
  for (const doc of docs) {
    for (const snippet of splitDoc(doc)) {
      const text = normalize(snippet);
      const segmentGrams = bigrams(text);
      const overlap = [...grams].filter((g) => segmentGrams.has(g)).length;
      const keywordOverlap = terms.filter((word) => text.includes(normalize(word))).length;
      // 元数据仅加权，不能让只碰巧同分类的无关条款达到作答阈值。
      const contentScore = overlap / Math.max(grams.size, 1) * 0.65 +
        keywordOverlap / Math.max(terms.length, 1) * 0.35;
      const titleOverlap = [...grams].filter((g) => normalize(doc.title).includes(g)).length;
      const anchor = terms.length && keywordOverlap === 0 ? 0.2 : 1;
      const regulationWeight = /^第[^条]+条/.test(snippet) ? 1.5 : 0.8;
      const materialBoost = /材料|证明/.test(question) && /提交|申请表|证明/.test(snippet) ? 0.2 : 0;
      const score = materialBoost + anchor * regulationWeight * contentScore * (1 + Math.min(titleOverlap * 0.02, 0.15) + (category === doc.category ? 0.1 : 0));
      if (overlap > 0) hits.push({ docId: doc.id, title: doc.title, snippet, score });
    }
  }
  return hits.sort((a, b) => b.score - a.score).slice(0, topK);
}
