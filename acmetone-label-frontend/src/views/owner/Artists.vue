<template>
  <div class="artists-page">
    <LabelHeader :userRole="userRole" />
    
    <div class="page-container">
      <!-- 页面标题和操作栏 -->
      <div class="page-header">
        <div class="header-content">
          <div class="title-section">
            <h1 class="page-title">艺人管理</h1>
            <p class="page-subtitle">Artists Management</p>
          </div>
          <div class="header-actions">
            <el-button type="primary" @click="showInviteDialog = true">
              <el-icon><UserFilled /></el-icon>
              邀请艺人
            </el-button>
            <el-button @click="refreshArtists">
              <el-icon><Refresh /></el-icon>
              刷新
            </el-button>
          </div>
        </div>
      </div>

      <!-- 统计卡片 -->
      <div class="stats-section">
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon">
              <el-icon><User /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-number">{{ stats.active }}</div>
              <div class="stat-label">活跃艺人</div>
              <div class="stat-sublabel">Active Artists</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">
              <el-icon><Clock /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-number">{{ stats.pending }}</div>
              <div class="stat-label">待确认</div>
              <div class="stat-sublabel">Pending</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">
              <el-icon><Headset /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-number">{{ stats.releases }}</div>
              <div class="stat-label">总发行</div>
              <div class="stat-sublabel">Total Releases</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">
              <el-icon><TrendCharts /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-number">{{ stats.total }}</div>
              <div class="stat-label">总艺人</div>
              <div class="stat-sublabel">Total Artists</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 筛选和视图控制 -->
      <div class="filter-section">
        <div class="filter-controls">
          <div class="filter-group">
            <label>状态筛选</label>
            <el-select v-model="filters.status" placeholder="选择状态" clearable>
              <el-option label="全部" value="" />
              <el-option label="活跃" value="active" />
              <el-option label="待确认" value="pending" />
              <el-option label="已暂停" value="inactive" />
            </el-select>
          </div>
          <div class="filter-group">
            <label>音乐类型</label>
            <el-select v-model="filters.genre" placeholder="选择类型" clearable>
              <el-option label="全部" value="" />
              <el-option label="Electronic" value="electronic" />
              <el-option label="Pop" value="pop" />
              <el-option label="Rock" value="rock" />
              <el-option label="Hip-Hop" value="hiphop" />
            </el-select>
          </div>
          <div class="filter-group">
            <el-input
              v-model="filters.search"
              placeholder="搜索艺人名称"
              @keyup.enter="applyFilters"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
          </div>
        </div>
        
        <div class="view-controls">
          <el-radio-group v-model="viewMode" size="small">
            <el-radio-button label="grid">
              <el-icon><Grid /></el-icon>
              网格视图
            </el-radio-button>
            <el-radio-button label="list">
              <el-icon><List /></el-icon>
              列表视图
            </el-radio-button>
          </el-radio-group>
        </div>
      </div>

      <!-- 艺人列表 -->
      <div class="artists-list">
        <!-- 网格视图 -->
        <div v-if="viewMode === 'grid'" class="grid-view">
          <div
            v-for="artist in filteredArtists"
            :key="artist.id"
            class="artist-card"
            @click="openArtistDetail(artist)"
          >
            <div class="card-header">
              <div class="artist-avatar">
                <img :src="artist.avatar || '/images/default-avatar.jpg'" :alt="artist.name" />
                <div class="status-indicator" :class="artist.status"></div>
              </div>
              <div class="card-actions">
                <el-dropdown trigger="click" @click.stop>
                  <el-button circle size="small">
                    <el-icon><MoreFilled /></el-icon>
                  </el-button>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item @click="contactArtist(artist)">
                        <el-icon><Message /></el-icon>
                        发送消息
                      </el-dropdown-item>
                      <el-dropdown-item @click="viewContracts(artist)">
                        <el-icon><Document /></el-icon>
                        查看合约
                      </el-dropdown-item>
                      <el-dropdown-item @click="viewReleases(artist)">
                        <el-icon><Headset /></el-icon>
                        查看发行
                      </el-dropdown-item>
                      <el-dropdown-item @click="editArtist(artist)" divided>
                        <el-icon><Edit /></el-icon>
                        编辑信息
                      </el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </div>
            </div>
            
            <div class="card-content">
              <h3 class="artist-name">{{ artist.name }}</h3>
              <p class="artist-genre">{{ artist.genre }}</p>
              
              <div class="artist-stats">
                <div class="stat-item">
                  <span class="stat-value">{{ artist.releaseCount }}</span>
                  <span class="stat-label">发行</span>
                </div>
                <div class="stat-item">
                  <span class="stat-value">{{ artist.submissionCount }}</span>
                  <span class="stat-label">投稿</span>
                </div>
                <div class="stat-item">
                  <span class="stat-value">{{ formatNumber(artist.streams) }}</span>
                  <span class="stat-label">播放</span>
                </div>
              </div>
              
              <div class="platform-links">
                <div class="platforms-title">音乐平台</div>
                <div class="platform-icons">
                  <a v-if="artist.platforms.spotify" :href="artist.platforms.spotify" target="_blank" class="platform-link spotify">
                    <span>SP</span>
                  </a>
                  <a v-if="artist.platforms.appleMusic" :href="artist.platforms.appleMusic" target="_blank" class="platform-link apple">
                    <span>AM</span>
                  </a>
                  <a v-if="artist.platforms.soundcloud" :href="artist.platforms.soundcloud" target="_blank" class="platform-link soundcloud">
                    <span>SC</span>
                  </a>
                  <a v-if="artist.platforms.youtube" :href="artist.platforms.youtube" target="_blank" class="platform-link youtube">
                    <span>YT</span>
                  </a>
                </div>
              </div>
              
              <div class="join-date">
                加入时间: {{ formatDate(artist.joinDate) }}
              </div>
            </div>
          </div>
        </div>

        <!-- 列表视图 -->
        <div v-if="viewMode === 'list'" class="list-view">
          <el-table :data="filteredArtists" @row-click="openArtistDetail">
            <el-table-column width="80">
              <template #default="{ row }">
                <div class="table-avatar">
                  <img :src="row.avatar || '/images/default-avatar.jpg'" :alt="row.name" />
                  <div class="status-indicator" :class="row.status"></div>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="name" label="艺人名称" min-width="150" />
            <el-table-column prop="genre" label="音乐类型" width="120" />
            <el-table-column label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="getStatusType(row.status)">
                  {{ getStatusText(row.status) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="releaseCount" label="发行数" width="80" />
            <el-table-column prop="submissionCount" label="投稿数" width="80" />
            <el-table-column label="播放量" width="100">
              <template #default="{ row }">
                {{ formatNumber(row.streams) }}
              </template>
            </el-table-column>
            <el-table-column label="音乐平台" width="120">
              <template #default="{ row }">
                <div class="table-platforms">
                  <span v-if="row.platforms.spotify" class="platform-tag">SP</span>
                  <span v-if="row.platforms.appleMusic" class="platform-tag">AM</span>
                  <span v-if="row.platforms.soundcloud" class="platform-tag">SC</span>
                  <span v-if="row.platforms.youtube" class="platform-tag">YT</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="joinDate" label="加入时间" width="120">
              <template #default="{ row }">
                {{ formatDate(row.joinDate) }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="200" fixed="right">
              <template #default="{ row }">
                <el-button size="small" @click.stop="contactArtist(row)">
                  <el-icon><Message /></el-icon>
                  联系
                </el-button>
                <el-dropdown @click.stop trigger="click">
                  <el-button size="small">
                    <el-icon><MoreFilled /></el-icon>
                  </el-button>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item @click="viewContracts(row)">
                        <el-icon><Document /></el-icon>
                        查看合约
                      </el-dropdown-item>
                      <el-dropdown-item @click="viewReleases(row)">
                        <el-icon><Headset /></el-icon>
                        查看发行
                      </el-dropdown-item>
                      <el-dropdown-item @click="editArtist(row)" divided>
                        <el-icon><Edit /></el-icon>
                        编辑信息
                      </el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <!-- 分页 -->
        <div class="pagination-section">
          <el-pagination
            v-model:current-page="currentPage"
            v-model:page-size="pageSize"
            :page-sizes="[12, 24, 48, 96]"
            :total="totalArtists"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange"
          />
        </div>
      </div>
    </div>

    <!-- 邀请艺人对话框 -->
    <el-dialog v-model="showInviteDialog" title="邀请艺人" width="600px">
      <ArtistInviteForm @success="handleInviteSuccess" @cancel="showInviteDialog = false" />
    </el-dialog>

    <!-- 编辑艺人对话框 -->
    <el-dialog v-model="showEditDialog" title="编辑艺人信息" width="700px">
      <ArtistEditForm 
        :artist="currentArtist" 
        @success="handleEditSuccess" 
        @cancel="showEditDialog = false" 
      />
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { UserFilled, Refresh, Search, Grid, List, User, Clock, Headset, TrendCharts, MoreFilled, Message, Document, Edit } from '@element-plus/icons-vue'
import LabelHeader from '@/components/LabelHeader.vue'
import ArtistInviteForm from '@/components/forms/ArtistInviteForm.vue'
import ArtistEditForm from '@/components/forms/ArtistEditForm.vue'

// Props
const userRole = ref('主理人')

// 数据状态
const artists = ref([])
const loading = ref(false)
const showInviteDialog = ref(false)
const showEditDialog = ref(false)
const currentArtist = ref(null)

// 筛选和排序
const filters = ref({
  status: '',
  genre: '',
  search: ''
})

const viewMode = ref('grid')

// 分页
const currentPage = ref(1)
const pageSize = ref(24)
const totalArtists = ref(0)

// 统计数据
const stats = ref({
  active: 18,
  pending: 3,
  releases: 42,
  total: 21
})

// 模拟数据
const mockArtists = ref([
  {
    id: 1,
    name: 'DJ Alex',
    genre: 'Electronic',
    status: 'active',
    releaseCount: 8,
    submissionCount: 15,
    streams: 1250000,
    joinDate: '2023-06-15',
    avatar: null,
    platforms: {
      spotify: 'https://open.spotify.com/artist/123',
      appleMusic: 'https://music.apple.com/artist/123',
      soundcloud: 'https://soundcloud.com/djalex',
      youtube: 'https://youtube.com/@djalex'
    }
  },
  {
    id: 2,
    name: 'Sarah Chen',
    genre: 'Pop',
    status: 'active',
    releaseCount: 5,
    submissionCount: 12,
    streams: 890000,
    joinDate: '2023-08-20',
    avatar: null,
    platforms: {
      spotify: 'https://open.spotify.com/artist/456',
      appleMusic: 'https://music.apple.com/artist/456',
      soundcloud: null,
      youtube: 'https://youtube.com/@sarahchen'
    }
  },
  {
    id: 3,
    name: 'Beat Master',
    genre: 'Hip-Hop',
    status: 'pending',
    releaseCount: 0,
    submissionCount: 3,
    streams: 0,
    joinDate: '2024-01-10',
    avatar: null,
    platforms: {
      spotify: null,
      appleMusic: null,
      soundcloud: 'https://soundcloud.com/beatmaster',
      youtube: null
    }
  }
])

// 计算属性
const filteredArtists = computed(() => {
  let result = [...mockArtists.value]
  
  // 状态筛选
  if (filters.value.status) {
    result = result.filter(a => a.status === filters.value.status)
  }
  
  // 类型筛选
  if (filters.value.genre) {
    result = result.filter(a => a.genre === filters.value.genre)
  }
  
  // 搜索筛选
  if (filters.value.search) {
    const search = filters.value.search.toLowerCase()
    result = result.filter(a => 
      a.name.toLowerCase().includes(search)
    )
  }
  
  return result
})

// 方法
const refreshArtists = () => {
  loading.value = true
  setTimeout(() => {
    loading.value = false
    ElMessage.success('数据已刷新')
  }, 1000)
}

const applyFilters = () => {
  currentPage.value = 1
}

const openArtistDetail = (artist) => {
  console.log('Open artist detail:', artist)
}

const contactArtist = (artist) => {
  ElMessage.info(`正在联系艺人: ${artist.name}`)
}

const viewContracts = (artist) => {
  console.log('View contracts for:', artist)
}

const viewReleases = (artist) => {
  console.log('View releases for:', artist)
}

const editArtist = (artist) => {
  currentArtist.value = artist
  showEditDialog.value = true
}

const getStatusText = (status) => {
  const statusMap = {
    active: '活跃',
    pending: '待确认',
    inactive: '已暂停'
  }
  return statusMap[status] || status
}

const getStatusType = (status) => {
  const typeMap = {
    active: 'success',
    pending: 'warning',
    inactive: 'info'
  }
  return typeMap[status] || 'info'
}

const formatDate = (date) => {
  return new Date(date).toLocaleDateString('zh-CN')
}

const formatNumber = (num) => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M'
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K'
  }
  return num.toString()
}

const handleSizeChange = (size) => {
  pageSize.value = size
  currentPage.value = 1
}

const handleCurrentChange = (page) => {
  currentPage.value = page
}

const handleInviteSuccess = () => {
  showInviteDialog.value = false
  refreshArtists()
  ElMessage.success('邀请已发送')
}

const handleEditSuccess = () => {
  showEditDialog.value = false
  refreshArtists()
  ElMessage.success('艺人信息已更新')
}

onMounted(() => {
  artists.value = mockArtists.value
  totalArtists.value = mockArtists.value.length
})
</script>

<style scoped>
/* Martin Garrix 黑白设计语言 - 艺人管理页面 */
.artists-page {
  min-height: 100vh;
  background: #ffffff;
  color: #000000;
  font-family: 'Montserrat', 'Arial', sans-serif;
}

.page-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 40px 20px;
}

/* 页面标题 - Martin Garrix 风格 */
.page-header {
  background: #ffffff;
  border: 1px solid #000000;
  padding: 40px;
  margin-bottom: 40px;
  transition: all 0.3s ease;
}

.page-header:hover {
  transform: translateY(-2px);
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.page-title {
  font-size: 4rem;
  font-weight: 900;
  color: #000000;
  margin: 0 0 8px 0;
  text-transform: uppercase;
  letter-spacing: -2px;
  line-height: 0.9;
}

.page-subtitle {
  font-size: 1.1rem;
  color: #666666;
  margin: 0;
  font-weight: 400;
  letter-spacing: 1px;
}

.header-actions {
  display: flex;
  gap: 16px;
}

/* 统计卡片 - Martin Garrix 风格 */
.stats-section {
  margin-bottom: 40px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
}

.stat-card {
  background: #ffffff;
  border: 1px solid #000000;
  padding: 40px 30px;
  display: flex;
  align-items: center;
  gap: 20px;
  transition: all 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-4px);
  background: #000000;
  color: #ffffff;
}

.stat-icon {
  width: 60px;
  height: 60px;
  background: #000000;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  color: #ffffff;
  transition: all 0.3s ease;
}

.stat-card:hover .stat-icon {
  background: #ffffff;
  color: #000000;
}

.stat-content {
  flex: 1;
}

.stat-number {
  font-size: 2.5rem;
  font-weight: 900;
  color: inherit;
  margin-bottom: 8px;
  line-height: 1;
}

.stat-label {
  font-size: 1rem;
  font-weight: 700;
  color: inherit;
  margin-bottom: 4px;
  text-transform: uppercase;
  letter-spacing: -0.5px;
}

.stat-sublabel {
  font-size: 0.8rem;
  color: inherit;
  text-transform: uppercase;
  letter-spacing: 1px;
  font-weight: 400;
}

/* 筛选区域 - Martin Garrix 风格 */
.filter-section {
  background: #ffffff;
  border: 1px solid #000000;
  padding: 40px;
  margin-bottom: 40px;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 30px;
  transition: all 0.3s ease;
}

.filter-section:hover {
  transform: translateY(-2px);
}

.filter-controls {
  display: flex;
  gap: 24px;
  flex: 1;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 180px;
}

.filter-group label {
  font-size: 0.8rem;
  font-weight: 700;
  color: #000000;
  text-transform: uppercase;
  letter-spacing: 1px;
}

/* 艺人列表 - Martin Garrix 风格 */
.artists-list {
  background: #ffffff;
  border: 1px solid #000000;
  padding: 40px;
  transition: all 0.3s ease;
}

.artists-list:hover {
  transform: translateY(-2px);
}

/* 网格视图 - Martin Garrix 风格 */
.grid-view {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 30px;
}

.artist-card {
  border: 1px solid #000000;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s ease;
  background: #ffffff;
}

.artist-card:hover {
  transform: translateY(-6px);
  border-width: 2px;
}

.card-header {
  position: relative;
  padding: 30px;
  background: #ffffff;
  border-bottom: 1px solid #000000;
}

.artist-avatar {
  position: relative;
  width: 80px;
  height: 80px;
  margin: 0 auto 16px;
}

.artist-avatar img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid white;
}

.status-indicator {
  position: absolute;
  bottom: 4px;
  right: 4px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid white;
}

.status-indicator.active {
  background: #28a745;
}

.status-indicator.pending {
  background: #ffc107;
}

.status-indicator.inactive {
  background: #6c757d;
}

.card-actions {
  position: absolute;
  top: 16px;
  right: 16px;
}

.card-content {
  padding: 30px 25px;
}

.artist-name {
  font-size: 1.4rem;
  font-weight: 700;
  color: #000000;
  margin: 0 0 8px 0;
  text-align: center;
  text-transform: uppercase;
  letter-spacing: -0.5px;
  line-height: 1.1;
}

.artist-genre {
  font-size: 0.9rem;
  color: #666666;
  margin: 0 0 25px 0;
  text-align: center;
  font-weight: 400;
}

.artist-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin-bottom: 25px;
  padding: 20px;
  background: #ffffff;
  border: 1px solid #000000;
}

.stat-item {
  text-align: center;
}

.stat-value {
  display: block;
  font-size: 1.5rem;
  font-weight: 900;
  color: #000000;
  margin-bottom: 6px;
  line-height: 1;
}

.stat-label {
  font-size: 0.7rem;
  color: #666666;
  text-transform: uppercase;
  letter-spacing: 1px;
  font-weight: 600;
}

.platform-links {
  margin-bottom: 16px;
}

.platforms-title {
  font-size: 0.8rem;
  font-weight: 700;
  color: #000000;
  margin-bottom: 12px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.platform-icons {
  display: flex;
  gap: 8px;
}

.platform-link {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 4px;
  text-decoration: none;
  font-size: 10px;
  font-weight: 600;
  color: white;
  transition: all 0.3s ease;
}

.platform-link.spotify {
  background: #1db954;
}

.platform-link.apple {
  background: #000;
}

.platform-link.soundcloud {
  background: #ff5500;
}

.platform-link.youtube {
  background: #ff0000;
}

.platform-link:hover {
  transform: scale(1.1);
}

.join-date {
  font-size: 0.8rem;
  color: #666666;
  text-align: center;
  text-transform: uppercase;
  letter-spacing: 1px;
  font-weight: 600;
}

/* 列表视图 */
.table-avatar {
  position: relative;
  width: 50px;
  height: 50px;
}

.table-avatar img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
}

.table-platforms {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.platform-tag {
  display: inline-block;
  padding: 2px 6px;
  background: #f8f9fa;
  border-radius: 3px;
  font-size: 10px;
  font-weight: 600;
  color: #666;
}

/* 分页 - Martin Garrix 风格 */
.pagination-section {
  margin-top: 40px;
  display: flex;
  justify-content: center;
  padding-top: 40px;
  border-top: 2px solid #000000;
}

/* 响应式 */
@media (max-width: 768px) {
  .page-container {
    padding: 12px;
  }
  
  .header-content {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }
  
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .filter-section {
    flex-direction: column;
    align-items: stretch;
  }
  
  .filter-controls {
    flex-direction: column;
  }
  
  .grid-view {
    grid-template-columns: 1fr;
  }
}
</style>
