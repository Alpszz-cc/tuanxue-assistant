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
