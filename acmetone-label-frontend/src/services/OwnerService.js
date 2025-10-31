import api from '../utils/api'

/**
 * 主理人服务类
 * 处理主理人相关的API调用
 */
class OwnerService {
  /**
   * 获取厂牌信息
   * @returns {Promise<Object>} 厂牌信息
   */
  static async getLabelInfo() {
    try {
      console.log('[OwnerService] 获取厂牌信息')
      
      const response = await api.get('/labels/info')
      
      console.log('[OwnerService] 厂牌信息获取成功:', response.data)
      
      return {
        success: true,
        data: response.data
      }
    } catch (error) {
      console.error('[OwnerService] 获取厂牌信息失败:', error)
      
      let errorMessage = '获取厂牌信息失败'
      
      if (error.response) {
        switch (error.response.status) {
          case 404:
            errorMessage = '厂牌信息不存在'
            break
          case 403:
            errorMessage = '没有权限访问厂牌信息'
            break
          default:
            errorMessage = error.response.data?.message || errorMessage
        }
      }
      
      return {
        success: false,
        message: errorMessage,
        error: error.response?.data || error.message
      }
    }
  }

  /**
   * 更新厂牌信息
   * @param {Object} labelData 厂牌数据
   * @returns {Promise<Object>} 更新结果
   */
  static async updateLabelInfo(labelData) {
    try {
      console.log('[OwnerService] 更新厂牌信息:', labelData)
      
      const response = await api.put('/labels/info', labelData)
      
      console.log('[OwnerService] 厂牌信息更新成功:', response.data)
      
      return {
        success: true,
        data: response.data,
        message: '厂牌信息更新成功'
      }
    } catch (error) {
      console.error('[OwnerService] 更新厂牌信息失败:', error)
      
      let errorMessage = '更新厂牌信息失败'
      
      if (error.response) {
        switch (error.response.status) {
          case 400:
            errorMessage = '提交的数据格式不正确'
            break
          case 403:
            errorMessage = '没有权限修改厂牌信息'
            break
          case 409:
            errorMessage = '厂牌名称已存在'
            break
          default:
            errorMessage = error.response.data?.message || errorMessage
        }
      }
      
      return {
        success: false,
        message: errorMessage,
        error: error.response?.data || error.message
      }
    }
  }

  /**
   * 上传厂牌Logo
   * @param {File} file Logo文件
   * @returns {Promise<Object>} 上传结果
   */
  static async uploadLogo(file) {
    try {
      console.log('[OwnerService] 上传厂牌Logo')
      
      const formData = new FormData()
      formData.append('logo', file)
      formData.append('file_type', 'logo')
      
      const response = await api.post('/upload/logo', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      
      console.log('[OwnerService] Logo上传成功:', response.data)
      
      return {
        success: true,
        data: response.data,
        message: 'Logo上传成功'
      }
    } catch (error) {
      console.error('[OwnerService] Logo上传失败:', error)
      
      let errorMessage = 'Logo上传失败'
      
      if (error.response) {
        switch (error.response.status) {
          case 400:
            errorMessage = '文件格式不支持或文件过大'
            break
          case 413:
            errorMessage = '文件大小超出限制'
            break
          default:
            errorMessage = error.response.data?.message || errorMessage
        }
      }
      
      return {
        success: false,
        message: errorMessage,
        error: error.response?.data || error.message
      }
    }
  }



  /**
   * 获取厂牌成员列表
   * @returns {Promise<Object>} 成员列表
   */
  static async getLabelMembers() {
    try {
      console.log('[OwnerService] 获取厂牌成员列表')
      
      const response = await api.get('/labels/members')
      
      console.log('[OwnerService] 成员列表获取成功:', response.data)
      
      return {
        success: true,
        data: response.data
      }
    } catch (error) {
      console.error('[OwnerService] 获取成员列表失败:', error)
      
      let errorMessage = '获取成员列表失败'
      
      if (error.response) {
        errorMessage = error.response.data?.message || errorMessage
      }
      
      return {
        success: false,
        message: errorMessage,
        error: error.response?.data || error.message
      }
    }
  }

  /**
   * 邀请新成员
   * @param {Object} memberData 成员数据
   * @returns {Promise<Object>} 邀请结果
   */
  static async inviteMember(memberData) {
    try {
      console.log('[OwnerService] 邀请新成员:', memberData)
      
      const response = await api.post('/labels/members/invite', memberData)
      
      console.log('[OwnerService] 成员邀请成功:', response.data)
      
      return {
        success: true,
        data: response.data,
        message: '成员邀请发送成功'
      }
    } catch (error) {
      console.error('[OwnerService] 成员邀请失败:', error)
      
      let errorMessage = '成员邀请失败'
      
      if (error.response) {
        switch (error.response.status) {
          case 400:
            errorMessage = '邀请信息不完整'
            break
          case 409:
            errorMessage = '该用户已是厂牌成员'
            break
          default:
            errorMessage = error.response.data?.message || errorMessage
        }
      }
      
      return {
        success: false,
        message: errorMessage,
        error: error.response?.data || error.message
      }
    }
  }
}

export default OwnerService
