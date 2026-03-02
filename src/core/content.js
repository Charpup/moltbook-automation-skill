/**
 * Content Generation Module
 * 内容生成模块 - 分析趋势并生成内容建议
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class ContentGenerator {
  constructor(config = {}) {
    this.apiBase = config.apiBase || process.env.MOLTBOOK_API_BASE || 'https://moltbook.com/api/v1';
    this.apiKey = config.apiKey || process.env.MOLTBOOK_API_KEY;
    this.memoryDir = config.memoryDir || path.join(process.env.HOME, '.openclaw/workspace/memory');
    
    this.minTrendCount = config.minTrendCount || 3;
    this.suggestionLimit = config.suggestionLimit || 5;
    
    if (!fs.existsSync(this.memoryDir)) {
      fs.mkdirSync(this.memoryDir, { recursive: true });
    }
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
   * Analyze trends from hot posts
   */
  async analyzeTrends() {
    console.log('📈 Analyzing trends...');
    
    const hotPosts = await this.apiRequest('/posts?sort=hot&limit=30');
    
    if (hotPosts.error || !hotPosts.posts) {
      console.error('Failed to fetch posts for trend analysis');
      return null;
    }
    
    const topics = {
      memory: { count: 0, posts: [], keywords: ['memory', 'context', 'recall'] },
      cron: { count: 0, posts: [], keywords: ['cron', 'automation', 'schedule'] },
      log: { count: 0, posts: [], keywords: ['log', 'monitor', 'track', 'observability'] },
      security: { count: 0, posts: [], keywords: ['security', 'auth', 'safe', 'protect'] },
      agent: { count: 0, posts: [], keywords: ['agent', 'ai', 'llm', 'claude', 'autonomous'] },
      openclaw: { count: 0, posts: [], keywords: ['openclaw', 'skill', 'mcp'] }
    };
    
    for (const post of hotPosts.posts) {
      const title = post.title?.toLowerCase() || '';
      
      for (const [topic, data] of Object.entries(topics)) {
        if (data.keywords.some(kw => title.includes(kw))) {
          data.count++;
          data.posts.push({
            id: post.id,
            title: post.title,
            author: post.author?.name,
            upvotes: post.upvotes
          });
        }
      }
    }
    
    // Sort by count
    const sortedTopics = Object.entries(topics)
      .sort((a, b) => b[1].count - a[1].count)
      .filter(([_, data]) => data.count >= this.minTrendCount);
    
    return {
      timestamp: new Date().toISOString(),
      totalAnalyzed: hotPosts.posts.length,
      trends: sortedTopics.map(([name, data]) => ({
        topic: name,
        count: data.count,
        posts: data.posts.slice(0, 3)
      }))
    };
  }

  /**
   * Generate content suggestions based on trends
   */
  generateSuggestions(trends) {
    if (!trends || trends.trends.length === 0) {
      return [];
    }
    
    const suggestions = [];
    const suggestionTemplates = {
      memory: [
        { type: 'deep_dive', title: '4-Layer Memory Architecture: Lessons from 30 Days of Production', description: 'Share insights from implementing hierarchical memory systems' },
        { type: 'tutorial', title: 'Building Context-Aware Agents: A Practical Guide', description: 'Step-by-step guide to implementing effective context management' },
        { type: 'comparison', title: 'Short-term vs Long-term Memory: When to Use What', description: 'Analysis of different memory types and their use cases' }
      ],
      cron: [
        { type: 'tutorial', title: 'OpenClaw Cron Mastery: Advanced Scheduling Patterns', description: 'Advanced techniques for agent scheduling and automation' },
        { type: 'case_study', title: 'How We Automated 90% of Our Moltbook Engagement', description: 'Real-world case study of automation implementation' },
        { type: 'deep_dive', title: 'The Psychology of Automated Engagement', description: 'Balancing automation with authentic community interaction' }
      ],
      log: [
        { type: 'tutorial', title: 'External Monitoring for AI Agents: Best Practices', description: 'How to effectively monitor autonomous agent behavior' },
        { type: 'case_study', title: '6-Day EvoMap Experiment: What We Learned', description: 'Detailed analysis of our monitoring experiment results' },
        { type: 'deep_dive', title: 'Beyond Self-Reporting: Why External Validation Matters', description: 'The importance of independent monitoring systems' }
      ],
      security: [
        { type: 'tutorial', title: 'Securing AI Agent Workflows: A Practical Guide', description: 'Security considerations for autonomous agent operations' },
        { type: 'deep_dive', title: 'API Key Management for Multi-Agent Systems', description: 'Best practices for credential management' }
      ],
      agent: [
        { type: 'deep_dive', title: 'The Future of Autonomous Agents: 2026 Outlook', description: 'Trends and predictions for agent technology' },
        { type: 'case_study', title: 'From Script to Skill: Evolution of Our Moltbook Agent', description: 'Journey from bash scripts to OpenClaw skills' },
        { type: 'tutorial', title: 'Building Self-Improving Agents with OpenClaw', description: 'Implementing feedback loops for agent optimization' }
      ],
      openclaw: [
        { type: 'tutorial', title: 'Creating Your First OpenClaw Skill: Complete Walkthrough', description: 'From idea to implementation' },
        { type: 'deep_dive', title: 'Skill Architecture Patterns: Lessons from 10+ Skills', description: 'Common patterns and anti-patterns in skill design' },
        { type: 'case_study', title: 'How OpenClaw Transformed Our Automation Workflow', description: 'Before/after comparison of our automation approach' }
      ]
    };
    
    // Generate suggestions based on top trends
    for (const trend of trends.trends.slice(0, 3)) {
      const templates = suggestionTemplates[trend.topic];
      if (templates) {
        // Pick a template that hasn't been used recently
        const template = templates[Math.floor(Math.random() * templates.length)];
        suggestions.push({
          ...template,
          topic: trend.topic,
          trendCount: trend.count,
          inspiration: trend.posts.map(p => p.title).join('; ')
        });
      }
    }
    
    // Add evergreen suggestions if we don't have enough
    const evergreen = [
      { type: 'question', title: 'What automation challenge are you struggling with?', description: 'Engage the community with a discussion starter' },
      { type: 'poll', title: 'Poll: Which memory layer do you use most?', description: 'Create an interactive poll about memory systems' },
      { type: 'resource', title: 'Curated List: Top 10 Agent Automation Tools', description: 'Share a curated list of useful tools' }
    ];
    
    while (suggestions.length < this.suggestionLimit && evergreen.length > 0) {
      const item = evergreen.shift();
      if (!suggestions.find(s => s.type === item.type)) {
        suggestions.push({ ...item, topic: 'evergreen' });
      }
    }
    
    return suggestions.slice(0, this.suggestionLimit);
  }

  /**
   * Save trend analysis
   */
  saveTrends(trends) {
    const trendsFile = path.join(this.memoryDir, 'moltbook-trends.json');
    
    let history = [];
    if (fs.existsSync(trendsFile)) {
      try {
        history = JSON.parse(fs.readFileSync(trendsFile, 'utf8')).history || [];
      } catch (e) {}
    }
    
    history.push(trends);
    
    // Keep last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    history = history.filter(h => new Date(h.timestamp) > thirtyDaysAgo);
    
    fs.writeFileSync(trendsFile, JSON.stringify({ current: trends, history }, null, 2));
  }

  /**
   * Get content ideas
   */
  async getIdeas() {
    const trends = await this.analyzeTrends();
    
    if (!trends) {
      return { error: 'Failed to analyze trends' };
    }
    
    this.saveTrends(trends);
    const suggestions = this.generateSuggestions(trends);
    
    return {
      timestamp: new Date().toISOString(),
      trends: trends.trends,
      suggestions
    };
  }

  /**
   * Format ideas for display
   */
  formatIdeas(ideas) {
    if (ideas.error) {
      return `Error: ${ideas.error}`;
    }
    
    let output = `
📝 Content Ideas
===============
Generated: ${ideas.timestamp}

📈 Current Trends:
`;
    
    for (const trend of ideas.trends) {
      output += `  • ${trend.topic}: ${trend.count} posts\n`;
    }
    
    output += `
💡 Suggestions:
`;
    
    for (let i = 0; i < ideas.suggestions.length; i++) {
      const s = ideas.suggestions[i];
      output += `
${i + 1}. [${s.type.toUpperCase()}] ${s.title}
   Topic: ${s.topic} | ${s.description}
`;
      if (s.inspiration) {
        output += `   Inspired by: ${s.inspiration.slice(0, 60)}...\n`;
      }
    }
    
    return output;
  }
}

module.exports = ContentGenerator;
