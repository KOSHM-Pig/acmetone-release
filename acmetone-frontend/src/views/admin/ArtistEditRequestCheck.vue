<template>
  <div class="artist-edit-request-check">
    <el-card>
      <template #header>
        <div class="page-header">
          <div class="header-left">
            <h2 class="page-title">歌手信息修改审核</h2>
            <p class="page-subtitle">审核用户提交的歌手信息修改申请</p>
          </div>
        </div>
      </template>

      <el-table :data="requests" style="width: 100%" v-loading="loading">
        <el-table-column prop="artistName" label="歌手" min-width="150">
          <template #default="{ row }">
            <div class="artist-cell">
              <span class="artist-name">{{ row.artistName }}</span>
              <span class="artist-realname">{{ row.artistRealName }}</span>
            </div>
          </template>
        </el-table-column>
        
        <el-table-column prop="requesterName" label="申请人" min-width="120" />
        
        <el-table-column label="修改内容" min-width="350">
          <template #default="{ row }">
            <div class="changes-container">
              <template v-if="hasChanges(row)">
                <div v-if="row.newName" class="change-item">
                  <span class="change-label">艺名:</span>
                  <span class="change-old">{{ row.Artist.name }}</span>
                  <el-icon><ArrowRight /></el-icon>
                  <span class="change-new">{{ row.newName }}</span>
                </div>
                <div v-if="row.newRealName" class="change-item">
                  <span class="change-label">实名:</span>
                  <span class="change-old">{{ row.Artist.realName }}</span>
                  <el-icon><ArrowRight /></el-icon>
                  <span class="change-new">{{ row.newRealName }}</span>
                </div>
                <div v-if="row.new_id_number" class="change-item">
                  <span class="change-label">身份证:</span>
                  <span class="change-old">{{ maskIdNumber(row.Artist.id_number) || '未设置' }}</span>
                  <el-icon><ArrowRight /></el-icon>
                  <span class="change-new">{{ maskIdNumber(row.new_id_number) }}</span>
                </div>
                <div v-for="platform in platformFields.filter(p => row['new' + p.charAt(0).toUpperCase() + p.slice(1)])" :key="platform" class="change-item">
                  <span class="change-label">{{ getPlatformLabel(platform) }}:</span>
                  <span class="change-old">{{ row.Artist[platform] || '未设置' }}</span>
                  <el-icon><ArrowRight /></el-icon>
                  <span class="change-new">{{ row['new' + platform.charAt(0).toUpperCase() + platform.slice(1)] }}</span>
                </div>
              </template>
              <div v-else class="no-changes">
                无修改内容
              </div>
            </div>
          </template>
        </el-table-column>
        
        <el-table-column prop="reason" label="修改说明" min-width="200" show-overflow-tooltip />
        
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" effect="plain">
              {{ getStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column label="操作" width="260" fixed="right">
          <template #default="{ row }">
            <div class="action-buttons">
              <el-button type="primary" size="small" @click="showDetails(row)">
                <el-icon><Document /></el-icon>
                查看详情
              </el-button>
              <template v-if="row.status === 'pending'">
                <el-button type="success" size="small" @click="handleApprove(row)">
                  <el-icon><Check /></el-icon>
                  通过
                </el-button>
                <el-button type="danger" size="small" @click="handleReject(row)">
                  <el-icon><Close /></el-icon>
                  拒绝
                </el-button>
              </template>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 拒绝原因对话框 -->
    <el-dialog
      v-model="rejectDialogVisible"
      title="拒绝原因"
      width="500px"
    >
      <el-form>
        <el-form-item label="拒绝原因" required>
          <el-input
            v-model="rejectReason"
            type="textarea"
            :rows="3"
            placeholder="请输入拒绝原因"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="rejectDialogVisible = false">取消</el-button>
          <el-button type="danger" @click="confirmReject" :loading="submitting">
            确认拒绝
          </el-button>
        </span>
      </template>
    </el-dialog>

    <el-dialog
      v-model="detailDialogVisible"
      title="歌手信息修改详情"
      width="70%"
    >
      <div v-if="currentRequest" class="detail-content">
        <div class="reason-section">
          <strong>修改理由：</strong>
          <p>{{ currentRequest.reason }}</p>
        </div>

        <div class="comparison-section">
            <el-descriptions title="原始信息" :column="1" border>
                <el-descriptions-item label="艺名">{{ currentRequest.Artist?.name }}</el-descriptions-item>
                <el-descriptions-item label="实名">{{ currentRequest.Artist?.realName }}</el-descriptions-item>
                <el-descriptions-item label="身份证号">{{ maskIdNumber(currentRequest.Artist?.id_number) || '未设置' }}</el-descriptions-item>
                <el-descriptions-item v-for="platform in platformFields" :key="'orig-' + platform" :label="getPlatformLabel(platform)">
                    {{ currentRequest.Artist?.[platform] || '无' }}
                </el-descriptions-item>
            </el-descriptions>

            <el-descriptions title="修改后信息" :column="1" border>
                <el-descriptions-item label="艺名" :class="{ 'modified': currentRequest.newName }">{{ currentRequest.newName || '未修改' }}</el-descriptions-item>
                <el-descriptions-item label="实名" :class="{ 'modified': currentRequest.newRealName }">{{ currentRequest.newRealName || '未修改' }}</el-descriptions-item>
                <el-descriptions-item label="身份证号" :class="{ 'modified': currentRequest.new_id_number }">{{ currentRequest.new_id_number ? maskIdNumber(currentRequest.new_id_number) : '未修改' }}</el-descriptions-item>
                <el-descriptions-item v-for="platform in platformFields" :key="'new-' + platform" :label="getPlatformLabel(platform)" :class="{ 'modified': currentRequest['new' + platform.charAt(0).toUpperCase() + platform.slice(1)] }">
                    {{ currentRequest['new' + platform.charAt(0).toUpperCase() + platform.slice(1)] || '未修改' }}
                </el-descriptions-item>
            </el-descriptions>
        </div>
      </div>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="detailDialogVisible = false">关闭</el-button>
          <el-button type="success" @click="handleApprove(currentRequest)" v-if="currentRequest?.status === 'pending'">
            通过
          </el-button>
          <el-button type="danger" @click="handleReject(currentRequest)" v-if="currentRequest?.status === 'pending'">
            拒绝
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Check, Close, ArrowRight, Lock, Document } from '@element-plus/icons-vue';
import axios from 'axios';
import { API_BASE_URL } from '@/config';

// 数据
const requests = ref([]);
const loading = ref(false);
const rejectDialogVisible = ref(false);
const rejectReason = ref('');
const currentRequest = ref(null);
const submitting = ref(false);
const detailDialogVisible = ref(false);

// 平台字段列表
const platformFields = [
  'netease',
  'qq',
  'kugou',
  'kuwo',
  'qishui',
  'spotify',
  'youtube',
  'appleMusic',
  'soundCloud'
];

// 获取平台标签
const getPlatformLabel = (key) => {
  const labels = {
    netease: '网易云音乐',
    qq: 'QQ音乐',
    kugou: '酷狗音乐',
    kuwo: '酷我音乐',
    qishui: '汽水音乐',
    spotify: 'Spotify',
    youtube: 'YouTube',
    appleMusic: 'Apple Music',
    soundCloud: 'SoundCloud'
  };
  return labels[key] || key;
};

// 获取状态标签
const getStatusLabel = (status) => {
  const labels = {
    pending: '待审核',
    approved: '已通过',
    rejected: '已拒绝'
  };
  return labels[status] || status;
};

// 获取状态类型
const getStatusType = (status) => {
  const types = {
    pending: 'warning',
    approved: 'success',
    rejected: 'danger'
  };
  return types[status] || 'info';
};

// 添加身份证号码掩码函数
const maskIdNumber = (idNumber) => {
  if (!idNumber) return '';
  return idNumber.replace(/^(.{6})(.*)(.{4})$/, '$1********$3');
};

// 获取请求列表
const fetchRequests = async () => {
  loading.value = true;
  try {
    const response = await axios.get(`${API_BASE_URL}/artist-edit-requests`);
    requests.value = response.data;
    if (requests.value.length > 0) {
      console.log('请求列表第一项:', JSON.stringify(requests.value[0], null, 2));
    }
  } catch (error) {
    ElMessage.error('获取申请列表失败');
  } finally {
    loading.value = false;
  }
};

// 处理通过
const handleApprove = async (row) => {
  try {
    await ElMessageBox.confirm(
      '确定要通过这条修改申请吗？',
      '确认通过',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'success'
      }
    );
    
    submitting.value = true;
    await axios.post(`${API_BASE_URL}/artist-edit-requests/${row.id}/approve`);
    ElMessage.success('已通过申请');
    await fetchRequests();
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error.response?.data?.message || '操作失败');
    }
  } finally {
    submitting.value = false;
  }
};

// 处理拒绝
const handleReject = (row) => {
  currentRequest.value = row;
  rejectReason.value = '';
  rejectDialogVisible.value = true;
};

// 确认拒绝
const confirmReject = async () => {
  if (!rejectReason.value.trim()) {
    ElMessage.warning('请输入拒绝原因');
    return;
  }
  
  try {
    submitting.value = true;
    await axios.post(`${API_BASE_URL}/artist-edit-requests/${currentRequest.value.id}/reject`, {
      reason: rejectReason.value
    });
    ElMessage.success('已拒绝申请');
    rejectDialogVisible.value = false;
    await fetchRequests();
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '操作失败');
  } finally {
    submitting.value = false;
  }
};

// 添加查看详情的方法
const showDetails = (row) => {
  // 确保 new_id_number 字段存在
  if (!row.hasOwnProperty('new_id_number') && row.hasOwnProperty('newIdNumber')) {
    row.new_id_number = row.newIdNumber;
    console.log('已修复字段名称: newIdNumber -> new_id_number');
  }
  
  currentRequest.value = row;
  console.log('当前请求详情:', JSON.stringify(currentRequest.value, null, 2));
  console.log('身份证号码字段:', {
    原始: currentRequest.value?.Artist?.id_number,
    修改: currentRequest.value?.new_id_number
  });
  detailDialogVisible.value = true;
};

// 检查是否有修改
const hasChanges = (row) => {
  const changeFields = [
    'newName',
    'newRealName',
    'new_id_number',
    'newNetease',
    'newQq',
    'newKugou',
    'newKuwo',
    'newQishui',
    'newSpotify',
    'newYoutube',
    'newAppleMusic',
    'newSoundCloud'
  ];
  
  return changeFields.some(field => row[field] !== null && row[field] !== undefined);
};

onMounted(() => {
  fetchRequests();
});
</script>

<style scoped>
/* Martin Garrix Design Language - White Theme */
.artist-edit-request-check {
  padding: 24px;
  background-color: #f5f5f7;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
}

:deep(.el-card) {
  background-color: #ffffff;
  border-radius: 0;
  border: 1px solid #000000;
  box-shadow: 5px 5px 0px 0px rgba(0,0,0,1);
}

.page-header {
  padding: 0;
}
.page-title {
  font-size: 20px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  color: #000000;
  margin: 0;
}
.page-subtitle {
  margin: 8px 0 0;
  font-size: 14px;
  color: #666;
}

/* Table Styles */
:deep(.el-table) {
  --el-table-border-color: #eaeaea;
  --el-table-header-bg-color: #ffffff;
  --el-table-row-hover-bg-color: #f5f5f7;
  border-top: 1px solid #000;
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
  padding: 12px 10px;
  color: #333;
  font-size: 14px;
}
:deep(.el-table__body tr:hover > td.el-table__cell) {
  background-color: var(--el-table-row-hover-bg-color) !important;
}
.artist-cell {
  display: flex;
  flex-direction: column;
}
.artist-name {
  font-weight: 600;
}
.artist-realname {
  font-size: 12px;
  color: #666;
}

.changes-container {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
}
.change-item {
  display: flex;
  align-items: center;
  gap: 6px;
}
.change-label {
  font-weight: 600;
  color: #333;
  min-width: 60px;
}
.change-old {
  color: #999;
  text-decoration: line-through;
}
.change-new {
  color: #28a745;
  font-weight: 600;
}
.no-changes {
  color: #999;
}

/* Tag Styles */
:deep(.el-tag) {
  border-radius: 0;
  font-weight: 700;
  font-size: 10px;
  text-transform: uppercase;
  border-width: 2px;
}
:deep(.el-tag--success) { border-color: #28a745; }
:deep(.el-tag--warning) { border-color: #ffc107; }
:deep(.el-tag--danger) { border-color: #dc3545; }
:deep(.el-tag--info) { border-color: #6c757d; }

/* Buttons */
.action-buttons {
  display: flex;
  gap: 8px;
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
  background-color: #000; border-color: #000; color: #fff;
}
:deep(.el-button--primary:hover) {
  background-color: #fff; color: #000;
}
:deep(.el-button--success) {
  background-color: transparent; border-color: #28a745; color: #28a745;
}
:deep(.el-button--success:hover) {
  background-color: #28a745; color: #fff;
}
:deep(.el-button--danger) {
  background-color: transparent; border-color: #dc3545; color: #dc3545;
}
:deep(.el-button--danger:hover) {
  background-color: #dc3545; color: #fff;
}
:deep(.el-button--info) {
  background-color: transparent; border-color: #6c757d; color: #6c757d;
}
:deep(.el-button--info:hover) {
  background-color: #6c757d; color: #fff;
}
:deep(.el-button.is-text) {
  border: none;
}


/* Dialog Styles */
:deep(.el-dialog) {
  border-radius: 0;
  border: 2px solid #000;
  box-shadow: 6px 6px 0 0 #000;
}
:deep(.el-dialog__header) {
  border-bottom: 2px solid #000;
  padding: 16px 24px;
}
:deep(.el-dialog__title) {
  color: #000;
  text-transform: uppercase;
  letter-spacing: 1px;
  font-weight: 700;
}
:deep(.el-dialog__body) {
  padding: 24px;
}
:deep(.el-dialog__footer) {
  border-top: 2px solid #000;
  padding: 16px 24px;
}
:deep(.el-form-item__label) {
  color: #666;
  text-transform: uppercase;
  font-size: 12px;
  font-weight: 700;
}
:deep(.el-input__wrapper), :deep(.el-textarea__inner) {
  background-color: #ffffff;
  border: 2px solid #000;
  border-radius: 0;
  box-shadow: none !important;
}

/* Detail Dialog Content */
.detail-content {
  padding: 0 10px;
}
.reason-section {
  margin-bottom: 24px;
  padding: 16px;
  border: 2px solid #000;
}
.reason-section strong {
  text-transform: uppercase;
  font-size: 12px;
  letter-spacing: 1px;
  display: block;
  margin-bottom: 8px;
}
.reason-section p {
  margin: 0;
}

.comparison-section {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}
:deep(.el-descriptions) {
  border: 2px solid #000;
}
:deep(.el-descriptions__header) {
  margin-bottom: 12px;
}
:deep(.el-descriptions__title) {
  text-transform: uppercase;
  font-weight: 700;
  font-size: 14px;
}
:deep(.el-descriptions-item__label) {
  font-weight: 700;
  color: #666;
  background: #f5f5f7 !important;
  font-size: 11px;
}
:deep(.el-descriptions-item__cell.modified) {
  background-color: #fffbe6 !important;
}
:deep(.el-descriptions-item__cell.modified .el-descriptions-item__label) {
  background-color: #f5f0d5 !important;
}
</style> 