import { ref } from 'vue';
import { ElMessage } from 'element-plus';
import { STATIC_BASE_URL } from '@/config';
import axios from 'axios';
import { API_BASE_URL } from '@/config';

// 创建响应式状态
const pdfPreviewVisible = ref(false);
const pdfPreviewUrl = ref('');
const pdfLoaded = ref(false);

// 导出响应式状态以便在组件中使用
export { pdfPreviewVisible, pdfPreviewUrl, pdfLoaded };

/**
 * 创建PDF预览相关的功能函数
 * @param {Object} album - 专辑对象的响应式引用
 * @param {Ref<boolean>} submitting - 提交状态的响应式引用
 * @returns {Object} - 包含PDF预览相关函数的对象
 */
export function createPdfPreviewFunctions(album, submitting) {
  // 预览授权书
  const previewAuthorizationFile = async () => {
    if (!album.value?.authorizationFile) {
      ElMessage.warning('未上传授权书文件');
      return;
    }
    
    try {
      // 重置PDF相关状态
      pdfPreviewVisible.value = true;
      pdfPreviewUrl.value = '';
      pdfLoaded.value = false;
      
      // 构建PDF URL
      const pdfUrl = `${STATIC_BASE_URL}/${album.value.authorizationFile}`;
      
      // 设置预览URL
      pdfPreviewUrl.value = pdfUrl;
      
      // 标记为已加载
      pdfLoaded.value = true;
    } catch (error) {
      ElMessage.error('无法预览授权书，请尝试下载查看');
      pdfPreviewVisible.value = false;
    }
  };
  
  // 在新标签页中打开PDF
  const openInNewTab = () => {
    if (!pdfPreviewUrl.value) return;
    
    // 在新标签页中打开PDF
    window.open(pdfPreviewUrl.value, '_blank');
  };
  
  // 直接下载PDF
  const directDownloadPdf = () => {
    if (!pdfPreviewUrl.value) return;
    
    // 创建下载链接
    const link = document.createElement('a');
    link.href = pdfPreviewUrl.value;
    
    // 从路径中提取文件名
    const fileName = album.value?.authorizationFile?.split(/[\/\\]/).pop() || `授权书-${album.value?.title || '未命名'}.pdf`;
    
    // 设置下载文件名
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    ElMessage.success('授权书下载成功');
  };
  
  // 下载授权书
  const downloadAuthorizationFile = async () => {
    if (!album.value?.authorizationFile) {
      ElMessage.warning('未上传授权书文件');
      return;
    }
    
    try {
      submitting.value = true;
      
      // 获取token
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('未登录');
      }
      
      // 使用API直接下载授权书
      const response = await axios.get(
        `${API_BASE_URL}/albums/${album.value.id}/authorization`,
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
      const fileName = album.value.authorizationFile.split(/[\/\\]/).pop() || `授权书-${album.value.title}.pdf`;
      
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
    } finally {
      submitting.value = false;
    }
  };

  // 处理iframe加载事件
  const handleIframeLoad = () => {
    pdfLoaded.value = true;
  };

  // 处理iframe错误事件
  const handleIframeError = () => {
    ElMessage.error('PDF加载失败，请尝试下载查看');
    pdfLoaded.value = false;
  };
  
  return {
    previewAuthorizationFile,
    openInNewTab,
    directDownloadPdf,
    downloadAuthorizationFile,
    handleIframeLoad,
    handleIframeError
  };
} 