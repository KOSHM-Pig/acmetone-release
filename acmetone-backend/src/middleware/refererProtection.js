/**
 * 防盗链中间件
 * 用于保护图片和音频资源不被外部网站引用
 */

// 允许访问资源的域名白名单
const ALLOWED_DOMAINS = [
  'localhost',
  '127.0.0.1',
  'www.acmetone.com',
  'acmetone.com',
  '47.121.194.8',
  'localhost:5173',  // 添加本地开发服务器
  'localhost:3000'   // 添加本地后端服务器
];

// 安全令牌，用于API访问
const API_ACCESS_TOKEN = 'acmetone_secure_access_token';

/**
 * 检查请求的Referer是否在允许的白名单中
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 * @param {Function} next - Express下一个中间件函数
 */
const refererProtection = (req, res, next) => {
  // 如果不是访问上传文件，则跳过防盗链检查
  if (!req.path.startsWith('/uploads/')) {
    return next();
  }

  // 获取referer
  const referer = req.headers.referer || req.headers.referrer;
  
  // 如果没有referer，允许访问（可能是直接访问或API请求）
  if (!referer) {
    return next();
  }

  // 检查referer是否来自允许的域名
  const isAllowed = ALLOWED_DOMAINS.some(domain => {
    return referer.includes(domain);
  });

  if (isAllowed) {
    return next();
  }

  // 如果referer不在允许列表中，返回403错误
  console.log(`防盗链保护: 拒绝来自 ${referer} 的请求访问 ${req.path}`);
  return res.status(403).json({
    message: '禁止访问',
    detail: '您无权访问此资源'
  });
};

module.exports = refererProtection; 