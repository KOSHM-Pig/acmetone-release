<template>
  <div class="song-link-detail">
    <el-skeleton :loading="loading" animated>
      <template #default>
        <div v-if="error" class="error-message">
          <el-alert :title="error" type="error" :closable="false" show-icon />
          <div class="back-home">
            <el-button type="primary" @click="$router.push('/')" class="back-btn">返回首页</el-button>
          </div>
        </div>
        
        <div v-else-if="!songLink" class="not-found">
          <el-empty description="未找到歌曲信息" />
          <div class="back-home">
            <el-button type="primary" @click="$router.push('/')" class="back-btn">返回首页</el-button>
          </div>
        </div>
        
        <div v-else class="song-detail-container">
          <div class="header">
            <h1>{{ songLink.songName }}</h1>
            <h2>{{ songLink.artistName }}</h2>
          </div>
          
          <div class="song-cover">
            <el-image
              :src="getImageUrl(songLink.coverImage)"
              :preview-src-list="songLink.coverImage && !failedImageCache.has(songLink.coverImage) ? [getImageUrl(songLink.coverImage)] : []"
              :initial-index="0"
              fit="cover"
              lazy
              :hide-on-click-modal="true"
              @error="handleImageError"
            >
              <template #placeholder>
                <div class="image-placeholder">
                  <i class="el-icon-picture-outline"></i>
                </div>
              </template>
              <template #error>
                <div class="image-error-placeholder">
                  <i class="el-icon-picture-outline"></i>
                </div>
              </template>
            </el-image>
          </div>
          
          <div class="release-date">
            发行日期：{{ formatDate(songLink.releaseDate) }}
          </div>
          
          <div class="description">
            {{ songLink.description || `${songLink.artistName}的新曲《${songLink.songName}》现已上线，立即收听。` }}
          </div>
          
          <div class="platform-links">
            <a v-if="songLink.netease" :href="songLink.netease" target="_blank" class="platform-link">
              <img src="/网易云.svg" alt="网易云音乐" class="platform-icon">
              <span class="platform-name">网易云音乐</span>
            </a>
            
            <a v-if="songLink.qq" :href="songLink.qq" target="_blank" class="platform-link">
              <img src="/QQ音乐.svg" alt="QQ音乐" class="platform-icon">
              <span class="platform-name">QQ音乐</span>
            </a>
            
            <a v-if="songLink.kugou" :href="songLink.kugou" target="_blank" class="platform-link">
              <img src="/酷狗音乐.svg" alt="酷狗音乐" class="platform-icon">
              <span class="platform-name">酷狗音乐</span>
            </a>
            
            <a v-if="songLink.kuwo" :href="songLink.kuwo" target="_blank" class="platform-link">
              <img src="/酷我音乐.svg" alt="酷我音乐" class="platform-icon">
              <span class="platform-name">酷我音乐</span>
            </a>
            
            <a v-if="songLink.qishui" :href="songLink.qishui" target="_blank" class="platform-link">
              <img src="/汽水音乐.svg" alt="汽水音乐" class="platform-icon">
              <span class="platform-name">汽水音乐</span>
            </a>
            
            <a v-if="songLink.spotify" :href="songLink.spotify" target="_blank" class="platform-link">
              <img src="/Spotify.svg" alt="Spotify" class="platform-icon">
              <span class="platform-name">Spotify</span>
            </a>
            
            <a v-if="songLink.youtube" :href="songLink.youtube" target="_blank" class="platform-link">
              <img src="/youtube.svg" alt="YouTube" class="platform-icon">
              <span class="platform-name">YouTube</span>
            </a>
            
            <a v-if="songLink.appleMusic" :href="songLink.appleMusic" target="_blank" class="platform-link">
              <img src="/applemusic.svg" alt="Apple Music" class="platform-icon">
              <span class="platform-name">Apple Music</span>
            </a>
            
            <a v-if="songLink.soundCloud" :href="songLink.soundCloud" target="_blank" class="platform-link">
              <img src="/soundcloud.svg" alt="SoundCloud" class="platform-icon">
              <span class="platform-name">SoundCloud</span>
            </a>
          </div>
        </div>
        
        <div class="home-button">
          <el-button 
            type="primary" 
            circle 
            icon="el-icon-back" 
            @click="$router.push('/')" 
            class="float-home-btn"
          >
            <i class="el-icon-s-home"></i>
          </el-button>
        </div>
      </template>
    </el-skeleton>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import axios from 'axios';
import { API_BASE_URL, STATIC_BASE_URL } from '@/config';

// 全局存储已失败的图片路径
const failedImageCache = new Set();
// 用于跟踪已经在控制台报告过错误的图片URL
const reportedErrors = new Set();
// 记录正在处理中的图片请求
const pendingRequests = new Set();

// 默认占位图片
const DEFAULT_IMAGE = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyMDAgMjAwIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2YwZjBmMCIvPjxwYXRoIGQ9Ik03NSA4MHYtMTVoNTB2MTVoLTUwem0wIDU1di0xNWg1MHYxNWgtNTB6IiBmaWxsPSIjZDBkMGQwIi8+PGNpcmNsZSBjeD0iMTAwIiBjeT0iMTAwIiByPSIzMCIgZmlsbD0iI2QwZDBkMCIvPjxwYXRoIGQ9Ik03MCA3MGw2MCA2ME02MCAxMDBoODBNNzAgMTMwbDYwLTYwIiBzdHJva2U9IiNhMGEwYTAiIHN0cm9rZS13aWR0aD0iNCIvPjwvc3ZnPg==';

// 设置页面元数据，用于外部控制导航栏显示
defineOptions({
  name: 'SongLinkDetail',
  meta: {
    hideNav: true, // 标记该页面需要隐藏导航栏
    hideAi: true   // 标记该页面需要隐藏AI助手
  }
});

const route = useRoute();
const loading = ref(true);
const error = ref(null);
const songLink = ref(null);

// 格式化日期
const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('zh-CN');
};

// 处理图片URL
const getImageUrl = (imagePath) => {
  if (!imagePath) return DEFAULT_IMAGE;
  
  // 检查是否包含中文字符或特殊编码
  if (/[\u4e00-\u9fa5]|%[0-9A-F]{2}/.test(imagePath)) {
    // URL可能包含编码问题，标记为失败
    if (!reportedErrors.has(`encoding_${imagePath}`)) {
      console.error('图片URL包含编码问题:', imagePath);
      reportedErrors.add(`encoding_${imagePath}`);
    }
    
    try {
      // 在会话存储中标记该图片已失败
      sessionStorage.setItem(`failed_img_${imagePath}`, 'true');
      
      // 添加到内存缓存
      failedImageCache.add(imagePath);
    } catch (e) {}
    
    return DEFAULT_IMAGE;
  }
  
  // 检查内存中是否已经记录此图片加载失败
  if (failedImageCache.has(imagePath)) {
    return DEFAULT_IMAGE;
  }
  
  // 检查会话存储中是否已经记录此图片加载失败
  const failedKey = `failed_img_${imagePath}`;
  if (sessionStorage.getItem(failedKey)) {
    // 如果已经失败过，加入内存缓存并直接返回占位图片
    failedImageCache.add(imagePath);
    return DEFAULT_IMAGE;
  }
  
  // 检查是否是正在处理中的请求
  if (pendingRequests.has(imagePath)) {
    return DEFAULT_IMAGE;
  }
  
  // 如果是完整URL（以http开头或外部图床链接），直接返回
  if (imagePath.startsWith('http') || imagePath.startsWith('https')) {
    return imagePath;
  }
  
  // 如果以/uploads开头，拼接静态资源基础URL
  if (imagePath.startsWith('/uploads')) {
    return `${STATIC_BASE_URL}${imagePath}`;
  }
  
  // 如果以uploads开头（没有前导斜杠），添加斜杠并拼接
  if (imagePath.startsWith('uploads')) {
    return `${STATIC_BASE_URL}/${imagePath}`;
  }
  
  // 如果是相对路径（可能包含../等），也拼接静态资源基础URL
  if (!imagePath.startsWith('/') && !imagePath.match(/^[a-z]+:/i)) {
    return `${STATIC_BASE_URL}/${imagePath}`;
  }
  
  // 其他情况直接返回
  return imagePath;
};

// 处理图片加载错误
const handleImageError = (event) => {
  const errorSrc = event.target.src;
  
  // 避免重复输出相同的错误日志
  if (!reportedErrors.has(errorSrc)) {
    console.error('图片加载失败:', errorSrc);
    reportedErrors.add(errorSrc);
  }
  
  // 防止重复尝试加载，避免被误判为DDoS
  event.target.onerror = null; // 移除错误事件处理器，防止再次触发
  
  try {
    // 尝试提取原始图片路径
    let originalSrc = '';
    if (errorSrc) {
      // 从src中提取原始路径
      const originalSrcMatch = errorSrc.match(/\/uploads\/.*?(?:\?|$)/);
      originalSrc = originalSrcMatch ? originalSrcMatch[0].replace(/\?.*$/, '') : errorSrc;
      
      // 从pendingRequests中移除
      pendingRequests.delete(originalSrc);
      
      // 添加到内存缓存
      failedImageCache.add(originalSrc);
      
      // 添加到会话存储
      sessionStorage.setItem(`failed_img_${originalSrc}`, 'true');
    }
  } catch (e) {
    if (!reportedErrors.has('storage_error')) {
      console.error('保存图片失败状态出错:', e);
      reportedErrors.add('storage_error');
    }
  }
  
  // 设置为默认图片
  event.target.src = DEFAULT_IMAGE;
  event.target.classList.add('image-error');
};

// 预检查图片
const checkImage = (imagePath) => {
  if (!imagePath) return;
  
  // 已知有问题的中文编码URL直接跳过
  if (/[\u4e00-\u9fa5]|%[0-9A-F]{2}/.test(imagePath)) {
    try {
      failedImageCache.add(imagePath);
      sessionStorage.setItem(`failed_img_${imagePath}`, 'true');
    } catch (e) {}
    return;
  }
  
  // 已经在缓存中的也跳过
  if (failedImageCache.has(imagePath) || sessionStorage.getItem(`failed_img_${imagePath}`)) {
    failedImageCache.add(imagePath);
    return;
  }
  
  // 使用HEAD请求检查图片是否存在，而不是直接加载
  const url = getImageUrl(imagePath);
  
  // 标记为正在处理中
  pendingRequests.add(imagePath);
  
  fetch(url, { method: 'HEAD' })
    .then(response => {
      pendingRequests.delete(imagePath);
      
      if (!response.ok) {
        // 图片不存在，记录到缓存
        failedImageCache.add(imagePath);
        sessionStorage.setItem(`failed_img_${imagePath}`, 'true');
      }
    })
    .catch(error => {
      pendingRequests.delete(imagePath);
      failedImageCache.add(imagePath);
      sessionStorage.setItem(`failed_img_${imagePath}`, 'true');
    });
};

// 获取歌曲链接详情
const fetchSongLink = async (slug) => {
  try {
    loading.value = true;
    error.value = null;
    
    const response = await axios.get(`${API_BASE_URL}/new-song-links/${slug}`);
    songLink.value = response.data;
    
    // 预检查封面图片
    if (songLink.value.coverImage) {
      checkImage(songLink.value.coverImage);
    }
    
    // 设置页面标题和元数据
    document.title = `${songLink.value.songName} - ${songLink.value.artistName} | 极音记`;
    
    // 设置页面描述
    const metaDescription = document.querySelector('meta[name="description"]');
    const description = songLink.value.description || 
      `${songLink.value.artistName}的新曲《${songLink.value.songName}》现已上线，立即收听。`;
    
    if (metaDescription) {
      metaDescription.setAttribute('content', description);
    } else {
      const meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = description;
      document.head.appendChild(meta);
    }
    
  } catch (error) {
    console.error('获取歌曲链接详情失败:', error);
    if (error.response?.status === 404) {
      error.value = '链接页面不存在或已被禁用';
    } else {
      error.value = '获取歌曲链接详情失败';
    }
    songLink.value = null;
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  const slug = route.params.slug;
  if (slug) {
    fetchSongLink(slug);
  } else {
    error.value = '未指定歌曲链接标识符';
    loading.value = false;
  }
});
</script>

<style scoped>
.song-link-detail {
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
}

.error-message, .not-found {
  text-align: center;
  margin: 40px 0;
}

.back-home {
  margin-top: 20px;
}

.song-detail-container {
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  padding: 30px;
  margin-bottom: 40px;
}

.header {
  text-align: center;
  margin-bottom: 30px;
}

.header h1 {
  font-size: 28px;
  margin-bottom: 10px;
  color: #333;
}

.header h2 {
  font-size: 20px;
  font-weight: normal;
  color: #666;
  margin-top: 0;
}

.song-cover {
  text-align: center;
  margin-bottom: 30px;
}

.cover-image {
  max-width: 300px;
  border-radius: 8px;
  box-shadow: 0 10px 20px rgba(0,0,0,0.1);
}

.release-date {
  text-align: center;
  margin-bottom: 30px;
  color: #666;
}

.description {
  text-align: center;
  margin-bottom: 40px;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
  line-height: 1.6;
  color: #333;
}

.platform-links {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 20px;
  margin-bottom: 20px;
}

.platform-link {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-decoration: none;
  color: #333;
  transition: transform 0.2s;
  width: 120px;
}

.platform-link:hover {
  transform: translateY(-5px);
}

.platform-icon {
  width: 60px;
  height: 60px;
  margin-bottom: 10px;
}

.platform-name {
  font-size: 14px;
}

@media (max-width: 768px) {
  .platform-links {
    gap: 15px;
  }
  .platform-link {
    width: 80px;
  }
  .platform-icon {
    width: 50px;
    height: 50px;
  }
}

.home-button {
  position: fixed;
  bottom: 20px;
  left: 20px;
  z-index: 1000;
}

.float-home-btn {
  width: 50px;
  height: 50px;
  font-size: 20px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.float-home-btn:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
}

.back-btn {
  transition: all 0.3s ease;
}

.back-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
}

.music-platform-icon {
  margin-right: 5px;
}

.image-placeholder,
.image-error-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f5f7fa;
  border-radius: 6px;
}

.image-error-placeholder {
  background-color: #f8f0f0;
  color: #f56c6c;
}
</style> 