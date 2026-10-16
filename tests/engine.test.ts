import assert from 'node:assert/strict';
import { answerOffline, parseEscalation, RECOMMENDED } from '../src/lib/answerEngine';
import { retrieve, splitDoc } from '../src/lib/retrieval';
import { SEED_DOCS } from '../src/data/seed';

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
