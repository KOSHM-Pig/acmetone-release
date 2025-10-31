const jwt = require('jsonwebtoken');
const axios = require('axios');
const config = require('../config/config');
const logger = require('../utils/logger');

/**
 * 认证中间件
 * 验证JWT token，支持两种验证方式：
 * 1. 本地验证
 * 2. 代理到主后端验证
 */
const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const ip = logger.getClientIP(req);

    if (!token) {
      logger.warn('缺少访问令牌', {
        method: req.method,
        url: req.originalUrl || req.url,
        ip: ip
      });

      return res.status(401).json({
        success: false,
        message: '需要访问令牌'
      });
    }

    // 方式1: 本地JWT验证
    if (config.jwt.secret) {
      try {
        const decoded = jwt.verify(token, config.jwt.secret);
        req.user = decoded;

        logger.debug('本地JWT验证成功', {
          userId: decoded.id,
          ip: ip
        });

        return next();
      } catch (jwtError) {
        logger.debug('本地JWT验证失败，尝试主后端验证', {
          error: jwtError.message,
          ip: ip
        });
      }
    }

    // 方式2: 代理到主后端验证
    try {
      logger.debug('尝试主后端验证', {
        url: `${config.mainBackend.url}/api/auth/validate`,
        ip: ip
      });

      const response = await axios.get(`${config.mainBackend.url}/api/auth/validate`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        timeout: config.mainBackend.timeout
      });

      logger.debug('主后端响应', {
        status: response.status,
        data: response.data,
        ip: ip
      });

      // 检查响应格式 - 兼容多种可能的响应格式
      if (response.status === 200) {
        let user = null;

        // 格式1: { valid: true, user: {...} } (主后端的 /api/auth/validate 格式)
        if (response.data && response.data.valid && response.data.user) {
          user = response.data.user;
        }
        // 格式2: { success: true, user: {...} }
        else if (response.data && response.data.success && response.data.user) {
          user = response.data.user;
        }
        // 格式3: { user: {...} } (没有success字段)
        else if (response.data && response.data.user) {
          user = response.data.user;
        }
        // 格式4: 直接返回用户对象 {...}
        else if (response.data && response.data.id) {
          user = response.data;
        }

        if (user && user.id) {
          req.user = user;

          logger.debug('主后端验证成功', {
            userId: user.id,
            username: user.username,
            ip: ip
          });

          return next();
        } else {
          logger.warn('主后端响应中没有有效的用户信息', {
            responseData: response.data,
            ip: ip
          });
        }
      } else {
        logger.warn('主后端返回非200状态码', {
          status: response.status,
          responseData: response.data,
          ip: ip
        });
      }

      return res.status(401).json({
        success: false,
        message: '无效的访问令牌'
      });
    } catch (backendError) {
      logger.error('主后端验证失败', {
        error: backendError.message,
        response: backendError.response?.data,
        status: backendError.response?.status,
        ip: ip
      });

      return res.status(401).json({
        success: false,
        message: '认证服务不可用'
      });
    }

  } catch (error) {
    logger.error('认证中间件错误', {
      error: error.message,
      stack: error.stack,
      ip: logger.getClientIP(req)
    });

    return res.status(500).json({
      success: false,
      message: '认证错误'
    });
  }
};

module.exports = authMiddleware;
