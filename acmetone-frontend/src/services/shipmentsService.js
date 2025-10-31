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
  // 用户端获取个人物流记录
  getUserShipments() {
    return apiClient.get('/shipments');
  },

  // --- Admin endpoints ---
  getAllShipments() {
    return apiClient.get('/shipments/admin/all');
  },

  createShipment(data) {
    return apiClient.post('/shipments', data);
  },

  updateShipment(id, data) {
    return apiClient.put(`/shipments/admin/${id}`, data);
  },

  deleteShipment(id) {
    return apiClient.delete(`/shipments/admin/${id}`);
  },
}; 