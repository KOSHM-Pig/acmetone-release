/**
 * 日志工具 - 带颜色和IP显示
 */

const config = require('../config/config');

// ANSI 颜色代码
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m'
};

// 日志级别颜色映射
const levelColors = {
  info: colors.green,
  warn: colors.yellow,
  error: colors.red,
  debug: colors.cyan,
  success: colors.bright + colors.green
};

class Logger {
  constructor() {
    this.level = config.logging.level;
    this.showColors = config.logging.colors;
    this.showDate = config.logging.showDate;
    this.showIP = config.logging.showIP;
  }

  formatDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const ms = String(now.getMilliseconds()).padStart(3, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${ms}`;
  }

  getClientIP(req) {
    if (!req) return '';

    return req.ip ||
           req.connection?.remoteAddress ||
           req.socket?.remoteAddress ||
           (req.connection?.socket ? req.connection.socket.remoteAddress : '') ||
           '';
  }

  colorize(text, color) {
    if (!this.showColors) return text;
    return `${color}${text}${colors.reset}`;
  }

  log(level, message, meta = {}) {
    const timestamp = this.showDate ? this.formatDate() : '';
    const serviceName = this.colorize('[极音记厂牌后端]', colors.magenta);
    const levelText = this.colorize(`[${level.toUpperCase()}]`, levelColors[level] || colors.white);

    let logParts = [];

    if (timestamp) {
      logParts.push(this.colorize(timestamp, colors.gray));
    }

    logParts.push(serviceName);
    logParts.push(levelText);

    // 添加IP信息
    if (this.showIP && meta.ip) {
      const ipText = this.colorize(`[${meta.ip}]`, colors.blue);
      logParts.push(ipText);
    }

    // 添加请求信息
    if (meta.method && meta.url) {
      const methodColor = meta.method === 'GET' ? colors.green :
                         meta.method === 'POST' ? colors.yellow :
                         meta.method === 'PUT' ? colors.blue :
                         meta.method === 'DELETE' ? colors.red : colors.white;
      const methodText = this.colorize(meta.method, methodColor);
      logParts.push(`${methodText} ${meta.url}`);
    }

    logParts.push(message);

    // 添加额外的元数据
    if (meta.duration) {
      logParts.push(this.colorize(`(${meta.duration}ms)`, colors.gray));
    }

    console.log(logParts.join(' '));

    // 如果有错误堆栈，单独打印
    if (meta.stack) {
      console.log(this.colorize(meta.stack, colors.red));
    }
  }

  info(message, meta = {}) {
    this.log('info', message, meta);
  }

  warn(message, meta = {}) {
    this.log('warn', message, meta);
  }

  error(message, meta = {}) {
    this.log('error', message, meta);
  }

  debug(message, meta = {}) {
    if (this.level === 'debug') {
      this.log('debug', message, meta);
    }
  }

  success(message, meta = {}) {
    this.log('success', message, meta);
  }

  // 请求日志中间件
  requestLogger() {
    return (req, res, next) => {
      const start = Date.now();
      const ip = this.getClientIP(req);

      // 记录请求开始
      this.info('请求开始', {
        method: req.method,
        url: req.originalUrl || req.url,
        ip: ip,
        userAgent: req.get('User-Agent')
      });

      // 监听响应结束
      res.on('finish', () => {
        const duration = Date.now() - start;
        const statusColor = res.statusCode >= 400 ? colors.red :
                           res.statusCode >= 300 ? colors.yellow :
                           colors.green;

        this.info(`请求完成 ${this.colorize(res.statusCode, statusColor)}`, {
          method: req.method,
          url: req.originalUrl || req.url,
          ip: ip,
          duration: duration
        });
      });

      next();
    };
  }
}

module.exports = new Logger();
