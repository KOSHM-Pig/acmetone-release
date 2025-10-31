/**
 * 应用配置文件
 */

const config = {
  // 服务器配置
  server: {
    port: process.env.PORT || 3002,
    env: process.env.NODE_ENV || 'development'
  },

  // 主后端服务配置
  mainBackend: {
    url: process.env.MAIN_BACKEND_URL || 'http://localhost:3000',
    timeout: parseInt(process.env.MAIN_BACKEND_TIMEOUT) || 10000
  },

  // JWT配置
  jwt: {
    secret: process.env.JWT_SECRET || 'default-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  },

  // 速率限制配置
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15分钟
    max: parseInt(process.env.RATE_LIMIT_MAX) || 100 // 最大请求数
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
      'http://localhost:3000'
    ]
  },

  // 日志配置
  logging: {
    level: process.env.LOG_LEVEL || 'info'
  },

  // 数据库配置 (预留)
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    name: process.env.DB_NAME || 'acmetone_label',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || ''
  },

  // Redis配置 (预留)
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || ''
  }
};

module.exports = config;
