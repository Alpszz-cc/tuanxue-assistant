import { createServer } from 'node:http';
const server = createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/v1/models') {
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ object: 'list', data: [{ id: 'tuanxue', object: 'model' }] }));
  }
  if (req.method !== 'POST' || req.url !== '/v1/chat/completions') { res.writeHead(404); return res.end(); }
  try {
    let body = ''; for await (const chunk of req) body += chunk;
    const input = JSON.parse(body);
    const question = input.messages?.filter((message) => message.role === 'user').at(-1)?.content ?? '';
    const content = question.includes('志愿') ? '参加学院及以上组织的志愿服务，每满4小时计0.5分，学年最高加3分；须提交组织方确认的时长证明。\n依据：《××学院学生综合素质测评实施细则（示例）》第二条' : '制度资料里暂时没有这方面的明确规定。[[ESCALATE:AI无法解答]]';
    if (!input.stream) { res.setHeader('Content-Type', 'application/json'); return res.end(JSON.stringify({ choices: [{ message: { content } }] })); }
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    res.write('event: hermes.tool.progress\ndata: {"message":"正在查阅制度资料…"}\n\n');
    let index = 0;
    const timer = setInterval(() => {
      if (index >= content.length) { clearInterval(timer); res.end('data: [DONE]\n\n'); return; }
      res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: content.slice(index, index + 2) } }] })}\n\n`); index += 2;
    }, 25);
    res.on('close', () => clearInterval(timer));
  } catch { res.writeHead(400); res.end('Invalid request'); }
});
server.listen(8659, '127.0.0.1', () => console.log('Development mock: http://127.0.0.1:8659 (not for demonstrations)'));
