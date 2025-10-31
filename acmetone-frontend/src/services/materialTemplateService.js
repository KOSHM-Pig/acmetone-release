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

export default {
  // 获取全部模板 (管理员/用户)
  getAllTemplates() {
    return apiClient.get('/material-templates');
  },

  // 管理员创建模板
  createTemplate(data) {
    return apiClient.post('/material-templates', data);
  },

  // 管理员更新模板
  updateTemplate(id, data) {
    return apiClient.put(`/material-templates/${id}`, data);
  },

  // 管理员删除模板
  deleteTemplate(id) {
    return apiClient.delete(`/material-templates/${id}`);
  },

  uploadImage(base64Image){
    return apiClient.post('/material-templates/upload', { image: base64Image });
  },
}; 