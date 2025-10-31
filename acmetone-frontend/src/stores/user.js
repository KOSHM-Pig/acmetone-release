import { defineStore } from 'pinia';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import router from '../router';

export const useUserStore = defineStore('user', {
  state: () => ({
    user: null,
    loading: false,
    error: null,
    heartbeatTimer: null, // 添加心跳包定时器
    lastHeartbeat: 0 // 上次心跳包时间
  }),

  getters: {
    isAuthenticated: (state) => !!state.user,
    isAdmin: (state) => state.user?.role === 'admin',
    token: (state) => state.user?.token,
    isEmailVerified: (state) => state.user?.isEmailVerified || false
  },

  actions: {
    // 将用户信息保存到localStorage
    persistUserInfo() {
      if (this.user) {
        // 不存储token，因为已单独存储
        const userInfo = { ...this.user };
        delete userInfo.token;
        localStorage.setItem('userInfo', JSON.stringify(userInfo));
        
      }
    },

    // 从localStorage加载用户信息
    loadUserInfo() {
      const token = localStorage.getItem('token');
      const userInfoStr = localStorage.getItem('userInfo');
      
      if (token && userInfoStr) {
        try {
          const userInfo = JSON.parse(userInfoStr);
          this.user = { 
            ...userInfo, 
            token,
            // 确保这些字段存在，即使是null值
            avatar: userInfo.avatar || null,
            nickname: userInfo.nickname || null,
            bio: userInfo.bio || null
          };
          
          return true;
        } catch (e) {
          
          localStorage.removeItem('userInfo');
          return false;
        }
      }
      return false;
    },

    // 初始化用户状态
    async init() {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          // 设置请求头
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          // 先尝试从localStorage加载用户信息
          const loadedFromCache = this.loadUserInfo();
          
          // 如果没有从缓存加载成功，则从服务器获取
          if (!loadedFromCache) {
            await this.fetchUserInfo();
          }
          
          // 启动心跳包
          this.startHeartbeat();
        } catch (error) {
          console.error('初始化用户状态失败:', error);
          // 清除无效的token
          this.logout();
        }
      } else {
        // 没有token时确保状态是清空的
        this.logout();
      }
    },

    // 登录
    async login(credentials) {
      try {
        this.loading = true;
        this.error = null;
        
        // 清除可能存在的旧token
        localStorage.removeItem('token');
        localStorage.removeItem('userInfo');
        delete axios.defaults.headers.common['Authorization'];
        
        // 使用传入的所有凭据
        const response = await axios.post(`${API_BASE_URL}/users/login`, credentials);
        
        const { token, user, needVerification } = response.data;
        this.user = { ...user, token };
        
        // 保存token到localStorage
        localStorage.setItem('token', token);
        this.persistUserInfo();
        
        // 设置全局请求头
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        // 启动心跳包
        this.startHeartbeat();
        
        this.loading = false;
        
        // 返回是否需要验证邮箱
        return { needVerification };
      } catch (error) {
        this.loading = false;
        
        // 直接使用后端返回的错误消息
        if (error.response) {
          this.error = error.response.data?.message || `请求失败，错误码: ${error.response.status}`;
        } else {
          this.error = '网络错误，请检查您的网络连接';
        }
        
        throw error;
      }
    },

    // 发送验证码
    async sendVerificationCode(email) {
      try {
       
        this.loading = true;
        
        
        
        // 发送请求
        const response = await axios.post(`${API_BASE_URL}/users/send-verification-code`, { email });
        
        // 记录响应信息
        
        
        this.loading = false;
        
        return response.data;
      } catch (error) {
        this.loading = false;
        
        
        
        // 详细记录错误信息
        if (error.response) {
          
          
          this.error = error.response.data?.message || '验证码发送失败';
        } else if (error.request) {
          
          this.error = '服务器无响应，请稍后重试';
        } else {
          
          this.error = '网络错误，请检查您的网络连接';
        }
        
        
        
        throw error;
      }
    },

    // 注册
    async register(userData) {
      try {
        
        this.loading = true;
        
        // 记录请求前的信息
        
        
        // 发送请求
        const response = await axios.post(`${API_BASE_URL}/users/register`, userData);
        
        // 记录响应信息
        
        
        this.loading = false;
        
        return response.data;
      } catch (error) {
        this.loading = false;
        
        
        
        // 详细记录错误信息
        if (error.response) {
          
          
          // 根据错误状态码设置友好的错误信息
          switch (error.response.status) {
            case 400:
              this.error = error.response.data?.message || '注册信息有误，请检查后重试';
              
              break;
            case 409:
              this.error = '用户名或邮箱已被使用';
              
              break;
            default:
              this.error = error.response.data?.message || '注册失败';
              
          }
        } else if (error.request) {
          // 请求已发送但没有收到响应
          
          this.error = '服务器无响应，请稍后重试';
        } else {
          // 设置请求时发生的错误
          
          this.error = '网络错误，请检查您的网络连接';
        }
        
        
        
        throw error;
      }
    },

    // 重新发送验证邮件
    async resendVerificationEmail() {
      try {
        this.loading = true;
        const response = await axios.post(`${API_BASE_URL}/users/resend-verification`);
        this.loading = false;
        return response.data;
      } catch (error) {
        this.loading = false;
        
        if (error.response) {
          this.error = error.response.data?.message || '发送验证邮件失败';
        } else {
          this.error = '网络错误，请检查您的网络连接';
        }
        
        throw error;
      }
    },

    // 忘记密码 - 发送重置邮件
    async forgotPassword(email) {
      try {
        this.loading = true;
        const response = await axios.post(`${API_BASE_URL}/users/forgot-password`, { email });
        this.loading = false;
        return response.data;
      } catch (error) {
        this.loading = false;
        
        if (error.response) {
          this.error = error.response.data?.message || '发送重置邮件失败';
        } else {
          this.error = '网络错误，请检查您的网络连接';
        }
        
        throw error;
      }
    },

    // 重置密码
    async resetPassword(token, newPassword) {
      try {
        this.loading = true;
        const response = await axios.post(`${API_BASE_URL}/users/reset-password`, { 
          token, 
          newPassword 
        });
        this.loading = false;
        return response.data;
      } catch (error) {
        this.loading = false;
        
        if (error.response) {
          this.error = error.response.data?.message || '重置密码失败';
        } else {
          this.error = '网络错误，请检查您的网络连接';
        }
        
        throw error;
      }
    },

    // 登出
    logout() {
      this.user = null;
      this.loading = false;
      this.error = null;
      
      // 停止心跳包
      this.stopHeartbeat();
      
      // 清除localStorage中的token和用户信息
      localStorage.removeItem('token');
      localStorage.removeItem('userInfo');
      
      // 清除axios请求头
      delete axios.defaults.headers.common['Authorization'];
      
      // 跳转到登录页面
      // 避免在当前页面是登录页时重复跳转
      if (router.currentRoute.value.path !== '/login') {
        router.push('/login');
      }
    },

    // 启动心跳包
    startHeartbeat() {
      // 清除可能存在的旧定时器
      if (this.heartbeatTimer) {
        clearInterval(this.heartbeatTimer);
        this.heartbeatTimer = null;
      }
      
      // 设置心跳包间隔 (5分钟发送一次)
      const HEARTBEAT_INTERVAL = 5 * 60 * 1000;
      
      this.lastHeartbeat = Date.now();
      
      this.heartbeatTimer = setInterval(async () => {
        try {
          // 只有在用户已登录的情况下发送心跳包
          if (this.isAuthenticated) {
            console.log('发送心跳包，刷新令牌...');
            const response = await axios.post(`${API_BASE_URL}/auth/heartbeat`);
            
            // 检查响应中的valid字段
            if (response.data && response.data.valid === false) {
              console.warn('心跳包响应表明登录状态无效，执行登出');
              this.logout();
              return;
            }
            
            // 更新token
            const newToken = response.data.token;
            if (newToken) {
              // 更新store中的token
              this.user = { ...this.user, token: newToken };
              
              // 更新localStorage中的token
              localStorage.setItem('token', newToken);
              
              // 更新axios请求头
              axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
              
              console.log('令牌已成功刷新');
              this.lastHeartbeat = Date.now();
            }
          }
        } catch (error) {
          console.error('心跳包发送失败:', error);
          // 如果是认证错误，则可能是token已失效，立即登出
          if (error.response && (error.response.status === 401 || error.response.status === 403)) {
            console.warn('令牌已失效，执行登出操作');
            this.logout();
          }
          // 不再重试，直接等待下一个心跳周期
        }
      }, HEARTBEAT_INTERVAL);
      
      console.log('心跳包定时器已启动');
    },
    
    // 停止心跳包
    stopHeartbeat() {
      if (this.heartbeatTimer) {
        clearInterval(this.heartbeatTimer);
        this.heartbeatTimer = null;
        console.log('心跳包定时器已停止');
      }
    },
    
    // 手动发送心跳包
    async sendHeartbeat() {
      try {
        if (!this.isAuthenticated) {
          console.warn('用户未登录，无法发送心跳包');
          throw new Error('用户未登录，无法发送心跳包');
        }
        
        const response = await axios.post(`${API_BASE_URL}/auth/heartbeat`);
        
        // 检查响应中的valid字段
        if (response.data && response.data.valid === false) {
          console.warn('心跳包响应表明登录状态无效，执行登出');
          this.logout();
          return false;
        }
        
        // 更新token
        const newToken = response.data.token;
        if (newToken) {
          // 更新store中的token
          this.user = { ...this.user, token: newToken };
          
          // 更新localStorage中的token
          localStorage.setItem('token', newToken);
          
          // 更新axios请求头
          axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
          
          this.lastHeartbeat = Date.now();
          return true;
        }
        return false;
      } catch (error) {
        console.error('手动发送心跳包失败:', error);
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
          // 立即登出，不再重试
          this.logout();
        }
        throw error;
      }
    },

    // 获取用户信息
    async fetchUserInfo() {
      try {
        this.loading = true;
        this.error = null;
        
        // 如果没有token，直接抛出错误
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('未登录状态');
        }
        
        // 添加时间戳防止缓存
        const timestamp = Date.now();
        
        const response = await axios.get(`${API_BASE_URL}/users/me?t=${timestamp}`);
        
        // 记录原始响应数据
        
        
        
        
        this.user = { ...response.data, token };
        
        // 保存用户信息到localStorage
        this.persistUserInfo();
        
        this.loading = false;
        return this.user;
      } catch (error) {
        this.loading = false;
        
        if (error.response) {
          switch (error.response.status) {
            case 401:
              this.error = '登录已过期，请重新登录';
              break;
            case 404:
              this.error = '用户信息不存在';
              break;
            default:
              this.error = error.response.data?.message || '获取用户信息失败';
          }
        } else {
          this.error = error.message || '网络错误，请检查您的网络连接';
        }
        
        // 清除无效的token
        this.logout();
        throw error;
      }
    },

    // 更新用户信息
    async updateUserInfo(userData) {
      try {
        this.loading = true;
        const response = await axios.put(`${API_BASE_URL}/users/me`, userData);
        this.user = { ...response.data, token: this.user?.token };
        
        // 保存更新后的用户信息到localStorage
        this.persistUserInfo();
        
        this.loading = false;
      } catch (error) {
        this.loading = false;
        
        if (error.response) {
          switch (error.response.status) {
            case 400:
              this.error = error.response.data?.message || '更新信息有误，请检查后重试';
              break;
            case 401:
              this.error = '登录已过期，请重新登录';
              break;
            default:
              this.error = error.response.data?.message || '更新用户信息失败';
          }
        } else {
          this.error = '网络错误，请检查您的网络连接';
        }
        
        throw error;
      }
    },

    // 清除错误
    clearError() {
      this.error = null;
    },

    // 管理员获取所有用户
    async getAllUsers({ page = 1, pageSize = 20 } = {}) {
      try {
        // 检查是否是管理员
        if (!this.isAdmin) {
          throw new Error('权限不足');
        }

        this.loading = true;
        this.error = null;
        
        const response = await axios.get(`${API_BASE_URL}/admin/users`, {
          params: { page, pageSize }
        });
        
        this.loading = false;
        return response.data;
      } catch (error) {
        this.loading = false;
        
        if (error.response) {
          this.error = error.response.data?.message || '获取用户列表失败';
        } else {
          this.error = error.message || '网络错误，请检查您的网络连接';
        }
        
        throw this.error;
      }
    },
    
    // 管理员搜索用户
    async searchUsers({ keyword, page = 1, pageSize = 20 } = {}) {
      try {
        // 检查是否是管理员
        if (!this.isAdmin) {
          throw new Error('权限不足');
        }

        this.loading = true;
        this.error = null;
        
        const response = await axios.get(`${API_BASE_URL}/admin/users/search`, {
          params: { keyword, page, pageSize }
        });
        
        this.loading = false;
        return response.data;
      } catch (error) {
        this.loading = false;
        
        if (error.response) {
          this.error = error.response.data?.message || '搜索用户失败';
        } else {
          this.error = error.message || '网络错误，请检查您的网络连接';
        }
        
        throw this.error;
      }
    },
    
    // 管理员获取用户详情
    async getUserDetails(userId) {
      try {
        // 检查是否是管理员
        if (!this.isAdmin) {
          throw new Error('权限不足');
        }

        this.loading = true;
        this.error = null;
        
        const response = await axios.get(`${API_BASE_URL}/admin/users/${userId}`);
        
        this.loading = false;
        return response.data;
      } catch (error) {
        this.loading = false;
        
        if (error.response) {
          this.error = error.response.data?.message || '获取用户详情失败';
        } else {
          this.error = error.message || '网络错误，请检查您的网络连接';
        }
        
        throw this.error;
      }
    },
    
    // 管理员更新用户信息
    async updateUser(userData) {
      try {
        // 检查是否是管理员
        if (!this.isAdmin) {
          throw new Error('权限不足');
        }

        this.loading = true;
        this.error = null;
        
        const response = await axios.put(`${API_BASE_URL}/admin/users/${userData.id}`, userData);
        
        this.loading = false;
        return response.data;
      } catch (error) {
        this.loading = false;
        
        if (error.response) {
          this.error = error.response.data?.message || '更新用户信息失败';
        } else {
          this.error = error.message || '网络错误，请检查您的网络连接';
        }
        
        throw this.error;
      }
    },
    
    // 管理员更改用户状态（启用/禁用）
    async updateUserStatus(userId, isActive) {
      try {
        // 检查是否是管理员
        if (!this.isAdmin) {
          throw new Error('权限不足');
        }

        this.loading = true;
        this.error = null;
        
        const response = await axios.patch(`${API_BASE_URL}/admin/users/${userId}/status`, {
          isActive
        });
        
        this.loading = false;
        return response.data;
      } catch (error) {
        this.loading = false;
        
        if (error.response) {
          this.error = error.response.data?.message || '更改用户状态失败';
        } else {
          this.error = error.message || '网络错误，请检查您的网络连接';
        }
        
        throw this.error;
      }
    }
  }
}); 