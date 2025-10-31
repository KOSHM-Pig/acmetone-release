<template>
  <div class="submissions-page">
    <LabelHeader :userRole="userRole" />
    
    <div class="page-container">
      <!-- 页面标题和操作栏 -->
      <div class="page-header">
        <div class="header-content">
          <div class="title-section">
            <h1 class="page-title">投稿管理</h1>
            <p class="page-subtitle">Submissions Management</p>
          </div>
          <div class="header-actions">
            <el-button type="primary" @click="showUploadDialog = true">
              <el-icon><Upload /></el-icon>
              新增投稿
            </el-button>
            <el-button @click="refreshSubmissions">
              <el-icon><Refresh /></el-icon>
              刷新
            </el-button>
          </div>
        </div>
      </div>

      <!-- 筛选和统计栏 -->
      <div class="filter-section">
        <div class="filter-controls">
          <div class="filter-group">
            <label>状态筛选</label>
            <el-select v-model="filters.status" placeholder="选择状态" clearable>
              <el-option label="全部" value="" />
              <el-option label="待审核" value="pending" />
              <el-option label="已通过" value="approved" />
              <el-option label="已拒绝" value="rejected" />
              <el-option label="需修改" value="revision" />
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
            <label>提交时间</label>
            <el-date-picker
              v-model="filters.dateRange"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
            />
          </div>
          <div class="filter-group">
            <el-input
              v-model="filters.search"
              placeholder="搜索歌曲名或艺人名"
              @keyup.enter="applyFilters"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
          </div>
        </div>
        
        <div class="stats-cards">
          <div class="stat-card">
            <div class="stat-number">{{ stats.pending }}</div>
            <div class="stat-label">待审核</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">{{ stats.approved }}</div>
            <div class="stat-label">已通过</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">{{ stats.rejected }}</div>
            <div class="stat-label">已拒绝</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">{{ stats.total }}</div>
            <div class="stat-label">总投稿</div>
          </div>
        </div>
      </div>

      <!-- 投稿列表 -->
      <div class="submissions-list">
        <div class="list-header">
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
          <div class="sort-controls">
            <el-select v-model="sortBy" size="small">
              <el-option label="提交时间" value="createdAt" />
              <el-option label="歌曲名称" value="title" />
              <el-option label="艺人名称" value="artist" />
              <el-option label="状态" value="status" />
            </el-select>
            <el-button size="small" @click="toggleSortOrder">
              <el-icon><Sort /></el-icon>
              {{ sortOrder === 'desc' ? '降序' : '升序' }}
            </el-button>
          </div>
        </div>

        <!-- 网格视图 -->
        <div v-if="viewMode === 'grid'" class="grid-view">
          <div
            v-for="submission in filteredSubmissions"
            :key="submission.id"
            class="submission-card"
            @click="openSubmissionDetail(submission)"
          >
            <div class="card-cover">
              <img :src="submission.coverUrl || '/images/default-cover.jpg'" :alt="submission.title" />
              <div class="play-overlay">
                <el-button circle @click.stop="playSubmission(submission)">
                  <el-icon><VideoPlay /></el-icon>
                </el-button>
              </div>
              <div class="status-badge" :class="submission.status">
                {{ getStatusText(submission.status) }}
              </div>
            </div>
            <div class="card-content">
              <h3 class="song-title">{{ submission.title }}</h3>
              <p class="artist-name">{{ submission.artistName }}</p>
              <div class="submission-meta">
                <span class="genre">{{ submission.genre }}</span>
                <span class="date">{{ formatDate(submission.createdAt) }}</span>
              </div>
              <div class="card-actions">
                <el-button size="small" @click.stop="reviewSubmission(submission)">
                  审核
                </el-button>
                <el-dropdown @click.stop trigger="click">
                  <el-button size="small">
                    <el-icon><MoreFilled /></el-icon>
                  </el-button>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item @click="downloadSubmission(submission)">
                        <el-icon><Download /></el-icon>
                        下载
                      </el-dropdown-item>
                      <el-dropdown-item @click="addToAlbum(submission)">
                        <el-icon><Plus /></el-icon>
                        添加到专辑
                      </el-dropdown-item>
                      <el-dropdown-item @click="contactArtist(submission)">
                        <el-icon><Message /></el-icon>
                        联系艺人
                      </el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </div>
            </div>
          </div>
        </div>

        <!-- 列表视图 -->
        <div v-if="viewMode === 'list'" class="list-view">
          <el-table :data="filteredSubmissions" @row-click="openSubmissionDetail">
            <el-table-column width="60">
              <template #default="{ row }">
                <div class="table-cover">
                  <img :src="row.coverUrl || '/images/default-cover.jpg'" :alt="row.title" />
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="title" label="歌曲名称" min-width="200" />
            <el-table-column prop="artistName" label="艺人" min-width="150" />
            <el-table-column prop="genre" label="类型" width="100" />
            <el-table-column label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="getStatusType(row.status)">
                  {{ getStatusText(row.status) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="createdAt" label="提交时间" width="120">
              <template #default="{ row }">
                {{ formatDate(row.createdAt) }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="200" fixed="right">
              <template #default="{ row }">
                <el-button size="small" @click.stop="playSubmission(row)">
                  <el-icon><VideoPlay /></el-icon>
                </el-button>
                <el-button size="small" @click.stop="reviewSubmission(row)">
                  审核
                </el-button>
                <el-dropdown @click.stop trigger="click">
                  <el-button size="small">
                    <el-icon><MoreFilled /></el-icon>
                  </el-button>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item @click="downloadSubmission(row)">
                        <el-icon><Download /></el-icon>
                        下载
                      </el-dropdown-item>
                      <el-dropdown-item @click="addToAlbum(row)">
                        <el-icon><Plus /></el-icon>
                        添加到专辑
                      </el-dropdown-item>
                      <el-dropdown-item @click="contactArtist(row)">
                        <el-icon><Message /></el-icon>
                        联系艺人
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
            :total="totalSubmissions"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange"
          />
        </div>
      </div>
    </div>

    <!-- 上传投稿对话框 -->
    <el-dialog v-model="showUploadDialog" title="新增投稿" width="600px">
      <SubmissionUploadForm @success="handleUploadSuccess" @cancel="showUploadDialog = false" />
    </el-dialog>

    <!-- 审核对话框 -->
    <el-dialog v-model="showReviewDialog" title="投稿审核" width="800px">
      <SubmissionReviewForm 
        :submission="currentSubmission" 
        @success="handleReviewSuccess" 
        @cancel="showReviewDialog = false" 
      />
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Upload, Refresh, Search, Grid, List, Sort, VideoPlay, MoreFilled, Download, Plus, Message } from '@element-plus/icons-vue'
import LabelHeader from '@/components/LabelHeader.vue'
import SubmissionUploadForm from '@/components/forms/SubmissionUploadForm.vue'
import SubmissionReviewForm from '@/components/forms/SubmissionReviewForm.vue'

// Props
const userRole = ref('主理人')

// 数据状态
const submissions = ref([])
const loading = ref(false)
const showUploadDialog = ref(false)
const showReviewDialog = ref(false)
const currentSubmission = ref(null)

// 筛选和排序
const filters = ref({
  status: '',
  genre: '',
  dateRange: null,
  search: ''
})

const viewMode = ref('grid')
const sortBy = ref('createdAt')
const sortOrder = ref('desc')

// 分页
const currentPage = ref(1)
const pageSize = ref(24)
const totalSubmissions = ref(0)

// 统计数据
const stats = ref({
  pending: 15,
  approved: 42,
  rejected: 8,
  total: 65
})

// 模拟数据
const mockSubmissions = ref([
  {
    id: 1,
    title: 'Summer Vibes',
    artistName: 'DJ Alex',
    genre: 'Electronic',
    status: 'pending',
    createdAt: '2024-01-15',
    coverUrl: null,
    audioUrl: '/audio/sample1.mp3'
  },
  {
    id: 2,
    title: 'Midnight Dreams',
    artistName: 'Sarah Chen',
    genre: 'Pop',
    status: 'approved',
    createdAt: '2024-01-14',
    coverUrl: null,
    audioUrl: '/audio/sample2.mp3'
  },
  {
    id: 3,
    title: 'Electric Storm',
    artistName: 'Beat Master',
    genre: 'Electronic',
    status: 'rejected',
    createdAt: '2024-01-13',
    coverUrl: null,
    audioUrl: '/audio/sample3.mp3'
  }
])

// 计算属性
const filteredSubmissions = computed(() => {
  let result = [...mockSubmissions.value]
  
  // 状态筛选
  if (filters.value.status) {
    result = result.filter(s => s.status === filters.value.status)
  }
  
  // 类型筛选
  if (filters.value.genre) {
    result = result.filter(s => s.genre === filters.value.genre)
  }
  
  // 搜索筛选
  if (filters.value.search) {
    const search = filters.value.search.toLowerCase()
    result = result.filter(s => 
      s.title.toLowerCase().includes(search) || 
      s.artistName.toLowerCase().includes(search)
    )
  }
  
  // 排序
  result.sort((a, b) => {
    const aVal = a[sortBy.value]
    const bVal = b[sortBy.value]
    const order = sortOrder.value === 'desc' ? -1 : 1
    
    if (aVal < bVal) return -1 * order
    if (aVal > bVal) return 1 * order
    return 0
  })
  
  return result
})

// 方法
const refreshSubmissions = () => {
  loading.value = true
  // 模拟API调用
  setTimeout(() => {
    loading.value = false
    ElMessage.success('数据已刷新')
  }, 1000)
}

const applyFilters = () => {
  currentPage.value = 1
  // 触发重新计算
}

const toggleSortOrder = () => {
  sortOrder.value = sortOrder.value === 'desc' ? 'asc' : 'desc'
}

const openSubmissionDetail = (submission) => {
  // 打开投稿详情页面或对话框
  console.log('Open submission detail:', submission)
}

const playSubmission = (submission) => {
  // 播放音频
  console.log('Play submission:', submission)
  ElMessage.info(`正在播放: ${submission.title}`)
}

const reviewSubmission = (submission) => {
  currentSubmission.value = submission
  showReviewDialog.value = true
}

const downloadSubmission = (submission) => {
  // 下载文件
  console.log('Download submission:', submission)
  ElMessage.success('开始下载')
}

const addToAlbum = (submission) => {
  // 添加到专辑
  console.log('Add to album:', submission)
}

const contactArtist = (submission) => {
  // 联系艺人
  console.log('Contact artist:', submission)
}

const getStatusText = (status) => {
  const statusMap = {
    pending: '待审核',
    approved: '已通过',
    rejected: '已拒绝',
    revision: '需修改'
  }
  return statusMap[status] || status
}

const getStatusType = (status) => {
  const typeMap = {
    pending: 'warning',
    approved: 'success',
    rejected: 'danger',
    revision: 'info'
  }
  return typeMap[status] || 'info'
}

const formatDate = (date) => {
  return new Date(date).toLocaleDateString('zh-CN')
}

const handleSizeChange = (size) => {
  pageSize.value = size
  currentPage.value = 1
}

const handleCurrentChange = (page) => {
  currentPage.value = page
}

const handleUploadSuccess = () => {
  showUploadDialog.value = false
  refreshSubmissions()
  ElMessage.success('投稿上传成功')
}

const handleReviewSuccess = () => {
  showReviewDialog.value = false
  refreshSubmissions()
  ElMessage.success('审核完成')
}

onMounted(() => {
  submissions.value = mockSubmissions.value
  totalSubmissions.value = mockSubmissions.value.length
})
</script>

<style scoped>
/* Martin Garrix 黑白设计语言 - 投稿管理页面 */
.submissions-page {
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
  border-bottom: 1px solid #e0e0e0;
  padding: 40px;
  margin-bottom: 30px;
  transition: all 0.3s ease;
}

.page-header:hover {
  border-bottom-color: #000000;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.page-title {
  font-size: 3rem;
  font-weight: 900;
  color: #000000;
  margin: 0 0 8px 0;
  text-transform: uppercase;
  letter-spacing: -1px;
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

/* 筛选区域 - Martin Garrix 风格 */
.filter-section {
  background: #ffffff;
  border: 1px solid #e0e0e0;
  padding: 30px;
  margin-bottom: 30px;
  transition: all 0.3s ease;
}

.filter-section:hover {
  border-color: #000000;
}

.filter-controls {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 24px;
  margin-bottom: 40px;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.filter-group label {
  font-size: 0.8rem;
  font-weight: 700;
  color: #000000;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.stats-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 20px;
}

.stat-card {
  text-align: center;
  padding: 24px 16px;
  background: #ffffff;
  border: 1px solid #e0e0e0;
  transition: all 0.3s ease;
}

.stat-card:hover {
  background: #000000;
  color: #ffffff;
  border-color: #000000;
}

.stat-number {
  font-size: 2.5rem;
  font-weight: 900;
  color: inherit;
  margin-bottom: 8px;
  line-height: 1;
}

.stat-label {
  font-size: 0.8rem;
  color: inherit;
  text-transform: uppercase;
  letter-spacing: 1px;
  font-weight: 600;
}

/* 投稿列表 - Martin Garrix 风格 */
.submissions-list {
  background: #ffffff;
  border: 1px solid #e0e0e0;
  padding: 30px;
  transition: all 0.3s ease;
}

.submissions-list:hover {
  border-color: #000000;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e0e0e0;
}

.view-controls, .sort-controls {
  display: flex;
  align-items: center;
  gap: 16px;
}

/* 网格视图 - Martin Garrix 风格 */
.grid-view {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 30px;
}

.submission-card {
  border: 1px solid #e0e0e0;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s ease;
  background: #ffffff;
}

.submission-card:hover {
  transform: translateY(-2px);
  border-color: #000000;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.card-cover {
  position: relative;
  aspect-ratio: 1;
  overflow: hidden;
}

.card-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.play-overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.submission-card:hover .play-overlay {
  opacity: 1;
}

.status-badge {
  position: absolute;
  top: 15px;
  right: 15px;
  padding: 8px 16px;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  border: 1px solid;
}

.status-badge.pending {
  background: #ffffff;
  color: #000000;
  border-color: #000000;
}

.status-badge.approved {
  background: #000000;
  color: #ffffff;
  border-color: #000000;
}

.status-badge.rejected {
  background: #ffffff;
  color: #000000;
  border-color: #000000;
}

.card-content {
  padding: 20px 16px;
}

.song-title {
  font-size: 1.3rem;
  font-weight: 700;
  color: #000000;
  margin: 0 0 8px 0;
  text-transform: uppercase;
  letter-spacing: -0.5px;
  line-height: 1.1;
}

.artist-name {
  font-size: 0.9rem;
  color: #666666;
  margin: 0 0 20px 0;
  font-weight: 400;
}

.submission-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  font-size: 0.8rem;
  color: #666666;
  text-transform: uppercase;
  letter-spacing: 1px;
  font-weight: 600;
}

.card-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

/* 列表视图 */
.table-cover {
  width: 40px;
  height: 40px;
  border-radius: 4px;
  overflow: hidden;
}

.table-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* 分页 - Martin Garrix 风格 */
.pagination-section {
  margin-top: 30px;
  display: flex;
  justify-content: center;
  padding-top: 24px;
  border-top: 1px solid #e0e0e0;
}

/* Element Plus 组件样式覆盖 */
:deep(.el-button) {
  border: 1px solid #000000;
  background: #ffffff;
  color: #000000;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  transition: all 0.3s ease;
}

:deep(.el-button:hover) {
  background: #000000;
  color: #ffffff;
  border-color: #000000;
}

:deep(.el-button--primary) {
  background: #000000;
  color: #ffffff;
  border-color: #000000;
}

:deep(.el-button--primary:hover) {
  background: #333333;
  border-color: #333333;
}

:deep(.el-select) {
  border: 1px solid #e0e0e0;
}

:deep(.el-select:hover) {
  border-color: #000000;
}

:deep(.el-input__wrapper) {
  border: 1px solid #e0e0e0;
  transition: all 0.3s ease;
}

:deep(.el-input__wrapper:hover) {
  border-color: #000000;
}

:deep(.el-input__wrapper.is-focus) {
  border-color: #000000;
  box-shadow: 0 0 0 1px #000000;
}

:deep(.el-table) {
  border: 1px solid #e0e0e0;
}

:deep(.el-table th) {
  background: #f8f9fa;
  border-bottom: 1px solid #e0e0e0;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-size: 0.8rem;
}

:deep(.el-table td) {
  border-bottom: 1px solid #f0f0f0;
}

:deep(.el-table tr:hover) {
  background: #f8f9fa;
}

:deep(.el-pagination) {
  font-weight: 600;
}

:deep(.el-pagination .el-pager li) {
  border: 1px solid #e0e0e0;
  margin: 0 2px;
  font-weight: 600;
}

:deep(.el-pagination .el-pager li:hover) {
  background: #000000;
  color: #ffffff;
  border-color: #000000;
}

:deep(.el-pagination .el-pager li.is-active) {
  background: #000000;
  color: #ffffff;
  border-color: #000000;
}

:deep(.el-radio-button__inner) {
  border: 1px solid #e0e0e0;
  background: #ffffff;
  color: #000000;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

:deep(.el-radio-button__inner:hover) {
  background: #000000;
  color: #ffffff;
  border-color: #000000;
}

:deep(.el-radio-button.is-active .el-radio-button__inner) {
  background: #000000;
  color: #ffffff;
  border-color: #000000;
}

:deep(.el-tag) {
  border: 1px solid #e0e0e0;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
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
  
  .filter-controls {
    grid-template-columns: 1fr;
  }
  
  .grid-view {
    grid-template-columns: 1fr;
  }
  
  .list-header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }
}
</style>
