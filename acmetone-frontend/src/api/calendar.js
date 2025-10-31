import { API_BASE_URL } from '@/config';
import axios from 'axios';

// 创建axios实例
const api = axios.create({
  baseURL: API_BASE_URL,
});

// 添加请求拦截器，自动添加token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * 日历相关API
 */
export const calendarApi = {
  /**
   * 获取发行日历数据
   * @param {Object} params - 查询参数
   * @param {number} params.year - 年份
   * @param {number} params.month - 月份 (可选)
   * @param {string} params.status - 专辑状态 (默认approved)
   * @returns {Promise} API响应
   */
  async getReleases(params = {}) {
    const response = await api.get('/calendar/releases', { params });
    return response.data;
  },

  /**
   * 获取指定日期的专辑发行
   * @param {string} date - 日期 (YYYY-MM-DD格式)
   * @param {Object} params - 查询参数
   * @param {string} params.status - 专辑状态 (默认approved)
   * @returns {Promise} API响应
   */
  async getReleasesByDate(date, params = {}) {
    const response = await api.get(`/calendar/releases/${date}`, { params });
    return response.data;
  },

  /**
   * 获取发行统计数据
   * @param {Object} params - 查询参数
   * @param {number} params.year - 年份
   * @param {string} params.status - 专辑状态 (默认approved)
   * @returns {Promise} API响应
   */
  async getStats(params = {}) {
    const response = await api.get('/calendar/stats', { params });
    return response.data;
  }
};

export default calendarApi;
