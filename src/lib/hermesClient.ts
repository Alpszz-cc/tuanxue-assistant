export interface ModelMessage { role: 'system' | 'user' | 'assistant'; content: string }
export interface StreamOptions { signal?: AbortSignal; onToken?: (text: string) => void; onProgress?: () => void; timeoutMs?: number }
export function createSSEParser(onData: (event: string, data: string) => void) {
  let buffer = '';
  const consume = (frame: string) => {
    let event = 'message'; const data: string[] = [];
    for (const line of frame.split(/\r?\n/)) {
      if (line.startsWith('event:')) event = line.slice(6).trim();
      if (line.startsWith('data:')) data.push(line.slice(5).trimStart());
    }
    if (data.length) onData(event, data.join('\n'));
  };
  return { push(chunk: string) {
    buffer += chunk;
    let boundary: RegExpExecArray | null;
    while ((boundary = /\r?\n\r?\n/.exec(buffer))) { consume(buffer.slice(0, boundary.index)); buffer = buffer.slice(boundary.index + boundary[0].length); }
  }, finish() { if (buffer.trim()) consume(buffer); buffer = ''; } };
}
export async function chatCompletion(messages: ModelMessage[], options: StreamOptions = {}): Promise<string> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  options.signal?.addEventListener('abort', abort, { once: true });
  if (options.signal?.aborted) controller.abort();
  const timer = setTimeout(abort, options.timeoutMs ?? 60000);
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  try {
    const response = await fetch('/hermes/v1/chat/completions', { method: 'POST', signal: controller.signal,
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model: typeof __HERMES_MODEL__ === 'string' ? __HERMES_MODEL__ : 'tuanxue', stream: true, messages }) });
    if (!response.ok) throw new Error(`智能体接口 HTTP ${response.status}`);
    if (!response.body) throw new Error('接口没有响应流');
    let content = ''; let done = false;
    const append = (text: string) => { content += text; options.onToken?.(text); };
    if (!response.headers.get('content-type')?.includes('text/event-stream')) {
      const data = await response.json(); append(data.choices?.[0]?.message?.content ?? '');
    } else {
      const decoder = new TextDecoder(); reader = response.body.getReader();
      const parser = createSSEParser((event, data) => {
        if (event === 'hermes.tool.progress') { options.onProgress?.(); return; }
        if (data.trim() === '[DONE]') { done = true; return; }
        if (done) return;
        const frame = JSON.parse(data); const token = frame.choices?.[0]?.delta?.content;
        if (typeof token === 'string') append(token);
      });
      while (!done) { const chunk = await reader.read(); if (chunk.done) break; parser.push(decoder.decode(chunk.value, { stream: true })); }
      parser.push(decoder.decode()); parser.finish();
    }
    if (!content.trim()) throw new Error('智能体返回空内容');
    return content;
  } finally { clearTimeout(timer); options.signal?.removeEventListener('abort', abort); if (reader) { await reader.cancel().catch(() => {}); reader.releaseLock(); } }
}
export async function testConnection(signal?: AbortSignal): Promise<string> {
  const response = await fetch('/hermes/v1/models', { signal: signal ?? AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error(`HTTP ${response.status}：请检查服务地址、凭据及服务是否运行`);
  const data = await response.json();
  if (!Array.isArray(data.data) || !data.data.length) throw new Error('接口没有返回模型列表');
  return data.data.map((item: { id: string }) => item.id).join('、');
}
