import axios from 'axios';
import { getToken } from '@/utils/auth';
import { API_BASE_URL } from '@/config';

// 创建axios实例
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器 - 添加认证token
apiClient.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器 - 处理错误
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Token过期或无效，跳转到登录页
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

const contractService = {
  /**
   * 获取用户的合同列表
   * @param {Object} params - 查询参数
   * @param {number} params.page - 页码
   * @param {number} params.limit - 每页数量
   * @param {string} params.status - 合同状态筛选
   * @param {string} params.search - 搜索关键词
   * @returns {Promise} API响应
   */
  async getMyContracts(params = {}) {
    try {
      const response = await apiClient.get('/contracts/my', {
        params: {
          page: params.page || 1,
          limit: params.limit || 10,
          status: params.status || '',
          search: params.search || '',
        },
      });
      return response;
    } catch (error) {
      console.error('获取合同列表失败:', error);
      throw error;
    }
  },

  /**
   * 获取指定专辑的合同详情
   * @param {number} albumId - 专辑ID
   * @returns {Promise} API响应
   */
  async getContractDetails(albumId) {
    try {
      if (!albumId || isNaN(albumId)) {
        throw new Error('无效的专辑ID');
      }
      const response = await apiClient.get(`/contracts/${albumId}`);
      return response;
    } catch (error) {
      console.error('获取合同详情失败:', error);
      throw error;
    }
  },

  /**
   * 下载合同文件
   * @param {number} albumId - 专辑ID
   * @returns {Promise} 文件数据
   */
  async downloadContract(albumId) {
    try {
      const response = await apiClient.get(`/contracts/${albumId}/download`, {
        responseType: 'blob', // 重要：设置响应类型为blob
      });
      return response;
    } catch (error) {
      console.error('下载合同文件失败:', error);
      throw error;
    }
  },

  /**
   * 管理员上传已签署的合同
   * @param {number} albumId - 专辑ID
   * @param {FormData} formData - 包含文件和其他数据的FormData
   * @returns {Promise} API响应
   */
  async uploadSignedContract(albumId, formData) {
    try {
      const response = await apiClient.post(`/contracts/${albumId}/sign`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response;
    } catch (error) {
      console.error('上传已签署合同失败:', error);
      throw error;
    }
  },

  /**
   * 管理员更新合同日期
   * @param {number} albumId - 专辑ID
   * @param {Object} dates - 日期数据
   * @param {string} dates.effectiveDate - 生效日期
   * @param {string} dates.expiryDate - 到期日期
   * @returns {Promise} API响应
   */
  async updateContractDates(albumId, dates) {
    try {
      const response = await apiClient.put(`/contracts/${albumId}/dates`, {
        effectiveDate: dates.effectiveDate,
        expiryDate: dates.expiryDate,
      });
      return response;
    } catch (error) {
      console.error('更新合同日期失败:', error);
      throw error;
    }
  },

  /**
   * 获取合同统计信息（管理员用）
   * @returns {Promise} API响应
   */
  async getContractStats() {
    try {
      const response = await apiClient.get('/contracts/stats');
      return response;
    } catch (error) {
      console.error('获取合同统计失败:', error);
      throw error;
    }
  },

  /**
   * 批量更新合同状态（管理员用）
   * @param {Array} albumIds - 专辑ID数组
   * @param {string} status - 新状态
   * @returns {Promise} API响应
   */
  async batchUpdateContractStatus(albumIds, status) {
    try {
      const response = await apiClient.put('/contracts/batch-update', {
        albumIds,
        status,
      });
      return response;
    } catch (error) {
      console.error('批量更新合同状态失败:', error);
      throw error;
    }
  },

  // 管理员获取所有合同
  getAllContracts(params = {}) {
    return apiClient.get('/contracts/admin/all', { params });
  },

  // 上传已签署合同 (Base64)
  uploadSignedContract(contractId, fileData) {
    return apiClient.post(`/contracts/${contractId}/upload-signed`, fileData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
  },

  // 管理员调整合同日期
  updateContractDates(contractId, dates) {
    return apiClient.put(`/contracts/${contractId}/dates`, dates);
  },

  // 获取合同统计数据
  getContractStats() {
    return apiClient.get('/contracts/stats');
  }
};

export default contractService;
