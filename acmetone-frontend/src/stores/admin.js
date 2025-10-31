import { defineStore } from 'pinia';
import axios from 'axios';
import { API_BASE_URL } from '../config';

export const useAdminStore = defineStore('admin', {
  state: () => ({
    emailLogs: [],
    emailStats: [],
    totalLogs: 0,
    loading: false,
    error: null
  }),
  
  actions: {
    async fetchEmailLogs(params = {}) {
      this.loading = true;
      this.error = null;
      
      try {
        const response = await axios.get(`${API_BASE_URL}/admin/email-logs`, {
          params,
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        
        if (response.data.success) {
          this.emailLogs = response.data.data;
          this.totalLogs = response.data.total;
          return response.data;
        } else {
          throw new Error(response.data.message || '获取邮件日志失败');
        }
      } catch (error) {
        console.error('获取邮件日志失败:', error);
        this.error = error.message || '获取邮件日志失败';
        throw error;
      } finally {
        this.loading = false;
      }
    },
    
    async fetchEmailStats() {
      this.loading = true;
      this.error = null;
      
      try {
        const response = await axios.get(`${API_BASE_URL}/admin/email-logs/stats/types`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        
        if (response.data.success) {
          this.emailStats = response.data.data;
          return response.data.data;
        } else {
          throw new Error(response.data.message || '获取邮件统计失败');
        }
      } catch (error) {
        console.error('获取邮件统计失败:', error);
        this.error = error.message || '获取邮件统计失败';
        throw error;
      } finally {
        this.loading = false;
      }
    },
    
    async getEmailDetail(id) {
      this.loading = true;
      this.error = null;
      
      try {
        const response = await axios.get(`${API_BASE_URL}/admin/email-logs/${id}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        
        if (response.data.success) {
          return response.data.data;
        } else {
          throw new Error(response.data.message || '获取邮件详情失败');
        }
      } catch (error) {
        console.error('获取邮件详情失败:', error);
        this.error = error.message || '获取邮件详情失败';
        throw error;
      } finally {
        this.loading = false;
      }
    }
  }
}); 