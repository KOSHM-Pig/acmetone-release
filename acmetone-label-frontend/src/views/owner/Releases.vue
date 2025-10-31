<template>
  <div class="releases-page">
    <LabelHeader :userRole="userRole" />
    
    <div class="page-container">
      <!-- 页面标题和操作栏 -->
      <div class="page-header">
        <div class="header-content">
          <div class="title-section">
            <h1 class="page-title">发行管理</h1>
            <p class="page-subtitle">Releases Management</p>
          </div>
          <div class="header-actions">
            <el-button type="primary" @click="showCreateDialog = true">
              <el-icon><Plus /></el-icon>
              创建专辑
            </el-button>
            <el-button @click="refreshReleases">
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
              <el-icon><Document /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-number">{{ stats.draft }}</div>
              <div class="stat-label">草稿专辑</div>
              <div class="stat-sublabel">Draft Albums</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">
              <el-icon><Clock /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-number">{{ stats.pending }}</div>
              <div class="stat-label">待审核</div>
              <div class="stat-sublabel">Pending Review</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">
              <el-icon><CircleCheck /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-number">{{ stats.published }}</div>
              <div class="stat-label">已发行</div>
              <div class="stat-sublabel">Published</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">
              <el-icon><TrendCharts /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-number">{{ stats.total }}</div>
              <div class="stat-label">总专辑</div>
              <div class="stat-sublabel">Total Albums</div>
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
              <el-option label="草稿" value="draft" />
              <el-option label="待审核" value="pending" />
              <el-option label="已发行" value="published" />
              <el-option label="已拒绝" value="rejected" />
            </el-select>
          </div>
          <div class="filter-group">
            <label>发行时间</label>
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
              placeholder="搜索专辑名称"
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

      <!-- 专辑列表 -->
      <div class="releases-list">
        <!-- 网格视图 -->
        <div v-if="viewMode === 'grid'" class="grid-view">
          <div
            v-for="album in filteredReleases"
            :key="album.id"
            class="album-card"
            @click="openAlbumDetail(album)"
          >
            <div class="card-cover">
              <img :src="album.coverUrl || '/images/default-album.jpg'" :alt="album.title" />
              <div class="status-overlay" :class="album.status">
                <span class="status-text">{{ getStatusText(album.status) }}</span>
              </div>
              <div class="card-actions">
                <el-button circle size="small" @click.stop="editAlbum(album)">
                  <el-icon><Edit /></el-icon>
                </el-button>
                <el-dropdown @click.stop trigger="click">
                  <el-button circle size="small">
                    <el-icon><MoreFilled /></el-icon>
                  </el-button>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item @click="duplicateAlbum(album)">
                        <el-icon><CopyDocument /></el-icon>
                        复制专辑
                      </el-dropdown-item>
                      <el-dropdown-item @click="exportAlbum(album)">
                        <el-icon><Download /></el-icon>
                        导出数据
                      </el-dropdown-item>
                      <el-dropdown-item v-if="album.status === 'draft'" @click="submitForReview(album)">
                        <el-icon><Upload /></el-icon>
                        提交审核
                      </el-dropdown-item>
                      <el-dropdown-item @click="deleteAlbum(album)" divided>
                        <el-icon><Delete /></el-icon>
                        删除专辑
                      </el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </div>
            </div>
            <div class="card-content">
              <h3 class="album-title">{{ album.title }}</h3>
              <p class="album-artist">{{ album.artist }}</p>
              <div class="album-meta">
                <span class="track-count">{{ album.trackCount }} 首歌曲</span>
                <span class="release-date">{{ formatDate(album.releaseDate) }}</span>
              </div>
              <div class="progress-section" v-if="album.status === 'draft'">
                <div class="progress-label">完成度</div>
                <el-progress :percentage="album.completionRate" :show-text="false" />
                <span class="progress-text">{{ album.completionRate }}%</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 列表视图 -->
        <div v-if="viewMode === 'list'" class="list-view">
          <el-table :data="filteredReleases" @row-click="openAlbumDetail">
            <el-table-column width="80">
              <template #default="{ row }">
                <div class="table-cover">
                  <img :src="row.coverUrl || '/images/default-album.jpg'" :alt="row.title" />
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="title" label="专辑名称" min-width="200" />
            <el-table-column prop="artist" label="艺人" min-width="150" />
            <el-table-column prop="trackCount" label="歌曲数" width="100">
              <template #default="{ row }">
                {{ row.trackCount }} 首
              </template>
            </el-table-column>
            <el-table-column label="状态" width="120">
              <template #default="{ row }">
                <el-tag :type="getStatusType(row.status)">
                  {{ getStatusText(row.status) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="完成度" width="120">
              <template #default="{ row }">
                <el-progress v-if="row.status === 'draft'" :percentage="row.completionRate" :show-text="false" />
                <span v-else>-</span>
              </template>
            </el-table-column>
            <el-table-column prop="releaseDate" label="发行日期" width="120">
              <template #default="{ row }">
                {{ formatDate(row.releaseDate) }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="200" fixed="right">
              <template #default="{ row }">
                <el-button size="small" @click.stop="editAlbum(row)">
                  <el-icon><Edit /></el-icon>
                  编辑
                </el-button>
                <el-dropdown @click.stop trigger="click">
                  <el-button size="small">
                    <el-icon><MoreFilled /></el-icon>
                  </el-button>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item @click="duplicateAlbum(row)">
                        <el-icon><CopyDocument /></el-icon>
                        复制专辑
                      </el-dropdown-item>
                      <el-dropdown-item @click="exportAlbum(row)">
                        <el-icon><Download /></el-icon>
                        导出数据
                      </el-dropdown-item>
                      <el-dropdown-item v-if="row.status === 'draft'" @click="submitForReview(row)">
                        <el-icon><Upload /></el-icon>
                        提交审核
                      </el-dropdown-item>
                      <el-dropdown-item @click="deleteAlbum(row)" divided>
                        <el-icon><Delete /></el-icon>
                        删除专辑
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
            :total="totalReleases"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange"
          />
        </div>
      </div>
    </div>

    <!-- 创建专辑对话框 -->
    <el-dialog v-model="showCreateDialog" title="创建新专辑" width="600px">
      <AlbumCreateForm @success="handleCreateSuccess" @cancel="showCreateDialog = false" />
    </el-dialog>

    <!-- 编辑专辑对话框 -->
    <el-dialog v-model="showEditDialog" title="编辑专辑" width="800px">
      <AlbumEditForm 
        :album="currentAlbum" 
        @success="handleEditSuccess" 
        @cancel="showEditDialog = false" 
      />
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Refresh, Search, Grid, List, Document, Clock, CircleCheck, TrendCharts, Edit, MoreFilled, CopyDocument, Download, Upload, Delete } from '@element-plus/icons-vue'
import LabelHeader from '@/components/LabelHeader.vue'
import AlbumCreateForm from '@/components/forms/AlbumCreateForm.vue'
import AlbumEditForm from '@/components/forms/AlbumEditForm.vue'

// Props
const userRole = ref('主理人')

// 数据状态
const releases = ref([])
const loading = ref(false)
const showCreateDialog = ref(false)
const showEditDialog = ref(false)
const currentAlbum = ref(null)

// 筛选和排序
const filters = ref({
  status: '',
  dateRange: null,
  search: ''
})

const viewMode = ref('grid')

// 分页
const currentPage = ref(1)
const pageSize = ref(24)
const totalReleases = ref(0)

// 统计数据
const stats = ref({
  draft: 8,
  pending: 3,
  published: 15,
  total: 26
})

// 模拟数据
const mockReleases = ref([
  {
    id: 1,
    title: 'Electronic Dreams',
    artist: 'Various Artists',
    trackCount: 12,
    status: 'published',
    releaseDate: '2024-01-15',
    coverUrl: null,
    completionRate: 100
  },
  {
    id: 2,
    title: 'Summer Hits 2024',
    artist: 'Various Artists',
    trackCount: 8,
    status: 'draft',
    releaseDate: '2024-03-01',
    coverUrl: null,
    completionRate: 65
  },
  {
    id: 3,
    title: 'Underground Vibes',
    artist: 'DJ Collective',
    trackCount: 10,
    status: 'pending',
    releaseDate: '2024-02-20',
    coverUrl: null,
    completionRate: 100
  }
])

// 计算属性
const filteredReleases = computed(() => {
  let result = [...mockReleases.value]
  
  // 状态筛选
  if (filters.value.status) {
    result = result.filter(r => r.status === filters.value.status)
  }
  
  // 搜索筛选
  if (filters.value.search) {
    const search = filters.value.search.toLowerCase()
    result = result.filter(r => 
      r.title.toLowerCase().includes(search) || 
      r.artist.toLowerCase().includes(search)
    )
  }
  
  return result
})

// 方法
const refreshReleases = () => {
  loading.value = true
  setTimeout(() => {
    loading.value = false
    ElMessage.success('数据已刷新')
  }, 1000)
}

const applyFilters = () => {
  currentPage.value = 1
}

const openAlbumDetail = (album) => {
  console.log('Open album detail:', album)
  // 跳转到专辑详情页面
}

const editAlbum = (album) => {
  currentAlbum.value = album
  showEditDialog.value = true
}

const duplicateAlbum = (album) => {
  ElMessage.success(`正在复制专辑: ${album.title}`)
}

const exportAlbum = (album) => {
  ElMessage.success(`正在导出专辑数据: ${album.title}`)
}

const submitForReview = async (album) => {
  try {
    await ElMessageBox.confirm(
      `确定要提交专辑"${album.title}"进行审核吗？`,
      '提交审核',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )
    
    // 模拟提交
    album.status = 'pending'
    ElMessage.success('专辑已提交审核')
  } catch {
    // 用户取消
  }
}

const deleteAlbum = async (album) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除专辑"${album.title}"吗？此操作不可恢复。`,
      '删除专辑',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'error',
      }
    )
    
    // 模拟删除
    const index = mockReleases.value.findIndex(r => r.id === album.id)
    if (index > -1) {
      mockReleases.value.splice(index, 1)
    }
    ElMessage.success('专辑已删除')
  } catch {
    // 用户取消
  }
}

const getStatusText = (status) => {
  const statusMap = {
    draft: '草稿',
    pending: '待审核',
    published: '已发行',
    rejected: '已拒绝'
  }
  return statusMap[status] || status
}

const getStatusType = (status) => {
  const typeMap = {
    draft: 'info',
    pending: 'warning',
    published: 'success',
    rejected: 'danger'
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

const handleCreateSuccess = () => {
  showCreateDialog.value = false
  refreshReleases()
  ElMessage.success('专辑创建成功')
}

const handleEditSuccess = () => {
  showEditDialog.value = false
  refreshReleases()
  ElMessage.success('专辑更新成功')
}

onMounted(() => {
  releases.value = mockReleases.value
  totalReleases.value = mockReleases.value.length
})
</script>

<style scoped>
/* Martin Garrix 黑白设计语言 - 发行管理页面 */
.releases-page {
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
  border: 1px solid #e0e0e0;
  padding: 30px 24px;
  display: flex;
  align-items: center;
  gap: 16px;
  transition: all 0.3s ease;
}

.stat-card:hover {
  background: #000000;
  color: #ffffff;
  border-color: #000000;
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
  border: 1px solid #e0e0e0;
  padding: 30px;
  margin-bottom: 30px;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 24px;
  transition: all 0.3s ease;
}

.filter-section:hover {
  border-color: #000000;
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

/* 专辑列表 - Martin Garrix 风格 */
.releases-list {
  background: #ffffff;
  border: 1px solid #e0e0e0;
  padding: 30px;
  transition: all 0.3s ease;
}

.releases-list:hover {
  border-color: #000000;
}

/* 网格视图 - Martin Garrix 风格 */
.grid-view {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 30px;
}

.album-card {
  border: 1px solid #e0e0e0;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s ease;
  background: #ffffff;
}

.album-card:hover {
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

.status-overlay {
  position: absolute;
  top: 15px;
  left: 15px;
  padding: 8px 16px;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  border: 1px solid;
}

.status-overlay.draft {
  background: #ffffff;
  color: #000000;
  border-color: #000000;
}

.status-overlay.pending {
  background: #ffffff;
  color: #000000;
  border-color: #000000;
}

.status-overlay.published {
  background: #000000;
  color: #ffffff;
  border-color: #000000;
}

.status-overlay.rejected {
  background: #ffffff;
  color: #000000;
  border-color: #000000;
}

.card-actions {
  position: absolute;
  top: 12px;
  right: 12px;
  display: flex;
  gap: 8px;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.album-card:hover .card-actions {
  opacity: 1;
}

.card-content {
  padding: 20px 16px;
}

.album-title {
  font-size: 1.4rem;
  font-weight: 700;
  color: #000000;
  margin: 0 0 8px 0;
  text-transform: uppercase;
  letter-spacing: -0.5px;
  line-height: 1.1;
}

.album-artist {
  font-size: 0.9rem;
  color: #666666;
  margin: 0 0 20px 0;
  font-weight: 400;
}

.album-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  font-size: 0.8rem;
  color: #666666;
  text-transform: uppercase;
  letter-spacing: 1px;
  font-weight: 600;
}

.progress-section {
  display: flex;
  align-items: center;
  gap: 12px;
}

.progress-label {
  font-size: 12px;
  color: #666;
  white-space: nowrap;
}

.progress-text {
  font-size: 12px;
  color: #666;
  white-space: nowrap;
}

/* 列表视图 */
.table-cover {
  width: 60px;
  height: 60px;
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
