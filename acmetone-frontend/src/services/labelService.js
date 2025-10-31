import axios from 'axios';
import { useUserStore } from '../stores/user';
import { API_BASE_URL } from '../config';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
  const userStore = useUserStore();
  if (userStore.token) {
    config.headers.Authorization = `Bearer ${userStore.token}`;
  }
  return config;
});

const labelService = {
  // 获取用户的厂牌信息
  getUserLabel() {
    return apiClient.get('/labels/user');
  },

  // 创建厂牌申请
  createLabel(labelData) {
    return apiClient.post('/labels', labelData);
  },

  // 更新厂牌信息
  updateLabel(id, labelData) {
    return apiClient.put(`/labels/${id}`, labelData);
  },

  // 管理员获取所有厂牌申请
  getAdminLabels(params = {}) {
    return apiClient.get('/admin/labels', { params });
  },

  // 管理员审核厂牌申请
  reviewLabel(id, reviewData) {
    return apiClient.put(`/admin/labels/${id}/review`, reviewData);
  },

  // 管理员获取厂牌详情
  getAdminLabelDetail(id) {
    return apiClient.get(`/admin/labels/${id}`);
  },

  // 管理员删除厂牌
  deleteLabel(id) {
    return apiClient.delete(`/admin/labels/${id}`);
  }
};

export default labelService;
