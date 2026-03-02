/**
 * Configuration Manager
 * 配置管理模块
 */

const fs = require('fs');
const path = require('path');
const YAML = require('yaml');

class Config {
  constructor(configPath = null) {
    this.skillDir = path.join(process.env.HOME, '.openclaw/skills/moltbook-automation');
    this.configPath = configPath || process.env.MOLTBOOK_CONFIG_PATH;
    
    this.defaults = {
      moltbook: {
        apiBase: process.env.MOLTBOOK_API_BASE || 'https://moltbook.com/api/v1',
        apiKey: process.env.MOLTBOOK_API_KEY
      },
      automation: {
        highValueThreshold: 800,
        autoCommentEnabled: true,
        autoPostEnabled: false
      },
      engagement: {
        maxDailyComments: 10,
        commentCooldown: 3600,
        targetCommunities: ['openclaw', 'security', 'memory', 'agents']
      },
      content: {
        minTrendCount: 3,
        suggestionLimit: 5
      },
      okr: {
        karmaTarget: 5000,
        followersTarget: 1000,
        weeklyPostsTarget: 3,
        weeklyCommentsTarget: 20
      }
    };
    
    this.data = this.load();
  }

  /**
   * Load configuration from file
   */
  load() {
    // Try user config first
    if (this.configPath && fs.existsSync(this.configPath)) {
      try {
        const content = fs.readFileSync(this.configPath, 'utf8');
        return this.merge(this.defaults, this.parse(content));
      } catch (e) {
        console.warn(`Failed to load config from ${this.configPath}:`, e.message);
      }
    }
    
    // Try default config location
    const defaultConfig = path.join(this.skillDir, 'config/default.yaml');
    if (fs.existsSync(defaultConfig)) {
      try {
        const content = fs.readFileSync(defaultConfig, 'utf8');
        return this.merge(this.defaults, this.parse(content));
      } catch (e) {
        console.warn(`Failed to load config from ${defaultConfig}:`, e.message);
      }
    }
    
    return this.defaults;
  }

  /**
   * Parse config content (YAML or JSON)
   */
  parse(content) {
    try {
      return YAML.parse(content);
    } catch (e) {
      // Try JSON
      return JSON.parse(content);
    }
  }

  /**
   * Deep merge objects
   */
  merge(target, source) {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.merge(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    
    return result;
  }

  /**
   * Get config value by path
   */
  get(path) {
    const parts = path.split('.');
    let value = this.data;
    
    for (const part of parts) {
      if (value === undefined || value === null) {
        return undefined;
      }
      value = value[part];
    }
    
    return value;
  }

  /**
   * Set config value
   */
  set(path, value) {
    const parts = path.split('.');
    let target = this.data;
    
    for (let i = 0; i < parts.length - 1; i++) {
      if (!target[parts[i]]) {
        target[parts[i]] = {};
      }
      target = target[parts[i]];
    }
    
    target[parts[parts.length - 1]] = value;
  }

  /**
   * Get all config
   */
  all() {
    return this.data;
  }
}

module.exports = Config;
