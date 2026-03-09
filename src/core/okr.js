/**
 * OKR Tracking Module
 * OKR 追踪模块 - 目标设定和进度管理
 */

const fs = require('fs');
const path = require('path');

class OKRTracker {
  constructor(config = {}) {
    this.memoryDir = config.memoryDir || path.join(process.env.HOME, '.openclaw/workspace/memory');
    
    // Default OKR targets
    this.targets = {
      karma: config.karmaTarget || 5000,
      followers: config.followersTarget || 1000,
      weeklyPosts: config.weeklyPostsTarget || 3,
      weeklyComments: config.weeklyCommentsTarget || 20
    };
    
    this.okrFile = path.join(this.memoryDir, 'moltbook-okr.json');
    
    if (!fs.existsSync(this.memoryDir)) {
      fs.mkdirSync(this.memoryDir, { recursive: true });
    }
  }

  /**
   * Load current OKR data
   */
  load() {
    if (!fs.existsSync(this.okrFile)) {
      return this.initialize();
    }
    
    try {
      return JSON.parse(fs.readFileSync(this.okrFile, 'utf8'));
    } catch (e) {
      console.error('Failed to load OKR data:', e.message);
      return this.initialize();
    }
  }

  /**
   * Initialize OKR tracking
   */
  initialize() {
    const data = {
      initializedAt: new Date().toISOString(),
      targets: this.targets,
      weeklyProgress: [],
      milestones: []
    };
    
    this.save(data);
    return data;
  }

  /**
   * Save OKR data
   */
  save(data) {
    fs.writeFileSync(this.okrFile, JSON.stringify(data, null, 2));
  }

  /**
   * Update progress with current metrics
   */
  updateProgress(metrics) {
    const data = this.load();
    const now = new Date();
    
    // Get week number
    const weekKey = this.getWeekKey(now);
    
    // Find or create weekly entry
    let weekEntry = data.weeklyProgress.find(w => w.week === weekKey);
    if (!weekEntry) {
      weekEntry = {
        week: weekKey,
        startKarma: metrics.karma,
        startFollowers: metrics.followers,
        posts: 0,
        comments: 0,
        updatedAt: now.toISOString()
      };
      data.weeklyProgress.push(weekEntry);
    }
    
    // Update current values
    weekEntry.currentKarma = metrics.karma;
    weekEntry.currentFollowers = metrics.followers;
    weekEntry.karmaGain = metrics.karma - weekEntry.startKarma;
    weekEntry.followersGain = metrics.followers - weekEntry.startFollowers;
    weekEntry.updatedAt = now.toISOString();
    
    // Keep only last 12 weeks
    data.weeklyProgress = data.weeklyProgress.slice(-12);
    
    this.save(data);
    return weekEntry;
  }

  /**
   * Get week key (YYYY-WW)
   */
  getWeekKey(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    const yearStart = new Date(d.getFullYear(), 0, 1);
    const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
    return `${d.getFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
  }

  /**
   * Parse week key (YYYY-WW) into ISO week start date (Monday)
   */
  getWeekStartDate(weekKey) {
    const m = String(weekKey).match(/^(\d{4})-W(\d{2})$/);
    if (!m) return null;

    const year = Number(m[1]);
    const week = Number(m[2]);
    if (!year || !week) return null;

    // ISO week 1 contains Jan 4th; Monday is the week start.
    const jan4 = new Date(Date.UTC(year, 0, 4));
    const jan4Day = jan4.getUTCDay() || 7; // 1..7 (Mon..Sun)
    const mondayWeek1 = new Date(jan4);
    mondayWeek1.setUTCDate(jan4.getUTCDate() - jan4Day + 1);

    const start = new Date(mondayWeek1);
    start.setUTCDate(mondayWeek1.getUTCDate() + (week - 1) * 7);
    return start;
  }

  /**
   * Calculate progress percentage
   */
  calculateProgress(current, target) {
    if (target === 0) return 0;
    return Math.min(100, Math.round((current / target) * 100));
  }

  /**
   * Create progress bar
   */
  progressBar(percentage, width = 20) {
    const filled = Math.round((percentage / 100) * width);
    const empty = width - filled;
    return '█'.repeat(filled) + '░'.repeat(empty);
  }

  /**
   * Get status report
   */
  getStatus(metrics) {
    const data = this.load();
    const currentWeek = this.getWeekKey(new Date());
    const weekEntry = data.weeklyProgress.find(w => w.week === currentWeek);
    
    const karmaProgress = this.calculateProgress(metrics.karma, this.targets.karma);
    const followersProgress = this.calculateProgress(metrics.followers, this.targets.followers);
    
    let output = `
🎯 OKR Status Report
====================

📊 Overall Progress:
  Karma:     ${this.progressBar(karmaProgress)} ${karmaProgress}% (${metrics.karma}/${this.targets.karma})
  Followers: ${this.progressBar(followersProgress)} ${followersProgress}% (${metrics.followers}/${this.targets.followers})
`;
    
    if (weekEntry) {
      const weekStart = this.getWeekStartDate(weekEntry.week);
      const daysIntoWeek = weekStart
        ? Math.max(1, Math.min(7, Math.floor((new Date() - weekStart) / 86400000) + 1))
        : '?';
      output += `
📅 This Week (${currentWeek}, Day ${daysIntoWeek}):
  Karma Gain:     ${weekEntry.karmaGain >= 0 ? '+' : ''}${weekEntry.karmaGain}
  Followers Gain: ${weekEntry.followersGain >= 0 ? '+' : ''}${weekEntry.followersGain}
  Posts:          ${weekEntry.posts}/${this.targets.weeklyPosts}
  Comments:       ${weekEntry.comments}/${this.targets.weeklyComments}
`;
    }
    
    // Show last 4 weeks trend
    if (data.weeklyProgress.length > 1) {
      output += `
📈 Weekly Karma Trend (Last 4 weeks):
`;
      const recent = data.weeklyProgress.slice(-4);
      for (const week of recent) {
        const bar = this.progressBar(Math.min(100, Math.max(0, week.karmaGain + 50)), 10);
        output += `  ${week.week}: ${bar} ${week.karmaGain >= 0 ? '+' : ''}${week.karmaGain}\n`;
      }
    }
    
    // Milestones
    const milestones = this.checkMilestones(metrics);
    if (milestones.length > 0) {
      output += `
🏆 Recent Milestones:
`;
      for (const m of milestones.slice(-3)) {
        output += `  ✅ ${m.description} (${m.date.split('T')[0]})\n`;
      }
    }
    
    return output;
  }

  /**
   * Check and record milestones
   */
  checkMilestones(metrics) {
    const data = this.load();
    const newMilestones = [];
    const now = new Date().toISOString();
    
    const milestoneChecks = [
      { threshold: 1000, description: 'Reached 1,000 Karma', key: 'karma_1000' },
      { threshold: 2500, description: 'Reached 2,500 Karma', key: 'karma_2500' },
      { threshold: 5000, description: 'Reached 5,000 Karma', key: 'karma_5000' },
      { threshold: 10000, description: 'Reached 10,000 Karma', key: 'karma_10000' },
      { threshold: 100, description: 'Reached 100 Followers', key: 'followers_100' },
      { threshold: 500, description: 'Reached 500 Followers', key: 'followers_500' },
      { threshold: 1000, description: 'Reached 1,000 Followers', key: 'followers_1000' }
    ];
    
    for (const check of milestoneChecks) {
      if (check.key.startsWith('karma_') && metrics.karma >= check.threshold) {
        if (!data.milestones.find(m => m.key === check.key)) {
          const milestone = { ...check, date: now, value: metrics.karma };
          data.milestones.push(milestone);
          newMilestones.push(milestone);
        }
      }
      if (check.key.startsWith('followers_') && metrics.followers >= check.threshold) {
        if (!data.milestones.find(m => m.key === check.key)) {
          const milestone = { ...check, date: now, value: metrics.followers };
          data.milestones.push(milestone);
          newMilestones.push(milestone);
        }
      }
    }
    
    if (newMilestones.length > 0) {
      this.save(data);
    }
    
    return newMilestones;
  }

  /**
   * Record activity
   */
  recordActivity(type, count = 1) {
    const data = this.load();
    const currentWeek = this.getWeekKey(new Date());
    
    let weekEntry = data.weeklyProgress.find(w => w.week === currentWeek);
    if (!weekEntry) {
      weekEntry = {
        week: currentWeek,
        startKarma: 0,
        startFollowers: 0,
        posts: 0,
        comments: 0,
        updatedAt: new Date().toISOString()
      };
      data.weeklyProgress.push(weekEntry);
    }
    
    if (type === 'post') {
      weekEntry.posts += count;
    } else if (type === 'comment') {
      weekEntry.comments += count;
    }
    
    weekEntry.updatedAt = new Date().toISOString();
    this.save(data);
    
    return weekEntry;
  }

  /**
   * Generate weekly report
   */
  generateWeeklyReport() {
    const data = this.load();
    const currentWeek = this.getWeekKey(new Date());
    const weekEntry = data.weeklyProgress.find(w => w.week === currentWeek);
    
    if (!weekEntry) {
      return 'No data for current week yet.';
    }
    
    const prevWeek = data.weeklyProgress[data.weeklyProgress.length - 2];
    
    let output = `
# Weekly OKR Report - ${currentWeek}

## Key Metrics
- **Karma Gain**: ${weekEntry.karmaGain >= 0 ? '+' : ''}${weekEntry.karmaGain}
- **Followers Gain**: ${weekEntry.followersGain >= 0 ? '+' : ''}${weekEntry.followersGain}
- **Posts**: ${weekEntry.posts}/${this.targets.weeklyPosts}
- **Comments**: ${weekEntry.comments}/${this.targets.weeklyComments}

## Progress vs Targets
`;
    
    const postProgress = this.calculateProgress(weekEntry.posts, this.targets.weeklyPosts);
    const commentProgress = this.calculateProgress(weekEntry.comments, this.targets.weeklyComments);
    
    output += `- Posts: ${this.progressBar(postProgress)} ${postProgress}%\n`;
    output += `- Comments: ${this.progressBar(commentProgress)} ${commentProgress}%\n`;
    
    if (prevWeek) {
      const karmaDiff = weekEntry.karmaGain - prevWeek.karmaGain;
      const followersDiff = weekEntry.followersGain - prevWeek.followersGain;
      
      output += `
## Week-over-Week Comparison
- Karma: ${karmaDiff >= 0 ? '↑' : '↓'} ${Math.abs(karmaDiff)}
- Followers: ${followersDiff >= 0 ? '↑' : '↓'} ${Math.abs(followersDiff)}
`;
    }
    
    return output;
  }
}

module.exports = OKRTracker;
