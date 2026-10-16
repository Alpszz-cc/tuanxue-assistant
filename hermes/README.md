# Hermes 团学专用 profile

本次仅交付文件，未执行 setup、创建 profile、写真实 Key 或启动网关。沙箱内三个帮助命令均失败：Hermes 包装入口指向的虚拟环境程序不存在，退出码 127。脚本中标出了待核对的命令参数；请在真实 Hermes 机器上审核后运行。

## 1. 核对本机命令

```sh
hermes --help
hermes profile create --help
hermes config set --help
```

确认支持 `--clone`、`-p tuanxue`、`skills opt-out`，以及 `config set` 对 API_SERVER_* 和 JSON 工具集列表的处理。要求最终 `platform_toolsets.api_server` 为列表 `["skills"]`，且 API 服务只监听 `127.0.0.1:8650`。

## 2. 生成并核对参考资料

在仓库根目录安装前端依赖，然后执行：

```sh
npm ci
node scripts/export-references.mjs
node scripts/export-references.mjs --check
```

脚本加载 `src/data/seed.ts`，逐字导出五份文档正文；`--check` 只比较，不写文件。文档均为虚构示例。

## 3. 审核后手动安装

```sh
bash hermes/setup.sh
```

脚本创建独立 `tuanxue` profile；已存在则跳过创建。创建使用顶层 `hermes profile create tuanxue --clone`，后续命令均为 `hermes -p tuanxue ...`。复用克隆得到的模型配置与供应商 Key，无需重新配置模型。

脚本只删除专用 profile 的 `memories/MEMORY.md`、`memories/USER.md`，把首次克隆的技能移至 `skills.cloned-bak`，关闭自动灌入技能，再安装本技能和 SOUL.md。重复执行不会覆盖原备份，但会重新生成 API Server Key 并重写仓库 `.env.local`；旧网关需要重启以使新 Key 生效。它不删除整个 profile，也不触碰默认 profile。

`.env.local` 包含同一个 API Server Key，权限为 600，已被 Git 忽略。不要提交该文件或打印其中的 Key。此 Key 是网页代理访问 API Server 用的凭据，不是模型供应商 Key。

## 4. 手动启动和验证

setup 只打印下列命令，不启动网关或发送请求：

```sh
nohup hermes -p tuanxue gateway run > "$HOME/tuanxue-gateway.log" 2>&1 &
curl -fsS http://127.0.0.1:8650/health
set -a; . ./.env.local; set +a
curl -fsS -H "Authorization: Bearer ${HERMES_API_KEY}" http://127.0.0.1:8650/v1/models
```

核对 `/v1/models` 返回的实际模型 id；如与 `tuanxue` 不同，更新 `.env.local` 的 `HERMES_MODEL`。查看日志时先检查是否含凭据再对外分享。

之后手动验证 chat completions：

```sh
curl -fsS http://127.0.0.1:8650/v1/chat/completions \
  -H "Authorization: Bearer ${HERMES_API_KEY}" \
  -H 'Content-Type: application/json' \
  -d "{\"model\":\"${HERMES_MODEL}\",\"messages\":[{\"role\":\"user\",\"content\":\"请先加载 tuanxue-assistant 技能：志愿服务在综测里怎么加分？\"}]}"
```

预期引用综测细则第二条。将提问换为“图书馆几点关门”，预期末尾有 `[[ESCALATE:AI无法解答]]`。若服务、工具集或模型 id 的格式与当前版本不一致，先修正对应配置后再继续；本交付没有声称这些运行验收已通过。

前端代理、流式请求和 Hermes 降级属于第 5 步，当前网页仍使用离线模式。

setup.sh 必须在真实的 SSH 终端里运行，不能在 Codex 沙箱里运行。可用 `HERMES_BIN=/绝对路径/hermes bash hermes/setup.sh` 指定入口。
