import { ref, h } from 'vue';
import { ElMessage } from 'element-plus';
import { SuccessFilled } from '@element-plus/icons-vue';
import axios from 'axios';
import { API_BASE_URL } from '@/config';

/**
 * 创建封面相关的处理函数
 * @param {Object} album - 专辑响应式对象
 * @param {Object} albumForm - 专辑表单响应式对象
 * @param {Object} submitting - 提交状态响应式对象
 * @returns {Object} - 封面处理相关函数
 */
export const createCoverFunctions = (album, albumForm, submitting) => {
 // 处理封面图片变更
 const handleCoverChange = (file) => {
    // 检查文件类型
    const isImage = file.raw.type.startsWith('image/');
    if (!isImage) {
      ElMessage.error('只能上传图片文件!');
      return false;
    }
  
    // 检查文件大小
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.raw.size > maxSize) {
      ElMessage.error('图片大小不能超过10MB!');
      return false;
    }
  
    // 上传封面图片
    uploadCoverImage(file.raw);
    return false; // 阻止自动上传
  };
  
  // 上传封面图片
  const uploadCoverImage = async (file, silent = false) => {
    if (!file) {
      ElMessage.warning('请先选择图片文件');
      return;
    }
    
    try {
      submitting.value = true;
      
      // 获取token
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('未登录');
      }
      
      // 使用FileReader将文件转换为Base64
      const fileReader = new FileReader();
      
      // 创建Promise等待文件读取完成
      const base64Data = await new Promise((resolve, reject) => {
        fileReader.onload = (e) => {
          // 获取Base64字符串，去掉前缀
          const base64 = e.target.result.split(',')[1];
          resolve(base64);
        };
        fileReader.onerror = (e) => {
          reject(new Error('文件读取失败'));
        };
        
        // 开始读取文件
        fileReader.readAsDataURL(file);
      });
      
      // 构建请求数据
      const requestData = {
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        fileData: base64Data
      };
      
      // 调用API上传封面图片
      const response = await axios.post(
        `${API_BASE_URL}/album-cover/${album.value.id}/base64`,
        requestData,
        {
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      // 更新本地专辑对象的封面图片路径
      if (response.data.coverImage) {
        album.value.coverImage = response.data.coverImage;
        
        // 同时更新coverUrl属性，确保顶部栏图片立即更新
        if (!album.value.coverUrl || album.value.coverUrl.includes(album.value.coverImage.split('/').pop())) {
          const staticBaseUrl = API_BASE_URL.replace('/api', '');
          album.value.coverUrl = `${staticBaseUrl}/${album.value.coverImage}`;
          console.log('已更新顶部栏封面URL:', album.value.coverUrl);
        }
      }
      
      // 只有在非静默模式下才显示成功消息
      if (!silent) {
        ElMessage({
          message: '封面图片更新成功',
          type: 'success',
          icon: h(SuccessFilled),
        });
      }
      
      // 触发自定义事件，通知组件封面已更新
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('album-cover-updated', { 
          detail: { 
            albumId: album.value.id,
            coverImage: album.value.coverImage,
            coverUrl: album.value.coverUrl
          } 
        }));
      }
    } catch (error) {
      console.error('上传封面图片失败:', error);
      const errorMsg = error.response?.data?.message || error.response?.data?.detail || error.message || '上传封面图片失败';
      ElMessage.error(errorMsg);
    } finally {
      submitting.value = false;
    }
  };
  
  // 处理封面文件选择
  const handleCoverFileSelected = (event) => {
    const file = event.target.files[0];
    if (file) {
      handleCoverChange({ raw: file });
    }
  };
  
  // 处理对话框中的封面图片变更
  const handleDialogCoverChange = (file) => {
    // 检查文件类型
    const isImage = file.raw.type.startsWith('image/');
    if (!isImage) {
      ElMessage.error('只能上传图片文件!');
      return false;
    }
  
    // 检查文件大小
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.raw.size > maxSize) {
      ElMessage.error('图片大小不能超过10MB!');
      return false;
    }
  
    // 创建临时URL用于预览
    albumForm.coverImageFile = file.raw;
    albumForm.coverImagePreview = URL.createObjectURL(file.raw);
    albumForm.coverImage = albumForm.coverImagePreview;
    
    return false; // 阻止自动上传
  };

  // 触发封面上传
  const triggerCoverUpload = (coverFileInput) => {
    // 首先尝试使用传入的ref
    if (coverFileInput && coverFileInput.value) {
      coverFileInput.value.click();
      return;
    }
    
    // 如果ref不可用，尝试通过ID查找元素
    const fileInputElement = document.getElementById('coverFileInput');
    if (fileInputElement) {
      fileInputElement.click();
      return;
    }
    
    // 如果还是找不到，尝试使用选择器查找
    const fileInputBySelector = document.querySelector('input[type="file"][accept*="image"]');
    if (fileInputBySelector) {
      fileInputBySelector.click();
      return;
    }
    
    console.error('找不到文件上传输入框元素@AlbumDetail.vue');
    ElMessage.error('无法打开文件选择对话框，请尝试刷新页面');
  };
  
  return {
    handleCoverChange,
    uploadCoverImage,
    handleCoverFileSelected,
    handleDialogCoverChange,
    triggerCoverUpload
  };
  };