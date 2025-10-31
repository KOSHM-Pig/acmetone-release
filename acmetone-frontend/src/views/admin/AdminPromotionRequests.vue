<template>
  <div class="admin-promotion-requests">
    <div class="page-header">
      <h1>推广申请管理</h1>
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

        <!-- 右侧：申请详情和审核操作 -->
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

          <!-- 审核操作区域 -->
          <div class="review-section">
            <div class="current-status-info">
              <div class="status-flow-rules">
                <p><strong>状态流转规则：</strong></p>
                <ul>
                  <li>待审核 → 审核通过：平台初步审核通过，申请将移交给各音乐平台</li>
                  <li>审核通过 → 已收到推广资源：音乐平台反馈了推广资源，填写推广资源内容</li>
                  <li>待审核 → 已收到推广资源：直接标记为已收到推广资源（需填写推广资源内容）</li>
                </ul>
              </div>
            </div>
            
            <h4>审核决定</h4>
            <el-form :model="reviewForm" :rules="reviewRules" ref="reviewFormRef" @submit.prevent>
              <div class="form-group">
                <label>推广资源：</label>
                <el-input
                  v-model="reviewForm.promotionResources"
                  type="textarea"
                  :rows="4"
                  placeholder="请输入音乐平台反馈的推广资源内容"
                ></el-input>
                <p class="help-text">
                  {{ reviewForm.decision === 'approve' ? '可选填写初步推广资源信息' : '请填写音乐平台反馈的推广资源内容' }}
                </p>
              </div>

              <div class="decision-buttons">
                <acmetone-btn 
                  :class="{ active: reviewForm.decision === 'approve' }"
                  @click.prevent="reviewForm.decision = 'approve'"
                  type="button"
                >
                  审核通过
                </acmetone-btn>
                <acmetone-btn 
                  :class="{ active: reviewForm.decision === 'complete' }"
                  @click.prevent="reviewForm.decision = 'complete'"
                  type="button"
                >
                  标记为已收到推广资源
                </acmetone-btn>
              </div>

              <div class="review-actions">
                <acmetone-btn 
                  type="primary"
                  :disabled="!isReviewFormValid"
                  @click.prevent="submitReview"
                >
                  提交审核结果
                </acmetone-btn>
              </div>
            </el-form>
          </div>

          <!-- 已审核的结果 -->
          <div v-if="currentRequest && currentRequest.promotionResources" class="notice-box approved">
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
import { ref, computed, onMounted, onBeforeMount, onUnmounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Search, ArrowRight } from '@element-plus/icons-vue';
import AcmetoneBtn from '@/components/acmetone/AcmetoneBtn.vue';
import AcmetonePagination from '@/components/acmetone/AcmetonePagination.vue';
import promotionService from '@/services/promotionService';
import { normalizeUrl, ensureFullUrl } from '@/utils/urlHelper';
import { API_BASE_URL } from '@/config';

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
const reviewFormRef = ref(null);

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

// 审核表单
const reviewForm = ref({
  decision: '',
  promotionResources: ''
});

// 表单验证规则
const reviewRules = {
  decision: [
    { required: true, message: '请选择审核决定', trigger: 'change' }
  ],
  promotionResources: [
    { 
      required: true, 
      validator: (rule, value, callback) => {
        if (reviewForm.value.decision === 'complete' && (!value || value.trim() === '')) {
          callback(new Error('标记为已收到推广资源时，必须填写推广资源内容'));
        } else {
          callback();
        }
      },
      trigger: 'blur'
    }
  ]
};

// 检查表单是否有效
const isReviewFormValid = computed(() => {
  if (!reviewForm.value.decision) return false;
  
  if (reviewForm.value.decision === 'complete') {
    return !!reviewForm.value.promotionResources && reviewForm.value.promotionResources.trim() !== '';
  }
  
  return true;
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
  try {
    loading.value = true;
    
    const params = {
      status: filterStatus.value || 'all',
      page: currentPage.value,
      pageSize: pageSize.value
    };

    if (searchQuery.value) {
      params.search = searchQuery.value;
    }

    // 添加调试日志，显示API请求信息
    console.log('准备请求推广申请列表，参数:', params);
    console.log('API基础URL:', API_BASE_URL);

    const response = await promotionService.getAdminPromotionRequests(params);
    const data = response.data;
    
    // 处理返回的数据
    if (data.items) {
      // 如果返回的是分页格式的数据
      requests.value = data.items.map(item => {
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
      totalItems.value = data.total || requests.value.length;
    } else if (Array.isArray(data)) {
      // 如果返回的是数组格式的数据
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
      totalItems.value = data.length;
    } else {
      // 如果数据格式不符合预期
      console.error('API返回的数据格式不符合预期:', data);
      requests.value = [];
      totalItems.value = 0;
    }
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
  
  // 初始化审核表单
  if (row.status === 'pending') {
    reviewForm.value = {
      decision: '',
      promotionResources: ''
    };
  } else if (row.status === 'approved') {
    reviewForm.value = {
      decision: 'approve',
      promotionResources: row.promotionResources || ''
    };
  } else if (row.status === 'completed') {
    reviewForm.value = {
      decision: 'complete',
      promotionResources: row.promotionResources || ''
    };
  }
  
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

// 提交审核
const submitReview = async () => {
  if (!currentRequest.value || !isReviewFormValid.value) return;

  try {
    loading.value = true;
    
    let reviewData = {};
    
    // 处理状态流转逻辑
    if (reviewForm.value.decision === 'approve') {
      // 审核通过 - 平台初步审核
      reviewData = {
        status: 'approved',
        promotionResources: reviewForm.value.promotionResources
      };
      console.log('设置状态为已审核通过（平台初步审核）');
    } else if (reviewForm.value.decision === 'complete') {
      // 标记为已收到推广资源 - 音乐平台反馈了推广资源
      reviewData = {
        status: 'completed',
        promotionResources: reviewForm.value.promotionResources
      };
      console.log('设置状态为已收到推广资源（音乐平台反馈）');
    } else {
      ElMessage.error('无效的审核决定');
      loading.value = false;
      return;
    }
    
    // 如果状态没有变化，但推广资源内容变化了，也要允许提交
    if (reviewForm.value.decision === 'approve' && currentRequest.value.status === 'approved') {
      // 只更新推广资源内容
      console.log('更新已批准申请的推广资源内容');
    } else if (reviewForm.value.decision === 'complete' && currentRequest.value.status === 'completed') {
      // 只更新推广资源内容
      console.log('更新已完成申请的推广资源内容');
    }
    
    await promotionService.reviewPromotionRequest(currentRequest.value.id, reviewData);
    
    ElMessage.success('审核结果已提交');
    detailsVisible.value = false;
    await loadData();
  } catch (error) {
    console.error('提交审核结果失败:', error);
    
    // 提取后端返回的具体错误信息
    const errorMessage = error.response?.data?.message || '提交失败，请重试';
    ElMessage.error(errorMessage);
  } finally {
    loading.value = false;
  }
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

.admin-promotion-requests {
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

/* 审核操作区域样式 */
.review-section {
  padding: 16px;
  background-color: var(--garrix-light-grey);
  border: 1px solid var(--garrix-border-grey);
}

.review-section h4 {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 16px;
  color: var(--garrix-text-primary);
}

.current-status-info {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--garrix-border-grey);
}

.status-label {
  font-size: 14px;
  color: var(--garrix-text-secondary);
  font-weight: 600;
}

.status-note {
  font-size: 12px;
  color: var(--garrix-text-secondary);
  margin: 0;
  flex-basis: 100%;
  margin-top: 8px;
  font-style: italic;
}

.status-flow-rules {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--garrix-border-grey);
}

.status-flow-rules p {
  margin: 0 0 8px;
  font-size: 13px;
  color: var(--garrix-text-secondary);
}

.status-flow-rules ul {
  padding-left: 20px;
  margin: 0;
  list-style-type: disc;
}

.status-flow-rules li {
  font-size: 13px;
  color: var(--garrix-text-secondary);
  margin-bottom: 4px;
}

.decision-buttons {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.decision-buttons :deep(.acmetone-btn) {
  flex: 1;
  justify-content: center;
}

.decision-buttons :deep(.acmetone-btn.active) {
  background-color: var(--garrix-black);
  color: var(--garrix-white);
}

.review-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: var(--garrix-text-primary);
}

.help-text {
  margin-top: 5px;
  font-size: 12px;
  color: var(--garrix-text-secondary);
  font-style: italic;
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
  
  .decision-buttons {
    flex-direction: column;
  }
}

@media (max-width: 480px) {
  .admin-promotion-requests {
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
  
  
  .album-info {
    margin-bottom: 15px;
  }
  
  .request-status {
    text-align: left;
  }

</style> 