<template>
  <div class="admin-labels-container">
    <!-- 顶部标题区域 -->
    <div class="header-section">
      <h1 class="main-title">厂牌申请审核</h1>
      <div class="header-stats">
        <div class="stat-item">
          <span class="stat-number">{{ totalCount }}</span>
          <span class="stat-label">总申请数</span>
        </div>
        <div class="stat-item">
          <span class="stat-number">{{ pendingCount }}</span>
          <span class="stat-label">待审核</span>
        </div>
      </div>
    </div>

    <!-- 调试信息 -->
    <div v-if="true" style="background: #f0f0f0; padding: 10px; margin: 10px 0; border-radius: 4px; font-size: 12px;">
      <strong>调试信息:</strong><br>
      加载状态: {{ loading }}<br>
      原始数据数量: {{ labels.length }}<br>
      过滤后数据数量: {{ filteredLabels.length }}<br>
      当前筛选状态: {{ filterStatus }}<br>
      搜索关键词: {{ searchQuery }}<br>
      是否移动端: {{ isMobileView }}<br>
      <button @click="testAPI" style="margin-top: 5px; padding: 5px 10px;">测试API</button>
      <button @click="loadData" style="margin-top: 5px; padding: 5px 10px;">重新加载</button>
    </div>

    <!-- 筛选栏 -->
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
          placeholder="搜索厂牌名称"
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
      <div v-if="!loading && filteredLabels.length === 0" class="empty-state">
        <p>暂无厂牌申请记录</p>
        <p v-if="labels.length === 0">请先添加一些测试数据</p>
      </div>
      <el-table
        v-else
        v-loading="loading"
        :data="filteredLabels"
        style="width: 100%"
        row-key="id"
        empty-text="暂无厂牌申请记录"
      >
        <el-table-column label="申请ID" prop="id" width="80" />
        <el-table-column label="厂牌中文名" prop="chineseName" min-width="150" show-overflow-tooltip />
        <el-table-column label="厂牌英文名" prop="englishName" min-width="150" show-overflow-tooltip />
        <el-table-column label="申请用户" width="120">
          <template #default="scope">
            {{ scope.row.user?.username || '未知用户' }}
          </template>
        </el-table-column>
        <el-table-column label="申请时间" width="180">
          <template #default="scope">
            {{ formatDate(scope.row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="120">
          <template #default="scope">
            <span :class="['status-badge', getStatusClass(scope.row.status)]">
              {{ getStatusText(scope.row.status) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="scope">
            <AcmetoneBtn size="small" @click="viewDetails(scope.row)">审核</AcmetoneBtn>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 移动端卡片视图 -->
    <div class="mobile-view" v-if="isMobileView">
      <div v-if="loading" class="loading-container">
        <el-loading :fullscreen="false" />
      </div>
      <div v-else-if="filteredLabels.length === 0" class="empty-state">
        暂无厂牌申请记录
      </div>
      <div v-else class="label-cards">
        <div 
          v-for="item in filteredLabels" 
          :key="item.id" 
          class="label-card"
          @click="viewDetails(item)"
        >
          <div class="card-header">
            <div class="card-header-info">
              <h3 class="card-title">{{ item.chineseName }}</h3>
              <p class="card-subtitle">{{ item.englishName }}</p>
            </div>
          </div>
          <div class="card-body">
            <div class="card-info-row">
              <span class="card-label">申请ID</span>
              <span class="card-value">{{ item.id }}</span>
            </div>
            <div class="card-info-row">
              <span class="card-label">申请用户</span>
              <span class="card-value">{{ item.user?.username || '未知用户' }}</span>
            </div>
            <div class="card-info-row">
              <span class="card-label">申请时间</span>
              <span class="card-value">{{ formatDate(item.created_at) }}</span>
            </div>
            <div class="card-info-row">
              <span class="card-label">状态</span>
              <span :class="['status-badge', getStatusClass(item.status)]">
                {{ getStatusText(item.status) }}
              </span>
            </div>
          </div>
          <div class="card-footer">
            <AcmetoneBtn size="small">审核</AcmetoneBtn>
          </div>
        </div>
      </div>
    </div>

    <!-- 分页 -->
    <div class="pagination-container" v-if="totalCount > 0">
      <AcmetonePagination
        :current-page="currentPage"
        :page-size="pageSize"
        :total="totalCount"
        @current-change="handleCurrentChange"
        @size-change="handleSizeChange"
      />
    </div>

    <!-- 审核抽屉 -->
    <div class="garrix-drawer" :class="{ 'visible': drawerVisible }">
      <div class="drawer-backdrop" @click="closeDrawer"></div>
      <div class="drawer-panel">
        <!-- 头部 -->
        <div class="drawer-header">
          <div class="header-info">
            <div class="label-id">{{ currentLabel?.id || '' }}</div>
            <div class="label-name">{{ currentLabel?.chineseName || '' }}</div>
          </div>
          <button class="close-btn" @click="closeDrawer">×</button>
        </div>

        <!-- 内容 -->
        <div class="drawer-content" v-if="currentLabel">
          <!-- 厂牌信息 -->
          <div class="label-info-section">
            <h3>厂牌信息</h3>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">中文名称</span>
                <span class="info-value">{{ currentLabel.chineseName }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">英文名称</span>
                <span class="info-value">{{ currentLabel.englishName }}</span>
              </div>
              <div class="info-item" v-if="currentLabel.description">
                <span class="info-label">厂牌描述</span>
                <span class="info-value">{{ currentLabel.description }}</span>
              </div>
              <div class="info-item" v-if="currentLabel.website">
                <span class="info-label">官方网站</span>
                <a :href="currentLabel.website" target="_blank" class="info-value link">{{ currentLabel.website }}</a>
              </div>
              <div class="info-item" v-if="currentLabel.contactEmail">
                <span class="info-label">联系邮箱</span>
                <span class="info-value">{{ currentLabel.contactEmail }}</span>
              </div>
              <div class="info-item" v-if="currentLabel.contactQqgroup">
                <span class="info-label">联系QQ群</span>
                <span class="info-value">{{ currentLabel.contactQqgroup }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">申请用户</span>
                <span class="info-value">{{ currentLabel.user?.username || '未知用户' }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">申请时间</span>
                <span class="info-value">{{ formatDate(currentLabel.createdAt) }}</span>
              </div>
            </div>
          </div>

          <!-- 审核操作 -->
          <div class="review-section" v-if="currentLabel.status === 'pending'">
            <h3>审核操作</h3>
            <div class="review-form">
              <div class="form-group">
                <label>审核备注</label>
                <el-input
                  v-model="reviewComment"
                  type="textarea"
                  :rows="4"
                  placeholder="请输入审核备注..."
                />
              </div>
              <div class="review-actions">
                <AcmetoneBtn 
                  type="success" 
                  @click="approveLabel"
                  :loading="reviewing"
                >
                  通过申请
                </AcmetoneBtn>
                <AcmetoneBtn 
                  type="danger" 
                  @click="rejectLabel"
                  :loading="reviewing"
                >
                  拒绝申请
                </AcmetoneBtn>
              </div>
            </div>
          </div>

          <!-- 已审核信息 -->
          <div class="reviewed-section" v-else>
            <h3>审核结果</h3>
            <div class="review-result">
              <div class="result-status" :class="getStatusClass(currentLabel.status)">
                {{ getStatusText(currentLabel.status) }}
              </div>
              <div class="result-info" v-if="currentLabel.verifiedAt">
                <p><strong>审核时间：</strong>{{ formatDate(currentLabel.verifiedAt) }}</p>
                <p v-if="currentLabel.reviewComment"><strong>审核备注：</strong>{{ currentLabel.reviewComment }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import AcmetoneBtn from '@/components/acmetone/AcmetoneBtn.vue';
import AcmetonePagination from '@/components/acmetone/AcmetonePagination.vue';
import labelService from '@/services/labelService';
import { Search } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';

// 响应式数据
const loading = ref(true);
const labels = ref([]);
const totalCount = ref(0);
const currentPage = ref(1);
const pageSize = ref(20);
const filterStatus = ref('');
const searchQuery = ref('');
const drawerVisible = ref(false);
const currentLabel = ref(null);
const reviewComment = ref('');
const reviewing = ref(false);

// 状态选项
const statusOptions = [
  { value: 'pending', label: '待审核' },
  { value: 'active', label: '已激活' },
  { value: 'inactive', label: '已停用' }
];

// 计算属性
const isMobileView = computed(() => {
  return window.innerWidth <= 768;
});

const filteredLabels = computed(() => {
  let result = labels.value;
  
  if (filterStatus.value) {
    result = result.filter(label => label.status === filterStatus.value);
  }
  
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    result = result.filter(label =>
      label.chineseName.toLowerCase().includes(query) ||
      label.englishName.toLowerCase().includes(query) ||
      (label.user?.username || '').toLowerCase().includes(query)
    );
  }
  
  return result;
});

const pendingCount = computed(() => {
  return labels.value.filter(label => label.status === 'pending').length;
});

// 测试API连接
const testAPI = async () => {
  try {
    console.log('测试API连接...');

    // 先测试健康检查端点
    const healthResponse = await fetch('/api/admin/labels/health');
    console.log('健康检查响应状态:', healthResponse.status);
    const healthData = await healthResponse.json();
    console.log('健康检查数据:', healthData);

    // 再测试实际的数据端点
    const response = await fetch('/api/admin/labels', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('API响应状态:', response.status);
    const data = await response.json();
    console.log('API响应数据:', data);

    if (response.ok) {
      ElMessage.success('API连接正常');
    } else {
      ElMessage.error(`API错误: ${data.message || '未知错误'}`);
    }
  } catch (error) {
    console.error('API测试失败:', error);
    ElMessage.error('API连接失败');
  }
};

// 加载数据
const loadData = async (retryCount = 0) => {
  try {
    loading.value = true;
    console.log('开始加载厂牌数据...', { page: currentPage.value, pageSize: pageSize.value });

    const response = await labelService.getAdminLabels({
      page: currentPage.value,
      pageSize: pageSize.value
    });

    console.log('厂牌数据响应:', response);

    if (response && response.data) {
      labels.value = response.data.labels || [];
      totalCount.value = response.data.total || 0;
      console.log('设置厂牌数据:', { labelsCount: labels.value.length, total: totalCount.value });
    } else {
      console.warn('响应数据格式异常:', response);
      labels.value = [];
      totalCount.value = 0;
    }
  } catch (error) {
    console.error('获取厂牌列表失败:', error);

    // 如果是网络错误且重试次数少于3次，则自动重试
    if (retryCount < 3 && (error.code === 'NETWORK_ERROR' || error.response?.status >= 500)) {
      console.log(`正在重试... (${retryCount + 1}/3)`);
      setTimeout(() => {
        loadData(retryCount + 1);
      }, 1000 * (retryCount + 1)); // 递增延迟
      return;
    }

    ElMessage.error('获取厂牌列表失败');
    labels.value = [];
    totalCount.value = 0;
  } finally {
    loading.value = false;
  }
};

// 查看详情
const viewDetails = (label) => {
  currentLabel.value = label;
  reviewComment.value = '';
  drawerVisible.value = true;
};

// 关闭抽屉
const closeDrawer = () => {
  drawerVisible.value = false;
  currentLabel.value = null;
  reviewComment.value = '';
};

// 通过申请
const approveLabel = async () => {
  try {
    reviewing.value = true;
    await labelService.reviewLabel(currentLabel.value.id, {
      status: 'active',
      comment: reviewComment.value
    });

    ElMessage.success('厂牌申请已通过');
    closeDrawer();
    loadData();
  } catch (error) {
    console.error('审核失败:', error);
    ElMessage.error('审核失败');
  } finally {
    reviewing.value = false;
  }
};

// 拒绝申请
const rejectLabel = async () => {
  try {
    reviewing.value = true;
    await labelService.reviewLabel(currentLabel.value.id, {
      status: 'inactive',
      comment: reviewComment.value
    });

    ElMessage.success('厂牌申请已拒绝');
    closeDrawer();
    loadData();
  } catch (error) {
    console.error('审核失败:', error);
    ElMessage.error('审核失败');
  } finally {
    reviewing.value = false;
  }
};

// 获取状态样式类
const getStatusClass = (status) => {
  const statusMap = {
    pending: 'status-pending',
    active: 'status-active',
    inactive: 'status-inactive'
  };
  return statusMap[status] || 'status-pending';
};

// 获取状态文本
const getStatusText = (status) => {
  const statusMap = {
    pending: '待审核',
    active: '已激活',
    inactive: '已停用'
  };
  return statusMap[status] || '未知状态';
};

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

// 处理筛选变化
const handleFilterChange = () => {
  currentPage.value = 1;
};

// 处理搜索
const handleSearch = () => {
  currentPage.value = 1;
};

// 处理页码变化
const handleCurrentChange = (val) => {
  currentPage.value = val;
  loadData();
};

// 处理每页显示数量变化
const handleSizeChange = (val) => {
  pageSize.value = val;
  currentPage.value = 1;
  loadData();
};

// 监听页码变化
watch([currentPage, pageSize], () => {
  loadData();
});

// 用于取消请求的控制器
let abortController = null;

// 重置组件状态
const resetComponentState = () => {
  loading.value = false;
  labels.value = [];
  totalCount.value = 0;
  currentPage.value = 1;
  filterStatus.value = '';
  searchQuery.value = '';
  drawerVisible.value = false;
  currentLabel.value = null;
  reviewComment.value = '';
  reviewing.value = false;
};

// 组件挂载时加载数据
onMounted(() => {
  console.log('AdminLabels组件已挂载');
  loadData();
});

// 组件卸载时清理
onUnmounted(() => {
  console.log('AdminLabels组件正在卸载');
  // 取消正在进行的请求
  if (abortController) {
    abortController.abort();
  }
  // 重置状态
  resetComponentState();
});
</script>

<style scoped>
/* 基础样式 */
.admin-labels-container {
  padding: 24px;
  background: var(--garrix-white, #ffffff);
  min-height: 100vh;
}

.header-section {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 32px;
}

.main-title {
  font-size: 32px;
  font-weight: 700;
  color: var(--garrix-black, #000000);
  margin: 0;
  font-family: 'Montserrat', sans-serif;
}

.header-stats {
  display: flex;
  gap: 32px;
}

.stat-item {
  text-align: center;
}

.stat-number {
  display: block;
  font-size: 24px;
  font-weight: 700;
  color: var(--garrix-black, #000000);
}

.stat-label {
  font-size: 12px;
  color: var(--garrix-gray, #666666);
  text-transform: uppercase;
}

.filter-bar {
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
}

.garrix-input-wrapper {
  min-width: 200px;
}

/* 表格样式 */
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
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  display: inline-block;
  min-width: 80px;
  text-align: center;
}

.status-pending {
  background: #fff3cd;
  color: #856404;
  border: 1px solid #ffeaa7;
}

.status-active {
  background: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.status-inactive {
  background: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}

/* 移动端卡片样式 */
.label-cards {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.label-card {
  background: var(--garrix-white, #ffffff);
  border: 1px solid var(--garrix-border, #dddddd);
  border-radius: 8px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.label-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.card-header-info h3 {
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--garrix-black, #000000);
}

.card-subtitle {
  margin: 0;
  font-size: 14px;
  color: var(--garrix-gray, #666666);
}

.card-body {
  margin: 16px 0;
}

.card-info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.card-label {
  font-size: 12px;
  color: var(--garrix-gray, #666666);
  text-transform: uppercase;
}

.card-value {
  font-size: 14px;
  color: var(--garrix-black, #000000);
  font-weight: 500;
}

.card-footer {
  display: flex;
  justify-content: flex-end;
}

/* 分页样式 */
.pagination-container {
  margin-top: 32px;
  display: flex;
  justify-content: center;
}

/* 抽屉样式 */
.garrix-drawer {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 9999;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.garrix-drawer.visible {
  pointer-events: all;
  opacity: 1;
}

.drawer-backdrop {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
}

.drawer-panel {
  position: absolute;
  right: 0;
  top: 0;
  width: 600px;
  height: 100%;
  background: #ffffff;
  box-shadow: -4px 0 20px rgba(0, 0, 0, 0.1);
  transform: translateX(100%);
  transition: transform 0.3s ease;
  display: flex;
  flex-direction: column;
}

.garrix-drawer.visible .drawer-panel {
  transform: translateX(0);
}

.drawer-header {
  padding: 24px;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #ffffff;
}

.header-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.label-id {
  font-size: 24px;
  font-weight: 700;
  color: #000000;
  letter-spacing: -0.3px;
}

.label-name {
  font-size: 13px;
  font-weight: 500;
  color: #666666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.close-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: #f5f5f5;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #666666;
  font-size: 18px;
  font-weight: 300;
}

.close-btn:hover {
  background: #000000;
  color: #ffffff;
}

.drawer-content {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
}

.label-info-section,
.review-section,
.reviewed-section {
  margin-bottom: 32px;
}

.label-info-section h3,
.review-section h3,
.reviewed-section h3 {
  font-size: 18px;
  font-weight: 600;
  color: var(--garrix-black, #000000);
  margin-bottom: 16px;
}

.info-grid {
  display: grid;
  gap: 16px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--garrix-gray, #666666);
  text-transform: uppercase;
}

.info-value {
  font-size: 14px;
  color: var(--garrix-black, #000000);
}

.info-value.link {
  color: var(--garrix-blue, #0066cc);
  text-decoration: none;
}

.info-value.link:hover {
  text-decoration: underline;
}

.review-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-size: 14px;
  font-weight: 600;
  color: var(--garrix-black, #000000);
}

.review-actions {
  display: flex;
  gap: 12px;
}

.review-result {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.result-status {
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 600;
  text-transform: uppercase;
  text-align: center;
}

.result-info p {
  margin: 8px 0;
  font-size: 14px;
  color: var(--garrix-black, #000000);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .admin-labels-container {
    padding: 16px;
  }
  
  .header-section {
    flex-direction: column;
    gap: 16px;
  }
  
  .filter-bar {
    flex-direction: column;
  }
  
  .garrix-input-wrapper {
    min-width: auto;
  }
  
  .drawer-panel {
    width: 100%;
  }
  
  .review-actions {
    flex-direction: column;
  }
}
</style>
