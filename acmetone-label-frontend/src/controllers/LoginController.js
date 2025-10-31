import { ElMessage } from 'element-plus'
import { useAuthStore } from '../stores/authStore'
import { useRouter } from 'vue-router'

/**
 * 登录控制器
 * 负责处理登录相关的业务逻辑和用户交互
 */
export class LoginController {
  constructor() {
    this.authStore = useAuthStore()
    this.router = useRouter()
  }

  /**
   * 处理用户登录
   * @param {Object} formData - 登录表单数据
   * @param {Function} onSuccess - 成功回调
   * @param {Function} onError - 错误回调
   * @returns {Promise<boolean>} 登录是否成功
   */
  async handleLogin(formData, onSuccess, onError) {
    try {
      // 验证表单数据
      const validation = this.validateLoginForm(formData)
      if (!validation.isValid) {
        ElMessage.warning(validation.errors[0])
        if (onError) onError(validation.errors[0])
        return false
      }

      // 执行登录
      const result = await this.authStore.login({
        username: formData.username,
        password: formData.password
      })

      if (result.success) {
        ElMessage.success(result.message || '登录成功')
        
        // 执行成功回调
        if (onSuccess) {
          onSuccess(result)
        } else {
          // 默认跳转行为
          this.handleLoginSuccess(result.user)
        }
        
        return true
      } else {
        ElMessage.error(result.message || '登录失败')
        if (onError) onError(result.message)
        return false
      }
    } catch (error) {
      console.error('登录控制器错误:', error)
      const errorMessage = '登录过程中发生错误，请稍后再试'
      ElMessage.error(errorMessage)
      if (onError) onError(errorMessage)
      return false
    }
  }

  /**
   * 处理登录成功后的跳转
   * @param {User} user - 用户实例
   */
  handleLoginSuccess(user) {
    // 根据用户角色决定跳转目标
    if (user.isAdmin) {
      this.router.push('/admin/dashboard')
    } else {
      this.router.push('/dashboard')
    }
  }

  /**
   * 处理用户注册
   * @param {Object} formData - 注册表单数据
   * @param {Function} onSuccess - 成功回调
   * @param {Function} onError - 错误回调
   * @returns {Promise<boolean>} 注册是否成功
   */
  async handleRegister(formData, onSuccess, onError) {
    try {
      // 验证表单数据
      const validation = this.validateRegisterForm(formData)
      if (!validation.isValid) {
        ElMessage.warning(validation.errors[0])
        if (onError) onError(validation.errors[0])
        return false
      }

      // 执行注册
      const result = await this.authStore.register(formData)

      if (result.success) {
        ElMessage.success(result.message || '注册成功')
        if (onSuccess) onSuccess(result)
        return true
      } else {
        ElMessage.error(result.message || '注册失败')
        if (onError) onError(result.message)
        return false
      }
    } catch (error) {
      console.error('注册控制器错误:', error)
      const errorMessage = '注册过程中发生错误，请稍后再试'
      ElMessage.error(errorMessage)
      if (onError) onError(errorMessage)
      return false
    }
  }

  /**
   * 处理忘记密码
   * @param {string} email - 邮箱地址
   * @param {Function} onSuccess - 成功回调
   * @param {Function} onError - 错误回调
   * @returns {Promise<boolean>} 是否成功
   */
  async handleForgotPassword(email, onSuccess, onError) {
    try {
      if (!email || !this.validateEmail(email)) {
        const errorMessage = '请输入有效的邮箱地址'
        ElMessage.warning(errorMessage)
        if (onError) onError(errorMessage)
        return false
      }

      const result = await this.authStore.forgotPassword(email)

      if (result.success) {
        ElMessage.success(result.message || '重置邮件已发送')
        if (onSuccess) onSuccess(result)
        return true
      } else {
        ElMessage.error(result.message || '发送重置邮件失败')
        if (onError) onError(result.message)
        return false
      }
    } catch (error) {
      console.error('忘记密码控制器错误:', error)
      const errorMessage = '发送重置邮件失败，请稍后再试'
      ElMessage.error(errorMessage)
      if (onError) onError(errorMessage)
      return false
    }
  }

  /**
   * 处理密码重置
   * @param {Object} resetData - 重置数据
   * @param {Function} onSuccess - 成功回调
   * @param {Function} onError - 错误回调
   * @returns {Promise<boolean>} 是否成功
   */
  async handleResetPassword(resetData, onSuccess, onError) {
    try {
      const validation = this.validateResetPasswordForm(resetData)
      if (!validation.isValid) {
        ElMessage.warning(validation.errors[0])
        if (onError) onError(validation.errors[0])
        return false
      }

      const result = await this.authStore.resetPassword(resetData)

      if (result.success) {
        ElMessage.success(result.message || '密码重置成功')
        if (onSuccess) onSuccess(result)
        return true
      } else {
        ElMessage.error(result.message || '密码重置失败')
        if (onError) onError(result.message)
        return false
      }
    } catch (error) {
      console.error('重置密码控制器错误:', error)
      const errorMessage = '密码重置失败，请稍后再试'
      ElMessage.error(errorMessage)
      if (onError) onError(errorMessage)
      return false
    }
  }

  /**
   * 处理用户登出
   * @param {Function} onSuccess - 成功回调
   * @returns {Promise<boolean>} 是否成功
   */
  async handleLogout(onSuccess) {
    try {
      const result = await this.authStore.logout()
      
      ElMessage.success('已成功登出')
      
      if (onSuccess) {
        onSuccess(result)
      } else {
        // 默认跳转到登录页
        this.router.push('/login')
      }
      
      return true
    } catch (error) {
      console.error('登出控制器错误:', error)
      ElMessage.error('登出失败，请稍后再试')
      return false
    }
  }

  // ========== 表单验证方法 ==========

  /**
   * 验证登录表单
   * @param {Object} formData - 表单数据
   * @returns {Object} 验证结果
   */
  validateLoginForm(formData) {
    const errors = []

    if (!formData.username || formData.username.trim().length === 0) {
      errors.push('请输入用户名')
    }

    if (!formData.password || formData.password.length === 0) {
      errors.push('请输入密码')
    } else if (formData.password.length < 6) {
      errors.push('密码长度不能少于6位')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * 验证注册表单
   * @param {Object} formData - 表单数据
   * @returns {Object} 验证结果
   */
  validateRegisterForm(formData) {
    const errors = []

    if (!formData.username || formData.username.trim().length < 3) {
      errors.push('用户名至少需要3个字符')
    }

    if (!formData.email || !this.validateEmail(formData.email)) {
      errors.push('请输入有效的邮箱地址')
    }

    if (!formData.password || formData.password.length < 6) {
      errors.push('密码长度不能少于6位')
    }

    if (formData.password !== formData.confirmPassword) {
      errors.push('两次输入的密码不一致')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * 验证重置密码表单
   * @param {Object} resetData - 重置数据
   * @returns {Object} 验证结果
   */
  validateResetPasswordForm(resetData) {
    const errors = []

    if (!resetData.token) {
      errors.push('重置令牌无效')
    }

    if (!resetData.password || resetData.password.length < 6) {
      errors.push('密码长度不能少于6位')
    }

    if (resetData.password !== resetData.confirmPassword) {
      errors.push('两次输入的密码不一致')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * 验证邮箱格式
   * @param {string} email - 邮箱地址
   * @returns {boolean} 是否有效
   */
  validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  // ========== 工具方法 ==========

  /**
   * 获取当前认证状态
   * @returns {Object} 认证状态
   */
  getAuthState() {
    return {
      isAuthenticated: this.authStore.isAuthenticated,
      user: this.authStore.user,
      loading: this.authStore.loading,
      error: this.authStore.error
    }
  }

  /**
   * 清除错误状态
   */
  clearError() {
    this.authStore.clearError()
  }
}
