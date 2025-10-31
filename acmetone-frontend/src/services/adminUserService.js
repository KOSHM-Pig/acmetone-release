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
  searchUsers(keyword, page = 1, pageSize = 10) {
    return apiClient.get('/admin/users/search', {
      params: { keyword, page, pageSize }
    });
  },
}; 