<template>
  <div class="rights-chain-container">
    <div v-if="loading" class="loading-state">
      <el-icon class="is-loading"><Loading /></el-icon>
      <span>加载权利链条数据中...</span>
    </div>
    
    <div v-else-if="error" class="error-state">
      <el-icon><CircleClose /></el-icon>
      <span>{{ error }}</span>
      <button class="garrix-btn" @click="fetchRightsChain">重试</button>
    </div>
    
    <div v-else class="rights-chain-content">
      <div class="section-header">
        <h2 class="section-title">权利链条管理</h2>
        <div class="section-description">
          <p>权利链条用于管理专辑、歌曲和歌手之间的授权关系。请为每个歌手上传对应歌曲的授权文件。</p>
        </div>
      </div>
      
      <!-- 视图切换选项卡 -->
      <el-tabs v-model="activeView" class="view-tabs" type="border-card">
        <el-tab-pane label="表格视图" name="table">
          <!-- 原有的表格视图内容 -->
      <!-- 专辑级授权 -->
      <div class="authorization-section">
        <h3 class="section-subtitle">专辑级授权 (极音记用户/厂牌方对极音记的授权 签署默认厂牌已具备专辑所有歌曲的授权)</h3>
        <div class="auth-file-card">
          <div class="auth-file-info">
            <el-icon><Document /></el-icon>
            <span v-if="rightsChain?.album?.authorizationFile">
              专辑授权文件
            </span>
            <span v-else class="no-file">未上传专辑授权文件</span>
          </div>
          <div class="auth-file-actions">
            <button 
              v-if="rightsChain?.album?.authorizationFile"
              class="garrix-btn"
              @click="previewFile(rightsChain.album.authorizationFile)"
            >
              预览
            </button>
          </div>
        </div>
      </div>
      
      <!-- 歌曲级授权 -->
      <div v-for="song in rightsChain?.songs" :key="song.id" class="song-authorization-section">
        <h3 class="song-title">{{ song.title }}</h3>
        
        
        <!-- 歌手级授权文件 -->
        <div class="artist-auth-section">
          <h4 class="auth-subtitle">歌手级授权(存储厂牌和歌手的授权 尽量填写 以防止艺人与厂牌方发生纠纷)</h4>
          <el-table :data="song.artists" style="width: 100%" border>
            <el-table-column prop="name" label="歌手" width="180">
              <template #default="{ row }">
                <div class="artist-name">
                  {{ row.name }}
                  <span v-if="row.realName" class="artist-realname">({{ row.realName }})</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="授权文件" min-width="200">
              <template #default="{ row }">
                <div v-if="row.authorization?.authorizationFile" class="auth-file-info">
                  <el-icon><Document /></el-icon>
                  <span>{{ rightsChainService.getAuthorizationFileName(row.authorization.authorizationFile) }}</span>
                </div>
                <div v-else class="no-file">未上传授权文件</div>
              </template>
            </el-table-column>
            <el-table-column label="上传时间" width="180">
              <template #default="{ row }">
                <span v-if="row.authorization?.uploadedAt">
                  {{ formatDate(row.authorization.uploadedAt) }}
                </span>
                <span v-else>-</span>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="200" align="center">
              <template #default="{ row }">
                <div class="auth-actions">
                                      <el-upload
                    v-if="canEdit && !row.authorization?.authorizationFile"
                    class="auth-uploader"
                    action="#"
                    :auto-upload="false"
                    :show-file-list="false"
                    :on-change="(file) => handleArtistAuthFileChange(song.id, row.id, file)"
                    accept=".pdf"
                  >
                    <button class="garrix-btn">
                      上传
                    </button>
                  </el-upload>
                  
                  <template v-else-if="row.authorization?.authorizationFile">
                    <button 
                      class="garrix-btn"
                      @click="previewFile(row.authorization.authorizationFile)"
                    >
                      预览
                    </button>
                    <button 
                      v-if="canEdit"
                      class="garrix-btn danger"
                      @click="deleteArtistAuthorization(song.id, row.id)"
                    >
                      删除
                    </button>
                  </template>
                </div>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>
        </el-tab-pane>
        
        <el-tab-pane label="流程图视图" name="flow">
          <!-- 流程图视图 -->
          <RightsChainFlow :album-id="albumId" :can-edit="canEdit" />
        </el-tab-pane>
      </el-tabs>
    </div>
    
    <!-- PDF预览对话框 -->
    <el-dialog
      v-model="previewDialogVisible"
      title="授权文件预览"
      width="80%"
      destroy-on-close
    >
      <div class="pdf-preview-container">
        <iframe 
          v-if="previewUrl" 
          :src="previewUrl" 
          class="pdf-preview-iframe" 
          @load="previewLoaded = true"
          @error="handlePreviewError"
        ></iframe>
        <div v-else-if="previewError" class="preview-error">
          <el-icon><CircleClose /></el-icon>
          <span>{{ previewError }}</span>
        </div>
        <div v-else class="preview-loading">
          <el-icon class="is-loading"><Loading /></el-icon>
          <span>加载预览中...</span>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Document, CircleClose, Loading } from '@element-plus/icons-vue';
import rightsChainService from '@/services/rightsChainService';
import RightsChainFlow from './RightsChainFlow.vue';
import axios from 'axios'; // Added axios import
import { API_BASE_URL } from '@/config'; // 导入API基础URL
import { STATIC_BASE_URL } from '../config';

// 组件属性
const props = defineProps({
  albumId: {
    type: [String, Number],
    required: true
  },
  canEdit: {
    type: Boolean,
    default: false
  }
});

// 响应式状态
const loading = ref(true);
const error = ref(null);
const rightsChain = ref(null);
const previewDialogVisible = ref(false);
const previewUrl = ref('');
const previewLoaded = ref(false);
const previewError = ref(null);
const activeView = ref('table'); // 默认显示表格视图

// 获取权利链条数据
const fetchRightsChain = async () => {
  loading.value = true;
  error.value = null;
  
  try {
    rightsChain.value = await rightsChainService.getAlbumRightsChain(props.albumId);
    console.log('权利链条数据:', rightsChain.value);
  } catch (err) {
    console.error('获取权利链条失败:', err);
    error.value = err.message || '获取权利链条数据失败';
    ElMessage.error('获取权利链条数据失败');
  } finally {
    loading.value = false;
  }
};

// 处理歌曲授权文件上传
const handleSongAuthFileChange = async (songId, file) => {
  if (!file || !file.raw) {
    ElMessage.error('文件无效');
    return;
  }
  
  // 验证文件类型
  if (file.raw.type !== 'application/pdf') {
    ElMessage.error('只能上传PDF文件');
    return;
  }
  
  // 验证文件大小
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.raw.size > maxSize) {
    ElMessage.error('文件大小不能超过10MB');
    return;
  }
  
  try {
    loading.value = true;
    
    // 使用FormData上传文件
    const formData = new FormData();
    formData.append('file', file.raw, file.raw.name);
    
    // 使用axios直接上传文件
    const response = await axios.post(
      `${API_BASE_URL}/rights-chain/albums/${props.albumId}/songs/${songId}/authorization-file`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }
    );
    
    ElMessage.success('歌曲授权文件上传成功');
    await fetchRightsChain();
  } catch (err) {
    console.error('上传歌曲授权文件失败:', err);
    ElMessage.error(err.message || '上传歌曲授权文件失败');
  } finally {
    loading.value = false;
  }
};

// 处理歌手授权文件上传
const handleArtistAuthFileChange = async (songId, artistId, file) => {
  if (!file || !file.raw) {
    ElMessage.error('文件无效');
    return;
  }
  
  // 验证文件类型
  if (file.raw.type !== 'application/pdf') {
    ElMessage.error('只能上传PDF文件');
    return;
  }
  
  // 验证文件大小
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.raw.size > maxSize) {
    ElMessage.error('文件大小不能超过10MB');
    return;
  }
  
  try {
    loading.value = true;
    
    // 使用FormData上传文件
    const formData = new FormData();
    formData.append('file', file.raw, file.raw.name);
    
    // 使用axios直接上传文件
    const response = await axios.post(
      `${API_BASE_URL}/rights-chain/albums/${props.albumId}/songs/${songId}/artists/${artistId}/authorization-file`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }
    );
    
    ElMessage.success('歌手授权文件上传成功');
    await fetchRightsChain();
  } catch (err) {
    console.error('上传歌手授权文件失败:', err);
    ElMessage.error(err.message || '上传歌手授权文件失败');
  } finally {
    loading.value = false;
  }
};

// 删除歌曲授权文件
const deleteSongAuthorization = async (songId) => {
  try {
    await ElMessageBox.confirm(
      '确定要删除此歌曲的授权文件吗？此操作不可恢复。',
      '删除确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );
    
    loading.value = true;
    await rightsChainService.deleteSongAuthorization(props.albumId, songId);
    ElMessage.success('歌曲授权文件删除成功');
    await fetchRightsChain();
  } catch (err) {
    if (err !== 'cancel') {
      console.error('删除歌曲授权文件失败:', err);
      ElMessage.error(err.message || '删除歌曲授权文件失败');
    }
  } finally {
    loading.value = false;
  }
};

// 删除歌手授权文件
const deleteArtistAuthorization = async (songId, artistId) => {
  try {
    await ElMessageBox.confirm(
      '确定要删除此歌手的授权文件吗？此操作不可恢复。',
      '删除确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );
    
    loading.value = true;
    await rightsChainService.deleteSongArtistAuthorization(props.albumId, songId, artistId);
    ElMessage.success('歌手授权文件删除成功');
    await fetchRightsChain();
  } catch (err) {
    if (err !== 'cancel') {
      console.error('删除歌手授权文件失败:', err);
      ElMessage.error(err.message || '删除歌手授权文件失败');
    }
  } finally {
    loading.value = false;
  }
};

// 预览文件
const previewFile = (filePath) => {
  if (!filePath) {
    ElMessage.warning('未找到授权文件');
    return;
  }
  
  // 检查filePath是否是字符串
  if (typeof filePath !== 'string') {
    console.error('文件路径不是字符串:', filePath);
    ElMessage.error('文件路径格式错误');
    return;
  }
  
  // 如果filePath只是一个标记值（如"已上传"），则无法预览
  if (filePath === '已上传' || filePath === true) {
    console.warn('文件路径只是一个标记值，无法预览');
    ElMessage.warning('无法预览文件，请刷新页面后重试');
    return;
  }
  
  try {
    // 确保文件路径格式正确
    let previewPath = filePath;
    
    // 统一处理路径分隔符为正斜杠
    previewPath = previewPath.replace(/\\/g, '/');
    
          // 如果路径不包含http或https前缀，添加API基础URL
    if (!previewPath.startsWith('http://') && !previewPath.startsWith('https://')) {
      // 使用API_BASE_URL的基础部分（去掉/api）
      const baseUrl = STATIC_BASE_URL;
      
      // 确保路径以/开头
      if (!previewPath.startsWith('/')) {
        previewPath = '/' + previewPath;
      }
      
      // 正确拼接URL
      previewPath = baseUrl + previewPath;
    }
    
    console.log('生成的预览URL:', previewPath);
    
    previewUrl.value = previewPath;
  previewLoaded.value = false;
  previewError.value = null;
  previewDialogVisible.value = true;
  } catch (error) {
    console.error('生成预览URL时出错:', error);
    ElMessage.error('无法预览文件: ' + error.message);
  }
};

// 处理预览错误
const handlePreviewError = () => {
  previewError.value = '无法加载预览，请检查文件是否存在';
};

// 格式化日期
const formatDate = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// 监听专辑ID变化
watch(() => props.albumId, (newVal) => {
  if (newVal) {
    fetchRightsChain();
  }
});

// 组件挂载时获取数据
onMounted(() => {
  if (props.albumId) {
  fetchRightsChain();
  }
});
</script>

<style scoped>
.rights-chain-container {
  padding: 20px;
  font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, sans-serif;
}

.section-header {
  margin-bottom: 24px;
}

.section-title {
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 12px;
  letter-spacing: -0.5px;
}

.section-description {
  color: #606266;
  line-height: 1.5;
}

.section-subtitle {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 16px;
  letter-spacing: -0.3px;
}

.loading-state,
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 0;
  gap: 16px;
}

.authorization-section {
  margin-bottom: 32px;
}

.song-authorization-section {
  margin-bottom: 40px;
  border-top: 2px solid #000;
  padding-top: 24px;
}

.song-title {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 16px;
  letter-spacing: -0.3px;
}

.song-auth-section,
.artist-auth-section {
  margin-bottom: 24px;
}

.auth-subtitle {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.auth-file-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background-color: #fff;
  border: 2px solid #000;
  border-radius: 0;
  margin-bottom: 16px;
  box-shadow: 4px 4px 0 rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.auth-file-card:hover {
  box-shadow: 6px 6px 0 rgba(0, 0, 0, 0.15);
  transform: translate(-2px, -2px);
}

.auth-file-info {
  display: flex;
  align-items: center;
  gap: 12px;
  font-weight: 500;
}

.auth-file-actions {
  display: flex;
  gap: 12px;
}

.no-file {
  color: #909399;
  font-style: italic;
}

.artist-name {
  display: flex;
  flex-direction: column;
}

.artist-realname {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.pdf-preview-container {
  height: 70vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pdf-preview-iframe {
  width: 100%;
  height: 100%;
  border: 2px solid #000;
  box-shadow: 4px 4px 0 rgba(0, 0, 0, 0.1);
}

.preview-error,
.preview-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 0;
  gap: 16px;
  font-weight: 500;
}

/* 马丁风格表格 */
:deep(.el-table) {
  border: 2px solid #000 !important;
  border-radius: 0 !important;
  box-shadow: 4px 4px 0 rgba(0, 0, 0, 0.1) !important;
  transition: all 0.3s ease !important;
}

:deep(.el-table:hover) {
  box-shadow: 6px 6px 0 rgba(0, 0, 0, 0.15) !important;
}

:deep(.el-table__header) {
  background-color: #f9f9f9 !important;
}

:deep(.el-table__header th) {
  background-color: #f9f9f9 !important;
  border-bottom: 2px solid #000 !important;
  color: #000 !important;
  font-weight: 600 !important;
  padding: 12px 0 !important;
  font-size: 14px !important;
  text-transform: uppercase !important;
  letter-spacing: 0.5px !important;
}

:deep(.el-table__row td) {
  padding: 16px 0 !important;
  border-bottom: 1px solid #ddd !important;
}

:deep(.el-table__row:last-child td) {
  border-bottom: none !important;
}

/* 马丁风格按钮 */
:deep(.el-button) {
  border: 2px solid #000 !important;
  border-radius: 0 !important;
  font-weight: 600 !important;
  text-transform: uppercase !important;
  letter-spacing: 0.5px !important;
  padding: 8px 16px !important;
  height: auto !important;
  line-height: 1.5 !important;
  box-shadow: 3px 3px 0 rgba(0, 0, 0, 0.1) !important;
  transition: all 0.3s ease !important;
}

:deep(.el-button:hover) {
  box-shadow: 4px 4px 0 rgba(0, 0, 0, 0.2) !important;
  transform: translate(-1px, -1px) !important;
}

:deep(.el-button--primary) {
  background-color: #000 !important;
  color: #fff !important;
}

:deep(.el-button--danger) {
  background-color: #fff !important;
  color: #f56c6c !important;
  border-color: #f56c6c !important;
}

:deep(.el-button--danger:hover) {
  background-color: #f56c6c !important;
  color: #fff !important;
}

/* 马丁风格视图切换选项卡 */
.view-tabs {
  margin-bottom: 24px;
}

:deep(.view-tabs .el-tabs__header) {
  margin-bottom: 20px;
  border-bottom: 2px solid #000;
}

:deep(.view-tabs .el-tabs__nav-wrap::after) {
  display: none;
}

:deep(.view-tabs .el-tabs__item) {
  font-size: 16px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 0 24px;
  height: 48px;
  line-height: 48px;
  border: 2px solid #000;
  border-bottom: none;
  background-color: #f9f9f9;
  margin-right: 8px;
  transition: all 0.3s ease;
}

:deep(.view-tabs .el-tabs__item:hover) {
  color: #000;
}

:deep(.view-tabs .el-tabs__item.is-active) {
  color: #000;
  background-color: #fff;
  border-bottom: 2px solid #fff;
  margin-bottom: -2px;
}

:deep(.view-tabs .el-tabs__active-bar) {
  display: none;
}

:deep(.el-dialog) {
  border: 2px solid #000;
  border-radius: 0;
  box-shadow: 8px 8px 0 rgba(0, 0, 0, 0.1);
  padding: 0;
  overflow: visible;
}

:deep(.el-dialog__header) {
  border-bottom: 2px solid #000;
  padding: 16px 20px;
  margin: 0;
  background-color: #f9f9f9;
}

:deep(.el-dialog__title) {
  font-weight: 700;
  font-size: 18px;
  letter-spacing: -0.3px;
}

:deep(.el-dialog__body) {
  padding: 20px;
}

:deep(.el-dialog__footer) {
  border-top: 2px solid #f0f0f0;
  padding: 16px 20px;
}

:deep(.el-upload) {
  width: auto !important;
}
</style> 