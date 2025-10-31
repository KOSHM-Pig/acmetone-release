/**
 * 登录状态检测器
 * 用于定期检查用户登录状态是否有效，避免前端显示已登录但实际已过期的情况
 */

import axios from 'axios';
import { ElMessage } from 'element-plus';
import { API_BASE_URL } from '@/config';
import router from '@/router';

class AuthChecker {
  constructor() {
    this.checkInterval = 5 * 60 * 1000; // 默认每5分钟检查一次
    this.timer = null;
    this.isChecking = false;
    
    // 添加页面可见性变化事件监听
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    
    // 添加页面加载完成事件监听
    window.addEventListener('load', this.onPageLoad.bind(this));
  }

  /**
   * 页面加载完成时触发
   */
  onPageLoad() {
    console.log('[Auth Checker] 页面加载完成，立即检查登录状态');
    // 如果有token，立即检查登录状态
    if (localStorage.getItem('token')) {
      this.checkAuthStatus();
    }
  }

  /**
   * 处理页面可见性变化
   */
  handleVisibilityChange() {
    // 当页面从隐藏变为可见时，检查登录状态
    if (document.visibilityState === 'visible' && localStorage.getItem('token')) {
      console.log('[Auth Checker] 页面变为可见，检查登录状态');
      this.checkAuthStatus();
    }
  }

  /**
   * 开始定期检查登录状态
   * @param {number} interval - 检查间隔时间（毫秒）
   */
  startChecking(interval) {
    if (interval) {
      this.checkInterval = interval;
    }
    
    // 清除之前的定时器
    if (this.timer) {
      clearInterval(this.timer);
    }
    
    // 立即检查一次
    this.checkAuthStatus();
    
    // 设置定期检查
    this.timer = setInterval(() => {
      this.checkAuthStatus();
    }, this.checkInterval);
    
    console.log(`[Auth Checker] 已启动登录状态检测，检查间隔: ${this.checkInterval / 1000}秒`);
  }

  /**
   * 停止检查登录状态
   */
  stopChecking() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      console.log('[Auth Checker] 已停止登录状态检测');
    }
  }

  /**
   * 检查登录状态是否有效
   */
  async checkAuthStatus() {
    // 如果正在检查或没有token，则跳过
    if (this.isChecking || !localStorage.getItem('token')) {
      return;
    }
    
    this.isChecking = true;
    
    try {
      // 发送请求到后端验证接口
      const response = await axios.get(`${API_BASE_URL}/auth/validate`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        timeout: 5000 // 5秒超时
      });
      
      // 检查响应状态
      if (response.status === 200 && response.data && response.data.valid) {
        // 登录状态有效，不做处理
        console.log('[Auth Checker] 登录状态有效');
      } else {
        // 登录状态无效，执行登出操作
        console.warn('[Auth Checker] 登录状态无效，执行登出操作');
        this.handleInvalidAuth('登录已过期，请重新登录');
        // 停止检查，避免重复检查
        this.stopChecking();
      }
    } catch (error) {
      // 请求失败，可能是网络问题或后端返回错误
      console.error('[Auth Checker] 检查登录状态失败:', error);
      
      // 如果是401或403错误，说明登录已失效
      if (error.response && (error.response.status === 401 || error.response.status === 403)) {
        this.handleInvalidAuth('登录已过期，请重新登录');
        // 停止检查，避免重复检查
        this.stopChecking();
      } 
      // 其他错误（如网络问题）不做处理，等待下次检查
    } finally {
      this.isChecking = false;
    }
  }

  /**
   * 处理无效的登录状态
   * @param {string} message - 提示消息
   */
  handleInvalidAuth(message) {
    // 清除登录信息
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('userInfo');
    
    // 显示提示消息
    ElMessage({
      message,
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
  }

  /**
   * 手动触发检查
   */
  manualCheck() {
    console.log('[Auth Checker] 手动触发登录状态检查');
    this.checkAuthStatus();
  }
}

// 创建单例
const authChecker = new AuthChecker();
export default authChecker; 