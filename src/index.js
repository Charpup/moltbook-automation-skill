#!/usr/bin/env node
/**
 * Moltbook Automation Skill - Main Entry Point
 * CLI interface for all automation functions
 */

const fs = require('fs');
const path = require('path');

// Load core modules
const MetricsCollector = require('./core/metrics');
const EngagementManager = require('./core/engagement');
const ContentGenerator = require('./core/content');
const OKRTracker = require('./core/okr');

// Load utils
const Logger = require('./utils/logger');
const Config = require('./utils/config');

class MoltbookAutomation {
  constructor() {
    this.config = new Config();
    this.logger = new Logger();
    
    // Initialize modules
    this.metrics = new MetricsCollector(this.config.get('moltbook'));
    this.engagement = new EngagementManager(this.config.get('engagement'));
    this.content = new ContentGenerator(this.config.get('content'));
    this.okr = new OKRTracker(this.config.get('okr'));
  }

  /**
   * Show version
   */
  version() {
    const pkg = require('../package.json');
    console.log(`Moltbook Automation v${pkg.version}`);
    return pkg.version;
  }

  /**
   * Show help
   */
  help() {
    console.log(`
🦞 Moltbook Automation Skill

Usage: moltbook-automation <command> [options]

Commands:
  daily-brief       Generate daily briefing
  auto-engage       Run auto-engagement session
  metrics           Collect and display metrics
  content-ideas     Generate content suggestions
  okr-status        Show OKR status
  okr-report        Generate weekly OKR report
  version           Show version
  help              Show this help

Options:
  --dry-run         Run without making actual changes
  --config <path>   Use custom config file

Examples:
  moltbook-automation daily-brief
  moltbook-automation auto-engage --dry-run
  moltbook-automation metrics
`);
  }

  /**
   * Generate daily briefing
   */
  async dailyBrief() {
    console.log('🌊 Moltbook Daily Brief - Starting...\n');
    
    try {
      // Collect metrics
      const metrics = await this.metrics.collect();
      this.metrics.save(metrics);
      
      // Update OKR
      this.okr.updateProgress(metrics);
      
      // Get content ideas
      const ideas = await this.content.getIdeas();
      
      // Generate briefing file
      const briefing = this.generateBriefing(metrics, ideas);
      
      // Save briefing
      const today = new Date().toISOString().split('T')[0];
      const memoryDir = path.join(process.env.HOME, '.openclaw/workspace/memory');
      const briefingFile = path.join(memoryDir, `${today}_moltbook_briefing.md`);
      
      fs.writeFileSync(briefingFile, briefing);
      
      console.log(briefing);
      console.log(`\n✅ Briefing saved to: ${briefingFile}`);
      
      return briefing;
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate briefing markdown
   */
  generateBriefing(metrics, ideas) {
    const today = new Date().toISOString().split('T')[0];
    
    let briefing = `# Moltbook Daily Briefing — ${today}

**Strategy**: v3.0 Skill-Based Automation  
**Agent**: Charpup_V2  
**Status**: ✅ Active

---

## 📊 Account Status

| Metric | Value |
|--------|-------|
| **Karma** | ${metrics.karma} |
| **Followers** | ${metrics.followers} |
| **Posts** | ${metrics.posts} |
| **Comments** | ${metrics.comments} |
| **Last Active** | ${metrics.lastActive || 'unknown'} |

---

## 📈 Current Trends

`;
    
    if (ideas.trends && ideas.trends.length > 0) {
      for (const trend of ideas.trends) {
        briefing += `- **${trend.topic}**: ${trend.count} posts\n`;
      }
    } else {
      briefing += '- No significant trends detected\n';
    }
    
    briefing += `
---

## 💡 Content Suggestions

`;
    
    if (ideas.suggestions && ideas.suggestions.length > 0) {
      for (let i = 0; i < ideas.suggestions.length; i++) {
        const s = ideas.suggestions[i];
        briefing += `${i + 1}. **[${s.type.toUpperCase()}]** ${s.title}\n`;
        briefing += `   ${s.description}\n\n`;
      }
    }
    
    briefing += `
---

## 🎯 Today's Actions

- [ ] Review hot posts for engagement opportunities
- [ ] Consider creating content on trending topics
- [ ] Monitor karma growth vs targets

---

*Generated: ${new Date().toISOString()}*  
*Moltbook Automation Skill v3.0*
`;
    
    return briefing;
  }

  /**
   * Run auto-engagement
   */
  async autoEngage(options = {}) {
    if (options.dryRun) {
      console.log('🔍 DRY RUN MODE - No actual changes will be made\n');
      this.engagement.autoCommentEnabled = false;
    }
    
    const result = await this.engagement.engage();
    
    // Update OKR with comment count
    if (result.count > 0) {
      this.okr.recordActivity('comment', result.count);
    }
    
    return result;
  }

  /**
   * Collect and show metrics
   */
  async collectMetrics() {
    const metrics = await this.metrics.collect();
    this.metrics.save(metrics);
    this.okr.updateProgress(metrics);
    
    console.log(this.metrics.getStatus());
    return metrics;
  }

  /**
   * Get content ideas
   */
  async getContentIdeas() {
    const ideas = await this.content.getIdeas();
    console.log(this.content.formatIdeas(ideas));
    return ideas;
  }

  /**
   * Show OKR status
   */
  async showOKRStatus() {
    const metricsData = this.metrics.load();
    if (!metricsData || !metricsData.current) {
      console.log('No metrics data available. Run: moltbook-automation metrics');
      return;
    }
    
    console.log(this.okr.getStatus(metricsData.current));
  }

  /**
   * Generate OKR report
   */
  async generateOKRReport() {
    const report = this.okr.generateWeeklyReport();
    console.log(report);
    
    // Save report
    const today = new Date().toISOString().split('T')[0];
    const memoryDir = path.join(process.env.HOME, '.openclaw/workspace/memory');
    const reportFile = path.join(memoryDir, `${today}_okr_report.md`);
    
    fs.writeFileSync(reportFile, report);
    console.log(`\n✅ Report saved to: ${reportFile}`);
    
    return report;
  }
}

// CLI handling
async function main() {
  const automation = new MoltbookAutomation();
  
  const args = process.argv.slice(2);
  const command = args[0];
  const options = {
    dryRun: args.includes('--dry-run'),
    configPath: args.includes('--config') ? args[args.indexOf('--config') + 1] : null
  };
  
  try {
    switch (command) {
      case 'daily-brief':
        await automation.dailyBrief();
        break;
      case 'auto-engage':
        await automation.autoEngage(options);
        break;
      case 'metrics':
        await automation.collectMetrics();
        break;
      case 'content-ideas':
        await automation.getContentIdeas();
        break;
      case 'okr-status':
        await automation.showOKRStatus();
        break;
      case 'okr-report':
        await automation.generateOKRReport();
        break;
      case 'version':
      case '--version':
      case '-v':
        automation.version();
        break;
      case 'help':
      case '--help':
      case '-h':
      default:
        automation.help();
        break;
    }
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = MoltbookAutomation;
