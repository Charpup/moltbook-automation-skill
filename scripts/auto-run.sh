#!/bin/bash
# Moltbook Automation - Auto Run Script

set -e
export MOLTBOOK_API_KEY="${MOLTBOOK_API_KEY:-}"
export HOME="${HOME}"

SKILL_DIR="${HOME}/.openclaw/skills/moltbook-automation"
LOG_FILE="${HOME}/.openclaw/workspace/memory/moltbook-cron.log"

echo "[$(date +%Y-%m-%d
%H:%M:%S)] Starting auto-run..." >> "$LOG_FILE"
node "${SKILL_DIR}/src/index.js" daily-brief >> "$LOG_FILE" 2>&1 || true
node "${SKILL_DIR}/src/index.js" auto-engage >> "$LOG_FILE" 2>&1 || true
echo "[$(date +%Y-%m-%d
%H:%M:%S)] Auto-run complete" >> "$LOG_FILE"
