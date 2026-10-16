import assert from 'node:assert/strict';
import { answerOffline, parseEscalation, RECOMMENDED } from '../src/lib/answerEngine';
import { retrieve, splitDoc } from '../src/lib/retrieval';
import { SEED_DOCS, SEED_NOTICES, SEED_QALOGS } from '../src/data/seed';

const expected = [
  ['doc-zongce', '第二条'], ['doc-zongce', '第四条'],
  ['doc-jiangzhu', '第三条'], ['doc-jiangzhu', '第六条'],
  ['doc-zhuanjie', '第一条', '第二条'], ['doc-zhuanjie', '第四条'],
  ['doc-baoming', '第二条'], ['doc-baoming', '第四条'],
];
RECOMMENDED.flatMap((group) => group.questions).forEach((question, i) => {
  const reply = answerOffline({ question, docs: SEED_DOCS });
  assert.equal(reply.escalated, undefined, question);
  assert.equal(reply.sources[0].docId, expected[i][0], question);
  expected[i].slice(1).forEach((clause) => assert.ok(reply.sources.some((source) => source.snippet.startsWith(clause)), question));
  assert.ok(reply.content.includes('依据：') && reply.content.length <= 250, question);
});
for (const question of ['食堂几点开门', '图书馆几点关门', '火星有几颗卫星']) {
  assert.equal(answerOffline({ question, docs: SEED_DOCS }).escalated, 'AI无法解答');
}
const personal = answerOffline({ question: '我的综测为什么比别人低', docs: SEED_DOCS });
assert.equal(personal.escalated, '需人工核实');
assert.ok(personal.content.startsWith('一般流程：'));
assert.ok(personal.content.includes('第七条'));
const emergency = answerOffline({ question: '我很崩溃，不想活了', docs: SEED_DOCS });
assert.equal(emergency.escalated, '疑似紧急');
assert.ok(emergency.content.includes('辅导员（联系方式：示例）'));
assert.equal(answerOffline({ question: '志愿服务在综测里怎么加分', docs: [] }).escalated, 'AI无法解答');
assert.equal(splitDoc(SEED_DOCS[0]).length, 8);
assert.ok(retrieve('志愿服务在综测里怎么加分', SEED_DOCS, 2).length <= 2);
assert.deepEqual(parseEscalation('已处理[[ESCALATE:需人工核实]]'), { content: '已处理', escalated: '需人工核实' });
const custom = [{ ...SEED_DOCS[0], id: 'changed', content: '第二条 志愿服务每满10小时加1分。' }];
assert.ok(answerOffline({ question: '志愿服务在综测里怎么加分', docs: custom }).content.includes('10小时'));
assert.ok(!answerOffline({ question: '志愿服务在综测里怎么加分', docs: custom }).content.includes('4小时'));
console.log('PASS: 8 recommendations, clause matching, missing knowledge, personal review, safety routing, segmentation, live knowledge and marker parsing');

const freeQuestions: [string, string, string][] = [
  ['奖学金什么时候发', 'doc-faq', '问：奖学金什么时候评定和发放'],
  ['困难补助能申请多少钱', 'doc-faq', '问：临时困难补助怎么申请'],
  ['智慧团建密码忘了怎么办', 'doc-zhuanjie', '第七条'],
  ['竞赛获奖综测加几分', 'doc-zongce', '第三条'],
  ['学生会干事综测加几分', 'doc-zongce', '第四条'],
  ['综测结果公示几天', 'doc-zongce', '第七条'],
  ['怎么报名学生会', 'doc-faq', '问：怎么报名学生会'],
  ['第二课堂思想成长类要几个学分', 'doc-baoming', '第四条'],
  ['无故缺席活动扣多少分', 'doc-zongce', '第六条'],
  ['综测申诉找谁', 'doc-zongce', '第七条'],
  ['对奖学金评定有异议怎么办', 'doc-jiangzhu', '第八条'],
  ['国家助学金怎么申请', 'doc-jiangzhu', '第五条'],
  ['志愿时长在哪里记录', 'doc-faq', '问：志愿服务时长在哪里记录'],
  ['新生团员怎么转入', 'doc-zhuanjie', '第五条'],
  ['升学了团关系怎么办', 'doc-zhuanjie', '第三条'],
  ['活动报名截止了还能报吗', 'doc-baoming', '第一条'],
  ['讲座能算第二课堂学分吗', 'doc-baoming', '第五条'],
  ['宿舍空调坏了找谁', '', 'AI无法解答'],
  ['我的奖学金申请为什么没通过', '', '需人工核实'],
  ['学院奖学金一等奖多少钱', 'doc-jiangzhu', '第二条'],
  ['综测满分多少', 'doc-zongce', '第一条'],
  ['发表论文能加分吗', 'doc-zongce', '第五条'],
  ['三下乡社会实践能加综测分吗', 'doc-zongce', '第五条'],
];
for (const [question, docId, snippet] of freeQuestions) {
  const reply = answerOffline({ question, docs: SEED_DOCS });
  if (!docId) assert.equal(reply.escalated, snippet, question);
  else {
    assert.equal(reply.escalated, undefined, question);
    assert.ok(reply.sources.some((source) => source.docId === docId && source.snippet.startsWith(snippet)), question);
  }
}
for (const question of ['扣分的一般规则', '审批流程是什么', '申诉的一般流程']) {
  assert.notEqual(answerOffline({ question, docs: SEED_DOCS }).escalated, '需人工核实', question);
}
console.log('PASS: 23 free questions and first-person-only review routing');

const { ticketDocument, dashboardMetrics } = await import('../src/lib/admin');
const ticket = { id: 'roundtrip', studentId: 'stu001', studentName: '张同学', question: '食堂几点开门',
  category: '其他' as const, reason: 'AI无法解答' as const, status: '已回复' as const,
  repliedBy: '王老师', reply: '演示食堂每日早上七点开门，具体以现场通知为准。', createdAt: Date.now() };
const saved = ticketDocument(ticket);
assert.equal(saved.content, `问：${ticket.question}\n答：${ticket.reply}`);
assert.equal(saved.category, ticket.category);
assert.equal(saved.source, 'ticket');
assert.equal(answerOffline({ question: ticket.question, docs: SEED_DOCS }).escalated, 'AI无法解答');
const learned = answerOffline({ question: ticket.question, docs: [...SEED_DOCS, saved] });
assert.equal(learned.escalated, undefined);
assert.ok(learned.content.includes(ticket.reply));
assert.equal(learned.sources[0].docId, saved.id);
assert.ok(learned.content.includes('依据：王老师的答复（已沉淀至知识库）'));
const now = new Date(2026, 9, 16, 12).getTime();
const metrics = dashboardMetrics([
  { id: 'today', studentId: 'stu001', question: 'a', category: '其他', resolvedByAI: true, createdAt: now },
  { id: 'yesterday', studentId: 'stu001', question: 'b', category: '其他', resolvedByAI: false, createdAt: now - 86400000 },
  { id: 'old', studentId: 'stu001', question: 'c', category: '其他', resolvedByAI: false, createdAt: now - 8 * 86400000 },
], [{ ...ticket, status: '待处理' }], [
  { id: 'n1', title: '全体', content: 'a', type: '通知', audience: '全体学生', publisher: '王老师', createdAt: now, readBy: ['stu001', 'unknown'] },
  { id: 'n2', title: '干部', content: 'b', type: '通知', audience: '学生会干部', publisher: '王老师', createdAt: now, readBy: ['stu001'] },
], now);
assert.equal(metrics.today, 1); assert.equal(metrics.aiRate, 50); assert.equal(metrics.pending, 1); assert.equal(metrics.readRate, 75);
console.log('PASS: ticket→FAQ→same question with source; dashboard time windows and audience read ratios');

const { readFileSync } = await import('node:fs');
for (const doc of SEED_DOCS) {
  const reference = new URL(`../hermes/skills/tuanxue-assistant/references/${doc.id}.md`, import.meta.url);
  assert.equal(readFileSync(reference, 'utf8'), doc.content, `Hermes reference drift: ${doc.id}`);
}
console.log('PASS: 5 Hermes reference files exactly match frontend seed text');

assert.equal(SEED_QALOGS.length, 40);
for (const [question, count] of [['志愿服务在综测里怎么加分', 6], ['奖学金什么时候发', 5], ['第二课堂学分要修多少', 4], ['毕业了团关系怎么转', 4], ['一等奖学金有什么要求', 3]] as const) {
  assert.equal(SEED_QALOGS.filter((log) => log.question === question).length, count);
}
assert.ok(dashboardMetrics(SEED_QALOGS, [], SEED_NOTICES).readRate > 0);
assert.deepEqual(SEED_NOTICES.find((notice) => notice.pinned)?.readBy, []);
console.log('PASS: repeated seed frequencies and initial notification read rate');
