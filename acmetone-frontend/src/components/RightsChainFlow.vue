<template>
  <div class="rights-chain-flow-container">
    <div v-if="loading" class="loading-state">
      <el-icon class="is-loading"><Loading /></el-icon>
      <span>加载权利链条数据中...</span>
    </div>
    
    <div v-else-if="error" class="error-state">
      <el-icon><CircleClose /></el-icon>
      <span>{{ error }}</span>
      <el-button type="primary" size="small" @click="fetchRightsChain">重试</el-button>
    </div>
    
    <div v-else class="flow-wrapper">
      <!-- 授权状态悬浮窗 -->
      <div class="auth-stats-floating">
        <div class="stats-card">
          <div class="stats-header">授权文件统计</div>
          <div class="stats-content">
            <div class="stats-item">
              <el-icon class="success-icon"><CircleCheck /></el-icon>
              <span>已上传: {{ authStats.uploaded }}</span>
            </div>
            <div class="stats-item">
              <el-icon class="warning-icon"><Warning /></el-icon>
              <span>未上传: {{ authStats.missing }}</span>
            </div>
          </div>
          <div class="stats-footer">
            <el-progress 
              :percentage="authStats.total > 0 ? Math.round((authStats.uploaded / authStats.total) * 100) : 0" 
              :stroke-width="8"
              :format="format"
              status="success"
            ></el-progress>
          </div>
        </div>
      </div>

      <VueFlow v-if="initialized" :nodes="nodes" :edges="edges" :default-zoom="1" :min-zoom="0.2" :max-zoom="4" class="rights-chain-flow">
        <template #node-album="nodeProps">
          <div class="node album-node">
            <div class="node-header">
              <el-icon><Picture /></el-icon>
              <span>专辑</span>
            </div>
            <div class="node-content">
              <div class="node-title">{{ nodeProps.data.label }}</div>
              <div v-if="nodeProps.data.authorizationFile" class="node-auth">
                <button class="view-auth-btn" @click="previewFile(nodeProps.data.authorizationFile)">
                  <el-icon><Document /></el-icon>
                  <span>查看授权文件</span>
                </button>
              </div>
              <div v-else class="node-auth no-auth">
                <el-upload
                  v-if="canEdit"
                  class="upload-btn"
                  action="#"
                  :auto-upload="false"
                  :show-file-list="false"
                  :on-change="(file) => handleAlbumAuthFileChange(nodeProps.data.id, file)"
                  accept=".pdf"
                >
                  <button class="upload-auth-btn">
                    <el-icon><Upload /></el-icon>
                    <span>上传授权文件</span>
                  </button>
                </el-upload>
                <template v-else>
                  <el-icon><CircleClose /></el-icon>
                  <span>未上传授权文件</span>
                </template>
              </div>
            </div>
          </div>
        </template>
        
        <template #node-song="nodeProps">
          <div class="node song-node">
            <div class="node-header">
              <el-icon><Headset /></el-icon>
              <span>歌曲</span>
            </div>
            <div class="node-content">
              <div class="node-title">{{ nodeProps.data.label }}</div>
              <div class="node-stats">
                <div class="artists-auth-progress">
                  <span class="stats-label">歌手授权：</span>
                  <el-progress 
                    :percentage="nodeProps.data.authProgress" 
                    :stroke-width="6"
                    :format="formatArtistProgress"
                    :status="nodeProps.data.authProgress === 100 ? 'success' : 'warning'"
                  />
                </div>
                <div class="artists-auth-text">
                  <span>{{ nodeProps.data.authorizedArtists }}/{{ nodeProps.data.totalArtists }} 歌手已授权</span>
                </div>
              </div>
            </div>
          </div>
        </template>
        
        <template #node-artist="nodeProps">
          <div class="node artist-node">
            <div class="node-header">
              <el-icon><User /></el-icon>
              <span>歌手</span>
            </div>
            <div class="node-content">
              <div class="node-title">{{ nodeProps.data.label }}</div>
              <div v-if="nodeProps.data.realName" class="node-subtitle">{{ nodeProps.data.realName }}</div>
              <div v-if="nodeProps.data.authorizationFile" class="node-auth">
                <el-icon><Document /></el-icon>
                <el-button type="text" @click="previewFile(nodeProps.data.authorizationFile)">
                  查看授权文件
                </el-button>
              </div>
              <div v-else class="node-auth no-auth">
                <el-upload
                  v-if="canEdit"
                  class="upload-btn"
                  action="#"
                  :auto-upload="false"
                  :show-file-list="false"
                  :on-change="(file) => handleArtistAuthFileChange(nodeProps.data.songId, nodeProps.data.artistId, file)"
                  accept=".pdf"
                >
                  <el-button type="danger" size="small" plain>
                    上传授权文件
                  </el-button>
                </el-upload>
                <template v-else>
                  <el-icon><CircleClose /></el-icon>
                  <span>未上传授权文件</span>
                </template>
              </div>
            </div>
          </div>
        </template>
        
        <Background pattern-color="#aaa" gap="8" />
        <MiniMap />
        <Controls />
      </VueFlow>
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
import { ref, onMounted, computed, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Document, CircleClose, Loading, Picture, Headset, User, CircleCheck, Warning } from '@element-plus/icons-vue';
import rightsChainService from '@/services/rightsChainService';
import axios from 'axios'; // 导入axios
import { API_BASE_URL } from '@/config'; // 导入API基础URL

// Vue Flow
import { VueFlow } from '@vue-flow/core';
import { Background } from '@vue-flow/background';
import { MiniMap } from '@vue-flow/minimap';
import { Controls } from '@vue-flow/controls';

// 导入样式
import '@vue-flow/core/dist/style.css';
import '@vue-flow/core/dist/theme-default.css';
import '@vue-flow/minimap/dist/style.css';
import '@vue-flow/controls/dist/style.css';
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
const nodes = ref([]);
const edges = ref([]);
const initialized = ref(false);
const previewDialogVisible = ref(false);
const previewUrl = ref('');
const previewLoaded = ref(false);
const previewError = ref(null);

// 授权文件统计
const authStats = computed(() => {
  let uploaded = 0;
  let missing = 0;
  let total = 0;
  
  if (rightsChain.value) {
    // 专辑授权
    total++;
    if (rightsChain.value.album?.authorizationFile) {
      uploaded++;
    } else {
      missing++;
    }
    
    // 歌手授权
    if (rightsChain.value.songs && Array.isArray(rightsChain.value.songs)) {
      rightsChain.value.songs.forEach(song => {
        if (song.artists && Array.isArray(song.artists)) {
          song.artists.forEach(artist => {
            total++;
            if (artist.authorization?.authorizationFile) {
              uploaded++;
            } else {
              missing++;
            }
          });
        }
      });
    }
  }
  
  return { uploaded, missing, total };
});

// 格式化进度条
const format = (percentage) => {
  return `${percentage}%`;
};

// 获取权利链条数据
const fetchRightsChain = async () => {
  loading.value = true;
  error.value = null;
  initialized.value = false;
  
  try {
    const data = await rightsChainService.getAlbumRightsChain(props.albumId);
    rightsChain.value = data;
    console.log('权利链条数据:', rightsChain.value);
    buildFlowElements();
  } catch (err) {
    console.error('获取权利链条失败:', err);
    error.value = err.message || '获取权利链条数据失败';
    ElMessage.error('获取权利链条数据失败');
  } finally {
    loading.value = false;
  }
};

// 构建流程图元素
const buildFlowElements = () => {
  if (!rightsChain.value) return;
  
  const newNodes = [];
  const newEdges = [];
  
  try {
    // 添加专辑节点
    const albumNode = {
      id: `album-${rightsChain.value.album.id}`,
      type: 'album',
      position: { x: 250, y: 50 },
      data: { 
        id: rightsChain.value.album.id,
        label: rightsChain.value.album.title,
        authorizationFile: rightsChain.value.album.authorizationFile
      }
    };
    newNodes.push(albumNode);
    
    // 添加歌曲节点和连接
    if (rightsChain.value.songs && Array.isArray(rightsChain.value.songs)) {
      rightsChain.value.songs.forEach((song, songIndex) => {
        // 计算歌手授权统计
        let authorizedArtists = 0;
        const totalArtists = song.artists ? song.artists.length : 0;
        
        if (song.artists && Array.isArray(song.artists)) {
          // 统计已授权歌手数量
          authorizedArtists = song.artists.filter(artist => artist.authorization?.authorizationFile).length;
        }
        
        // 计算授权百分比
        const authProgress = totalArtists > 0 ? Math.round((authorizedArtists / totalArtists) * 100) : 0;
        
        const songNode = {
          id: `song-${song.id}`,
          type: 'song',
          position: { x: songIndex * 300, y: 200 },
          data: { 
            id: song.id,
            label: song.title,
            totalArtists,
            authorizedArtists,
            authProgress
          }
        };
        newNodes.push(songNode);
        
        // 专辑到歌曲的连接
        newEdges.push({
          id: `edge-album-${rightsChain.value.album.id}-song-${song.id}`,
          source: `album-${rightsChain.value.album.id}`,
          target: `song-${song.id}`,
          animated: false,
          label: '包含'
        });
        
        // 添加歌手节点和连接
        if (song.artists && Array.isArray(song.artists)) {
          song.artists.forEach((artist, artistIndex) => {
            const offsetX = (artistIndex - (song.artists.length - 1) / 2) * 180;
            const artistNode = {
              id: `artist-${artist.id}-song-${song.id}`,
              type: 'artist',
              position: { x: songIndex * 300 + offsetX, y: 350 },
              data: { 
                artistId: artist.id,
                songId: song.id,
                label: artist.name,
                realName: artist.realName,
                authorizationFile: artist.authorization?.authorizationFile
              }
            };
            newNodes.push(artistNode);
            
            // 歌曲到歌手的连接
            newEdges.push({
              id: `edge-song-${song.id}-artist-${artist.id}`,
              source: `song-${song.id}`,
              target: `artist-${artist.id}-song-${song.id}`,
              animated: false,
              label: '演唱'
            });
          });
        }
      });
    }
    
    // 更新节点和边
    nodes.value = newNodes;
    edges.value = newEdges;
    initialized.value = true;
  } catch (err) {
    console.error('构建流程图元素失败:', err);
    error.value = '构建流程图失败';
  }
};

// 处理专辑授权文件上传
const handleAlbumAuthFileChange = async (albumId, file) => {
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
      `${API_BASE_URL}/rights-chain/albums/${albumId}/authorization-file`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }
    );
    
    ElMessage.success('专辑授权文件上传成功');
    await fetchRightsChain();
  } catch (err) {
    console.error('上传专辑授权文件失败:', err);
    ElMessage.error(err.message || '上传专辑授权文件失败');
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
        // 使用完整的https://www.acmetone.com格式
        const baseUrl = STATIC_BASE_URL ;
        
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

// 格式化歌手授权进度
const formatArtistProgress = (percentage) => {
  return `${percentage}%`;
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
.rights-chain-flow-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
}

.loading-state,
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 0;
  gap: 12px;
}

.flow-wrapper {
  width: 100%;
  height: 600px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  position: relative;
}

.rights-chain-flow {
  width: 100%;
  height: 100%;
}

.node {
  padding: 10px;
  border-radius: 5px;
  width: 180px;
  font-size: 12px;
  color: #333;
  text-align: center;
  border-width: 1px;
  border-style: solid;
}

.album-node {
  background-color: #ecf5ff;
  border-color: #409eff;
}

.song-node {
  background-color: #f0f9eb;
  border-color: #67c23a;
}

.artist-node {
  background-color: #f4f4f5;
  border-color: #909399;
}

.node-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  margin-bottom: 8px;
  font-weight: bold;
}

.node-content {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.node-title {
  font-weight: bold;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 5px;
}

.node-subtitle {
  font-size: 11px;
  color: #909399;
}

.node-auth {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  font-size: 11px;
}

.node-stats {
  padding: 5px;
  font-size: 11px;
}

.artists-auth-progress {
  margin-bottom: 5px;
}

.artists-auth-text {
  font-size: 10px;
  color: #606266;
}

.stats-label {
  display: block;
  margin-bottom: 2px;
  font-weight: bold;
}

.no-auth {
  color: #f56c6c;
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
  border: none;
}

.preview-error,
.preview-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 0;
  gap: 12px;
}

.upload-btn {
  display: inline-block;
}

/* 授权状态悬浮窗样式 */
.auth-stats-floating {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 10;
}

.stats-card {
  background-color: #fff;
  border-radius: 4px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  padding: 12px;
  width: 200px;
}

.stats-header {
  font-weight: bold;
  font-size: 14px;
  margin-bottom: 10px;
  color: #303133;
  border-bottom: 1px solid #e4e7ed;
  padding-bottom: 8px;
}

.stats-content {
  margin-bottom: 10px;
}

.stats-item {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
  font-size: 13px;
  gap: 6px;
}

.success-icon {
  color: #67c23a;
}

.warning-icon {
  color: #e6a23c;
}

.stats-footer {
  border-top: 1px solid #e4e7ed;
  padding-top: 8px;
}
</style> 