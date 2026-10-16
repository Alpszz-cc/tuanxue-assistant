#!/usr/bin/env bash
set -euo pipefail

# 仅编写并作 bash -n 静态检查，尚未在真实 Hermes 环境执行。
# 已尝试 hermes --help / hermes profile create --help / hermes config set --help；
# 本沙箱 /usr/local/bin/hermes 指向的虚拟环境入口缺失，三项均退出 127。
# --clone、skills opt-out、config set 对环境键和 JSON 列表的支持均待用户在本机核对。
# 按本次要求使用 --clone（取代原 PLAN 的 --no-skills），模型与供应商 Key 从当前配置复用。
# profile create 是创建前的顶层操作；创建后的所有 Hermes 操作都显式指定 -p tuanxue。

repo_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
profile_dir="${HOME}/.hermes/profiles/tuanxue"
HERMES_BIN="${HERMES_BIN:-hermes}"
if ! "$HERMES_BIN" --version; then
  printf '%s\n' 'Hermes 入口不可用；请在真实 SSH 终端设置 HERMES_BIN 后重试。' >&2
  exit 1
fi
python3 - <<'PORT'
import socket
with socket.socket() as listener:
    try:
        listener.bind(('127.0.0.1', 8650))
    except OSError:
        raise SystemExit('8650 端口已被占用，请先释放端口。')
PORT
command -v python3 >/dev/null
umask 077

if [[ ! -d "$profile_dir" ]]; then
  "$HERMES_BIN" profile create tuanxue --clone
fi
[[ -d "$profile_dir" ]] || { printf '%s\n' 'Profile 未创建成功，请核对本机 Hermes 命令。' >&2; exit 1; }

# 只清理专用 profile 内指定的克隆个人记忆，不触碰默认 profile。
python3 - "$profile_dir" <<'PY'
from pathlib import Path
import sys
profile = Path(sys.argv[1])
for name in ('MEMORY.md', 'USER.md'):
    (profile / 'memories' / name).unlink(missing_ok=True)
PY

# 首次运行备份克隆技能；重复运行保留同一备份，不把已部署技能再次套入备份。
if [[ ! -e "$profile_dir/skills.cloned-bak" ]]; then
  if [[ -d "$profile_dir/skills" ]]; then
    mv -- "$profile_dir/skills" "$profile_dir/skills.cloned-bak"
  else
    mkdir -p -- "$profile_dir/skills.cloned-bak"
  fi
fi
mkdir -p -- "$profile_dir/skills/tuanxue-assistant"
"$HERMES_BIN" -p tuanxue skills opt-out
cp -R -- "$repo_root/hermes/skills/tuanxue-assistant/." "$profile_dir/skills/tuanxue-assistant/"
cp -- "$repo_root/hermes/SOUL.md" "$profile_dir/SOUL.md"

api_key="$(python3 -c 'import secrets;print(secrets.token_hex(16))')"
"$HERMES_BIN" -p tuanxue config set API_SERVER_ENABLED true
"$HERMES_BIN" -p tuanxue config set API_SERVER_HOST 127.0.0.1
"$HERMES_BIN" -p tuanxue config set API_SERVER_PORT 8650
"$HERMES_BIN" -p tuanxue config set API_SERVER_KEY "$api_key"
# JSON 列表解析需核对本机版本；启动前请确认最终值是列表而非字符串。
"$HERMES_BIN" -p tuanxue config set platform_toolsets.api_server '["skills"]'

# 每次成功运行会轮换 API Server Key，同时重写专用于本 Demo 的 .env.local。
# 不输出密钥。供应商模型 Key 由 clone 继承，与这里生成的 API Server Key 不同。
cat > "$repo_root/.env.local" <<ENV
HERMES_API_BASE=http://127.0.0.1:8650
HERMES_API_KEY=${api_key}
HERMES_MODEL=tuanxue
ENV
chmod 600 "$repo_root/.env.local"
unset api_key

printf '%s\n' '文件和配置已写入。下一步由你手动启动；以下命令没有被脚本执行：'
printf 'cd %q\n' "$repo_root"
cat <<'NEXT'
nohup hermes -p tuanxue gateway run > "$HOME/tuanxue-gateway.log" 2>&1 &
curl -fsS http://127.0.0.1:8650/health
set -a; . ./.env.local; set +a
curl -fsS -H "Authorization: Bearer ${HERMES_API_KEY}" http://127.0.0.1:8650/v1/models
# 如 models 返回 id 不是 tuanxue，请相应更新 .env.local 的 HERMES_MODEL。
NEXT
