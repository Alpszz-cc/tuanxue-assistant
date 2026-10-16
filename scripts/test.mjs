import { createServer } from 'vite';
const server = await createServer({ configFile: false, optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true }, appType: 'custom' });
try { await server.ssrLoadModule('/tests/engine.test.ts'); } finally { await server.close(); }
