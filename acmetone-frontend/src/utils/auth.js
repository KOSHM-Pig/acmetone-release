/**
 * 认证相关工具函数
 */

const TOKEN_KEY = 'token';
const USER_KEY = 'user';

/**
 * 获取存储的token
 * @returns {string|null} token字符串或null
 */
export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * 设置token
 * @param {string} token - JWT token
 */
export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

/**
 * 移除token
 */
export function removeToken() {
  localStorage.removeItem(TOKEN_KEY);
}

/**
 * 获取用户信息
 * @returns {Object|null} 用户信息对象或null
 */
export function getUser() {
  const userStr = localStorage.getItem(USER_KEY);
  if (userStr) {
    try {
      return JSON.parse(userStr);
    } catch (error) {
      console.error('解析用户信息失败:', error);
      return null;
    }
  }
  return null;
}

/**
 * 设置用户信息
 * @param {Object} user - 用户信息对象
 */
export function setUser(user) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

/**
 * 移除用户信息
 */
export function removeUser() {
  localStorage.removeItem(USER_KEY);
}

/**
 * 清除所有认证信息
 */
export function clearAuth() {
  removeToken();
  removeUser();
}

/**
 * 检查是否已登录
 * @returns {boolean} 是否已登录
 */
export function isAuthenticated() {
  return !!getToken();
}

/**
 * 检查是否为管理员
 * @returns {boolean} 是否为管理员
 */
export function isAdmin() {
  const user = getUser();
  return user && user.role === 'admin';
}
