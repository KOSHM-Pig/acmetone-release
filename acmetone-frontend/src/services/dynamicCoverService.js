import axios from 'axios';
import { useUserStore } from '../stores/user';
import { API_BASE_URL } from '../config';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

apiClient.interceptors.request.use(config => {
  const userStore = useUserStore();
  if (userStore.token) {
    config.headers.Authorization = `Bearer ${userStore.token}`;
  }
  return config;
}, error => {
  return Promise.reject(error);
});

export default {
  // User endpoints
  getUserDynamicCoverRequests() {
    return apiClient.get('/dynamic-cover-requests');
  },

  createDynamicCoverRequest(data) {
    return apiClient.post('/dynamic-cover-requests', data, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 120000, // 增加到120秒超时
      maxContentLength: Infinity, // 允许无限大小的响应内容
      maxBodyLength: Infinity // 允许无限大小的请求体
    });
  },
  
  getUserAlbums() {
    return apiClient.get('/albums/my');
  },

  uploadDynamicCoverFile(formData, isPortrait = false) {
    // 打印FormData内容
    console.log('FormData内容:');
    for (let pair of formData.entries()) {
      console.log(pair[0] + ': ' + (pair[1] instanceof File ? `文件(${pair[1].name}, ${pair[1].type}, ${pair[1].size}字节)` : pair[1]));
    }
    
    return apiClient.post(`/dynamic-cover-requests/upload?isPortrait=${isPortrait}`, formData, {
      headers: {
        // 不要手动设置Content-Type，让浏览器自动设置正确的boundary
        // 'Content-Type': 'multipart/form-data'
      },
      timeout: 180000, // 增加到180秒超时
      maxContentLength: 20 * 1024 * 1024, // 20MB
      maxBodyLength: 20 * 1024 * 1024, // 20MB
      onUploadProgress: (progressEvent) => {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        console.log(`上传进度: ${percentCompleted}%`);
      }
    });
  },

  uploadDynamicCoverBase64(data) {
    return apiClient.post('/dynamic-cover-requests/upload-base64', data, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 120000 // 120秒超时
    });
  },

  // 新增：分片上传Base64编码的文件
  uploadChunkedBase64(chunkData) {
    return apiClient.post('/dynamic-cover-requests/upload-chunk', chunkData, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 60000, // 60秒超时，每个分片较小
      maxContentLength: 5 * 1024 * 1024, // 5MB 响应限制
      maxBodyLength: 5 * 1024 * 1024 // 5MB 请求体限制
    });
  },

  // Admin endpoints
  getAdminAllDynamicCoverRequests() {
    return apiClient.get('/dynamic-cover-requests/admin/all');
  },

  updateDynamicCoverRequest(id, data) {
    return apiClient.put(`/dynamic-cover-requests/admin/${id}`, data);
  },

  deleteDynamicCoverRequest(id) {
    return apiClient.delete(`/dynamic-cover-requests/admin/${id}`);
  },

  resubmitDynamicCoverRequest(id) {
    return apiClient.post(`/dynamic-cover-requests/${id}/resubmit`);
  },

  getDynamicCoverRequest(id) {
    return apiClient.get(`/dynamic-cover-requests/${id}`);
  },

  updateDynamicCoverFile(data) {
    return apiClient.put(`/dynamic-cover-requests/${data.resubmitId}/update-file`, data);
  }
}; 