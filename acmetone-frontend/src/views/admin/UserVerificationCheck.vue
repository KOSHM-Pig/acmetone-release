<template>
  <div class="verification-check-container">
    <el-card>
      <template #header>
        <div class="header-content">
          <h2>用户实名认证审核</h2>
          <el-button type="primary" @click="refreshList">
            <el-icon><Refresh /></el-icon> 刷新列表
          </el-button>
        </div>
      </template>

      <!-- 待审核列表 -->
      <el-table
        v-loading="loading"
        :data="pendingVerifications"
        style="width: 100%"
        empty-text="暂无待审核的实名认证申请"
      >
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column label="用户信息" width="200">
          <template #default="scope">
            <div class="info-cell">
              <div class="info-line"><strong>用户名:</strong> <span>{{ scope.row.User.username }}</span></div>
              <div class="info-line"><strong>邮箱:</strong> <span>{{ scope.row.User.email }}</span></div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="实名信息" min-width="250">
          <template #default="scope">
            <div class="info-cell">
              <div class="info-line"><strong>真实姓名:</strong> <span>{{ scope.row.realName }}</span></div>
              <div class="info-line">
                <strong>身份证号:</strong>
                <span>{{ maskIdNumber(scope.row.idNumber) }}</span>
                <el-tooltip content="身份证信息已加密显示" placement="top">
                  <el-icon class="info-icon"><Lock /></el-icon>
                </el-tooltip>
              </div>
              <div class="info-line">
                <strong>银行账号:</strong>
                <span>{{ scope.row.bankAccount }}</span>
                <el-tooltip content="银行账号用于打款，请核对准确" placement="top">
                  <el-icon class="info-icon"><Warning /></el-icon>
                </el-tooltip>
              </div>
              <div class="info-line"><strong>开户银行:</strong> <span>{{ scope.row.bankName }}</span></div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="提交时间" width="180">
          <template #default="scope">
            {{ formatDateTime(scope.row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200">
          <template #default="scope">
            <el-button
              type="success"
              size="small"
              @click="handleApprove(scope.row)"
            >
              通过
            </el-button>
            <el-button
              type="danger"
              size="small"
              @click="handleReject(scope.row)"
            >
              拒绝
            </el-button>
            <el-button
              type="info"
              size="small"
              @click="handleViewDetails(scope.row)"
            >
              查看详情
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 拒绝对话框 -->
    <el-dialog
      v-model="rejectDialogVisible"
      title="拒绝原因"
      width="500px"
    >
      <el-form
        ref="rejectFormRef"
        :model="rejectForm"
        :rules="rejectRules"
      >
        <el-form-item label="拒绝原因" prop="comment">
          <el-input
            v-model="rejectForm.comment"
            type="textarea"
            :rows="4"
            placeholder="请输入拒绝原因，该信息将展示给用户"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="rejectDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="confirmReject" :loading="submitting">
            确认拒绝
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 详情对话框 -->
    <el-dialog
      v-model="detailsDialogVisible"
      title="实名认证详情"
      width="500px"
      :close-on-click-modal="false"
      :before-close="handleCloseDetailsDialog"
    >
      <div v-if="detailsLoading" class="details-loading">
        <el-skeleton :rows="5" animated />
      </div>
      <div v-else-if="currentDetails" class="verification-details">
        <div class="detail-item">
          <span class="detail-label">用户名：</span>
          <span>{{ currentDetails.User?.username }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">邮箱：</span>
          <span>{{ currentDetails.User?.email }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">真实姓名：</span>
          <span>{{ currentDetails.realName }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">身份证号：</span>
          <span class="sensitive-data">{{ currentDetails.idNumber }}</span>
          <el-tooltip content="敏感信息，请勿泄露" placement="top">
            <el-icon class="sensitive-icon"><Warning /></el-icon>
          </el-tooltip>
        </div>
        <div class="detail-item">
          <span class="detail-label">银行账号：</span>
          <span class="bank-account-data">{{ currentDetails.bankAccount }}</span>
          <el-tooltip content="银行账号用于打款，请核对准确" placement="top">
            <el-icon class="sensitive-icon"><Warning /></el-icon>
          </el-tooltip>
        </div>
        <div class="detail-item">
          <span class="detail-label">开户银行：</span>
          <span>{{ currentDetails.bankName }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">提交时间：</span>
          <span>{{ formatDateTime(currentDetails.createdAt) }}</span>
        </div>
      </div>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="detailsDialogVisible = false">关闭</el-button>
          <el-button 
            type="success" 
            @click="handleApprove(currentDetails)"
            :loading="submitting"
            :disabled="submitting"
          >
            通过认证
          </el-button>
          <el-button 
            type="danger" 
            @click="handleReject(currentDetails)"
            :disabled="submitting"
          >
            拒绝认证
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useUserVerificationStore } from '../../stores/userVerification';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Refresh, Lock, Warning } from '@element-plus/icons-vue';

const userVerificationStore = useUserVerificationStore();
const loading = ref(false);
const submitting = ref(false);
const pendingVerifications = ref([]);
const rejectDialogVisible = ref(false);
const currentVerification = ref(null);
const detailsDialogVisible = ref(false);
const detailsLoading = ref(false);
const currentDetails = ref(null);

const rejectForm = ref({
  comment: ''
});

const rejectFormRef = ref(null);

const rejectRules = {
  comment: [
    { required: true, message: '请输入拒绝原因', trigger: 'blur' }
  ]
};

// 获取待审核列表
const fetchPendingVerifications = async () => {
  try {
    loading.value = true;
    const result = await userVerificationStore.getPendingVerifications();
    pendingVerifications.value = result;
  } catch (error) {
    ElMessage.error(error.toString());
  } finally {
    loading.value = false;
  }
};

// 刷新列表
const refreshList = () => {
  fetchPendingVerifications();
};

// 格式化日期时间
const formatDateTime = (dateString) => {
  if (!dateString) return '未知';
  return new Date(dateString).toLocaleString('zh-CN');
};

// 掩码显示身份证号
const maskIdNumber = (idNumber) => {
  if (!idNumber) return '';
  return idNumber.replace(/^(.{6})(.*)(.{4})$/, '$1********$3');
};

// 掩码显示银行账号
const maskBankAccount = (account) => {
  if (!account) return '';
  return account.replace(/^(.{4})(.*)(.{4})$/, '$1****$3');
};

// 处理通过审核
const handleApprove = async (verification) => {
  if (!verification || !verification.id) {
    ElMessage.error('无效的认证信息');
    return;
  }
  
  try {
    await ElMessageBox.confirm(
      '确定要通过该用户的实名认证申请吗？',
      '确认操作',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'success'
      }
    );
    
    submitting.value = true;
    await userVerificationStore.reviewVerification(verification.id, 'approved');
    ElMessage.success('已通过该用户的实名认证申请');
    
    // 关闭详情对话框（如果打开的话）
    if (detailsDialogVisible.value) {
      detailsDialogVisible.value = false;
      currentDetails.value = null;
    }
    
    await fetchPendingVerifications();
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(typeof error === 'string' ? error : '操作失败，请重试');
    }
  } finally {
    submitting.value = false;
  }
};

// 处理拒绝审核
const handleReject = (verification) => {
  if (!verification || !verification.id) {
    ElMessage.error('无效的认证信息');
    return;
  }
  
  currentVerification.value = verification;
  rejectForm.value.comment = '';
  rejectDialogVisible.value = true;
};

// 确认拒绝
const confirmReject = async () => {
  if (!rejectFormRef.value) return;
  
  try {
    await rejectFormRef.value.validate();
    submitting.value = true;
    
    await userVerificationStore.reviewVerification(
      currentVerification.value.id,
      'rejected',
      rejectForm.value.comment
    );
    
    rejectDialogVisible.value = false;
    
    // 关闭详情对话框（如果打开的话）
    if (detailsDialogVisible.value) {
      detailsDialogVisible.value = false;
      currentDetails.value = null;
    }
    
    ElMessage.success('已拒绝该用户的实名认证申请');
    await fetchPendingVerifications();
  } catch (error) {
    ElMessage.error(typeof error === 'string' ? error : '操作失败，请重试');
  } finally {
    submitting.value = false;
  }
};

// 查看详情
const handleViewDetails = async (verification) => {
  try {
    detailsLoading.value = true;
    detailsDialogVisible.value = true;
    currentDetails.value = null;
    
    const details = await userVerificationStore.getVerificationDetails(verification.id);
    currentDetails.value = details;
  } catch (error) {
    ElMessage.error(error.toString());
  } finally {
    detailsLoading.value = false;
  }
};

// 添加处理关闭详情对话框的方法
const handleCloseDetailsDialog = (done) => {
  if (submitting.value) {
    ElMessage.warning('正在处理中，请稍候...');
    return;
  }
  done();
};

// 初始化
onMounted(() => {
  fetchPendingVerifications();
});
</script>

<style scoped>
/* Martin Garrix Design Language - White Theme */
.verification-check-container {
  padding: 24px;
  background-color: #f5f5f7; /* --garrix-off-white */
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
}

:deep(.el-card) {
  background-color: #ffffff; /* --garrix-white */
  border-radius: 0;
  border: 1px solid #000000; /* --garrix-black */
  box-shadow: 5px 5px 0px 0px rgba(0,0,0,1);
  transition: all 0.2s ease-in-out;
}

:deep(.el-card:hover) {
    box-shadow: 7px 7px 0px 0px rgba(0,0,0,1);
    transform: translate(-2px, -2px);
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-content h2 {
  font-size: 20px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  color: #000000; /* --garrix-black */
}

/* General Button Styles */
:deep(.el-button) {
  border-radius: 0;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  transition: all 0.3s ease;
  border-width: 2px;
  box-shadow: none;
}

:deep(.el-button.is-round) {
  border-radius: 20px;
}

/* Primary Button (and Refresh) */
:deep(.el-button--primary) {
  background-color: #000000; /* --garrix-black */
  border-color: #000000; /* --garrix-black */
  color: #ffffff; /* --garrix-white */
}

:deep(.el-button--primary:hover) {
  background-color: #ffffff; /* --garrix-white */
  color: #000000; /* --garrix-black */
  border-color: #000000; /* --garrix-black */
}

/* Table Styles */
:deep(.el-table) {
  --el-table-border-color: #eaeaea; /* --garrix-light-gray */
  --el-table-header-bg-color: #ffffff; /* --garrix-white */
  --el-table-tr-bg-color: #ffffff; /* --garrix-white */
  --el-table-row-hover-bg-color: #f5f5f7; /* --garrix-off-white */
  border: 1px solid #000;
}

:deep(.el-table th.el-table__cell) {
  background-color: var(--el-table-header-bg-color);
  color: #666666; /* --garrix-dark-gray */
  font-weight: 700;
  text-transform: uppercase;
  font-size: 11px;
  letter-spacing: 0.5px;
  border-bottom: 2px solid #000000; /* --garrix-black */
}

:deep(.el-table td.el-table__cell) {
  padding: 12px 10px;
  color: #333;
  font-size: 14px;
  vertical-align: top;
}

.info-cell {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.info-line {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
}

.info-line strong {
    font-weight: 600;
    color: #333;
}

.info-icon {
  color: #999;
}

:deep(.el-table__body tr:hover > td.el-table__cell) {
  background-color: var(--el-table-row-hover-bg-color) !important;
}

:deep(.el-table__empty-block) {
  padding: 40px 0;
  text-align: center;
}
:deep(.el-table__empty-text) {
  color: #999999; /* --garrix-medium-gray */
  font-size: 14px;
}

/* Action Buttons in Table */
:deep(.el-button--success) {
  background-color: transparent;
  border-color: #28a745; /* --garrix-success */
  color: #28a745;
}
:deep(.el-button--success:hover) {
  background-color: #28a745;
  color: #ffffff;
}

:deep(.el-button--danger) {
  background-color: transparent;
  border-color: #dc3545; /* --garrix-danger */
  color: #dc3545;
}
:deep(.el-button--danger:hover) {
  background-color: #dc3545;
  color: #ffffff;
}

:deep(.el-button--info) {
  background-color: transparent;
  border-color: #666666; /* --garrix-dark-gray */
  color: #666666;
}
:deep(.el-button--info:hover) {
  background-color: #666666;
  color: #ffffff;
}

/* Dialog Styles */
:deep(.el-dialog) {
  border-radius: 0;
  border: 2px solid #000000; /* --garrix-black */
  background: #fff;
  box-shadow: 6px 6px 0 0 #000;
}
:deep(.el-dialog__header) {
  border-bottom: 2px solid #000000; /* --garrix-black */
  padding: 16px 24px;
  margin-right: 0;
}
:deep(.el-dialog__title) {
  color: #000000; /* --garrix-black */
  text-transform: uppercase;
  letter-spacing: 1px;
  font-size: 18px;
  font-weight: 700;
}
:deep(.el-dialog__body) {
  padding: 24px;
}
:deep(.el-dialog__footer) {
  border-top: 2px solid #000000; /* --garrix-black */
  padding: 16px 24px;
}

/* Form Styles in Dialog */
:deep(.el-form-item__label) {
  color: #666666; /* --garrix-dark-gray */
  text-transform: uppercase;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.2;
  margin-bottom: 8px;
}

:deep(.el-input__wrapper), :deep(.el-textarea__inner) {
  background-color: #ffffff; /* --garrix-white */
  border: 2px solid #000;
  border-radius: 0;
  box-shadow: none !important;
  padding: 2px 12px;
  transition: all 0.2s ease;
}
:deep(.el-input__wrapper:hover), :deep(.el-textarea__inner:hover) {
  background-color: #f5f5f7;
}
:deep(.el-input__wrapper.is-focus), :deep(.el-textarea__inner:focus) {
  background-color: #ffffff;
}

/* Details View Styles */
.verification-details {
  padding: 10px 0;
}
.detail-item {
  margin-bottom: 16px;
  display: flex;
  align-items: baseline;
  font-size: 14px;
}
.detail-label {
  font-weight: 700;
  color: #000000;
  min-width: 100px;
  text-align: left;
  text-transform: uppercase;
  font-size: 12px;
}
.sensitive-data, .bank-account-data {
  color: #000000;
  font-weight: 500;
  font-family: monospace;
  background: #f5f5f7;
  padding: 2px 6px;
}
.sensitive-icon {
  margin-left: 8px;
  color: #999;
}
.sensitive-icon:hover {
  color: #000;
}

.details-loading {
  padding: 20px 0;
}
</style> 