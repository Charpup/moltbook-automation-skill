/**
 * Metrics Collection Module
 * 指标收集模块 - 负责获取和存储 Moltbook 账号指标
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class MetricsCollector {
  constructor(config = {}) {
    this.apiBase = config.apiBase || process.env.MOLTBOOK_API_BASE || 'https://moltbook.com/api/v1';
    this.apiKey = config.apiKey || process.env.MOLTBOOK_API_KEY;
    this.memoryDir = config.memoryDir || path.join(process.env.HOME, '.openclaw/workspace/memory');
    
    if (!this.apiKey) {
      throw new Error('MOLTBOOK_API_KEY not configured');
    }
    
    // Ensure memory directory exists
    if (!fs.existsSync(this.memoryDir)) {
      fs.mkdirSync(this.memoryDir, { recursive: true });
    }
  }

  /**
   * Make API request to Moltbook
   */
  async apiRequest(endpoint, method = 'GET', data = null) {
    const url = `${this.apiBase}${endpoint}`;
    const headers = [`Authorization: Bearer ${this.apiKey}`];
    
    if (data) {
      headers.push('Content-Type: application/json');
    }
    
    const headerArgs = headers.map(h => `-H "${h}"`).join(' ');
    const dataArg = data ? `-d '${JSON.stringify(data)}'` : '';
    const cmd = `curl -s -X ${method} "${url}" ${headerArgs} ${dataArg} 2>/dev/null || echo '{"error":"api_failed"}'`;
    
    try {
      const result = execSync(cmd, { encoding: 'utf8', timeout: 30000 });
      return JSON.parse(result);
    } catch (error) {
      console.error(`API request failed: ${error.message}`);
      return { error: 'request_failed', message: error.message };
    }
  }

  /**
   * Collect current metrics from API
   */
  async collect() {
    console.log('📊 Collecting metrics...');
    
    const agentData = await this.apiRequest('/agents/me');
    
    if (agentData.error) {
      throw new Error(`Failed to collect metrics: ${agentData.error}`);
    }
    
    const metrics = {
      timestamp: new Date().toISOString(),
      karma: agentData.agent?.karma || 0,
      followers: agentData.agent?.follower_count || 0,
      posts: agentData.agent?.posts_count || 0,
      comments: agentData.agent?.comments_count || 0,
      lastActive: agentData.agent?.last_active || null,
      username: agentData.agent?.name || 'unknown'
    };
    
    return metrics;
  }

  /**
   * Save metrics to file
   */
  save(metrics) {
    const metricsFile = path.join(this.memoryDir, 'moltbook-metrics.json');
    
    // Load existing history
    let history = [];
    if (fs.existsSync(metricsFile)) {
      try {
        const existing = JSON.parse(fs.readFileSync(metricsFile, 'utf8'));
        history = existing.history || [];
      } catch (e) {
        // Invalid JSON, start fresh
      }
    }
    
    // Add new entry
    history.push(metrics);
    
    // Keep only last 30 days of data
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    history = history.filter(h => new Date(h.timestamp) > thirtyDaysAgo);
    
    // Save
    const data = {
      current: metrics,
      history: history,
      updatedAt: new Date().toISOString()
    };
    
    fs.writeFileSync(metricsFile, JSON.stringify(data, null, 2));
    console.log(`✅ Metrics saved: Karma=${metrics.karma}, Followers=${metrics.followers}`);
    
    return data;
  }

  /**
   * Load current metrics
   */
  load() {
    const metricsFile = path.join(this.memoryDir, 'moltbook-metrics.json');
    
    if (!fs.existsSync(metricsFile)) {
      return null;
    }
    
    try {
      return JSON.parse(fs.readFileSync(metricsFile, 'utf8'));
    } catch (e) {
      console.error('Failed to load metrics:', e.message);
      return null;
    }
  }

  /**
   * Calculate trends
   */
  calculateTrends(days = 7) {
    const data = this.load();
    if (!data || !data.history || data.history.length < 2) {
      return null;
    }
    
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    
    const recent = data.history.filter(h => new Date(h.timestamp) > cutoff);
    if (recent.length < 2) {
      return null;
    }
    
    const first = recent[0];
    const last = recent[recent.length - 1];
    
    return {
      period: `${days} days`,
      karmaChange: last.karma - first.karma,
      followersChange: last.followers - first.followers,
      postsChange: last.posts - first.posts,
      commentsChange: last.comments - first.comments,
      karmaPerDay: ((last.karma - first.karma) / days).toFixed(2),
      startDate: first.timestamp,
      endDate: last.timestamp
    };
  }

  /**
   * Get formatted status
   */
  getStatus() {
    const data = this.load();
    if (!data || !data.current) {
      return 'No metrics data available. Run: moltbook-automation metrics';
    }
    
    const current = data.current;
    const trends = this.calculateTrends(7);
    
    let output = `
📊 Moltbook Metrics Status
==========================
Username: ${current.username}
Last Updated: ${current.timestamp}

Current Metrics:
  Karma:     ${current.karma}
  Followers: ${current.followers}
  Posts:     ${current.posts}
  Comments:  ${current.comments}
`;
    
    if (trends) {
      output += `
7-Day Trends:
  Karma:     ${trends.karmaChange >= 0 ? '+' : ''}${trends.karmaChange} (${trends.karmaPerDay}/day)
  Followers: ${trends.followersChange >= 0 ? '+' : ''}${trends.followersChange}
  Posts:     ${trends.postsChange >= 0 ? '+' : ''}${trends.postsChange}
  Comments:  ${trends.commentsChange >= 0 ? '+' : ''}${trends.commentsChange}
`;
    }
    
    return output;
  }
}

module.exports = MetricsCollector;
