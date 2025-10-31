<template>
  <div class="user-management-container">
    <el-card class="full-width-card">
      <template #header>
        <div class="header-content">
          <h2>用户管理</h2>
          <div class="header-actions">
            <el-input
              v-model="searchKeyword"
              placeholder="搜索用户名/邮箱"
              clearable
              @clear="fetchUsers"
              @keyup.enter="searchUsers"
              style="width: 250px; margin-right: 10px;"
            >
              <template #append>
                <el-button @click="searchUsers">
                  <el-icon><Search /></el-icon>
                </el-button>
              </template>
            </el-input>
            <el-button type="primary" @click="fetchUsers">
              <el-icon><Refresh /></el-icon> 刷新列表
            </el-button>
          </div>
        </div>
      </template>

      <!-- 用户列表 -->
      <el-table
        v-loading="loading"
        :data="users"
        style="width: 100%"
        empty-text="暂无用户数据"
        border
      >
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="username" label="用户名" min-width="150" />
        <el-table-column prop="email" label="邮箱" min-width="200" />
        <el-table-column label="注册时间" min-width="180">
          <template #default="scope">
            {{ formatDateTime(scope.row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column prop="lastLoginIp" label="最后登录IP" min-width="150" />
        <el-table-column prop="lastLoginLocation" label="登录地区" min-width="180" />
        <el-table-column label="实名认证状态" min-width="120">
          <template #default="scope">
            <el-tag :type="getVerificationStatusType(scope.row.verificationStatus)">
              {{ getVerificationStatusText(scope.row.verificationStatus) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" min-width="100">
          <template #default="scope">
            <el-tag :type="scope.row.isActive ? 'success' : 'danger'">
              {{ scope.row.isActive ? '正常' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" min-width="200" fixed="right">
          <template #default="scope">
            <el-button
              type="primary"
              size="small"
              @click="handleViewDetails(scope.row)"
            >
              查看
            </el-button>
            <el-button
              type="warning"
              size="small"
              @click="handleEdit(scope.row)"
            >
              编辑
            </el-button>
            <el-button
              :type="scope.row.isActive ? 'danger' : 'success'"
              size="small"
              @click="handleToggleStatus(scope.row)"
            >
              {{ scope.row.isActive ? '禁用' : '启用' }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-container">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          :total="total"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <!-- 用户详情对话框 -->
    <el-dialog
      v-model="detailsDialogVisible"
      title="用户详情"
      width="600px"
      :close-on-click-modal="false"
    >
      <div v-if="detailsLoading" class="details-loading">
        <el-skeleton :rows="8" animated />
      </div>
      <div v-else-if="currentUser" class="user-details">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="用户ID">{{ currentUser.id }}</el-descriptions-item>
          <el-descriptions-item label="用户名">{{ currentUser.username }}</el-descriptions-item>
          <el-descriptions-item label="邮箱">{{ currentUser.email }}</el-descriptions-item>
          <el-descriptions-item label="注册时间">{{ formatDateTime(currentUser.createdAt) }}</el-descriptions-item>
          <el-descriptions-item label="最后登录时间">{{ formatDateTime(currentUser.lastLoginAt) }}</el-descriptions-item>
          <el-descriptions-item label="最后登录IP">{{ currentUser.lastLoginIp || '暂无记录' }}</el-descriptions-item>
          <el-descriptions-item label="最后登录地区">{{ currentUser.lastLoginLocation || '暂无记录' }}</el-descriptions-item>
          <el-descriptions-item label="账号状态">
            <el-tag :type="currentUser.isActive ? 'success' : 'danger'">
              {{ currentUser.isActive ? '正常' : '禁用' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="实名认证状态">
            <el-tag :type="getVerificationStatusType(currentUser.verificationStatus)">
              {{ getVerificationStatusText(currentUser.verificationStatus) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item v-if="currentUser.verificationInfo" label="实名信息">
            <div><strong>真实姓名：</strong>{{ currentUser.verificationInfo.realName }}</div>
            <div><strong>身份证号：</strong>{{ currentUser.verificationInfo.idNumber }}</div>
            <div><strong>银行账号：</strong>{{ currentUser.verificationInfo.bankAccount }}</div>
            <div><strong>开户银行：</strong>{{ currentUser.verificationInfo.bankName }}</div>
          </el-descriptions-item>
          <el-descriptions-item label="专辑数量">{{ currentUser.albumCount || 0 }}</el-descriptions-item>
          <el-descriptions-item label="歌曲数量">{{ currentUser.songCount || 0 }}</el-descriptions-item>
        </el-descriptions>

        <div class="details-actions">
          <el-button @click="detailsDialogVisible = false">关闭</el-button>
          <el-button type="warning" @click="handleEdit(currentUser)">编辑用户</el-button>
          <el-button 
            :type="currentUser.isActive ? 'danger' : 'success'"
            @click="handleToggleStatus(currentUser)"
          >
            {{ currentUser.isActive ? '禁用账号' : '启用账号' }}
          </el-button>
        </div>
      </div>
    </el-dialog>

    <!-- 编辑用户对话框 -->
    <el-dialog
      v-model="editDialogVisible"
      title="编辑用户信息"
      width="500px"
      :close-on-click-modal="false"
    >
      <el-form
        v-if="editForm"
        ref="editFormRef"
        :model="editForm"
        :rules="editRules"
        label-width="100px"
      >
        <el-form-item label="用户名" prop="username">
          <el-input v-model="editForm.username" />
        </el-form-item>
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="editForm.email" />
        </el-form-item>
        <el-form-item label="账号状态">
          <el-switch
            v-model="editForm.isActive"
            :active-text="'启用'"
            :inactive-text="'禁用'"
          />
        </el-form-item>
        <el-form-item label="重置密码" prop="resetPassword">
          <el-switch v-model="editForm.resetPassword" />
        </el-form-item>
        <el-form-item v-if="editForm.resetPassword" label="新密码" prop="newPassword">
          <el-input v-model="editForm.newPassword" type="password" show-password />
        </el-form-item>
      </el-form>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="editDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitEditForm" :loading="submitting">
            保存
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Refresh, Search, Warning } from '@element-plus/icons-vue';
import { useUserStore } from '../../stores/user';

const userStore = useUserStore();
const loading = ref(false);
const submitting = ref(false);
const users = ref([]);
const total = ref(0);
const currentPage = ref(1);
const pageSize = ref(20);
const searchKeyword = ref('');

// 用户详情相关
const detailsDialogVisible = ref(false);
const detailsLoading = ref(false);
const currentUser = ref(null);

// 编辑用户相关
const editDialogVisible = ref(false);
const editFormRef = ref(null);
const editForm = ref(null);

const editRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '用户名长度应为3-20个字符', trigger: 'blur' }
  ],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }
  ],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '密码长度不能少于6个字符', trigger: 'blur' }
  ]
};

// 获取用户列表
const fetchUsers = async () => {
  try {
    loading.value = true;
    searchKeyword.value = ''; // 清空搜索关键词
    
    const result = await userStore.getAllUsers({
      page: currentPage.value,
      pageSize: pageSize.value
    });
    
    users.value = result.users;
    total.value = result.total;
  } catch (error) {
    ElMessage.error(typeof error === 'string' ? error : '获取用户列表失败');
  } finally {
    loading.value = false;
  }
};

// 搜索用户
const searchUsers = async () => {
  if (!searchKeyword.value.trim()) {
    return fetchUsers();
  }
  
  try {
    loading.value = true;
    
    const result = await userStore.searchUsers({
      keyword: searchKeyword.value,
      page: currentPage.value,
      pageSize: pageSize.value
    });
    
    users.value = result.users;
    total.value = result.total;
  } catch (error) {
    ElMessage.error(typeof error === 'string' ? error : '搜索用户失败');
  } finally {
    loading.value = false;
  }
};

// 处理页码变化
const handleCurrentChange = (page) => {
  currentPage.value = page;
  if (searchKeyword.value) {
    searchUsers();
  } else {
    fetchUsers();
  }
};

// 处理每页数量变化
const handleSizeChange = (size) => {
  pageSize.value = size;
  if (searchKeyword.value) {
    searchUsers();
  } else {
    fetchUsers();
  }
};

// 格式化日期时间
const formatDateTime = (dateString) => {
  if (!dateString) return '未知';
  return new Date(dateString).toLocaleString('zh-CN');
};

// 获取实名认证状态类型
const getVerificationStatusType = (status) => {
  switch (status) {
    case 'approved': return 'success';
    case 'pending': return 'warning';
    case 'rejected': return 'danger';
    default: return 'info';
  }
};

// 获取实名认证状态文本
const getVerificationStatusText = (status) => {
  switch (status) {
    case 'approved': return '已认证';
    case 'pending': return '审核中';
    case 'rejected': return '已拒绝';
    default: return '未认证';
  }
};

// 查看用户详情
const handleViewDetails = async (user) => {
  try {
    detailsLoading.value = true;
    detailsDialogVisible.value = true;
    currentUser.value = null;
    
    const userDetails = await userStore.getUserDetails(user.id);
    currentUser.value = userDetails;
  } catch (error) {
    ElMessage.error(typeof error === 'string' ? error : '获取用户详情失败');
  } finally {
    detailsLoading.value = false;
  }
};

// 编辑用户
const handleEdit = (user) => {
  editForm.value = {
    id: user.id,
    username: user.username,
    email: user.email,
    isActive: user.isActive !== false, // 默认为true
    resetPassword: false,
    newPassword: ''
  };
  
  // 如果当前正在显示详情，关闭详情对话框
  if (detailsDialogVisible.value) {
    detailsDialogVisible.value = false;
  }
  
  editDialogVisible.value = true;
};

// 提交编辑表单
const submitEditForm = async () => {
  if (!editFormRef.value) return;
  
  try {
    // 验证表单
    await editFormRef.value.validate();
    
    submitting.value = true;
    
    // 如果选择重置密码但未输入新密码
    if (editForm.value.resetPassword && !editForm.value.newPassword) {
      ElMessage.warning('请输入新密码');
      submitting.value = false;
      return;
    }
    
    // 提交更新
    await userStore.updateUser({
      id: editForm.value.id,
      username: editForm.value.username,
      email: editForm.value.email,
      isActive: editForm.value.isActive,
      resetPassword: editForm.value.resetPassword,
      newPassword: editForm.value.resetPassword ? editForm.value.newPassword : undefined
    });
    
    ElMessage.success('用户信息更新成功');
    editDialogVisible.value = false;
    
    // 刷新用户列表
    if (searchKeyword.value) {
      searchUsers();
    } else {
      fetchUsers();
    }
    
    // 如果当前正在显示详情，刷新详情
    if (currentUser.value && currentUser.value.id === editForm.value.id) {
      handleViewDetails({ id: editForm.value.id });
    }
  } catch (error) {
    ElMessage.error(typeof error === 'string' ? error : '更新用户信息失败');
  } finally {
    submitting.value = false;
  }
};

// 切换用户状态（启用/禁用）
const handleToggleStatus = async (user) => {
  try {
    const newStatus = !user.isActive;
    const actionText = newStatus ? '启用' : '禁用';
    
    await ElMessageBox.confirm(
      `确定要${actionText}用户 "${user.username}" 的账号吗？`,
      `${actionText}确认`,
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: newStatus ? 'success' : 'warning'
      }
    );
    
    await userStore.updateUserStatus(user.id, newStatus);
    
    ElMessage.success(`已${actionText}用户账号`);
    
    // 更新本地数据
    if (users.value) {
      const index = users.value.findIndex(u => u.id === user.id);
      if (index !== -1) {
        users.value[index].isActive = newStatus;
      }
    }
    
    // 如果当前正在显示详情，更新详情
    if (currentUser.value && currentUser.value.id === user.id) {
      currentUser.value.isActive = newStatus;
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(typeof error === 'string' ? error : '操作失败，请重试');
    }
  }
};

// 初始化
onMounted(() => {
  fetchUsers();
});
</script>

<style scoped>
/* Martin Garrix Design Language - White Theme */
.user-management-container {
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
  overflow: visible; /* For pagination dropdowns */
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

/* Search Input */
:deep(.header-actions .el-input .el-input__wrapper) {
  border-radius: 0 !important;
  border: 2px solid #000;
  box-shadow: none !important;
  transition: all 0.2s ease;
}
:deep(.header-actions .el-input .el-input__wrapper:hover) {
  background-color: #f5f5f7;
}
:deep(.header-actions .el-input-group__append) {
  border-radius: 0;
  background: #000;
  border-color: #000;
  color: #fff;
}
:deep(.header-actions .el-input-group__append .el-button:hover) {
  background: #333;
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
}

:deep(.el-table__body tr:hover > td.el-table__cell) {
  background-color: var(--el-table-row-hover-bg-color) !important;
}

/* Tag Styles */
:deep(.el-tag) {
  border-radius: 0;
  font-weight: 700;
  font-size: 10px;
  text-transform: uppercase;
  border-width: 2px;
  border-style: solid;
}
:deep(.el-tag--success) {
  background-color: transparent; border-color: #28a745; color: #28a745;
}
:deep(.el-tag--warning) {
  background-color: transparent; border-color: #ffc107; color: #ffc107;
}
:deep(.el-tag--danger) {
  background-color: transparent; border-color: #dc3545; color: #dc3545;
}
:deep(.el-tag--info) {
  background-color: transparent; border-color: #6c757d; color: #6c757d;
}

/* Action Buttons in Table */
:deep(.el-button--warning) {
  background-color: transparent; border-color: #ffc107; color: #ffc107;
}
:deep(.el-button--warning:hover) {
  background-color: #ffc107; color: #000;
}
:deep(.el-button--danger) {
  background-color: transparent; border-color: #dc3545; color: #dc3545;
}
:deep(.el-button--danger:hover) {
  background-color: #dc3545; color: #fff;
}
:deep(.el-button--success) {
  background-color: transparent; border-color: #28a745; color: #28a745;
}
:deep(.el-button--success:hover) {
  background-color: #28a745; color: #fff;
}


/* Pagination */
.pagination-container {
  margin-top: 24px;
  padding: 0;
  display: flex;
  justify-content: flex-end;
}
:deep(.el-pagination) {
  --el-pagination-bg-color: #fff;
  --el-pagination-button-disabled-bg-color: #f5f5f7;
  --el-pagination-button-bg-color: #fff;
  padding: 0;
}
:deep(.el-pagination .el-select .el-input__wrapper) {
  border-radius: 0;
  border: 2px solid #000;
  box-shadow: none !important;
}
:deep(.el-pagination .btn-prev),
:deep(.el-pagination .btn-next),
:deep(.el-pagination .el-pager li) {
  border-radius: 0;
  border: 2px solid #000;
  margin: 0 4px;
  background: #fff;
  min-width: 36px;
  height: 36px;
}
:deep(.el-pagination .el-pager li:hover) {
  color: #000;
}
:deep(.el-pagination .el-pager li.is-active) {
  background: #000;
  color: #fff;
  border-color: #000;
}
:deep(.el-pagination .el-pagination__jumper .el-input__wrapper) {
  border-radius: 0;
  border: 2px solid #000;
  box-shadow: none !important;
  height: 36px;
}
:deep(.el-pagination__total) {
  font-weight: 700;
  color: #000;
}

/* Dialog Styles */
:deep(.el-dialog) {
  border-radius: 0;
  border: 2px solid #000000;
  background: #fff;
  box-shadow: 6px 6px 0 0 #000;
}
:deep(.el-dialog__header) {
  border-bottom: 2px solid #000000;
  padding: 16px 24px;
  margin-right: 0;
}
:deep(.el-dialog__title) {
  color: #000000;
  text-transform: uppercase;
  letter-spacing: 1px;
  font-size: 18px;
  font-weight: 700;
}
:deep(.el-dialog__body) {
  padding: 24px;
}
:deep(.el-dialog__footer) {
  border-top: 2px solid #000000;
  padding: 16px 24px;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

/* Descriptions in Details Dialog */
:deep(.el-descriptions) {
  border-radius: 0;
  border: 2px solid #000;
}
:deep(.el-descriptions__label) {
  font-weight: 700;
  text-transform: uppercase;
  font-size: 11px;
  color: #666;
  background: #f5f5f7 !important;
}
:deep(.el-descriptions__content) {
  background: #fff !important;
}
:deep(.el-descriptions-item__cell) {
  padding: 12px;
}

.details-actions {
  margin-top: 24px;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

/* Form Styles in Edit Dialog */
:deep(.el-form-item__label) {
  color: #666;
  text-transform: uppercase;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.2;
}
:deep(.el-input__wrapper), :deep(.el-textarea__inner) {
  background-color: #ffffff;
  border: 2px solid #000;
  border-radius: 0;
  box-shadow: none !important;
  transition: all 0.2s ease;
}
:deep(.el-input__wrapper:hover), :deep(.el-textarea__inner:hover) {
  background-color: #f5f5f7;
}

/* Switch style */
:deep(.el-switch) {
  --el-switch-on-color: #000000;
  --el-switch-off-color: #ccc;
  --el-switch-border-color: #000;
}
:deep(.el-switch__core) {
  border-radius: 0;
  width: 50px !important;
  height: 24px;
}
:deep(.el-switch__core .el-switch__action) {
  border-radius: 0;
  height: 16px;
  width: 16px;
  top: 3px;
  left: 3px;
}
:deep(.el-switch.is-checked .el-switch__core .el-switch__action) {
  left: 100%;
  margin-left: -19px;
}

.details-loading {
  padding: 20px 0;
}
</style> 