/**
 * 用户状态管理
 * 
 * 该模块提供了用户状态管理，包括登录、注册、获取用户信息、更新用户信息等功能。
 * 支持与Acmetone主系统的用户数据同步。
 * 
 * @module stores/user
 * @requires pinia
 * @requires ../api/auth
 */

import { defineStore } from 'pinia';
import {
  login as apiLogin,
  register as apiRegister,
  getCurrentUser,
  updateUser as apiUpdateUser,
  updateAvatar as apiUpdateAvatar,
  User,
  LoginRequest,
  RegisterRequest,
  UpdateUserRequest,
} from '@/api/auth';

export interface UserState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

/**
 * 用户状态管理
 */
export const useUserStore = defineStore('user', {
  state: (): UserState => ({
    user: null,
    token: localStorage.getItem('token'),
    isAuthenticated: !!localStorage.getItem('token'),
    loading: false,
    error: null,
  }),

  getters: {
    /**
     * 获取当前用户
     * @returns {User | null} 当前用户信息
     */
    currentUser: (state) => state.user,

    /**
     * 检查用户是否已登录
     * @returns {boolean} 是否已登录
     */
    isLoggedIn: (state) => state.isAuthenticated,
  },

  actions: {
    /**
     * 设置用户信息
     * @param {User} user - 用户信息
     */
    setUser(user: User) {
      this.user = user;
    },

    /**
     * 设置token
     * @param {string} token - JWT令牌
     */
    setToken(token: string) {
      this.token = token;
      this.isAuthenticated = true;
      localStorage.setItem('token', token);
    },

    /**
     * 清除用户信息
     */
    clearUser() {
      this.user = null;
      this.token = null;
      this.isAuthenticated = false;
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    },

    /**
     * 用户登录
     * 登录时会自动与Acmetone主系统同步用户数据
     * 
     * @param {LoginRequest} credentials - 登录凭证
     * @returns {Promise<void>}
     */
    async login(credentials: LoginRequest) {
      this.loading = true;
      this.error = null;
      try {
        const response = await apiLogin(credentials);
        this.setUser(response.data.user);
        this.setToken(response.data.token);
        // 保存用户信息到本地存储，方便刷新页面后恢复
        localStorage.setItem('user', JSON.stringify(response.data.user));
      } catch (error: any) {
        this.error = error.response?.data?.message || '登录失败，请检查用户名和密码';
        throw error;
      } finally {
        this.loading = false;
      }
    },

    /**
     * 用户注册
     * 注册时会自动将新用户同步到Acmetone主系统
     * 
     * @param {RegisterRequest} userData - 注册数据
     * @returns {Promise<void>}
     */
    async register(userData: RegisterRequest) {
      this.loading = true;
      this.error = null;
      try {
        const response = await apiRegister(userData);
        return response.data;
      } catch (error: any) {
        this.error = error.response?.data?.message || '注册失败，请稍后再试';
        throw error;
      } finally {
        this.loading = false;
      }
    },

    /**
     * 用户登出
     */
    logout() {
      this.clearUser();
    },

    /**
     * 获取当前用户信息
     * 获取信息时会检查并同步Acmetone主系统中的最新用户数据
     * 
     * @returns {Promise<void>}
     */
    async fetchCurrentUser() {
      if (!this.token) return;

      this.loading = true;
      this.error = null;
      try {
        const response = await getCurrentUser();
        this.setUser(response.data);
        // 更新本地存储中的用户信息
        localStorage.setItem('user', JSON.stringify(response.data));
      } catch (error: any) {
        if (error.response?.status === 401) {
          this.clearUser();
        }
        this.error = error.response?.data?.message || '获取用户信息失败';
        throw error;
      } finally {
        this.loading = false;
      }
    },

    /**
     * 更新用户信息
     * 
     * @param {UpdateUserRequest} userData - 更新数据
     * @returns {Promise<void>}
     */
    async updateUser(userData: UpdateUserRequest) {
      if (!this.token) return;

      this.loading = true;
      this.error = null;
      try {
        const response = await apiUpdateUser(userData);
        this.setUser(response.data);
        // 更新本地存储中的用户信息
        localStorage.setItem('user', JSON.stringify(response.data));
      } catch (error: any) {
        this.error = error.response?.data?.message || '更新用户信息失败';
        throw error;
      } finally {
        this.loading = false;
      }
    },

    /**
     * 更新用户头像
     * 
     * @param {File} file - 头像文件
     * @returns {Promise<void>}
     */
    async updateAvatar(file: File) {
      if (!this.token) return;

      this.loading = true;
      this.error = null;
      try {
        const formData = new FormData();
        formData.append('avatar', file);

        const response = await apiUpdateAvatar(formData);
        this.setUser(response.data);
        // 更新本地存储中的用户信息
        localStorage.setItem('user', JSON.stringify(response.data));
      } catch (error: any) {
        this.error = error.response?.data?.message || '更新头像失败';
        throw error;
      } finally {
        this.loading = false;
      }
    },

    /**
     * 初始化用户状态
     * 从本地存储恢复用户信息
     */
    initializeUser() {
      const userJson = localStorage.getItem('user');
      if (userJson) {
        try {
          this.user = JSON.parse(userJson);
        } catch (error) {
          localStorage.removeItem('user');
        }
      }
    },
  },
}); 