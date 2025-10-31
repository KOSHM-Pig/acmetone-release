import { defineStore } from 'pinia';
import { adminWorkbenchApi } from '@/api/adminWorkbench';

export const useAdminWorkbenchStore = defineStore('adminWorkbench', {
  state: () => ({
    // 概览数据
    overview: {
      albumStats: {
        pending: 0,
        approved: 0,
        rejected: 0,
        draft: 0,
        total: 0
      },
      materialStats: {
        delivered: 0,
        pending: 0,
        deliveryRate: 0
      },
      activityStats: {
        todaySubmissions: 0,
        weeklyReleases: 0
      }
    },
    
    // 专辑列表
    albums: [],
    albumsPagination: {
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 0
    },
    
    // 当前查看的专辑详情
    currentAlbum: null,
    
    // 日历数据
    calendarData: {
      albums: [],
      year: new Date().getFullYear(),
      month: null,
      status: 'all',
      total: 0
    },
    
    // 物料统计
    materialStats: {
      summary: {
        total: 0,
        delivered: 0,
        pending: 0,
        deliveryRate: 0
      },
      dailyStats: []
    },
    
    // 加载状态
    loading: {
      overview: false,
      albums: false,
      albumDetail: false,
      calendar: false,
      materialStats: false,
      batchReview: false,
      materialDelivery: false
    },
    
    // 错误信息
    error: null
  }),

  getters: {
    // 获取待审核专辑数量
    pendingAlbumsCount: (state) => state.overview.albumStats.pending,
    
    // 获取物料传递率
    materialDeliveryRate: (state) => state.overview.materialStats.deliveryRate,
    
    // 获取今日提交数量
    todaySubmissionsCount: (state) => state.overview.activityStats.todaySubmissions,
    
    // 获取本周发行数量
    weeklyReleasesCount: (state) => state.overview.activityStats.weeklyReleases,
    
    // 获取当前专辑是否已传递物料
    currentAlbumMaterialDelivered: (state) => {
      return state.currentAlbum ? state.currentAlbum.materialDelivered : false;
    }
  },

  actions: {
    /**
     * 获取工作台概览数据
     */
    async fetchOverview() {
      this.loading.overview = true;
      this.error = null;
      
      try {
        const response = await adminWorkbenchApi.getOverview();
        if (response.success) {
          this.overview = response.data;
        } else {
          throw new Error(response.message || '获取概览数据失败');
        }
      } catch (error) {
        console.error('获取工作台概览数据失败:', error);
        this.error = error.message || '获取概览数据失败';
        throw error;
      } finally {
        this.loading.overview = false;
      }
    },

    /**
     * 获取专辑列表
     */
    async fetchAlbums(params = {}) {
      this.loading.albums = true;
      this.error = null;
      
      try {
        const response = await adminWorkbenchApi.getAlbums(params);
        if (response.success) {
          this.albums = response.data.albums;
          this.albumsPagination = response.data.pagination;
        } else {
          throw new Error(response.message || '获取专辑列表失败');
        }
      } catch (error) {
        console.error('获取专辑列表失败:', error);
        this.error = error.message || '获取专辑列表失败';
        throw error;
      } finally {
        this.loading.albums = false;
      }
    },

    /**
     * 获取专辑详情
     */
    async fetchAlbumDetail(albumId) {
      this.loading.albumDetail = true;
      this.error = null;
      
      try {
        const response = await adminWorkbenchApi.getAlbumForReview(albumId);
        if (response.success) {
          this.currentAlbum = response.data;
        } else {
          throw new Error(response.message || '获取专辑详情失败');
        }
      } catch (error) {
        console.error('获取专辑详情失败:', error);
        this.error = error.message || '获取专辑详情失败';
        throw error;
      } finally {
        this.loading.albumDetail = false;
      }
    },

    /**
     * 批量审核专辑
     */
    async batchReviewAlbums(data) {
      this.loading.batchReview = true;
      this.error = null;
      
      try {
        const response = await adminWorkbenchApi.batchReviewAlbums(data);
        if (response.success) {
          // 刷新专辑列表和概览数据
          await Promise.all([
            this.fetchAlbums(),
            this.fetchOverview()
          ]);
          return response;
        } else {
          throw new Error(response.message || '批量审核失败');
        }
      } catch (error) {
        console.error('批量审核专辑失败:', error);
        this.error = error.message || '批量审核失败';
        throw error;
      } finally {
        this.loading.batchReview = false;
      }
    },

    /**
     * 更新物料传递状态
     */
    async updateMaterialDeliveryStatus(albumId, data) {
      this.loading.materialDelivery = true;
      this.error = null;
      
      try {
        const response = await adminWorkbenchApi.updateMaterialDeliveryStatus(albumId, data);
        if (response.success) {
          // 更新当前专辑信息
          if (this.currentAlbum && this.currentAlbum.id === albumId) {
            this.currentAlbum.materialDelivered = data.delivered;
            this.currentAlbum.materialDeliveredAt = data.deliveredAt || new Date().toISOString();
          }
          
          // 更新专辑列表中的对应项
          const albumIndex = this.albums.findIndex(album => album.id === albumId);
          if (albumIndex !== -1) {
            this.albums[albumIndex].materialDelivered = data.delivered;
            this.albums[albumIndex].materialDeliveredAt = data.deliveredAt || new Date().toISOString();
          }
          
          // 刷新概览数据
          await this.fetchOverview();
          
          return response;
        } else {
          throw new Error(response.message || '更新物料传递状态失败');
        }
      } catch (error) {
        console.error('更新物料传递状态失败:', error);
        this.error = error.message || '更新物料传递状态失败';
        throw error;
      } finally {
        this.loading.materialDelivery = false;
      }
    },

    /**
     * 获取日历数据
     */
    async fetchCalendarData(params = {}) {
      this.loading.calendar = true;
      this.error = null;
      
      try {
        const response = await adminWorkbenchApi.getCalendarData(params);
        if (response.success) {
          this.calendarData = response.data;
        } else {
          throw new Error(response.message || '获取日历数据失败');
        }
      } catch (error) {
        console.error('获取日历数据失败:', error);
        this.error = error.message || '获取日历数据失败';
        throw error;
      } finally {
        this.loading.calendar = false;
      }
    },

    /**
     * 获取物料统计
     */
    async fetchMaterialStats(params = {}) {
      this.loading.materialStats = true;
      this.error = null;
      
      try {
        const response = await adminWorkbenchApi.getMaterialStats(params);
        if (response.success) {
          this.materialStats = response.data;
        } else {
          throw new Error(response.message || '获取物料统计失败');
        }
      } catch (error) {
        console.error('获取物料统计失败:', error);
        this.error = error.message || '获取物料统计失败';
        throw error;
      } finally {
        this.loading.materialStats = false;
      }
    },

    /**
     * 清除错误信息
     */
    clearError() {
      this.error = null;
    },

    /**
     * 重置当前专辑
     */
    clearCurrentAlbum() {
      this.currentAlbum = null;
    }
  }
});
