/**
 * Logger Utility
 * 日志工具模块
 */

const fs = require('fs');
const path = require('path');

class Logger {
  constructor(options = {}) {
    this.memoryDir = options.memoryDir || path.join(process.env.HOME, '.openclaw/workspace/memory');
    this.logFile = path.join(this.memoryDir, 'moltbook-auto.log');
    this.level = options.level || 'info';
    
    this.levels = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3
    };
    
    // Ensure directory exists
    if (!fs.existsSync(this.memoryDir)) {
      fs.mkdirSync(this.memoryDir, { recursive: true });
    }
  }

  /**
   * Format log message
   */
  format(level, message) {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  }

  /**
   * Write to log file
   */
  write(level, message) {
    if (this.levels[level] > this.levels[this.level]) {
      return;
    }
    
    const line = this.format(level, message) + '\n';
    
    // Write to file
    fs.appendFileSync(this.logFile, line);
    
    // Also output to console
    console.log(line.trim());
  }

  error(message) {
    this.write('error', message);
  }

  warn(message) {
    this.write('warn', message);
  }

  info(message) {
    this.write('info', message);
  }

  debug(message) {
    this.write('debug', message);
  }

  /**
   * Get recent logs
   */
  getRecent(lines = 50) {
    if (!fs.existsSync(this.logFile)) {
      return [];
    }
    
    const content = fs.readFileSync(this.logFile, 'utf8');
    return content.split('\n').filter(l => l.trim()).slice(-lines);
  }
}

module.exports = Logger;
