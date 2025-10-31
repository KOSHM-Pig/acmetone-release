//开发模式
const isDev = false;
// API 基础URL
export const SERVER_IP = isDev ? 'localhost:3000' : 'api.acmetone.com';
export const FRONTEND_DOMAIN = isDev ? 'localhost:5173' : 'www.acmetone.com';

export const API_BASE_URL = isDev ? 'http://localhost:3000/api' : 'https://api.acmetone.com/api';

// 静态文件基础URL
export const STATIC_BASE_URL = isDev ? 'http://localhost:3000' : 'https://api.acmetone.com';

// 前端URL
export const FRONTEND_URL =  `https://${FRONTEND_DOMAIN}`;

// 其他配置项可以在这里 
export const CONFIG = {
  // 上传文件大小限制（单位：MB）
  maxFileSize: 50,
  
  // 支持的音频格式
  supportedAudioFormats: ['wav'],
  
  // 支持的图片格式
  supportedImageFormats: ['jpg', 'jpeg', 'png'],
  
  // 分页配置
  pagination: {
    pageSize: 10,
    pageSizes: [10, 20, 50, 100]
  }
}; 