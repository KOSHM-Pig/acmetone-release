/**
 * 专辑管理Store
 * 版本: 1.0.1
 * 最后更新: 2025-06-04
 */

import { defineStore } from 'pinia';
import axios from 'axios';
import { API_BASE_URL } from '@/config';
import { useUserStore } from '@/stores/user';
import { generateAuthorizationFile as generateAuth, generateTempAuthorizationFile as generateTempAuth } from '@/utils/authorizationService';

export const useAlbumStore = defineStore('album', {
  state: () => ({
    albums: [],
    currentAlbum: null,
    pendingAlbums: [],
    loading: false,
    error: null,
    lastAddedSongId: null
  }),

  actions: {
    async createAlbum(albumData) {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('未登录');
        }

        // 检查封面图片大小
        if (albumData.coverImage && albumData.coverImage.size > 20 * 1024 * 1024) {
          throw new Error('封面图片大小不能超过20MB，请压缩后重试');
        }

        // 直接使用原始图片，不进行压缩
        const coverImageToUpload = albumData.coverImage;
        

        // 添加重试机制
        const maxRetries = 3;
        let retryCount = 0;
        let lastError = null;

        while (retryCount < maxRetries) {
          try {
            
            // 检查是否需要使用分片上传（大于5MB）
            const LARGE_FILE_THRESHOLD = 5 * 1024 * 1024; // 5MB
            if (coverImageToUpload && coverImageToUpload.size > LARGE_FILE_THRESHOLD) {
              console.log('封面图片大于5MB，使用分片上传');
              const coverImageUrl = await this.uploadCoverImageInChunks(coverImageToUpload);
              
              // 构建请求数据，使用已上传的图片URL
              const requestData = {
                ...albumData,
                coverImage: undefined, // 移除文件对象
                coverImageUrl: coverImageUrl, // 使用已上传图片的URL
                coverImageType: coverImageToUpload.type,
                coverImageName: `cover_${Date.now()}.${coverImageToUpload.name.split('.').pop()}`
              };
              
              const response = await axios.post(`${API_BASE_URL}/albums`, requestData, {
                headers: { 
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                timeout: 60000 // 设置60秒超时
              });
              
              return response.data;
            }
            
            // 将图片转换为Base64
            const base64Image = await this.fileToBase64(coverImageToUpload);
            
            // 构建请求数据
            const requestData = {
              ...albumData,
              coverImage: undefined, // 移除文件对象
              coverImageBase64: base64Image,
              coverImageType: coverImageToUpload.type,
              coverImageName: `cover_${Date.now()}.${coverImageToUpload.name.split('.').pop()}`
            };
            
           
            
            const response = await axios.post(`${API_BASE_URL}/albums/base64-upload`, requestData, {
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              timeout: 60000 // 设置60秒超时
            });
            
            
            return response.data;
          } catch (error) {
            lastError = error;
            retryCount++;
            
            // 记录详细错误信息
            console.error(`创建专辑尝试 ${retryCount}/${maxRetries} 失败:`, {
              status: error.response?.status,
              message: error.response?.data?.message || error.message,
              detail: error.response?.data?.detail || '未知错误',
              errorCode: error.response?.data?.errorCode
            });
            
            // 如果是特定错误，不再重试
            if (error.response) {
              // 如果是413错误(文件太大)或401错误(未授权)，不再重试
              if (error.response.status === 413 || error.response.status === 401) {
                throw error;
              }
            }
            
            // 如果还有重试次数，等待后重试
            if (retryCount < maxRetries) {
              const waitTime = 2000 * retryCount; // 递增等待时间
              
              await new Promise(resolve => setTimeout(resolve, waitTime));
            }
          }
        }
        
        // 所有重试都失败
        throw lastError;
      } catch (error) {
        console.error('创建专辑错误:', error);
        const errorMessage = error.response?.data?.message || error.response?.data?.detail || error.message || '创建专辑失败';
        throw errorMessage;
      }
    },

    // 分片上传封面图片
    async uploadCoverImageInChunks(file) {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('未登录');
        }
        
        // 为当前专辑创建一个临时ID，用于创建后关联封面
        const tempAlbumId = 'temp'; // 临时ID
        
        const chunkSize = 2 * 1024 * 1024; // 2MB分片
        const totalChunks = Math.ceil(file.size / chunkSize);
        const fileId = Date.now().toString() + Math.random().toString(36).substring(2, 15);
        
        console.log(`开始分片上传封面图片: 总大小=${file.size}字节, 分片大小=${chunkSize}字节, 分片数=${totalChunks}`);
        
        // 上传所有分片
        for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
          const start = chunkIndex * chunkSize;
          const end = Math.min(file.size, start + chunkSize);
          const chunk = file.slice(start, end);
          
          // 将分片转换为Base64
          const base64Chunk = await this.fileToBase64(chunk);
          
          // 构建请求数据
          const chunkData = {
            fileId,
            chunkIndex,
            totalChunks,
            fileName: file.name,
            fileType: file.type,
            chunkData: base64Chunk
          };
          
          // 发送分片
          const chunkResponse = await axios.post(
            `${API_BASE_URL}/album-cover/${tempAlbumId}/upload-chunk-base64`,
            chunkData,
            {
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              }
            }
          );
          
          console.log(`封面分片 ${chunkIndex + 1}/${totalChunks} 上传成功`);
        }
        
        // 所有分片上传完成，请求合并
        const mergeData = {
          fileId,
          totalChunks,
          filename: file.name,
          fileType: file.type,
          fileSize: file.size
        };
        
        const mergeResponse = await axios.post(
          `${API_BASE_URL}/album-cover/${tempAlbumId}/merge-chunks-base64`,
          mergeData,
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          }
        );
        
        console.log('封面图片分片合并成功:', mergeResponse.data);
        
        // 返回合并后的图片路径
        return mergeResponse.data.coverImage;
      } catch (error) {
        console.error('分片上传封面图片失败:', error);
        throw error;
      }
    },

    // 将文件转换为Base64
    async fileToBase64(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64String = reader.result.split(',')[1];
          resolve(base64String);
        };
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
      });
    },

    // 图片压缩方法
    async compressImage(file, maxWidth, quality = 0.8) {
      return new Promise((resolve, reject) => {
        try {
          const reader = new FileReader();
          reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
              // 计算新的尺寸，保持宽高比
              let width = img.width;
              let height = img.height;
              
              if (width > maxWidth) {
                height = (height * maxWidth) / width;
                width = maxWidth;
              }
              
              // 创建canvas并绘制图片
              const canvas = document.createElement('canvas');
              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext('2d');
              ctx.drawImage(img, 0, 0, width, height);
              
              // 转换为Blob
              canvas.toBlob((blob) => {
                if (!blob) {
                  reject(new Error('图片压缩失败'));
                  return;
                }
                
                // 创建新的File对象
                const compressedFile = new File([blob], file.name, {
                  type: file.type,
                  lastModified: file.lastModified
                });
                
                resolve(compressedFile);
              }, file.type, quality);
            };
            
            img.onerror = () => reject(new Error('图片加载失败'));
            img.src = event.target.result;
          };
          
          reader.onerror = () => reject(new Error('文件读取失败'));
          reader.readAsDataURL(file);
        } catch (error) {
          reject(error);
        }
      });
    },

    async addSong(albumId, songData, progressCallback) {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('未登录');
        }
        
        // 检查文件大小，超过10MB使用Base64分片上传
        const LARGE_FILE_THRESHOLD = 10 * 1024 * 1024; // 10MB
        if (songData.wavFile && songData.wavFile.size > LARGE_FILE_THRESHOLD) {
          
          return await this.uploadLargeFileBase64(albumId, songData, progressCallback);
        }

        // 格式化歌手数据
        let formattedArtists = [];
        if (songData.artists) {
          if (Array.isArray(songData.artists)) {
            formattedArtists = songData.artists.map(artist => {
              // 如果artist已经是对象，确保至少有id和name字段
              if (typeof artist === 'object' && artist !== null) {
                return {
                  id: artist.id || null,
                  name: artist.name || `歌手#${artist.id || '未知'}`,
                  realName: artist.realName || ''
                };
              }
              // 如果artist是数字ID
              else if (typeof artist === 'number') {
                return { id: artist, name: `歌手#${artist}` };
              }
              // 如果artist是字符串ID或名称
              else if (typeof artist === 'string') {
                const artistId = parseInt(artist, 10);
                if (!isNaN(artistId)) {
                  return { id: artistId, name: `歌手#${artistId}` };
                }
                return { name: artist };
              }
              // 默认返回
              return { name: '未知歌手' };
            });
          }
          // 如果传入的是artistIds数组
          else if (songData.artistIds && Array.isArray(songData.artistIds)) {
            formattedArtists = songData.artistIds.map(id => ({ id }));
          }
        }
        
        console.log('格式化后的歌手数据:', formattedArtists);

        // 小文件使用常规上传
        const formData = new FormData();
        formData.append('title', songData.title);
        formData.append('genre', songData.genre);
        formData.append('language', songData.language);
        formData.append('wavFile', songData.wavFile);
        
        // 添加歌词文件(如果存在)
        if (songData.lyricsFile) {
          
          formData.append('lyricsFile', songData.lyricsFile);
        }
        
        // 添加翻译歌词文件(如果存在)
        if (songData.translationLyricsFile) {
          
          formData.append('translationLyricsFile', songData.translationLyricsFile);
        }
        
        // 添加歌手数据
        formData.append('artists', JSON.stringify(formattedArtists));
        
        // 如果有artistIds数组，也添加
        if (songData.artistIds && Array.isArray(songData.artistIds)) {
          formData.append('artistIds', JSON.stringify(songData.artistIds));
        }

        const response = await axios.post(
          `${API_BASE_URL}/albums/${albumId}/songs`,
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
              'Authorization': `Bearer ${token}`
            },
            onUploadProgress: (progressEvent) => {
              if (progressCallback) {
                const progress = Math.round((progressEvent.loaded / progressEvent.total) * 100);
                
                progressCallback(progress);
              }
            }
          }
        );
        
        // 保存新添加歌曲的ID
        if (response.data && response.data.id) {
          this.lastAddedSongId = response.data.id;
          
        } else {
          this.lastAddedSongId = null;
          console.warn('API返回的数据中没有歌曲ID');
        }
        
        return response.data;
      } catch (error) {
        console.error('添加歌曲错误:', error);
        if (error.response) {
          console.error('错误响应状态:', error.response.status);
          console.error('错误响应数据:', error.response.data);
          throw error.response.data.message || '添加歌曲失败';
        }
        throw error.message || '添加歌曲失败';
      }
    },

    // 使用Base64上传大文件
    async uploadWithBase64(albumId, songData, progressCallback) {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('未登录');
        }
        
        
        
        // 将WAV文件转换为Base64
        if (progressCallback) {
          progressCallback(10); // 开始转换为Base64
        }
        
        const base64Data = await this.fileToBase64(songData.wavFile);
        
        
        if (progressCallback) {
          progressCallback(30); // Base64转换完成
        }
        
        // 构建请求数据
        const requestData = {
          title: songData.title,
          genre: songData.genre,
          language: songData.language,
          artists: songData.artists,
          fileName: songData.wavFile.name,
          fileType: songData.wavFile.type,
          fileSize: songData.wavFile.size,
          fileData: base64Data
        };
        
        // 如果有歌词文件，也转换为Base64
        if (songData.lyricsFile) {
         
          const lyricsBase64 = await this.fileToBase64(songData.lyricsFile);
          requestData.lyricsFileName = songData.lyricsFile.name;
          requestData.lyricsFileType = songData.lyricsFile.type;
          requestData.lyricsFileData = lyricsBase64;
        }
        
        // 如果有翻译歌词文件，也转换为Base64
        if (songData.translationLyricsFile) {
          
          const translationLyricsBase64 = await this.fileToBase64(songData.translationLyricsFile);
          requestData.translationLyricsFileName = songData.translationLyricsFile.name;
          requestData.translationLyricsFileType = songData.translationLyricsFile.type;
          requestData.translationLyricsFileData = translationLyricsBase64;
        }
        
        if (progressCallback) {
          progressCallback(50); // 准备发送请求
        }
        
        // 发送请求
        const response = await axios.post(
          `${API_BASE_URL}/albums/${albumId}/songs-base64`,
          requestData,
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            onUploadProgress: (progressEvent) => {
              if (progressCallback) {
                // 上传进度从50%到90%
                const uploadProgress = progressEvent.loaded / progressEvent.total;
                const overallProgress = 50 + (uploadProgress * 40);
                progressCallback(Math.round(overallProgress));
              }
            }
          }
        );
        
        if (progressCallback) {
          progressCallback(100); // 上传完成
        }
        
        // 保存新添加歌曲的ID
        if (response.data && response.data.id) {
          this.lastAddedSongId = response.data.id;
          
        } else {
          this.lastAddedSongId = null;
          
        }
        
        return response.data;
      } catch (error) {
       
        throw error.response?.data?.message || 'Base64上传失败';
      }
    },

    async deleteSong(albumId, songId) {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('未登录');
        }

        await axios.delete(
          `${API_BASE_URL}/albums/${albumId}/songs/${songId}`,
          {
            headers: { 
              'Authorization': `Bearer ${token}`
            },
          }
        );
      } catch (error) {
        console.error('删除歌曲错误:', error);
        throw error.response?.data?.message || '删除歌曲失败';
      }
    },

    async fetchUserAlbums() {
      try {
        
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('未登录');
        }

        const response = await axios.get(`${API_BASE_URL}/albums/my`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
       
        this.albums = response.data;
        return response.data;
      } catch (error) {
        console.error('获取专辑列表错误:', error);
        throw error.response?.data?.message || '获取专辑列表失败';
      }
    },

    async fetchPendingAlbums() {
      try {
        
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('未登录');
        }

        const response = await axios.get(`${API_BASE_URL}/albums/pending`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        

        // 确保返回的是数组
        if (!Array.isArray(response.data)) {
          console.error('API返回的数据不是数组格式:', response.data);
          this.pendingAlbums = [];
          throw new Error('服务器返回数据格式错误');
        }
        
        this.pendingAlbums = response.data;
        return response.data;
      } catch (error) {
        console.error('获取待审核专辑详细错误:', error);
        if (error.response) {
          console.error('响应状态:', error.response.status);
          console.error('响应数据:', error.response.data);
        }
        throw error.response?.data?.message || '获取待审核专辑失败';
      }
    },

    async fetchAllAlbums(page = 1, pageSize = 20, filters = {}) {
      try {
        
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('未登录');
        }

        const params = {
          page,
          pageSize,
          ...filters
        };

        const response = await axios.get(`${API_BASE_URL}/admin/all-albums`, {
          headers: { 'Authorization': `Bearer ${token}` },
          params
        });
        
        
        
        return response.data;
      } catch (error) {
        console.error('获取所有专辑错误:', error);
        if (error.response) {
          console.error('响应状态:', error.response.status);
          console.error('响应数据:', error.response.data);
        }
        throw error.response?.data?.message || '获取所有专辑失败';
      }
    },

    async fetchAlbumDetail(albumId) {
      try {
        
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('未登录');
        }

       
        
        // 添加请求超时设置
        const response = await axios.get(`${API_BASE_URL}/albums/${albumId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          },
          timeout: 30000, // 30秒超时
          validateStatus: status => {
            
            return status >= 200 && status < 300; // 只接受2xx状态码
          }
        });

        

        if (!response.data) {
          console.error('API响应数据为空');
          throw new Error('未获取到专辑数据');
        }

        

        this.currentAlbum = response.data;
        return response.data;
      } catch (error) {
        console.error('获取专辑详情错误:', error);
        
        // 记录请求错误的详细信息
        if (error.request) {
          console.error('请求详情:', {
            url: error.config?.url,
            method: error.config?.method,
            headers: error.config?.headers,
            timeout: error.config?.timeout
          });
        }
        
        if (error.response) {
          console.error('错误响应:', {
            status: error.response.status,
            statusText: error.response.statusText,
            data: error.response.data,
            headers: error.response.headers
          });
        }
        
        if (error.code === 'ECONNABORTED') {
          throw new Error('获取专辑详情超时，请检查网络连接');
        }
        
        if (error.response?.status === 404) {
          throw new Error('专辑不存在');
        } else if (error.response?.status === 401) {
          // 重新获取token并尝试再次请求
          try {
            // 尝试刷新token或重新登录
            const userStore = useUserStore();
            await userStore.init();
            
            // 如果成功获取到新token，再次尝试请求
            const newToken = localStorage.getItem('token');
            if (newToken) {
              const response = await axios.get(`${API_BASE_URL}/albums/${albumId}`, {
                headers: {
                  'Authorization': `Bearer ${newToken}`
                }
              });
              this.currentAlbum = response.data;
              return response.data;
            } else {
              throw new Error('登录已过期，请重新登录');
            }
          } catch (retryError) {
            throw new Error('登录已过期，请重新登录');
          }
        } else if (error.response?.status === 403) {
          throw new Error('您无权访问此专辑');
        } else if (error.response?.status >= 500) {
          throw new Error('服务器错误，请稍后再试');
        } else {
          throw error.response?.data?.message || error.message || '获取专辑详情失败';
        }
      }
    },

    async updateAlbumStatus(albumId, status, comment) {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('未登录');
        }

        console.log('更新专辑状态:', { albumId, status, comment });

        // 确保状态值有效
        if (!['pending', 'approved', 'rejected'].includes(status)) {
          throw new Error('无效的状态值，只能是pending、approved或rejected');
        }

        // 处理草稿状态的特殊情况
        const isDraft = status === 'pending' && comment && comment.startsWith('DRAFT:');
        
        // 如果是草稿状态，确保评论以DRAFT:开头
        if (isDraft && !comment.startsWith('DRAFT:')) {
          comment = 'DRAFT: 尚未提交审核';
        }
        
        // 如果是待审核状态且没有评论，设置默认评论
        if (status === 'pending' && !isDraft && !comment) {
          comment = '已重新提交审核';
        }

        const response = await axios.patch(
          `${API_BASE_URL}/albums/${albumId}/status`, 
          { status, comment },
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        // 如果是当前查看的专辑，更新状态
        if (this.currentAlbum && this.currentAlbum.id === parseInt(albumId)) {
          this.currentAlbum.status = status;
          this.currentAlbum.comment = comment;
          
          // 更新虚拟状态
          this.currentAlbum.virtualStatus = isDraft ? 'draft' : status;
          this.currentAlbum.isDraft = isDraft;
        }
        
        return response.data;
      } catch (error) {
        console.error('更新专辑状态错误:', error);
        throw error.response?.data?.message || error.message || '更新专辑状态失败';
      }
    },
    
    async submitAlbumForReview(albumId) {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('未登录');
        }

        const response = await axios.post(
          `${API_BASE_URL}/albums/${albumId}/submit`,
          {},
          {
          headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        return response.data;
      } catch (error) {
        console.error('提交专辑审核错误:', error);
        throw error.response?.data?.message || '提交专辑审核失败';
      }
    },
    
    // 重新提交已拒绝的专辑
    async resubmitAlbumForReview(albumId) {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('未登录');
        }

        const response = await axios.post(
          `${API_BASE_URL}/albums/${albumId}/resubmit`,
          {},
          {
          headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        return response.data;
      } catch (error) {
        console.error('重新提交专辑审核错误:', error);
        throw error.response?.data?.message || '重新提交专辑审核失败';
      }
    },
    
    async updateSongArtists(albumId, updateData) {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('未登录');
        }

        // 处理歌手ID，确保使用正确的数据库ID
        const processedArtists = updateData.artists.map(artist => {
          // 创建一个新对象，避免修改原始对象
          const processedArtist = { ...artist };
          
          // 处理可能的节点ID格式（如"artist-15"）
          if (typeof processedArtist.id === 'string' && processedArtist.id.startsWith('artist-')) {
            const match = processedArtist.id.match(/artist-(\d+)/);
            if (match && match[1]) {
              processedArtist.id = parseInt(match[1]);
            }
          }
          
          // 处理浮点数ID - 转换为整数
          if (typeof processedArtist.id === 'number' && !Number.isInteger(processedArtist.id)) {
            console.warn(`发现浮点数ID: ${processedArtist.id}，将转换为整数`);
            processedArtist.id = Math.floor(processedArtist.id);
          }
          
          // 处理字符串数字ID
          if (typeof processedArtist.id === 'string' && !isNaN(Number(processedArtist.id))) {
            processedArtist.id = parseInt(processedArtist.id);
          }
          
          return processedArtist;
        });
        
        // 确保至少有一个歌手
        if (!processedArtists || processedArtists.length === 0) {
          throw new Error('请至少添加一位歌手');
        }

        console.log('更新歌曲歌手关联:', {
          albumId,
          songId: updateData.songId,
          artistsCount: processedArtists.length
        });

        const response = await axios.put(
          `${API_BASE_URL}/albums/${albumId}/songs/${updateData.songId}/artists`,
          { 
            artists: processedArtists, // 使用处理后的歌手数组
            title: updateData.title,
            genre: updateData.genre,
            language: updateData.language
          },
          {
            headers: { 
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
          }
        );
        
        return response.data;
      } catch (error) {
        console.error('更新歌曲信息错误:', error);
        throw error.response?.data?.message || '更新歌曲信息失败';
      }
    },
    
    // 更新歌曲顺序
    async updateSongOrder(albumId, songIds) {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('未登录');
        }

        // 确保所有songIds都是数字类型
        const numericSongIds = songIds.map(id => {
          if (typeof id === 'string') {
            const parsedId = parseInt(id, 10);
            if (!isNaN(parsedId)) {
              return parsedId;
            } else {
              console.warn(`无法将歌曲ID "${id}" 转换为数字，将跳过此歌曲`);
              return null;
            }
          }
          return id;
        }).filter(id => id !== null);

        if (numericSongIds.length === 0) {
          throw new Error('没有有效的歌曲ID可以更新');
        }

        console.log('更新歌曲顺序:', {
          albumId,
          originalIds: songIds,
          processedIds: numericSongIds
        });

        // 使用PUT请求更新歌曲顺序(使用新的API路径避免路由冲突)
        const response = await axios.put(
          `${API_BASE_URL}/albums/${albumId}/update-songs-order`,
          { songIds: numericSongIds },
          {
            headers: { 
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
          }
        );
        
        return response.data;
      } catch (error) {
        console.error('更新歌曲顺序错误:', error);
        throw error.response?.data?.message || '更新歌曲顺序失败';
      }
    },
    
    // 上传授权书文件
    async uploadAuthorizationFile(albumId, formData) {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('未登录');
        }
        
        // 检查formData中是否包含授权书文件
        let hasAuthFile = false;
        let authFile = null;
        
        
        for (let [key, value] of formData.entries()) {
          
          if (key === 'authorizationFile' && value instanceof File) {
            hasAuthFile = true;
            authFile = value;
            
          }
        }
        
        if (!hasAuthFile) {
          throw new Error('未找到授权书文件，请确保使用正确的字段名"authorizationFile"');
        }
        
        

        // 直接使用原始formData
        const response = await axios.post(
          `${API_BASE_URL}/albums/${albumId}/authorization`,
          formData,
          {
            headers: { 
              'Content-Type': 'multipart/form-data',
              'Authorization': `Bearer ${token}`
            },
          }
        );
        
        
        return response.data;
      } catch (error) {
        
        
        // 打印更详细的错误信息
        if (error.response) {
          console.error('错误状态码:', error.response.status);
          console.error('错误数据:', error.response.data);
          console.error('错误头信息:', error.response.headers);
        } else if (error.request) {
          console.error('请求已发送但未收到响应:', error.request);
        } else {
          console.error('请求设置错误:', error.message);
        }
        
        throw error.response?.data?.message || '上传授权书失败';
      }
    },
    
    // 使用Base64上传授权书文件
    async uploadAuthorizationFileBase64(albumId, authFile) {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('未登录');
        }
        
        
        
        // 将PDF文件转换为Base64
        const base64Data = await this.fileToBase64(authFile);
        
        
        // 构建请求数据
        const requestData = {
          fileName: authFile.name,
          fileType: authFile.type,
          fileSize: authFile.size,
          fileData: base64Data
        };
        
        // 发送请求
        const response = await axios.post(
          `${API_BASE_URL}/albums/${albumId}/authorization-base64`,
          requestData,
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          }
        );
        
        
        
        return response.data;
      } catch (error) {
        console.error('Base64上传授权书错误:', error);
        
        // 打印更详细的错误信息
        if (error.response) {
          console.error('错误状态码:', error.response.status);
          console.error('错误数据:', error.response.data);
          console.error('错误头信息:', error.response.headers);
        } else if (error.request) {
          console.error('请求已发送但未收到响应:', error.request);
        } else {
          console.error('请求设置错误:', error.message);
        }
        
        throw error.response?.data?.message || 'Base64上传授权书失败';
      }
    },

    // 删除授权书文件
    async deleteAuthorizationFile(albumId) {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('未登录');
        }

        // 获取用户角色
        const userRole = JSON.parse(localStorage.getItem('user'))?.role || '';
        const isAdmin = userRole === 'admin';
        
        // 根据用户角色选择不同的API路径
        const apiPath = isAdmin 
          ? `${API_BASE_URL}/albums/${albumId}/authorization` 
          : `${API_BASE_URL}/albums/${albumId}/authorization`;

        
        
        const response = await axios.delete(
          apiPath,
          {
            headers: { 
              'Authorization': `Bearer ${token}`
            },
          }
        );
        
        return response.data;
      } catch (error) {
        console.error('删除授权书错误:', error);
        throw error.response?.data?.message || '删除授权书失败';
      }
    },
    
    // 删除专辑
    async deleteAlbum(albumId) {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('未登录');
        }

        const response = await axios.delete(
          `${API_BASE_URL}/albums/${albumId}`,
          {
            headers: { 
              'Authorization': `Bearer ${token}`
            },
          }
        );
        
        // 从本地状态中移除已删除的专辑
        this.albums = this.albums.filter(album => album.id !== parseInt(albumId));
        
        return response.data;
      } catch (error) {
        console.error('删除专辑错误:', error);
        throw error.response?.data?.message || '删除专辑失败';
      }
    },

    // 更新歌曲WAV文件
    async updateSongWithWav(albumId, updateData, progressCallback) {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('未登录');
        }
        
        

        // 检查文件大小，超过10MB使用Base64分片上传
        const LARGE_FILE_THRESHOLD = 10 * 1024 * 1024; // 10MB
        if (updateData.wavFile && updateData.wavFile.size > LARGE_FILE_THRESHOLD) {
          
          
          const file = updateData.wavFile;
          const chunkSize = 5 * 1024 * 1024; // 5MB分片
          const totalChunks = Math.ceil(file.size / chunkSize);
          const fileId = Date.now().toString() + Math.random().toString(36).substring(2, 15);

          

          // 上传所有分片
          for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
            const start = chunkIndex * chunkSize;
            const end = Math.min(file.size, start + chunkSize);
            const chunk = file.slice(start, end);

            // 更新起始进度
            if (progressCallback) {
              const startProgress = Math.round((chunkIndex / totalChunks) * 100);
              progressCallback(startProgress);
            }

            
            
            try {
              // 将分片转换为Base64
              const base64Chunk = await this.fileToBase64(chunk);
             
              // 构建请求数据
              const chunkData = {
                fileId,
                chunkIndex: chunkIndex,
                totalChunks,
                fileName: file.name,
                fileType: file.type,
                chunkData: base64Chunk,
                songId: updateData.songId // 添加歌曲ID，用于更新操作
              };
              
              const response = await axios.post(
                `${API_BASE_URL}/albums/${albumId}/upload-chunk-base64`,
                chunkData,
                {
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                  },
                  onUploadProgress: (progressEvent) => {
                    if (progressCallback) {
                      // 计算整体上传进度
                      const chunkProgress = progressEvent.loaded / progressEvent.total;
                      const overallProgress = ((chunkIndex + chunkProgress) / totalChunks) * 100;
                      const roundedProgress = Math.round(overallProgress);
                     
                      progressCallback(roundedProgress);
                    }
                  }
                }
              );
              
             
            } catch (error) {
              
              throw error;
            }

            // 更新每个分片完成后的进度
            if (progressCallback) {
              const chunkCompleteProgress = Math.round(((chunkIndex + 1) / totalChunks) * 100);
              
              progressCallback(chunkCompleteProgress);
            }
          }

          // 所有分片上传完成，请求合并
          // 确保显示100%进度
          if (progressCallback) {
            progressCallback(100);
          }
          
          const mergeData = {
            fileId,
            totalChunks,
            filename: file.name,
            fileType: file.type,
            fileSize: file.size,
            title: updateData.title,
            genre: updateData.genre,
            language: updateData.language,
            artists: JSON.stringify(updateData.artists),
            songId: updateData.songId // 添加歌曲ID，用于更新操作
          };

          
          
          // 使用专门的更新WAV文件的API路径
          const mergeResponse = await axios.post(
            `${API_BASE_URL}/albums/${albumId}/songs/${updateData.songId}/merge-wav`,
            mergeData,
            {
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              }
            }
          );
          
          
          return mergeResponse.data;
        } else {
          // 小文件使用常规上传
          const formData = new FormData();
          formData.append('title', updateData.title);
          formData.append('genre', updateData.genre);
          formData.append('language', updateData.language);
          formData.append('wavFile', updateData.wavFile);
          formData.append('artists', JSON.stringify(updateData.artists));

          const response = await axios.put(
            `${API_BASE_URL}/albums/${albumId}/songs/${updateData.songId}/wav`,
            formData,
            {
              headers: {
                'Content-Type': 'multipart/form-data',
                'Authorization': `Bearer ${token}`
              },
              onUploadProgress: (progressEvent) => {
                if (progressCallback) {
                  const progress = Math.round((progressEvent.loaded / progressEvent.total) * 100);
                  
                  progressCallback(progress);
                }
              }
            }
          );
          
          
          return response.data;
        }
      } catch (error) {
        
        throw error.response?.data?.message || '更新歌曲WAV文件失败';
      }
    },

    // 下载授权书文件
    async downloadAuthorizationFile(albumId) {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('未登录');
        }

        // 获取专辑详情，用于命名下载的文件
        let albumTitle = '';
        let authFileName = '';
        try {
          const albumResponse = await axios.get(`${API_BASE_URL}/albums/${albumId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          albumTitle = albumResponse.data.title || '';
          
          // 如果有授权书文件，获取原始文件名
          if (albumResponse.data.authorizationFile) {
            // 处理Windows和Unix路径
            let fileName = albumResponse.data.authorizationFile.split(/[\/\\]/).pop();
            
            // 如果文件名包含时间戳前缀（格式：timestamp-filename.pdf 或 temp_timestamp.pdf），则移除前缀
            const timestampMatch = fileName.match(/^(temp_)?\d+-?(.+)$/);
            if (timestampMatch && timestampMatch[2]) {
              fileName = timestampMatch[2];
            }
            
            authFileName = fileName;
          }
        } catch (err) {
          console.warn('获取专辑信息失败，将使用默认文件名', err);
        }

        const response = await axios.get(
          `${API_BASE_URL}/albums/${albumId}/authorization`,
          {
            headers: { 
              'Authorization': `Bearer ${token}`
            },
            responseType: 'blob'
          }
        );
        
        // 创建下载链接
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        
        // 设置下载文件名
        // 如果有原始文件名，优先使用；否则使用专辑标题生成文件名
        let downloadFileName;
        if (authFileName) {
          downloadFileName = authFileName;
        } else {
          downloadFileName = `授权书-${albumTitle || albumId}.pdf`;
        }
        
        link.setAttribute('download', downloadFileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        return response.data;
      } catch (error) {
        console.error('下载授权书错误:', error);
        throw error.response?.data?.message || '下载授权书失败';
      }
    },

    // 生成临时授权书文件
    async generateTempAuthorizationFile(albumId, data) {
      try {
        
        
        // 验证输入数据
        if (!data.idNumber) {
          throw new Error('身份证号码不能为空');
        }
        
        if (!data.realName) {
          throw new Error('真实姓名不能为空');
        }
        
        // 调用工具函数生成授权书
        try {
          const result = await generateTempAuth(albumId, data);
          
          return result;
        } catch (generateError) {
          console.error('生成临时授权书错误:', generateError);
          console.error('错误详情:', generateError.response?.data || generateError.message);
          
          // 如果是API错误，提供更详细的错误信息
          if (generateError.response && generateError.response.data) {
            throw new Error(generateError.response.data.message || '生成授权书失败，请稍后再试');
          }
          
          throw generateError;
        }
      } catch (error) {
        console.error('生成临时授权书错误:', error);
        throw error.response?.data?.message || error.message || '生成授权书失败';
      }
    },


    // Base64分片上传大文件
    async uploadLargeFileBase64(albumId, songData, progressCallback) {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('未登录');
        }

        const file = songData.wavFile;
        const chunkSize = 5 * 1024 * 1024; // 5MB分片
        const totalChunks = Math.ceil(file.size / chunkSize);
        const fileId = Date.now().toString() + Math.random().toString(36).substring(2, 15);

        

        // 上传所有分片
        for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
          const start = chunkIndex * chunkSize;
          const end = Math.min(file.size, start + chunkSize);
          const chunk = file.slice(start, end);

          // 更新起始进度
          if (progressCallback) {
            const startProgress = Math.round((chunkIndex / totalChunks) * 100);
            progressCallback(startProgress);
          }

          
          
          try {
            // 将分片转换为Base64
            const base64Chunk = await this.fileToBase64(chunk);
            
            // 构建请求数据
            const chunkData = {
              fileId,
              chunkIndex: chunkIndex,
              totalChunks,
              fileName: file.name,
              fileType: file.type,
              chunkData: base64Chunk
            };
            

            
            const response = await axios.post(
              `${API_BASE_URL}/albums/${albumId}/upload-chunk-base64`,
              chunkData,
              {
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                onUploadProgress: (progressEvent) => {
                  if (progressCallback) {
                    // 计算整体上传进度
                    const chunkProgress = progressEvent.loaded / progressEvent.total;
                    const overallProgress = ((chunkIndex + chunkProgress) / totalChunks) * 100;
                    const roundedProgress = Math.round(overallProgress);
                    
                    progressCallback(roundedProgress);
                  }
                }
              }
            );
            
            
          } catch (error) {
            console.error(`分片 ${chunkIndex + 1}/${totalChunks} 上传失败:`, error);
            if (error.response) {
              console.error('错误响应状态:', error.response.status);
              console.error('错误响应数据:', error.response.data);
            } else if (error.request) {
              console.error('请求发送但没有收到响应');
            } else {
              console.error('请求配置错误:', error.message);
            }
            throw error;
          }

          // 更新每个分片完成后的进度
          if (progressCallback) {
            const chunkCompleteProgress = Math.round(((chunkIndex + 1) / totalChunks) * 100);
           
            progressCallback(chunkCompleteProgress);
          }
        }

        // 所有分片上传完成，请求合并
        // 确保显示100%进度
        if (progressCallback) {
          progressCallback(100);
        }
        
        // 确保歌手数据格式正确
        let formattedArtists = [];
        if (songData.artists) {
          // 处理不同的歌手数据格式
          if (Array.isArray(songData.artists)) {
            formattedArtists = songData.artists.map(artist => {
              // 如果artist已经是对象，确保至少有id和name字段
              if (typeof artist === 'object' && artist !== null) {
                return {
                  id: artist.id || null,
                  name: artist.name || `歌手#${artist.id || '未知'}`,
                  realName: artist.realName || ''
                };
              }
              // 如果artist是数字ID
              else if (typeof artist === 'number') {
                return { id: artist, name: `歌手#${artist}` };
              }
              // 如果artist是字符串ID或名称
              else if (typeof artist === 'string') {
                const artistId = parseInt(artist, 10);
                if (!isNaN(artistId)) {
                  return { id: artistId, name: `歌手#${artistId}` };
                }
                return { name: artist };
              }
              // 默认返回
              return { name: '未知歌手' };
            });
          } 
          // 如果传入的是artistIds数组
          else if (songData.artistIds && Array.isArray(songData.artistIds)) {
            formattedArtists = songData.artistIds.map(id => ({ id }));
          }
        }
        
        console.log('格式化后的歌手数据:', formattedArtists);
        
        const mergeData = {
          fileId,
          totalChunks,
          filename: file.name,
          fileType: file.type,
          fileSize: file.size,
          title: songData.title,
          genre: songData.genre,
          language: songData.language,
          artists: JSON.stringify(formattedArtists)
        };

        // 如果有歌词文件，使用Base64上传歌词文件
        if (songData.lyricsFile) {
          
          try {
            // 将歌词文件转换为Base64
            const lyricsBase64 = await this.fileToBase64(songData.lyricsFile);
            
            // 构建歌词文件上传请求
            const lyricsData = {
              fileName: songData.lyricsFile.name,
              fileType: songData.lyricsFile.type,
              fileSize: songData.lyricsFile.size,
              fileData: lyricsBase64
            };
            
            // 发送歌词文件
            const lyricsResponse = await axios.post(
              `${API_BASE_URL}/albums/${albumId}/lyrics-upload-base64`,
              lyricsData,
              {
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                }
              }
            );
            
            // 将歌词文件路径添加到合并数据中
            mergeData.lyricsFilePath = lyricsResponse.data.path;
            
          } catch (error) {
            console.error('歌词文件上传失败:', error);
          }
        }
        
        // 如果有翻译歌词文件，使用Base64上传翻译歌词文件
        if (songData.translationLyricsFile) {
          
          try {
            // 将翻译歌词文件转换为Base64
            const translationLyricsBase64 = await this.fileToBase64(songData.translationLyricsFile);
            
            // 构建翻译歌词文件上传请求
            const translationLyricsData = {
              fileName: songData.translationLyricsFile.name,
              fileType: songData.translationLyricsFile.type,
              fileSize: songData.translationLyricsFile.size,
              fileData: translationLyricsBase64
            };
            
            // 发送翻译歌词文件
            const translationLyricsResponse = await axios.post(
              `${API_BASE_URL}/albums/${albumId}/translation-lyrics-upload-base64`,
              translationLyricsData,
              {
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                }
              }
            );
            
            // 将翻译歌词文件路径添加到合并数据中
            mergeData.translationLyricsFilePath = translationLyricsResponse.data.path;
            
          } catch (error) {
            console.error('翻译歌词文件上传失败:', error);
          }
        }

        

        try {
          console.log('发送合并请求，数据:', {
            fileId: mergeData.fileId,
            totalChunks: mergeData.totalChunks,
            filename: mergeData.filename,
            title: mergeData.title
          });
          
          const response = await axios.post(
            `${API_BASE_URL}/albums/${albumId}/merge-chunks-base64`,
            mergeData,
            {
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              }
            }
          );
          
          console.log('合并分片响应:', response.data);
          return response.data;
        } catch (error) {
          console.error('合并分片错误:', error);
          if (error.response) {
            console.error('错误响应状态:', error.response.status);
            console.error('错误响应数据:', error.response.data);
            throw error.response.data.message || '合并分片失败';
          }
          throw error.message || '合并分片失败';
        }
      } catch (error) {
        console.error('Base64分片上传错误:', error);
        throw error;
      }
    },
  }
});