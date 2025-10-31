<template>
  <div class="contract-management">
    <div class="page-header">
      <h1>合同管理</h1>
      <div class="header-actions">
        <acmetone-btn @click="refreshData">刷新数据</acmetone-btn>
      </div>
    </div>

    <div class="filter-bar">
      <div class="garrix-input-wrapper">
        <el-select 
          v-model="filterStatus" 
          placeholder="合同状态" 
          clearable 
          @change="handleFilterChange"
        >
          <el-option v-for="item in statusOptions" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
      </div>
      <div class="garrix-input-wrapper">
        <el-input
          v-model="searchQuery"
          placeholder="搜索专辑名称或用户名"
          clearable
          @input="handleSearch"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-cards">
      <div class="stat-card">
        <div class="stat-number">{{ stats.total }}</div>
        <div class="stat-label">总合同数</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">{{ stats.unsigned }}</div>
        <div class="stat-label">待签署</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">{{ stats.signed }}</div>
        <div class="stat-label">已生效</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">{{ stats.expiringSoon }}</div>
        <div class="stat-label">即将到期</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">{{ stats.totalSongs }}</div>
        <div class="stat-label">全站歌曲数</div>
      </div>
    </div>

    <!-- 表格 -->
    <el-table
      v-loading="loading"
      :data="paginatedContracts"
      style="width: 100%"
      row-key="id"
      empty-text="暂无合同记录"
      :row-class-name="getRowClassName"
    >
      <el-table-column label="专辑封面" width="100">
        <template #default="scope">
          <img
            :src="scope.row.coverImageUrl || '/placeholder-album.png'"
            @error="handleImageError($event, scope.row)"
            alt="专辑封面"
            style="width: 60px; height: 60px; object-fit: cover; border-radius: 4px; pointer-events: none;"
          />
        </template>
      </el-table-column>
      <el-table-column label="专辑信息" min-width="200">
        <template #default="scope">
          <div 
            class="album-info drop-zone"
            :class="{ 'drag-over': scope.row.id === dragOverRowId }"
            @drop="handleDrop($event, scope.row)"
            @dragover="handleDragOver($event, scope.row)"
            @dragleave="handleDragLeave"
          >
            <div class="album-title">{{ scope.row.title }}</div>
            <div class="album-artist">{{ scope.row.artistName }}</div>
            <div class="album-user">用户: {{ scope.row.userName }}</div>
            <div class="song-count">{{ scope.row.songCount || 0 }} 首歌曲</div>
            <div v-if="scope.row.contractStatus === 'unsigned'" class="drop-hint">
              拖拽PDF文件到此处快速上传
            </div>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="发行日期" width="120">
        <template #default="scope">
          {{ formatDate(scope.row.releaseDate) }}
        </template>
      </el-table-column>
      <el-table-column label="生效日期" width="120">
        <template #default="scope">
          {{ formatDate(scope.row.contractEffectiveDate) }}
        </template>
      </el-table-column>
      <el-table-column label="状态" width="120">
        <template #default="scope">
          <span :class="['status-badge', getStatusClass(scope.row.contractStatus)]">
            {{ scope.row.displayStatus }}
          </span>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="300" fixed="right">
        <template #default="scope">
          <div class="action-buttons">
            <acmetone-btn size="small" @click="viewDetails(scope.row)">
              查看详情
            </acmetone-btn>
            <acmetone-btn 
              v-if="scope.row.contractStatus === 'unsigned'" 
              size="small" 
              type="primary" 
              @click="uploadSignedContract(scope.row)"
            >
              上传合同
            </acmetone-btn>
            <acmetone-btn 
              size="small" 
              type="secondary" 
              @click="editContractDates(scope.row)"
            >
              调整日期
            </acmetone-btn>
          </div>
        </template>
      </el-table-column>
    </el-table>

    <acmetone-pagination
      v-model:current-page="currentPage"
      v-model:page-size="pageSize"
      :page-sizes="[10, 20, 50, 100]"
      :total="totalItems"
      @size-change="handleSizeChange"
      @current-change="handleCurrentChange"
    />

    <!-- 上传合同对话框 -->
    <el-dialog
      v-model="uploadVisible"
      title="上传已签署合同"
      width="600px"
      destroy-on-close
    >
      <div v-if="currentUploadContract" class="upload-form">
        <div class="upload-info">
          <h4>专辑信息</h4>
          <p><strong>专辑名称：</strong>{{ currentUploadContract.title }}</p>
          <p><strong>艺术家：</strong>{{ currentUploadContract.artistName }}</p>
        </div>
        
        <el-form :model="uploadForm" label-width="120px">
          <el-form-item label="已签署合同" required>
            <el-upload
              :auto-upload="false"
              :limit="1"
              accept=".pdf"
              :on-change="handleFileChange"
              :file-list="uploadForm.fileList"
            >
              <acmetone-btn>选择PDF文件</acmetone-btn>
            </el-upload>
          </el-form-item>
          
          <el-form-item label="生效日期">
            <el-date-picker
              v-model="uploadForm.effectiveDate"
              type="date"
              placeholder="选择生效日期"
            />
          </el-form-item>
          
          <el-form-item label="到期日期">
            <el-date-picker
              v-model="uploadForm.expiryDate"
              type="date"
              placeholder="选择到期日期"
            />
          </el-form-item>
        </el-form>
      </div>
      <template #footer>
        <acmetone-btn type="secondary" @click="uploadVisible = false">取消</acmetone-btn>
        <acmetone-btn type="primary" @click="submitUpload" :loading="uploading">确认上传</acmetone-btn>
      </template>
    </el-dialog>

    <!-- 调整日期对话框 -->
    <el-dialog
      v-model="dateEditVisible"
      title="调整合同日期"
      width="500px"
      destroy-on-close
    >
      <div v-if="currentEditContract" class="date-edit-form">
        <div class="edit-info">
          <h4>专辑信息</h4>
          <p><strong>专辑名称：</strong>{{ currentEditContract.title }}</p>
          <p><strong>艺术家：</strong>{{ currentEditContract.artistName }}</p>
        </div>
        
        <el-form :model="dateEditForm" label-width="120px">
          <el-form-item label="生效日期">
            <el-date-picker
              v-model="dateEditForm.effectiveDate"
              type="date"
              placeholder="选择生效日期"
            />
          </el-form-item>
          
          <el-form-item label="到期日期">
            <el-date-picker
              v-model="dateEditForm.expiryDate"
              type="date"
              placeholder="选择到期日期"
            />
          </el-form-item>
        </el-form>
      </div>
      <template #footer>
        <acmetone-btn type="secondary" @click="dateEditVisible = false">取消</acmetone-btn>
        <acmetone-btn type="primary" @click="submitDateEdit" :loading="dateEditing">确认修改</acmetone-btn>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { Search } from '@element-plus/icons-vue';
import contractService from '@/services/contractService';
import AcmetoneBtn from '@/components/acmetone/AcmetoneBtn.vue';
import AcmetonePagination from '@/components/acmetone/AcmetonePagination.vue';
import { ensureFullUrl } from '@/utils/urlHelper';
import { STATIC_BASE_URL } from '@/config';

const loading = ref(false);
const contracts = ref([]);
const stats = ref({
  total: 0,
  unsigned: 0,
  signed: 0,
  expiringSoon: 0,
  totalSongs: 0
});

const filterStatus = ref('');
const searchQuery = ref('');
const currentPage = ref(1);
const pageSize = ref(20);

const uploadVisible = ref(false);
const currentUploadContract = ref(null);
const uploadForm = ref({
  fileList: [],
  effectiveDate: null,
  expiryDate: null
});
const uploading = ref(false);

const dateEditVisible = ref(false);
const currentEditContract = ref(null);
const dateEditForm = ref({
  effectiveDate: null,
  expiryDate: null
});
const dateEditing = ref(false);

// 拖拽相关
const dragOverRowId = ref(null);
const dragUploading = ref(false);

// 静态资源基础URL
const staticBaseUrl = STATIC_BASE_URL;

// 状态选项
const statusOptions = [
  { value: 'unsigned', label: '待签署' },
  { value: 'signed', label: '已生效' },
  { value: 'expired', label: '已过期' }
];

// 格式化日期
const formatDate = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('zh-CN');
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

// 过滤后的合同列表
const filteredContracts = computed(() => {
  let result = contracts.value;
  
  if (filterStatus.value) {
    result = result.filter(item => item.contractStatus === filterStatus.value);
  }
  
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    result = result.filter(item => 
      item.title.toLowerCase().includes(query) || 
      item.artistName.toLowerCase().includes(query) ||
      item.userName.toLowerCase().includes(query)
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

// 加载数据
const loadData = async () => {
  loading.value = true;
  try {
    const response = await contractService.getAllContracts();
    // 检查响应数据结构
    const contractsData = response.data?.contracts || response.data || [];
    contracts.value = contractsData.map(contract => {
      // 设置封面图片URL
      contract.coverImageUrl = getAlbumCoverUrl(contract);
      return contract;
    });
    
    // 暂时使用模拟统计数据，因为统计接口可能还没实现
    try {
      const statsResponse = await contractService.getContractStats();
      stats.value = statsResponse.data.stats || {};
    } catch (error) {
      console.warn('获取统计数据失败，使用默认值:', error);
      // 计算基本统计
      const total = contracts.value.length;
      const unsigned = contracts.value.filter(c => c.contractStatus === 'unsigned').length;
      const signed = contracts.value.filter(c => c.contractStatus === 'signed').length;
      const expired = contracts.value.filter(c => c.contractStatus === 'expired').length;
      const expiringSoon = contracts.value.filter(c => c.isExpiringSoon).length;
      
      stats.value = { total, unsigned, signed, expired, expiringSoon, totalSongs: 0 };
    }
  } catch (error) {
    console.error('获取合同数据失败:', error);
    ElMessage.error('获取合同数据失败');
  } finally {
    loading.value = false;
  }
};

const refreshData = () => loadData();

const viewDetails = (row) => {
  console.log('查看详情:', row);
};

const uploadSignedContract = (contract) => {
  currentUploadContract.value = contract;
  uploadForm.value = {
    fileList: [],
    effectiveDate: contract.releaseDate ? new Date(contract.releaseDate) : new Date(),
    expiryDate: null
  };
  
  if (uploadForm.value.effectiveDate) {
    const expiryDate = new Date(uploadForm.value.effectiveDate);
    expiryDate.setFullYear(expiryDate.getFullYear() + 5);
    uploadForm.value.expiryDate = expiryDate;
  }
  
  uploadVisible.value = true;
};

const editContractDates = (contract) => {
  currentEditContract.value = contract;
  dateEditForm.value = {
    effectiveDate: contract.contractEffectiveDate ? new Date(contract.contractEffectiveDate) : null,
    expiryDate: contract.contractExpiryDate ? new Date(contract.contractExpiryDate) : null
  };
  dateEditVisible.value = true;
};

const handleFileChange = (file) => {
  uploadForm.value.fileList = [file];
};

const submitUpload = async () => {
  if (!uploadForm.value.fileList.length) {
    ElMessage.warning('请选择要上传的合同文件');
    return;
  }
  
  uploading.value = true;
  try {
    const file = uploadForm.value.fileList[0].raw;
    
    // 转换文件为base64
    const base64Data = await fileToBase64(file);
    
    const uploadData = {
      fileData: base64Data,
      fileName: file.name,
      fileSize: file.size,
      effectiveDate: uploadForm.value.effectiveDate.toISOString(),
      expiryDate: uploadForm.value.expiryDate.toISOString()
    };
    
    await contractService.uploadSignedContract(currentUploadContract.value.id, uploadData);
    
    ElMessage.success('合同上传成功');
    uploadVisible.value = false;
    loadData();
  } catch (error) {
    console.error('上传合同失败:', error);
    ElMessage.error('上传合同失败');
  } finally {
    uploading.value = false;
  }
};

const submitDateEdit = async () => {
  dateEditing.value = true;
  try {
    const dates = {
      effectiveDate: dateEditForm.value.effectiveDate?.toISOString(),
      expiryDate: dateEditForm.value.expiryDate?.toISOString()
    };
    
    await contractService.updateContractDates(currentEditContract.value.id, dates);
    
    ElMessage.success('合同日期更新成功');
    dateEditVisible.value = false;
    loadData();
  } catch (error) {
    console.error('更新合同日期失败:', error);
    ElMessage.error('更新合同日期失败');
  } finally {
    dateEditing.value = false;
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
  currentPage.value = 1;
};

const handleCurrentChange = (val) => {
  currentPage.value = val;
};

// 拖拽处理函数
const getRowClassName = ({ row }) => {
  return row.contractStatus === 'unsigned' ? 'droppable-row' : '';
};

const handleDragOver = (event, row) => {
  if (row.contractStatus !== 'unsigned') return;
  
  event.preventDefault();
  event.dataTransfer.dropEffect = 'copy';
  dragOverRowId.value = row.id;
};

const handleDragLeave = () => {
  dragOverRowId.value = null;
};

const handleDrop = async (event, row) => {
  event.preventDefault();
  dragOverRowId.value = null;
  
  if (row.contractStatus !== 'unsigned') {
    ElMessage.warning('该合同已签署，无法重复上传');
    return;
  }
  
  const files = Array.from(event.dataTransfer.files);
  const pdfFile = files.find(file => file.type === 'application/pdf');
  
  if (!pdfFile) {
    ElMessage.warning('请拖拽PDF文件');
    return;
  }
  
  if (pdfFile.size > 10 * 1024 * 1024) {
    ElMessage.warning('文件大小不能超过10MB');
    return;
  }
  
  // 直接上传
  await uploadContractFile(row, pdfFile);
};

// 将文件转换为base64
const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
};

const uploadContractFile = async (contract, file) => {
  dragUploading.value = true;
  try {
    // 转换文件为base64
    const base64Data = await fileToBase64(file);
    
    // 设置默认日期
    const effectiveDate = contract.releaseDate ? new Date(contract.releaseDate) : new Date();
    const expiryDate = new Date(effectiveDate);
    expiryDate.setFullYear(expiryDate.getFullYear() + 5);
    
    const uploadData = {
      fileData: base64Data,
      fileName: file.name,
      fileSize: file.size,
      effectiveDate: effectiveDate.toISOString(),
      expiryDate: expiryDate.toISOString()
    };
    
    await contractService.uploadSignedContract(contract.id, uploadData);
    
    ElMessage.success(`${contract.title} 合同上传成功`);
    loadData();
  } catch (error) {
    console.error('拖拽上传合同失败:', error);
    ElMessage.error('上传合同失败');
  } finally {
    dragUploading.value = false;
  }
};

onMounted(() => {
  loadData();
});
</script>

<style scoped>
.contract-management {
  max-width: 1400px;
  margin: 0 auto;
  padding: 24px;
  font-family: sans-serif;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #1d1d1f;
  padding-bottom: 20px;
  margin-bottom: 30px;
}

.page-header h1 {
  font-size: 2rem;
  font-weight: 700;
  margin: 0;
}

.filter-bar {
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
}

.garrix-input-wrapper {
  border: 2px solid #1d1d1f;
  background-color: #ffffff;
  box-shadow: 4px 4px 0 rgba(0, 0, 0, 0.1);
}

.stats-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.stat-card {
  padding: 24px;
  border: 1px solid #d2d2d7;
  background-color: #f5f7fa;
  text-align: center;
}

.stat-number {
  font-size: 2.5rem;
  font-weight: 700;
  color: #007AFF;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 14px;
  color: #86868b;
  text-transform: uppercase;
  font-weight: 500;
}

.album-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.album-title {
  font-weight: 600;
  color: #1d1d1f;
}

.album-artist {
  color: #86868b;
  font-size: 14px;
}

.album-user {
  color: #86868b;
  font-size: 12px;
}

.song-count {
  color: #007AFF;
  font-size: 12px;
  font-weight: 500;
}

/* 拖拽样式 */
.drop-zone {
  position: relative;
  transition: all 0.3s ease;
  padding: 8px;
  border-radius: 4px;
}

.droppable-row .drop-zone {
  border: 2px dashed transparent;
}

.droppable-row .drop-zone:hover {
  background-color: #f8f9fa;
  border-color: #d2d2d7;
}

.drop-zone.drag-over {
  background-color: #e3f2fd !important;
  border-color: #007AFF !important;
  transform: scale(1.02);
}

.drop-hint {
  color: #007AFF;
  font-size: 11px;
  margin-top: 4px;
  opacity: 0.7;
  font-style: italic;
}

.droppable-row:hover .drop-hint {
  opacity: 1;
}

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

.status-signed {
  color: #2E7D32;
  border-color: #4CAF50;
  background-color: rgba(76, 175, 80, 0.1);
}

.status-unsigned {
  color: #c78517;
  border-color: #F9A825;
  background-color: rgba(249, 168, 37, 0.1);
}

.status-expired {
  color: #C62828;
  border-color: #E53935;
  background-color: rgba(229, 57, 53, 0.1);
}

.action-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.upload-form {
  padding: 20px 0;
}

.upload-info {
  margin-bottom: 20px;
  padding: 16px;
  background-color: #f5f7fa;
  border: 1px solid #d2d2d7;
}

.upload-info h4 {
  margin: 0 0 12px;
  font-size: 16px;
  font-weight: 600;
}

.upload-info p {
  margin: 4px 0;
  font-size: 14px;
}
</style>
