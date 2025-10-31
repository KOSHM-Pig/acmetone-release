const fs = require('fs');
const path = require('path');
const moment = require('moment');

// 日志目录
const LOG_DIR = path.join(__dirname, '../../logs');

// 确保日志目录存在
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// 内存中的日志缓存
let logCache = [];

// 添加日志
const addLog = (level, message, data = null) => {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    data
  };
  
  // 添加到缓存
  logCache.push(logEntry);
  
  // 同时输出到控制台
  console[level.toLowerCase()](
    `[${timestamp}] [${level}] ${message}`,
    data ? JSON.stringify(data) : ''
  );
};

// 保存日志到文件
const saveLogsToFile = () => {
  if (logCache.length === 0) {
    return;
  }
  
  const now = moment();
  const fileName = `${now.format('YYYY-MM-DD')}.log`;
  const filePath = path.join(LOG_DIR, fileName);
  
  const logContent = logCache.map(entry => 
    `[${entry.timestamp}] [${entry.level}] ${entry.message} ${entry.data ? JSON.stringify(entry.data) : ''}`
  ).join('\n') + '\n';
  
  // 追加写入文件
  fs.appendFile(filePath, logContent, (err) => {
    if (err) {
      console.error('保存日志文件失败:', err);
    } else {
      // 清空缓存
      logCache = [];
      console.log(`日志已保存到 ${fileName}`);
    }
  });
};

// 设置定时保存（每分钟）
const startAutoSave = () => {
  // 每分钟保存一次
  setInterval(saveLogsToFile, 60 * 1000);
  console.log('自动日志保存已启动 - 每分钟保存一次');
};

// 日志级别方法
const logger = {
  info: (message, data) => addLog('INFO', message, data),
  warn: (message, data) => addLog('WARN', message, data),
  error: (message, data) => addLog('ERROR', message, data),
  debug: (message, data) => addLog('DEBUG', message, data)
};

module.exports = {
  startAutoSave,
  saveLogsToFile,
  logger
}; 