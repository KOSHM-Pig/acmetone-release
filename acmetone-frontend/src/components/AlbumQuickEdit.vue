<template>
  <div class="album-quick-edit">
    <!-- 点击封面触发编辑 -->
    <el-image
      :src="albumCover"
      class="album-cover-clickable"
      fit="cover"
      @click="openEditDialog"
    />
    
    <!-- 编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      title="编辑专辑信息"
      width="500px"
      destroy-on-close
      custom-class="album-edit-dialog"
    >
      <el-form label-position="top" size="small">
        <el-form-item label="专辑封面">
          <el-upload
            class="avatar-uploader"
            :action="uploadUrl"
            :show-file-list="false"
            :on-success="handleCoverSuccess"
            :headers="uploadHeaders"
          >
            <img v-if="albumData.coverUrl" :src="albumData.coverUrl" class="avatar" />
            <div v-else class="avatar-uploader-icon">
              <el-icon><Plus /></el-icon>
            </div>
          </el-upload>
        </el-form-item>
        <el-form-item label="专辑名称">
          <el-input v-model="albumData.title" />
        </el-form-item>
        <el-form-item label="专辑类型">
          <el-select v-model="albumData.type" placeholder="请选择专辑类型" style="width: 100%;">
            <el-option label="专辑" value="专辑" />
            <el-option label="单曲" value="单曲" />
            <el-option label="EP" value="EP" />
          </el-select>
        </el-form-item>
        <el-form-item label="发行日期">
          <el-date-picker
            v-model="albumData.releaseDate"
            type="date"
            placeholder="选择日期"
            style="width: 100%;"
          />
        </el-form-item>
        <el-form-item label="表演者">
          <el-input v-model="albumData.performer" placeholder="填写专辑主要表演者" />
        </el-form-item>
        <el-form-item label="专辑简介">
          <el-input
            type="textarea"
            v-model="albumData.description"
            :rows="4"
            placeholder="填写专辑简介"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="saveAlbumInfo" :loading="saving">保存</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, defineProps, defineEmits } from 'vue';
import { ElMessage } from 'element-plus';
import { Plus } from '@element-plus/icons-vue';
import { API_BASE_URL, STATIC_BASE_URL } from '@/config';

const props = defineProps({
  albumId: {
    type: [String, Number],
    required: true
  },
  albumCover: {
    type: String,
    default: '/placeholder-album.png'
  },
  initialData: {
    type: Object,
    default: () => ({})
  }
});

const emit = defineEmits(['update:album', 'cover-updated']);

const dialogVisible = ref(false);
const saving = ref(false);

// 初始化专辑数据
const albumData = ref({
  title: props.initialData.title || '',
  type: props.initialData.type || '专辑',
  releaseDate: props.initialData.releaseDate ? new Date(props.initialData.releaseDate) : new Date(),
  performer: props.initialData.performer || '',
  description: props.initialData.description || '',
  coverUrl: props.initialData.coverUrl || props.albumCover
});

// 上传URL
const uploadUrl = computed(() => `${API_BASE_URL}/albums/${props.albumId}/cover`);

// 上传请求头
const uploadHeaders = computed(() => {
  const token = localStorage.getItem('token');
  return {
    Authorization: token ? `Bearer ${token}` : ''
  };
});

// 打开编辑对话框
const openEditDialog = () => {
  // 重置数据
  albumData.value = {
    title: props.initialData.title || '',
    type: props.initialData.type || '专辑',
    releaseDate: props.initialData.releaseDate ? new Date(props.initialData.releaseDate) : new Date(),
    performer: props.initialData.performer || '',
    description: props.initialData.description || '',
    coverUrl: props.initialData.coverUrl || props.albumCover
  };
  
  dialogVisible.value = true;
};

// 处理封面上传成功
const handleCoverSuccess = (response) => {
  if (response && response.filename) {
    albumData.value.coverUrl = `${STATIC_BASE_URL}/${response.filename}`;
    ElMessage.success('封面上传成功');
    
    // 通知父组件封面已更新
    emit('cover-updated', albumData.value.coverUrl);
  } else {
    ElMessage.error('封面上传失败');
  }
};

// 保存专辑信息
const saveAlbumInfo = async () => {
  try {
    saving.value = true;
    
    // 准备保存的数据
    const saveData = {
      title: albumData.value.title,
      type: albumData.value.type,
      releaseDate: albumData.value.releaseDate,
      performer: albumData.value.performer,
      description: albumData.value.description
    };
    
    // 调用API保存专辑信息
    const response = await fetch(`${API_BASE_URL}/albums/${props.albumId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(saveData)
    });
    
    const result = await response.json();
    
    if (response.ok) {
      ElMessage.success('专辑信息保存成功');
      dialogVisible.value = false;
      
      // 通知父组件专辑数据已更新
      emit('update:album', {
        ...saveData,
        coverUrl: albumData.value.coverUrl
      });
    } else {
      ElMessage.error(result.message || '保存失败');
    }
  } catch (error) {
    console.error('保存专辑信息错误:', error);
    ElMessage.error('保存失败');
  } finally {
    saving.value = false;
  }
};
</script>

<style scoped>
.album-cover-clickable {
  cursor: pointer;
  transition: all 0.3s;
  border-radius: 4px;
  overflow: hidden;
  width: 100%;
  height: 100%;
}

.album-cover-clickable:hover {
  transform: scale(1.05);
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.2);
}

.avatar-uploader {
  text-align: center;
}

.avatar {
  width: 120px;
  height: 120px;
  display: block;
  object-fit: cover;
  border-radius: 4px;
}

.avatar-uploader-icon {
  width: 120px;
  height: 120px;
  border: 1px dashed #d9d9d9;
  border-radius: 4px;
  font-size: 28px;
  color: #8c939d;
  display: flex;
  justify-content: center;
  align-items: center;
}

.avatar-uploader-icon:hover {
  border-color: #409EFF;
}
</style> 