<template>
  <div class="admin-rejected-albums-container">
    <el-card>
      <template #header>
        <div class="header-with-actions">
          <h2>已拒绝专辑</h2>
          <div class="view-actions">
            <el-button-group>
              <el-button 
                type="primary" 
                @click="backToReview"
              >
                返回审核页面
              </el-button>
              <el-button 
                type="success" 
                @click="viewApprovedAlbums"
              >
                查看已通过专辑
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
        <el-button class="refresh-btn" type="primary" @click="fetchRejectedAlbums">
          刷新
        </el-button>
      </div>
      
      <div v-else-if="rejectedAlbums.length === 0" class="empty-container">
        <el-empty description="暂无已拒绝的专辑" />
      </div>

      <el-table v-else :data="rejectedAlbums" stripe>
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
        <el-table-column label="拒绝理由" min-width="250" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.comment || '无' }}
          </template>
        </el-table-column>
        <el-table-column label="拒绝时间" width="180">
          <template #default="{ row }">
            {{ formatDateTime(row.updatedAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button @click="handleView(row)" link type="primary">
              查看
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { API_BASE_URL } from '@/config';
import axios from 'axios';
import { useRouter } from 'vue-router';

const router = useRouter();
const loading = ref(false);
const errorMessage = ref('');
const rejectedAlbums = ref([]);

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

const fetchRejectedAlbums = async () => {
  try {
    loading.value = true;
    errorMessage.value = '';
    
    // 获取token
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('未登录');
    }
    
    // 获取已拒绝的专辑
    const response = await axios.get(`${API_BASE_URL}/albums/rejected`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    rejectedAlbums.value = response.data;
    console.log('获取到的已拒绝专辑:', rejectedAlbums.value);
  } catch (error) {
    console.error('获取已拒绝专辑失败:', error);
    errorMessage.value = '获取已拒绝专辑失败：' + (error.message || '未知错误');
    ElMessage.error('获取已拒绝专辑失败');
  } finally {
    loading.value = false;
  }
};

const backToReview = () => {
  router.push('/admin/albums');
};

const viewApprovedAlbums = () => {
  router.push('/admin/approved-albums');
};

onMounted(fetchRejectedAlbums);
</script>

<style scoped>
/* Martin Garrix Design Language - White Theme */
.admin-rejected-albums-container {
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

.comment-preview {
  max-width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style> 