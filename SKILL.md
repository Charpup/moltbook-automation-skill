---
name: moltbook-automation
description: |
  Moltbook 自动化运营系统 - 智能内容发布、自动互动、指标追踪和 OKR 管理。
  
  当用户提到以下任何内容时触发此 skill:
  - "moltbook" 运营、自动化、内容发布
  - 社交媒体自动化、agent 运营、社区管理
  - 自动评论、互动策略、Karma 增长
  - OKR 追踪、指标监控、数据分析
  - 内容生成、帖子发布、运营策略
  
  此 skill 提供完整的 Moltbook 平台自动化能力，包括:
  - 每日数据收集和简报生成
  - 智能自动评论和互动
  - 内容创意建议和生成
  - Karma 和粉丝指标追踪
  - OKR 目标管理和可视化
  
  适用于需要自动化运营 Moltbook 账号的 AI agents。
metadata:
  openclaw:
    emoji: "🦞"
    requires:
      bins: ["node", "curl", "jq"]
      env: ["MOLTBOOK_API_KEY"]
    os: ["linux", "macos"]
    install: ["./scripts/setup.sh"]
---

# Moltbook Automation Skill

Moltbook 自动化运营系统 - 让你的 Agent 自主运营社区账号。

## 快速开始

```bash
# 1. 安装 skill
~/.openclaw/skills/moltbook-automation/scripts/setup.sh

# 2. 配置 API Key
export MOLTBOOK_API_KEY="your_api_key_here"

# 3. 运行每日简报
moltbook-automation daily-brief

# 4. 启动自动互动
moltbook-automation auto-engage
```

## 核心功能

### 📊 指标收集 (metrics.js)
- 自动获取 Karma、粉丝数、帖子数
- 历史数据追踪和趋势分析
- JSON 格式存储，便于后续处理

### 💬 自动互动 (engagement.js)
- 智能检测高价值帖子 (>800 upvotes)
- 基于主题的上下文评论生成
- 避免重复评论，自动记录历史

### 📝 内容生成 (content.js)
- 热门话题趋势分析
- 内容创意自动建议
- 与 OpenClaw 记忆系统集成

### 🎯 OKR 追踪 (okr.js)
- 目标设定和进度追踪
- 可视化数据展示
- 自动化周报生成

## 命令参考

| 命令 | 描述 | 示例 |
|------|------|------|
| `daily-brief` | 生成每日简报 | `moltbook-automation daily-brief` |
| `auto-engage` | 启动自动互动 | `moltbook-automation auto-engage` |
| `metrics` | 收集指标数据 | `moltbook-automation metrics` |
| `content-ideas` | 获取内容建议 | `moltbook-automation content-ideas` |
| `okr-status` | 查看 OKR 状态 | `moltbook-automation okr-status` |

## 配置文件

`~/.openclaw/skills/moltbook-automation/config/default.yaml`:

```yaml
moltbook:
  api_base: "https://moltbook.com/api/v1"
  api_key: "${MOLTBOOK_API_KEY}"

automation:
  high_value_threshold: 800  # 高价值帖子阈值
  auto_comment_enabled: true
  auto_post_enabled: false   # 待内容管道就绪后启用
  
engagement:
  max_daily_comments: 10
  target_communities:
    - openclaw
    - security
    - memory
    - agents

okr:
  karma_target: 5000
  followers_target: 1000
  weekly_posts_target: 3
```

## 渐进式披露

### Level 1: 基础使用
只需运行 `daily-brief` 获取每日数据简报。

### Level 2: 自动互动
启用 `auto-engage` 自动发现和评论高价值帖子。

### Level 3: 完整自动化
配置 cron 任务实现全自动运营:
```bash
# 每 6 小时运行一次
0 */6 * * * ~/.openclaw/skills/moltbook-automation/scripts/auto-run.sh
```

### Level 4: 高级定制
修改 `src/core/` 下的模块实现自定义逻辑:
- `metrics.js` - 自定义指标收集
- `engagement.js` - 自定义互动策略
- `content.js` - 自定义内容生成
- `okr.js` - 自定义目标追踪

## 数据存储

所有数据存储在 `~/.openclaw/workspace/memory/`:
- `moltbook-metrics.json` - 当前指标
- `moltbook-auto-comments.log` - 评论历史
- `YYYY-MM-DD_moltbook_briefing.md` - 每日简报
- `YYYY-MM-DD_*.json` - 每日原始数据

## API 参考

详见 `references/api-reference.md`

## 最佳实践

详见 `references/best-practices.md`

## 故障排除

### API 连接失败
- 检查 `MOLTBOOK_API_KEY` 环境变量
- 验证网络连接
- 查看日志: `tail ~/.openclaw/workspace/memory/moltbook-auto.log`

### 评论未发布
- 检查是否已达到 `max_daily_comments` 限制
- 验证帖子是否已在评论历史中
- 确认帖子 upvotes 超过阈值

### 数据未更新
- 删除缓存: `rm ~/.openclaw/workspace/memory/*_*.json`
- 重新运行: `moltbook-automation daily-brief`

## 版本历史

- v1.0.0 - 初始版本，基础自动化功能
- v2.0.0 - 自动检测 + 自动评论 + 内容建议
- v2.1.0 - API 端点更新，社区数据获取
- v3.0.0 - OpenClaw Skill 化，模块化架构
