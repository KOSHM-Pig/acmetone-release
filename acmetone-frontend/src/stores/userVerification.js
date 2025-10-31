import { defineStore } from 'pinia';
import axios from 'axios';
import { API_BASE_URL } from '../config';

export const useUserVerificationStore = defineStore('userVerification', {
  state: () => ({
    verification: null,
    isVerified: false,
    loading: false,
    error: null,
    pendingVerifications: [], // 管理员使用
    lastFetchTime: 0 // 添加最后请求时间，用于缓存控制
  }),

  actions: {
    // 提交实名认证申请
    async submitVerification(verificationData) {
      try {
        this.loading = true;
        this.error = null;
        
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('未登录');
        }
        
        
        
        const response = await axios.post(
          `${API_BASE_URL}/user-verification`,
          verificationData,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        
        this.verification = response.data.verification;
        this.isVerified = this.verification.status === 'approved';
        this.lastFetchTime = Date.now(); // 更新最后请求时间
        
        return response.data;
      } catch (error) {
        console.error('实名认证提交失败:', error);
        
        // 更详细的错误信息
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
          this.error = error.message || '提交实名认证失败';
        }
        
        throw this.error;
      } finally {
        this.loading = false;
      }
    },
    
    // 获取当前用户的认证状态
    async getVerificationStatus(forceRefresh = false) {
      // 如果距离上次请求不足5分钟且不强制刷新，则使用缓存数据
      const CACHE_TIME = 5 * 60 * 1000; // 5分钟缓存
      const now = Date.now();
      
      if (!forceRefresh && 
          this.verification && 
          this.lastFetchTime > 0 && 
          now - this.lastFetchTime < CACHE_TIME) {
        
        return {
          verification: this.verification,
          isVerified: this.isVerified
        };
      }
      
      try {
        this.loading = true;
        this.error = null;
        
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('未登录');
        }
        
        const response = await axios.get(
          `${API_BASE_URL}/user-verification/status`,
          {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        );
        
        this.verification = response.data.verification;
        this.isVerified = response.data.isVerified;
        this.lastFetchTime = now; // 更新最后请求时间
        
        return response.data;
      } catch (error) {
        if (error.response?.status === 404) {
          // 未找到认证信息，设置为未认证状态
          this.verification = null;
          this.isVerified = false;
          this.lastFetchTime = now; // 更新最后请求时间
          return { isVerified: false };
        }
        
        this.error = error.response?.data?.message || '获取认证状态失败';
        throw this.error;
      } finally {
        this.loading = false;
      }
    },
    
    // 获取用户实名认证详细信息
    async getVerificationInfo() {
      try {
        this.loading = true;
        this.error = null;
        
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('未登录');
        }
        
        // 不再使用缓存，每次都重新获取完整的实名认证信息
        
        const response = await axios.get(
          `${API_BASE_URL}/user-verification/current`,
          {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        );
        
       
        
        // 检查API返回的数据结构
        if (response.data) {
          // 如果返回的数据中有verification对象，使用它
          if (response.data.verification) {
            this.verification = response.data.verification;
            this.isVerified = response.data.isVerified || false;
            
            
            
            if (this.verification.status === 'approved') {
              this.lastFetchTime = Date.now();
              
            } else {
              console.warn('用户实名认证状态不是已批准:', this.verification.status);
            }
            
            return this.verification;
          } else {
            // 如果直接返回的就是verification对象
            this.verification = response.data;
            this.isVerified = response.data.status === 'approved';
            
            
            
            if (this.verification.status === 'approved') {
              this.lastFetchTime = Date.now();
              
            } else {
              console.warn('用户实名认证状态不是已批准:', this.verification.status);
            }
            
            return this.verification;
          }
        } else {
          // 如果返回的数据结构不符合预期，抛出错误
          console.error('API返回的数据结构不符合预期:', response.data);
          throw new Error('获取实名认证信息失败，返回的数据结构不正确');
        }
      } catch (error) {
        if (error.response?.status === 404) {
          // 未找到认证信息
          console.warn('未找到用户的实名认证信息');
          return null;
        }
        
        this.error = error.response?.data?.message || '获取认证信息失败';
        console.error('获取实名认证信息失败:', error);
        console.error('错误详情:', {
          status: error.response?.status,
          message: error.response?.data?.message || error.message
        });
        throw this.error;
      } finally {
        this.loading = false;
      }
    },
    
    // 管理员获取所有待审核的认证
    async getPendingVerifications() {
      try {
        this.loading = true;
        this.error = null;
        
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('未登录');
        }
        
        const response = await axios.get(
          `${API_BASE_URL}/user-verification/pending`,
          {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        );
        
        this.pendingVerifications = response.data;
        
        return response.data;
      } catch (error) {
        this.error = error.response?.data?.message || '获取待审核认证失败';
        throw this.error;
      } finally {
        this.loading = false;
      }
    },
    
    // 管理员获取认证详情
    async getVerificationDetails(id) {
      try {
        this.loading = true;
        this.error = null;
        
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('未登录');
        }
        
        const response = await axios.get(
          `${API_BASE_URL}/user-verification/${id}/details`,
          {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        );
        
        return response.data;
      } catch (error) {
        this.error = error.response?.data?.message || '获取认证详情失败';
        throw this.error;
      } finally {
        this.loading = false;
      }
    },
    
    // 管理员审核认证
    async reviewVerification(id, status, comment) {
      try {
        this.loading = true;
        this.error = null;
        
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('未登录');
        }
        
        const response = await axios.post(
          `${API_BASE_URL}/user-verification/${id}/review`,
          { status, comment },
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        // 更新待审核列表
        await this.getPendingVerifications();
        
        return response.data;
      } catch (error) {
        this.error = error.response?.data?.message || '审核认证失败';
        throw this.error;
      } finally {
        this.loading = false;
      }
    },
    
    // 重置状态
    resetState() {
      this.verification = null;
      this.isVerified = false;
      this.loading = false;
      this.error = null;
      this.pendingVerifications = [];
      this.lastFetchTime = 0; // 重置最后请求时间
    }
  }
}); 