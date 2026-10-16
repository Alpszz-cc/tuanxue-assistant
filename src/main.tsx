import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConfigProvider, App as AntApp, theme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { HashRouter } from 'react-router-dom';
import App from './App';
import { setupCrossTabSync, useStore } from './store';
import './index.css';

// 跨窗口（学生端 / 管理端并排演示）实时同步
setupCrossTabSync();

// 同步 rehydrate 已在 store 创建时完成；首次启动主动落盘，供其他窗口读取。
useStore.setState({ lastBootAt: Date.now() });

// 团学红主题（docs/PLAN.md 第 6 节）
const themeConfig = {
  token: {
    colorPrimary: '#C8102E',
    borderRadius: 8,
  },
  algorithm: theme.defaultAlgorithm,
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider locale={zhCN} theme={themeConfig}>
      <AntApp>
        <HashRouter>
          <App />
        </HashRouter>
      </AntApp>
    </ConfigProvider>
  </React.StrictMode>
);
