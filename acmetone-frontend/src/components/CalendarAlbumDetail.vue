<template>
  <div class="album-detail">
    <!-- 选中专辑的大图展示 -->
    <div v-if="selectedAlbum" class="featured-album">
      <div class="album-cover-large">
        <img
          :src="getAlbumCoverUrl(selectedAlbum)"
          :alt="selectedAlbum.name"
          class="cover-image"
        />
        <div class="play-overlay">
          <button class="play-btn-large" @click="playAlbum(selectedAlbum)">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </button>
        </div>
      </div>

      <div class="album-info-large">
        <h2 class="album-title">{{ selectedAlbum.name }}</h2>
        <p class="album-artist">{{ getArtistNames(selectedAlbum.artists) || selectedAlbum.performer }}</p>
        <p class="album-display-info-large">{{ selectedAlbum.label || selectedAlbum.displayInfo }}</p>
        <p class="release-info">专辑 • {{ formatReleaseDate(selectedAlbum.releaseDate) }}</p>
      </div>
    </div>

    <!-- 专辑列表标题 -->
    <div class="section-header">
      <h3 class="section-title">发行列表</h3>
      <div class="section-subtitle">
        今日发行的艺术家和专辑
      </div>
    </div>

    <!-- 专辑列表 -->
    <div class="album-list">
      <div v-if="albums.length === 0" class="no-albums">
        <p class="no-albums-text">这一天没有专辑发行</p>
      </div>

      <div class="album-items-container">
        <div
          v-for="(album, index) in albums"
          :key="album.id"
          class="album-item"
          :class="{ 'selected': selectedAlbum && selectedAlbum.id === album.id }"
          @click="selectAlbum(album)"
        >
          <div class="album-left">
            <img
              :src="getAlbumCoverUrl(album)"
              :alt="album.name"
              class="album-cover"
            />
            <div class="album-info">
              <h4 class="album-name">{{ album.name }}</h4>
              <p class="album-artist">{{ getArtistNames(album.artists) || album.performer }}</p>
            </div>
          </div>
          <div class="album-right">
            <div class="album-date">{{ formatReleaseDate(album.releaseDate) }}</div>
            <div class="album-label">{{ album.label || album.displayInfo || album.type || '专辑' }}</div>
          </div>
        </div>
      </div>
    </div>


  </div>
</template>

<script>
import { STATIC_BASE_URL } from '@/config';
import { ensureFullUrl } from '@/utils/urlHelper';

export default {
  name: 'AlbumDetail',
  props: {
    selectedDate: {
      type: Date,
      required: true
    },
    selectedAlbum: {
      type: Object,
      default: null
    },
    albums: {
      type: Array,
      default: () => []
    }
  },
  emits: ['album-selected', 'date-changed'],
  watch: {
    albums: {
      handler(newAlbums) {
        console.log('📀 CalendarAlbumDetail: albums数据变化', newAlbums);
        if (newAlbums && newAlbums.length > 0) {
          console.log('📀 CalendarAlbumDetail: 第一个专辑的完整数据', newAlbums[0]);
          console.log('📀 CalendarAlbumDetail: displayInfo字段', newAlbums[0].displayInfo);
          console.log('📀 CalendarAlbumDetail: label字段', newAlbums[0].label);
        }
      },
      immediate: true
    },
    selectedAlbum: {
      handler(newAlbum) {
        console.log('🎵 CalendarAlbumDetail: selectedAlbum变化', newAlbum);
      },
      immediate: true
    },
    selectedDate: {
      handler(newDate) {
        console.log('📅 CalendarAlbumDetail: selectedDate变化', newDate);
      },
      immediate: true
    }
  },
  computed: {
    formattedDate() {
      const options = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long'
      }
      return this.selectedDate.toLocaleDateString('zh-CN', options)
    }
  },
  methods: {
    selectAlbum(album) {
      console.log('🎵 CalendarAlbumDetail: 专辑被选中', album);
      this.$emit('album-selected', album)
    },
    playAlbum(album) {
      console.log(`Playing: ${album.name} - ${this.getArtistNames(album.artists)}`)
    },
    formatReleaseDate(dateStr) {
      if (!dateStr) return '';

      let date;
      if (dateStr instanceof Date) {
        date = dateStr;
      } else if (typeof dateStr === 'string') {
        if (dateStr.includes('T')) {
          // ISO格式: '2025-08-01T00:00:00.000Z'
          date = new Date(dateStr);
        } else {
          // 简单格式: '2025-08-01'
          const [year, month, day] = dateStr.split('-').map(Number);
          date = new Date(year, month - 1, day); // month是0-based
        }
      } else {
        return '';
      }

      if (isNaN(date.getTime())) return '';

      return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    },

    getAlbumCoverUrl(album) {
      if (!album || !album.cover) return `${STATIC_BASE_URL}/images/default-album.png`;

      // 优先使用缩略图
      if (album.coverImageThumbnail) {
        return ensureFullUrl(album.coverImageThumbnail);
      }

      // 如果没有缩略图字段，尝试构建缩略图路径
      const coverUrl = ensureFullUrl(album.cover);

      try {
        // 如果是完整URL
        if (coverUrl.startsWith('http')) {
          // 检查是否已经是缩略图
          if (coverUrl.includes('thumb_')) {
            return coverUrl;
          }

          // 构建缩略图URL
          const url = new URL(coverUrl);
          const pathParts = url.pathname.split('/');
          const fileName = pathParts[pathParts.length - 1];

          // 如果路径中包含thumbnails目录
          if (url.pathname.includes('/thumbnails/')) {
            const thumbFileName = `thumb_${fileName}`;
            const dirPath = pathParts.slice(0, -1).join('/');
            url.pathname = `${dirPath}/${thumbFileName}`;
          } else {
            // 添加thumbnails目录和thumb_前缀
            const dirPath = pathParts.slice(0, -1).join('/');
            url.pathname = `${dirPath}/thumbnails/thumb_${fileName}`;
          }

          return url.toString();
        }
      } catch (error) {
        console.error('构建缩略图URL失败:', error);
      }

      // 如果构建失败，返回原图
      return coverUrl;
    },
    getArtistNames(artists) {
      if (!artists || !Array.isArray(artists)) return '未知艺术家';
      return artists.map(artist => artist.name || artist).join(', ');
    }
  }
}
</script>

<style scoped>
.album-detail {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--color-white);
  position: relative;
  border-left: 1px solid var(--color-gray-300);
  box-shadow: -2px 0 8px rgba(0, 0, 0, 0.08);
}

.featured-album {
  padding: 24px;
  background: var(--color-white);
  border-bottom: 1px solid var(--color-gray-200);
}

.album-cover-large {
  position: relative;
  width: 200px;
  height: 200px;
  margin: 0 auto 16px;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

.cover-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.play-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: var(--transition);
}

.album-cover-large:hover .play-overlay {
  opacity: 1;
}

.play-btn-large {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: var(--color-white);
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: var(--transition);
}

.play-btn-large:hover {
  transform: scale(1.1);
}

.album-info-large {
  text-align: center;
}

.album-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--color-black);
  margin: 0 0 4px 0;
}

.album-artist {
  font-size: 14px;
  color: var(--color-gray-600);
  margin: 0 0 4px 0;
}

.album-display-info-large {
  font-size: 13px;
  color: var(--color-gray-500);
  margin: 0 0 8px 0;
  font-style: italic;
}

.release-info {
  font-size: 11px;
  color: var(--color-gray-500);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 0;
}

.section-header {
  padding: 20px 24px 16px;
  background: var(--color-white);
  border-bottom: 1px solid var(--color-gray-200);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  position: relative;
  z-index: 1;
}

.section-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--color-black);
  margin: 0 0 4px 0;
}

.section-subtitle {
  font-size: 12px;
  color: var(--color-gray-500);
  margin: 0;
}

.album-list {
  flex: 1;
  overflow-y: auto;
  background: var(--color-gray-25);
}

.album-items-container {
  padding: 8px 0;
}

.no-albums {
  padding: 40px 24px;
  text-align: center;
}

.no-albums-text {
  font-size: 14px;
  color: var(--color-gray-500);
}

.album-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 20px;
  border-bottom: 1px solid var(--color-gray-100);
  cursor: pointer;
  transition: all 0.2s ease;
  margin: 0 8px;
  border-radius: 6px;
  margin-bottom: 2px;
}

.album-item:hover {
  background: var(--color-gray-50);
  border-bottom-color: transparent;
}

.album-item.selected {
  background: var(--color-gray-50);
  border-left: 3px solid var(--color-black);
  border-bottom-color: transparent;
}

.album-left {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
}

.album-cover {
  width: 44px;
  height: 44px;
  border-radius: 4px;
  object-fit: cover;
  flex-shrink: 0;
}

.album-info {
  flex: 1;
  min-width: 0;
}

.album-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-gray-900);
  margin: 0 0 1px 0;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.album-artist {
  font-size: 11px;
  color: var(--color-gray-600);
  margin: 0;
  line-height: 1.2;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.album-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 1px;
  flex-shrink: 0;
  text-align: right;
}

.album-date {
  font-size: 11px;
  color: var(--color-gray-500);
  font-weight: 500;
  white-space: nowrap;
}

.album-label {
  font-size: 10px;
  color: var(--color-gray-400);
  white-space: nowrap;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
}





/* 平板端响应式 */
@media (max-width: 1024px) {
  .featured-album {
    padding: 20px;
  }

  .album-cover-large {
    width: 160px;
    height: 160px;
    margin-bottom: 12px;
  }

  .album-title {
    font-size: 16px;
  }

  .section-header {
    padding: 16px 20px 12px;
  }

  .section-title {
    font-size: 15px;
  }

  .album-item {
    padding: 8px 16px;
    margin: 0 6px;
  }

  .album-cover {
    width: 40px;
    height: 40px;
  }
}

/* 手机端响应式 */
@media (max-width: 768px) {
  .album-detail {
    border-left: none;
    box-shadow: none;
  }

  .featured-album {
    padding: 16px;
    text-align: center;
  }

  .album-cover-large {
    width: 140px;
    height: 140px;
    margin: 0 auto 12px;
  }

  .play-btn-large {
    width: 50px;
    height: 50px;
  }

  .album-title {
    font-size: 15px;
    margin-bottom: 6px;
  }

  .album-artist {
    font-size: 13px;
    margin-bottom: 4px;
  }

  .album-display-info-large {
    font-size: 12px;
    margin-bottom: 6px;
  }

  .release-info {
    font-size: 10px;
  }

  .section-header {
    padding: 14px 16px 10px;
  }

  .section-title {
    font-size: 14px;
  }

  .section-subtitle {
    font-size: 11px;
  }

  .album-items-container {
    padding: 6px 0;
  }

  .album-item {
    padding: 8px 12px;
    margin: 0 4px;
    border-radius: 4px;
  }

  .album-left {
    gap: 8px;
  }

  .album-cover {
    width: 36px;
    height: 36px;
    border-radius: 3px;
  }

  .album-name {
    font-size: 12px;
  }

  .album-artist {
    font-size: 10px;
  }

  .album-date {
    font-size: 10px;
  }

  .album-label {
    font-size: 9px;
    max-width: 80px;
  }

  .no-albums {
    padding: 30px 16px;
  }

  .no-albums-text {
    font-size: 13px;
  }
}

/* 小屏手机端优化 */
@media (max-width: 480px) {
  .featured-album {
    padding: 12px;
  }

  .album-cover-large {
    width: 120px;
    height: 120px;
    margin-bottom: 10px;
  }

  .play-btn-large {
    width: 40px;
    height: 40px;
  }

  .album-title {
    font-size: 14px;
    margin-bottom: 4px;
  }

  .album-artist {
    font-size: 12px;
    margin-bottom: 3px;
  }

  .album-display-info-large {
    font-size: 11px;
    margin-bottom: 4px;
  }

  .section-header {
    padding: 12px 12px 8px;
  }

  .section-title {
    font-size: 13px;
  }

  .album-item {
    padding: 6px 8px;
    margin: 0 2px;
  }

  .album-left {
    gap: 6px;
  }

  .album-cover {
    width: 32px;
    height: 32px;
  }

  .album-name {
    font-size: 11px;
  }

  .album-artist {
    font-size: 9px;
  }

  .album-right {
    gap: 0;
  }

  .album-date {
    font-size: 9px;
  }

  .album-label {
    font-size: 8px;
    max-width: 60px;
  }
}

/* 超小屏幕优化 */
@media (max-width: 360px) {
  .featured-album {
    padding: 8px;
  }

  .album-cover-large {
    width: 100px;
    height: 100px;
    margin-bottom: 8px;
  }

  .play-btn-large {
    width: 35px;
    height: 35px;
  }

  .album-title {
    font-size: 13px;
  }

  .album-artist {
    font-size: 11px;
  }

  .section-header {
    padding: 10px 8px 6px;
  }

  .album-item {
    padding: 5px 6px;
  }

  .album-cover {
    width: 28px;
    height: 28px;
  }

  .album-name {
    font-size: 10px;
  }

  .album-artist {
    font-size: 8px;
  }

  .album-label {
    max-width: 50px;
  }
}
</style>
