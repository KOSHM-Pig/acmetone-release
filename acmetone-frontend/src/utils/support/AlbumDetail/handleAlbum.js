import { ref, h } from 'vue';
import axios from 'axios';
import { ElMessage, ElMessageBox } from 'element-plus';
import { SuccessFilled } from '@element-plus/icons-vue';
import { API_BASE_URL } from '@/config';

// 创建可导出的函数
export const createHandleAlbumFunctions = (
  album,
  albumForm,
  albumFormRef,
  albumEditDialogVisible,
  submitting,
  fetchAlbumDetail
) => {
  // 将文件转换为Base64
  const fileToBase64 = async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64String = reader.result.split(',')[1];
        resolve(base64String);
      };
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  };

  // 分片上传封面图片
  const uploadCoverImageInChunks = async (file) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('未登录');
      }
      
      const albumId = album.value.id;
      
      // 减小分片大小，避免服务器处理大分片时出错
      const chunkSize = 1 * 1024 * 1024; // 1MB分片
      const totalChunks = Math.ceil(file.size / chunkSize);
      const fileId = Date.now().toString() + Math.random().toString(36).substring(2, 15);
      
      console.log(`开始分片上传封面图片: 总大小=${file.size}字节, 分片大小=${chunkSize}字节, 分片数=${totalChunks}`);
      
      // 上传所有分片
      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        const start = chunkIndex * chunkSize;
        const end = Math.min(file.size, start + chunkSize);
        const chunk = file.slice(start, end);
        
        // 将分片转换为Base64
        const base64Chunk = await fileToBase64(chunk);
        
        // 构建请求数据
        const chunkData = {
          fileId,
          chunkIndex,
          totalChunks,
          fileName: file.name,
          fileType: file.type,
          chunkData: base64Chunk
        };
        
        // 添加重试机制
        let retries = 0;
        const maxRetries = 3;
        let success = false;
        
        while (!success && retries < maxRetries) {
          try {
            // 发送分片
            const chunkResponse = await axios.post(
              `${API_BASE_URL}/album-cover/${albumId}/upload-chunk-base64`,
              chunkData,
              {
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                timeout: 30000 // 30秒超时
              }
            );
            
            console.log(`封面分片 ${chunkIndex + 1}/${totalChunks} 上传成功`);
            success = true;
          } catch (error) {
            retries++;
            console.error(`分片 ${chunkIndex + 1}/${totalChunks} 上传失败，尝试重试 ${retries}/${maxRetries}:`, error);
            
            if (retries >= maxRetries) {
              throw new Error(`分片 ${chunkIndex + 1}/${totalChunks} 上传失败，已达到最大重试次数`);
            }
            
            // 等待一段时间再重试
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }
      
      console.log('所有分片上传完成，准备合并...');
      
      // 所有分片上传完成，请求合并
      const mergeData = {
        fileId,
        totalChunks,
        filename: file.name,
        fileType: file.type,
        fileSize: file.size
      };
      
      try {
        console.log('发送合并请求，数据:', mergeData);
        
        // 尝试使用小图片直接上传作为备选方案
        if (file.size <= 5 * 1024 * 1024) {
          console.log('文件大小适中，尝试直接上传作为备选方案');
          try {
            // 压缩图片
            const compressedFile = await compressImage(file, 1500, 0.8);
            const base64Data = await fileToBase64(compressedFile);
            
            // 构建请求数据
            const requestData = {
              fileName: file.name,
              fileType: file.type,
              fileSize: compressedFile.size,
              fileData: base64Data
            };
            
            // 调用API直接上传封面图片
            const directResponse = await axios.post(
              `${API_BASE_URL}/album-cover/${albumId}/base64`,
              requestData,
              {
                headers: { 
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                timeout: 60000 // 60秒超时
              }
            );
            
            console.log('直接上传成功，跳过合并步骤');
            return directResponse.data.coverImage;
          } catch (directError) {
            console.error('直接上传备选方案失败，继续尝试合并:', directError);
          }
        }
        
        const mergeResponse = await axios.post(
          `${API_BASE_URL}/album-cover/${albumId}/merge-chunks-base64`,
          mergeData,
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            timeout: 60000 // 60秒超时
          }
        );
        
        console.log('封面图片分片合并成功:', mergeResponse.data);
        
        // 返回合并后的图片路径
        return mergeResponse.data.coverImage;
      } catch (mergeError) {
        console.error('合并分片失败，详细错误:', mergeError);
        
        if (mergeError.response) {
          console.error('服务器响应:', {
            status: mergeError.response.status,
            data: mergeError.response.data,
            headers: mergeError.response.headers
          });
        }
        
        // 尝试压缩图片并直接上传
        console.log('尝试压缩图片并直接上传作为备选方案');
        
        // 压缩图片
        const compressedFile = await compressImage(file, 1500, 0.7);
        const base64Data = await fileToBase64(compressedFile);
        
        // 构建请求数据
        const requestData = {
          fileName: file.name,
          fileType: file.type,
          fileSize: compressedFile.size,
          fileData: base64Data
        };
        
        // 调用API直接上传封面图片
        const fallbackResponse = await axios.post(
          `${API_BASE_URL}/album-cover/${albumId}/base64`,
          requestData,
          {
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            timeout: 60000 // 60秒超时
          }
        );
        
        console.log('备选方案上传成功');
        return fallbackResponse.data.coverImage;
      }
    } catch (error) {
      console.error('分片上传封面图片失败:', error);
      throw error;
    }
  };
  
  // 图片压缩方法
  const compressImage = async (file, maxWidth, quality = 0.8) => {
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
              
              console.log(`图片压缩: 原始大小=${file.size}字节, 压缩后=${compressedFile.size}字节, 压缩率=${(compressedFile.size / file.size * 100).toFixed(2)}%`);
              
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
  };

  const handleEditAlbum = () => {
    if (!album.value) return;
    
    // 填充表单数据
    albumForm.title = album.value.title;
    albumForm.type = album.value.type;
    albumForm.releaseDate = album.value.releaseDate;
    albumForm.displayInfo = album.value.displayInfo;
    albumForm.description = album.value.description;
    albumForm.coverImage = album.value.coverImage;
    albumForm.coverImageFile = null;
    albumForm.coverImagePreview = null;
    
    // 处理表演者数据
    albumForm.performers = [];
    
    // 如果有performer字段，解析表演者字符串
    if (album.value.performer) {
      const performerNames = album.value.performer.split('/');
      
      // 如果有performerIds字段，解析表演者ID数组
      let performerIds = [];
      try {
        if (album.value.performerIds) {
          performerIds = JSON.parse(album.value.performerIds);
        }
      } catch (error) {
        console.error('解析表演者ID失败:', error);
        performerIds = [];
      }
      
      // 创建表演者对象数组
      performerNames.forEach((name, index) => {
        albumForm.performers.push({
          name: name.trim(),
          realName: '',
          artistId: performerIds[index] || null,
          id: Date.now() + index
        });
      });
    }
    
    // 显示对话框
    albumEditDialogVisible.value = true;
  };
  
  // 更新专辑信息
  const handleUpdateAlbum = async () => {
    if (!albumFormRef.value) return;
    
    try {
      await albumFormRef.value.validate();
      submitting.value = true;
      
      // 处理表演者数据
      const performerString = albumForm.performers
        .map(p => p.name)
        .filter(name => name.trim() !== '')
        .join('/');
      
      // 创建表演者ID数组
      const performerIds = albumForm.performers
        .filter(p => p.artistId)
        .map(p => p.artistId);
      
      // 如果有新的封面图片，先上传封面
      if (albumForm.coverImageFile) {
        try {
          let coverImagePath;
          
          // 如果文件大于3MB，使用分片上传
          if (albumForm.coverImageFile.size > 3 * 1024 * 1024) {
            console.log('封面文件大小超过3MB，使用分片上传');
            coverImagePath = await uploadCoverImageInChunks(albumForm.coverImageFile);
          } else {
            // 小文件使用直接Base64上传
            // 使用FileReader将文件转换为Base64
            const base64Data = await fileToBase64(albumForm.coverImageFile);
            
            // 构建请求数据
            const requestData = {
              fileName: albumForm.coverImageFile.name,
              fileType: albumForm.coverImageFile.type,
              fileSize: albumForm.coverImageFile.size,
              fileData: base64Data
            };
            
            // 调用API上传封面图片
            const coverResponse = await axios.post(
              `${API_BASE_URL}/album-cover/${album.value.id}/base64`,
              requestData,
              {
                headers: { 
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
              }
            );
            
            coverImagePath = coverResponse.data.coverImage;
          }
          
          // 更新封面图片路径
          if (coverImagePath) {
            albumForm.coverImage = coverImagePath;
          }
        } catch (coverError) {
          console.error('上传封面图片失败:', coverError);
          const errorMsg = coverError.response?.data?.message || coverError.response?.data?.detail || coverError.message || '上传封面图片失败';
          ElMessage.error(errorMsg + '，但将继续更新其他信息');
          // 继续执行，不因封面上传失败而中断整个更新
        }
      }
      
      // 调用API更新专辑信息
      await axios.put(
        `${API_BASE_URL}/albums/${album.value.id}`,
        {
          ...albumForm,
          performer: performerString,
          performerIds: JSON.stringify(performerIds)
        },
        {
          headers: { 
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      // 重新获取专辑详情
      await fetchAlbumDetail();
      
      ElMessage({
        message: '专辑信息更新成功',
        type: 'success',
        icon: h(SuccessFilled)
      });
      albumEditDialogVisible.value = false;
      
      // 清理临时URL
      if (albumForm.coverImagePreview) {
        URL.revokeObjectURL(albumForm.coverImagePreview);
        albumForm.coverImagePreview = null;
      }
    } catch (error) {
      console.error('更新专辑信息失败:', error);
      const errorMsg = error.response?.data?.message || error.response?.data?.detail || error.message || '更新专辑信息失败';
      ElMessage.error(errorMsg);
    } finally {
      submitting.value = false;
    }
  };

  return {
    handleEditAlbum,
    handleUpdateAlbum
  };
};