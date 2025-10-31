/**
 * HTTP请求基础服务
 * 
 * 该模块提供了与后端API交互的基础HTTP请求服务。
 * 封装了axios，处理请求拦截、响应拦截、错误处理等通用功能。
 * 
 * @module api/http
 * @requires axios
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import router from '@/router';

// 创建axios实例
const http: AxiosInstance = axios.create({
  // 根据环境设置基础URL
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api',
  timeout: 15000, // 请求超时时间
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器
http.interceptors.request.use(
  (config) => {
    // 从localStorage获取token
    const token = localStorage.getItem('token');
    
    // 如果有token则添加到请求头
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
http.interceptors.response.use(
  (response: AxiosResponse) => {
    // 如果响应成功，直接返回数据
    return response.data;
  },
  (error) => {
    if (error.response) {
      switch (error.response.status) {
        case 401:
          // 未授权，清除token并跳转到登录页
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          router.push('/login');
          break;
        case 403:
          // 权限不足
          console.error('权限不足');
          break;
        case 404:
          // 资源不存在
          console.error('请求的资源不存在');
          break;
        case 500:
          // 服务器错误
          console.error('服务器错误');
          break;
        default:
          console.error(`未处理的错误: ${error.response.status}`);
      }
    } else if (error.request) {
      // 请求已发送但未收到响应
      console.error('网络错误，无法连接到服务器');
    } else {
      // 请求配置出错
      console.error('请求配置错误:', error.message);
    }
    
    return Promise.reject(error);
  }
);

/**
 * 通用GET请求
 * @param {string} url - 请求地址
 * @param {Object} params - URL参数
 * @param {AxiosRequestConfig} config - 额外配置
 * @returns {Promise<any>} 响应数据
 */
export const get = <T>(url: string, params = {}, config = {}): Promise<T> => {
  return http.get(url, { params, ...config });
};

/**
 * 通用POST请求
 * @param {string} url - 请求地址
 * @param {Object} data - 请求体数据
 * @param {AxiosRequestConfig} config - 额外配置
 * @returns {Promise<any>} 响应数据
 */
export const post = <T>(url: string, data = {}, config = {}): Promise<T> => {
  return http.post(url, data, config);
};

/**
 * 通用PUT请求
 * @param {string} url - 请求地址
 * @param {Object} data - 请求体数据
 * @param {AxiosRequestConfig} config - 额外配置
 * @returns {Promise<any>} 响应数据
 */
export const put = <T>(url: string, data = {}, config = {}): Promise<T> => {
  return http.put(url, data, config);
};

/**
 * 通用DELETE请求
 * @param {string} url - 请求地址
 * @param {AxiosRequestConfig} config - 额外配置
 * @returns {Promise<any>} 响应数据
 */
export const del = <T>(url: string, config = {}): Promise<T> => {
  return http.delete(url, config);
};

export default http; 