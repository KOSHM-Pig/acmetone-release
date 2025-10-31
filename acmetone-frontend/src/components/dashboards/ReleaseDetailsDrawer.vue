<template>
  <div class="release-details-drawer" :class="{ 'visible': visible }">
    <div class="drawer-mask" @click="close"></div>
    <div class="drawer-content">
      <div class="drawer-header">
        <h3 class="drawer-title">{{ formatDate(date) }} 发行专辑</h3>
        <button class="close-btn" @click="close">
          <i class="el-icon-close"></i>
        </button>
      </div>
      
      <div class="drawer-body">
        <div v-if="releases && releases.length > 0" class="releases-container">
          <div class="navigation-controls" v-if="releases.length > 1">
            <button class="nav-btn prev-btn" @click="prevRelease" :disabled="currentIndex === 0">
              <i class="el-icon-arrow-left"></i>
            </button>
            <div class="pagination-info">{{ currentIndex + 1 }} / {{ releases.length }}</div>
            <button class="nav-btn next-btn" @click="nextRelease" :disabled="currentIndex === releases.length - 1">
              <i class="el-icon-arrow-right"></i>
            </button>
          </div>
          
          <div class="release-details">
            <div class="album-cover">
              <img :src="formattedCoverImage" :alt="currentRelease.title" @error="handleImageError">
            </div>
            <div class="album-info">
              <h4 class="album-title">{{ currentRelease.title }}</h4>
              <div class="album-performer">{{ currentRelease.performer }}</div>
              <div class="album-actions">
                <button class="action-btn view-btn" @click="viewAlbumDetails">
                  <i class="el-icon-view"></i> 查看详情
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <div v-else class="no-releases">
          <i class="el-icon-info-filled"></i>
          <p>该日期没有发行专辑</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { STATIC_BASE_URL } from '../../config';

export default {
  name: 'ReleaseDetailsDrawer',
  mounted() {
    // 添加页面级CSS，防止滚动条跳动
    const style = document.createElement('style');
    style.id = 'drawer-global-style';
    style.textContent = `
      html.drawer-open {
        overflow: hidden !important;
      }
      html.drawer-open body {
        overflow: hidden !important;
      }
    `;
    document.head.appendChild(style);
  },
  beforeUnmount() {
    // 移除页面级CSS
    const style = document.getElementById('drawer-global-style');
    if (style) {
      document.head.removeChild(style);
    }
  },
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    releases: {
      type: Array,
      default: () => []
    },
    date: {
      type: String,
      default: null
    }
  },
  data() {
    return {
      currentIndex: 0
    };
  },
  computed: {
    currentRelease() {
      return this.releases[this.currentIndex] || {};
    },
    formattedCoverImage() {
      if (!this.currentRelease || !this.currentRelease.coverImage) {
        return '/placeholder-album.png';
      }
      
      // 如果已经有缩略图URL，直接使用
      if (this.currentRelease.coverImageThumbnail) {
        // 判断缩略图路径是否已包含完整URL
        if (this.currentRelease.coverImageThumbnail.startsWith('http')) {
          return this.currentRelease.coverImageThumbnail;
        }
        // 确保路径格式正确
        if (this.currentRelease.coverImageThumbnail.startsWith('/')) {
          return `${STATIC_BASE_URL}${this.currentRelease.coverImageThumbnail}`;
        } else {
          return `${STATIC_BASE_URL}/${this.currentRelease.coverImageThumbnail}`;
        }
      }
      
      // 如果coverImage已经是完整URL且包含缩略图路径(thumb_)，直接使用
      if (this.currentRelease.coverImage.startsWith('http') && this.currentRelease.coverImage.includes('thumb_')) {
        return this.currentRelease.coverImage;
      }
      
      try {
        // 如果原图路径已经是完整URL
        if (this.currentRelease.coverImage.startsWith('http')) {
          // 检查URL是否已包含缩略图标识
          if (this.currentRelease.coverImage.includes('thumb_')) {
            return this.currentRelease.coverImage;
          } else {
            // 从URL中提取路径部分
            const url = new URL(this.currentRelease.coverImage);
            const pathParts = url.pathname.split('/');
            const fileName = pathParts[pathParts.length - 1];
            
            // 构建缩略图路径
            // 如果路径中包含thumbnails目录
            if (url.pathname.includes('/thumbnails/')) {
              // 在文件名前加上thumb_前缀
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
        } else {
          // 本地路径处理
          const pathParts = this.currentRelease.coverImage.split('/');
          const fileName = pathParts[pathParts.length - 1];
          
          // 如果路径中包含thumbnails目录
          if (this.currentRelease.coverImage.includes('/thumbnails/')) {
            // 在文件名前加上thumb_前缀
            const thumbFileName = `thumb_${fileName}`;
            const dirPath = pathParts.slice(0, -1).join('/');
            const thumbPath = `${dirPath}/${thumbFileName}`;
            
            // 返回缩略图URL
            if (thumbPath.startsWith('/')) {
              return `${STATIC_BASE_URL}${thumbPath}`;
            } else {
              return `${STATIC_BASE_URL}/${thumbPath}`;
            }
          } else {
            // 添加thumbnails目录和thumb_前缀
            const dirPath = pathParts.slice(0, -1).join('/');
            const thumbPath = `${dirPath}/thumbnails/thumb_${fileName}`;
            
            // 返回缩略图URL
            if (thumbPath.startsWith('/')) {
              return `${STATIC_BASE_URL}${thumbPath}`;
            } else {
              return `${STATIC_BASE_URL}/${thumbPath}`;
            }
          }
        }
      } catch (error) {
        console.error('构建缩略图URL失败:', error);
        
        // 出错时返回原图路径
        if (this.currentRelease.coverImage.startsWith('http')) {
          return this.currentRelease.coverImage;
        } else if (this.currentRelease.coverImage.startsWith('/')) {
          return `${STATIC_BASE_URL}${this.currentRelease.coverImage}`;
        } else {
          return `${STATIC_BASE_URL}/${this.currentRelease.coverImage}`;
        }
      }
    }
  },
  watch: {
    visible(newVal) {
      if (newVal) {
        // 当抽屉打开时，重置索引
        this.currentIndex = 0;
        
        // 计算并保存当前滚动条宽度
        const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
        
        // 添加全局类控制滚动
        document.documentElement.classList.add('drawer-open');
        
        // 保持页面布局稳定
        document.body.style.paddingRight = scrollbarWidth + 'px';
        document.body.style.boxSizing = 'border-box';
        document.body.style.position = 'relative';
        
        // 调试信息
        console.log('抽屉打开，日期:', this.date);
        console.log('发行数据:', this.releases);
        console.log('静态资源URL:', STATIC_BASE_URL);
        
        if (this.releases && this.releases.length > 0 && this.releases[0].coverImage) {
          // 检查图片路径格式
          const coverPath = this.releases[0].coverImage;
          console.log('原始封面路径:', coverPath);
          console.log('处理后的封面路径:', this.formattedCoverImage);
          
          // 检测图片类型
          const filename = coverPath.split('/').pop();
          if (filename) {
            if (filename.includes('album_cover_')) {
              console.log('图片类型: 专辑封面');
            } else if (filename.includes('image_')) {
              console.log('图片类型: 普通图片');
            } else {
              console.log('图片类型: 未知', filename);
            }
          }
        }
      } else {
        // 移除全局类，恢复滚动
        document.documentElement.classList.remove('drawer-open');
        
        // 恢复原始布局
        setTimeout(() => {
          // 延迟移除样式，确保过渡动画完成
          document.body.style.paddingRight = '';
          document.body.style.boxSizing = '';
          document.body.style.position = '';
        }, 300); // 与过渡动画时间一致
      }
    },
    releases(newVal) {
      // 当发行列表变化时，重置索引
      this.currentIndex = 0;
      console.log('发行列表更新:', newVal);
    }
  },
  methods: {
    close() {
      // 使用requestAnimationFrame确保动画平滑
      requestAnimationFrame(() => {
        this.$emit('close');
        console.log('关闭抽屉');
      });
    },
    prevRelease() {
      if (this.currentIndex > 0) {
        this.currentIndex--;
      }
    },
    nextRelease() {
      if (this.currentIndex < this.releases.length - 1) {
        this.currentIndex++;
      }
    },
    viewAlbumDetails() {
      if (this.currentRelease && this.currentRelease.id) {
        // 跳转到专辑详情页
        this.$router.push(`/albums/${this.currentRelease.id}`);
        this.close();
      }
    },
    handleImageError(event) {
      // 如果是缩略图加载失败，尝试加载原图
      if (event.target.src.includes('thumb_')) {
        // 构建原图URL
        let originalUrl;
        if (this.currentRelease.coverImage) {
          if (this.currentRelease.coverImage.startsWith('http')) {
            originalUrl = this.currentRelease.coverImage;
          } else if (this.currentRelease.coverImage.startsWith('/')) {
            originalUrl = `${STATIC_BASE_URL}${this.currentRelease.coverImage}`;
          } else {
            originalUrl = `${STATIC_BASE_URL}/${this.currentRelease.coverImage}`;
          }
          
          // 移除URL中的缩略图部分
          originalUrl = originalUrl.replace('/thumbnails/thumb_', '/');
          originalUrl = originalUrl.replace('thumb_', '');
          
          event.target.src = originalUrl;
          return;
        }
      }
      
      // 如果不是缩略图或找不到对应专辑，使用默认占位图
      event.target.src = '/placeholder-album.png';
      event.target.onerror = null; // 防止无限循环
    },
    formatDate(dateString) {
      if (!dateString) return '';
      
      const date = new Date(dateString);
      return `${date.getFullYear()}年${(date.getMonth() + 1)}月${date.getDate()}日`;
    }
  }
};
</script>

<style scoped>
:root {
  --garrix-black: #1d1d1f;
  --garrix-white: #ffffff;
  --garrix-grey: #86868b;
  --garrix-light-grey: #f5f7fa;
  --garrix-border-grey: #d2d2d7;
  --garrix-text-primary: #1d1d1f;
  --garrix-text-secondary: #86868b;
}

.release-details-drawer {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  top: 0;
  z-index: 2000;
  pointer-events: none;
  will-change: transform;
  backface-visibility: hidden;
}

.drawer-mask {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  opacity: 0;
  transition: opacity 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  pointer-events: none;
  will-change: opacity;
  -webkit-tap-highlight-color: transparent;
}

.drawer-content {
  position: absolute;
  left: 50%;
  right: auto;
  bottom: 0;
  transform: translateX(-50%) translateY(100%);
  width: 90%;
  max-width: 400px;
  background-color: var(--garrix-white, #ffffff);
  border-top: 1px solid var(--garrix-border-grey);
  border-top-left-radius: 8px;
  border-top-right-radius: 8px;
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  max-height: 50vh;
  display: flex;
  flex-direction: column;
  pointer-events: none;
  box-shadow: 0px -2px 10px rgba(0, 0, 0, 0.1);
  will-change: transform;
  backface-visibility: hidden;
  -webkit-font-smoothing: antialiased;
}

.release-details-drawer.visible {
  pointer-events: auto;
}

.release-details-drawer.visible .drawer-mask {
  opacity: 1;
  pointer-events: auto;
}

.release-details-drawer.visible .drawer-content {
  transform: translateX(-50%) translateY(0);
  pointer-events: auto;
  transition-timing-function: cubic-bezier(0.22, 1, 0.36, 1);
}

.drawer-header {
  padding: 10px;
  border-bottom: 1px solid var(--garrix-border-grey);
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #f9f9f9;
}

.drawer-title {
  margin: 0;
  font-size: 13px;
  color: var(--garrix-black, #1d1d1f);
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.close-btn {
  background: none;
  border: none;
  font-size: 14px;
  cursor: pointer;
  color: var(--garrix-black, #1d1d1f);
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.drawer-body {
  padding: 10px;
  overflow-y: auto;
  flex: 1;
  background-color: #ffffff;
}

.navigation-controls {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 12px;
}

.nav-btn {
  background: none;
  border: 1px solid var(--garrix-border-grey);
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0;
}

.nav-btn:hover:not(:disabled) {
  border-color: var(--garrix-black);
}

.nav-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pagination-info {
  margin: 0 10px;
  font-size: 11px;
  color: var(--garrix-grey);
}

.release-details {
  display: flex;
  gap: 12px;
}

.album-cover {
  width: 60px;
  height: 60px;
  border: 1px solid var(--garrix-border-grey);
  border-radius: 4px;
  overflow: hidden;
  flex-shrink: 0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.album-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.album-cover:hover img {
  transform: scale(1.05);
}

.album-info {
  flex: 1;
}

.album-title {
  margin: 0 0 4px 0;
  font-size: 13px;
  color: var(--garrix-black, #1d1d1f);
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.album-performer {
  margin-bottom: 8px;
  color: var(--garrix-grey);
  font-size: 11px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.album-actions {
  margin-top: 8px;
}

.action-btn {
  padding: 3px 8px;
  border: 1px solid var(--garrix-border-grey);
  border-radius: 3px;
  cursor: pointer;
  font-size: 10px;
  background: none;
  display: inline-flex;
  align-items: center;
  gap: 3px;
  transition: all 0.2s ease;
}

.view-btn {
  color: var(--garrix-black, #1d1d1f);
}

.view-btn:hover {
  border-color: var(--garrix-black);
  background-color: var(--garrix-light-grey);
  transform: translateY(-1px);
}

.no-releases {
  text-align: center;
  padding: 15px 0;
  color: var(--garrix-grey);
  font-size: 11px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.no-releases i {
  font-size: 20px;
  margin-bottom: 8px;
  opacity: 0.5;
}

@media (max-width: 768px) {
  .drawer-content {
    width: 95%;
    max-width: 350px;
  }
  
  .release-details {
    flex-direction: row;
    align-items: center;
  }
  
  .album-info {
    text-align: left;
  }
  
  .album-actions {
    display: flex;
    justify-content: flex-start;
  }
}

@media (max-width: 480px) {
  .drawer-content {
    width: 95%;
    max-width: 300px;
  }
  
  .drawer-header {
    padding: 8px;
  }
  
  .drawer-title {
    font-size: 12px;
  }
  
  .drawer-body {
    padding: 8px;
  }
  
  .album-cover {
    width: 50px;
    height: 50px;
  }
  
  .album-title {
    font-size: 12px;
  }
  
  .album-performer {
    font-size: 10px;
    margin-bottom: 6px;
  }
  
  .action-btn {
    padding: 2px 6px;
    font-size: 9px;
  }
}
</style> 