import type { Category, KbDoc } from '../types';

export interface SearchHit { docId: string; title: string; snippet: string; score: number; section?: string; nextLine?: string; previousLine?: string }
// 通用领域词归一；不包含完整问题、答案映射或按测试题分支。
const synonyms: [RegExp, string][] = [
  [/([一二三])等奖学金/g, '$1等奖 奖学金'],
  [/截止时间|截止日期|截止|什么时候|何时|几点|几号|哪天/g, '时间'],
  [/交到|递交|提交|上交/g, '交'],
  [/文件与邮箱命名|文件命名|命名/g, '命名'],
  [/线上|线下/g, '形式'],
  [/盖(?:什么|哪些)?章|加盖/g, '盖章'],
  [/论文/g, '文章'], [/三下乡/g, '社会实践'],
  [/团关系|团员关系/g, '团组织关系'],
  [/学生工作/g, '学生会'], [/时长/g, '小时'],
  [/去不了|不能去|无法参加|没法参加/g, '不能参加'],
  [/要求|申请者须/g, '条件'],
  [/发放|发到|到账/g, '发'], [/申诉|复核/g, '异议'],
];
const stopwords = /怎么办|为什么|怎么|什么|多少|可以|能否|哪里|如何|是否|哪些|几个|多久|几天|找谁|什么时候|需要|哪个|时候|对|到|能|吗|呢|几|要|的|了|我|在|里|有|后|了/g;
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
interface Segment { snippet: string; section?: string; nextLine?: string; previousLine?: string }
export function documentSegments(doc: KbDoc): Segment[] {
  const clauses = doc.content.match(/第[一二三四五六七八九十百\d]+条[^\n]*(?:\n(?!\s*\n|第[一二三四五六七八九十百\d]+条)[^\n]+)*/g);
  if (clauses) return clauses.map((snippet) => ({ snippet: snippet.trim() }));
  if (/^[一二三四五六七八九十]+、/m.test(doc.content)) {
    let section = ''; const lines: Segment[] = [];
    for (const raw of doc.content.split('\n')) {
      const line = raw.trim(); if (!line) continue;
      if (/^[一二三四五六七八九十]+、/.test(line)) { section = line; continue; }
      if (section) lines.push({ snippet: line, section });
    }
    return lines.map((line, index) => ({ ...line,
      nextLine: lines[index + 1]?.section === line.section ? lines[index + 1].snippet : undefined,
      previousLine: lines[index - 1]?.section === line.section ? lines[index - 1].snippet : undefined }));
  }
  return doc.content.split(/\n\s*\n/).map((snippet) => ({ snippet: snippet.trim() }))
    .filter(({ snippet }) => snippet && !snippet.includes('本文件为演示用虚构示例'));
}
export function splitDoc(doc: KbDoc): string[] { return documentSegments(doc).map((segment) => segment.snippet); }
export function missingCoreRatio(question: string, docs: KbDoc[]): number {
  const words = [...new Intl.Segmenter('zh', { granularity: 'word' }).segment(question)]
    .map((word) => normalize(word.segment)).filter((word) => word.length >= 2);
  const corpus = normalize(docs.map((doc) => `${doc.title} ${doc.category} ${doc.content}`).join(' '));
  return words.length ? words.filter((word) => !corpus.includes(word)).length / words.length : 0;
}
export function retrieve(question: string, docs: KbDoc[], topK = 6): SearchHit[] {
  const segments = docs.flatMap((doc) => documentSegments(doc).map((segment) => {
    const { snippet, section } = segment;
    const questionText = snippet.match(/^问：([^\n]+)/)?.[1];
    const scalarContext = section && /\d+月\d+日|\d{1,2}:\d{2}/.test(snippet) ? '时间' : '';
    const body = bigrams(normalize(`${questionText ?? snippet} ${scalarContext}`));
    const context = bigrams(normalize(`${section ?? ''} ${doc.category} ${section ? '' : doc.title}`));
    return { doc, ...segment, questionText, searchable: normalize(`${questionText ?? snippet} ${scalarContext}`), body, context, grams: new Set([...body, ...context]) };
  }));
  const labels = [...new Set(segments.filter((segment) => segment.section).map((segment) => segment.snippet.match(/^([\p{Script=Han}A-Za-z]{2,12})：/u)?.[1]).filter((label): label is string => !!label).map(normalize))];
  const requestedFields = labels.filter((label) => normalize(question).includes(label));
  const frequency = new Map<string, number>();
  for (const segment of segments) for (const gram of segment.grams) frequency.set(gram, (frequency.get(gram) ?? 0) + 1);
  const idf = (gram: string) => Math.log(1 + (segments.length + 1) / ((frequency.get(gram) ?? 0) + 1));
  const query = bigrams(normalize(question));
  const words = [...new Intl.Segmenter('zh', { granularity: 'word' }).segment(question)]
    .map((word) => normalize(word.segment)).filter((word) => word.length >= 2);
  // 查询涉及分节资料的主题时，缺少该主题的其他文档降低权重，避免泛词覆盖具体事项。
  const specificWords = words.filter((word) => {
    const matches = docs.filter((doc) => normalize(`${doc.title} ${doc.content}`).includes(word));
    return matches.some((doc) => documentSegments(doc).some((segment) => segment.section));
  });
  // 消除停用词后产生的跨词边界二元组可能不在任何段落中，仍保留部分惩罚。
  const total = [...query].reduce((sum, gram) => sum + idf(gram) * (frequency.has(gram) ? 1 : 0.3), 0);
  return segments.map(({ doc, snippet, section, nextLine, previousLine, questionText, searchable, body, context }) => {
    const overlap = [...query].reduce((sum, gram) => sum + idf(gram) * (body.has(gram) ? 1 : context.has(gram) ? (section ? 0.5 : 1) : 0), 0);
    const evidence = [...query].filter((gram) => body.has(gram)).length;
    const density = Math.sqrt(query.size / Math.max(body.size, query.size, 1));
    const category = categoryOf(question);
    const categoryWeight = category !== '其他' && doc.category !== '其他' && doc.category !== category ? 0.5 : 1;
    const fieldWeight = section && requestedFields.some((field) => !searchable.includes(field)) ? 0.25 : 1;
    // 同一小节已有足够主题证据时，明确字段名优先于句子中顺带出现的字段值。
    const scopeMatches = [...query].filter((gram) => context.has(gram)).length;
    const explicitField = normalize(snippet.split('：')[0]);
    const fieldBoost = section && scopeMatches >= 2 && requestedFields.includes(explicitField) ? 1.6 : 1;
    // FAQ 问题中可能插入名词限定语；小幅字符覆盖补偿保留这些词后丢失的相邻关系。
    const queryCharacters = new Set(normalize(question));
    const faqCharacters = new Set(normalize(questionText ?? ''));
    const characterCoverage = [...queryCharacters].filter((character) => faqCharacters.has(character)).length / Math.max(queryCharacters.size, 1);
    const boundaryCompensation = questionText && evidence && characterCoverage >= 0.9 ? 0.15 : 0;
    const topicWeight = specificWords.some((word) => !normalize(`${doc.title} ${doc.content}`).includes(word)) ? 0.5 : 1;
    // 通知内用稀有实词补充二元组，避免相邻泛词压过“异议”等具体办理事项。
    const lineEvidence = section ? words.filter((word) => !labels.includes(word)).reduce((sum, word) => sum + (normalize(snippet).includes(word) ? 0.3 / Math.max(1, documentSegments(doc).filter((line) => normalize(line.snippet).includes(word)).length) : 0), 0) : 0;
    const score = topicWeight * (lineEvidence + boundaryCompensation + (evidence ? fieldBoost * fieldWeight * overlap / Math.max(total, 1) * (0.9 + 0.1 * density) * categoryWeight * (/^第[^条]+条/.test(snippet) ? 1.15 : 1) : 0));
    return { docId: doc.id, title: doc.title, snippet, score, section, nextLine, previousLine };
  }).filter((hit) => hit.score > 0).sort((a, b) => b.score - a.score).slice(0, topK);
}
