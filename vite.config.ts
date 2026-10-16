import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages 部署用相对路径；生产默认离线演示模式（见 docs/PLAN.md 第 2 节）
export default defineConfig({
  base: './',
  plugins: [react()],
});
