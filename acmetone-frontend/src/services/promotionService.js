import axios from 'axios';
import { useUserStore } from '@/stores/user';
import { API_BASE_URL } from '@/config';

// 添加调试日志
console.log('PromotionService初始化 - API_BASE_URL:', API_BASE_URL);

// 创建axios实例
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 请求拦截器，添加token
apiClient.interceptors.request.use(config => {
  // 每次请求时直接从localStorage获取最新token，而不是从store
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else {
    // 如果没有token，尝试从store获取
    const userStore = useUserStore();
    if (userStore.token) {
      config.headers.Authorization = `Bearer ${userStore.token}`;
    }
  }
  return config;
});

const promotionService = {
  // 获取用户专辑列表
  getUserAlbums() {
    return apiClient.get('/promotion-requests/albums/user');
  },

  // 创建推广申请
  createPromotionRequest(requestData) {
    return apiClient.post('/promotion-requests', requestData);
  },

  // 获取用户的推广申请列表
  getUserPromotionRequests() {
    return apiClient.get('/promotion-requests/user');
  },

  // 管理员获取推广申请列表
  getAdminPromotionRequests(params) {
    return apiClient.get('/promotion-requests/admin', { params });
  },

  // 管理员审核推广申请
  reviewPromotionRequest(id, reviewData) {
    return apiClient.put(`/promotion-requests/admin/${id}`, reviewData);
  },

  // 搜索专辑
  searchAlbums(query) {
    return apiClient.get(`/promotion-requests/admin/search?q=${encodeURIComponent(query)}`);
  }
};

export default promotionService; 