import axios from 'axios';
import { API_BASE_URL } from '@/config';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// 添加一个请求拦截器，用于在每个请求中附加token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 保存专辑流程图中节点的位置信息
export const saveNodesPositions = async (albumId, positions) => {
  try {
    console.log('准备发送保存节点位置请求:');
    console.log('专辑ID:', albumId);
    console.log('位置数据:', positions);
    
    const response = await api.put(`/albums/${albumId}/nodes-positions`, {
      positions
    });
    
    console.log('保存节点位置响应:', response.data);
    return response.data;
  } catch (error) {
    console.error('保存节点位置失败:', error);
    if (error.response) {
      console.error('错误状态码:', error.response.status);
      console.error('错误数据:', error.response.data);
    }
    throw error;
  }
};

export default api; 