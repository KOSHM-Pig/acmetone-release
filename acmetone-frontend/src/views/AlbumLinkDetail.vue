<template>
  <div class="album-detail-page">
    <!-- 专辑背景大图 -->
    <div class="album-hero" v-if="albumLink && albumLink.coverImage" :style="{ backgroundImage: `url(${heroImageUrl})` }">
      <div class="album-hero-overlay"></div>
        </div>
        
    <!-- 返回按钮 -->
    <div class="back-button" @click="goBack">
      <div class="back-circle">
        <svg class="back-icon" viewBox="0 0 24 24" width="24" height="24">
          <path fill="currentColor" d="M20,11V13H8L13.5,18.5L12.08,19.92L4.16,12L12.08,4.08L13.5,5.5L8,11H20Z" />
        </svg>
          </div>
        </div>
        
    <div class="album-content" v-if="albumLink">
      <!-- 专辑封面和基本信息 -->
      <div class="album-header">
                <div class="album-cover">
          <img
            :src="getImageUrl(getThumbnailUrl(albumLink.coverImage))"
            :alt="albumLink.albumName"
          >
                </div>
                
                <div class="album-info">
          <div class="album-title">{{ albumLink.albumName }}</div>
          <div class="album-artist">{{ albumLink.artistName }}</div>
          <div class="album-meta">
            <span class="album-date">{{ formatDate(albumLink.releaseDate) }}</span>
            <span class="album-type">{{ albumLink.type || '专辑' }}</span>
              </div>
              
          <!-- 专辑平台链接 -->
          <div class="album-platform-links" v-if="hasAlbumPlatformLinks">
            <h3 class="platform-links-title">在以下平台收听</h3>
            <div class="platform-links-grid">
              <a
                v-for="platform in availableAlbumPlatforms"
                :key="platform.key"
                      :href="albumLink[platform.key]"
                      target="_blank"
                class="platform-link"
                :title="platform.name"
                    >
                <img :src="platform.icon" :alt="platform.name" class="platform-icon" />
                    </a>
            </div>
          </div>
          
          <div class="album-description" v-if="albumLink.description">
            {{ albumLink.description }}
                </div>
              </div>
            </div>
              
      <!-- 专辑曲目列表 -->
      <div class="album-tracks" v-if="albumLink.songs && albumLink.songs.length > 0">
        <h2 class="tracks-title">曲目列表</h2>
        
        <div class="tracks-list">
                <div
                  v-for="(song, index) in albumLink.songs"
                  :key="song.id"
            class="track-item"
                >
            <div class="track-number">{{ index + 1 }}</div>
            <div class="track-info">
              <div class="track-name">{{ song.songName }}</div>
              <div class="track-artist">
                {{ getSongArtist(song) }}
                  </div>
            </div>
            <div class="track-duration" v-if="song.duration">{{ formatDuration(song.duration) }}</div>
            <div class="track-actions">
              <!-- 歌曲平台链接 -->
              <div class="track-platforms" v-if="availablePlatforms(song).length > 0">
                <a 
                  v-for="platform in availablePlatforms(song)" 
                  :key="platform.key" 
                        :href="song[platform.key]"
                        target="_blank"
                  class="track-platform-link"
                      >
                  <div class="track-platform-icon-wrapper">
                    <img :src="platform.icon" :alt="platform.name" class="track-platform-icon" />
                        </div>
                      </a>
              </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
    <!-- 加载中状态 -->
    <div class="loading-state" v-if="loading">
      <div class="loading-spinner"></div>
      <div class="loading-text">加载中...</div>
            </div>
    
    <!-- 错误状态 -->
    <div class="error-state" v-if="error">
      <div class="error-icon">!</div>
      <div class="error-text">{{ error }}</div>
      <button class="retry-btn" @click="$router.push('/')">返回首页</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import axios from 'axios';
import { API_BASE_URL, STATIC_BASE_URL } from '@/config';

// Meta options for hiding global UI elements
defineOptions({
  name: 'AlbumLinkDetail',
  meta: {
    hideNav: true,
    hideAi: true
  }
});

const route = useRoute();
const router = useRouter();
const loading = ref(true);
const error = ref(null);
const albumLink = ref(null);
const heroImageUrl = ref('');

// 平台配置
const platforms = [
  { key: 'netease', name: '网易云音乐', icon: '/网易云.svg' },
  { key: 'qq', name: 'QQ音乐', icon: '/QQ音乐.svg' },
  { key: 'kugou', name: '酷狗音乐', icon: '/酷狗音乐.svg' },
  { key: 'kuwo', name: '酷我音乐', icon: '/酷我音乐.svg' },
  { key: 'qishui', name: '汽水音乐', icon: '/汽水音乐.svg' },
  { key: 'spotify', name: 'Spotify', icon: '/Spotify.svg' },
  { key: 'youtube', name: 'YouTube', icon: '/youtube.svg' },
  { key: 'appleMusic', name: 'Apple Music', icon: '/applemusic.svg' },
  { key: 'soundCloud', name: 'SoundCloud', icon: '/soundcloud.svg' }
];

// 获取歌曲可用的平台
const availablePlatforms = (song) => {
  return platforms.filter(platform => song[platform.key]);
};

// 获取专辑可用的平台
const availableAlbumPlatforms = computed(() => {
  if (!albumLink.value) return [];
  return platforms.filter(platform => albumLink.value[platform.key]);
});

// 检查专辑是否有平台链接
const hasAlbumPlatformLinks = computed(() => {
  if (!albumLink.value) return false;
  return platforms.some(platform => albumLink.value[platform.key]);
});

// 格式化日期
const formatDate = (timestamp) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
};

// 格式化歌曲时长
const formatDuration = (milliseconds) => {
  if (!milliseconds) return '0:00';
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

// 获取图片URL
const getImageUrl = (imagePath) => {
  if (!imagePath) return '/placeholder-album.png';
  
  // 如果是完整URL直接返回
  if (imagePath.startsWith('http')) return imagePath;
  
  // 确保静态资源基础URL和路径之间有正确的斜杠
  const baseUrl = STATIC_BASE_URL.endsWith('/') ? STATIC_BASE_URL : `${STATIC_BASE_URL}/`;
  const path = imagePath.startsWith('/') ? imagePath.substring(1) : imagePath;
  
  return `${baseUrl}${path}`;
};

// 辅助函数：生成缩略图URL
const getThumbnailUrl = (imagePath) => {
  if (!imagePath) return '';
  const parts = imagePath.split('/');
  const filename = parts.pop();
  const thumbFilename = `thumb_${filename}`;
  return `${parts.join('/')}/thumbnails/${thumbFilename}`;
};

// 返回上一页
const goBack = () => {
  router.go(-1);
};

// 获取专辑链接详情
const fetchAlbumLink = async (slug) => {
  try {
    loading.value = true;
    error.value = null;
    
    const response = await axios.get(`${API_BASE_URL}/album-links/${slug}`);
    console.log('获取到的专辑数据:', response.data);
      
    // 处理专辑表演者信息
    if (response.data.performer && !response.data.performers) {
      if (response.data.performer.includes('/')) {
        response.data.performers = response.data.performer.split('/').map(p => p.trim()).filter(p => p);
      } else {
        response.data.performers = [response.data.performer];
      }
      console.log('处理专辑表演者信息:', response.data.performers);
  }
  
    // 处理每首歌曲的表演者信息
    if (response.data.songs && response.data.songs.length > 0) {
      response.data.songs = response.data.songs.map(song => {
        // 首先处理内部歌曲的歌手信息
        if (song.internalSong && song.internalSong.Artists && song.internalSong.Artists.length > 0) {
          const artistNames = song.internalSong.Artists.map(artist => artist.name);
          song.internalArtistName = artistNames.join(' & ');
          song.artistName = song.internalArtistName; // 直接使用内部歌手作为显示名
          console.log(`从内部歌曲设置歌曲 ${song.songName} 的歌手为:`, song.artistName);
          return song; // 如果有内部歌曲歌手信息，直接返回，不用后面的处理
  }
  
        // 如果有internalArtistName字段
        if (song.internalArtistName) {
          song.artistName = song.internalArtistName;
          console.log(`使用internalArtistName为歌曲 ${song.songName} 设置歌手:`, song.artistName);
          return song;
      }
      
        // 如果歌曲没有自己的歌手信息但有performer字段
        if ((!song.artistName || song.artistName === '未知艺术家') && song.performer) {
          if (song.performer.includes('/')) {
            const performers = song.performer.split('/').map(p => p.trim()).filter(p => p);
            if (performers.length > 0) {
              song.performers = performers;
              song.artistName = performers.join(' & ');
              console.log(`从performer设置歌曲 ${song.songName} 的歌手为:`, song.artistName);
            }
          } else {
            song.artistName = song.performer;
            song.performers = [song.performer];
            console.log(`从performer设置歌曲 ${song.songName} 的歌手为:`, song.artistName);
          }
        }
        
        // 如果歌曲没有任何歌手信息，使用专辑表演者（作为最后手段）
        if (!song.artistName || song.artistName === '未知艺术家') {
          if (response.data.performers && response.data.performers.length > 0) {
            song.performers = response.data.performers;
            song.artistName = response.data.performers.join(' & ');
            console.log(`使用专辑表演者为歌曲 ${song.songName} 设置歌手:`, song.artistName);
          } else if (response.data.performer) {
            song.performer = response.data.performer;
            song.artistName = response.data.performer;
            console.log(`使用专辑performer为歌曲 ${song.songName} 设置歌手:`, song.artistName);
          } else if (response.data.artistName) {
            song.artistName = response.data.artistName;
            console.log(`使用专辑artistName为歌曲 ${song.songName} 设置歌手:`, song.artistName);
          }
        }
        
        return song;
      });
    }
    
    albumLink.value = response.data;
    document.title = `${albumLink.value.albumName} - ${albumLink.value.artistName} | 极音记`;
    
    // 直接设置高清背景图
    if (albumLink.value.coverImage) {
      heroImageUrl.value = getImageUrl(albumLink.value.coverImage);
    }
    
  } catch (err) {
    console.error('获取专辑链接详情失败:', err);
    if (err.response?.status === 404) {
      error.value = '链接页面不存在或已被禁用';
    } else {
      error.value = '获取专辑链接详情失败';
    }
    albumLink.value = null;
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  const slug = route.params.slug;
  if (slug) {
    fetchAlbumLink(slug);
  } else {
    error.value = '未指定专辑链接标识符';
    loading.value = false;
  }
});

// 获取歌曲的歌手名称，按优先级处理
const getSongArtist = (song) => {
  // 调试歌曲表演者数据
  console.log('歌曲表演者数据:', song.songName, {
    artistName: song.artistName, 
    internalArtistName: song.internalArtistName,
    performer: song.performer, 
    performers: song.performers,
    internalSong: song.internalSong
});

  // 0. 如果有内部歌曲的歌手信息，优先使用
  if (song.internalSong && song.internalSong.Artists && song.internalSong.Artists.length > 0) {
    const artistNames = song.internalSong.Artists.map(artist => artist.name);
    console.log(`歌曲 ${song.songName} 使用内部歌曲歌手:`, artistNames.join(' & '));
    return artistNames.join(' & ');
  }
  
  // 0.1 如果有从内部歌曲提取的歌手名
  if (song.internalArtistName) {
    console.log(`歌曲 ${song.songName} 使用内部提取歌手名:`, song.internalArtistName);
    return song.internalArtistName;
  }
  
  // 1. 如果歌曲有歌手名，直接使用
  if (song.artistName && song.artistName !== '未知艺术家') {
    console.log(`歌曲 ${song.songName} 使用自身歌手名:`, song.artistName);
    return song.artistName;
  }
  
  // 2. 如果歌曲有performer字段，处理performer
  if (song.performer) {
    // 如果是斜杠分隔的表演者
    if (typeof song.performer === 'string' && song.performer.includes('/')) {
      const performers = song.performer.split('/').map(p => p.trim()).filter(p => p);
      if (performers.length > 0) {
        console.log(`歌曲 ${song.songName} 使用斜杠分隔表演者:`, performers.join(' & '));
        return performers.join(' & ');
    }
    }
    console.log(`歌曲 ${song.songName} 使用performer字段:`, song.performer);
    return song.performer;
  }
  
  // 3. 如果歌曲有performers数组
  if (song.performers && Array.isArray(song.performers) && song.performers.length > 0) {
    console.log(`歌曲 ${song.songName} 使用performers数组:`, song.performers.join(' & '));
    return song.performers.join(' & ');
  }
  
  // 4. 回退到专辑歌手，但添加日志
  if (albumLink.value) {
    console.log(`歌曲 ${song.songName} 没有找到自己的歌手信息，回退到专辑歌手`);
    
    // 首先尝试专辑的performer字段
    if (albumLink.value.performer) {
      // 如果是斜杠分隔的表演者
      if (typeof albumLink.value.performer === 'string' && albumLink.value.performer.includes('/')) {
        const performers = albumLink.value.performer.split('/').map(p => p.trim()).filter(p => p);
        if (performers.length > 0) {
          return performers.join(' & ');
}
      }
      return albumLink.value.performer;
}

    // 然后尝试专辑的performers数组
    if (albumLink.value.performers && Array.isArray(albumLink.value.performers) && albumLink.value.performers.length > 0) {
      return albumLink.value.performers.join(' & ');
}

    // 最后使用专辑的artistName
    return albumLink.value.artistName;
}

  // 如果都没有，返回未知艺术家
  return '未知艺术家';
};
</script>

<style lang="scss" scoped>
@import '@/assets/styles/variables';

// 覆盖父元素main的顶部内边距
:deep(main) {
  padding-top: 0 !important;
  padding-bottom: 0 !important;
  margin-bottom: 0 !important;
  min-height: 100vh;
}

// 设置body和html样式
:deep(body), :deep(html) {
  height: 100vh; /* 强制高度为视口高度 */
  overflow: hidden !important; /* 隐藏body/html的滚动条 */
  margin: 0 !important;
  padding: 0 !important;
  background-color: $dark-bg !important;
}

:deep(.router-view-container) {
  padding: 0 !important;
  margin: 0 !important;
}

.album-detail-page {
  height: 100vh; /* 占满整个视口高度 */
  overflow-y: auto; /* 当内容超出时，只显示垂直滚动条 */
  color: $light-text;
  font-family: $font-primary;
  background-color: $dark-bg;
  position: relative;
  padding: 0;
  margin: 0;
  border: none;
  display: block;
  
  // 专辑背景大图
  .album-hero {
  position: absolute;
    top: 0;
  left: 0;
  width: 100%;
    height: 100vh; // 使用100vh而不是70vh
  background-size: cover;
    background-position: center top;
    z-index: 1;
    
    &::before {
      display: none;
}

    .album-hero-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
      background: linear-gradient(
        to bottom,
        rgba(0, 0, 0, 0.3) 10%,
        rgba(0, 0, 0, 0.5) 30%,
        $dark-bg 100%
      );
      z-index: 2;
}
  }
  
  // 返回按钮
  .back-button {
    position: fixed;
    bottom: 40px;
    left: 40px;
  display: flex;
  align-items: center;
    cursor: pointer;
    z-index: 10;
    
    .back-circle {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: rgba($light-text, 0.15);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s;
      
      .back-icon {
        width: 24px;
        height: 24px;
        color: $light-text;
        transition: transform 0.3s;
      }
}

    .back-text {
      background: rgba($light-text, 0.15);
      height: 44px;
      display: flex;
      align-items: center;
      padding: 0 20px;
      border-radius: 0 22px 22px 0;
      margin-left: -5px;
      transform: translateX(-10px);
      opacity: 0;
      transition: all 0.3s;
      font-weight: 500;
      letter-spacing: 0.5px;
    }
    
    &:hover {
      .back-circle {
        background: rgba($light-text, 0.25);
      }
      
      .back-icon {
        transform: translateX(-3px);
}

      .back-text {
        transform: translateX(0);
        opacity: 1;
      }
    }
}

  // 专辑内容
  .album-content {
    max-width: 800px;
    margin: 0 auto;
    position: relative;
    z-index: 3;
    padding: 5rem 10% 100px; // 恢复顶部内边距，但现在是相对于页面顶部
    
    // 专辑头部
    .album-header {
  display: flex;
      gap: 40px;
      margin-bottom: 60px;
      padding-top: 10vh; // 从50vh减小到40vh，让内容上移
      
      @media (max-width: $breakpoint-md) {
        flex-direction: column;
}

.album-cover {
        flex-shrink: 0;
        width: 300px;
        height: 300px;
  overflow: hidden;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
        
        @media (max-width: $breakpoint-md) {
          width: 250px;
          height: 250px;
          margin: 0 auto;
        }
        
        img {
  width: 100%;
  height: 100%;
  object-fit: cover;
          display: block;
        }
}

.album-info {
        flex: 1;
        
        .album-title {
          font-size: 3rem;
          font-weight: 900;
          line-height: 1.1;
          margin-bottom: 10px;
  text-transform: uppercase;
          
          @media (max-width: $breakpoint-lg) {
            font-size: 2.5rem;
          }
          
          @media (max-width: $breakpoint-md) {
            font-size: 2rem;
            text-align: center;
          }
}

        .album-artist {
          font-size: 1.5rem;
  margin-bottom: 15px;
          color: rgba($light-text, 0.8);
          
          @media (max-width: $breakpoint-md) {
            text-align: center;
}
}

        .album-meta {
  display: flex;
          gap: 15px;
          margin-bottom: 20px;
          color: rgba($light-text, 0.6);
          
          @media (max-width: $breakpoint-md) {
  justify-content: center;
          }
          
          .album-date, .album-type {
            font-size: 0.9rem;
          }
}

        .album-platform-links {
          margin-top: 30px;
          margin-bottom: 20px;

          .platform-links-title {
            font-size: 1rem;
            font-weight: 500;
            margin-bottom: 15px;
            color: rgba($light-text, 0.7);
            text-transform: uppercase;
            letter-spacing: 0.5px;
}

          .platform-links-grid {
            display: flex;
            flex-wrap: wrap;
            gap: 12px;

            .platform-link {
  display: flex;
  align-items: center;
  justify-content: center;
              width: 40px;
              height: 40px;
              background-color: rgba($light-text, 0.08);
              border-radius: 50%;
              text-decoration: none;
              color: $light-text;
  transition: all 0.3s ease;

              &:hover {
                background-color: rgba($light-text, 0.15);
                transform: translateY(-2px);
}

              .platform-icon {
  width: 20px;
  height: 20px;
              }
            }
          }
}

        .album-description {
          font-size: 1rem;
          line-height: 1.6;
          color: rgba($light-text, 0.8);
          white-space: pre-line;
          max-height: 200px;
          overflow-y: auto;
          padding-right: 10px;
          
          &::-webkit-scrollbar {
            width: 5px;
}

          &::-webkit-scrollbar-track {
            background: rgba($light-text, 0.1);
}

          &::-webkit-scrollbar-thumb {
            background: rgba($light-text, 0.3);
          }
        }
      }
    }
    
    // 曲目列表
    .album-tracks {
      .tracks-title {
        font-size: 1.5rem;
  margin-bottom: 20px;
  position: relative;
        
        &::after {
  content: '';
  position: absolute;
          bottom: -10px;
  left: 0;
  width: 40px;
          height: 2px;
          background-color: $primary-color;
}
}

      .tracks-list {
        .track-item {
  display: flex;
  align-items: center;
          padding: 15px 20px;
          border-bottom: 1px solid rgba($light-text, 0.1);
          transition: all 0.3s;
          
          &:hover {
            background-color: rgba($light-text, 0.05);
            
            .track-actions {
              opacity: 1;
            }
}

          .track-number {
            width: 30px;
            font-size: 0.9rem;
            color: rgba($light-text, 0.6);
  text-align: center;
}

          .track-info {
  flex: 1;
  padding: 0 15px;
            overflow: hidden;

            .track-name {
              font-weight: 500;
  margin-bottom: 5px;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
}

            .track-artist {
              font-size: 0.9rem;
              color: rgba($light-text, 0.7);
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
}

          .track-duration {
            font-size: 0.9rem;
            color: rgba($light-text, 0.6);
            margin-right: 15px;
          }
          
          .track-actions {
            opacity: 0;
            transition: opacity 0.3s;
            
            .track-platforms {
  display: flex;
              gap: 10px;
              
              .track-platform-link {
                width: 36px;
                height: 36px;
                border-radius: 50%;
                background: rgba($light-text, 0.1);
                display: flex;
  align-items: center;
  justify-content: center;
                transition: all 0.3s;
                
                &:hover {
                  background: rgba($light-text, 0.2);
                  transform: scale(1.1);
}

                .track-platform-icon-wrapper {
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  
                  .track-platform-icon {
                    width: 18px;
                    height: 18px;
                  }
                }
              }
            }
          }
        }
      }
    }
  }
  
  // 加载中状态
  .loading-state {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    z-index: 10;
    
    .loading-spinner {
      width: 40px;
      height: 40px;
      border: 3px solid rgba($light-text, 0.1);
      border-top-color: $light-text;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-bottom: 15px;
}

    .loading-text {
      color: rgba($light-text, 0.7);
    }
}

  // 错误状态
  .error-state {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    z-index: 10;
    
    .error-icon {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: rgba(255, 0, 0, 0.1);
      border: 2px solid rgba(255, 0, 0, 0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 2rem;
      color: rgba(255, 0, 0, 0.7);
      margin-bottom: 15px;
  }
  
    .error-text {
      color: rgba($light-text, 0.7);
      margin-bottom: 20px;
  }
    
    .retry-btn {
      background: none;
      border: 1px solid $light-text;
      color: $light-text;
      padding: 8px 20px;
  cursor: pointer;
      transition: all 0.3s;
      
      &:hover {
        background: rgba($light-text, 0.1);
      }
    }
  }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style> 