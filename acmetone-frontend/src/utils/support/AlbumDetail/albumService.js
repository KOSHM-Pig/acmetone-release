import { ref, nextTick } from 'vue';
import { ElMessage } from 'element-plus';
import { API_BASE_URL, STATIC_BASE_URL } from '@/config';

// 创建响应式状态
const album = ref(null);
const loading = ref(false);
const error = ref(null);

// 处理歌曲数据
const processSongs = (songs, albumId) => {
  if (!songs || !Array.isArray(songs)) return [];
  
  return songs.map(song => {
    // 确保每个歌曲对象都有必要的属性
    return {
      ...song,
      id: song.id,
      albumId: song.albumId || albumId,
      audioLoaded: false,
      audioLoading: false,
      audioError: false,
      audioErrorMessage: null,
      originalWavFile: song.wavFile,
      trackNumber: song.trackNumber || 1
    };
  });
};

// 获取图片URL
const getImageUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `${STATIC_BASE_URL}/${path}`;
};

// 获取专辑详情
const fetchAlbumDetail = async (albumId, isAdmin, adminForm, router) => {
  loading.value = true;
  error.value = null;
  
  try {
    if (!albumId) {
      throw new Error('专辑ID不能为空');
    }
    
    // 获取token
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('未登录，无法访问专辑');
    }
    
    const response = await fetch(`${API_BASE_URL}/albums/${albumId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.error('获取专辑详情失败:', {
        status: response.status,
        statusText: response.statusText
      });
      
      const errorText = await response.text();
      console.error('错误响应内容:', errorText);
      throw new Error(`获取专辑详情失败: ${response.status} ${response.statusText}`);
    }
    
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.error('响应不是JSON格式:', contentType);
      const text = await response.text();
      console.error('响应内容:', text.substring(0, 200) + '...');
      throw new Error('服务器返回了非JSON格式的数据');
    }
    
    const data = await response.json();
    
    // 处理封面图片路径
    if (data.coverImage) {
      data.coverImage = getImageUrl(data.coverImage);
    }
    
    // 处理歌曲数据
    if (data.songs && Array.isArray(data.songs)) {
      data.songs = processSongs(data.songs, albumId);
    }
    
    album.value = data;
    loading.value = false;
    
    // 在DOM更新后，确保每个歌曲元素都有正确的data属性
    nextTick(() => {
      if (data.songs && Array.isArray(data.songs)) {
        data.songs.forEach(song => {
          const songElement = document.querySelector(`.song-pill-card[data-song-id="${song.id}"]`);
          if (songElement) {
            songElement.setAttribute('data-song-id', song.id);
            songElement.setAttribute('data-song-path', song.wavFile || '');
            
            const audioContainer = songElement.querySelector('.audio-container');
            if (audioContainer) {
              audioContainer.setAttribute('data-song-id', song.id);
              audioContainer.setAttribute('data-song-path', song.wavFile || '');
            }
          }
        });
      }
    });
    
    // 初始化管理员表单
    if (isAdmin && album.value) {
      if (album.value.status === 'pending' && album.value.comment && album.value.comment.includes('DRAFT')) {
        adminForm.status = 'draft';
      } else {
        adminForm.status = album.value.status || 'pending';
      }
      
      adminForm.comment = album.value.comment || '';
    }
    
    return data;
  } catch (err) {
    console.error('获取专辑详情错误:', err);
    error.value = err.message;
    loading.value = false;
    ElMessage.error(err.message || '获取专辑详情失败');
    
    // 如果是认证问题，重定向到登录页面
    if (err.message?.includes('未登录') || err.message?.includes('无权访问')) {
      router?.push('/login');
    }
    
    throw err;
  }
};

// 导出模块
export {
  album,
  loading,
  error,
  fetchAlbumDetail,
  processSongs
};