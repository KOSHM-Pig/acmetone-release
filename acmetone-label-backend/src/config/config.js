/**
 * 应用配置文件 - 无环境变量依赖
 */

const isDev = true;

const config = {
  // 服务器配置
  server: {
    port: 3001,
    env: isDev ? 'development' : 'production',
    name: 'acmetone-label-backend'
  },

  // 主后端服务配置
  mainBackend: {
    url: isDev ? 'http://localhost:3000' : 'https://www.acmetone.com',
    timeout: 10000
  },

  // JWT配置
  jwt: {
    secret: 'acmetone-label-backend-secret-key-2024',
    expiresIn: '24h'
  },

  // 速率限制配置
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15分钟
    max: 100 // 最大请求数
  },

  // CORS配置
  cors: {
    origins: [
      'http://www.acmetone.com',
      'https://www.acmetone.com',
      'http://acmetone.com',
      'https://acmetone.com',
      'http://47.121.194.8',
      'https://47.121.194.8',
      'http://localhost:5173',
      'http://localhost:5174', // label-frontend 端口
      'http://localhost:3000',
      'http://localhost:3001'
    ]
  },

  // 日志配置
  logging: {
    level: 'info',
    colors: true,
    showDate: true,
    showIP: true
  },

  // 数据库配置
  database: {
    host: 'localhost',
    port: 3306,
    database: 'acmetone_label',
    user: 'acmetone_label',
    password: 'acmetone_label',
    connectionLimit: 10,
    acquireTimeout: 60000,
    timeout: 60000,
    reconnect: true
  },

  // Redis配置 (预留)
  redis: {
    host: 'localhost',
    port: 6379,
    password: ''
  }
};

module.exports = config;
