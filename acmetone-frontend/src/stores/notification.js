import axios from 'axios';
import { defineStore } from 'pinia';

export const useNotificationStore = defineStore('notification', {
  state: () => ({
    pendingAlbums: 0,
    pendingArtistRequests: 0,
    pendingVerifications: 0,
    pendingMaterialCount: 0, // 待递交物料数量
    isLoading: false,
    lastFetchTime: null,
  }),

  getters: {
    hasPendingNotifications: (state) => {
      return state.pendingAlbums > 0 || state.pendingArtistRequests > 0 || state.pendingVerifications > 0 || state.pendingMaterialCount > 0;
    },
    totalPendingCount: (state) => {
      return state.pendingAlbums + state.pendingArtistRequests + state.pendingVerifications + state.pendingMaterialCount;
    }
  },

  actions: {
    async fetchNotifications() {
      // 避免频繁请求，设置至少30秒间隔
      const now = Date.now();
      if (this.lastFetchTime && now - this.lastFetchTime < 30000) {
        return;
      }

      this.isLoading = true;
      try {
        // 获取待审核专辑数量
        const albumsResponse = await axios.get('/admin/albums/pending-count');
        this.pendingAlbums = albumsResponse.data.count || 0;

        // 获取待审核歌手修改请求数量
        const artistsResponse = await axios.get('/admin/artist-requests/pending-count');
        this.pendingArtistRequests = artistsResponse.data.count || 0;

        // 获取待审核实名认证数量
        const verificationsResponse = await axios.get('/admin/user-verification/pending-count');
        this.pendingVerifications = verificationsResponse.data.count || 0;

        // 获取待递交物料数量
        const materialResponse = await axios.get('/admin/workbench/material-pending-count');
        this.pendingMaterialCount = materialResponse.data.count || 0;

        this.lastFetchTime = now;
      } catch (error) {
        console.error('获取待审核数量失败:', error);
      } finally {
        this.isLoading = false;
      }
    },

    clearNotifications() {
      this.pendingAlbums = 0;
      this.pendingArtistRequests = 0;
      this.pendingVerifications = 0;
      this.pendingMaterialCount = 0;
    }
  }
}); 