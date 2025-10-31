<template>
  <!-- 主页Header -->
  <MainHeader />
  
  <div class="labels-container">
    <div class="labels-inner">
    <!-- 顶部标题区域 -->
    <div class="header-section">
      <h1 class="main-title">厂牌</h1>
      <div class="header-subtitle">
        <p>发现优质的电子音乐厂牌</p>
      </div>
    </div>

    <!-- 筛选区域 -->
    <div class="filter-section">
      <div class="filter-tabs">
        <span 
          class="filter-tab" 
          :class="{'active': selectedStatus === 'all'}" 
          @click="filterByStatus('all')"
        >全部</span>
        <span 
          class="filter-tab" 
          :class="{'active': selectedStatus === 'approved'}" 
          @click="filterByStatus('approved')"
        >已认证</span>
        <span 
          class="filter-tab" 
          :class="{'active': selectedStatus === 'pending'}" 
          @click="filterByStatus('pending')"
        >待审核</span>
        <span 
          class="filter-tab" 
          :class="{'active': selectedStatus === 'featured'}" 
          @click="filterByStatus('featured')"
        >精选</span>
      </div>
      <div class="search-box">
        <div class="garrix-input-wrapper">
          <input 
            class="garrix-input"
            placeholder="搜索厂牌..." 
            v-model="searchQuery"
          />
          <div class="garrix-input-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
          </div>
        </div>
      </div>
    </div>

    <!-- 厂牌网格 -->
    <div class="label-grid" :class="{'is-loading': loading}">
      <div class="garrix-loading-overlay" v-if="loading">
        <div class="garrix-loading-spinner">
          <div class="spinner-line"></div>
          <div class="spinner-line"></div>
          <div class="spinner-line"></div>
        </div>
      </div>
      <div 
        v-for="(label, index) in filteredLabels" 
        :key="label.id" 
        class="label-item"
        @click="handleCardClick(label.id, $event)"
      >
        <div class="label-cover">
          <div class="status-tag" :class="getStatusClass(label.status)">
            {{ getStatusText(label.status) }}
          </div>
          <img
            :src="label.logoUrl || '/placeholder-label.png'"
            :alt="label.chineseName"
            @load="onImageLoaded($event, label.id)"
            @error="handleImageError"
          />
        </div>
        <div class="label-details">
          <h3 class="label-title">{{ label.chineseName }}</h3>
          <p class="label-subtitle">{{ label.englishName }}</p>

        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-if="!loading && filteredLabels.length === 0" class="empty-state">
      <div class="empty-icon">🏷️</div>
      <h3>暂无厂牌</h3>
      <p class="empty-message">当前筛选条件下没有找到相关厂牌</p>
    </div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import MainHeader from '../components/MainHeader.vue'

const router = useRouter()

// 响应式数据
const loading = ref(true)
const searchQuery = ref('')
const selectedStatus = ref('all')
const labels = ref([])

let observer = null

// 根据状态和搜索关键词过滤厂牌
const filteredLabels = computed(() => {
  let filteredList = [...labels.value]

  // 按状态筛选
  if (selectedStatus.value !== 'all') {
    filteredList = filteredList.filter(label => {
      if (selectedStatus.value === 'featured') {
        return label.isFeatured || label.status === 'approved'
      }
      return label.status === selectedStatus.value
    })
  }

  // 按关键词搜索
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filteredList = filteredList.filter(label =>
      (label.chineseName && label.chineseName.toLowerCase().includes(query)) ||
      (label.englishName && label.englishName.toLowerCase().includes(query)) ||
      (label.description && label.description.toLowerCase().includes(query))
    )
  }

  return filteredList
})

// 按状态筛选厂牌
const filterByStatus = (status) => {
  selectedStatus.value = status
}

// 获取状态样式类
const getStatusClass = (status) => {
  const statusMap = {
    'approved': 'approved',
    'pending': 'pending',
    'rejected': 'rejected',
    'draft': 'draft'
  }
  return statusMap[status] || 'unknown'
}

// 获取状态文本
const getStatusText = (status) => {
  const statusMap = {
    'approved': '已认证',
    'pending': '待审核',
    'rejected': '已拒绝',
    'draft': '草稿'
  }
  return statusMap[status] || '未知'
}

// 处理卡片点击
const handleCardClick = (labelId, event) => {
  console.log('点击厂牌卡片:', labelId)
  // 这里可以添加路由跳转到厂牌详情页
  // router.push(`/labels/${labelId}`)
}



// 图片加载完成
const onImageLoaded = (event, labelId) => {
  event.target.style.opacity = '1'
}

// 图片加载错误
const handleImageError = (event) => {
  // 使用一个简单的占位符
  event.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDMwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjRjVGNUY1Ii8+CjxwYXRoIGQ9Ik0xNTAgMTAwQzEyNy45MSAxMDAgMTEwIDExNy45MSAxMTAgMTQwQzExMCAxNjIuMDkgMTI3LjkxIDE4MCAxNTAgMTgwQzE3Mi4wOSAxODAgMTkwIDE2Mi4wOSAxOTAgMTQwQzE5MCAxMTcuOTEgMTcyLjA5IDEwMCAxNTAgMTAwWiIgZmlsbD0iI0NDQ0NDQyIvPgo8cGF0aCBkPSJNMTUwIDEyMEMxMzkuNTQgMTIwIDEzMCAxMjkuNTQgMTMwIDE0MEMxMzAgMTUwLjQ2IDEzOS41NCAxNjAgMTUwIDE2MEMxNjAuNDYgMTYwIDE3MCAxNTAuNDYgMTcwIDE0MEMxNzAgMTI5LjU0IDE2MC40NiAxMjAgMTUwIDEyMFoiIGZpbGw9IiNGRkZGRkYiLz4KPC9zdmc+'
}

// 模拟获取厂牌数据
const fetchLabels = async () => {
  try {
    loading.value = true
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // 模拟数据
    labels.value = [
      {
        id: 1,
        chineseName: 'STMPD RCRDS',
        englishName: 'STMPD RCRDS',
        description: 'Martin Garrix创立的电子音乐厂牌，专注于Progressive House和Future Bass',
        logoUrl: 'https://via.placeholder.com/300x300/000000/FFFFFF?text=STMPD',
        status: 'approved',
        foundedYear: 2016,
        location: '荷兰阿姆斯特丹',
        isFeatured: true
      },
      {
        id: 2,
        chineseName: 'Spinnin\' Records',
        englishName: 'Spinnin\' Records',
        description: '世界知名的电子音乐厂牌，发行过众多经典作品',
        logoUrl: 'https://via.placeholder.com/300x300/FF6B35/FFFFFF?text=Spinnin',
        status: 'approved',
        foundedYear: 1999,
        location: '荷兰希尔弗瑟姆',
        isFeatured: true
      },
      {
        id: 3,
        chineseName: 'Monstercat',
        englishName: 'Monstercat',
        description: '独立电子音乐厂牌，以多样化的音乐风格著称',
        logoUrl: 'https://via.placeholder.com/300x300/00D4AA/FFFFFF?text=Monstercat',
        status: 'approved',
        foundedYear: 2011,
        location: '加拿大温哥华'
      },
      {
        id: 4,
        chineseName: '新兴厂牌',
        englishName: 'New Label',
        description: '正在审核中的新兴电子音乐厂牌',
        logoUrl: 'https://via.placeholder.com/300x300/6C5CE7/FFFFFF?text=New',
        status: 'pending',
        foundedYear: 2024,
        location: '中国上海'
      }
    ]
  } catch (error) {
    console.error('获取厂牌列表失败:', error)
  } finally {
    loading.value = false
  }
}

const setupLabelItemObserver = () => {
  nextTick(() => {
    if (!observer) return

    const labelItems = document.querySelectorAll('.label-item')
    labelItems.forEach(card => {
      observer.observe(card)
    })
  })
}

onMounted(() => {
  observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible')
        observer.unobserve(entry.target)
      }
    })
  }, { threshold: 0.1 })

  fetchLabels().then(() => {
    setupLabelItemObserver()
  })
})

onUnmounted(() => {
  if (observer) {
    observer.disconnect()
    observer = null
  }
})

watch(filteredLabels, () => {
  if (observer) {
    observer.disconnect()
    setupLabelItemObserver()
  }
})
</script>

<style scoped>
/* Martin Garrix风格的厂牌列表样式 */
.labels-container {
  width: 100%;
  min-height: 100vh;
  background-color: #ffffff;
  color: #000000;
  position: relative;
  overflow: hidden;
  padding: 150px 0 80px; /* 顶部留出Header空间 */
  font-family: 'Montserrat', 'Arial', sans-serif;
}

/* 居中内容容器 */
.labels-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
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

.header-subtitle p {
  font-size: 1.2rem;
  color: #666;
  margin: 0;
  font-weight: 400;
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
  color: #000;
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
  font-weight: 500;
  background-color: transparent;
  transition: all 0.3s ease;
  outline: none;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.garrix-input:focus {
  border-bottom-color: #000;
}

.garrix-input::placeholder {
  color: #999;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.garrix-input-icon {
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 20px;
  height: 20px;
  color: #000;
}

/* 加载状态 */
.garrix-loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

.garrix-loading-spinner {
  position: relative;
  width: 60px;
  height: 60px;
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

/* 厂牌网格 - Garrix直角风格 */
.label-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 40px;
  margin-bottom: 60px;
  position: relative;
}

.label-item {
  opacity: 0;
  transform: translateY(30px);
  transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
  cursor: pointer;
  background: none;
}

.label-item.visible {
  opacity: 1;
  transform: translateY(0);
}

.label-cover {
  position: relative;
  width: 100%;
  padding-top: 75%; /* 4:3 aspect ratio */
  overflow: hidden;
  margin-bottom: 12px;
  background-color: #f5f5f5;
}

.label-cover img {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.5s ease;
  opacity: 0;
}

.label-item:hover .label-cover img {
  transform: scale(1.05);
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

.status-tag.approved {
  background-color: #4caf50;
  color: #fff;
}

.status-tag.pending {
  background-color: #ff9800;
  color: #000;
}

.status-tag.rejected {
  background-color: #f44336;
  color: #fff;
}

.status-tag.draft {
  background-color: #333;
  color: #fff;
}

.label-details {
  padding: 0 5px;
}

.label-title {
  font-size: 1.2rem;
  font-weight: 800;
  margin: 0 0 4px;
  text-transform: uppercase;
  letter-spacing: -0.5px;
  line-height: 1.2;
  color: #000;
}

.label-subtitle {
  font-size: 0.8rem;
  color: #666;
  margin: 0;
  font-weight: 500;
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 80px 20px;
  color: #666;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 20px;
  opacity: 0.5;
}

.empty-state h3 {
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0 0 10px 0;
  color: #333;
}

.empty-message {
  font-size: 1.1rem;
  color: #666;
  margin-bottom: 30px;
  max-width: 400px;
  margin-left: auto;
  margin-right: auto;
}

/* 响应式调整 */
@media (max-width: 1200px) {
  .main-title {
    font-size: 5rem;
  }

  .label-grid {
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  }
}

@media (max-width: 768px) {
  .labels-container {
    padding: 120px 0 60px;
  }

  .labels-inner {
    padding: 0 20px;
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

  .filter-tabs {
    flex-wrap: wrap;
    gap: 15px;
  }

  .filter-tab {
    font-size: 0.9rem;
  }

  .search-box {
    width: 100%;
    min-width: auto;
  }

  .label-grid {
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 20px;
  }

  .label-details {
    padding: 0 3px;
  }

  .label-title {
    font-size: 1.1rem;
  }
}

@media (max-width: 480px) {
  .main-title {
    font-size: 2.5rem;
  }

  .label-grid {
    grid-template-columns: 1fr;
    gap: 15px;
  }

  .filter-tabs {
    justify-content: center;
  }
}
</style>
