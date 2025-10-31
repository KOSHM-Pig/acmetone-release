/**
 * 用户数据模型
 */
export class User {
  constructor(data = {}) {
    this.id = data.id || null
    this.username = data.username || ''
    this.email = data.email || ''
    this.avatar = data.avatar || ''
    this.role = data.role || 'user'
    this.isAdmin = data.isAdmin || false
    this.createdAt = data.createdAt || null
    this.updatedAt = data.updatedAt || null
    this.lastLoginAt = data.lastLoginAt || null
    this.isEmailVerified = data.isEmailVerified || false
  }

  /**
   * 从API响应数据创建用户实例
   * @param {Object} apiData - API返回的用户数据
   * @returns {User} 用户实例
   */
  static fromApiResponse(apiData) {
    return new User({
      id: apiData.id,
      username: apiData.username,
      email: apiData.email,
      avatar: apiData.avatar,
      role: apiData.role,
      isAdmin: apiData.role === 'admin',
      createdAt: apiData.created_at || apiData.createdAt,
      updatedAt: apiData.updated_at || apiData.updatedAt,
      lastLoginAt: apiData.last_login_at || apiData.lastLoginAt,
      isEmailVerified: apiData.is_email_verified || apiData.isEmailVerified
    })
  }

  /**
   * 转换为API请求格式
   * @returns {Object} API请求数据
   */
  toApiFormat() {
    return {
      id: this.id,
      username: this.username,
      email: this.email,
      avatar: this.avatar,
      role: this.role
    }
  }

  /**
   * 转换为存储格式（localStorage）
   * @returns {Object} 存储数据
   */
  toStorageFormat() {
    return {
      id: this.id,
      username: this.username,
      email: this.email,
      avatar: this.avatar,
      role: this.role,
      isAdmin: this.isAdmin,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      lastLoginAt: this.lastLoginAt,
      isEmailVerified: this.isEmailVerified
    }
  }

  /**
   * 从存储数据创建用户实例
   * @param {Object} storageData - 存储的用户数据
   * @returns {User} 用户实例
   */
  static fromStorageData(storageData) {
    return new User(storageData)
  }

  /**
   * 检查用户是否有特定权限
   * @param {string} permission - 权限名称
   * @returns {boolean} 是否有权限
   */
  hasPermission(permission) {
    const permissions = {
      admin: ['read', 'write', 'delete', 'manage'],
      user: ['read']
    }
    
    const userPermissions = permissions[this.role] || []
    return userPermissions.includes(permission)
  }

  /**
   * 获取用户显示名称
   * @returns {string} 显示名称
   */
  getDisplayName() {
    return this.username || this.email || '未知用户'
  }

  /**
   * 获取头像URL（带时间戳防缓存）
   * @returns {string} 头像URL
   */
  getAvatarUrl() {
    if (!this.avatar) return ''
    
    const timestamp = Date.now()
    const separator = this.avatar.includes('?') ? '&' : '?'
    return `${this.avatar}${separator}t=${timestamp}`
  }

  /**
   * 验证用户数据
   * @returns {Object} 验证结果
   */
  validate() {
    const errors = []
    
    if (!this.username || this.username.length < 3) {
      errors.push('用户名至少需要3个字符')
    }
    
    if (!this.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email)) {
      errors.push('请输入有效的邮箱地址')
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * 更新用户信息
   * @param {Object} updates - 更新的数据
   */
  update(updates) {
    Object.keys(updates).forEach(key => {
      if (this.hasOwnProperty(key)) {
        this[key] = updates[key]
      }
    })
    this.updatedAt = new Date().toISOString()
  }

  /**
   * 克隆用户实例
   * @returns {User} 新的用户实例
   */
  clone() {
    return new User(this.toStorageFormat())
  }
}
