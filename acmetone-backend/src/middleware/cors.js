/**
 * CORS中间件 - 处理跨域资源共享
 */

// 允许的域名列表
const allowedOrigins = [
  'http://www.acmetone.com', 
  'https://www.acmetone.com',
  'http://acmetone.com', 
  'https://acmetone.com',
  'http://47.121.194.8',
  'https://47.121.194.8',
  'http://localhost:5173',
  'http://localhost:3000'
];

/**
 * CORS中间件函数
 */
const corsMiddleware = (req, res, next) => {
  const origin = req.headers.origin;
  
  // 设置允许的源
  if (origin && allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  } else {
    res.header('Access-Control-Allow-Origin', '*');
  }
  
  // 设置其他CORS头
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, Access-Control-Allow-Headers, Access-Control-Request-Method, Access-Control-Request-Headers');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Expose-Headers', 'Content-Length, Content-Type');
  res.header('Access-Control-Max-Age', '86400'); // 24小时内不再发送预检请求
  
  // 处理预检请求
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
};

module.exports = corsMiddleware; 