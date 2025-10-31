const express = require('express');
const router = express.Router();
const axios = require('axios');
const config = require('../config/config');
const logger = require('../utils/logger');

/**
 * 健康检查路由
 */

// 基础健康检查
router.get('/', (req, res) => {
  logger.info('健康检查请求', {
    ip: logger.getClientIP(req)
  });

  res.json({
    success: true,
    message: 'Acmetone标签后端服务运行正常',
    timestamp: new Date().toISOString(),
    service: config.server.name,
    version: '1.0.0',
    port: config.server.port,
    environment: config.server.env
  });
});

// 详细健康检查 (包括依赖服务)
router.get('/detailed', async (req, res) => {
  const ip = logger.getClientIP(req);

  logger.info('详细健康检查请求', { ip: ip });

  const healthStatus = {
    success: true,
    timestamp: new Date().toISOString(),
    service: config.server.name,
    version: '1.0.0',
    port: config.server.port,
    environment: config.server.env,
    dependencies: {}
  };

  // 检查主后端服务连接
  try {
    const startTime = Date.now();
    const response = await axios.get(`${config.mainBackend.url}/api/health`, {
      timeout: 3000
    });
    const responseTime = Date.now() - startTime;

    healthStatus.dependencies.mainBackend = {
      status: '正常',
      url: config.mainBackend.url,
      responseTime: `${responseTime}ms`
    };

    logger.debug('主后端服务检查正常', {
      url: config.mainBackend.url,
      responseTime: responseTime,
      ip: ip
    });
  } catch (error) {
    healthStatus.success = false;
    healthStatus.dependencies.mainBackend = {
      status: '异常',
      url: config.mainBackend.url,
      error: error.message
    };

    logger.warn('主后端服务检查失败', {
      url: config.mainBackend.url,
      error: error.message,
      ip: ip
    });
  }

  // 检查其他依赖 (数据库、Redis等)
  // TODO: 根据实际需要添加其他依赖检查

  const statusCode = healthStatus.success ? 200 : 503;

  logger.info(`健康检查完成: ${healthStatus.success ? '正常' : '异常'}`, {
    status: statusCode,
    ip: ip
  });

  res.status(statusCode).json(healthStatus);
});

module.exports = router;
