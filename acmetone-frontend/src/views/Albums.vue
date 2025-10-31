<template>
  <div class="albums-container" ref="albumsContainer">
    <!-- 顶部标题区域 -->
    <div class="header-section">
      <h1 class="main-title">我的专辑</h1>
      <button class="garrix-btn" @click="$router.push('/albums/new')">
        <span class="btn-icon">+</span>
        <span class="btn-text">新建专辑</span>
      </button>
    </div>

    <!-- 筛选区域 -->
    <div class="filter-section">
      <div class="filter-tabs">
        <span 
          class="filter-tab" 
          :class="{'active': selectedYear === 'all'}" 
          @click="filterByYear('all')"
        >全部</span>
        <span 
          class="filter-tab" 
          :class="{'active': selectedYear === '2025'}" 
          @click="filterByYear('2025')"
        >2025</span>
        <span 
          class="filter-tab" 
          :class="{'active': selectedYear === '2024'}" 
          @click="filterByYear('2024')"
        >2024</span>
        <span 
          class="filter-tab" 
          :class="{'active': selectedYear === '2023'}" 
          @click="filterByYear('2023')"
        >2023</span>
      </div>
      <div class="search-box">
        <div class="garrix-input-wrapper">
          <input 
            class="garrix-input"
            placeholder="搜索专辑..." 
            v-model="searchQuery"
          />
          <div class="garrix-input-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </div>
        </div>
      </div>
    </div>

    <!-- 专辑网格 -->
    <div class="album-grid" :class="{'is-loading': loading}">
      <div class="garrix-loading-overlay" v-if="loading">
        <div class="garrix-loading-spinner">
          <div class="spinner-line"></div>
          <div class="spinner-line"></div>
          <div class="spinner-line"></div>
        </div>
      </div>
      <div 
        v-for="(album, index) in filteredAlbums" 
        :key="album.id" 
        class="album-item"
        @click="handleCardClick(album.id, $event)"
      >
        <div class="album-cover">
          <div class="release-tag" v-if="album.releaseDate">
            {{ formatDateShort(album.releaseDate) }}
          </div>
          <div class="status-tag" :class="getStatusClass(album.virtualStatus || album.status)">
            {{ getStatusText(album.virtualStatus || album.status) }}
          </div>
          <img 
            :src="`${STATIC_BASE_URL}/${album.coverImage}`" 
            :alt="album.title"
            @load="onImageLoaded($event, album.id)"
          />
        </div>
        <div class="album-details">
          <h3 class="album-title">{{ album.title }}</h3>
          <p class="album-artist">{{ album.type }}</p>
          <div class="album-actions">
            <button class="garrix-text-btn" @click.stop="handleViewDetails(album.id, $event)">
              查看详情
              <span class="arrow">→</span>
            </button>
            <button class="garrix-text-btn delete-btn" @click.stop="handleDeleteAlbum(album.id, $event)">
              删除
              <span class="delete-icon">×</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div class="empty-state" v-if="!loading && filteredAlbums.length === 0">
      <h2 class="empty-title">暂无专辑</h2>
      <p class="empty-message">{{ getEmptyMessage() }}</p>
      <button class="garrix-btn" @click="$router.push('/albums/new')">创建专辑</button>
    </div>
  </div>
</template>

<script setup>
import axios from 'axios';
import { ElMessage, ElMessageBox } from 'element-plus';
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import '../assets/styles/albumsList.css';
import { API_BASE_URL, STATIC_BASE_URL } from '../config';
import { useAlbumStore } from '../stores/album';

const albumStore = useAlbumStore();
const loading = ref(false);
const router = useRouter();
const albumsContainer = ref(null);
const albumCardsRefs = reactive({});
const searchQuery = ref('');
const selectedYear = ref('all');
// 临时添加selectedAlbums以防止错误（如果需要的话）
const selectedAlbums = ref([]);

// 调试信息
console.log('Albums.vue 组件初始化', {
  albumStore: albumStore,
  albums: albumStore.albums
});

let observer = null;

// 根据年份和搜索关键词过滤专辑
const filteredAlbums = computed(() => {
  // 安全检查：确保albumStore.albums存在且是数组
  if (!albumStore.albums || !Array.isArray(albumStore.albums)) {
    return [];
  }

  // 创建一个专辑列表的副本进行筛选，避免修改原始store数据
  let albums = [...albumStore.albums];

  // 按年份筛选
  if (selectedYear.value !== 'all') {
    albums = albums.filter(album => {
      if (!album.releaseDate) return false;
      const year = new Date(album.releaseDate).getFullYear().toString();
      return year === selectedYear.value;
    });
  }

  // 按关键词搜索
  if (searchQuery.value) {
    albums = albums.filter(album =>
      album.title && album.title.toLowerCase().includes(searchQuery.value.toLowerCase())
    );
  }

  return albums;
});

// 按年份筛选专辑
const filterByYear = (year) => {
  selectedYear.value = year;
};

// 获取空状态消息
const getEmptyMessage = () => {
  if (selectedYear.value !== 'all') {
    return `${selectedYear.value}年没有专辑，请选择其他年份或创建新专辑`;
  }
  if (searchQuery.value) {
    return `没有找到包含"${searchQuery.value}"的专辑`;
  }
  return '点击下方按钮创建您的第一张专辑';
};

// 处理卡片点击
const handleCardClick = (albumId, event) => {
  router.push(`/albums/${albumId}`);
};

const handleViewDetails = (albumId, event) => {
  // 阻止事件冒泡，避免触发卡片点击事件
  event.stopPropagation();
  router.push(`/albums/${albumId}`);
};

// 处理删除专辑
const handleDeleteAlbum = async (albumId, event) => {
  event.stopPropagation();
  
  try {
    // 显示确认对话框
    await ElMessageBox.confirm(
      '确定要删除这张专辑吗？此操作不可恢复。',
      '删除专辑',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning',
        confirmButtonClass: 'el-button--danger'
      }
    );
    
    // 用户确认删除
    loading.value = true;
    
    // 直接使用axios调用删除API，不依赖store的deleteAlbum方法
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('未登录');
    }
    
    const response = await axios.delete(
      `${API_BASE_URL}/albums/${albumId}`,
      {
        headers: { 
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    if (response.data.success) {
      ElMessage.success('专辑删除成功！');
      
      // 从本地状态中移除已删除的专辑
      if (albumStore.albums) {
        albumStore.albums = albumStore.albums.filter(album => album.id !== parseInt(albumId));
      }
      
      // 刷新列表
      await albumStore.fetchUserAlbums();
    } else {
      throw new Error(response.data.message || '删除专辑失败');
    }
  } catch (error) {
    if (error === 'cancel') {
      // 用户取消删除，不做任何操作
      return;
    }
    console.error('删除专辑失败:', error);
    ElMessage.error(typeof error === 'string' ? error : (error.response?.data?.message || '删除专辑失败'));
  } finally {
    loading.value = false;
  }
};

// 格式化日期 (完整格式)
const formatDate = (date) => {
  if (!date) return '未设置';
  return new Date(date).toLocaleDateString('zh-CN');
};

// 格式化日期 (短格式: May 27, 2025)
const formatDateShort = (date) => {
  if (!date) return '';
  
  const d = new Date(date);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
};

const getStatusClass = (status) => {
  const classes = {
    draft: 'status-draft',
    pending: 'status-pending',
    approved: 'status-approved',
    rejected: 'status-rejected',
  };
  return classes[status] || 'status-draft';
};

const getStatusText = (status) => {
  const texts = {
    draft: '草稿',
    pending: '待审核',
    approved: '已通过',
    rejected: '已拒绝',
  };
  return texts[status] || status;
};

const onImageLoaded = (event, albumId) => { 
  // 添加loaded类到图片，用于CSS选择器
  event.target.classList.add('loaded');
};

const fetchAlbums = async () => {
  try {
    loading.value = true;
    await albumStore.fetchUserAlbums();
  } catch (error) {
    console.error('获取专辑列表失败:', error);
    ElMessage.error(error.toString());
  } finally {
    loading.value = false;
  }
};

const setupAlbumItemObserver = () => {
  nextTick(() => {
    if (!observer) return;

    const albumItems = document.querySelectorAll('.album-item');
    albumItems.forEach(card => {
      observer.observe(card);
    });
  });
};

onMounted(() => {
  observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  fetchAlbums().then(() => {
    setupAlbumItemObserver();
  });
});

onUnmounted(() => {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
});

watch(filteredAlbums, () => {
  if (observer) {
    observer.disconnect();
    setupAlbumItemObserver();
  }
});
</script>

<style scoped>
/* Martin Garrix风格的专辑列表样式 */
.albums-container {
  width: 100%;
  min-height: 100vh;
  background-color: #ffffff;
  color: #000000;
  position: relative;
  overflow: hidden;
  padding: 60px 5% 80px;
  font-family: 'Montserrat', 'Arial', sans-serif;
}

/* 顶部标题区域 */
.header-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 60px;
}

.main-title {
  font-size: 6rem;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: -3px;
  margin: 0;
  line-height: 0.9;
}

/* Martin Garrix 风格按钮 */
.garrix-btn {
  background: none;
  border: 2px solid #000;
  color: #000;
  font-weight: 700;
  padding: 12px 24px;
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 2px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  display: flex;
  align-items: center;
  gap: 10px;
  position: relative;
  overflow: hidden;
  z-index: 1;
}

.garrix-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 0;
  height: 100%;
  background-color: #000;
  z-index: -1;
  transition: width 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.garrix-btn:hover {
  color: #fff;
}

.garrix-btn:hover::before {
  width: 100%;
}

.garrix-text-btn {
  background: none;
  border: none;
  color: #000;
  padding: 0;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  transition: all 0.3s ease;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.garrix-text-btn .arrow {
  margin-left: 8px;
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  font-size: 1.2em;
}

.garrix-text-btn:hover .arrow {
  transform: translateX(5px);
}

.btn-icon {
  font-size: 1.2rem;
  font-weight: 700;
}

/* 筛选区域 */
.filter-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 40px;
}

.filter-tabs {
  display: flex;
  gap: 20px;
}

.filter-tab {
  font-size: 1rem;
  font-weight: 500;
  padding: 5px 0;
  cursor: pointer;
  position: relative;
  transition: all 0.3s ease;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.filter-tab:hover {
  opacity: 0.7;
}

.filter-tab.active {
  font-weight: 700;
}

.filter-tab.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 2px;
  background-color: #000;
}

.search-box {
  width: 250px;
}

/* Martin Garrix 风格输入框 */
.garrix-input-wrapper {
  position: relative;
  width: 100%;
}

.garrix-input {
  width: 100%;
  border: none;
  border-bottom: 2px solid #000;
  padding: 8px 30px 8px 0;
  font-size: 0.9rem;
  background: transparent;
  transition: all 0.3s ease;
  font-family: 'Montserrat', 'Arial', sans-serif;
  letter-spacing: 0.5px;
}

.garrix-input:focus {
  outline: none;
  border-color: #000;
}

.garrix-input::placeholder {
  color: #999;
  text-transform: uppercase;
  letter-spacing: 1px;
  font-size: 0.8rem;
}

.garrix-input-icon {
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  color: #000;
}

/* Martin Garrix 风格加载动画 */
.album-grid.is-loading {
  position: relative;
  min-height: 300px;
}

.garrix-loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(255, 255, 255, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10;
}

.garrix-loading-spinner {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 60px;
  height: 60px;
  position: relative;
}

.spinner-line {
  position: absolute;
  width: 100%;
  height: 100%;
  border: 2px solid transparent;
  border-top-color: #000;
  border-radius: 50%;
  animation: garrixSpin 1.2s cubic-bezier(0.16, 1, 0.3, 1) infinite;
}

.spinner-line:nth-child(1) {
  animation-delay: 0s;
}

.spinner-line:nth-child(2) {
  width: 75%;
  height: 75%;
  animation-delay: 0.2s;
}

.spinner-line:nth-child(3) {
  width: 50%;
  height: 50%;
  animation-delay: 0.4s;
}

@keyframes garrixSpin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

/* 专辑网格 */
.album-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 40px;
  margin-bottom: 60px;
}

.album-item {
  opacity: 0;
  transform: translateY(30px);
  transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
  cursor: pointer;
}

.album-item.visible {
  opacity: 1;
  transform: translateY(0);
}

.album-cover {
  position: relative;
  width: 100%;
  padding-top: 10%; /* 4:3 aspect ratio */
  overflow: hidden;
  margin-bottom: 12px;
}

.album-cover img {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.5s ease;
}

.album-item:hover .album-cover img {
  transform: scale(1.05);
}

.release-tag {
  position: absolute;
  top: 15px;
  left: 15px;
  background-color: rgba(0, 0, 0, 0.7);
  color: #fff;
  padding: 5px 10px;
  font-size: 0.7rem;
  font-weight: 600;
  z-index: 2;
  text-transform: uppercase;
}

.status-tag {
  position: absolute;
  top: 15px;
  right: 15px;
  padding: 5px 10px;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  z-index: 2;
  background-color: #000;
  color: #fff;
}

.status-draft {
  background-color: #333;
}

.status-pending {
  background-color: #ff9800;
  color: #000;
}

.status-approved {
  background-color: #4caf50;
}

.status-rejected {
  background-color: #f44336;
}

.album-details {
  padding: 0 5px;
}

.album-title {
  font-size: 1.2rem;
  font-weight: 800;
  margin: 0 0 4px;
  text-transform: uppercase;
  letter-spacing: -0.5px;
  line-height: 1.2;
}

.album-artist {
  font-size: 0.8rem;
  color: #666;
  margin: 0 0 10px;
}

.album-actions {
  display: flex;
  gap: 10px;
  margin-top: 10px;
}

.delete-btn {
  color: #f44336; /* Red color for delete button */
  font-weight: 700;
  padding: 5px 10px;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  border: 1px solid #f44336;
  border-radius: 5px;
  transition: all 0.3s ease;
}

.delete-btn:hover {
  background-color: #f44336;
  color: #fff;
}

.delete-icon {
  margin-left: 5px;
  font-size: 0.9em;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  padding: 60px 20px;
  text-align: center;
}

.empty-icon {
  margin-bottom: 30px;
  color: #000;
  opacity: 0.2;
  transform: scale(2);
}

.empty-title {
  font-size: 2.5rem;
  font-weight: 900;
  text-transform: uppercase;
  margin: 0 0 15px;
  letter-spacing: -1px;
}

.empty-message {
  font-size: 1.1rem;
  color: #666;
  margin-bottom: 30px;
  max-width: 400px;
}

/* 响应式调整 */
@media (max-width: 1200px) {
  .main-title {
    font-size: 5rem;
  }
  
  .album-grid {
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  }
}

@media (max-width: 768px) {
  .albums-container {
    padding: 40px 20px 60px;
  }
  
  .header-section {
    flex-direction: column;
    align-items: flex-start;
    gap: 20px;
    margin-bottom: 40px;
  }
  
  .main-title {
    font-size: 3.5rem;
  }
  
  .filter-section {
    flex-direction: column;
    align-items: flex-start;
    gap: 20px;
  }
  
  .search-box {
    width: 100%;
  }
  
  .album-grid {
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 20px;
  }
}

@media (max-width: 480px) {
  .main-title {
    font-size: 2.5rem;
  }
  
  .album-grid {
    grid-template-columns: 1fr;
  }
}
</style>
