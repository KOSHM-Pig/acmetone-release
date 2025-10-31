<template>
  <div class="user-dynamic-covers">
    <!-- 放大查看视频组件 -->
    <VideoEnlargeViewer
      v-if="enlargedVideo.show"
      :videoSrc="enlargedVideo.src"
      :isPortrait="enlargedVideo.isPortrait"
      @close="closeEnlargedVideo"
    />
    <div class="page-header">
      <h1>动态封面申请管理</h1>
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
          placeholder="搜索专辑、艺人或用户"
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
        empty-text="暂无动态封面申请记录"
      >
        <el-table-column label="申请ID" prop="id" width="80" />
        <el-table-column label="专辑封面" width="100">
          <template #default="scope">
            <el-image
              :src="scope.row.albumCover"
              fit="cover"
              style="width: 60px; height: 60px; border-radius: 0;"
              :preview-src-list="[scope.row.albumCover]"
            />
          </template>
        </el-table-column>
        <el-table-column label="专辑信息" min-width="200" show-overflow-tooltip>
          <template #default="scope">
            <div>{{ scope.row.albumTitle }}</div>
            <div style="color: #86868b;">{{ scope.row.artistName }}</div>
          </template>
        </el-table-column>
        <el-table-column label="申请人" prop="username" width="120" show-overflow-tooltip />
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
        <el-table-column label="目标平台" width="150" show-overflow-tooltip>
          <template #default="scope">
            <div class="platforms-list">
              <img 
                  v-if="scope.row.platform" 
                  :src="platformIconMap[scope.row.platform]" 
                  :alt="scope.row.platform"
                  class="platform-icon" 
              />
            </div>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="scope">
            <acmetone-btn size="small" @click="viewDetails(scope.row)">
              审核
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
        暂无动态封面申请记录
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
              :src="item.albumCover"
              fit="cover"
              class="card-album-cover"
            />
            <div class="card-header-info">
              <h3 class="card-title">{{ item.albumTitle }}</h3>
              <p class="card-artist">{{ item.artistName }}</p>
              <p class="card-user">申请人: {{ item.username }}</p>
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
            <div class="card-info-row">
              <span class="card-label">目标平台</span>
              <div class="platforms-list">
                <img 
                  v-if="item.platform" 
                  :src="platformIconMap[item.platform]" 
                  :alt="item.platform"
                  class="platform-icon" 
                />
              </div>
            </div>
          </div>
          <div class="card-footer">
            <acmetone-btn size="small">审核</acmetone-btn>
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
      title="审核动态封面申请"
      :width="isMobileView ? '95%' : '800px'"
      destroy-on-close
      class="details-dialog"
      :append-to-body="true"
      :fullscreen="isMobileView"
    >
      <div v-if="currentRequest" class="dialog-layout" :class="{'mobile-layout': isMobileView}">
        <!-- 左侧：封面预览和文件信息 -->
        <div class="preview-column">
          <el-tabs v-if="currentRequest.platform === 'applemusic'" v-model="activeTab">
            <el-tab-pane label="正方形封面 (1:1)" name="square">
              <div class="video-preview-wrapper">
                <div class="video-container">
                  <video 
                    ref="squareVideoRef"
                    :src="currentRequest.dynamicCoverPath" 
                    controls 
                    muted 
                    loop 
                    class="dynamic-video"
                    preload="metadata"
                  ></video>
                  <div class="video-controls">
                    <acmetone-btn size="small" @click="openEnlargedVideo(currentRequest.dynamicCoverPath, false)">
                       放大查看
                    </acmetone-btn>
                  </div>
                </div>
                <div class="file-info-section">
                  <h5>文件信息</h5>
                  <div class="file-info-line">
                    <div class="file-info-grid">
                      <span>{{ currentRequest.resolution }}</span> |
                      <span>{{ formatDuration(currentRequest.duration) }}</span> |
                      <span>{{ formatFileSize(currentRequest.fileSize) }}</span>
                    </div>
                    <acmetone-btn size="small" @click="downloadVideo(currentRequest.dynamicCoverPath, currentRequest.originalFilename)">下载</acmetone-btn>
                  </div>
                </div>
              </div>
            </el-tab-pane>
            <el-tab-pane label="竖版封面 (3:4)" name="portrait">
              <div class="video-preview-wrapper">
                <div class="video-container portrait">
                  <video 
                    ref="portraitVideoRef"
                    :src="currentRequest.portraitCoverPath" 
                    controls 
                    muted 
                    loop 
                    class="dynamic-video portrait"
                    preload="metadata"
                  ></video>
                  
                  <!-- 安全区域覆盖图 -->
                  <div v-if="showSafeZoneOverlay" class="safe-zone-overlay"></div>
                  
                  <div class="video-controls">
                    <acmetone-btn size="small" @click="toggleSafeZoneOverlay">
                      {{ showSafeZoneOverlay ? '隐藏安全区域' : '显示安全区域' }}
                    </acmetone-btn>
                    <acmetone-btn size="small" @click="openEnlargedVideo(currentRequest.portraitCoverPath, true)">
                      放大查看
                    </acmetone-btn>
                  </div>
                </div>
                <div class="file-info-section">
                  <h5>文件信息</h5>
                  <div class="file-info-line">
                    <div class="file-info-grid">
                      <span>{{ currentRequest.portraitResolution }}</span> |
                      <span>{{ formatDuration(currentRequest.portraitDuration) }}</span> |
                      <span>{{ formatFileSize(currentRequest.portraitFileSize) }}</span>
                    </div>
                    <acmetone-btn size="small" @click="downloadVideo(currentRequest.portraitCoverPath, currentRequest.portraitOriginalFilename)">下载</acmetone-btn>
                  </div>
                </div>
              </div>
            </el-tab-pane>
          </el-tabs>
          <div v-else class="video-preview-wrapper">
            <h4>动态封面</h4>
            <div class="video-container">
              <video 
                ref="videoRef"
                :src="currentRequest.dynamicCoverPath" 
                controls 
                muted 
                loop 
                class="dynamic-video"
                preload="metadata"
              ></video>
              <div class="video-controls">
                <acmetone-btn size="small" @click="openEnlargedVideo(currentRequest.dynamicCoverPath, false)">
                   放大查看
                </acmetone-btn>
              </div>
            </div>
            <div class="file-info-section">
              <h5>文件信息</h5>
              <div class="file-info-line">
                <div class="file-info-grid">
                  <span>{{ currentRequest.resolution }}</span> |
                  <span>{{ formatDuration(currentRequest.duration) }}</span> |
                  <span>{{ formatFileSize(currentRequest.fileSize) }}</span>
                </div>
                <acmetone-btn size="small" @click="downloadVideo(currentRequest.dynamicCoverPath, currentRequest.originalFilename)">下载</acmetone-btn>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 右侧：专辑信息和管理员操作 -->
        <div class="details-column">
          <div class="details-section">
            <h3 class="album-title">{{ currentRequest.albumTitle }}</h3>
            <p class="album-artist">{{ currentRequest.artistName }}</p>
          </div>

          <div class="details-section">
            <h5 class="details-section-title">申请详情</h5>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">申请ID</span>
                <span class="info-value">{{ currentRequest.id }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">申请人</span>
                <span class="info-value">{{ currentRequest.username }}</span>
              </div>
              <div class="info-item full-width">
                <span class="info-label">申请时间</span>
                <span class="info-value">{{ formatDate(currentRequest.createdAt) }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">目标平台</span>
                <img :src="platformIconMap[currentRequest.platform]" :alt="currentRequest.platform" class="platform-icon info-value" v-if="currentRequest.platform">
              </div>
              <div class="info-item">
                  <span class="info-label">当前状态</span>
                  <span :class="['status-badge', 'info-value', getStatusClass(currentRequest.status)]">
                      {{ getStatusText(currentRequest.status) }}
                  </span>
              </div>
            </div>
          </div>
          
          <div v-if="currentRequest.rejectionReason" class="details-section">
            <div class="notice-box rejected">
              <h5>上次拒绝原因</h5>
              <p>{{ currentRequest.rejectionReason }}</p>
            </div>
          </div>

          <!-- 管理员审核区域 -->
          <div class="details-section admin-actions">
            <h5 class="details-section-title">审核操作</h5>
            <el-form :model="reviewForm" label-position="top">
              <el-form-item label="更新状态">
                <el-select v-model="reviewForm.status" placeholder="请选择状态" class="full-width">
                  <el-option v-for="item in statusOptions" :key="item.value" :label="item.label" :value="item.value"/>
                </el-select>
              </el-form-item>
              <el-form-item v-if="reviewForm.status === 'rejected'" label="拒绝原因">
                <el-input v-model="reviewForm.rejectionReason" type="textarea" :rows="3" placeholder="请输入拒绝原因" />
              </el-form-item>
              <el-form-item label="管理员备注 (可选)">
                <el-input v-model="reviewForm.adminComment" type="textarea" :rows="3" placeholder="给用户的建议或内部备注" />
              </el-form-item>
            </el-form>
          </div>
        </div>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <acmetone-btn @click="submitReview" :disabled="submitting">提交审核</acmetone-btn>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, reactive } from 'vue';
import { ElMessage, ElMessageBox, ElLoading } from 'element-plus';
import { Search, ZoomIn } from '@element-plus/icons-vue';
import dynamicCoverService from '@/services/dynamicCoverService';
import { STATIC_BASE_URL } from '@/config';
import { ensureFullUrl, normalizeUrl } from '@/utils/urlHelper';
import { useUserStore } from '@/stores/user';
import VideoEnlargeViewer from '@/components/VideoEnlargeViewer.vue';
import AcmetoneBtn from '@/components/acmetone/AcmetoneBtn.vue';
import AcmetonePagination from '@/components/acmetone/AcmetonePagination.vue';

const userStore = useUserStore();
const loading = ref(false);
const requests = ref([]);
const filterStatus = ref('');
const searchQuery = ref('');
const currentPage = ref(1);
const pageSize = ref(10);
const detailsVisible = ref(false);
const currentRequest = ref(null);
const submitting = ref(false);
const isMobileView = ref(window.innerWidth < 768);
const activeTab = ref('square');
const showSafeZoneOverlay = ref(false);

// 放大查看视频状态
const enlargedVideo = reactive({
  show: false,
  src: '',
  isPortrait: false
});

// 切换安全区域显示
const toggleSafeZoneOverlay = () => {
  showSafeZoneOverlay.value = !showSafeZoneOverlay.value;
};

// 放大查看视频
const openEnlargedVideo = (src, isPortrait = false) => {
  enlargedVideo.src = src;
  enlargedVideo.isPortrait = isPortrait;
  enlargedVideo.show = true;
};

// 关闭放大查看
const closeEnlargedVideo = () => {
  enlargedVideo.show = false;
};

const reviewForm = ref({
  status: '',
  rejectionReason: '',
  adminComment: ''
});

const statusOptions = [
  { value: 'pending', label: '待审核' },
  { value: 'approved', label: '极音记审核通过' },
  { value: 'submitted', label: '已递交音乐平台' },
  { value: 'rejected', label: '被拒绝' }
];

const platformIconMap = {
  netease: '/网易云.svg',
  qqmusic: '/QQ音乐.svg',
  applemusic: '/applemusic.svg'
};

const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleString('zh-CN', { hour12: false });
};

const formatFileSize = (bytes) => {
  if (!bytes) return 'N/A';
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatDuration = (seconds) => {
  if (!seconds) return 'N/A';
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

const getStatusText = (status) => {
  const texts = {
    pending: '待审核',
    approved: '极音记审核通过',
    submitted: '已递交音乐平台',
    rejected: '被拒绝'
  };
  return texts[status] || status;
};

const getStatusClass = (status) => {
  const statusMap = {
    pending: 'status-pending',
    approved: 'status-approved',
    submitted: 'status-submitted',
    rejected: 'status-rejected',
  };
  return statusMap[status] || 'status-draft';
};

const totalItems = computed(() => filteredRequests.value.length);

const filteredRequests = computed(() => {
  let result = requests.value;
  if (filterStatus.value) {
    result = result.filter(item => item.status === filterStatus.value);
  }
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    result = result.filter(item => 
      item.albumTitle.toLowerCase().includes(query) ||
      (item.artistName && item.artistName.toLowerCase().includes(query)) ||
      (item.username && item.username.toLowerCase().includes(query))
    );
  }
  return result;
});

const loadData = async () => {
  loading.value = true;
  try {
    const response = await dynamicCoverService.getAdminAllDynamicCoverRequests();
    requests.value = response.data.map(item => {
      // 使用辅助函数处理所有URL路径
      if (item.albumCover) {
        item.albumCover = ensureFullUrl(item.albumCover);
      }
      if (item.dynamicCoverPath) {
        item.dynamicCoverPath = normalizeUrl(ensureFullUrl(item.dynamicCoverPath));
      }
      if (item.portraitCoverPath) {
        item.portraitCoverPath = normalizeUrl(ensureFullUrl(item.portraitCoverPath));
      }
      return item;
    });
  } catch (error) {
    console.error('获取申请列表失败:', error);
    ElMessage.error('获取申请列表失败');
  } finally {
    loading.value = false;
  }
};

const viewDetails = (row) => {
  currentRequest.value = { ...row };
  reviewForm.value = {
    status: row.status,
    rejectionReason: row.rejectionReason || '',
    adminComment: row.adminComment || ''
  };
  showSafeZoneOverlay.value = false; // 重置安全区域显示状态
  detailsVisible.value = true;
};

const submitReview = async () => {
  if (!currentRequest.value) return;
  submitting.value = true;
  try {
    const data = {
      status: reviewForm.value.status,
      rejectionReason: reviewForm.value.status === 'rejected' ? reviewForm.value.rejectionReason : '',
      adminComment: reviewForm.value.adminComment
    };
    await dynamicCoverService.updateDynamicCoverRequest(currentRequest.value.id, data);
    ElMessage.success('审核状态更新成功');
    detailsVisible.value = false;
    loadData();
  } catch (error) {
    console.error('审核失败:', error);
    ElMessage.error('审核失败');
  } finally {
    submitting.value = false;
  }
};

const downloadVideo = (url, filename) => {
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename || 'dynamic-cover.mp4');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const handleFooterDownload = () => {
  if (currentRequest.value) {
    if (currentRequest.value.platform === 'applemusic' && activeTab.value === 'portrait') {
      downloadVideo(currentRequest.value.portraitCoverPath, currentRequest.value.portraitOriginalFilename);
    } else {
      downloadVideo(currentRequest.value.dynamicCoverPath, currentRequest.value.originalFilename);
    }
  }
};

const handleFilterChange = () => {
  currentPage.value = 1;
};

const handleSearch = () => {
  currentPage.value = 1;
};

const handleSizeChange = (val) => {
  pageSize.value = val;
};

const handleCurrentChange = (val) => {
  currentPage.value = val;
};

const checkMobileView = () => {
  isMobileView.value = window.innerWidth < 768;
};

onMounted(() => {
  loadData();
  window.addEventListener('resize', checkMobileView);
});

watch(detailsVisible, (isVisible) => {
  if (!isVisible) {
    currentRequest.value = null;
  }
});
</script>

<style scoped>
/* Base styles from UserDynamicCovers.vue */
:root {
  --garrix-black: #1d1d1f;
  --garrix-white: #ffffff;
  --garrix-grey: #86868b;
  --garrix-light-grey: #f5f7fa;
  --garrix-border-grey: #d2d2d7;
  --garrix-text-primary: #1d1d1f;
  --garrix-text-secondary: #86868b;
}

.user-dynamic-covers {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
  font-family: sans-serif;
  background-color: var(--garrix-white);
}

.page-header {
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
  flex-wrap: wrap;
}

.garrix-input-wrapper {
  position: relative;
  border: 2px solid var(--garrix-black);
  background-color: var(--garrix-white);
  box-shadow: 4px 4px 0 rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
  flex: 1;
  min-width: 200px;
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

/* Table styling */
:deep(.el-table) {
  border-top: 1px solid var(--garrix-border-grey);
}
:deep(.el-table th) {
  color: var(--garrix-black);
  font-weight: 600;
}

/* Status badge */
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
.status-pending { color: #c78517; border-color: #F9A825; }
.status-approved { color: #2E7D32; border-color: #4CAF50; }
.status-submitted { color: #1565C0; border-color: #2196F3; }
.status-rejected { color: #C62828; border-color: #E53935; }

.platform-icon {
  height: 24px;
  width: 24px;
  object-fit: contain;
}

/* Dialog styling */
.dialog-layout {
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: 20px;
  align-items: start;
}
.preview-column { 
  /* The gap property is not needed here as it's not a flex or grid container */
  display: flex;
  height: auto;
}
.details-column{
  height: auto;
}
.video-preview-wrapper h4 { font-size: 14px; font-weight: 600;  height: 40px;}
.video-container { 
  width: 100%; 
  /* padding-bottom: 100%; removed to allow natural height */
}
.dynamic-video { width: 100%; height: 100%; }
.album-main-info { margin-bottom: 24px; }
.info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }

/* Tabs styling */
:deep(.el-tabs__header) {
  margin-bottom: 20px;
}
:deep(.el-tabs__item) {
  font-weight: 600;
  color: var(--garrix-text-secondary);
}
:deep(.el-tabs__item.is-active) {
  color: var(--garrix-text-primary);
}
:deep(.el-tabs__active-bar) {
  background-color: var(--garrix-black);
}

/* Admin-specific styles */
.admin-actions {
  margin-top: 24px;
  padding: 20px;
  border: 1px solid var(--garrix-border-grey);
  background-color: var(--garrix-light-grey);
}
.admin-actions-title { font-size: 14px; text-transform: uppercase; }

/* Mobile view */
@media (max-width: 768px) {
  .desktop-view { display: none; }
  .mobile-view { display: block; }
  .dialog-layout { grid-template-columns: 1fr; }
}

.request-card {
  border: 1px solid var(--garrix-border-grey);
}
.card-user {
  font-size: 12px;
  color: #86868b;
  margin-top: 4px;
}
.file-info-line {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-top: 8px;
}

/* Tabs styling */
:deep(.el-tabs__header) {
  margin-bottom: 20px;
}
.details-section {
  margin-bottom: 24px;
}
.details-section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--garrix-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--garrix-border-grey);
}
.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}
.info-item {
  display: flex;
  flex-direction: column;
}
.info-item.full-width {
  grid-column: span 2;
}
.info-label {
  font-size: 12px;
  color: var(--garrix-text-secondary);
  margin-bottom: 4px;
}
.info-value {
  font-size: 14px;
  font-weight: 500;
  color: var(--garrix-text-primary);
}
.status-badge.info-value {
  align-self: flex-start;
}
.platform-icon.info-value {
  height: 24px;
  width: auto;
  align-self: flex-start;
}
.notice-box {
  padding: 12px;
  border-left: 3px solid;
}
.notice-box h5 {
  margin: 0 0 4px;
  font-size: 13px;
  font-weight: 600;
}
.notice-box p {
  margin: 0;
  font-size: 13px;
}
.notice-box.rejected {
  background-color: rgba(229, 57, 53, 0.05);
  border-color: #E53935;
  color: #C62828;
}
:deep(.el-select.full-width) {
  width: 100%;
} 

/* 视频预览容器样式 */
.video-container {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  background-color: #000;
  margin-bottom: 16px;
  overflow: hidden;
}

.video-container.portrait {
  aspect-ratio: 3/4;
}

.dynamic-video {
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: #000;
}

.dynamic-video.portrait {
  aspect-ratio: 3/4;
}

/* 视频控制按钮 */
.video-controls {
  position: absolute;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 12px;
  z-index: 10;
}

/* 安全区域覆盖图样式 */
.safe-zone-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 5;
  background-image: url('/images/ui/cover-limit.jpg');
  background-size: cover;
  background-position: center;
  opacity: 0.7;
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

.card-artist {
  font-size: 14px;
  color: var(--garrix-text-secondary);
  margin: 0;
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
  
  /* 视频控制按钮在移动端的样式 */
  .video-controls {
    flex-direction: column;
    align-items: center;
    bottom: 10px;
  }
  
  /* 对话框在移动端的样式 */
  :deep(.details-dialog .el-dialog__body) {
    max-height: calc(100vh - 120px);
    padding: 16px;
  }
  
  :deep(.details-dialog .el-dialog) {
    max-height: 100vh;
    margin: 0;
    width: 100% !important;
    border-radius: 0;
  }
  
  .dialog-layout {
    grid-template-columns: 1fr;
    gap: 24px;
  }
  
  .preview-column {
    display: grid;
    grid-template-columns: 1fr;
    gap: 24px;
  }
  
  .details-column {
    padding-top: 16px;
    border-top: 1px solid var(--garrix-border-grey);
  }
  
  .info-grid {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 480px) {
  .user-dynamic-covers {
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
  
  .card-artist {
    font-size: 12px;
  }
  
  .card-info-row {
    font-size: 13px;
  }
  
  .card-label {
    font-size: 12px;
  }
  
  .info-grid {
    grid-template-columns: 1fr;
  }
  
  .preview-column {
    gap: 16px;
  }
  
  :deep(.details-dialog .el-dialog__header) {
    padding: 16px;
  }
  
  :deep(.details-dialog .el-dialog__body) {
    padding: 16px;
  }
  
  :deep(.details-dialog .el-dialog__footer) {
    padding: 16px;
  }
  
  :deep(.el-table) {
    font-size: 12px;
  }
}
</style> 