<template>
      <!-- PDF预览对话框 -->
      <el-dialog
        :model-value="visible"
        @update:model-value="$emit('update:visible', $event)"
        title="授权书预览"
        fullscreen
        :show-close="true"
        :append-to-body="true"
        :modal="true"
        :destroy-on-close="true"
        custom-class="pdf-preview-dialog garrix-dialog"
      >
        <div class="pdf-preview-container">
          <div class="pdf-preview-toolbar">
            <button type="button" class="garrix-btn" @click="downloadAuthorizationFile">
              <el-icon><Download /></el-icon>
              <span>下载授权书</span>
            </button>
            <button type="button" class="garrix-btn secondary" @click="directDownloadPdf" v-if="pdfUrl">
              <el-icon><Download /></el-icon>
              <span>另存为</span>
            </button>
            <button type="button" class="garrix-btn secondary" @click="openInNewTab" v-if="pdfUrl">
              <el-icon><View /></el-icon>
              <span>在新标签页打开</span>
            </button>
            <button type="button" class="garrix-btn secondary" @click="closePreview">
              <el-icon><Close /></el-icon>
              <span>关闭预览</span>
            </button>
          </div>
          
          <div class="pdf-preview-content">
            <!-- 使用简单的iframe替代复杂的PDF.js渲染 -->
            <div v-if="loaded" class="pdf-viewer">
            <iframe 
                :src="pdfUrl" 
                class="pdf-preview-iframe"
                frameborder="0"
                width="100%"
                height="100%"
                @load="handleIframeLoad"
                @error="handleIframeError"
            ></iframe>
            </div>
            
            <!-- 加载状态 -->
            <div v-else class="pdf-preview-loading">
              <el-empty description="加载PDF中...">
                <template #image>
                  <el-icon class="loading-icon"><Document /></el-icon>
                </template>
              </el-empty>
            </div>
          </div>
        </div>
      </el-dialog>
</template>

<script setup>
import { ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { Download, View, Close, Document } from '@element-plus/icons-vue';
import { STATIC_BASE_URL, API_BASE_URL } from '@/config';
import axios from 'axios';

// 接收参数
const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  pdfUrl: {
    type: String,
    default: ''
  },
  album: {
    type: Object,
    default: () => ({})
  }
});

// 定义事件
const emit = defineEmits(['update:visible', 'iframe-load', 'iframe-error']);

// 状态
const loaded = ref(false);

// 监听 pdfUrl 变化，重置加载状态
watch(() => props.pdfUrl, (newUrl) => {
  if (newUrl) {
    console.log('PDF URL 已更新:', newUrl);
    loaded.value = false;
    // 添加延时，确保iframe有时间重新加载
    setTimeout(() => {
      loaded.value = true;
    }, 100);
  }
}, { immediate: true });

// 监听 visible 变化
watch(() => props.visible, (isVisible) => {
  if (isVisible && props.pdfUrl) {
    console.log('对话框已打开，PDF URL:', props.pdfUrl);
    loaded.value = true;
  }
});

// 从 pdfPreview.js 复制的函数
// 预览授权书
const previewAuthorizationFile = async () => {
  if (!props.album?.authorizationFile) {
    ElMessage.warning('未上传授权书文件');
    return;
  }
  
  try {
    // 重置PDF相关状态
    emit('update:visible', true);
    // pdfUrl 是通过 props 传入的，不需要在这里设置
    loaded.value = false;
    
    // 构建PDF URL
    const pdfUrl = `${STATIC_BASE_URL}/${props.album.authorizationFile}`;
    
    // 这里我们不直接设置 pdfUrl，而是通过事件通知父组件
    // 父组件会更新 pdfUrl 并传回来
    
    // 标记为已加载
    loaded.value = true;
  } catch (error) {
    ElMessage.error('无法预览授权书，请尝试下载查看');
    emit('update:visible', false);
  }
};

// 在新标签页中打开PDF
const openInNewTab = () => {
  if (!props.pdfUrl) return;
  
  // 在新标签页中打开PDF
  window.open(props.pdfUrl, '_blank');
};

// 直接下载PDF
const directDownloadPdf = () => {
  if (!props.pdfUrl) return;
  
  // 创建下载链接
  const link = document.createElement('a');
  link.href = props.pdfUrl;
  
  // 从路径中提取文件名
  const fileName = props.album?.authorizationFile?.split(/[\/\\]/).pop() || `授权书-${props.album?.title || '未命名'}.pdf`;
  
  // 设置下载文件名
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  ElMessage.success('授权书下载成功');
};

// 下载授权书
const downloadAuthorizationFile = async () => {
  if (!props.album?.authorizationFile) {
    ElMessage.warning('未上传授权书文件');
    return;
  }
  
  try {
    // 获取token
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('未登录');
    }
    
    // 使用API直接下载授权书
    const response = await axios.get(
      `${API_BASE_URL}/albums/${props.album.id}/authorization`,
      {
        headers: { 
          'Authorization': `Bearer ${token}`
        },
        responseType: 'blob'
      }
    );
    
    // 创建下载链接
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    // 从路径中提取文件名
    const fileName = props.album.authorizationFile.split(/[\/\\]/).pop() || `授权书-${props.album.title}.pdf`;
    
    // 设置下载文件名
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // 释放URL对象
    window.URL.revokeObjectURL(url);
    
    ElMessage.success('授权书下载成功');
  } catch (error) {
    console.error('下载授权书失败:', error);
    ElMessage.error(error.message || '下载授权书失败');
  }
};

// 处理iframe加载事件
const handleIframeLoad = (event) => {
  console.log('iframe加载完成');
  loaded.value = true;
  emit('iframe-load', event);
};

// 处理iframe错误事件
const handleIframeError = (event) => {
  console.error('iframe加载失败:', event);
  ElMessage.error('PDF加载失败，请尝试下载查看');
  loaded.value = false;
  emit('iframe-error', event);
};

// 关闭预览
const closePreview = () => {
  emit('update:visible', false);
};
</script>

<style scoped>
.pdf-preview-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

.pdf-preview-toolbar {
  display: flex;
  gap: 10px;
  padding: 10px;
  background-color: #f5f5f5;
  border-bottom: 1px solid #ddd;
  flex-shrink: 0;
}

.pdf-preview-content {
  flex: 1;
  overflow: hidden;
  position: relative;
  height: calc(100vh - 60px); /* 减去工具栏和对话框标题的高度 */
}

.pdf-viewer {
  height: 100%;
  width: 100%;
}

.pdf-preview-iframe {
  border: none;
  height: 100%;
  width: 100%;
  display: block;
}

.pdf-preview-loading {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
}

.loading-icon {
  font-size: 48px;
  animation: spin 2s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* 覆盖Element Plus对话框的默认样式 */
:deep(.el-dialog__body) {
  padding: 0;
  height: calc(100vh - 54px); /* 减去对话框标题的高度 */
  overflow: hidden;
}

:deep(.el-dialog__header) {
  padding: 15px;
  margin: 0;
}

:deep(.pdf-preview-dialog) {
  display: flex;
  flex-direction: column;
  margin: 0 !important;
  height: 100vh;
  width: 100vw;
}
</style>