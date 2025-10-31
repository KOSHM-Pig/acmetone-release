import { User } from '../models/User'
import { authApi } from '../utils/api'

/**
 * 认证服务类
 * 负责处理所有与认证相关的API调用
 */
export class AuthService {
  /**
   * 用户登录 - 直接连接到acmetone-backend
   * @param {Object} credentials - 登录凭据
   * @param {string} credentials.username - 用户名
   * @param {string} credentials.password - 密码
   * @param {string} credentials.captchaId - 验证码ID (可选)
   * @param {number} credentials.captchaX - 验证码X坐标 (可选)
   * @returns {Promise<Object>} 登录结果
   */
  static async login(credentials) {
    try {
      console.log('[AuthService] 开始登录请求到acmetone-backend')

      // 直接调用acmetone-backend的登录接口
      const response = await authApi.post('/auth/login', {
        username: credentials.username,
        password: credentials.password,
        captchaId: credentials.captchaId,
        captchaX: credentials.captchaX
      })

      // acmetone-backend返回的数据结构: { token, user }
      if (response.data.token) {
        const { token, user: userData } = response.data

        // 创建用户模型实例
        const user = User.fromApiResponse(userData)

        // 保存认证信息
        this.saveAuthData(token, user)

        console.log('[AuthService] 登录成功，已保存认证信息')
        // 不在这里显示成功消息，由调用方处理

        return {
          success: true,
          user,
          token,
          message: '登录成功'
        }
      } else {
        console.error('[AuthService] 登录响应中缺少token')
        return {
          success: false,
          message: '登录失败，服务器响应异常'
        }
      }
    } catch (error) {
      console.error('[AuthService] 登录失败:', error)

      let errorMessage = '登录失败'
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message
      } else if (error.message) {
        errorMessage = error.message
      }

      // 不在这里显示错误消息，由调用方处理

      return {
        success: false,
        message: errorMessage,
        error
      }
    }
  }

  /**
   * 用户注册 - 直接连接到acmetone-backend
   * @param {Object} userData - 注册数据
   * @returns {Promise<Object>} 注册结果
   */
  static async register(userData) {
    try {
      console.log('[AuthService] 开始注册请求到acmetone-backend')

      // 直接调用acmetone-backend的注册接口
      const response = await authApi.post('/users/register', userData)

      // acmetone-backend返回的数据结构: { token, user, message }
      if (response.data.token) {
        const { token, user: userInfo, message } = response.data

        // 创建用户模型实例
        const user = User.fromApiResponse(userInfo)

        // 保存认证信息
        this.saveAuthData(token, user)

        console.log('[AuthService] 注册成功，已保存认证信息')
        // 不在这里显示成功消息，由调用方处理

        return {
          success: true,
          user,
          token,
          message: message || '注册成功'
        }
      } else {
        console.error('[AuthService] 注册响应中缺少token')
        return {
          success: false,
          message: '注册失败，服务器响应异常'
        }
      }
    } catch (error) {
      console.error('[AuthService] 注册失败:', error)

      let errorMessage = '注册失败'
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message
      } else if (error.message) {
        errorMessage = error.message
      }

      // 不在这里显示错误消息，由调用方处理

      return {
        success: false,
        message: errorMessage,
        error
      }
    }
  }

  /**
   * 验证当前token - 直接连接到acmetone-backend
   * @returns {Promise<Object>} 验证结果
   */
  static async verifyToken() {
    try {
      const token = this.getToken()
      if (!token) {
        return { success: false, message: '未找到认证令牌' }
      }

      console.log('[AuthService] 验证token到acmetone-backend')

      // 直接调用acmetone-backend的验证接口
      const response = await authApi.get('/auth/validate')

      // acmetone-backend返回的数据结构: { valid, user }
      if (response.data.valid) {
        const user = User.fromApiResponse(response.data.user)
        this.saveUser(user)

        console.log('[AuthService] Token验证成功')

        return {
          success: true,
          user,
          message: '令牌验证成功'
        }
      } else {
        console.log('[AuthService] Token验证失败')
        this.clearAuthData()
        return {
          success: false,
          message: response.data.message || '令牌验证失败'
        }
      }
    } catch (error) {
      console.error('[AuthService] Token验证错误:', error)
      this.clearAuthData()

      return {
        success: false,
        message: '令牌验证失败',
        error
      }
    }
  }

  /**
   * 发送邮箱验证码 - 直接连接到acmetone-backend
   * @param {Object} data - 验证码请求数据
   * @param {string} data.email - 邮箱地址
   * @param {string} data.captchaId - 验证码ID
   * @param {number} data.captchaX - 验证码X坐标
   * @returns {Promise<Object>} 发送结果
   */
  static async sendVerificationCode(data) {
    try {
      console.log('[AuthService] 发送邮箱验证码到acmetone-backend')

      // 直接调用acmetone-backend的发送验证码接口
      const response = await authApi.post('/users/send-verification-code', data)

      console.log('[AuthService] 验证码发送成功')
      // 不在这里显示成功消息，由调用方处理

      return {
        success: true,
        message: response.data.message || '验证码发送成功'
      }
    } catch (error) {
      console.error('[AuthService] 发送验证码失败:', error)

      let errorMessage = '发送验证码失败'
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message
      }

      // 不在这里显示错误消息，由调用方处理

      return {
        success: false,
        message: errorMessage,
        error
      }
    }
  }

  /**
   * 获取用户信息
   * @returns {Promise<Object>} 用户信息
   */
  static async getUserInfo() {
    try {
      const response = await api.get('/api/auth/me')

      if (response.data.success) {
        const user = User.fromApiResponse(response.data.user)
        this.saveUser(user)
        
        return {
          success: true,
          user,
          message: '获取用户信息成功'
        }
      } else {
        return {
          success: false,
          message: response.data.message || '获取用户信息失败'
        }
      }
    } catch (error) {
      console.error('获取用户信息错误:', error)
      
      return {
        success: false,
        message: '获取用户信息失败',
        error
      }
    }
  }

  /**
   * 用户登出
   * @returns {Promise<Object>} 登出结果
   */
  static async logout() {
    try {
      await api.post('/api/auth/logout')
      this.clearAuthData()
      
      return {
        success: true,
        message: '登出成功'
      }
    } catch (error) {
      console.error('登出错误:', error)
      // 即使API调用失败，也要清除本地数据
      this.clearAuthData()
      
      return {
        success: true,
        message: '登出成功'
      }
    }
  }

  /**
   * 忘记密码
   * @param {string} email - 邮箱地址
   * @returns {Promise<Object>} 结果
   */
  static async forgotPassword(email) {
    try {
      const response = await api.post('/api/auth/forgot-password', { email })

      return {
        success: response.data.success,
        message: response.data.message || '密码重置邮件已发送'
      }
    } catch (error) {
      console.error('忘记密码错误:', error)
      
      return {
        success: false,
        message: error.response?.data?.message || '发送重置邮件失败',
        error
      }
    }
  }

  /**
   * 重置密码
   * @param {Object} resetData - 重置数据
   * @returns {Promise<Object>} 结果
   */
  static async resetPassword(resetData) {
    try {
      const response = await api.post('/api/auth/reset-password', resetData)

      return {
        success: response.data.success,
        message: response.data.message || '密码重置成功'
      }
    } catch (error) {
      console.error('重置密码错误:', error)
      
      return {
        success: false,
        message: error.response?.data?.message || '密码重置失败',
        error
      }
    }
  }

  // ========== 本地存储管理方法 ==========

  /**
   * 保存认证数据
   * @param {string} token - JWT令牌
   * @param {User} user - 用户实例
   */
  static saveAuthData(token, user) {
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(user.toStorageFormat()))
  }

  /**
   * 保存用户信息
   * @param {User} user - 用户实例
   */
  static saveUser(user) {
    localStorage.setItem('user', JSON.stringify(user.toStorageFormat()))
  }

  /**
   * 获取保存的token
   * @returns {string|null} JWT令牌
   */
  static getToken() {
    return localStorage.getItem('token')
  }

  /**
   * 获取保存的用户信息
   * @returns {User|null} 用户实例
   */
  static getUser() {
    try {
      const userData = localStorage.getItem('user')
      if (userData) {
        return User.fromStorageData(JSON.parse(userData))
      }
      return null
    } catch (error) {
      console.error('获取用户数据错误:', error)
      return null
    }
  }

  /**
   * 检查是否已认证
   * @returns {boolean} 是否已认证
   */
  static isAuthenticated() {
    return !!this.getToken() && !!this.getUser()
  }

  /**
   * 清除认证数据
   */
  static clearAuthData() {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }
}
