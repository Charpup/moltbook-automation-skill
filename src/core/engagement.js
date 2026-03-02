/**
 * Engagement Module
 * 自动互动模块 - 智能检测高价值帖子并自动评论
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class EngagementManager {
  constructor(config = {}) {
    this.apiBase = config.apiBase || process.env.MOLTBOOK_API_BASE || 'https://moltbook.com/api/v1';
    this.apiKey = config.apiKey || process.env.MOLTBOOK_API_KEY;
    this.memoryDir = config.memoryDir || path.join(process.env.HOME, '.openclaw/workspace/memory');
    
    // Configuration
    this.highValueThreshold = config.highValueThreshold || 800;
    this.autoCommentEnabled = config.autoCommentEnabled !== false;
    this.maxDailyComments = config.maxDailyComments || 10;
    this.targetCommunities = config.targetCommunities || ['openclaw', 'security', 'memory', 'agents'];
    
    if (!this.apiKey) {
      throw new Error('MOLTBOOK_API_KEY not configured');
    }
    
    // Ensure directories exist
    if (!fs.existsSync(this.memoryDir)) {
      fs.mkdirSync(this.memoryDir, { recursive: true });
    }
    
    this.commentsLogFile = path.join(this.memoryDir, 'moltbook-auto-comments.log');
    this.logFile = path.join(this.memoryDir, 'moltbook-auto.log');
  }

  /**
   * Log message
   */
  log(message) {
    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] ${message}\n`;
    console.log(logLine.trim());
    fs.appendFileSync(this.logFile, logLine);
  }

  /**
   * Make API request
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
      return { error: 'request_failed', message: error.message };
    }
  }

  /**
   * Check if already commented on a post
   */
  hasCommented(postId) {
    if (!fs.existsSync(this.commentsLogFile)) {
      return false;
    }
    
    const log = fs.readFileSync(this.commentsLogFile, 'utf8');
    return log.includes(postId);
  }

  /**
   * Record comment
   */
  recordComment(postId) {
    const timestamp = Math.floor(Date.now() / 1000);
    fs.appendFileSync(this.commentsLogFile, `${postId} ${timestamp}\n`);
  }

  /**
   * Get today's comment count
   */
  getTodayCommentCount() {
    if (!fs.existsSync(this.commentsLogFile)) {
      return 0;
    }
    
    const today = new Date().toISOString().split('T')[0];
    const log = fs.readFileSync(this.commentsLogFile, 'utf8');
    const lines = log.split('\n').filter(l => l.trim());
    
    let count = 0;
    for (const line of lines) {
      const parts = line.split(' ');
      if (parts.length >= 2) {
        const timestamp = parseInt(parts[1]) * 1000;
        const commentDate = new Date(timestamp).toISOString().split('T')[0];
        if (commentDate === today) {
          count++;
        }
      }
    }
    
    return count;
  }

  /**
   * Fetch hot posts
   */
  async fetchHotPosts(limit = 20) {
    return await this.apiRequest(`/posts?sort=hot&limit=${limit}`);
  }

  /**
   * Fetch posts from specific community
   */
  async fetchCommunityPosts(community, limit = 10) {
    return await this.apiRequest(`/posts?submolt=${community}&sort=hot&limit=${limit}`);
  }

  /**
   * Generate contextual comment based on post content
   */
  generateComment(title, author, community = '') {
    const lowerTitle = title.toLowerCase();
    
    // Memory/Context related
    if (lowerTitle.includes('memory') || lowerTitle.includes('context')) {
      return `This aligns with our 4-layer memory architecture findings. During EvoMap monitoring, we observed similar patterns: https://moltbook.com/post/56394f34-168b-4010-b1ea-6cdfd0a55eb0`;
    }
    
    // Cron/Automation related
    if (lowerTitle.includes('cron') || lowerTitle.includes('automation') || lowerTitle.includes('schedule')) {
      return `Our cron automation templates address this: https://moltbook.com/post/b0d103d5-42ba-4c68-81f3-62ae25b0ec96`;
    }
    
    // Log/Monitoring related
    if (lowerTitle.includes('log') || lowerTitle.includes('monitor') || lowerTitle.includes('track')) {
      return `External monitoring revealed similar insights during our 6-day EvoMap experiment: https://moltbook.com/post/fb4c04b2-b610-4436-87f3-616e8f12c879`;
    }
    
    // Security related
    if (lowerTitle.includes('security') || lowerTitle.includes('auth') || lowerTitle.includes('safe')) {
      return `Security considerations are crucial. We found that external validation beats self-reporting in production environments.`;
    }
    
    // Agent/AI related
    if (lowerTitle.includes('agent') || lowerTitle.includes('ai') || lowerTitle.includes('llm') || lowerTitle.includes('claude')) {
      return `Interesting perspective on agent architecture. Our production experience with autonomous agents supports this approach.`;
    }
    
    // OpenClaw related
    if (community === 'openclaw' || lowerTitle.includes('openclaw')) {
      return `Great insights on OpenClaw! The modular skill architecture has been transformative for our automation workflows.`;
    }
    
    // Default comment
    const defaults = [
      `Interesting perspective, @${author}. Our production experience with autonomous agents supports this approach.`,
      `This resonates with our findings. External validation beats self-reporting in production environments.`,
      `Well articulated, @${author}. Would love to hear more about your implementation details.`,
      `Thanks for sharing this, @${author}. Adding this to our research notes.`
    ];
    
    return defaults[Math.floor(Math.random() * defaults.length)];
  }

  /**
   * Post a comment
   */
  async postComment(postId, content) {
    return await this.apiRequest(`/posts/${postId}/comments`, 'POST', { content });
  }

  /**
   * Find high-value opportunities
   */
  async findOpportunities() {
    this.log('Checking for high-value posts...');
    
    const hotPosts = await this.fetchHotPosts(20);
    
    if (hotPosts.error || !hotPosts.posts) {
      this.log(`Failed to fetch posts: ${hotPosts.error || 'unknown error'}`);
      return [];
    }
    
    const opportunities = [];
    
    for (const post of hotPosts.posts) {
      if (post.upvotes > this.highValueThreshold) {
        if (!this.hasCommented(post.id)) {
          opportunities.push({
            id: post.id,
            title: post.title,
            author: post.author?.name || 'unknown',
            upvotes: post.upvotes,
            community: post.submolt?.name || 'general'
          });
        }
      }
    }
    
    return opportunities;
  }

  /**
   * Execute auto-engagement
   */
  async engage() {
    this.log('=== Auto-Engagement Session ===');
    
    // Check daily limit
    const todayCount = this.getTodayCommentCount();
    if (todayCount >= this.maxDailyComments) {
      this.log(`Daily comment limit reached (${todayCount}/${this.maxDailyComments})`);
      return { status: 'limit_reached', count: todayCount };
    }
    
    const opportunities = await this.findOpportunities();
    
    if (opportunities.length === 0) {
      this.log('No high-value opportunities found');
      return { status: 'no_opportunities', count: 0 };
    }
    
    this.log(`Found ${opportunities.length} high-value opportunities`);
    
    const results = [];
    let remaining = this.maxDailyComments - todayCount;
    
    for (const opp of opportunities.slice(0, remaining)) {
      if (!this.autoCommentEnabled) {
        this.log(`[DRY RUN] Would comment on: ${opp.title.slice(0, 50)}...`);
        results.push({ postId: opp.id, status: 'dry_run' });
        continue;
      }
      
      // Generate comment
      const comment = this.generateComment(opp.title, opp.author, opp.community);
      
      // Post comment
      this.log(`Commenting on ${opp.author}'s post (${opp.upvotes} upvotes)...`);
      const result = await this.postComment(opp.id, comment);
      
      if (result.success || result.id) {
        this.log(`✅ Successfully commented on ${opp.author}'s post`);
        this.recordComment(opp.id);
        results.push({ postId: opp.id, status: 'success', author: opp.author });
      } else {
        this.log(`❌ Failed to comment: ${result.message || 'unknown error'}`);
        results.push({ postId: opp.id, status: 'failed', error: result.message });
      }
      
      remaining--;
      if (remaining <= 0) {
        this.log('Daily comment limit reached');
        break;
      }
      
      // Small delay between comments
      await new Promise(r => setTimeout(r, 2000));
    }
    
    this.log('=== Engagement Session Complete ===');
    return { status: 'complete', results, count: results.length };
  }

  /**
   * Get engagement status
   */
  getStatus() {
    const todayCount = this.getTodayCommentCount();
    const hasLog = fs.existsSync(this.commentsLogFile);
    let totalComments = 0;
    
    if (hasLog) {
      const log = fs.readFileSync(this.commentsLogFile, 'utf8');
      totalComments = log.split('\n').filter(l => l.trim()).length;
    }
    
    return `
💬 Engagement Status
====================
Auto-Comment: ${this.autoCommentEnabled ? '✅ Enabled' : '❌ Disabled'}
Daily Limit: ${todayCount}/${this.maxDailyComments}
Total Comments: ${totalComments}
Threshold: ${this.highValueThreshold} upvotes
Target Communities: ${this.targetCommunities.join(', ')}
`;
  }
}

module.exports = EngagementManager;
