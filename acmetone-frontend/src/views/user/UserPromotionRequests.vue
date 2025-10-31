<template>
  <div class="user-promotion-requests">
    <div class="page-header">
      <h1>我的推广申请</h1>
      <div class="header-actions">
        <router-link to="/services/promotion-request">
          <acmetone-btn>
            <el-icon><Plus /></el-icon>
            新建申请
          </acmetone-btn>
        </router-link>
      </div>
    </div>

    <div class="filter-bar">
      <div class="garrix-input-wrapper">
        <el-select 
          v-model="filterStatus" 
          placeholder="申请状态" 
          clearable 
          @change="handleFilterChange"
          popper-class="garrix-select-popper"
        >
          <el-option v-for="item in statusOptions" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
      </div>
      <div class="garrix-input-wrapper">
        <el-input
          v-model="searchQuery"
          placeholder="搜索专辑名称"
          clearable
          @input="handleSearch"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
      </div>
    </div>

    <!-- 桌面端表格视图 -->
    <div class="desktop-view" v-if="!isMobileView">
      <el-table
        v-loading="loading"
        :data="filteredRequests"
        style="width: 100%"
        row-key="id"
        empty-text="暂无推广申请记录"
      >
        <el-table-column label="申请ID" prop="id" width="80" />
        <el-table-column label="专辑封面" width="100">
          <template #default="scope">
            <el-image
              :src="scope.row.album.coverUrl"
              fit="cover"
              style="width: 60px; height: 60px; border-radius: 0;"
              :preview-src-list="[scope.row.album.coverUrl]"
            />
          </template>
        </el-table-column>
        <el-table-column label="专辑名称" prop="album.title" min-width="200" show-overflow-tooltip />
        <el-table-column label="申请时间" width="180">
          <template #default="scope">
            {{ formatDate(scope.row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="150">
          <template #default="scope">
            <span :class="['status-badge', getStatusClass(scope.row.status)]">
              {{ getStatusText(scope.row.status) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="scope">
            <acmetone-btn size="small" @click="viewDetails(scope.row)">
              查看详情
            </acmetone-btn>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 移动端卡片视图 -->
    <div class="mobile-view" v-if="isMobileView">
      <div v-if="loading" class="loading-container">
        <el-loading :fullscreen="false" />
      </div>
      <div v-else-if="filteredRequests.length === 0" class="empty-state">
        暂无推广申请记录
      </div>
      <div v-else class="request-cards">
        <div 
          v-for="item in filteredRequests" 
          :key="item.id" 
          class="request-card"
          @click="viewDetails(item)"
        >
          <div class="card-header">
            <el-image
              :src="item.album.coverUrl"
              fit="cover"
              class="card-album-cover"
            />
            <div class="card-header-info">
              <h3 class="card-title">{{ item.album.title }}</h3>
            </div>
          </div>
          <div class="card-body">
            <div class="card-info-row">
              <span class="card-label">申请ID</span>
              <span class="card-value">{{ item.id }}</span>
            </div>
            <div class="card-info-row">
              <span class="card-label">申请时间</span>
              <span class="card-value">{{ formatDate(item.createdAt) }}</span>
            </div>
            <div class="card-info-row">
              <span class="card-label">状态</span>
              <span :class="['status-badge', getStatusClass(item.status)]">
                {{ getStatusText(item.status) }}
              </span>
            </div>
          </div>
          <div class="card-footer">
            <acmetone-btn size="small">查看详情</acmetone-btn>
          </div>
        </div>
      </div>
    </div>

    <acmetone-pagination
      v-model:current-page="currentPage"
      v-model:page-size="pageSize"
      :page-sizes="[10, 20, 50, 100]"
      :total="totalItems"
      @size-change="handleSizeChange"
      @current-change="handleCurrentChange"
    />

    <!-- 详情对话框 -->
    <el-dialog
      v-model="detailsVisible"
      title="推广申请详情"
      :width="isMobileView ? '95%' : '800px'"
      destroy-on-close
      class="details-dialog"
      :append-to-body="true"
      :fullscreen="isMobileView"
    >
      <div v-if="currentRequest" class="dialog-layout" :class="{'mobile-layout': isMobileView}">
        <!-- 左侧：专辑信息 -->
        <div class="preview-column">
          <div class="album-preview-wrapper">
            <h4>专辑信息</h4>
            <div class="album-container">
              <img 
                :src="currentRequest.album.coverUrl" 
                alt="专辑封面" 
                class="album-cover-preview"
              />
            </div>
            <div class="album-info-section">
              <h5>{{ currentRequest.album.title }}</h5>
              <p>发行日期: {{ formatDate(currentRequest.album.releaseDate) }}</p>
            </div>
          </div>
        </div>

        <!-- 右侧：申请详情 -->
        <div class="details-column">
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">申请ID</span>
              <span>{{ currentRequest.id }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">申请时间</span>
              <span>{{ formatDate(currentRequest.createdAt) }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">状态</span>
              <span :class="['status-badge', getStatusClass(currentRequest.status)]">{{ getStatusText(currentRequest.status) }}</span>
            </div>
          </div>
          
          <div class="detail-section">
            <h4>申请详情</h4>
            <div class="detail-item">
              <span class="detail-label">作品亮点:</span>
              <p class="detail-content">{{ currentRequest.highlights }}</p>
            </div>
            <div class="detail-item" v-if="currentRequest.existingPromotion">
              <span class="detail-label">已有宣传资源:</span>
              <p class="detail-content">{{ currentRequest.existingPromotion }}</p>
            </div>
          </div>
          
          <div v-if="currentRequest.status === 'approved' || currentRequest.status === 'completed'" class="notice-box approved">
            <h5>推广资源</h5>
            <p>{{ currentRequest.promotionResources }}</p>
          </div>
        </div>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <acmetone-btn type="secondary" @click="detailsVisible = false">关闭</acmetone-btn>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeMount, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { Plus, Search } from '@element-plus/icons-vue';
import AcmetoneBtn from '@/components/acmetone/AcmetoneBtn.vue';
import AcmetonePagination from '@/components/acmetone/AcmetonePagination.vue';
import promotionService from '@/services/promotionService';
import { normalizeUrl, ensureFullUrl } from '@/utils/urlHelper';

const router = useRouter();
const loading = ref(false);
const requests = ref([]);
const filterStatus = ref('');
const searchQuery = ref('');
const currentPage = ref(1);
const pageSize = ref(10);
const totalItems = ref(0);
const detailsVisible = ref(false);
const currentRequest = ref(null);
const isMobileView = ref(false);

// 检测是否为移动端视图
const checkMobileView = () => {
  isMobileView.value = window.innerWidth < 768;
};

// 监听窗口大小变化
onBeforeMount(() => {
  checkMobileView();
  window.addEventListener('resize', checkMobileView);
});

// 在组件销毁前移除事件监听
onUnmounted(() => {
  window.removeEventListener('resize', checkMobileView);
});

// 状态选项
const statusOptions = [
  { value: '', label: '全部' },
  { value: 'pending', label: '待审核' },
  { value: 'approved', label: '极音记审核通过' },
  { value: 'completed', label: '已收到推广资源' }
];

// 格式化日期
const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// 获取状态文本
const getStatusText = (status) => {
  const statusMap = {
    'pending': '待审核',
    'approved': '极音记审核通过',
    'completed': '已收到推广资源'
  };
  return statusMap[status] || status;
};

// 获取状态类型（用于标签颜色）
const getStatusClass = (status) => {
  const statusMap = {
    pending: 'status-pending',
    approved: 'status-approved',
    completed: 'status-completed',
  };
  return statusMap[status] || 'status-pending';
};

// 过滤后的请求列表
const filteredRequests = computed(() => {
  let result = requests.value;
  
  // 状态过滤
  if (filterStatus.value) {
    result = result.filter(item => item.status === filterStatus.value);
  }
  
  // 搜索过滤
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    result = result.filter(item => 
      item.album.title.toLowerCase().includes(query)
    );
  }
  
  return result;
});

// 加载数据
const loadData = async () => {
  loading.value = true;
  try {
    const response = await promotionService.getUserPromotionRequests();
    const data = response.data;
    
    // 处理返回的数据
    requests.value = data.map(item => {
      // 处理封面URL
      if (item.Album && item.Album.coverUrl) {
        item.Album.coverUrl = normalizeUrl(ensureFullUrl(item.Album.coverUrl));
      } else if (item.Album && item.Album.coverImage) {
        item.Album.coverUrl = normalizeUrl(ensureFullUrl(item.Album.coverImage));
      }
      
      // 将Album对象转换为前端需要的格式
      return {
        ...item,
        album: {
          id: item.albumId,
          title: item.Album ? item.Album.title : '未知专辑',
          coverUrl: item.Album ? item.Album.coverUrl : '',
          releaseDate: item.Album ? item.Album.releaseDate : null
        }
      };
    });
    
    totalItems.value = requests.value.length;
  } catch (error) {
    console.error('获取推广申请列表失败:', error);
    ElMessage.error('获取推广申请列表失败');
  } finally {
    loading.value = false;
  }
};

// 查看详情
const viewDetails = (row) => {
  currentRequest.value = row;
  detailsVisible.value = true;
};

// 处理筛选变化
const handleFilterChange = () => {
  currentPage.value = 1;
};

// 处理搜索
const handleSearch = () => {
  currentPage.value = 1;
};

// 处理每页显示数量变化
const handleSizeChange = (val) => {
  pageSize.value = val;
  currentPage.value = 1;
};

// 处理页码变化
const handleCurrentChange = (val) => {
  currentPage.value = val;
};

// 查看推广详情
const viewPromotionDetails = (request) => {
  router.push({
    path: '/services/promotion-details',
    query: { requestId: request.id }
  });
};

onMounted(() => {
  loadData();
});
</script>

<style scoped>
/* Garrix设计风格变量 */
:root {
  --garrix-black: #1d1d1f;
  --garrix-white: #ffffff;
  --garrix-grey: #86868b;
  --garrix-light-grey: #f5f7fa;
  --garrix-border-grey: #d2d2d7;
  --garrix-text-primary: #1d1d1f;
  --garrix-text-secondary: #86868b;
}

.user-promotion-requests {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
  font-family: sans-serif;
  background-color: var(--garrix-white);
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--garrix-black);
  padding-bottom: 20px;
  margin-bottom: 30px;
}

.page-header h1 {
  font-size: 2rem;
  font-weight: 700;
  margin: 0;
}

/* Filter bar styling */
.filter-bar {
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
}

.filter-bar .garrix-input-wrapper:first-of-type {
  width: 200px;
}

.garrix-input-wrapper {
  position: relative;
  border: 2px solid var(--garrix-black);
  background-color: var(--garrix-white);
  box-shadow: 4px 4px 0 rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
}
.garrix-input-wrapper:hover {
  transform: translate(-2px, -2px);
  box-shadow: 6px 6px 0 rgba(0, 0, 0, 0.1);
}
:deep(.garrix-input-wrapper .el-input__wrapper),
:deep(.garrix-input-wrapper .el-select__wrapper) {
  border: none !important;
  box-shadow: none !important;
  background-color: transparent !important;
  padding: 0 15px;
  height: 54px;
}
:deep(.garrix-input-wrapper .el-input__wrapper.is-focus),
:deep(.garrix-input-wrapper .el-select__wrapper.is-focus) {
  box-shadow: none !important;
}
:deep(.garrix-input-wrapper .el-input__prefix) {
  margin-right: 8px;
}
:deep(.garrix-input-wrapper .el-select .el-input__wrapper) {
  padding: 0 15px;
}

/* Dropdown popper styling */
:deep(.garrix-select-popper) {
  border-radius: 0 !important;
  border: 2px solid var(--garrix-black) !important;
  box-shadow: 4px 4px 0 rgba(0,0,0,0.1) !important;
  margin-top: 8px !important;
}
:deep(.garrix-select-popper .el-popper__arrow) {
  display: none;
}
:deep(.garrix-select-popper .el-select-dropdown__item.selected) {
  color: var(--garrix-black);
  font-weight: 700;
}
:deep(.garrix-select-popper .el-select-dropdown__item.hover),
:deep(.garrix-select-popper .el-select-dropdown__item:hover) {
  background-color: var(--garrix-light-grey);
}

/* Table styling */
:deep(.el-table) {
  border-top: 1px solid var(--garrix-border-grey);
}
:deep(.el-table th),
:deep(.el-table td) {
  border-bottom: 1px solid var(--garrix-border-grey);
}
:deep(.el-table__header-wrapper) {
  border-bottom: 1px solid var(--garrix-black);
}
:deep(.el-table th) {
  color: var(--garrix-black);
  font-weight: 600;
}
:deep(.el-table__row:hover > td) {
  background-color: var(--garrix-light-grey);
}

.status-badge {
  padding: 4px 10px;
  border-radius: 0;
  font-size: 12px;
  font-weight: 600;
  border: 1px solid;
  white-space: nowrap;
  display: inline-block;
  min-width: 90px;
  text-align: center;
}

.status-pending {
  color: #c78517;
  border-color: #F9A825;
}

.status-approved {
  color: #2E7D32;
  border-color: #4CAF50;
}

.status-completed {
  color: #1565C0;
  border-color: #2196F3;
}

/* Details Dialog Styling */
:deep(.details-dialog .el-dialog__body) {
  padding: 24px;
  overflow: auto;
  max-height: calc(90vh - 120px);
}

:deep(.details-dialog .el-dialog) {
  max-width: 800px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  max-height: 90vh;
}

:deep(.details-dialog .el-dialog__header) {
  padding: 20px 24px;
  margin-right: 0;
  border-bottom: 1px solid var(--garrix-border-grey);
}

:deep(.details-dialog .el-dialog__footer) {
  padding: 16px 24px;
  border-top: 1px solid var(--garrix-border-grey);
}

/* 移动端卡片视图样式 */
.mobile-view {
  display: none;
}

.request-cards {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  margin-bottom: 20px;
}

.request-card {
  background-color: var(--garrix-white);
  border: 1px solid var(--garrix-border-grey);
  border-radius: 0;
  overflow: hidden;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  cursor: pointer;
}

.request-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.card-header {
  display: flex;
  padding: 12px;
  border-bottom: 1px solid var(--garrix-border-grey);
  background-color: var(--garrix-light-grey);
}

.card-album-cover {
  width: 60px;
  height: 60px;
  object-fit: cover;
  border-radius: 0;
  border: 1px solid var(--garrix-border-grey);
}

.card-header-info {
  margin-left: 12px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 4px;
  color: var(--garrix-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 200px;
}

.card-body {
  padding: 12px;
}

.card-info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 14px;
}

.card-info-row:last-child {
  margin-bottom: 0;
}

.card-label {
  color: var(--garrix-text-secondary);
  font-size: 13px;
}

.card-value {
  font-weight: 500;
  color: var(--garrix-text-primary);
}

.card-footer {
  padding: 12px;
  border-top: 1px solid var(--garrix-border-grey);
  display: flex;
  justify-content: flex-end;
}

.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
}

.empty-state {
  text-align: center;
  padding: 40px 0;
  color: var(--garrix-text-secondary);
  font-size: 14px;
}

/* 详情对话框内容样式 */
.dialog-layout {
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: 30px;
}

.preview-column {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.album-preview-wrapper h4 {
  font-size: 14px;
  font-weight: 600;
  margin: 0 0 10px;
  color: var(--garrix-text-secondary);
}

.album-container {
  width: 100%;
  border: 1px solid var(--garrix-border-grey);
  overflow: hidden;
}

.album-cover-preview {
  width: 100%;
  height: auto;
  display: block;
}

.album-info-section {
  margin-top: 12px;
}

.album-info-section h5 {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 8px;
  color: var(--garrix-text-primary);
}

.album-info-section p {
  margin: 0;
  font-size: 14px;
  color: var(--garrix-text-secondary);
}

.details-column {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--garrix-border-grey);
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-label {
  font-size: 12px;
  color: var(--garrix-text-secondary);
  text-transform: uppercase;
}

.info-item .status-badge {
  align-self: flex-start;
}

.detail-section {
  padding-bottom: 16px;
  border-bottom: 1px solid var(--garrix-border-grey);
}

.detail-section h4 {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 16px;
  color: var(--garrix-text-primary);
}

.detail-item {
  margin-bottom: 16px;
}

.detail-item:last-child {
  margin-bottom: 0;
}

.detail-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--garrix-text-primary);
  display: block;
  margin-bottom: 8px;
}

.detail-content {
  margin: 0;
  font-size: 14px;
  color: var(--garrix-text-secondary);
  line-height: 1.5;
}

.notice-box {
  padding: 16px;
  border-left: 3px solid;
  background-color: rgba(0, 0, 0, 0.02);
}

.notice-box h5 {
  margin: 0 0 8px;
  font-size: 14px;
  font-weight: 700;
}

.notice-box p {
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
}

.notice-box.approved {
  background-color: rgba(46, 125, 50, 0.05);
  border-color: #4CAF50;
  color: #2E7D32;
}

/* 移动端布局适配 */
.mobile-layout {
  display: flex;
  flex-direction: column;
}

.mobile-layout .preview-column,
.mobile-layout .details-column {
  width: 100%;
}

.mobile-layout .preview-column {
  margin-bottom: 20px;
}

.mobile-layout .info-grid {
  grid-template-columns: 1fr;
  gap: 12px;
}

@media (max-width: 768px) {
  .desktop-view {
    display: none;
  }
  
  .mobile-view {
    display: block;
  }
  
  .filter-bar {
    flex-direction: column;
    gap: 12px;
  }
  
  .filter-bar .garrix-input-wrapper:first-of-type {
    width: 100%;
  }
  
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }
  
  .header-actions {
    width: 100%;
  }
  
  .header-actions :deep(.acmetone-btn) {
    width: 100%;
    justify-content: center;
  }
}

@media (max-width: 480px) {
  .user-promotion-requests {
    padding: 16px 12px;
  }
  
  .card-header {
    padding: 10px;
  }
  
  .card-body, 
  .card-footer {
    padding: 10px;
  }
  
  .card-album-cover {
    width: 50px;
    height: 50px;
  }
  
  .card-title {
    font-size: 14px;
    max-width: 160px;
  }
  
  .card-info-row {
    font-size: 13px;
  }
  
  .card-label {
    font-size: 12px;
  }
}
</style> 