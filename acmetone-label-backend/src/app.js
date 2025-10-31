const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const config = require('./config/config');
const logger = require('./utils/logger');
const db = require('./config/database');

const app = express();
const PORT = config.server.port;

// 安全中间件
app.use(helmet());

// 请求日志中间件
app.use(logger.requestLogger());

// 速率限制
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: {
    success: false,
    message: '请求过于频繁，请稍后再试'
  }
});
app.use(limiter);

// CORS配置
app.use(cors({
  origin: config.cors.origins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin'
  ]
}));

// 解析JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 中间件：验证来自主后端的token
const authMiddleware = require('./middleware/auth');

// 路由
const healthRoutes = require('./routes/health');
const authRoutes = require('./routes/auth');
const labelRoutes = require('./routes/labels');
const onboardingRoutes = require('./routes/onboarding');

// 健康检查路由 (无需认证)
app.use('/api/health', healthRoutes);

// 认证相关路由 (代理到主后端)
app.use('/api/auth', authRoutes);

// 标签管理路由 (需要认证)
app.use('/api/labels', authMiddleware, labelRoutes);

// 向导流程路由 (需要认证)
app.use('/api/onboarding', authMiddleware, onboardingRoutes);

// 404处理
app.use('*', (req, res) => {
  logger.warn('API端点未找到', {
    method: req.method,
    url: req.originalUrl || req.url,
    ip: logger.getClientIP(req)
  });

  res.status(404).json({
    success: false,
    message: 'API端点未找到'
  });
});

// 错误处理中间件
app.use((err, req, res, next) => {
  logger.error('服务器错误', {
    message: err.message,
    stack: err.stack,
    method: req.method,
    url: req.originalUrl || req.url,
    ip: logger.getClientIP(req)
  });

  res.status(err.status || 500).json({
    success: false,
    message: err.message || '服务器内部错误',
    ...(config.server.env === 'development' && { stack: err.stack })
  });
});

// 启动服务器
app.listen(PORT, async () => {
  logger.success(`Acmetone极音记厂牌后端服务已启动`);
  logger.info(`服务端口: ${PORT}`);
  logger.info(`运行环境: ${config.server.env}`);

  // 测试数据库连接
  const dbConnected = await db.testConnection();
  if (dbConnected) {
    logger.success('数据库连接正常');
  } else {
    logger.error('数据库连接失败');
  }
});

module.exports = app;
