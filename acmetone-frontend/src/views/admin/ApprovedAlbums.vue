<template>
  <div class="admin-approved-albums-container">
    <el-card>
      <template #header>
        <div class="header-with-actions">
          <h2>已通过专辑</h2>
          <div class="view-actions">
            <el-button-group>
              <el-button 
                type="primary" 
                @click="backToReview"
              >
                返回审核页面
              </el-button>
              <el-button 
                type="danger" 
                @click="viewRejectedAlbums"
              >
                查看已拒绝专辑
              </el-button>
            </el-button-group>
          </div>
        </div>
      </template>

      <div v-if="loading" class="loading-container">
        <el-skeleton :rows="5" animated />
      </div>
      
      <div v-else-if="errorMessage" class="error-container">
        <el-alert
          :title="errorMessage"
          type="error"
          description="请尝试刷新页面或联系管理员"
          show-icon
          :closable="false"
        />
        <el-button class="refresh-btn" type="primary" @click="fetchApprovedAlbums">
          刷新
        </el-button>
      </div>
      
      <div v-else-if="approvedAlbums.length === 0" class="empty-container">
        <el-empty description="暂无已通过的专辑" />
      </div>

      <el-table v-else :data="approvedAlbums" stripe>
        <el-table-column label="专辑名称" prop="title" min-width="200" />
        <el-table-column label="类型" prop="type" width="100" />
        <el-table-column label="发行日期" width="120">
          <template #default="{ row }">
            {{ formatDate(row.releaseDate) }}
          </template>
        </el-table-column>
        <el-table-column label="提交者" width="150">
          <template #default="{ row }">
            {{ row.submittedBy?.username || '未知用户' }}
          </template>
        </el-table-column>
        <el-table-column label="审核时间" width="180">
          <template #default="{ row }">
            {{ formatDateTime(row.updatedAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button @click="handleView(row)" link type="primary">
              查看
            </el-button>
            <el-button @click="handleDownload(row)" link type="success">
              下载发行文件
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useAlbumStore } from '../../stores/album';
import { ElMessage } from 'element-plus';
import { API_BASE_URL } from '@/config';
import axios from 'axios';
import { useRouter } from 'vue-router';

const albumStore = useAlbumStore();
const router = useRouter();
const loading = ref(false);
const errorMessage = ref('');
const approvedAlbums = ref([]);

const formatDate = (date) => {
  if (!date) return '未知';
  return new Date(date).toLocaleDateString('zh-CN');
};

const formatDateTime = (date) => {
  if (!date) return '未知';
  return new Date(date).toLocaleString('zh-CN');
};

const handleView = (album) => {
  router.push(`/albums/${album.id}`);
};

const handleDownload = async (album) => {
  try {
    // 获取token
    const token = localStorage.getItem('token');
    if (!token) {
      ElMessage.error('未登录');
      router.push('/login');
      return;
    }
    
    loading.value = true;
    ElMessage.info('正在准备下载，请稍候...');
    
    // 准备下载URL（添加token作为查询参数）
    const downloadUrl = `${API_BASE_URL}/albums/${album.id}/download?token=${token}`;
    
    // 创建一个隐藏的a标签来触发下载
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.target = '_blank';  // 在新标签页中打开
    link.rel = 'noopener noreferrer';  // 安全措施
    link.style.display = 'none';
    document.body.appendChild(link);
    
    // 显示下载提示
    ElMessage.info('即将开始下载，请在新标签页中保持连接直到下载完成...');
    console.log('开始下载文件:', downloadUrl);
    
    // 触发点击事件来开始下载
    link.click();
    
    // 清理DOM
    setTimeout(() => {
      document.body.removeChild(link);
      loading.value = false;
      ElMessage.success('下载已开始，请检查您的下载文件夹或浏览器下载管理器');
    }, 1000);
    
  } catch (error) {
    console.error('下载发行文件失败:', error);
    loading.value = false;
    ElMessage.error('下载失败: ' + error.message);
  }
};

const fetchApprovedAlbums = async () => {
  try {
    loading.value = true;
    errorMessage.value = '';
    
    // 获取token
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('未登录');
    }
    
    // 获取已通过审核的专辑
    const response = await axios.get(`${API_BASE_URL}/albums/approved`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    approvedAlbums.value = response.data;
    console.log('获取到的已通过专辑:', approvedAlbums.value);
  } catch (error) {
    console.error('获取已通过专辑失败:', error);
    errorMessage.value = '获取已通过专辑失败：' + (error.message || '未知错误');
    ElMessage.error('获取已通过专辑失败');
  } finally {
    loading.value = false;
  }
};

const backToReview = () => {
  router.push('/admin/albums');
};

const viewRejectedAlbums = () => {
  router.push('/admin/rejected-albums');
};

onMounted(fetchApprovedAlbums);
</script>

<style scoped>
/* Martin Garrix Design Language - White Theme */
.admin-approved-albums-container {
  padding: 24px;
  background-color: #f5f5f7;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
}

:deep(.el-card) {
  background-color: #ffffff;
  border-radius: 0;
  border: 1px solid #000000;
  box-shadow: 5px 5px 0px 0px rgba(0,0,0,1);
  transition: all 0.2s ease-in-out;
}

:deep(.el-card:hover) {
    box-shadow: 7px 7px 0px 0px rgba(0,0,0,1);
    transform: translate(-2px, -2px);
}

.header-with-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-with-actions h2 {
  font-size: 20px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  color: #000000;
  margin: 0;
}

/* Button Group & Buttons */
:deep(.el-button-group .el-button) {
  border-radius: 0;
  border-width: 2px;
}
:deep(.el-button) {
  border-radius: 0;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  transition: all 0.3s ease;
  border-width: 2px;
  box-shadow: none;
}
:deep(.el-button--primary) {
  background-color: #000;
  border-color: #000;
  color: #fff;
}
:deep(.el-button--primary:hover) {
  background-color: #fff;
  color: #000;
}
:deep(.el-button--danger) {
  background-color: transparent;
  border-color: #dc3545;
  color: #dc3545;
}
:deep(.el-button--danger:hover) {
  background-color: #dc3545;
  color: #fff;
}
:deep(.el-button--success) {
  background-color: transparent;
  border-color: #28a745;
  color: #28a745;
}
:deep(.el-button--success:hover) {
  background-color: #28a745;
  color: #fff;
}


/* Table Styles */
:deep(.el-table) {
  --el-table-border-color: #eaeaea;
  --el-table-header-bg-color: #ffffff;
  --el-table-tr-bg-color: #ffffff;
  --el-table-row-hover-bg-color: #f5f5f7;
  border: 1px solid #000;
}
:deep(.el-table th.el-table__cell) {
  background-color: var(--el-table-header-bg-color);
  color: #666;
  font-weight: 700;
  text-transform: uppercase;
  font-size: 11px;
  letter-spacing: 0.5px;
  border-bottom: 2px solid #000;
}
:deep(.el-table td.el-table__cell) {
  padding: 16px 10px;
  color: #333;
  font-size: 14px;
}
:deep(.el-table--striped .el-table__body tr.el-table__row--striped td.el-table__cell) {
  background-color: #fafafa;
}
:deep(.el-table__body tr:hover > td.el-table__cell) {
  background-color: var(--el-table-row-hover-bg-color) !important;
}

/* Loading/Empty/Error States */
.loading-container, .error-container, .empty-container {
  padding: 60px 0;
}
.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}
:deep(.el-alert) {
  border-radius: 0;
  border-width: 2px;
}
</style> 