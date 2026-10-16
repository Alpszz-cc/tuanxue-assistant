# 开发进度

## 第 1 步：脚手架 + 布局 + 数据层 + 示例数据

已完成：

- 原样保存 docs/PLAN.md，复用已初始化的 main 分支及公开 GitHub 仓库。
- Vite + React + TypeScript，第 2 节全部依赖已安装并锁定；antd 6、Ant Design X 2、中文 locale、团学红主题、base: './'。
- HashRouter：登录、学生端三个路由、管理端五个路由；默认、未知路由和未选身份均回登录；不同角色回各自首页。
- 两阶段 mock 身份选择；480px 学生端及底部导航；管理端侧栏、身份顶栏与打开学生端按钮。业务页保留占位。
- zustand persist，业务数据写入 txzs_tuanxue；监听 storage 自动 rehydrate。首次访问立即写入完整种子数据，设置页支持确认重置。
- 四份制度各 8 条、FAQ 9 问、5 条通知、6 条工单（4 待处理含 1 疑似紧急、2 已回复）、40 条近七天咨询日志；虚构资料首行和标题均有示例声明。
- .gitignore 排除依赖、构建产物、环境变量及 TypeScript 缓存。

未做：第 2—6 步。问答、通知操作、工单处理、知识库上传、真实统计、Hermes 接入和部署均未实现。

### 运行与验证

```sh
npm install
npm run dev
npm run build
```

已实际通过 TypeScript 和生产构建，并使用 Chromium 验证：

1. 直接访问未登录管理内页自动回登录；清空 localStorage 后刷新，立即写入 5/5/6/40 条对应数据。
2. 王老师进入管理端，五个菜单全部切换成功；另一个同源窗口以张同学进入学生端，三个底部导航全部切换成功，管理窗口仍为王老师。
3. 在管理窗口控制台执行下述代码，学生窗口通知角标由 5 自动变为 6，无需刷新，验证真实 storage 事件与 rehydrate：

```js
const data = JSON.parse(localStorage.getItem('txzs_tuanxue'));
data.state.notices.push({ ...data.state.notices[0], id: 'sync-test', readBy: [] });
localStorage.setItem('txzs_tuanxue', JSON.stringify(data));
```

4. 管理窗口进入设置，点击“重置全部演示数据”并确认；学生窗口角标由 6 自动恢复为 5，两窗口身份保持独立。
5. 学生端 375×768 无横向滚动，管理端 1366×768 可操作；浏览器无未捕获异常。

### 人工注意与已知限制

- 本步仅为骨架，页面明确标注后续实现步骤，不能演示完整问答主线。
- 身份只在当前窗口内存保存，刷新会回登录，需重新选择；这是避免两个演示窗口覆盖身份的设计。重置保留当前窗口身份。
- 同源业务数据以 localStorage 最后一次写入为准，不保证两个窗口同时写入的冲突合并。
- Vite 提示单个 JS 包超过 500 kB（约 839 kB，gzip 272 kB），为非阻断警告；当前构建成功。
- 按代码审查技能检查了范围、类型、未使用代码与数据同步逻辑；没有项目 lint 脚本，使用 TypeScript strict 和浏览器验收。
- 仓库没有 API Key；PLAN.md 经逐字节比较与附件一致。
