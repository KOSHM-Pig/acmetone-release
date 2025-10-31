<template>
  <div class="music-list-page">
    <div class="container">
      <div class="page-header">
        <h1 class="page-title">音乐评分</h1>
        <p class="page-subtitle">发现和评价最新的电子音乐作品</p>
      </div>
      
      <div class="music-filters">
        <div class="search-bar">
          <el-input
            v-model="searchQuery"
            placeholder="搜索歌曲或艺术家..."
            class="search-input"
            @keyup.enter="handleSearch"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </div>
        
        <div class="genre-filter">
          <el-select v-model="selectedGenre" placeholder="流派筛选" class="genre-select">
            <el-option
              v-for="genre in genres"
              :key="genre.value"
              :label="genre.label"
              :value="genre.value"
            />
          </el-select>
        </div>
        
        <div class="sort-filter">
          <el-select v-model="sortBy" placeholder="排序方式" class="sort-select">
            <el-option label="最新发布" value="newest" />
            <el-option label="最高评分" value="rating" />
            <el-option label="最多评论" value="comments" />
          </el-select>
        </div>
      </div>
      
      <div v-if="loading" class="loading-container">
        <el-skeleton :rows="5" animated />
      </div>
      
      <div v-else class="tracks-list">
        <div v-for="track in tracks" :key="track.id" class="track-item">
          <div class="track-artwork">
            <img :src="track.artwork" :alt="track.title" class="track-cover">
            <div class="play-overlay" @click="playTrack(track)">
              <el-icon><VideoPlay /></el-icon>
            </div>
          </div>
          
          <div class="track-info">
            <h3 class="track-title">{{ track.title }}</h3>
            <p class="track-artist">{{ track.artist }}</p>
            
            <div class="track-meta">
              <span class="track-genre">{{ track.genre }}</span>
              <span class="track-release-date">{{ formatDate(track.releaseDate) }}</span>
            </div>
            
            <div class="track-stats">
              <div class="track-rating">
                <span class="rating-label">用户评分:</span>
                <el-rate
                  v-model="track.rating"
                  disabled
                  allow-half
                  text-color="#ff9900"
                  score-template="{value}"
                />
                <span class="rating-value">{{ track.rating.toFixed(1) }}</span>
                <span class="rating-count">({{ track.ratingCount }})</span>
              </div>
              
              <div class="track-plays">
                <el-icon><View /></el-icon>
                <span>{{ formatNumber(track.playCount) }}</span>
              </div>
              
              <div class="track-comments">
                <el-icon><ChatLineRound /></el-icon>
                <span>{{ track.commentCount }}</span>
              </div>
            </div>
          </div>
          
          <div class="track-actions">
            <el-button type="primary" class="rate-button" @click="openRatingDialog(track)">
              评分
            </el-button>
            
            <el-button class="comment-button" @click="goToTrackDetail(track.id)">
              评论
            </el-button>
          </div>
        </div>
      </div>
      
      <div class="tracks-pagination">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 30, 50]"
          layout="total, sizes, prev, pager, next, jumper"
          :total="totalTracks"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </div>
    
    <!-- 评分对话框 -->
    <el-dialog
      v-model="ratingDialogVisible"
      title="评分与评论"
      width="500px"
      :show-close="true"
      center
    >
      <div v-if="selectedTrack" class="rating-dialog-content">
        <div class="rating-track-info">
          <img :src="selectedTrack.artwork" :alt="selectedTrack.title" class="rating-track-cover">
          <div class="rating-track-details">
            <h3 class="rating-track-title">{{ selectedTrack.title }}</h3>
            <p class="rating-track-artist">{{ selectedTrack.artist }}</p>
          </div>
        </div>
        
        <div class="rating-form">
          <div class="rating-stars">
            <p class="rating-label">你的评分:</p>
            <el-rate
              v-model="userRating"
              allow-half
              text-color="#ff9900"
              score-template="{value}"
            />
          </div>
          
          <div class="rating-comment">
            <p class="comment-label">你的评论:</p>
            <el-input
              v-model="userComment"
              type="textarea"
              :rows="4"
              placeholder="分享你对这首歌的想法..."
              maxlength="500"
              show-word-limit
            />
          </div>
        </div>
      </div>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="ratingDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitRating">提交</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Search, VideoPlay, View, ChatLineRound } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const router = useRouter()

// 模拟数据 - 流派
const genres = [
  { label: '全部流派', value: '' },
  { label: 'House', value: 'house' },
  { label: 'Techno', value: 'techno' },
  { label: 'Trance', value: 'trance' },
  { label: 'Drum & Bass', value: 'dnb' },
  { label: 'Dubstep', value: 'dubstep' },
  { label: 'Future Bass', value: 'future-bass' },
  { label: 'Progressive', value: 'progressive' }
]

// 模拟数据 - 歌曲
const mockTracks = [
  {
    id: 1,
    title: 'Blinding Lights (Martin Garrix Remix)',
    artist: 'The Weeknd, Martin Garrix',
    artwork: 'https://i.scdn.co/image/ab67616d0000b27341e31d6ea1d493dd77933ee5',
    genre: 'Future House',
    releaseDate: '2023-05-28T00:00:00Z',
    rating: 4.7,
    ratingCount: 356,
    playCount: 1245786,
    commentCount: 87,
    label: 'STMPD RCRDS'
  },
  {
    id: 2,
    title: 'Diamonds',
    artist: 'Timmy Trumpet, Cascada',
    artwork: 'https://i.scdn.co/image/ab67616d0000b273e11a94906b5e73be81e978f0',
    genre: 'Hardstyle',
    releaseDate: '2023-06-02T00:00:00Z',
    rating: 4.3,
    ratingCount: 278,
    playCount: 876543,
    commentCount: 65,
    label: 'Spinnin\' Records'
  },
  {
    id: 3,
    title: 'Find You',
    artist: 'Zedd, Matthew Koma, Miriam Bryant',
    artwork: 'https://i.scdn.co/image/ab67616d0000b2735f53c0dbe3e644b04f889593',
    genre: 'Progressive House',
    releaseDate: '2023-05-15T00:00:00Z',
    rating: 4.9,
    ratingCount: 412,
    playCount: 2345678,
    commentCount: 124,
    label: 'Interscope Records'
  },
  {
    id: 4,
    title: 'Oxygen',
    artist: 'Excision, Wooli, Trivecta',
    artwork: 'https://i.scdn.co/image/ab67616d0000b2735613b682e0a8acc8a95208db',
    genre: 'Dubstep',
    releaseDate: '2023-06-10T00:00:00Z',
    rating: 4.6,
    ratingCount: 325,
    playCount: 987654,
    commentCount: 92,
    label: 'Subsidia Records'
  },
  {
    id: 5,
    title: 'Language',
    artist: 'Porter Robinson',
    artwork: 'https://i.scdn.co/image/ab67616d0000b2735487aadd8750fd479ad477e9',
    genre: 'Progressive House',
    releaseDate: '2023-04-20T00:00:00Z',
    rating: 4.8,
    ratingCount: 532,
    playCount: 3456789,
    commentCount: 178,
    label: 'Spinnin\' Records'
  }
]

// 状态变量
const loading = ref(true)
const searchQuery = ref('')
const selectedGenre = ref('')
const sortBy = ref('newest')
const currentPage = ref(1)
const pageSize = ref(10)
const totalTracks = ref(mockTracks.length)

// 评分对话框
const ratingDialogVisible = ref(false)
const selectedTrack = ref(null)
const userRating = ref(0)
const userComment = ref('')

// 过滤和排序后的歌曲列表
const tracks = computed(() => {
  // 实际项目中这应该是通过API获取的数据
  // 这里简单模拟过滤和排序逻辑
  return mockTracks
})

// 格式化日期
const formatDate = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
}

// 格式化数字
const formatNumber = (num) => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M'
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K'
  } else {
    return num.toString()
  }
}

// 处理搜索
const handleSearch = () => {
  // 实际项目中应该调用API进行搜索
  console.log('搜索:', searchQuery.value)
  currentPage.value = 1
}

// 处理页码变化
const handleCurrentChange = (page) => {
  // 实际项目中应该调用API获取对应页面的数据
  console.log('当前页:', page)
}

// 处理每页条数变化
const handleSizeChange = (size) => {
  // 实际项目中应该调用API获取对应条数的数据
  console.log('每页条数:', size)
  currentPage.value = 1
}

// 播放歌曲
const playTrack = (track) => {
  console.log('播放歌曲:', track.title)
  // 在实际项目中应该调用音频播放器API
}

// 打开评分对话框
const openRatingDialog = (track) => {
  selectedTrack.value = track
  userRating.value = 0
  userComment.value = ''
  ratingDialogVisible.value = true
}

// 提交评分
const submitRating = () => {
  if (userRating.value === 0) {
    ElMessage.warning('请先给歌曲评分')
    return
  }
  
  // 实际项目中应该调用API提交评分和评论
  console.log('提交评分:', {
    trackId: selectedTrack.value.id,
    rating: userRating.value,
    comment: userComment.value
  })
  
  ElMessage.success('评分提交成功')
  ratingDialogVisible.value = false
}

// 跳转到歌曲详情页
const goToTrackDetail = (trackId) => {
  router.push(`/music/${trackId}`)
}

onMounted(() => {
  // 模拟加载数据
  setTimeout(() => {
    loading.value = false
  }, 1000)
})
</script>

<style lang="scss" scoped>
.music-list-page {
  padding: 60px 0;
}

.page-header {
  text-align: center;
  margin-bottom: 40px;
  
  .page-title {
    font-size: 36px;
    font-weight: 800;
    margin-bottom: 10px;
    position: relative;
    display: inline-block;
    padding-bottom: 15px;
    
    &::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 50%;
      transform: translateX(-50%);
      width: 60px;
      height: 3px;
      background-color: var(--genre-edm);
    }
  }
  
  .page-subtitle {
    color: var(--acmetone-text-secondary);
    font-size: 18px;
  }
}

.music-filters {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 30px;
  flex-wrap: wrap;
  
  .search-bar {
    flex: 1;
    min-width: 250px;
    
    .search-input {
      width: 100%;
      
      :deep(.el-input__wrapper) {
        background-color: var(--acmetone-dark-gray);
        box-shadow: none !important;
        border: 1px solid var(--acmetone-border);
        
        &:hover,
        &.is-focus {
          border-color: var(--genre-edm);
        }
      }
      
      :deep(.el-input__inner) {
        color: var(--acmetone-text);
        height: 40px;
        font-size: 14px;
      }
    }
  }
  
  .genre-filter,
  .sort-filter {
    :deep(.el-select) {
      width: 140px;
      
      .el-input__wrapper {
        background-color: var(--acmetone-dark-gray);
        box-shadow: none !important;
        border: 1px solid var(--acmetone-border);
        
        &:hover,
        &.is-focus {
          border-color: var(--genre-edm);
        }
      }
      
      .el-input__inner {
        color: var(--acmetone-text);
        height: 40px;
        font-size: 14px;
      }
    }
  }
}

.loading-container {
  padding: 20px;
}

.tracks-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-bottom: 40px;
}

.track-item {
  display: grid;
  grid-template-columns: 100px 1fr auto;
  gap: 20px;
  padding: 20px;
  background-color: var(--acmetone-dark-gray);
  border-radius: 0;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  
  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.3);
  }
}

.track-artwork {
  width: 100px;
  height: 100px;
  position: relative;
  border-radius: 0;
  overflow: hidden;
  
  .track-cover {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  
  .play-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.3s ease;
    cursor: pointer;
    
    .el-icon {
      font-size: 36px;
      color: var(--acmetone-white);
    }
    
    &:hover {
      opacity: 1;
    }
  }
}

.track-info {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.track-title {
  font-size: 20px;
  font-weight: 700;
  margin-bottom: 5px;
  color: var(--acmetone-white);
}

.track-artist {
  font-size: 16px;
  margin-bottom: 10px;
  color: var(--acmetone-text-secondary);
}

.track-meta {
  display: flex;
  gap: 15px;
  margin-bottom: 10px;
  
  .track-genre,
  .track-release-date {
    font-size: 14px;
    color: var(--acmetone-text-secondary);
  }
  
  .track-genre {
    padding: 2px 8px;
    background-color: rgba(255, 255, 255, 0.1);
    border-radius: 4px;
  }
}

.track-stats {
  display: flex;
  align-items: center;
  gap: 20px;
  
  .track-rating {
    display: flex;
    align-items: center;
    gap: 5px;
    
    .rating-label {
      font-size: 14px;
      color: var(--acmetone-text-secondary);
    }
    
    .rating-value {
      font-weight: 600;
      color: #ff9900;
    }
    
    .rating-count {
      font-size: 12px;
      color: var(--acmetone-text-secondary);
    }
  }
  
  .track-plays,
  .track-comments {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 14px;
    color: var(--acmetone-text-secondary);
  }
}

.track-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
  justify-content: center;
  
  .rate-button {
    background-color: var(--genre-edm);
    color: var(--acmetone-black);
    border: none;
    font-weight: 600;
    
    &:hover {
      background-color: var(--acmetone-white);
    }
  }
  
  .comment-button {
    background-color: transparent;
    color: var(--acmetone-text);
    border: 1px solid var(--acmetone-border);
    
    &:hover {
      border-color: var(--genre-edm);
      color: var(--genre-edm);
    }
  }
}

.tracks-pagination {
  padding: 20px 0;
  display: flex;
  justify-content: center;
  
  :deep(.el-pagination) {
    --el-pagination-bg-color: transparent;
    --el-pagination-text-color: var(--acmetone-text);
    --el-pagination-button-color: var(--acmetone-text);
    --el-pagination-hover-color: var(--genre-edm);
    
    .el-pager li {
      background-color: var(--acmetone-gray);
      
      &.is-active {
        background-color: var(--genre-edm);
        color: var(--acmetone-black);
      }
    }
    
    .btn-prev,
    .btn-next {
      background-color: var(--acmetone-gray);
    }
  }
}

/* 评分对话框样式 */
:deep(.el-dialog) {
  background-color: var(--acmetone-dark-gray);
  border-radius: 0;
  box-shadow: 0 15px 30px rgba(0, 0, 0, 0.3);
  
  .el-dialog__header {
    padding: 20px;
    border-bottom: 1px solid var(--acmetone-border);
    margin: 0;
    
    .el-dialog__title {
      color: var(--acmetone-white);
      font-weight: 700;
    }
  }
  
  .el-dialog__body {
    padding: 20px;
    color: var(--acmetone-text);
  }
  
  .el-dialog__footer {
    padding: 15px 20px;
    border-top: 1px solid var(--acmetone-border);
  }
}

.rating-dialog-content {
  .rating-track-info {
    display: flex;
    gap: 15px;
    margin-bottom: 20px;
    
    .rating-track-cover {
      width: 80px;
      height: 80px;
      object-fit: cover;
      border-radius: 0;
    }
    
    .rating-track-details {
      display: flex;
      flex-direction: column;
      justify-content: center;
      
      .rating-track-title {
        font-size: 18px;
        font-weight: 700;
        margin-bottom: 5px;
        color: var(--acmetone-white);
      }
      
      .rating-track-artist {
        font-size: 14px;
        color: var(--acmetone-text-secondary);
      }
    }
  }
  
  .rating-form {
    .rating-stars {
      margin-bottom: 20px;
      
      .rating-label {
        margin-bottom: 10px;
        font-weight: 600;
      }
    }
    
    .rating-comment {
      .comment-label {
        margin-bottom: 10px;
        font-weight: 600;
      }
      
      :deep(.el-textarea__inner) {
        background-color: var(--acmetone-gray);
        border: 1px solid var(--acmetone-border);
        color: var(--acmetone-text);
        
        &:focus {
          border-color: var(--genre-edm);
        }
      }
    }
  }
}

/* 响应式设计 */
@media (max-width: $breakpoint-lg) {
  .music-filters {
    .search-bar {
      width: 100%;
      flex: auto;
    }
  }
}

@media (max-width: $breakpoint-md) {
  .track-item {
    grid-template-columns: 80px 1fr;
    
    .track-actions {
      grid-column: 1 / -1;
      grid-row: 2;
      flex-direction: row;
      
      .rate-button,
      .comment-button {
        flex: 1;
      }
    }
  }
  
  .track-artwork {
    width: 80px;
    height: 80px;
  }
}

@media (max-width: $breakpoint-sm) {
  .page-header {
    .page-title {
      font-size: 28px;
    }
    
    .page-subtitle {
      font-size: 16px;
    }
  }
  
  .track-stats {
    flex-wrap: wrap;
    gap: 10px;
  }
}
</style> 