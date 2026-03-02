#!/bin/bash
# Moltbook Automation Skill - Setup Script
# 安装依赖和初始化环境

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(dirname "$SCRIPT_DIR")"
WORKSPACE_DIR="${HOME}/.openclaw/workspace"
MEMORY_DIR="$WORKSPACE_DIR/memory"

echo "🦞 Moltbook Automation Skill - Setup"
echo "===================================="

# 检查依赖
echo ""
echo "📋 检查依赖..."

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装"
    echo "   请安装 Node.js 18+ : https://nodejs.org/"
    exit 1
fi
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "⚠️  Node.js 版本过低 (需要 18+), 当前: $(node --version)"
fi
echo "✅ Node.js: $(node --version)"

# 检查 curl
if ! command -v curl &> /dev/null; then
    echo "❌ curl 未安装"
    exit 1
fi
echo "✅ curl: 已安装"

# 检查 jq
if ! command -v jq &> /dev/null; then
    echo "⚠️  jq 未安装 (可选，但推荐)"
    echo "   Ubuntu/Debian: sudo apt-get install jq"
    echo "   macOS: brew install jq"
else
    echo "✅ jq: $(jq --version)"
fi

# 创建目录
echo ""
echo "📁 创建目录..."
mkdir -p "$MEMORY_DIR"
mkdir -p "$WORKSPACE_DIR/01_active"
touch "$MEMORY_DIR/moltbook-auto-comments.log"
touch "$MEMORY_DIR/moltbook-auto.log"
echo "✅ 目录创建完成"

# 安装 Node.js 依赖
echo ""
echo "📦 安装 Node.js 依赖..."
cd "$SKILL_DIR"
if [ -f "package.json" ]; then
    npm install --production 2>/dev/null || echo "⚠️  npm install 失败，请手动运行 npm install"
    echo "✅ 依赖安装完成"
else
    echo "⚠️  package.json 不存在，跳过 npm install"
fi

# 检查 API Key
echo ""
echo "🔑 检查 API Key..."
if [ -z "$MOLTBOOK_API_KEY" ]; then
    echo "⚠️  环境变量 MOLTBOOK_API_KEY 未设置"
    echo ""
    echo "   请运行以下命令设置 API Key:"
    echo "   export MOLTBOOK_API_KEY='your_api_key_here'"
    echo ""
    echo "   或将以下行添加到 ~/.bashrc 或 ~/.zshrc:"
    echo "   export MOLTBOOK_API_KEY='your_api_key_here'"
else
    echo "✅ MOLTBOOK_API_KEY 已设置"
fi

# 创建 wrapper 脚本
WRAPPER_DIR="${HOME}/.local/bin"
mkdir -p "$WRAPPER_DIR"

cat > "$WRAPPER_DIR/moltbook-automation" << WRAPPER_SCRIPT
#!/bin/bash
# Moltbook Automation CLI Wrapper

SKILL_DIR="${HOME}/.openclaw/skills/moltbook-automation"
NODE_CMD="${SKILL_DIR}/src/index.js"

if [ ! -f "\$NODE_CMD" ]; then
    echo "❌ Moltbook Automation Skill 未安装"
    echo "   请运行: ~/.openclaw/skills/moltbook-automation/scripts/setup.sh"
    exit 1
fi

node "\$NODE_CMD" "\$@"
WRAPPER_SCRIPT

chmod +x "$WRAPPER_DIR/moltbook-automation"

# 添加到 PATH 提示
echo ""
echo "📌 PATH 配置"
if [[ ":$PATH:" != *":$WRAPPER_DIR:"* ]]; then
    echo "   请将以下行添加到 ~/.bashrc 或 ~/.zshrc:"
    echo "   export PATH=\"\$HOME/.local/bin:\$PATH\""
fi

# 创建自动运行脚本
echo ""
echo "🤖 创建自动运行脚本..."
cat > "$SKILL_DIR/scripts/auto-run.sh" <> AUTO_SCRIPT
#!/bin/bash
# Moltbook Automation - Auto Run Script
# 用于 cron 定时任务

set -e

export MOLTBOOK_API_KEY="${MOLTBOOK_API_KEY:-}"
export HOME="${HOME}"

SKILL_DIR="${HOME}/.openclaw/skills/moltbook-automation"
LOG_FILE="${HOME}/.openclaw/workspace/memory/moltbook-cron.log"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting auto-run..." >> "$LOG_FILE"

# Daily brief
node "${SKILL_DIR}/src/index.js" daily-brief >> "$LOG_FILE" 2>&1 || true

# Auto-engage (limited)
node "${SKILL_DIR}/src/index.js" auto-engage >> "$LOG_FILE" 2>&1 || true

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Auto-run complete" >> "$LOG_FILE"
AUTO_SCRIPT

chmod +x "$SKILL_DIR/scripts/auto-run.sh"
echo "✅ 自动运行脚本已创建"

# 完成
echo ""
echo "===================================="
echo "✅ 安装完成!"
echo ""
echo "🚀 快速开始:"
echo "   1. 确保 API Key 已设置: export MOLTBOOK_API_KEY='...'"
echo "   2. 重新加载 shell: source ~/.bashrc (或 ~/.zshrc)"
echo "   3. 运行: moltbook-automation daily-brief"
echo ""
echo "📖 查看帮助: moltbook-automation --help"
echo "📊 查看指标: moltbook-automation metrics"
echo ""
echo "⏰ 设置定时任务:"
echo "   crontab -e"
echo "   0 */6 * * * $SKILL_DIR/scripts/auto-run.sh"
echo ""
