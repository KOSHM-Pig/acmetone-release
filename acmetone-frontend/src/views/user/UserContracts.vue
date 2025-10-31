<template>
  <div class="user-contracts">
    <div class="page-header">
      <h1>我的生效合同</h1>
    </div>

    <div class="filter-bar">
      <div class="garrix-input-wrapper">
        <el-select 
          v-model="filterStatus" 
          placeholder="合同状态" 
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
        :data="paginatedContracts"
        style="width: 100%"
        row-key="id"
        empty-text="暂无生效合同记录"
      >
        <!-- <el-table-column label="专辑封面" width="100">
          <template #default="scope">
            <el-image
              :src="scope.row.coverImageUrl || '/placeholder-album.png'"
              fit="cover"
              style="width: 60px; height: 60px; border-radius: 0;"
              :preview-src-list="[scope.row.coverImageUrl || '/placeholder-album.png']"
              @error="handleImageError($event, scope.row)"
            />
          </template>
        </el-table-column> -->
        <el-table-column label="专辑名称" prop="title" min-width="200" show-overflow-tooltip />
        <el-table-column label="专辑类型" prop="type" width="100" />
        <el-table-column label="生效日期" width="120">
          <template #default="scope">
            {{ formatDate(scope.row.contractEffectiveDate) }}
          </template>
        </el-table-column>
        <el-table-column label="到期日期" width="120">
          <template #default="scope">
            {{ formatDate(scope.row.contractExpiryDate) }}
          </template>
        </el-table-column>
        <el-table-column label="剩余天数" width="100">
          <template #default="scope">
            <span :class="['remaining-days', { 'expiring-soon': scope.row.isExpiringSoon }]">
              {{ scope.row.remainingDays !== null ? scope.row.remainingDays + '天' : '-' }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="120">
          <template #default="scope">
            <span :class="['status-badge', getStatusClass(scope.row.contractStatus)]">
              {{ scope.row.displayStatus }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="scope">
            <div class="action-buttons">
              <acmetone-btn size="small" @click="viewDetails(scope.row)">
                查看详情
              </acmetone-btn>
              <acmetone-btn 
                v-if="scope.row.signedAuthorizationFile" 
                size="small" 
                type="secondary" 
                @click="downloadContract(scope.row)"
              >
                下载合同
              </acmetone-btn>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 移动端卡片视图 -->
    <div class="mobile-view" v-if="isMobileView">
      <div v-if="loading" class="loading-container">
        <el-loading :fullscreen="false" />
      </div>
      <div v-else-if="filteredContracts.length === 0" class="empty-state">
        暂无生效合同记录
      </div>
      <div v-else class="contract-cards">
        <div 
          v-for="item in paginatedContracts" 
          :key="item.id" 
          class="contract-card"
          @click="viewDetails(item)"
        >
          <div class="card-header">
            <el-image
              :src="item.coverImageUrl || '/placeholder-album.png'"
              fit="cover"
              class="card-album-cover"
              @error="handleImageError($event, item)"
            />
            <div class="card-header-info">
              <h3 class="card-title">{{ item.title }}</h3>
              <p class="card-type">{{ item.type }}</p>
            </div>
          </div>
          <div class="card-body">
            <div class="card-info-row">
              <span class="card-label">生效日期</span>
              <span class="card-value">{{ formatDate(item.contractEffectiveDate) }}</span>
            </div>
            <div class="card-info-row">
              <span class="card-label">到期日期</span>
              <span class="card-value">{{ formatDate(item.contractExpiryDate) }}</span>
            </div>
            <div class="card-info-row">
              <span class="card-label">剩余天数</span>
              <span :class="['remaining-days', { 'expiring-soon': item.isExpiringSoon }]">
                {{ item.remainingDays !== null ? item.remainingDays + '天' : '-' }}
              </span>
            </div>
            <div class="card-info-row">
              <span class="card-label">状态</span>
              <span :class="['status-badge', getStatusClass(item.contractStatus)]">
                {{ item.displayStatus }}
              </span>
            </div>
          </div>
          <div class="card-footer">
            <acmetone-btn size="small">查看详情</acmetone-btn>
            <acmetone-btn 
              v-if="item.signedAuthorizationFile" 
              size="small" 
              type="secondary" 
              @click.stop="downloadContract(item)"
            >
              下载合同
            </acmetone-btn>
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
      title="合同详情"
      :width="isMobileView ? '95%' : '800px'"
      destroy-on-close
      class="details-dialog"
      :append-to-body="true"
      :fullscreen="isMobileView"
    >
      <div v-if="currentContract" class="dialog-layout" :class="{'mobile-layout': isMobileView}">
        <!-- 左侧：专辑信息 -->
        <div class="album-column">
          <div class="album-cover-wrapper">
            <el-image
              :src="currentContract.coverImageUrl || '/placeholder-album.png'"
              fit="cover"
              class="album-cover-large"
              @error="handleImageError($event, currentContract)"
            />
          </div>
          <div class="album-main-info">
            <h3 class="album-title">{{ currentContract.title }}</h3>
            <p class="album-type">{{ currentContract.type }}</p>
            <p class="album-display-info">{{ currentContract.displayInfo }}</p>
          </div>
        </div>

        <!-- 右侧：合同信息 -->
        <div class="contract-column">
          <div class="contract-status-section">
            <h4>合同状态</h4>
            <span :class="['status-badge', 'large', getStatusClass(currentContract.contractStatus)]">
              {{ currentContract.displayStatus }}
            </span>
          </div>

          <div class="contract-info-grid">
            <div class="info-item">
              <span class="info-label">专辑发行日期</span>
              <span>{{ formatDate(currentContract.releaseDate) }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">合同生效日期</span>
              <span>{{ formatDate(currentContract.contractEffectiveDate) }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">合同到期日期</span>
              <span>{{ formatDate(currentContract.contractExpiryDate) }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">合同签署时间</span>
              <span>{{ formatDate(currentContract.contractSignedAt) }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">剩余天数</span>
              <span :class="['remaining-days', { 'expiring-soon': currentContract.isExpiringSoon }]">
                {{ currentContract.remainingDays !== null ? currentContract.remainingDays + '天' : '-' }}
              </span>
            </div>
          </div>

          <div v-if="currentContract.isExpiringSoon" class="notice-box warning">
            <h5>⚠️ 合同即将到期</h5>
            <p>您的合同将在 {{ currentContract.remainingDays }} 天后到期，请及时联系客服续约。</p>
          </div>

          <div v-if="currentContract.contractStatus === 'expired'" class="notice-box expired">
            <h5>❌ 合同已过期</h5>
            <p>您的合同已于 {{ formatDate(currentContract.contractExpiryDate) }} 过期，请联系客服处理。</p>
          </div>

          <div class="contract-files-section">
            <h4>合同文件</h4>
            <div class="file-list">
              <div v-if="currentContract.signedAuthorizationFile" class="file-item signed">
                <div class="file-info">
                  <span class="file-name">已签署合同</span>
                  <span class="file-type">PDF文件</span>
                </div>
                <acmetone-btn size="small" @click="downloadContract(currentContract)">
                  下载
                </acmetone-btn>
              </div>
              <div v-if="currentContract.authorizationFile" class="file-item original">
                <div class="file-info">
                  <span class="file-name">原始授权书</span>
                  <span class="file-type">PDF文件</span>
                </div>
                <acmetone-btn size="small" type="secondary" @click="downloadOriginalAuthorization(currentContract)">
                  下载
                </acmetone-btn>
              </div>
            </div>
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
import { ref, computed, onMounted, onBeforeMount } from 'vue';
import { ElMessage } from 'element-plus';
import { Search } from '@element-plus/icons-vue';
import contractService from '@/services/contractService';
import AcmetoneBtn from '@/components/acmetone/AcmetoneBtn.vue';
import AcmetonePagination from '@/components/acmetone/AcmetonePagination.vue';
import { ensureFullUrl } from '@/utils/urlHelper';
import { STATIC_BASE_URL } from '@/config';

const loading = ref(false);
const contracts = ref([]);
const filterStatus = ref('');
const searchQuery = ref('');
const currentPage = ref(1);
const pageSize = ref(10);
const detailsVisible = ref(false);
const currentContract = ref(null);
const isMobileView = ref(false);
const staticBaseUrl = STATIC_BASE_URL;

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

// 状态选项
const statusOptions = [
  { value: 'signed', label: '已生效' },
  { value: 'unsigned', label: '未签署' },
  { value: 'expired', label: '已过期' }
];

// 格式化日期
const formatDate = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
};

// 获取状态类型
const getStatusClass = (status) => {
  const statusMap = {
    signed: 'status-signed',
    unsigned: 'status-unsigned',
    expired: 'status-expired'
  };
  return statusMap[status] || 'status-unsigned';
};

// 过滤后的合同列表
const filteredContracts = computed(() => {
  let result = contracts.value;
  
  // 状态过滤
  if (filterStatus.value) {
    result = result.filter(item => item.contractStatus === filterStatus.value);
  }
  
  // 搜索过滤
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    result = result.filter(item => 
      item.title.toLowerCase().includes(query) || 
      item.displayInfo.toLowerCase().includes(query)
    );
  }
  
  return result;
});

// 分页后的合同列表
const paginatedContracts = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  const end = start + pageSize.value;
  return filteredContracts.value.slice(start, end);
});

// 总数
const totalItems = computed(() => filteredContracts.value.length);

// 获取专辑封面URL（同步版本）
const getAlbumCoverUrl = (album) => {
  // 如果没有封面图片，返回占位图
  if (!album.coverImage) {
    return '/placeholder-album.png';
  }
  
  // 如果coverImage已经是完整URL且包含缩略图路径(thumb_)，直接使用
  if (album.coverImage.startsWith('http') && album.coverImage.includes('thumb_')) {
    return album.coverImage;
  }
  
  // 优先使用缩略图
  if (album.coverImageThumbnail) {
    // 判断缩略图路径是否已包含完整URL
    if (album.coverImageThumbnail.startsWith('http')) {
      return album.coverImageThumbnail;
    }
    // 确保路径格式正确
    if (album.coverImageThumbnail.startsWith('/')) {
      return `${staticBaseUrl}${album.coverImageThumbnail}`;
    } else {
      return `${staticBaseUrl}/${album.coverImageThumbnail}`;
    }
  }
  
  // 构建缩略图路径
  try {
    // 如果原图路径已经是完整URL
    if (album.coverImage.startsWith('http')) {
      // 检查URL是否已包含缩略图标识
      if (album.coverImage.includes('thumb_')) {
        return album.coverImage;
      } else {
        // 从URL中提取路径部分
        const url = new URL(album.coverImage);
        const pathParts = url.pathname.split('/');
        const fileName = pathParts[pathParts.length - 1];
        
        // 构建缩略图路径
        // 如果路径中包含thumbnails目录
        if (url.pathname.includes('/thumbnails/')) {
          // 在文件名前加上thumb_前缀
          const thumbFileName = `thumb_${fileName}`;
          const dirPath = pathParts.slice(0, -1).join('/');
          url.pathname = `${dirPath}/${thumbFileName}`;
        } else {
          // 添加thumbnails目录和thumb_前缀
          const dirPath = pathParts.slice(0, -1).join('/');
          url.pathname = `${dirPath}/thumbnails/thumb_${fileName}`;
        }
        
        return url.toString();
      }
    } else {
      // 本地路径处理
      const pathParts = album.coverImage.split('/');
      const fileName = pathParts[pathParts.length - 1];
      
      // 如果路径中包含thumbnails目录
      if (album.coverImage.includes('/thumbnails/')) {
        // 在文件名前加上thumb_前缀
        const thumbFileName = `thumb_${fileName}`;
        const dirPath = pathParts.slice(0, -1).join('/');
        const thumbPath = `${dirPath}/${thumbFileName}`;
        
        // 返回缩略图URL
        if (thumbPath.startsWith('/')) {
          return `${staticBaseUrl}${thumbPath}`;
        } else {
          return `${staticBaseUrl}/${thumbPath}`;
        }
      } else {
        // 添加thumbnails目录和thumb_前缀
        const dirPath = pathParts.slice(0, -1).join('/');
        const thumbPath = `${dirPath}/thumbnails/thumb_${fileName}`;
        
        // 返回缩略图URL
        if (thumbPath.startsWith('/')) {
          return `${staticBaseUrl}${thumbPath}`;
        } else {
          return `${staticBaseUrl}/${thumbPath}`;
        }
      }
    }
  } catch (error) {
    console.error('构建缩略图URL失败:', error);
    
    // 出错时返回原图路径
    if (album.coverImage.startsWith('http')) {
      return album.coverImage;
    } else if (album.coverImage.startsWith('/')) {
      return `${staticBaseUrl}${album.coverImage}`;
    } else {
      return `${staticBaseUrl}/${album.coverImage}`;
    }
  }
};

// 处理图片加载失败
const handleImageError = (event, album) => {
  // 如果是缩略图加载失败，尝试加载原图
  if (event.target.src.includes('thumb_')) {
    // 构建原图URL
    let originalUrl;
    if (album.coverImage) {
      if (album.coverImage.startsWith('http')) {
        originalUrl = album.coverImage;
      } else if (album.coverImage.startsWith('/')) {
        originalUrl = `${staticBaseUrl}${album.coverImage}`;
      } else {
        originalUrl = `${staticBaseUrl}/${album.coverImage}`;
      }
      
      // 移除URL中的缩略图部分
      originalUrl = originalUrl.replace('/thumbnails/thumb_', '/');
      originalUrl = originalUrl.replace('thumb_', '');
      
      event.target.src = originalUrl;
      return;
    }
  }
  
  // 如果不是缩略图或找不到对应专辑，使用默认占位图
  event.target.src = '/placeholder-album.png';
  event.target.onerror = null; // 防止无限循环
};

// 加载数据
const loadData = async () => {
  loading.value = true;
  try {
    const response = await contractService.getMyContracts();
    contracts.value = response.data.contracts.map(contract => {
      // 处理封面图片路径，使用缩略图逻辑
      contract.coverImageUrl = getAlbumCoverUrl(contract);
      return contract;
    });
  } catch (error) {
    console.error('获取合同列表失败:', error);
    ElMessage.error('获取合同列表失败');
  } finally {
    loading.value = false;
  }
};

// 查看详情
const viewDetails = async (row) => {
  try {
    if (!row.id || isNaN(row.id)) {
      ElMessage.error('无效的专辑ID');
      return;
    }
    
    const response = await contractService.getContractDetails(row.id);
    const contract = response.data;
    
    // 处理封面图片路径，使用缩略图逻辑
    contract.coverImageUrl = getAlbumCoverUrl(contract);
    
    currentContract.value = contract;
    detailsVisible.value = true;
  } catch (error) {
    console.error('获取合同详情失败:', error);
    ElMessage.error('获取合同详情失败');
  }
};

// 下载合同
const downloadContract = async (contract) => {
  try {
    const response = await contractService.downloadContract(contract.id);
    
    // 创建下载链接
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `生效合同_${contract.title}_${Date.now()}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    
    ElMessage.success('合同下载成功');
  } catch (error) {
    console.error('下载合同失败:', error);
    ElMessage.error('下载合同失败');
  }
};

// 下载原始授权书
const downloadOriginalAuthorization = async (contract) => {
  try {
    // 这里可以调用专辑的授权书下载接口
    ElMessage.info('原始授权书下载功能开发中');
  } catch (error) {
    console.error('下载原始授权书失败:', error);
    ElMessage.error('下载原始授权书失败');
  }
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
</script>

<style scoped>
/* 基础样式变量 */
:root {
  --garrix-black: #1d1d1f;
  --garrix-white: #ffffff;
  --garrix-grey: #86868b;
  --garrix-light-grey: #f5f7fa;
  --garrix-border-grey: #d2d2d7;
  --garrix-text-primary: #1d1d1f;
  --garrix-text-secondary: #86868b;
  --garrix-success: #4CAF50;
  --garrix-warning: #F9A825;
  --garrix-danger: #E53935;
}

.user-contracts {
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

/* 筛选栏样式 */
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

/* 表格样式 */
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

/* 状态徽章样式 */
.status-badge {
  padding: 4px 10px;
  border-radius: 0;
  font-size: 12px;
  font-weight: 600;
  border: 1px solid;
  white-space: nowrap;
  display: inline-block;
  min-width: 80px;
  text-align: center;
}

.status-badge.large {
  font-size: 14px;
  padding: 8px 16px;
  min-width: 100px;
}

.status-signed {
  color: #2E7D32;
  border-color: var(--garrix-success);
  background-color: rgba(76, 175, 80, 0.1);
}

.status-unsigned {
  color: #c78517;
  border-color: var(--garrix-warning);
  background-color: rgba(249, 168, 37, 0.1);
}

.status-expired {
  color: #C62828;
  border-color: var(--garrix-danger);
  background-color: rgba(229, 57, 53, 0.1);
}

/* 剩余天数样式 */
.remaining-days {
  font-weight: 600;
}

.remaining-days.expiring-soon {
  color: var(--garrix-danger);
  font-weight: 700;
}

/* 操作按钮样式 */
.action-buttons {
  display: flex;
  gap: 8px;
}

/* 移动端卡片样式 */
.mobile-view {
  display: block;
}

.contract-cards {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.contract-card {
  border: 1px solid var(--garrix-border-grey);
  background-color: var(--garrix-white);
  cursor: pointer;
  transition: all 0.2s ease;
}

.contract-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.card-header {
  display: flex;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid var(--garrix-border-grey);
}

.card-album-cover {
  width: 60px;
  height: 60px;
  border-radius: 0;
  margin-right: 16px;
}

.card-header-info {
  flex: 1;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 4px;
  color: var(--garrix-text-primary);
}

.card-type {
  font-size: 14px;
  color: var(--garrix-text-secondary);
  margin: 0;
}

.card-body {
  padding: 16px;
}

.card-info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.card-label {
  font-size: 12px;
  color: var(--garrix-text-secondary);
  font-weight: 500;
}

.card-value {
  font-size: 14px;
  color: var(--garrix-text-primary);
}

.card-footer {
  padding: 16px;
  border-top: 1px solid var(--garrix-border-grey);
  display: flex;
  gap: 8px;
}

/* 详情对话框样式 */
:deep(.details-dialog .el-dialog__body) {
  padding: 24px;
  overflow: auto;
  max-height: calc(90vh - 120px);
}

.dialog-layout {
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: 30px;
}

/* 专辑信息列 */
.album-column {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.album-cover-wrapper {
  width: 100%;
}

.album-cover-large {
  width: 100%;
  height: 300px;
  border-radius: 0;
  border: 1px solid var(--garrix-border-grey);
}

.album-main-info {
  text-align: center;
}

.album-title {
  font-size: 20px;
  font-weight: 700;
  margin: 0 0 8px;
  color: var(--garrix-text-primary);
}

.album-type {
  font-size: 14px;
  color: var(--garrix-text-secondary);
  margin: 0 0 4px;
}

.album-display-info {
  font-size: 14px;
  color: var(--garrix-text-secondary);
  margin: 0;
}

/* 合同信息列 */
.contract-column {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.contract-status-section {
  text-align: center;
  padding: 20px;
  border: 1px solid var(--garrix-border-grey);
  background-color: var(--garrix-light-grey);
}

.contract-status-section h4 {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 12px;
  color: var(--garrix-text-primary);
}

.contract-info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  padding: 20px;
  border: 1px solid var(--garrix-border-grey);
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
  font-weight: 500;
}

/* 通知框样式 */
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

.notice-box.warning {
  background-color: rgba(249, 168, 37, 0.1);
  border-color: var(--garrix-warning);
  color: #c78517;
}

.notice-box.expired {
  background-color: rgba(229, 57, 53, 0.1);
  border-color: var(--garrix-danger);
  color: #C62828;
}

/* 合同文件部分 */
.contract-files-section h4 {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 16px;
  color: var(--garrix-text-primary);
}

.file-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.file-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border: 1px solid var(--garrix-border-grey);
  background-color: var(--garrix-light-grey);
}

.file-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.file-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--garrix-text-primary);
}

.file-type {
  font-size: 12px;
  color: var(--garrix-text-secondary);
}

.file-item.signed {
  border-color: var(--garrix-success);
  background-color: rgba(76, 175, 80, 0.05);
}

.file-item.original {
  border-color: var(--garrix-border-grey);
  background-color: var(--garrix-light-grey);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .dialog-layout {
    grid-template-columns: 1fr;
    gap: 24px;
  }
  
  .album-cover-large {
    height: 200px;
  }
  
  .contract-info-grid {
    grid-template-columns: 1fr;
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
  
  .action-buttons {
    flex-direction: column;
  }
  
  .card-footer {
    flex-direction: column;
  }
}

@media (max-width: 480px) {
  .user-contracts {
    padding: 16px 12px;
  }
  
  .contract-info-grid {
    padding: 16px;
  }
}
</style>
