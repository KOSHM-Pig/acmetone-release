<template>
  <div class="admin-albums-container">
    <el-card class="box-card">
      <template #header>
        <div class="header-with-actions">
          <h2>专辑审核</h2>
          <div class="view-actions">
            <el-button-group>
              <el-button
                type="primary"
                :plain="true"
                @click="viewApprovedAlbums"
              >
                查看已通过专辑
              </el-button>
              <el-button
                type="danger"
                :plain="true"
                @click="viewRejectedAlbums"
              >
                查看已拒绝专辑
              </el-button>
            </el-button-group>

            <!-- 批量操作按钮 -->
            <div class="batch-actions" v-if="selectedAlbums.length > 0">
              <el-button
                type="success"
                @click="batchApprove"
                :loading="batchLoading"
              >
                批量通过 ({{ selectedAlbums.length }})
              </el-button>
              <el-button
                type="danger"
                @click="batchReject"
                :loading="batchLoading"
              >
                批量驳回 ({{ selectedAlbums.length }})
              </el-button>
              <el-button
                type="info"
                @click="batchDownloadMaterials"
                :loading="downloadLoading"
              >
                批量下载物料 ({{ selectedAlbums.length }})
              </el-button>
            </div>
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
        <el-button class="refresh-btn" type="primary" @click="fetchAlbums">
          刷新
        </el-button>
      </div>

      <div v-else-if="albumStore.pendingAlbums.length === 0" class="empty-container">
        <el-empty description="暂无待审核的专辑" />
      </div>

      <el-table v-else :data="albumStore.pendingAlbums" stripe>
        <el-table-column label="专辑名称" prop="title" />
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
        <el-table-column label="提交时间" width="180">
          <template #default="{ row }">
            {{ formatDateTime(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200">
          <template #default="{ row }">
            <el-button @click="handleView(row)" link type="primary">
              查看
            </el-button>
            <el-button @click="handleApprove(row)" link type="success">
              通过
            </el-button>
            <el-button @click="handleReject(row)" link type="danger">
              拒绝
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 审核对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="50%"
    >
      <el-form
        ref="formRef"
        :model="form"
        label-width="100px"
      >
        <el-form-item label="审核意见">
          <el-input
            v-model="form.comment"
            type="textarea"
            :rows="4"
            placeholder="请输入审核意见"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleSubmit" :loading="submitLoading">
            确定
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ElMessage } from 'element-plus';
import { onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAlbumStore } from '../../stores/album';

const albumStore = useAlbumStore();
const router = useRouter();
const dialogVisible = ref(false);
const dialogTitle = ref('');
const loading = ref(false);
const submitLoading = ref(false);
const batchLoading = ref(false);
const errorMessage = ref('');
const currentAlbum = ref(null);
const currentAction = ref('');
const selectedAlbums = ref([]);

const form = reactive({
  comment: '',
});

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

const handleApprove = (album) => {
  currentAlbum.value = album;
  currentAction.value = 'approved';
  dialogTitle.value = '审核通过';
  form.comment = '';
  dialogVisible.value = true;
};

const handleReject = (album) => {
  currentAlbum.value = album;
  currentAction.value = 'rejected';
  dialogTitle.value = '审核拒绝';
  form.comment = '';
  dialogVisible.value = true;
};

const handleSubmit = async () => {
  if (!currentAlbum.value || !currentAction.value) return;

  try {
    submitLoading.value = true;
    await albumStore.updateAlbumStatus(
      currentAlbum.value.id,
      currentAction.value,
      form.comment
    );
    await fetchAlbums();
    ElMessage.success('审核操作成功');
    dialogVisible.value = false;
  } catch (error) {
    console.error('审核操作失败:', error);
    ElMessage.error(error.toString());
  } finally {
    submitLoading.value = false;
    form.comment = '';
    currentAlbum.value = null;
    currentAction.value = '';
  }
};

const fetchAlbums = async () => {
  try {
    loading.value = true;
    errorMessage.value = '';
    await albumStore.fetchPendingAlbums();
    
  } catch (error) {
    console.error('获取待审核专辑失败:', error);
    errorMessage.value = '获取待审核专辑失败：' + (error.message || '未知错误');
    ElMessage.error('获取待审核专辑失败');
  } finally {
    loading.value = false;
  }
};

const viewApprovedAlbums = () => {
  router.push('/admin/approved-albums');
};

const viewRejectedAlbums = () => {
  router.push('/admin/rejected-albums');
};

onMounted(fetchAlbums);
</script>

<style scoped>
.admin-albums-container {
  padding: 20px;
  background-color: #F5F7FA;
  min-height: 100vh;
}

.box-card {
  border: 2px solid #000;
  border-radius: 0;
  box-shadow: 5px 5px 0px 0px #000;
}

:deep(.el-card__header) {
  border-bottom: 2px solid #000;
  background-color: #fff;
  padding: 20px;
}

.header-with-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

h2 {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  text-transform: uppercase;
}

.view-actions {
  display: flex;
  gap: 10px;
}

:deep(.el-table) {
  border-top: 2px solid #000;
  border-bottom: 2px solid #000;
  border-left: none;
  border-right: none;
  border-radius: 0;
}

:deep(.el-table th),
:deep(.el-table td) {
  border-color: #000;
}

:deep(.el-table thead) {
  background-color: #fff;
  color: #000;
  text-transform: uppercase;
  font-weight: 700;
}

:deep(.el-table th.el-table__cell) {
    background-color: #fff;
}

:deep(.el-button), :deep(.el-button-group .el-button) {
  border-radius: 0;
  border: 2px solid #000;
  background-color: #000;
  color: #fff;
  font-weight: bold;
  text-transform: uppercase;
}

:deep(.el-button:hover:not(.is-disabled)) {
  background-color: #333;
  border-color: #000;
}

:deep(.el-button[link]) {
    background-color: transparent;
    border: none;
    color: #000;
    text-decoration: underline;
}

:deep(.el-button--success[link]) { color: #67C23A; }
:deep(.el-button--danger[link]) { color: #F56C6C; }

:deep(.el-button--primary) {
  background-color: #000;
  color: #fff;
}

:deep(.el-button--primary.is-plain) {
    background-color: #fff;
    color: #000;
}

:deep(.el-button--danger.is-plain) {
    background-color: #fff;
    color: #000;
    border-color: #000;
}
:deep(.el-button--danger.is-plain:hover) {
    background-color: #f0f0f0;
}


:deep(.el-dialog) {
  border-radius: 0;
  border: 2px solid #000;
  box-shadow: 5px 5px 0px 0px #000;
}
:deep(.el-dialog__header) {
  border-bottom: 2px solid #000;
  padding: 20px;
}
:deep(.el-dialog__title) {
  font-weight: bold;
  text-transform: uppercase;
}

:deep(.el-form-item__label) {
    font-weight: bold;
    text-transform: uppercase;
}

:deep(.el-input__wrapper), :deep(.el-textarea__inner) {
  border-radius: 0;
  border: 2px solid #000;
  box-shadow: none !important;
}

.loading-container, .error-container, .empty-container {
  margin: 40px 0;
  text-align: center;
}

.refresh-btn {
  margin-top: 20px;
}

</style> 