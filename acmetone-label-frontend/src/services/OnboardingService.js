import api from '../utils/api'

/**
 * 向导流程服务
 */
class OnboardingService {
  /**
   * 获取向导状态
   */
  static async getStatus() {
    try {
      const response = await api.get('/onboarding/status')
      return response.data
    } catch (error) {
      console.error('获取向导状态失败:', error)
      throw error
    }
  }

  /**
   * 设置用户目的 (第1步)
   */
  static async setPurpose(userType) {
    try {
      const response = await api.post('/onboarding/purpose', {
        userType
      })
      return response.data
    } catch (error) {
      console.error('设置用户目的失败:', error)
      throw error
    }
  }

  /**
   * 设置艺人信息 (第2步 - 仅艺人)
   */
  static async setArtistInfo(artistData) {
    try {
      const response = await api.post('/onboarding/artist', artistData)
      return response.data
    } catch (error) {
      console.error('设置艺人信息失败:', error)
      throw error
    }
  }

  /**
   * 设置极音记状态 (第2步 - 仅厂牌)
   */
  static async setJiYinJiStatus(isInJiYinJi) {
    try {
      const response = await api.post('/onboarding/jiyinji-status', {
        isInJiYinJi
      })
      return response.data
    } catch (error) {
      console.error('设置极音记状态失败:', error)
      throw error
    }
  }

  /**
   * 设置厂牌信息 (第3步 - 仅厂牌)
   */
  static async setLabelInfo(labelData) {
    try {
      const response = await api.post('/onboarding/label', labelData)
      return response.data
    } catch (error) {
      console.error('设置厂牌信息失败:', error)
      throw error
    }
  }

  /**
   * 设置厂牌角色 (第4步 - 仅厂牌)
   */
  static async setRole(role) {
    try {
      const response = await api.post('/onboarding/role', {
        role
      })
      return response.data
    } catch (error) {
      console.error('设置厂牌角色失败:', error)
      throw error
    }
  }

  /**
   * 完成向导流程
   */
  static async complete() {
    try {
      const response = await api.post('/onboarding/complete')
      return response.data
    } catch (error) {
      console.error('完成向导流程失败:', error)
      throw error
    }
  }

  /**
   * 重置向导流程 (开发用)
   */
  static async reset() {
    try {
      const response = await api.post('/onboarding/reset')
      return response.data
    } catch (error) {
      console.error('重置向导流程失败:', error)
      throw error
    }
  }
}

export default OnboardingService
