import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { AuthService } from '../services/AuthService'
import { User } from '../models/User'

/**
 * 认证状态管理Store
 */
export const useAuthStore = defineStore('auth', () => {
  // ========== 状态 ==========
  const user = ref(null)
  const token = ref(null)
  const loading = ref(false)
  const error = ref(null)

  // ========== 计算属性 ==========
  const isAuthenticated = computed(() => {
    return !!token.value && !!user.value
  })

  const isAdmin = computed(() => {
    return user.value?.isAdmin || false
  })

  const userDisplayName = computed(() => {
    return user.value?.getDisplayName() || '未知用户'
  })

  const userAvatarUrl = computed(() => {
    return user.value?.getAvatarUrl() || ''
  })

  // ========== 操作方法 ==========

  /**
   * 初始化认证状态（从本地存储恢复）
   */
  const initAuth = () => {
    try {
      const savedToken = AuthService.getToken()
      const savedUser = AuthService.getUser()

      if (savedToken && savedUser) {
        token.value = savedToken
        user.value = savedUser
        console.log('认证状态已从本地存储恢复')
      }
    } catch (error) {
      console.error('初始化认证状态失败:', error)
      clearAuth()
    }
  }

  /**
   * 用户登录
   * @param {Object} credentials - 登录凭据
   * @returns {Promise<Object>} 登录结果
   */
  const login = async (credentials) => {
    loading.value = true
    error.value = null

    try {
      const result = await AuthService.login(credentials)

      if (result.success) {
        token.value = result.token
        user.value = result.user
        console.log('用户登录成功:', result.user.getDisplayName())
      } else {
        error.value = result.message
      }

      return result
    } catch (err) {
      const errorMessage = '登录过程中发生错误'
      error.value = errorMessage
      console.error('登录错误:', err)
      
      return {
        success: false,
        message: errorMessage,
        error: err
      }
    } finally {
      loading.value = false
    }
  }

  /**
   * 用户注册
   * @param {Object} userData - 注册数据
   * @returns {Promise<Object>} 注册结果
   */
  const register = async (userData) => {
    loading.value = true
    error.value = null

    try {
      const result = await AuthService.register(userData)

      if (!result.success) {
        error.value = result.message
      }

      return result
    } catch (err) {
      const errorMessage = '注册过程中发生错误'
      error.value = errorMessage
      console.error('注册错误:', err)
      
      return {
        success: false,
        message: errorMessage,
        error: err
      }
    } finally {
      loading.value = false
    }
  }

  /**
   * 验证当前token
   * @returns {Promise<Object>} 验证结果
   */
  const verifyToken = async () => {
    if (!token.value) {
      return { success: false, message: '未找到认证令牌' }
    }

    loading.value = true

    try {
      const result = await AuthService.verifyToken()

      if (result.success) {
        user.value = result.user
      } else {
        clearAuth()
      }

      return result
    } catch (err) {
      console.error('令牌验证错误:', err)
      clearAuth()
      
      return {
        success: false,
        message: '令牌验证失败',
        error: err
      }
    } finally {
      loading.value = false
    }
  }

  /**
   * 获取用户信息
   * @returns {Promise<Object>} 用户信息
   */
  const fetchUserInfo = async () => {
    loading.value = true

    try {
      const result = await AuthService.getUserInfo()

      if (result.success) {
        user.value = result.user
      }

      return result
    } catch (err) {
      console.error('获取用户信息错误:', err)
      
      return {
        success: false,
        message: '获取用户信息失败',
        error: err
      }
    } finally {
      loading.value = false
    }
  }

  /**
   * 用户登出
   * @returns {Promise<Object>} 登出结果
   */
  const logout = async () => {
    loading.value = true

    try {
      const result = await AuthService.logout()
      clearAuth()
      console.log('用户已登出')
      return result
    } catch (err) {
      console.error('登出错误:', err)
      // 即使API调用失败，也要清除本地状态
      clearAuth()
      
      return {
        success: true,
        message: '登出成功'
      }
    } finally {
      loading.value = false
    }
  }

  /**
   * 忘记密码
   * @param {string} email - 邮箱地址
   * @returns {Promise<Object>} 结果
   */
  const forgotPassword = async (email) => {
    loading.value = true
    error.value = null

    try {
      const result = await AuthService.forgotPassword(email)

      if (!result.success) {
        error.value = result.message
      }

      return result
    } catch (err) {
      const errorMessage = '发送重置邮件失败'
      error.value = errorMessage
      console.error('忘记密码错误:', err)
      
      return {
        success: false,
        message: errorMessage,
        error: err
      }
    } finally {
      loading.value = false
    }
  }

  /**
   * 重置密码
   * @param {Object} resetData - 重置数据
   * @returns {Promise<Object>} 结果
   */
  const resetPassword = async (resetData) => {
    loading.value = true
    error.value = null

    try {
      const result = await AuthService.resetPassword(resetData)

      if (!result.success) {
        error.value = result.message
      }

      return result
    } catch (err) {
      const errorMessage = '密码重置失败'
      error.value = errorMessage
      console.error('重置密码错误:', err)
      
      return {
        success: false,
        message: errorMessage,
        error: err
      }
    } finally {
      loading.value = false
    }
  }

  /**
   * 更新用户信息
   * @param {Object} updates - 更新的数据
   */
  const updateUser = (updates) => {
    if (user.value) {
      user.value.update(updates)
      AuthService.saveUser(user.value)
    }
  }

  /**
   * 清除认证状态
   */
  const clearAuth = () => {
    user.value = null
    token.value = null
    error.value = null
    AuthService.clearAuthData()
  }

  /**
   * 清除错误状态
   */
  const clearError = () => {
    error.value = null
  }

  /**
   * 检查用户权限
   * @param {string} permission - 权限名称
   * @returns {boolean} 是否有权限
   */
  const hasPermission = (permission) => {
    return user.value?.hasPermission(permission) || false
  }

  // 返回store的状态和方法
  return {
    // 状态
    user,
    token,
    loading,
    error,
    
    // 计算属性
    isAuthenticated,
    isAdmin,
    userDisplayName,
    userAvatarUrl,
    
    // 方法
    initAuth,
    login,
    register,
    verifyToken,
    fetchUserInfo,
    logout,
    forgotPassword,
    resetPassword,
    updateUser,
    clearAuth,
    clearError,
    hasPermission
  }
})
