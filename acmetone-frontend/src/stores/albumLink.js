import { defineStore } from 'pinia';
import axios from 'axios';
import { API_BASE_URL } from '@/config';

// 辅助函数：安全处理表演者信息
const safelyParsePerformers = (performersData, performerField) => {
  // 记录日志
  console.log('处理表演者数据，原始数据:', performersData);
  console.log('原始数据类型:', typeof performersData);
  
  // 如果没有提供表演者数据，试着从performerField中获取
  if (!performersData && performerField) {
    console.log('尝试从performer字段获取表演者:', performerField);
    performersData = performerField;
  }
  
  // 如果仍然没有数据，返回空数组
  if (!performersData) {
    return [];
  }
  
  // 如果已经是数组，直接返回
  if (Array.isArray(performersData)) {
    return performersData;
  }
  
  // 如果是字符串，可能是JSON或斜杠分隔的格式
  if (typeof performersData === 'string') {
    // 首先检查是否是斜杠分隔的格式
    if (performersData.includes('/')) {
      console.log('检测到斜杠分隔的表演者格式:', performersData);
      // 按斜杠分隔，并移除每个部分的首尾空格
      const performers = performersData.split('/').map(p => p.trim()).filter(p => p);
      return performers;
    }
    
    // 其次尝试解析为JSON
    try {
      // 有些情况下可能需要处理空字符串
      if (performersData.trim() === '') {
        return [];
      }
      
      const parsed = JSON.parse(performersData);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch (e) {
      console.error('解析表演者JSON失败:', e);
      // 如果无法解析为JSON，可能是单个名称，直接作为单元素数组返回
      return [performersData];
    }
  }
  
  // 如果是对象，转换为数组
  if (typeof performersData === 'object') {
    return [performersData];
  }
  
  // 其他类型返回空数组
  return [];
};

export const useAlbumLinkStore = defineStore('albumLink', {
  state: () => ({
    links: [],
    currentLink: null,
    total: 0,
    loading: false,
    error: null,
    internalAlbums: [], // 存储内部专辑列表
    internalSongs: [] // 存储内部歌曲列表
  }),
  
  getters: {
    // 获取单个链接
    getLink: (state) => (id) => {
      return state.links.find(link => link.id === id);
    },
    
    // 判断是否有链接
    hasLinks: (state) => state.links.length > 0
  },
  
  actions: {
    // 获取所有专辑链接（管理员）
    async fetchLinks({ page = 1, pageSize = 10, search = '' } = {}) {
      try {
        this.loading = true;
        this.error = null;
        
        const response = await axios.get(`${API_BASE_URL}/album-links`, {
          params: { page, pageSize, search }
        });
        
        this.links = response.data.links;
        this.total = response.data.total;
        
        return response.data;
      } catch (error) {
        this.error = error.response?.data?.message || '获取专辑链接列表失败';
        throw this.error;
      } finally {
        this.loading = false;
      }
    },
    
    // 获取当前用户的专辑链接
    async fetchUserLinks({ page = 1, pageSize = 10, search = '', status = '', albumId = null } = {}) {
      try {
        this.loading = true;
        this.error = null;
        
        const params = { page, pageSize, search, status };
        
        // 如果提供了albumId，添加到请求参数中
        if (albumId) {
          params.albumId = albumId;
        }
        
        const response = await axios.get(`${API_BASE_URL}/album-links/user`, {
          params
        });
        
        this.links = response.data.links;
        this.total = response.data.total;
        
        return response.data;
      } catch (error) {
        this.error = error.response?.data?.message || '获取您的专辑链接失败';
        throw this.error;
      } finally {
        this.loading = false;
      }
    },

    // 获取单个专辑链接详情
    async fetchLink(slug) {
      try {
        this.loading = true;
        this.error = null;
        
        const response = await axios.get(`${API_BASE_URL}/album-links/${slug}`);
        this.currentLink = response.data;
        
        return response.data;
      } catch (error) {
        this.error = error.response?.data?.message || '获取专辑链接详情失败';
        throw this.error;
      } finally {
        this.loading = false;
      }
    },
    
    // 按ID获取专辑链接详情
    async fetchLinkById(id) {
      try {
        this.loading = true;
        this.error = null;
        
        console.log('通过ID获取专辑链接详情:', id);
        
        // 先尝试从缓存的链接列表中查找
        let link = this.links.find(item => item.id === parseInt(id));
        
        if (link) {
          console.log('在缓存中找到专辑链接:', link);
          this.currentLink = link;
          return link;
        }
        
        // 如果本地没有，从API获取
        console.log('从API获取专辑链接详情...');
        
        // 先尝试使用slug获取
        try {
          const response = await axios.get(`${API_BASE_URL}/album-links/${id}`);
        if (response.data) {
            console.log('API返回的专辑链接详情:', JSON.stringify(response.data));
          this.currentLink = response.data;
          return response.data;
        }
        } catch (e) {
          console.log('通过搜索未找到，尝试直接通过ID获取...');
          // 如果通过slug获取失败，尝试通过ID获取
          const response = await axios.get(`${API_BASE_URL}/album-links/id/${id}`);
          if (response.data) {
            console.log('通过ID API找到专辑链接:', id);
            console.log('API返回的专辑链接详情(通过ID):', JSON.stringify(response.data));
            this.currentLink = response.data;
        
            // 在返回给前端前，处理每首歌曲的表演者信息
            if (response.data.songs && response.data.songs.length > 0) {
              response.data.songs = response.data.songs.map(song => {
                // 如果有内部歌曲ID，优先使用关联的歌曲的歌手信息，而不是专辑表演者
                if (song.internalSongId) {
                  console.log(`歌曲 ${song.songName} 有内部ID: ${song.internalSongId}，保留其自身歌手信息`);
                  return song;
                }
                
                // 如果歌曲没有artistName但有performer，使用performer作为artistName
                if (!song.artistName && song.performer) {
                  console.log(`修复歌曲 ${song.songName || song.title} 的艺术家信息，使用performer: ${song.performer}`);
                  song.artistName = song.performer;
                }
                
                // 如果歌曲有performer但格式是斜杠分隔的字符串
                if (song.performer && typeof song.performer === 'string' && song.performer.includes('/')) {
                  const performers = song.performer.split('/').map(p => p.trim()).filter(p => p);
                  console.log(`解析歌曲 ${song.songName || song.title} 的表演者信息:`, performers);
                  
                  // 如果仍然没有artistName，使用解析后的表演者列表
                  if (!song.artistName && performers.length > 0) {
                    song.artistName = performers.join(' & ');
                    console.log(`设置歌曲 ${song.songName || song.title} 的artistName为:`, song.artistName);
                  }
                }
                
                return song;
              });
            }
            
            return response.data;
          }
        }
        
        return null;
      } catch (error) {
        console.error('获取专辑链接详情失败:', error);
        this.error = error.response?.data?.message || '获取专辑链接详情失败';
        throw this.error;
      } finally {
        this.loading = false;
      }
    },
    
    // 创建专辑链接
    async createLink(formData) {
      try {
        this.loading = true;
        this.error = null;
        
        // 添加超时设置和重试配置
        const response = await axios.post(`${API_BASE_URL}/album-links`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          },
          timeout: 60000, // 60秒超时
          maxContentLength: Infinity, // 不限制内容长度
          maxBodyLength: Infinity, // 不限制请求体长度
          onUploadProgress: (progressEvent) => {
            console.log(`上传进度: ${Math.round(progressEvent.loaded / progressEvent.total * 100)}%`);
          }
        });
        
        // 添加到链接列表
        this.links.unshift(response.data);
        this.total++;
        
        return response.data;
      } catch (error) {
        console.error('创建专辑链接错误:', error);
        
        // 详细记录错误信息
        if (error.response) {
          console.error('错误状态码:', error.response.status);
          console.error('错误数据:', error.response.data);
        } else if (error.request) {
          console.error('请求已发送但未收到响应:', error.request);
        } else {
          console.error('请求设置错误:', error.message);
        }
        
        // 针对表单数据不完整错误提供更具体的错误信息
        if (error.response?.data?.errorCode === 'INCOMPLETE_FORM') {
          this.error = '上传过程中连接可能被中断，请尝试减小图片大小或使用图床链接';
        } else {
        this.error = error.response?.data?.message || '创建专辑链接失败';
        }
        
        throw this.error;
      } finally {
        this.loading = false;
      }
    },
    
    // 更新专辑链接
    async updateLink(id, data) {
      try {
        this.loading = true;
        this.error = null;
        
        const response = await axios.put(`${API_BASE_URL}/album-links/${id}`, data, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
        
        // 更新本地链接列表
        const index = this.links.findIndex(link => link.id === parseInt(id));
        if (index !== -1) {
          this.links[index] = response.data;
        }
        
        return response.data;
      } catch (error) {
        this.error = error.response?.data?.message || '更新专辑链接失败';
        throw this.error;
      } finally {
        this.loading = false;
      }
    },

    // 用户更新自己的专辑链接
    async updateUserLink(id, data) {
      try {
        this.loading = true;
        this.error = null;
        
        // 使用JSON格式发送数据
        const response = await axios.put(`${API_BASE_URL}/album-links/user/${id}`, data, {
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        // 更新本地链接列表
        const index = this.links.findIndex(link => link.id === parseInt(id));
        if (index !== -1) {
          this.links[index] = response.data;
        }
        
        return response.data;
      } catch (error) {
        this.error = error.response?.data?.message || '更新专辑链接失败';
        throw this.error;
      } finally {
        this.loading = false;
      }
    },
    
    // 切换链接状态
    async toggleLinkStatus(id) {
      try {
        const response = await axios.put(`${API_BASE_URL}/album-links/${id}/toggle-status`);
        
        // 更新本地链接列表
        const index = this.links.findIndex(link => link.id === parseInt(id));
        if (index !== -1) {
          this.links[index].isActive = response.data.albumLink.isActive;
        }
        
        return response.data;
      } catch (error) {
        console.error('切换链接状态失败:', error);
        this.error = error.response?.data?.message || '切换链接状态失败';
        throw this.error;
      }
    },

    // 删除专辑链接
    async deleteLink(id) {
      try {
        this.loading = true;
        this.error = null;
        
        await axios.delete(`${API_BASE_URL}/album-links/${id}`);
        
        // 从链接列表中移除
        const index = this.links.findIndex(link => link.id === id);
        if (index !== -1) {
          this.links.splice(index, 1);
          this.total--;
        }
        
        return true;
      } catch (error) {
        this.error = error.response?.data?.message || '删除专辑链接失败';
        throw this.error;
      } finally {
        this.loading = false;
      }
    },
    
    // 获取公开的专辑链接列表
    async fetchPublicLinks({ page = 1, pageSize = 10 } = {}) {
      try {
        this.loading = true;
        this.error = null;
        
        const response = await axios.get(`${API_BASE_URL}/album-links/public/list`, {
          params: { page, pageSize }
        });
        
        return response.data;
      } catch (error) {
        this.error = error.response?.data?.message || '获取公开专辑链接列表失败';
        throw this.error;
      } finally {
        this.loading = false;
      }
    },
    
    // 添加歌曲到专辑链接
    async addSongToAlbum(albumLinkId, songData) {
      try {
        this.loading = true;
        this.error = null;
        
        console.log(`准备添加歌曲到专辑链接 ID:${albumLinkId}, 数据:`, songData);
        
        // 解析表演者数据
        const performers = safelyParsePerformers(songData.performers, songData.performer);
        console.log('解析后的表演者数据:', performers);
        
        // 准备送入后端的数据
        const processedData = {
          ...songData,
          // 同时保存两种格式确保兼容性
          performers: performers,
          performer: Array.isArray(performers) ? performers.join('/') : performers
        };
        
        console.log('处理后的歌曲数据:', processedData);
        
        const response = await axios.post(`${API_BASE_URL}/album-links/${albumLinkId}/songs`, processedData);
        console.log('添加歌曲响应:', response.data);
        
        return response.data;
      } catch (error) {
        this.error = error.response?.data?.message || '添加歌曲失败';
        throw this.error;
      } finally {
        this.loading = false;
      }
    },
    
    // 更新专辑链接中的歌曲
    async updateSong(albumLinkId, songId, songData) {
      try {
        this.loading = true;
        this.error = null;
        
        const response = await axios.put(`${API_BASE_URL}/album-links/${albumLinkId}/songs/${songId}`, songData);
        
        return response.data;
      } catch (error) {
        this.error = error.response?.data?.message || '更新歌曲失败';
        throw this.error;
      } finally {
        this.loading = false;
      }
    },
    
    // 删除专辑链接中的歌曲
    async deleteSong(albumLinkId, songId) {
      try {
        this.loading = true;
        this.error = null;
        
        await axios.delete(`${API_BASE_URL}/album-links/${albumLinkId}/songs/${songId}`);
        
        return true;
      } catch (error) {
        this.error = error.response?.data?.message || '删除歌曲失败';
        throw this.error;
      } finally {
        this.loading = false;
      }
    },
    
    // 获取系统内部专辑列表（用于关联）
    async fetchInternalAlbums({ page = 1, pageSize = 20, search = '' } = {}) {
      try {
        this.loading = true;
        this.error = null;
        
        const response = await axios.get(`${API_BASE_URL}/albums`, {
          params: { page, pageSize, search, status: 'approved' }
        });
        
        // 处理返回的专辑数据，提取表演者信息
        if (response.data.albums && response.data.albums.length > 0) {
          console.log('专辑数据样例:', response.data.albums[0]);
          
          // 处理每个专辑的表演者信息
          const albums = response.data.albums.map(album => {
            // 提取表演者信息
            let performers = [];
            if (album.performers || album.performer) {
              // 尝试解析performers字符串或performer字段
              performers = safelyParsePerformers(album.performers, album.performer);
              console.log('解析专辑表演者信息:', performers);
            }
            
            let artistDisplay = album.artistName || '未知艺术家';
            
            // 如果有表演者信息但没有artistName，使用表演者作为显示
            if (performers.length > 0 && !album.artistName) {
              artistDisplay = performers.join(' & ');
            }
            
            // 如果有performer字段但没有表演者和artistName，使用performer
            if (!artistDisplay && album.performer) {
              artistDisplay = album.performer;
            }
            
            return {
              ...album,
              displayInfo: artistDisplay,
              performers: performers
            };
          });
          
          this.internalAlbums = albums;
          return albums;
        } else {
          this.internalAlbums = [];
          return [];
        }
      } catch (error) {
        this.error = error.response?.data?.message || '获取内部专辑列表失败';
        throw this.error;
      } finally {
        this.loading = false;
      }
    },
    
    // 获取系统内部专辑的歌曲列表（用于关联）
    async fetchInternalAlbumSongs(albumId) {
      if (!albumId) {
        console.error('获取内部专辑歌曲列表失败: 未提供专辑ID');
        return [];
      }
      
      try {
        this.loading = true;
        this.error = null;
        
        console.log('请求内部专辑歌曲:', `${API_BASE_URL}/albums/${albumId}/songs`);
        const response = await axios.get(`${API_BASE_URL}/albums/${albumId}/songs`);
        
        if (response.data && Array.isArray(response.data)) {
          console.log('获取到内部专辑歌曲数量:', response.data.length);
          
          // 处理歌曲数据，确保表演者信息正确
          const songs = response.data.map(song => {
            // 提取表演者信息
            const performers = safelyParsePerformers(song.performers, song.performer);
            console.log(`歌曲 ${song.title} 的表演者:`, performers);
            
            // 确保所有必要字段都存在
            return {
              ...song,
              trackNumber: song.trackNumber || 1, // 确保trackNumber字段存在
              performers: performers,
              // 如果没有artistName，尝试从Artists中获取
              artistName: song.artistName || (song.Artists && song.Artists.length > 0 ? 
                song.Artists.map(artist => artist.name).join(' & ') : null)
            };
          });
          
          this.internalSongs = songs;
          return songs;
        } else {
          console.warn('API返回的歌曲数据格式不正确:', response.data);
          this.internalSongs = [];
          return [];
        }
      } catch (error) {
        console.error('获取内部专辑歌曲列表失败:', error);
        this.error = error.response?.data?.message || '获取内部专辑歌曲列表失败';
        this.internalSongs = [];
        return [];
      } finally {
        this.loading = false;
      }
    },
    
    // 清空状态
    clearState() {
      this.links = [];
      this.currentLink = null;
      this.total = 0;
      this.error = null;
      this.internalAlbums = [];
      this.internalSongs = [];
    },
    
    // 创建内部专辑链接（不使用FormData，避免上传问题）
    async createInternalLink(data) {
      try {
        this.loading = true;
        this.error = null;
        
        console.log('创建内部专辑链接，原始数据:', data);
        console.log('表演者信息:', data.performers);
        console.log('表演者信息(performer):', data.performer);
        
        // 解析表演者信息
        const performers = safelyParsePerformers(data.performers, data.performer);
        console.log('处理后的表演者信息:', performers);
        
        // 确保表演者数据正确处理
        const processedData = {
          ...data,
          albumType: 'internal',
          // 同时保存两种格式确保兼容性
          performers: performers,
          performer: Array.isArray(performers) ? performers.join('/') : performers
        };
        
        console.log('处理后的数据:', processedData);
        
        const response = await axios.post(`${API_BASE_URL}/album-links/internal`, processedData, {
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        console.log('创建内部专辑链接响应:', response.data);
        
        // 添加到链接列表
        this.links.unshift(response.data);
        this.total++;
        
        return response.data;
      } catch (error) {
        console.error('创建内部专辑链接错误:', error);
        
        // 详细记录错误信息
        if (error.response) {
          console.error('错误状态码:', error.response.status);
          console.error('错误数据:', error.response.data);
        } else if (error.request) {
          console.error('请求已发送但未收到响应:', error.request);
        } else {
          console.error('请求设置错误:', error.message);
        }
        
        this.error = error.response?.data?.message || '创建内部专辑链接失败';
        throw this.error;
      } finally {
        this.loading = false;
      }
    }
  }
}); 