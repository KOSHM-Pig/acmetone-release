<template>
  <div class="user-dynamic-covers">
    <div class="page-header">
      <h1>我的动态封面申请</h1>
      <div class="header-actions">
        <router-link to="/services/dynamic-cover-request">
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
        <el-table-column label="专辑名称" prop="albumTitle" min-width="200" show-overflow-tooltip />
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
              <template v-else-if="scope.row.targetPlatforms">
                  <img 
                      v-for="platform in scope.row.targetPlatforms.split(',')" 
                      :key="platform"
                      :src="platformIconMap[platform.trim()] || '/logo-placeholder.svg'" 
                      :alt="platform.trim()"
                      class="platform-icon"
                  />
              </template>
            </div>
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
      title="动态封面申请详情"
      :width="isMobileView ? '95%' : '800px'"
      destroy-on-close
      class="details-dialog"
      :append-to-body="true"
      :fullscreen="isMobileView"
    >
      <div v-if="currentRequest" class="dialog-layout" :class="{'mobile-layout': isMobileView}">
        <!-- 左侧：封面预览和文件信息 -->
        <div class="preview-column">
          <div class="video-preview-wrapper">
            <h4>正方形封面 (1:1)</h4>
            <div class="video-container">
              <video 
                :src="currentRequest.dynamicCoverPath" 
                controls 
                muted 
                loop 
                class="dynamic-video"
                preload="metadata"
              ></video>
            </div>
            <div class="file-info-section">
              <h5>文件信息</h5>
              <div class="file-info-grid">
                <span>{{ currentRequest.resolution }}</span>
                <span>{{ formatDuration(currentRequest.duration) }}</span>
                <span>{{ formatFileSize(currentRequest.fileSize) }}</span>
              </div>
            </div>
          </div>
          
          <div v-if="currentRequest.platform === 'applemusic' && currentRequest.portraitCoverPath" class="video-preview-wrapper">
            <h4>竖版封面 (3:4)</h4>
            <div class="video-container">
              <video 
                :src="currentRequest.portraitCoverPath" 
                controls 
                muted 
                loop 
                class="dynamic-video"
                preload="metadata"
              ></video>
            </div>
            <div class="file-info-section">
              <h5>文件信息</h5>
              <div class="file-info-grid">
                <span>{{ currentRequest.portraitResolution }}</span>
                <span>{{ formatDuration(currentRequest.portraitDuration) }}</span>
                <span>{{ formatFileSize(currentRequest.portraitFileSize) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 右侧：专辑信息和管理员操作 -->
        <div class="details-column">
          <div class="album-main-info">
            <h3 class="album-title">{{ currentRequest.albumTitle }}</h3>
            <p class="album-artist">{{ currentRequest.artistName }}</p>
          </div>

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
            <div class="info-item">
              <span class="info-label">目标平台</span>
              <img :src="platformIconMap[currentRequest.platform]" :alt="currentRequest.platform" class="platform-icon" v-if="currentRequest.platform">
            </div>
          </div>
          
          <div v-if="currentRequest.status === 'rejected'" class="notice-box rejected">
            <template v-if="currentRequest.rejectionReason">
            <h5>拒绝原因</h5>
            <p>{{ currentRequest.rejectionReason }}</p>
            </template>
            <div class="resubmit-actions" :style="{ marginTop: currentRequest.rejectionReason ? '15px' : '0' }">
              <acmetone-btn @click="handleResubmit">重新提交审核</acmetone-btn>
              <template v-if="currentRequest.platform === 'applemusic'">
                <acmetone-btn @click="handleReuploadSquare">更换正方形视频 (1:1)</acmetone-btn>
                <acmetone-btn @click="handleReuploadPortrait">更换竖版视频 (3:4)</acmetone-btn>
              </template>
            </div>
          </div>

          <div v-if="currentRequest.adminComment" class="notice-box admin-comment">
            <h5>管理员备注</h5>
            <p>{{ currentRequest.adminComment }}</p>
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
import { ref, computed, onMounted, watch, onBeforeMount } from 'vue';
import { ElMessage, ElMessageBox, ElLoading } from 'element-plus';
import { Search, Plus } from '@element-plus/icons-vue';
import { useRouter } from 'vue-router';
import dynamicCoverService from '@/services/dynamicCoverService';
import { STATIC_BASE_URL } from '@/config';
import { useUserStore } from '@/stores/user';
import AcmetoneBtn from '@/components/acmetone/AcmetoneBtn.vue';
import AcmetonePagination from '@/components/acmetone/AcmetonePagination.vue';
import { ensureFullUrl, normalizeUrl } from '@/utils/urlHelper';
import VideoEnlargeViewer from '@/components/VideoEnlargeViewer.vue';

const router = useRouter();
const userStore = useUserStore(); // Initialize userStore
const loading = ref(false);
const requests = ref([]);
const filterStatus = ref('');
const searchQuery = ref('');
const currentPage = ref(1);
const pageSize = ref(10);
const totalItems = ref(0);
const detailsVisible = ref(false);
const currentRequest = ref(null);
const adminComment = ref('');
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

onMounted(() => {
  loadData();
});

// 在组件销毁前移除事件监听
const onUnmounted = () => {
  window.removeEventListener('resize', checkMobileView);
};

// 状态选项
const statusOptions = [
  { value: 'pending', label: '待审核' },
  { value: 'approved', label: '极音记审核通过' },
  { value: 'submitted', label: '已递交音乐平台' },
  { value: 'rejected', label: '被拒绝' }
];

// 平台图标映射
const platformIconMap = {
  netease: '/网易云.svg',
  qqmusic: '/QQ音乐.svg',
  applemusic: '/applemusic.svg',
  '网易云音乐': '/网易云.svg',
  'QQ音乐': '/QQ音乐.svg',
  'Apple Music': '/applemusic.svg',
  '酷狗音乐': '/酷狗音乐.svg',
  '酷我音乐': '/酷我音乐.svg',
  '汽水音乐': '/汽水音乐.svg',
  'Spotify': '/Spotify.svg',
  'YouTube': '/youtube.svg',
  'SoundCloud': '/soundcloud.svg'
};

// 格式化日期
const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// 格式化文件大小
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// 格式化时长
const formatDuration = (seconds) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

// 获取状态类型
const getStatusType = (status) => {
  const types = {
    pending: 'warning',
    approved: 'success',
    submitted: 'info',
    rejected: 'danger'
  };
  return types[status] || 'info';
};

// 获取状态文本
const getStatusText = (status) => {
  const texts = {
    pending: '待审核',
    approved: '极音记审核通过',
    submitted: '已递交音乐平台',
    rejected: '被拒绝'
  };
  return texts[status] || status;
};

// Function to get status class for styling
const getStatusClass = (status) => {
  const statusMap = {
    pending: 'status-pending',
    approved: 'status-approved',
    submitted: 'status-submitted',
    rejected: 'status-rejected',
  };
  return statusMap[status] || 'status-draft';
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
      item.albumTitle.toLowerCase().includes(query) || 
      (item.artistName && item.artistName.toLowerCase().includes(query))
    );
  }
  
  return result;
});

// 加载数据
const loadData = async () => {
  loading.value = true;
  try {
    const response = await dynamicCoverService.getUserDynamicCoverRequests();
    // 处理视频和图片路径
    requests.value = response.data.map(item => {
      // 使用辅助函数处理所有URL路径
      if (item.albumCover) {
        item.albumCover = ensureFullUrl(item.albumCover);
      }
      if (item.dynamicCoverPath) {
        item.dynamicCoverPath = normalizeUrl(ensureFullUrl(item.dynamicCoverPath));
      }
      // 处理苹果音乐竖版封面路径
      if (item.portraitCoverPath) {
        item.portraitCoverPath = normalizeUrl(ensureFullUrl(item.portraitCoverPath));
      }
      return item;
    });
    totalItems.value = response.data.length;
  } catch (error) {
    console.error('获取申请列表失败:', error);
    ElMessage.error('获取申请列表失败');
  } finally {
    loading.value = false;
  }
};

// 查看详情
const viewDetails = (row) => {
  // 使用辅助函数处理所有URL路径
  const rowCopy = { ...row };
  if (rowCopy.albumCover) {
    rowCopy.albumCover = ensureFullUrl(rowCopy.albumCover);
  }
  if (rowCopy.dynamicCoverPath) {
    rowCopy.dynamicCoverPath = normalizeUrl(ensureFullUrl(rowCopy.dynamicCoverPath));
  }
  // 处理苹果音乐竖版封面路径
  if (rowCopy.portraitCoverPath) {
    rowCopy.portraitCoverPath = normalizeUrl(ensureFullUrl(rowCopy.portraitCoverPath));
  }
  currentRequest.value = rowCopy;
  detailsVisible.value = true;
};

// 重新申请
const reapply = (row) => {
  ElMessageBox.confirm(
    '确定要重新提交此动态封面申请吗？',
    '重新申请',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(() => {
    // 跳转到申请页面，并传递专辑ID
    router.push({
      path: '/services/dynamic-cover-request',
      query: { albumId: row.albumId }
    });
  }).catch(() => {
    // 用户取消操作
  });
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

const handleApproveRequest = async () => {
    if (!currentRequest.value) return;
    try {
        await dynamicCoverService.updateDynamicCoverRequest(currentRequest.value.id, {
            status: 'approved',
            comment: adminComment.value || '审核通过'
        });
        ElMessage.success('操作成功');
        detailsVisible.value = false;
        loadData();
    } catch (error) {
        ElMessage.error('操作失败');
    }
};

const handleRejectRequest = async () => {
    if (!currentRequest.value) return;
    if (!adminComment.value) {
        ElMessage.warning('请输入拒绝理由');
        return;
    }
    try {
        await dynamicCoverService.updateDynamicCoverRequest(currentRequest.value.id, {
            status: 'rejected',
            comment: adminComment.value
        });
        ElMessage.success('操作成功');
        detailsVisible.value = false;
        loadData();
    } catch (error) {
        ElMessage.error('操作失败');
    }
};

// 重新上传视频
const handleReupload = () => {
  if (!currentRequest.value) return;
  
  // 保存当前请求ID，然后导航到动态封面请求页面
  const requestId = currentRequest.value.id;
  const albumId = currentRequest.value.albumId;
  const platform = currentRequest.value.platform;
  
  // 关闭详情对话框
  detailsVisible.value = false;
  
  // 导航到动态封面请求页面，并传递相关参数
  router.push({
    path: '/services/dynamic-cover-request',
    query: {
      albumId,
      platform,
      resubmitId: requestId
    }
  });
};

// 重新上传正方形视频 (1:1)
const handleReuploadSquare = () => {
  if (!currentRequest.value) return;
  
  const requestId = currentRequest.value.id;
  const albumId = currentRequest.value.albumId;
  const platform = currentRequest.value.platform;
  
  detailsVisible.value = false;
  
  router.push({
    path: '/services/dynamic-cover-request',
    query: {
      albumId,
      platform,
      resubmitId: requestId,
      replace_type: 'square'
    }
  });
};

// 重新上传竖版视频 (3:4)
const handleReuploadPortrait = () => {
  if (!currentRequest.value) return;
  
  const requestId = currentRequest.value.id;
  const albumId = currentRequest.value.albumId;
  const platform = currentRequest.value.platform;
  
  detailsVisible.value = false;
  
  router.push({
    path: '/services/dynamic-cover-request',
    query: {
      albumId,
      platform,
      resubmitId: requestId,
      replace_type: 'portrait'
    }
  });
};

// 重新提交审核
const handleResubmit = async () => {
  if (!currentRequest.value) return;
  
  try {
    // 确认对话框
    await ElMessageBox.confirm(
      '确定要重新提交此动态封面申请进行审核吗？',
      '重新提交确认',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
    );
    
    // 调用API重新提交审核
    const response = await dynamicCoverService.resubmitDynamicCoverRequest(currentRequest.value.id);
    
    ElMessage.success('申请已重新提交审核');
    detailsVisible.value = false;
    
    // 重新加载数据
    loadData();
  } catch (error) {
    if (error !== 'cancel') {
      console.error('重新提交失败:', error);
      ElMessage.error('重新提交失败: ' + (error.response?.data?.message || error.message || '未知错误'));
    }
    }
};

// Reset admin comment when dialog opens
watch(detailsVisible, (isVisible) => {
  if (isVisible && currentRequest.value) {
    adminComment.value = currentRequest.value.adminComment || '';
  }
});


onMounted(() => {
  loadData();
});
</script>

<style scoped>
/* Keeping the base styles and variables from before */
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

/* Remove old filter styles */
:deep(.filter-bar .el-input__wrapper),
:deep(.filter-bar .el-select .el-input__wrapper) {
  border: none;
  background-color: transparent;
  padding: 5px 15px;
  height: 44px;
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

.status-submitted {
  color: #1565C0;
  border-color: #2196F3;
}

.status-rejected {
  color: #C62828;
  border-color: #E53935;
}
.platform-icon {
  height: 20px;
  width: 20px;
  object-fit: contain;
}

/* Details Dialog Styling */
:deep(.details-dialog .el-dialog__body) {
  padding: 24px;
  overflow: auto;
  max-height: calc(90vh - 120px); /* 减去标题和底部的高度 */
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

/* 视频控制按钮样式优化 */
.dynamic-video::-webkit-media-controls-panel {
  background-color: rgba(0, 0, 0, 0.5);
}

/* 移动端优化 */
@media (max-width: 768px) {
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
}

.dialog-layout {
  display: grid;
  grid-template-columns: 350px 1fr;
  gap: 30px;
}

/* Preview Column */
.preview-column {
  display: flex;
  flex-direction: column;
  gap: 30px;
}
.video-preview-wrapper h4 {
  font-size: 14px;
  font-weight: 600;
  margin: 0 0 10px;
  color: var(--garrix-text-secondary);
}
.video-container {
  position: relative;
  width: 100%;
  height: 0;
  padding-bottom: 100%; /* 1:1 aspect ratio */
  background-color: #000; /* Ensure background is black for video */
  border-radius: 0;
  border: 1px solid var(--garrix-border-grey);
  overflow: hidden;
}

/* 为竖版视频添加特殊样式 */
.video-preview-wrapper:nth-child(2) .video-container {
  padding-bottom: 133.33%; /* 3:4 aspect ratio */
}

.dynamic-video {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: contain; /* Ensure video fits within the container */
  background-color: #000; /* 确保视频背景是黑色 */
}

/* Details Column */
.album-main-info {
  margin-bottom: 24px;
  border-bottom: 2px solid var(--garrix-border-grey);
  padding-bottom: 16px;
}
.album-title {
  font-size: 24px;
  font-weight: 700;
  margin: 0 0 8px;
  color: var(--garrix-text-primary);
}
.album-artist {
  font-size: 16px;
  color: var(--garrix-text-secondary);
  margin: 0;
}

.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  padding-bottom: 16px;
  margin-bottom: 16px;
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
.info-item .platform-icon {
  height: 24px;
  width: 24px;
}

.file-info-section {
  margin-top: 12px;
}
.file-info-section h5 {
  font-size: 14px;
  font-weight: 600;
  margin: 0 0 8px;
  color: var(--garrix-text-primary);
}
.file-info-grid {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: var(--garrix-text-secondary);
}

.notice-box {
  padding: 16px;
  border-left: 3px solid;
  margin-bottom: 16px;
}
.notice-box h5 {
  margin: 0 0 8px;
  font-size: 14px;
  font-weight: 700;
}
.notice-box p {
  margin: 0;
  font-size: 14px;
}
.notice-box.rejected {
  background-color: rgba(229, 57, 53, 0.05);
  border-color: var(--garrix-danger);
  color: #C62828;
}
.notice-box.admin-comment {
  background-color: rgba(138, 145, 159, 0.05);
  border-color: var(--garrix-grey);
  color: #546E7A;
}

/* Responsive adjustments */
@media (max-width: 992px) {
  .dialog-layout {
    grid-template-columns: 300px 1fr;
    gap: 20px;
  }
}

@media (max-width: 768px) {
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
  
  :deep(.details-dialog .el-dialog) {
    width: 95% !important;
    max-width: 100%;
    margin: 10px auto;
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
  
  :deep(.el-table .el-table__cell) {
    padding: 8px;
  }
}

@media (max-width: 480px) {
  .user-dynamic-covers {
    padding: 16px 12px;
  }
  
  .info-grid {
    grid-template-columns: 1fr;
  }
  
  .admin-buttons {
    flex-direction: column;
    gap: 12px;
  }
  
  .admin-buttons :deep(.acmetone-btn) {
    width: 100%;
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

.resubmit-actions {
  display: flex;
  gap: 10px;
  margin-top: 15px;
  flex-direction: column;
  align-items: stretch;
}

.notice-box.rejected .resubmit-actions :deep(.acmetone-btn) {
  font-size: 12px;
  padding: 6px 12px;
  margin-bottom: 8px;
}

@media (min-width: 768px) {
  .resubmit-actions {
    flex-direction: row;
    flex-wrap: wrap;
}
  
  .notice-box.rejected .resubmit-actions :deep(.acmetone-btn) {
    margin-bottom: 0;
  }
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
}
</style> 