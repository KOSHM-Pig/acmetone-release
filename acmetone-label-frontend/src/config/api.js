/**
 * API配置文件
 * 管理所有API端点和配置
 */

// 环境配置
const isDev = process.env.NODE_ENV === 'development'

// 服务端点配置
export const API_CONFIG = {
  // 主后端服务 (acmetone-backend) - 用于认证
  MAIN_BACKEND: {
    baseURL: isDev ? 'http://localhost:3000/api' : 'https://api.acmetone.com/api',
    timeout: 10000
  },
  
  // 厂牌后端服务 (acmetone-label-backend) - 用于业务逻辑
  LABEL_BACKEND: {
    baseURL: isDev ? 'http://localhost:3001' : 'https://label-api.acmetone.com',
    timeout: 10000
  }
}

// 认证相关端点 (连接到主后端)
export const AUTH_ENDPOINTS = {
  LOGIN: '/auth/login',
  REGISTER: '/users/register',
  VERIFY: '/auth/validate',
  REFRESH: '/auth/heartbeat',
  LOGOUT: '/auth/logout',
  FORGOT_PASSWORD: '/auth/forgot-password',
  SEND_VERIFICATION_CODE: '/users/send-verification-code'
}

// 厂牌业务相关端点 (连接到厂牌后端)
export const LABEL_ENDPOINTS = {
  // 厂牌管理
  LABELS: '/api/labels',
  LABEL_DETAIL: (id) => `/api/labels/${id}`,
  
  // 艺人管理
  ARTISTS: '/api/artists',
  ARTIST_DETAIL: (id) => `/api/artists/${id}`,
  
  // 专辑管理
  ALBUMS: '/api/albums',
  ALBUM_DETAIL: (id) => `/api/albums/${id}`,
  
  // 发行管理
  RELEASES: '/api/releases',
  RELEASE_DETAIL: (id) => `/api/releases/${id}`
}

// 请求配置
export const REQUEST_CONFIG = {
  // 默认超时时间
  DEFAULT_TIMEOUT: 10000,
  
  // 重试配置
  RETRY: {
    times: 3,
    delay: 1000
  },
  
  // 请求头配置
  HEADERS: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
}

// 错误码映射
export const ERROR_CODES = {
  // 认证错误
  AUTH_INVALID: 'AUTH_INVALID',
  AUTH_EXPIRED: 'AUTH_EXPIRED',
  AUTH_FAILED: 'AUTH_FAILED',
  
  // 权限错误
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  
  // 业务错误
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  
  // 系统错误
  NETWORK_ERROR: 'NETWORK_ERROR',
  SERVER_ERROR: 'SERVER_ERROR'
}

// 错误消息映射
export const ERROR_MESSAGES = {
  [ERROR_CODES.AUTH_INVALID]: '登录状态无效，请重新登录',
  [ERROR_CODES.AUTH_EXPIRED]: '登录已过期，请重新登录',
  [ERROR_CODES.AUTH_FAILED]: '认证失败，请重新登录',
  [ERROR_CODES.PERMISSION_DENIED]: '没有权限执行此操作',
  [ERROR_CODES.VALIDATION_ERROR]: '输入数据不符合要求',
  [ERROR_CODES.RESOURCE_NOT_FOUND]: '请求的资源不存在',
  [ERROR_CODES.NETWORK_ERROR]: '网络连接失败，请检查网络设置',
  [ERROR_CODES.SERVER_ERROR]: '服务器内部错误，请稍后再试'
}

export default {
  API_CONFIG,
  AUTH_ENDPOINTS,
  LABEL_ENDPOINTS,
  REQUEST_CONFIG,
  ERROR_CODES,
  ERROR_MESSAGES
}
