import { defineStore } from 'pinia';
import axios from 'axios';
import { API_BASE_URL } from '../config';

export const useStatisticsStore = defineStore('statistics', {
  state: () => ({
    statistics: {
      totalSubmissions: 0,
      submissionTrend: 0,
      approvalRate: 0,
      approvalRateTrend: 0,
      artistRequestCount: 0,
      artistRequestTrend: 0,
      pendingRequestCount: 0,
      pendingRequestTrend: 0
    },
    chartData: {
      dailySubmission: [],
      dailyFavorite: {
        dates: [],
        data: {}
      }
    },
    analysisData: [],
    loading: false,
    error: null,
    lastFetchTime: 0
  }),

  actions: {
    // 获取仪表板数据
    async fetchDashboardData(forceRefresh = true) {
      // 如果距离上次请求不足5分钟且不强制刷新，则使用缓存数据
      const CACHE_TIME = 5 * 60 * 1000; // 5分钟缓存
      const now = Date.now();
      
      if (!forceRefresh && 
          this.lastFetchTime > 0 && 
          now - this.lastFetchTime < CACHE_TIME) {
        console.log('使用缓存的统计数据');
        return {
          statistics: this.statistics,
          chartData: this.chartData,
          analysisData: this.analysisData
        };
      }
      
      try {
        this.loading = true;
        this.error = null;
        
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('未登录');
        }
        
        console.log('开始获取仪表板数据...');
        
        // 添加时间戳参数，防止浏览器缓存
        const timestamp = new Date().getTime();
        const response = await axios.get(
          `${API_BASE_URL}/statistics/dashboard?t=${timestamp}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`
            },
            // 禁用浏览器缓存
            cache: false
          }
        );
        
        console.log('获取仪表板数据成功:', response.data);
        
        // 更新状态
        this.statistics = response.data.statistics;
        this.chartData = response.data.chartData;
        this.analysisData = response.data.analysisData;
        this.lastFetchTime = now;
        
        return response.data;
      } catch (error) {
        console.error('获取仪表板数据失败:', error);
        
        if (error.response) {
          console.error('错误响应:', {
            status: error.response.status,
            statusText: error.response.statusText,
            data: error.response.data
          });
          this.error = error.response.data?.message || `服务器错误 (${error.response.status})`;
        } else if (error.request) {
          console.error('请求未收到响应:', error.request);
          this.error = '服务器未响应，请检查网络连接';
        } else {
          console.error('请求配置错误:', error.message);
          this.error = error.message || '获取仪表板数据失败';
        }
        
        throw this.error;
      } finally {
        this.loading = false;
      }
    },
    
    // 重置状态
    resetState() {
      this.statistics = {
        totalSubmissions: 0,
        submissionTrend: 0,
        approvalRate: 0,
        approvalRateTrend: 0,
        artistRequestCount: 0,
        artistRequestTrend: 0,
        pendingRequestCount: 0,
        pendingRequestTrend: 0
      };
      this.chartData = {
        dailySubmission: [],
        dailyFavorite: {
          dates: [],
          data: {}
        }
      };
      this.analysisData = [];
      this.loading = false;
      this.error = null;
      this.lastFetchTime = 0;
    }
  }
}); 