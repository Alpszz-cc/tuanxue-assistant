import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', 'HERMES_');
  const proxy = env.HERMES_API_BASE ? { '/hermes': {
    target: env.HERMES_API_BASE, changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/hermes/, ''),
    configure: (server: import('vite').HttpProxy.Server) => {
      server.on('proxyReq', (request) => {
        if (env.HERMES_API_KEY) request.setHeader('Authorization', `Bearer ${env.HERMES_API_KEY}`);
      });
    },
  } } : undefined;
  return { base: './', plugins: [react()], server: { proxy }, preview: { proxy },
    // 仅模型名称可进入浏览器；密钥始终只在 Node 代理闭包中使用。
    define: { __HERMES_MODEL__: JSON.stringify(env.HERMES_MODEL || 'tuanxue') } };
});
