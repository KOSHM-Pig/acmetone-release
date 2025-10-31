import { mainBackend_STATIC_URL } from '../config/config.js'
import { authApi } from '../utils/api'

/**
 * 用户服务类
 * 负责从acmetone-backend获取用户基本信息（头像、姓名等）
 */
class UserService {
  /**
   * 获取当前用户信息（从acmetone-backend）
   * @returns {Promise<Object>} 用户信息
   */
  static async getCurrentUser() {
    try {
      console.log('[UserService] 从acmetone-backend获取用户信息')

      // 检查token
      const token = localStorage.getItem('token')
      console.log('[UserService] Token状态:', token ? '存在' : '不存在')

      // 直接调用acmetone-backend的用户信息接口
      const response = await authApi.get('/users/me')

      console.log('[UserService] HTTP状态码:', response.status)
      console.log('[UserService] 响应头:', response.headers)
      console.log('[UserService] 响应数据:', response.data)

      // 检查响应数据是否有效
      if (!response.data) {
        throw new Error('响应数据为空')
      }

      return {
        success: true,
        data: {
          id: response.data.id,
          username: response.data.username,
          email: response.data.email,
          nickname: response.data.nickname,
          bio: response.data.bio,
          avatar: response.data.avatar,
          role: response.data.role,
          createdAt: response.data.createdAt,
          updatedAt: response.data.updatedAt
        }
      }
    } catch (error) {
      console.error('[UserService] 获取用户信息失败:', error)
      console.error('[UserService] 错误状态码:', error.response?.status)
      console.error('[UserService] 错误响应:', error.response?.data)
      
      let errorMessage = '获取用户信息失败'
      
      if (error.response) {
        switch (error.response.status) {
          case 401:
            errorMessage = '登录已过期，请重新登录'
            break
          case 404:
            errorMessage = '用户信息不存在'
            break
          default:
            errorMessage = error.response.data?.message || '获取用户信息失败'
        }
      } else if (error.request) {
        errorMessage = '网络连接失败，请检查网络'
      }
      
      return {
        success: false,
        message: errorMessage,
        error
      }
    }
  }

  /**
   * 更新用户信息（到acmetone-backend）
   * @param {Object} userData - 要更新的用户数据
   * @returns {Promise<Object>} 更新结果
   */
  static async updateUser(userData) {
    try {
      console.log('[UserService] 更新用户信息到acmetone-backend:', userData)
      
      const response = await authApi.put('/users/me', userData)
      
      console.log('[UserService] 用户信息更新成功:', response.data)
      
      return {
        success: true,
        data: response.data
      }
    } catch (error) {
      console.error('[UserService] 更新用户信息失败:', error)
      
      let errorMessage = '更新用户信息失败'
      
      if (error.response) {
        switch (error.response.status) {
          case 400:
            errorMessage = error.response.data?.message || '更新信息有误，请检查后重试'
            break
          case 401:
            errorMessage = '登录已过期，请重新登录'
            break
          default:
            errorMessage = error.response.data?.message || '更新用户信息失败'
        }
      } else if (error.request) {
        errorMessage = '网络连接失败，请检查网络'
      }
      
      return {
        success: false,
        message: errorMessage,
        error
      }
    }
  }

  /**
   * 获取用户头像URL
   * @param {string} avatarPath - 头像路径
   * @returns {string} 完整的头像URL
   */
  static getAvatarUrl(avatarPath) {
    if (!avatarPath) {
      return ''
    }

    // 如果已经是完整URL，直接返回
    if (avatarPath.startsWith('http://') || avatarPath.startsWith('https://')) {
      return avatarPath
    }

    // 确保路径以/开头
    const path = avatarPath.startsWith('/') ? avatarPath : `/${avatarPath}`

    return `${mainBackend_STATIC_URL}${path}`
  }

  /**
   * 获取用户显示名称
   * @param {Object} user - 用户对象
   * @returns {string} 显示名称
   */
  static getDisplayName(user) {
    if (!user) {
      return '用户'
    }
    
    // 优先使用昵称，其次用户名
    return user.nickname || user.username || '用户'
  }

  /**
   * 验证用户登录状态
   * @returns {Promise<Object>} 验证结果
   */
  static async validateAuth() {
    try {
      console.log('[UserService] 验证用户登录状态')
      
      const response = await authApi.get('/auth/validate')
      
      if (response.data.valid) {
        return {
          success: true,
          valid: true,
          user: response.data.user
        }
      } else {
        return {
          success: false,
          valid: false,
          message: response.data.message || '登录状态无效'
        }
      }
    } catch (error) {
      console.error('[UserService] 验证登录状态失败:', error)
      
      return {
        success: false,
        valid: false,
        message: '验证登录状态失败',
        error
      }
    }
  }
}

export default UserService
