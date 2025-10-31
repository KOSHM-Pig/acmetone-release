import { defineStore } from 'pinia';
import axios from 'axios';
import { API_BASE_URL } from '../config';

export const useEmailSettingStore = defineStore('emailSetting', {
  state: () => ({
    settings: [],
    settingTypes: {},
    loading: false,
    error: null
  }),
  
  getters: {
    getSettingByType: (state) => (type) => {
      return state.settings.find(setting => setting.settingType === type) || null;
    },
    
    isEmailEnabled: (state) => (type) => {
      const setting = state.settings.find(setting => setting.settingType === type);
      // 如果设置不存在，默认为启用
      return setting ? setting.enabled : true;
    }
  },
  
  actions: {
    async fetchSettings() {
      this.loading = true;
      this.error = null;
      
      try {
        const response = await axios.get(`${API_BASE_URL}/email-settings`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        
        this.settings = response.data;
      } catch (error) {
        console.error('获取邮件设置失败:', error);
        this.error = error.response?.data?.message || '获取邮件设置失败';
        throw error;
      } finally {
        this.loading = false;
      }
    },
    
    async fetchSettingTypes() {
      this.loading = true;
      this.error = null;
      
      try {
        const response = await axios.get(`${API_BASE_URL}/email-settings/types`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        
        this.settingTypes = response.data;
      } catch (error) {
        console.error('获取邮件设置类型失败:', error);
        this.error = error.response?.data?.message || '获取邮件设置类型失败';
        throw error;
      } finally {
        this.loading = false;
      }
    },
    
    async updateSetting(settingType, data) {
      this.loading = true;
      this.error = null;
      
      try {
        const response = await axios.put(
          `${API_BASE_URL}/email-settings/${settingType}`,
          data,
          {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          }
        );
        
        // 更新本地状态
        const index = this.settings.findIndex(s => s.settingType === settingType);
        if (index !== -1) {
          this.settings[index] = response.data;
        } else {
          this.settings.push(response.data);
        }
        
        return response.data;
      } catch (error) {
        console.error('更新邮件设置失败:', error);
        this.error = error.response?.data?.message || '更新邮件设置失败';
        throw error;
      } finally {
        this.loading = false;
      }
    },
    
    async updateBatchSettings(settings) {
      this.loading = true;
      this.error = null;
      
      try {
        const response = await axios.put(
          `${API_BASE_URL}/email-settings`,
          { settings },
          {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          }
        );
        
        // 更新本地状态
        const updatedSettings = response.data;
        updatedSettings.forEach(updatedSetting => {
          const index = this.settings.findIndex(s => s.settingType === updatedSetting.settingType);
          if (index !== -1) {
            this.settings[index] = updatedSetting;
          } else {
            this.settings.push(updatedSetting);
          }
        });
        
        return response.data;
      } catch (error) {
        console.error('批量更新邮件设置失败:', error);
        this.error = error.response?.data?.message || '批量更新邮件设置失败';
        throw error;
      } finally {
        this.loading = false;
      }
    }
  }
}); 