import { defineStore } from 'pinia';
import axios from 'axios';
import { API_BASE_URL } from '../config';

export const useArtistStore = defineStore('artist', {
  state: () => ({
    artists: [],
    loading: false,
    error: null,
    canonicalArtists: {} // 缓存主歌手信息，避免重复请求
  }),
  
  actions: {
    // 搜索艺人
    async searchArtists(name) {
      try {
        this.loading = true;
        this.error = null;
        
        const response = await axios.get(`${API_BASE_URL}/artists/search`, {
          params: { name },
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        
        return response.data;
      } catch (error) {
        console.error('搜索艺人失败:', error);
        this.error = error.response?.data?.message || '搜索艺人失败';
        throw error;
      } finally {
        this.loading = false;
      }
    },
    
    // 根据ID获取艺人详情
    async getArtistById(id) {
      try {
        this.loading = true;
        this.error = null;
        
        const response = await axios.get(`${API_BASE_URL}/artists/${id}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        
        return response.data;
      } catch (error) {
        console.error('获取艺人详情失败:', error);
        this.error = error.response?.data?.message || '获取艺人详情失败';
        throw error;
      } finally {
        this.loading = false;
      }
    },
    
    // 获取艺人的主歌手信息
    async getCanonicalArtist(artistId) {
      try {
        const artist = await this.getArtistById(artistId);
        
        // 如果艺人没有关联主歌手，直接返回null
        if (!artist.canonicalArtistId) {
          return null;
        }
        
        // 如果已经缓存了主歌手信息，直接返回
        if (this.canonicalArtists[artist.canonicalArtistId]) {
          return this.canonicalArtists[artist.canonicalArtistId];
        }
        
        // 获取主歌手信息
        const canonicalArtist = await this.getArtistById(artist.canonicalArtistId);
        
        // 缓存主歌手信息
        this.canonicalArtists[artist.canonicalArtistId] = canonicalArtist;
        
        return canonicalArtist;
      } catch (error) {
        console.error('获取主歌手信息失败:', error);
        this.error = error.response?.data?.message || '获取主歌手信息失败';
        return null;
      }
    },
    
    // 批量获取艺人的主歌手信息
    async getCanonicalArtistsForList(artistList) {
      try {
        // 提取所有需要查询主歌手的艺人ID
        const artistsWithCanonical = artistList.filter(artist => artist.canonicalArtistId);
        
        if (artistsWithCanonical.length === 0) {
          return artistList;
        }
        
        // 收集所有需要查询的主歌手ID（去重）
        const canonicalIdsToFetch = new Set();
        artistsWithCanonical.forEach(artist => {
          // 如果没有缓存过这个主歌手，则需要查询
          if (!this.canonicalArtists[artist.canonicalArtistId]) {
            canonicalIdsToFetch.add(artist.canonicalArtistId);
          }
        });
        
        // 如果有需要查询的主歌手
        if (canonicalIdsToFetch.size > 0) {
          // 批量查询主歌手信息
          const response = await axios.get(`${API_BASE_URL}/artists/batch`, {
            params: { ids: Array.from(canonicalIdsToFetch).join(',') },
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
          });
          
          // 更新缓存
          response.data.forEach(canonicalArtist => {
            this.canonicalArtists[canonicalArtist.id] = canonicalArtist;
          });
        }
        
        // 为每个艺人添加主歌手信息
        const enrichedList = artistList.map(artist => {
          if (artist.canonicalArtistId && this.canonicalArtists[artist.canonicalArtistId]) {
            return {
              ...artist,
              canonicalArtist: this.canonicalArtists[artist.canonicalArtistId]
            };
          }
          return artist;
        });
        
        return enrichedList;
      } catch (error) {
        console.error('批量获取主歌手信息失败:', error);
        this.error = error.response?.data?.message || '批量获取主歌手信息失败';
        return artistList; // 出错时返回原始列表
      }
    },
    
    // 清除主歌手缓存
    clearCanonicalCache() {
      this.canonicalArtists = {};
    }
  }
}); 