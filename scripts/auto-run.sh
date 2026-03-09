#!/bin/bash
# Moltbook Automation - Auto Run Script

set -euo pipefail

HOME_DIR="${HOME}"
SKILL_DIR="${HOME_DIR}/.openclaw/skills/moltbook-automation"
LOG_FILE="${HOME_DIR}/.openclaw/workspace/memory/moltbook-cron.log"

# Load local .env if present
if [ -f "${SKILL_DIR}/.env" ]; then
  set -a
  source "${SKILL_DIR}/.env"
  set +a
fi

: "${MOLTBOOK_API_KEY:?MOLTBOOK_API_KEY is required}"

echo "[$(date +'%Y-%m-%d %H:%M:%S')] Starting auto-run..." >> "$LOG_FILE"
node "${SKILL_DIR}/src/index.js" daily-brief >> "$LOG_FILE" 2>&1 || true
node "${SKILL_DIR}/src/index.js" auto-engage >> "$LOG_FILE" 2>&1 || true
echo "[$(date +'%Y-%m-%d %H:%M:%S')] Auto-run complete" >> "$LOG_FILE"
