<template>
  <div class="admin-panel">
    <h3 class="admin-title">管理员控制面板</h3>
    <div class="admin-form-container">
      <el-form :model="adminForm" label-position="top">
        <el-form-item label="专辑状态">
          <el-select v-model="adminForm.statusType" placeholder="请选择状态" popper-class="garrix-select-popper" @change="handleStatusChange">
            <el-option label="草稿" value="draft" />
            <el-option label="待审核" value="pending" />
            <el-option label="已通过" value="approved" />
            <el-option label="已拒绝" value="rejected" />
          </el-select>
        </el-form-item>
        <el-form-item label="审核意见">
          <el-input 
            v-model="adminForm.comment" 
            type="textarea" 
            :rows="3" 
            placeholder="请输入审核意见"
          />
        </el-form-item>
        <el-form-item>
          <button type="button" class="garrix-btn" @click="updateStatus" :disabled="submitting">
            <span v-if="submitting">更新中...</span>
            <span v-else>更新状态</span>
          </button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, defineProps, defineEmits, onMounted, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { useAlbumStore } from '@/stores/album';

const props = defineProps({
  albumId: {
    type: [Number, String],
    required: true
  },
  initialStatus: {
    type: String,
    default: 'pending'
  },
  initialComment: {
    type: String,
    default: ''
  }
});

const emit = defineEmits(['update-success']);

const albumStore = useAlbumStore();
const submitting = ref(false);

// 管理员表单
const adminForm = reactive({
  status: props.initialStatus,
  statusType: 'pending', // 用于UI显示的状态类型
  comment: props.initialComment
});

// 监听props变化，更新表单数据
watch(() => [props.initialStatus, props.initialComment], () => {
  adminForm.status = props.initialStatus;
  adminForm.comment = props.initialComment;
  determineStatusType();
}, { immediate: false });

// 在组件挂载时，根据初始状态和评论确定正确的状态类型
onMounted(() => {
  determineStatusType();
});

// 确定状态类型
const determineStatusType = () => {
  // 如果评论以"DRAFT:"开头，则认为是草稿状态
  if (adminForm.comment && adminForm.comment.startsWith('DRAFT:')) {
    adminForm.statusType = 'draft';
  } else if (adminForm.status === 'pending') {
    adminForm.statusType = 'pending';
  } else {
    // 否则使用实际状态
    adminForm.statusType = adminForm.status;
  }
};

// 处理状态变更
const handleStatusChange = (value) => {
  // 如果选择草稿状态
  if (value === 'draft') {
    adminForm.status = 'pending'; // 实际状态为pending
    // 如果评论不是以DRAFT:开头，则添加DRAFT:前缀
    if (!adminForm.comment.startsWith('DRAFT:')) {
      adminForm.comment = 'DRAFT: 尚未提交审核';
    }
  } else {
    // 其他状态直接使用选择的值
    adminForm.status = value;
    
    // 如果之前是草稿状态，清除DRAFT:前缀
    if (adminForm.comment.startsWith('DRAFT:')) {
      adminForm.comment = '';
    }

    // 为不同状态设置默认评论
    if (value === 'pending' && !adminForm.comment) {
      adminForm.comment = '已重新提交审核';
    } else if (value === 'approved' && !adminForm.comment) {
      adminForm.comment = '审核通过';
    } else if (value === 'rejected' && !adminForm.comment) {
      adminForm.comment = '审核未通过，请修改后重新提交';
    }
  }
};

// 更新专辑状态
const updateStatus = async () => {
  if (!props.albumId) return;
  
  try {
    submitting.value = true;
    await albumStore.updateAlbumStatus(props.albumId, adminForm.status, adminForm.comment);
    ElMessage.success('专辑状态更新成功');
    emit('update-success');
  } catch (error) {
    console.error('更新专辑状态失败:', error);
    ElMessage.error(error.message || '更新专辑状态失败');
  } finally {
    submitting.value = false;
  }
};
</script>

<style scoped>
.admin-panel {
  margin-bottom: 20px;
  padding: 20px;
  border: 2px solid #000;
  background-color: #f9f9f9;
  box-shadow: 4px 4px 0 rgba(0, 0, 0, 0.1);
}

.admin-title {
  font-size: 1.5rem;
  margin-top: 0;
  margin-bottom: 20px;
  font-weight: 700;
  color: #000;
  border-bottom: 2px solid #000;
  padding-bottom: 10px;
}

.admin-form-container {
  max-width: 600px;
}

/* 继承主样式文件中的按钮样式 */
</style> 