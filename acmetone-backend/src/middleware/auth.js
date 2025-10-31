const { verifyToken } = require('../utils/jwt');
const jwt = require('jsonwebtoken');
const { User } = require('../models');

const auth = async (req, res, next) => {
  try {
    // console.log('认证中间件 - 请求头:', req.headers);
    // 先尝试从Authorization头获取token
    let token = req.header('Authorization')?.replace('Bearer ', '');
    
    // 如果Authorization头没有token，尝试从查询参数获取
    if (!token && req.query.token) {
      token = req.query.token;
    }
    
    if (!token) {
      // console.log('认证中间件 - 未提供token');
      return res.status(401).json({ message: '未提供认证令牌' });
    }

    // console.log('认证中间件 - 开始验证token');
    const decoded = verifyToken(token);
    
    if (!decoded) {
      // console.log('认证中间件 - token验证失败');
      return res.status(401).json({ message: '认证令牌无效或已过期' });
    }

    if (!decoded.id) {
      // console.log('认证中间件 - token中缺少用户ID');
      return res.status(401).json({ message: '认证令牌中缺少用户ID' });
    }

    const user = await User.findByPk(decoded.id);

    if (!user) {
      throw new Error('用户不存在');
    }

    // console.log('认证中间件 - token验证成功，用户ID:', decoded.id);
    req.token = token;
    req.user = user;
    next();
  } catch (error) {
    // console.error('认证错误:', error);
    res.status(401).json({ message: '认证失败', error: error.message });
  }
};

const adminAuth = async (req, res, next) => {
  try {
    // console.log('管理员认证中间件 - 请求头:', req.headers);
    // 先尝试从Authorization头获取token
    let token = req.header('Authorization')?.replace('Bearer ', '');
    
    // 如果Authorization头没有token，尝试从查询参数获取
    if (!token && req.query.token) {
      token = req.query.token;
    }
    
    if (!token) {
      // console.log('管理员认证中间件 - 未提供token');
      return res.status(401).json({ message: '未提供认证令牌' });
    }

    // console.log('管理员认证中间件 - 开始验证token');
    const decoded = verifyToken(token);
    // console.log('管理员认证中间件 - token解码结果:', decoded);
    
    if (!decoded) {
      // console.log('管理员认证中间件 - token验证失败');
      return res.status(401).json({ message: '认证令牌无效或已过期' });
    }
    
    if (!decoded.id) {
      // console.log('管理员认证中间件 - token中缺少用户ID');
      return res.status(401).json({ message: '认证令牌中缺少用户ID' });
    }
    
    const user = await User.findByPk(decoded.id);

    if (!user) {
      throw new Error('用户不存在');
    }

    if (user.role !== 'admin') {
      // console.log('管理员认证中间件 - 用户不是管理员', decoded.role);
      return res.status(403).json({ message: '需要管理员权限' });
    }

    // console.log('管理员认证中间件 - 验证成功，管理员ID:', decoded.id);
    req.token = token;
    req.user = user;
    next();
  } catch (error) {
    // console.error('管理员认证错误:', error);
    res.status(403).json({ message: '认证失败', error: error.message });
  }
};

module.exports = {
  auth,
  adminAuth,
}; 