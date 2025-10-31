import { defineStore } from 'pinia';
import axios from 'axios';
import { API_BASE_URL } from '@/config';

export const useArtistEditRequestStore = defineStore('artistEditRequest', {
  state: () => ({
    myRequests: [],
    pendingRequests: [],
    loading: false,
    error: null
  }),

  actions: {
    // 提交修改申请
    async submitEditRequest(artistId, changes, reason) {
      try {
        this.loading = true;
        // 确保请求数据结构正确
        const requestData = {
          artistId,
          changes,
          reason,
          songId: null // 添加songId字段，默认为null
        };
        
        const response = await axios.post(`${API_BASE_URL}/artist-edit-requests`, requestData);
        this.loading = false;
        return response.data;
      } catch (error) {
        this.loading = false;
        this.error = error.response?.data?.message || '提交申请失败';
        throw error;
      }
    },

    // 获取我的申请列表
    async fetchMyRequests() {
      try {
        this.loading = true;
        this.error = null;
        const response = await axios.get(`${API_BASE_URL}/artist-edit-requests/my`);
        this.myRequests = response.data;
        this.loading = false;
        return this.myRequests;
      } catch (error) {
        this.loading = false;
        this.error = error.response?.data?.message || '获取申请列表失败';
        throw error;
      }
    },

    // 获取待审核的申请（管理员）
    async fetchPendingRequests() {
      try {
        this.loading = true;
        this.error = null;
        console.log('正在获取待审核的艺人修改申请...');
        
        const response = await axios.get(`${API_BASE_URL}/artist-edit-requests/pending`);
        console.log('获取到的待审核申请数据:', response.data);
        
        // 确保数据是数组格式
        if (!Array.isArray(response.data)) {
          console.error('API返回的数据不是数组格式:', response.data);
          this.pendingRequests = [];
          throw new Error('服务器返回数据格式错误');
        }
        
        this.pendingRequests = response.data;
        this.loading = false;
        return response.data;
      } catch (error) {
        this.loading = false;
        console.error('获取待审核申请详细错误:', error);
        if (error.response) {
          console.error('响应状态:', error.response.status);
          console.error('响应数据:', error.response.data);
        }
        this.error = error.response?.data?.message || '获取待审核申请失败';
        throw error;
      }
    },

    // 删除艺人（管理员）
    async deleteArtist(artistId) {
      try {
        this.loading = true;
        this.error = null;
        await axios.delete(`${API_BASE_URL}/artist-edit-requests/artists/${artistId}`);
        this.loading = false;
        return true;
      } catch (error) {
        this.loading = false;
        this.error = error.response?.data?.message || '删除歌手失败';
        throw error;
      }
    },

    // 处理申请（管理员）
    async handleRequest(requestId, status, comment) {
      try {
        this.loading = true;
        this.error = null;
        console.log(`正在处理申请 ${requestId}, 状态: ${status}, 评论: ${comment}`);
        
        const response = await axios.patch(`${API_BASE_URL}/artist-edit-requests/${requestId}/status`, {
          status,
          comment
        });
        
        console.log('处理申请响应:', response.data);
        this.loading = false;
        
        // 更新本地数据
        if (this.pendingRequests.length > 0) {
          const index = this.pendingRequests.findIndex(req => req.id === requestId);
          if (index !== -1) {
            console.log(`从列表中移除已处理的申请 ${requestId}`);
            this.pendingRequests.splice(index, 1);
          }
        }
        
        return response.data;
      } catch (error) {
        this.loading = false;
        console.error('处理申请详细错误:', error);
        if (error.response) {
          console.error('响应状态:', error.response.status);
          console.error('响应数据:', error.response.data);
        }
        this.error = error.response?.data?.message || '处理申请失败';
        throw error;
      }
    },

    // 清除错误
    clearError() {
      this.error = null;
    }
  }
}); 