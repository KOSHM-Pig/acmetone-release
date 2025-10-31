import api from '@/services/api';

/**
 * 管理员审核工作台API
 */
export const adminWorkbenchApi = {
  /**
   * 获取工作台概览数据
   * @returns {Promise} API响应
   */
  async getOverview() {
    const response = await api.get('/admin/workbench/overview');
    return response.data;
  },

  /**
   * 获取待审核专辑列表
   * @param {Object} params - 查询参数
   * @param {number} params.page - 页码
   * @param {number} params.limit - 每页数量
   * @param {string} params.status - 状态筛选
   * @param {string} params.search - 搜索关键词
   * @param {string} params.sortBy - 排序字段
   * @param {string} params.sortOrder - 排序方向
   * @returns {Promise} API响应
   */
  async getAlbums(params = {}) {
    const response = await api.get('/admin/workbench/albums', { params });
    return response.data;
  },

  /**
   * 获取专辑详细信息（用于审核）
   * @param {number} albumId - 专辑ID
   * @returns {Promise} API响应
   */
  async getAlbumForReview(albumId) {
    const response = await api.get(`/admin/workbench/albums/${albumId}`);
    return response.data;
  },

  /**
   * 批量审核专辑
   * @param {Object} data - 审核数据
   * @param {Array} data.albumIds - 专辑ID数组
   * @param {string} data.action - 审核操作 (approved/rejected)
   * @param {string} data.comment - 审核意见
   * @returns {Promise} API响应
   */
  async batchReviewAlbums(data) {
    const response = await api.post('/admin/workbench/albums/batch-review', data);
    return response.data;
  },

  /**
   * 更新物料传递状态
   * @param {number} albumId - 专辑ID
   * @param {Object} data - 更新数据
   * @param {boolean} data.delivered - 是否已传递
   * @param {string} data.deliveredAt - 传递时间
   * @param {string} data.comment - 备注
   * @returns {Promise} API响应
   */
  async updateMaterialDeliveryStatus(albumId, data) {
    const response = await api.patch(`/admin/workbench/albums/${albumId}/material-delivery`, data);
    return response.data;
  },

  /**
   * 获取发行日历数据（管理员视图）
   * @param {Object} params - 查询参数
   * @param {number} params.year - 年份
   * @param {number} params.month - 月份
   * @param {string} params.status - 状态筛选
   * @returns {Promise} API响应
   */
  async getCalendarData(params = {}) {
    const response = await api.get('/admin/workbench/calendar', { params });
    return response.data;
  },

  /**
   * 获取物料传递统计
   * @param {Object} params - 查询参数
   * @param {string} params.startDate - 开始日期
   * @param {string} params.endDate - 结束日期
   * @param {string} params.status - 专辑状态
   * @returns {Promise} API响应
   */
  async getMaterialStats(params = {}) {
    const response = await api.get('/admin/workbench/material-stats', { params });
    return response.data;
  },

  /**
   * 批量下载专辑物料
   * @param {Array} albumIds - 专辑ID数组
   * @returns {Promise} API响应
   */
  async batchDownloadMaterials(albumIds) {
    const response = await api.post('/admin/workbench/albums/batch-download', { albumIds });
    return response.data;
  },

  /**
   * 批量标记物料已递交
   * @param {Array} albumIds - 专辑ID数组
   * @param {Object} data - 递交信息
   * @returns {Promise} API响应
   */
  async batchMarkDelivered(albumIds, data = {}) {
    const response = await api.post('/admin/workbench/albums/batch-delivery', {
      albumIds,
      ...data
    });
    return response.data;
  },

  /**
   * 下载单个专辑物料
   * @param {number} albumId - 专辑ID
   * @returns {Promise} API响应
   */
  async downloadAlbumMaterials(albumId) {
    const response = await api.get(`/admin/workbench/albums/${albumId}/download`);
    return response.data;
  }
};
