import api from '../utils/api'

/**
 * 厂牌相关服务
 */
class LabelService {
  /**
   * 获取用户的厂牌角色信息
   */
  static async getUserLabelRole() {
    try {
      const response = await api.get('/labels/user/role')
      return response.data
    } catch (error) {
      console.error('获取用户厂牌角色失败:', error)
      throw error
    }
  }

  /**
   * 获取用户的厂牌信息
   */
  static async getUserLabel() {
    try {
      const response = await api.get('/labels/user')
      return response.data
    } catch (error) {
      console.error('获取用户厂牌信息失败:', error)
      throw error
    }
  }

  /**
   * 获取厂牌成员列表
   */
  static async getLabelMembers(labelId) {
    try {
      const response = await api.get(`/labels/${labelId}/members`)
      return response.data
    } catch (error) {
      console.error('获取厂牌成员列表失败:', error)
      throw error
    }
  }

  /**
   * 更新厂牌信息
   */
  static async updateLabel(labelId, labelData) {
    try {
      const response = await api.put(`/labels/${labelId}`, labelData)
      return response.data
    } catch (error) {
      console.error('更新厂牌信息失败:', error)
      throw error
    }
  }

  /**
   * 获取厂牌统计数据
   */
  static async getLabelStats(labelId) {
    try {
      const response = await api.get(`/labels/${labelId}/stats`)
      return response.data
    } catch (error) {
      console.error('获取厂牌统计数据失败:', error)
      throw error
    }
  }

  /**
   * 获取厂牌详细信息（用于设置页面）
   */
  static async getLabelInfo() {
    try {
      const response = await api.get('/labels/info')
      return response.data
    } catch (error) {
      console.error('获取厂牌详细信息失败:', error)
      throw error
    }
  }

  /**
   * 更新厂牌详细信息（用于设置页面）
   */
  static async updateLabelInfo(labelData) {
    try {
      const response = await api.put('/labels/info', labelData)
      return response.data
    } catch (error) {
      console.error('更新厂牌详细信息失败:', error)
      throw error
    }
  }
}

export default LabelService
