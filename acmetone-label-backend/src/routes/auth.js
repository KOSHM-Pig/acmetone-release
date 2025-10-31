const express = require('express');
const router = express.Router();
const axios = require('axios');
const config = require('../config/config');
const logger = require('../utils/logger');

/**
 * 认证路由 - 代理到主后端服务
 */

// 代理请求到主后端的通用函数
const proxyToMainBackend = async (req, res, endpoint) => {
  const ip = logger.getClientIP(req);

  try {
    logger.debug(`代理认证请求: ${endpoint}`, {
      method: req.method,
      ip: ip
    });

    const axiosConfig = {
      method: req.method,
      url: `${config.mainBackend.url}/api/auth${endpoint}`,
      data: req.body,
      headers: {
        'Content-Type': 'application/json',
        ...(req.headers.authorization && { 'Authorization': req.headers.authorization })
      },
      timeout: config.mainBackend.timeout
    };

    const response = await axios(axiosConfig);

    logger.info(`认证代理成功: ${endpoint}`, {
      method: req.method,
      status: response.status,
      ip: ip
    });

    res.status(response.status).json(response.data);
  } catch (error) {
    logger.error(`认证代理失败: ${endpoint}`, {
      error: error.message,
      method: req.method,
      ip: ip
    });

    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(503).json({
        success: false,
        message: '认证服务不可用'
      });
    }
  }
};

// 登录
router.post('/login', (req, res) => {
  proxyToMainBackend(req, res, '/login');
});

// 注册
router.post('/register', (req, res) => {
  proxyToMainBackend(req, res, '/register');
});

// 验证token
router.get('/verify', (req, res) => {
  proxyToMainBackend(req, res, '/validate');
});

// 验证token (新端点名称)
router.get('/validate', (req, res) => {
  proxyToMainBackend(req, res, '/validate');
});

// 刷新token
router.post('/refresh', (req, res) => {
  proxyToMainBackend(req, res, '/refresh');
});

// 登出
router.post('/logout', (req, res) => {
  proxyToMainBackend(req, res, '/logout');
});

// 忘记密码
router.post('/forgot-password', (req, res) => {
  proxyToMainBackend(req, res, '/forgot-password');
});

// 重置密码
router.post('/reset-password', (req, res) => {
  proxyToMainBackend(req, res, '/reset-password');
});

// 获取用户信息
router.get('/me', (req, res) => {
  proxyToMainBackend(req, res, '/me');
});

module.exports = router;
