# 团学事务助手 · 网页 Demo 开发计划

> 给执行者（Hermes）：本文件要原样保存在仓库 `docs/PLAN.md`。每一步开始前先重读相关章节；每一步结束必须按「第 9 节 提交规范」推送到 GitHub，然后**停下来等待审核**，不要自行开始下一步。

---

## 0. 背景与目标

学院团学事务（综测评奖、奖助申请、团务转接、活动报名、通知传达）目前靠 QQ/微信人工答复：同类问题反复问、高峰期回复不过来、消息被冲掉；学生会内部老师—主席—干事—外院同学之间靠转发聊天记录沟通，容易遗漏和走样。

要做的是一个**以开源 Hermes 智能体为基座的「学院团学事务助手」**，网页端，分**学生端**和**管理端**：
- 管理端（老师、学生干部）：导入制度资料建知识库、发布通知、查看咨询汇总、处理转人工问题。
- 学生端：接收通知、基于制度资料自助问答；智能体答不了的问题自动标记并转交管理端。

**这次只做答辩用 Demo，明天上台演示。** 优先级：能稳定演示 > 页面完整好看 > 真实接入大模型 > 代码工程化。

### 演示主线（所有设计都为这条线服务）
1. 管理端导入一份制度资料 → 知识库列表里出现。
2. 学生端问「志愿服务在综测里怎么加分」→ 智能体基于制度回答，并标注出处。
3. 学生问一个资料里没有的问题 → 自动显示「已转交老师/学生会」→ 管理端「咨询汇总」立刻出现这条 → 老师回复 → 学生端「我的咨询」收到回复 → 老师一键「沉淀到知识库」→ 学生再问同一问题，智能体能直接答上。
4. 管理端发布通知（指定对象：全体学生 / 学生会干部 / 2024级）→ 学生端通知角标 +1 → 管理端看到已读人数变化。
5. （加分）管理端粘贴一段乱糟糟的群聊记录 → 智能体整理成「通知 + 待办 + 截止时间」→ 一键发布给学生会干部。

演示方式：同一个浏览器开两个窗口并排，左边学生端（手机版式），右边管理端。

---

## 1. 调研结论（为什么这样做）

- GitHub 上已有一些「校园制度 / 学生手册 RAG 问答」个人项目（lixinyao00/fudaoyuan-agent、6v2bnjsg9j-svg/campus-qa-rag、Rhine9527123/QWSuit-Campus-RAG 等），都只做「学生问—AI 答」，**没有通知发布、转人工工单、沟通整理**；技术栈是 Java+Milvus / LangGraph+Milvus 等重型方案，且仓库里都没有开源许可证文件。→ 只参考功能思路，**不复制代码**。
- MaxKB（GPL-3.0）/ FastGPT（自有许可证）这类知识库平台功能强，但要 Docker + 数据库，一晚上部署风险大，也不是基于 Hermes，没有通知和工单。→ 不用。
- Hermes 自带 **OpenAI 兼容 API Server**（`/v1/chat/completions`，支持流式）和 **Skills 机制**（SKILL.md）。→ 前端直接调 Hermes；团学答疑规则写成一个 Hermes Skill，正好对应榜题要求交付的「智能体 + Agent skill」。
- 聊天界面不从零写：用 **Ant Design X 2**（蚂蚁的 AI 对话组件库，MIT 许可，有 Bubble、Sender、Welcome、Prompts、Sources、Actions、ThoughtChain），管理端用 **antd 6** 的 Layout/Table/Form/Card/Statistic。

---

## 2. 技术栈（不要更换，不要额外引入 UI 库或 CSS 框架）

- Vite + React + TypeScript
- `antd` 6.x、`@ant-design/x` 2.x、`@ant-design/icons`
- `react-router`（**HashRouter**，方便部署到 GitHub Pages）
- `zustand`（persist 到 localStorage）
- `mammoth`（浏览器端读取 .docx 纯文本）
- **不写后端服务器、不用数据库、不用向量库、不引入图表库**（统计用 antd Statistic / Progress）。所有业务数据存在浏览器 localStorage。
- 大模型：本地开发时通过 Vite dev server 代理调用 Hermes API Server；生产构建（GitHub Pages）默认使用「离线演示模式」。

---

## 3. 架构

```
浏览器（同一浏览器两个窗口：学生端 / 管理端）
 ├─ React 页面
 ├─ store：zustand + localStorage；监听 window 的 storage 事件 → 两个窗口实时同步
 └─ answerEngine
      ├─ 离线模式：本地检索知识库 → 模板化回答 / 转人工
      └─ Hermes 模式：规则 + 检索到的制度片段 → POST /hermes/v1/chat/completions（stream）
                         │  Vite 代理：在服务端注入 API Key（Key 不进浏览器、不进打包产物）
                         ▼
               Hermes Agent（独立 profile「tuanxue」，API Server 端口 8650）
                 └─ skills/tuanxue-assistant/（SKILL.md + references/ 示例制度）
```

---

## 4. 目录结构

```
tuanxue-assistant/
├─ docs/
│  ├─ PLAN.md              本文件（原样保存）
│  ├─ PROGRESS.md          每步完成记录（必须维护）
│  ├─ DEMO_SCRIPT.md       第 6 步写
│  └─ screenshots/
├─ hermes/
│  ├─ skills/tuanxue-assistant/SKILL.md
│  ├─ skills/tuanxue-assistant/references/*.md
│  ├─ SOUL.md              tuanxue profile 的人设
│  ├─ setup.sh             创建 profile、安装 skill、配置 API Server
│  └─ README.md
├─ src/
│  ├─ main.tsx  App.tsx  router.tsx  types.ts
│  ├─ layouts/StudentLayout.tsx  layouts/AdminLayout.tsx
│  ├─ pages/Login.tsx
│  ├─ pages/student/Chat.tsx  Notices.tsx  MyTickets.tsx
│  ├─ pages/admin/Dashboard.tsx  Knowledge.tsx  Notices.tsx  Tickets.tsx  Settings.tsx
│  ├─ store/index.ts       zustand store + 跨窗口同步 + resetDemoData()
│  ├─ data/seed.ts         示例数据
│  ├─ lib/retrieval.ts     中文检索
│  ├─ lib/answerEngine.ts  离线 / Hermes 两种模式，统一接口
│  └─ lib/hermesClient.ts  SSE 流式客户端
├─ .env.example
├─ vite.config.ts
└─ README.md
```

---

## 5. 数据模型（src/types.ts）

```ts
type Category = '综测评奖' | '奖助申请' | '团务转接' | '活动报名' | '其他';
type EscalateReason = 'AI无法解答' | '需人工核实' | '疑似紧急' | '学生申请人工';

interface KbDoc {
  id: string; title: string; category: Category; content: string;
  source: 'seed' | 'upload' | 'ticket'; updatedAt: number;
}
interface Notice {
  id: string; title: string; content: string;
  type: '通知' | '活动' | '提醒';
  audience: '全体学生' | '学生会干部' | '2024级';
  publisher: string; createdAt: number; pinned?: boolean;
  readBy: string[];            // 学生 id
}
interface ChatMessage {
  id: string; role: 'user' | 'assistant'; content: string; createdAt: number;
  sources?: { docId: string; title: string; snippet: string }[];
  escalated?: EscalateReason; ticketId?: string;
  feedback?: 'up' | 'down'; offlineFallback?: boolean;
}
interface Ticket {
  id: string; studentId: string; studentName: string;
  question: string; aiAnswer?: string; category: Category;
  reason: EscalateReason; status: '待处理' | '已回复' | '已关闭';
  reply?: string; repliedBy?: string; createdAt: number; repliedAt?: number;
  addedToKb?: boolean; studentSeen?: boolean;
}
interface QaLog {
  id: string; studentId: string; question: string;
  category: Category; resolvedByAI: boolean; createdAt: number;
}
```

Mock 身份（不做真实登录，登录页只选身份）：
- 学生：`stu001 张同学（2024级，学生会宣传部干事）`、`stu002 李同学（2023级）`
- 管理端：`王老师（团委指导老师）`、`陈同学（学生会主席）`

通知可见规则：`全体学生` 所有学生可见；`学生会干部` 仅 stu001 可见；`2024级` 仅 stu001 可见。

---

## 6. 页面清单

### 学生端（手机版式：内容区最大宽度 480px 居中；底部 Tab：问答 / 通知（未读角标）/ 我的咨询（新回复角标））
- **问答**：Welcome（助手介绍）+ Prompts（4 个分类各 2 个推荐问题）；Bubble.List 对话；回答下方用 `Sources` 显示「参考资料」（标题 + 片段，可折叠）；用 `Actions` 放 👍/👎、复制、「转人工」；触发转人工后显示提示卡片「已转交老师/学生会处理，回复后会在『我的咨询』通知你」。对话记录按学生分别保存。
- **通知**：列表（未读加粗 + 红点、类型 Tag、置顶在前），点开 Drawer 看详情并标记已读；只显示该学生可见的通知。
- **我的咨询**：工单列表，状态 Tag，老师回复内容和回复人。

### 管理端（桌面版式：左侧菜单 + 顶栏显示当前身份、「打开学生端」按钮）
- **工作台**：4 个统计卡（今日咨询数、AI 解答率、待处理转人工、通知平均已读率）；分类分布（Progress 条）；高频问题 Top5；最新待处理工单（「疑似紧急」标红置顶）。所有数字由数据实时计算，不写死。
- **知识库**：表格（标题 / 分类 / 来源 / 字数 / 更新时间）；新增（粘贴文本）；上传 .txt / .md / .docx；查看；删除；「恢复示例资料」。
- **通知发布**：表单（标题、正文、类型、对象、是否置顶）+ 已发布列表（已读 x / 可见人数 y）。第 6 步再加「从聊天记录生成通知」。
- **咨询汇总**：工单表格，按状态 / 分类 / 原因筛选；「回复」Modal；「沉淀到知识库」按钮（把问题 + 回复存成一条 `source: 'ticket'` 的 KbDoc，之后学生再问能答上）。
- **设置**：问答模式（离线演示 / Hermes）；「测试连接」；「重置全部演示数据」。

视觉：antd ConfigProvider 中文 locale；主色用团学红（如 `#C8102E`）；登录页要有项目名「团学事务助手」和一句标语；投影常见分辨率 1366×768 下不能挤乱。

---

## 7. 示例数据（src/data/seed.ts，与 hermes/skills/.../references 内容一致）

- 4 份示例制度，每份 6–10 条，标题末尾加「（示例）」，正文第一行写「本文件为演示用虚构示例，非真实制度」：
  - 《××学院学生综合素质测评实施细则（示例）》
  - 《××学院奖助学金评定办法（示例）》
  - 《团组织关系转接办理指南（示例）》
  - 《学生活动报名与第二课堂学分说明（示例）》
- 1 份《团学常见问题（示例）》，8–10 问。
- 预置 5 条通知、6 条工单（4 待处理含 1 条「疑似紧急」，2 已回复）、约 40 条历史 QaLog（分布在近 7 天、各分类），保证工作台不是空的。
- 不出现任何真实学生姓名、学号、电话；联系方式用「（示例）」占位。
- 如果用户提供了学院真实制度文件，用真实文件替换示例。

---

## 8. 回答规则（离线 / Hermes 两种模式共用，也是 SKILL.md 的核心内容）

1. 只依据提供的制度资料回答；资料里没有的不猜，回答「制度资料里暂时没有这方面的明确规定」，并在末尾输出 `[[ESCALATE:AI无法解答]]`。
2. 回答末尾标注出处：`依据：《文件名》第X条`。
3. 涉及个人具体情况（「我的综测为什么扣分」「我的申请为什么没通过」）、投诉、需要老师审批的事 → 先说明一般流程，再输出 `[[ESCALATE:需人工核实]]`。
4. 学生表达明显情绪困扰或安全风险 → 先关心，给出辅导员 / 心理中心联系方式（示例占位），输出 `[[ESCALATE:疑似紧急]]`；工单在管理端标红置顶。
5. 语气简洁友好，像学长学姐；能分点就分点；正文不超过 250 字。

前端处理：检测到 `[[ESCALATE:原因]]` → 从显示文本中去掉标记 → 自动创建 Ticket → 写 QaLog（resolvedByAI=false）。学生点「转人工」按钮 → 原因记为「学生申请人工」。

---

## 9. 每一步的提交规范（必须遵守）

1. `npm run build` 通过（TypeScript 无报错）才能提交。
2. 更新 `docs/PROGRESS.md`：本步做了什么、没做什么、已知问题、怎么运行和验证。
3. 提交信息 `stepN: 简述`；推送 `main` 分支并打 tag：`git tag stepN && git push origin main --tags`。
4. 推送后在对话里回复：仓库地址、本步 commit hash、需要人工注意的问题。然后**停下等待审核**。
5. 不要提交 `node_modules`、`dist`、`.env.local` 和任何 API Key（`.gitignore` 第 1 步就配好）。
6. 收到审核意见后，修复提交信息用 `stepN-fix: 简述`，同样 build 通过、更新 PROGRESS.md、推送。

**范围之外，不要做**：真实登录 / 权限、后端服务、数据库、向量检索、对接 QQ / 微信（只写进 README 路线图）、移动 App。

---

## 10. 分步任务

### 第 1 步：脚手架 + 布局 + 数据层 + 示例数据

做：
- 建 Vite + React + TS 项目，装第 2 节依赖；`vite.config.ts` 设 `base: './'`；配好 `.gitignore`。
- HashRouter 路由：`/login`、`/student/chat|notices|tickets`、`/admin/dashboard|knowledge|notices|tickets|settings`；默认跳 `/login`；未选身份访问内页时跳回登录页。
- Login 页：两张大卡片「我是学生」「我是老师 / 学生干部」，选中后再选具体 mock 身份。
- StudentLayout（手机版式 + 底部 Tab）、AdminLayout（侧边菜单 + 顶栏），各页面先放标题占位。
- store：zustand + persist（key 前缀 `txzs_`）；监听 `storage` 事件，其他窗口改数据后本窗口自动 rehydrate；提供 `resetDemoData()`。
- seed.ts：按第 7 节写全示例数据（示例制度要写得像真的制度条文，条款编号清楚）。
- 设置页先实现「重置全部演示数据」。

验收：
- `npm install && npm run dev` 后，能从登录页分别进入学生端和管理端，菜单 / Tab 能切换。
- 清空 localStorage 刷新后自动写入示例数据；「重置全部演示数据」可用。
- 两个窗口同时打开时，一个窗口改数据另一个自动更新（在 PROGRESS.md 写明验证方法）。

### 第 2 步：学生端

做：
- `lib/retrieval.ts`：KbDoc 按「第X条」或空行切段；中文用二元组（bigram）+ 关键词重合度打分，标题和分类命中加权；返回 Top K（docId、title、snippet、score）。
- `lib/answerEngine.ts` 统一接口（第 5 步要在这里加 Hermes 模式）。本步实现**离线模式**：Top1 分数过阈值 → 用片段组织回答 +「依据」；否则走第 8 节规则 1；命中「我的…为什么」「扣分」「投诉」等 → 规则 3；命中情绪 / 安全风险词 → 规则 4。8 个推荐问题必须全部命中且回答通顺。
- Chat 页：按第 6 节实现，回答有逐字出现效果。
- Notices、MyTickets 页按第 6 节实现；底部 Tab 角标。

验收：
- 点推荐问题能得到带出处的回答；问「食堂几点开门」这类资料外问题 → 出现转人工卡片，store 里生成一条待处理工单。
- 通知只显示可见对象匹配的；点开后未读数减少。
- 375px 宽度下无横向滚动。

### 第 3 步：管理端

做：
- 工作台、知识库、通知发布、咨询汇总、设置 5 个页面按第 6 节实现。
- 上传 .docx 用 mammoth 提取纯文本；上传后学生端立即能检索到。

验收（审核时会按这个顺序点一遍，两个窗口并排）：
- 管理端发布通知 → 学生端不刷新就出现并有角标；学生阅读后管理端已读数 +1。
- 学生端问资料外问题 → 管理端咨询汇总出现、工作台待处理 +1 → 回复 → 学生端「我的咨询」显示回复和角标 → 点「沉淀到知识库」→ 学生再问同一问题能直接答上。
- 上传一个 .docx 或 .md 后，学生端能问出其中内容。

### 第 4 步：Hermes 侧（智能体 + Agent Skill）

做：
- `hermes/skills/tuanxue-assistant/SKILL.md`：遵循 Hermes 的 SKILL.md 格式（frontmatter 含 `name`、`description`、`version`、`metadata.hermes.tags`；正文含 When to Use / Procedure / Pitfalls / Verification）。内容 = 第 8 节回答规则 + 五个分类说明 + 转人工标记约定 + 2–3 个回答示例。`description` 要写清「回答学院团学事务（综测、奖助、团务转接、活动报名）问题时使用」，让 Hermes 能自动加载。
- `references/`：第 7 节的示例制度和 FAQ（与 seed.ts 内容一致，可以写个小脚本从 seed 导出）。
- `hermes/SOUL.md`：tuanxue profile 的人设（「你是 ××学院团学事务助手……回答团学问题前先加载 tuanxue-assistant 技能」）。
- `hermes/setup.sh`，做这些事（**具体命令先查 Hermes 官方文档 user-guide/profiles.md、features/skills.md、features/api-server.md 核对后再写**）：
  - 创建独立 profile：`hermes profile create tuanxue --no-skills`（不要动我自己正在用的默认 profile）；
  - 把 skill 复制进 tuanxue profile 的 skills 目录，把 SOUL.md 放进 profile 目录；
  - 开启 API Server：`API_SERVER_ENABLED=true`、`API_SERVER_PORT=8650`（避开默认 8642）、`API_SERVER_KEY` 随机生成；
  - 把 API Server 平台的工具集限制为只有 skills：`platform_toolsets.api_server` 设为 `["skills"]`，避免学生端能调用终端 / 文件工具。
- `hermes/README.md`：运行 setup、用 `tuanxue setup` 配置大模型 Key、`tuanxue gateway` 启动、curl 验证。
- 真跑一遍：`/health`、带 Key 的 `/v1/models`、问一个综测问题、问一个资料外问题，把 curl 输出贴进 PROGRESS.md（Key 打码）。如果卡在配置大模型 Key 这一步，停下来告诉我需要我提供什么。

验收：
- 问「志愿服务时长在综测里怎么加分」→ 回答带「依据」；问「图书馆几点关门」→ 回答末尾有 `[[ESCALATE:AI无法解答]]`。
- 仓库里没有任何真实 Key。

### 第 5 步：前端接入 Hermes

做：
- `.env.example`：`HERMES_API_BASE=http://127.0.0.1:8650`、`HERMES_API_KEY=`、`HERMES_MODEL=tuanxue`（以 `/v1/models` 返回的 id 为准）。真实值放 `.env.local`。
- `vite.config.ts`：用 `loadEnv` 读取（**不要用 `VITE_` 前缀**，避免 Key 打进前端包）；`server.proxy['/hermes']` 指向 `HERMES_API_BASE`，rewrite 去掉 `/hermes` 前缀，代理时加 `Authorization: Bearer ${HERMES_API_KEY}`。
- `lib/hermesClient.ts`：fetch POST `/hermes/v1/chat/completions`，`stream: true`；手写 SSE 解析：普通 `data:` 帧取 `choices[0].delta.content` 追加；**`event: hermes.tool.progress` 帧不要拼进正文**，只在界面显示「正在查阅制度资料…」（可用 ThoughtChain 或一行小字）；`data: [DONE]` 结束；支持 AbortController（停止生成）；60 秒超时。
- answerEngine 的 Hermes 模式：system 消息 = 第 8 节规则 +「请遵循 tuanxue-assistant 技能」+ 制度资料（知识库总字数 ≤ 12000 时全部附上，否则附检索 Top 6 片段，每段带《标题》）；带最近 6 条对话；流式渲染；结束后解析 `[[ESCALATE:原因]]`；「参考资料」用本地检索结果展示。
- 降级：Hermes 请求失败或超时 → 自动改用离线模式作答，气泡下小字提示「已切换离线模式」，演示不中断、不白屏。
- 设置页：模式切换；「测试连接」调 `/hermes/v1/models`，显示成功或失败原因。

验收：
- Hermes 没启动时，Hermes 模式提问自动降级，无报错白屏。
- Hermes 启动时，回答流式出现并带「依据」；资料外问题自动生成工单。
- `npm run build` 后在 `dist/` 里搜不到 API Key。

### 第 6 步：加分项 + 收尾

做：
- 通知发布页加「从聊天记录生成通知」：内置一段示例群聊（老师、主席、干事、外院同学四方，含 2 处修改意见、1 个截止时间，有「填入示例」按钮）→ 粘贴后调用 Hermes，要求返回 JSON（`title`、`summary`、`todos[{who, what, deadline}]`、`changes[]`）→ 预览填入表单 → 一键发布给「学生会干部」。离线模式下对内置示例返回预置结果。
- 视觉打磨：登录页、工作台、空状态、加载态；1366×768 下检查一遍。
- `docs/DEMO_SCRIPT.md`：按第 0 节演示主线写 5 分钟演示脚本（每步点哪里、说什么、出问题时的备用方案）。
- `README.md`：项目介绍、3–5 张截图（`docs/screenshots/`）、本地运行、接 Hermes、路线图（通过 Hermes 的 QQ Bot / 微信网关让学生在 QQ 群直接提问；对接学校统一身份认证；知识库换成向量检索；推广到其他学院）。
- GitHub Actions 部署到 GitHub Pages（离线演示模式）作为备用演示链接。

验收：
- 按 DEMO_SCRIPT 完整走一遍无卡点。
- GitHub Pages 链接能打开，离线模式下能演示主线 1–5。
