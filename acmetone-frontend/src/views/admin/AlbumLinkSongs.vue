<template>
  <div class="album-link-songs">
    <el-card class="main-card box-card">
      <template #header>
        <div class="card-header">
          <div class="header-title">
            <h2>专辑歌曲列表</h2>
            <div v-if="albumLink" class="album-info">
              {{ albumLink.albumName }} - {{ albumLink.artistName }}
            </div>
          </div>
          <div class="header-actions">
            <el-button @click="$router.push('/admin/album-links')" plain>
              <el-icon><Back /></el-icon> 返回列表
            </el-button>
          </div>
        </div>
      </template> 
      
      <el-skeleton :loading="loading" animated :rows="6">
        <template #default>
          <div v-if="error" class="error-message">
            <el-alert :title="error" type="error" :closable="false" show-icon />
          </div>
          
          <div v-if="albumLink" class="album-preview">
            <div class="album-cover">
              <el-image
                :src="getImageUrl(albumLink.coverImage)"
                fit="cover"
                style="width: 120px; height: 120px; border-radius: 6px;"
                lazy
                :preview-src-list="albumLink.coverImage && !failedImageCache.has(albumLink.coverImage) ? [getImageUrl(albumLink.coverImage)] : []"
                :initial-index="0"
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
            <div class="album-details">
              <h3>{{ albumLink.title }}</h3>
              <p>发布日期: {{ formatDate(albumLink.releaseDate) }}</p>
              <p>专辑类型: {{ albumLink.albumType === 'internal' ? '内部专辑' : '外部专辑' }}</p>
              <p v-if="albumLink.description">{{ albumLink.description }}</p>
              <router-link :to="`/album/${albumLink.slug}`" target="_blank" class="view-link">
                查看页面
              </router-link>
            </div>
          </div>
          
          <el-empty v-if="songs.length === 0" description="暂无歌曲" />
          
          <el-table
            v-else
            :data="songs"
            style="width: 100%"
            border
            stripe
          >
            <el-table-column type="index" label="序号" width="60" />
            <el-table-column prop="trackNumber" label="曲目编号" width="80" />
            <el-table-column prop="songName" label="歌曲名称" min-width="200">
              <template #default="{ row }">
                <div>{{ row.songName }}</div>
                <div class="song-artist-info">
                  歌手: {{ getSongArtist(row) }}
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="artistName" label="歌手" min-width="120">
              <template #default="{ row }">
                <el-tag 
                  size="small" 
                  :type="getSongArtistType(row)" 
                  effect="plain"
                >
                  {{ getSongArtist(row) }}
                </el-tag>
                <div v-if="row.internalSongId && row.artistName" class="artist-source">
                  (内部歌手)
                </div>
                <div v-else-if="row.performer" class="artist-source">
                  (表演者)
                </div>
                <div v-else-if="!row.artistName && !row.performer && albumLink && albumLink.artistName" class="artist-source">

                </div>
              </template>
            </el-table-column>
            <el-table-column label="关联内部歌曲" width="120">
              <template #default="{ row }">
                <el-tag v-if="row.internalSongId" type="success">已关联</el-tag>
                <el-tag v-else type="info">未关联</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="平台链接" width="200">
              <template #default="{ row }">
                <div class="platform-icons">
                  <el-tooltip v-if="row.netease" content="网易云音乐">
                    <img src="/网易云.svg" alt="网易云音乐" class="platform-icon" />
                  </el-tooltip>
                  <el-tooltip v-if="row.qq" content="QQ音乐">
                    <img src="/QQ音乐.svg" alt="QQ音乐" class="platform-icon" />
                  </el-tooltip>
                  <el-tooltip v-if="row.kugou" content="酷狗音乐">
                    <img src="/酷狗音乐.svg" alt="酷狗音乐" class="platform-icon" />
                  </el-tooltip>
                  <el-tooltip v-if="row.kuwo" content="酷我音乐">
                    <img src="/酷我音乐.svg" alt="酷我音乐" class="platform-icon" />
                  </el-tooltip>
                  <el-tooltip v-if="row.qishui" content="汽水音乐">
                    <img src="/汽水音乐.svg" alt="汽水音乐" class="platform-icon" />
                  </el-tooltip>
                  <el-tooltip v-if="row.spotify" content="Spotify">
                    <img src="/Spotify.svg" alt="Spotify" class="platform-icon" />
                  </el-tooltip>
                  <el-tooltip v-if="row.youtube" content="YouTube">
                    <img src="/youtube.svg" alt="YouTube" class="platform-icon" />
                  </el-tooltip>
                  <el-tooltip v-if="row.appleMusic" content="Apple Music">
                    <img src="/applemusic.svg" alt="Apple Music" class="platform-icon" />
                  </el-tooltip>
                  <el-tooltip v-if="row.soundCloud" content="SoundCloud">
                    <img src="/soundcloud.svg" alt="SoundCloud" class="platform-icon" />
                  </el-tooltip>
                  <span v-if="!hasPlatformLinks(row)" class="no-links">无平台链接</span>
                </div>
              </template>
            </el-table-column>
          </el-table>
        </template>
      </el-skeleton>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { Back } from '@element-plus/icons-vue';
import { useAlbumLinkStore } from '@/stores/albumLink';
import { STATIC_BASE_URL } from '@/config';

const route = useRoute();
const router = useRouter();
const albumLinkStore = useAlbumLinkStore();

// 状态变量
const loading = ref(false);
const error = ref(null);
const albumLink = ref(null);
const songs = ref([]);

// 全局存储已失败的图片路径
const failedImageCache = new Set();
// 用于跟踪已经在控制台报告过错误的图片URL
const reportedErrors = new Set();

// 默认占位图片
const DEFAULT_IMAGE = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyMDAgMjAwIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2YwZjBmMCIvPjxwYXRoIGQ9Ik03NSA4MHYtMTVoNTB2MTVoLTUwem0wIDU1di0xNWg1MHYxNWgtNTB6IiBmaWxsPSIjZDBkMGQwIi8+PGNpcmNsZSBjeD0iMTAwIiBjeT0iMTAwIiByPSIzMCIgZmlsbD0iI2QwZDBkMCIvPjxwYXRoIGQ9Ik03MCA3MGw2MCA2ME02MCAxMDBoODBNNzAgMTMwbDYwLTYwIiBzdHJva2U9IiNhMGEwYTAiIHN0cm9rZS13aWR0aD0iNCIvPjwvc3ZnPg==';

// 格式化日期
const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('zh-CN');
};

// 处理图片URL
const getImageUrl = (imagePath) => {
  if (!imagePath) return DEFAULT_IMAGE;
  
  // 检查内存中是否已经记录此图片加载失败
  if (failedImageCache.has(imagePath)) {
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
  
  // 如果是缩略图路径
  if (imagePath.includes('/thumbnails/')) {
    return `${STATIC_BASE_URL}${imagePath.startsWith('/') ? '' : '/'}${imagePath}`;
  }
  
  // 其他情况直接返回
  return `${STATIC_BASE_URL}${imagePath.startsWith('/') ? '' : '/'}${imagePath}`;
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
      
      // 添加到内存缓存
      failedImageCache.add(originalSrc);
    }
  } catch (e) {
    console.error('处理图片错误时出错:', e);
  }
  
  // 设置为默认图片
  event.target.src = DEFAULT_IMAGE;
};

// 检查是否有平台链接
const hasPlatformLinks = (song) => {
  if (!song) return false;
  
  const platforms = ['netease', 'qq', 'kugou', 'kuwo', 'qishui', 'spotify', 'youtube', 'appleMusic', 'soundCloud'];
  return platforms.some(platform => song[platform]);
};

// 获取歌曲的歌手名称，按优先级处理
const getSongArtist = (song) => {
  
  
  // 0. 如果有内部歌曲ID，优先使用其自身的artistName
  if (song.internalSongId && song.internalArtistName) {
    
    return song.internalArtistName;
  }
  
  // 1. 如果歌曲有歌手名且不是未知艺术家，直接使用
  if (song.artistName && song.artistName !== '未知艺术家') {
    
    return song.artistName;
  }
  
  // 2. 如果歌曲有performer字段，处理performer
  if (song.performer) {
    // 如果是斜杠分隔的表演者
    if (typeof song.performer === 'string' && song.performer.includes('/')) {
      const performers = song.performer.split('/').map(p => p.trim()).filter(p => p);
      if (performers.length > 0) {
       
        return performers.join(' & ');
      }
    }
    
    return song.performer;
  }
  
  // 3. 如果歌曲有performers数组
  if (song.performers && Array.isArray(song.performers) && song.performers.length > 0) {
    
    return song.performers.join(' & ');
  }
  
  // 4. 如果到这里还没有找到，则不回退到专辑歌手
  
  return '未知艺术家';
};

// 获取歌手标签类型
const getSongArtistType = (song) => {
  // 如果是内部歌曲的歌手
  if (song.internalSongId && song.artistName) {
    return 'primary';
  }
  
  // 如果有performer
  if (song.performer) {
    return 'success';
  }
  
  // 如果使用专辑歌手
  if (!song.artistName && !song.performer && albumLink.value && albumLink.value.artistName) {
    return 'info';
  }
  
  // 如果自己有歌手名
  if (song.artistName) {
    return 'success';
  }
  
  return 'info';
};

// 获取专辑链接和歌曲列表
const fetchAlbumLink = async (id) => {
  try {
    loading.value = true;
    error.value = null;
    
    // 使用专辑链接Store获取详情
    const linkData = await albumLinkStore.fetchLinkById(id);
    
    
    if (!linkData) {
      throw new Error('未找到专辑链接');
    }
    
    // 处理专辑表演者信息
    if (linkData.performer && !linkData.performers) {
      if (typeof linkData.performer === 'string' && linkData.performer.includes('/')) {
        linkData.performers = linkData.performer.split('/').map(p => p.trim()).filter(p => p);
      } else {
        linkData.performers = [linkData.performer];
      }
      
    }
    
    // 处理歌曲列表中的表演者信息
    if (linkData.songs && linkData.songs.length > 0) {
      linkData.songs = linkData.songs.map(song => {
        // 如果歌曲没有artistName但有performer，使用performer
        if ((!song.artistName || song.artistName === '未知艺术家') && song.performer) {
          if (typeof song.performer === 'string' && song.performer.includes('/')) {
            // 处理斜杠分隔的performer
            const performers = song.performer.split('/').map(p => p.trim()).filter(p => p);
            if (performers.length > 0) {
              song.performers = performers;
              song.artistName = performers.join(' & ');
              
            }
          } else {
            song.artistName = song.performer;
            song.performers = [song.performer];
          }
        }
        
        // 如果歌曲仍然没有歌手信息，尝试使用专辑表演者
        if (!song.artistName || song.artistName === '未知艺术家') {
          if (linkData.performers && linkData.performers.length > 0) {
            song.performers = linkData.performers;
            song.artistName = linkData.performers.join(' & ');
          } else if (linkData.performer) {
            song.performer = linkData.performer;
            song.artistName = linkData.performer;
          }
        }
        
        return song;
      });
    }
    
    albumLink.value = linkData;
    songs.value = linkData.songs || [];
   
    
  } catch (err) {
    console.error('获取专辑链接和歌曲列表失败:', err);
    error.value = typeof err === 'string' ? err : err.message || '获取专辑链接详情失败';
    ElMessage.error(error.value);
    albumLink.value = null;
    songs.value = [];
  } finally {
    loading.value = false;
  }
};

// 初始化
onMounted(() => {
  fetchAlbumLink(route.params.id);
});
</script>

<style scoped>
.album-link-songs {
  padding: 20px;
  background-color: #f5f7fa;
  min-height: 100vh;
}

.box-card {
  border: 2px solid #000;
  border-radius: 0;
  box-shadow: 5px 5px 0px 0px #000;
  background-color: #fff;
}

:deep(.el-card__body) {
  padding: 20px;
  height: 1080px;
}

:deep(.el-card__header) {
  border-bottom: 2px solid #000;
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-title h2 {
  font-size: 24px;
  font-weight: 700;
  margin: 0;
  text-transform: uppercase;
}

.album-info {
  font-size: 14px;
  color: #666;
  margin-top: 5px;
}

:deep(.el-button.is-plain) {
  background-color: #fff;
  color: #000;
  border: 2px solid #000;
  border-radius: 0;
  font-weight: bold;
}
:deep(.el-button.is-plain:hover) {
    background-color: #f0f0f0;
}

.album-preview {
  display: flex;
  gap: 20px;
  margin-bottom: 30px;
  padding: 20px;
  border: 2px solid #000;
}

.album-cover .el-image {
  border: 2px solid #000;
}

.album-details h3 {
  font-size: 18px;
  font-weight: 700;
  margin: 0 0 10px 0;
  text-transform: uppercase;
}

.album-details p {
  font-size: 14px;
  margin: 0 0 5px 0;
  color: #666;
}

.view-link {
  margin-top: 10px;
  color: #000;
  text-decoration: underline;
  font-weight: 600;
  font-size: 14px;
  display: inline-block;
}

.error-message {
  margin-bottom: 20px;
}

.song-artist-info {
  font-size: 12px;
  color: #666;
  margin-top: 5px;
}

.artist-source {
  font-size: 10px;
  color: #999;
  margin-top: 3px;
}

.platform-icons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
}

.platform-icon {
  width: 20px;
  height: 20px;
}

.no-links {
  font-size: 12px;
  color: #999;
}

:deep(.el-table) {
  border: 2px solid #000;
  border-radius: 0;
  --el-table-border-color: #000;
  --el-table-header-bg-color: #fff;
  --el-table-header-text-color: #000;
  --el-table-row-hover-bg-color: #f0f0f0;
  --el-table-bg-color: #fff;
  --el-table-tr-bg-color: #fff;
  --el-table-text-color: #000;
}

:deep(.el-table th.el-table__cell) {
  background-color: #fff;
  border-bottom: 2px solid #000;
  font-weight: 700;
  text-transform: uppercase;
}

:deep(.el-table td.el-table__cell) {
  border-bottom: 1px solid #000;
}

:deep(.el-table--striped .el-table__body tr.el-table__row--striped td.el-table__cell) {
  background-color: #f5f7fa;
}

.image-placeholder,
.image-error-placeholder {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
  background-color: #111;
  color: #666;
}

@media (max-width: 768px) {
  :deep(.el-card__body) {
    padding: 10px 20px 20px;
    height:1080px;
}

  :deep(.el-card__header) {
    padding: 15px 20px;
  }
  
  .card-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 15px;
}

  .header-actions {
    width: 100%;
  }
  
  .album-preview {
    flex-direction: column;
    padding: 15px;
  }
  
  .album-cover {
    margin-bottom: 15px;
  }
}
</style> 