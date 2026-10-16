import assert from 'node:assert/strict';
import { chatCompletion, createSSEParser } from '../src/lib/hermesClient';
import { answer, buildMessages } from '../src/lib/answerEngine';
import { SEED_DOCS } from '../src/data/seed';
const frames: string[][] = [];
const parser = createSSEParser((event, data) => frames.push([event, data]));
for (const part of ['event: hermes.tool.progress\r', '\ndata: 进度\r\n\r', '\ndata: abc\n\ndata: [DONE]\n\n']) parser.push(part);
assert.deepEqual(frames, [['hermes.tool.progress', '进度'], ['message', 'abc'], ['message', '[DONE]']]);
const originalFetch = globalThis.fetch;
try {
  let progress = 0; let streamed = '';
  globalThis.fetch = async () => new Response('event: hermes.tool.progress\ndata: {"content":"SECRET-PROGRESS"}\n\ndata: {"choices":[{"delta":{"content":"你好"}}]}\n\ndata: [DONE]\n\n', { headers: { 'content-type': 'text/event-stream' } });
  assert.equal(await chatCompletion([], { onToken: (text) => streamed += text, onProgress: () => progress++ }), '你好');
  assert.equal(progress, 1); assert.equal(streamed, '你好');
  globalThis.fetch = async () => new Response('data: [DONE]\n\n', { headers: { 'content-type': 'text/event-stream' } });
  assert.ok((await answer({ question: '志愿服务在综测里怎么加分', docs: SEED_DOCS, mode: 'hermes' })).offlineFallback);
  globalThis.fetch = async () => { throw new Error('network down'); };
  const fallback = await answer({ question: '食堂几点开门', docs: SEED_DOCS, mode: 'hermes' });
  assert.equal(fallback.escalated, 'AI无法解答'); assert.equal(fallback.offlineFallback, true);
  globalThis.fetch = async (_url, options) => new Promise((_resolve, reject) => {
    const signal = options?.signal;
    const abort = () => reject(new DOMException('Aborted', 'AbortError'));
    if (signal?.aborted) abort(); else signal?.addEventListener('abort', abort, { once: true });
  });
  await assert.rejects(chatCompletion([], { timeoutMs: 10 }), /Aborted/);
  const controller = new AbortController(); controller.abort();
  await assert.rejects(answer({ question: 'a', docs: [], mode: 'hermes', signal: controller.signal }), /Aborted/);
} finally { globalThis.fetch = originalFetch; }
const history = Array.from({ length: 10 }, (_, i) => ({ id: String(i), role: 'user' as const, content: String(i), createdAt: 0 }));
const messages = buildMessages({ question: 'a', docs: SEED_DOCS, history });
assert.equal(messages.length, 8); assert.equal(messages[1].content, '4');
assert.ok(messages[0].content.includes('tuanxue-assistant'));
console.log('PASS: fragmented SSE, progress filtering, empty/error fallback, timeout, cancellation and context history');
