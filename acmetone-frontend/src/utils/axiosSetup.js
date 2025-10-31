/**
 * Axios全局配置和拦截器设置
 */

import axios from 'axios';
import { ElMessage } from 'element-plus';
import { API_BASE_URL } from '@/config';
import router from '@/router';
import authChecker from './authChecker';

// 创建axios实例
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30秒超时
  headers: {
    'Content-Type': 'application/json'
  }
});

// 请求拦截器
axiosInstance.interceptors.request.use(
  config => {
    // 从localStorage获取token
    const token = localStorage.getItem('token');
    
    // 如果有token，则添加到请求头
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    
    return config;
  },
  error => {
    console.error('请求拦截器错误:', error);
    return Promise.reject(error);
  }
);

// 响应拦截器
axiosInstance.interceptors.response.use(
  response => {
    // 成功响应直接返回
    return response;
  },
  error => {
    // 处理错误响应
    if (error.response) {
      // 服务器返回了错误状态码
      const { status, data } = error.response;
      
      // 处理401(未授权)和403(禁止访问)错误
      if (status === 401 || status === 403) {
        // 清除登录信息
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('userInfo');
        
        // 显示提示消息
        ElMessage({
          message: data.message || '登录已过期，请重新登录',
          type: 'warning',
          duration: 5000,
          showClose: true
        });
        
        // 跳转到登录页
        if (router.currentRoute.value.path !== '/login') {
          router.push({
            path: '/login',
            query: { redirect: router.currentRoute.value.fullPath }
          });
        }
      } else if (status === 500) {
        // 服务器错误
        ElMessage.error(data.message || '服务器错误，请稍后重试');
      } else if (status === 404) {
        // 资源不存在
        ElMessage.warning(data.message || '请求的资源不存在');
      } else {
        // 其他错误
        ElMessage.error(data.message || `请求失败(${status})`);
      }
    } else if (error.request) {
      // 请求已发送但没有收到响应
      ElMessage.error('服务器无响应，请检查网络连接');
    } else {
      // 请求配置错误
      ElMessage.error('请求配置错误');
    }
    
    return Promise.reject(error);
  }
);

// 导出实例
export default axiosInstance; 