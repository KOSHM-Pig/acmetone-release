<template>
  <div class="user-center-container">
    <div class="page-header">
      <h1 class="page-title">个人中心</h1>
      <p class="subtitle">管理您的账户信息、认证状态和个人设置</p>
        </div>

    <div class="user-center-content">
      <!-- User Info Section -->
      <div class="form-section">
        <div class="section-grid">
          <div class="section-header">
            <h3 class="section-title">账户信息</h3>
            <div class="header-actions">
              <button v-if="!isEditing" @click="startEditing" class="garrix-btn">编辑信息</button>
            </div>
          </div>

          <div class="section-body">
            <div class="avatar-info-grid">
              <div class="avatar-uploader-container">
                <el-avatar :size="120" :src="avatarUrl" shape="square" icon="User" />
                <div v-if="isEditing" class="avatar-actions">
                  <el-upload
                    :http-request="uploadAvatar"
                    :show-file-list="false"
                    :before-upload="beforeAvatarUpload"
                    :disabled="uploading"
                  >
                    <button class="garrix-btn" :loading="uploading">{{ uploading ? '上传中...' : '更换头像' }}</button>
                  </el-upload>
                </div>
                 <div v-if="uploadProgress > 0 && uploadProgress < 100" class="upload-progress">
                    <el-progress :percentage="uploadProgress" :stroke-width="5" color="#000" />
                  </div>
              </div>

              <div class="user-details">
                <el-form v-if="isEditing" :model="userForm" ref="userFormRef" label-position="top">
                  <el-form-item label="昵称">
                    <el-input v-model="userForm.nickname" placeholder="输入您的昵称" class="garrix-input"></el-input>
                  </el-form-item>
                  <el-form-item label="简介">
                    <el-input v-model="userForm.bio" type="textarea" :rows="4" placeholder="一句话介绍自己" class="garrix-textarea"></el-input>
                  </el-form-item>
                  <div class="form-actions">
                    <button @click="saveUserInfo" :loading="saving" class="garrix-btn">
                      {{ saving ? '保存中...' : '保存更改' }}
                    </button>
                    <button @click="cancelEditing" class="garrix-btn-secondary">取消</button>
                  </div>
                </el-form>

                <div v-else class="info-display">
                  <div class="info-grid">
                    <div class="info-item">
                      <span class="label">用户名</span>
                      <span class="value">{{ userStore.user?.username }}</span>
                    </div>
                    <div class="info-item">
                      <span class="label">昵称</span>
                      <span class="value">{{ userStore.user?.nickname || '未设置' }}</span>
            </div>
            <div class="info-item">
                      <span class="label">邮箱</span>
                      <div class="value-with-status">
                        <span class="value">{{ userStore.user?.email }}</span>
                        <span v-if="userStore.user?.isEmailVerified" class="status-tag verified">已验证</span>
                        <span v-else class="status-tag unverified">未验证</span>
                      </div>
            </div>
            <div class="info-item">
                      <span class="label">角色</span>
                      <span class="value">{{ userStore.isAdmin ? '管理员' : '普通用户' }}</span>
                    </div>
                  </div>
                  <div class="info-item-bio">
                    <span class="label">简介</span>
                    <p class="value bio">{{ userStore.user?.bio || '未设置' }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Verification Section -->
      <div class="form-section">
        <div class="section-grid">
          <div class="section-header">
            <h3 class="section-title">实名认证</h3>
          </div>
          <div class="section-body">
            <div v-if="loading" class="loading-placeholder">
              <p>加载认证信息中...</p>
          </div>
          <div v-else>
              <div v-if="verification" :class="['verification-status-card', verification.status]">
                <div class="status-icon">
                  <el-icon v-if="verification.status === 'approved'"><Check /></el-icon>
                  <el-icon v-if="verification.status === 'pending'"><Timer /></el-icon>
                  <el-icon v-if="verification.status === 'rejected'"><Close /></el-icon>
                </div>
                <div class="status-content">
                  <h4 class="status-title">{{ getStatusTitle(verification.status) }}</h4>
                  <p class="status-description">{{ getStatusDescription(verification) }}</p>
                </div>
                <div class="status-actions">
                  <button
                  v-if="verification.status === 'rejected'"
                    class="garrix-btn"
                  @click="goToVerification"
                >
                    重新提交
                  </button>
                </div>
              </div>
              <div v-else class="empty-state">
                <h4>您尚未提交实名认证</h4>
                <p>认证通过后才能发行音乐作品</p>
                <button class="garrix-btn" @click="goToVerification">立即认证</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Quick Actions Section -->
      <div class="form-section">
        <div class="section-grid">
          <div class="section-header">
            <h3 class="section-title">快捷操作</h3>
          </div>
          <div class="section-body">
            <div class="action-buttons">
              <button class="garrix-btn-secondary" @click="$router.push('/albums')">我的专辑</button>
              <button class="garrix-btn" @click="$router.push('/albums/new')">创建新专辑</button>
              <button class="garrix-btn-secondary" @click="$router.push('/artist-wiki')">艺人百科</button>
            </div>
          </div>
        </div>
      </div>
          </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '../stores/user';
import { useUserVerificationStore } from '../stores/userVerification';
import { ElMessage, ElMessageBox } from 'element-plus';
import { API_BASE_URL, STATIC_BASE_URL } from '../config';
import axios from 'axios';
import imageCompression from 'browser-image-compression';
import { Check, Timer, Close, User } from '@element-plus/icons-vue';

const router = useRouter();
const userStore = useUserStore();
const userVerificationStore = useUserVerificationStore();

const verification = ref(null);
const loading = ref(true);
const isEditing = ref(false);
const saving = ref(false);
const uploading = ref(false);
const uploadProgress = ref(0);
const apiBaseUrl = API_BASE_URL;

// 用户表单数据
const userForm = ref({
  username: '',
  email: '',
  nickname: '',
  bio: ''
});

// 用户头像URL
const avatarUrl = computed(() => {
  try {
    if (!userStore.user || !userStore.user.avatar) {
      return '';
    }
    
    console.log('原始头像URL:', userStore.user.avatar);
    
    // 添加时间戳确保每次都获取最新头像
    const timestamp = new Date().getTime();
    let url = userStore.user.avatar;
    
    // 确保URL以/开头
    if (!url.startsWith('/') && !url.startsWith('http')) {
      url = '/' + url;
      console.log('添加前导斜杠后的URL:', url);
    }
    
    // 如果是相对URL，添加STATIC_BASE_URL
    if (url.startsWith('/uploads')) {
      url = `${STATIC_BASE_URL}${url}`;
      console.log('添加静态资源基础URL后的路径:', url);
    }
    
    // 添加时间戳参数
    const finalUrl = url.includes('?') ? `${url}&t=${timestamp}` : `${url}?t=${timestamp}`;
    console.log('最终头像URL:', finalUrl);
    return finalUrl;
  } catch (error) {
    console.error('计算头像URL时出错:', error);
    return '';
  }
});

// 获取认证状态文本
const getStatusTitle = (status) => {
  switch (status) {
    case 'pending': return '认证审核中';
    case 'approved': return '认证已通过';
    case 'rejected': return '认证被拒绝';
    default: return '未认证';
  }
};

// 获取认证状态类型（用于自定义卡片样式）
const getStatusType = (status) => {
  switch (status) {
    case 'pending': return 'warning';
    case 'approved': return 'success';
    case 'rejected': return 'error';
    default: return 'info';
  }
};

// 获取认证状态描述
const getStatusDescription = (verification) => {
  switch (verification.status) {
    case 'pending':
      return '您的实名认证申请正在审核中，请耐心等待。';
    case 'approved':
      return '您的实名认证已通过审核，可以正常发行音乐作品。';
    case 'rejected':
      return `您的实名认证申请被拒绝。原因：${verification.comment || '未提供拒绝理由'}。`;
    default:
      return '请提交实名认证信息。';
  }
};

// 跳转到实名认证页面
const goToVerification = () => {
  router.push('/user-verification');
};

// 获取用户实名认证状态
const fetchVerificationStatus = async () => {
  try {
    loading.value = true;
    const result = await userVerificationStore.getVerificationStatus();
    verification.value = result.verification;
  } catch (error) {
    if (error.response?.status !== 404) {
      // ElMessage.error(error.toString());
    }
    verification.value = null;
  } finally {
    loading.value = false;
  }
};

// 开始编辑用户信息
const startEditing = () => {
  userForm.value = {
    username: userStore.user?.username || '',
    email: userStore.user?.email || '',
    nickname: userStore.user?.nickname || '',
    bio: userStore.user?.bio || ''
  };
  isEditing.value = true;
};

// 取消编辑
const cancelEditing = () => {
  isEditing.value = false;
};

// 保存用户信息
const saveUserInfo = async () => {
  try {
    saving.value = true;
    await userStore.updateUserInfo({
      nickname: userForm.value.nickname,
      bio: userForm.value.bio
    });
    isEditing.value = false;
    ElMessage.success('个人信息更新成功');
  } catch (error) {
    ElMessage.error('更新失败: ' + (error.message || '未知错误'));
  } finally {
    saving.value = false;
  }
};

// 头像上传前的验证
const beforeAvatarUpload = (file) => {
  const isImage = file.type.startsWith('image/');
  
  if (!isImage) {
    ElMessage.error('头像必须是图片格式!');
    return false;
  }
  return true;
};

// 压缩图片
const compressImage = async (file) => {
  try {
    // 无论文件大小如何，都进行压缩以确保小于300KB
    const maxSizeKB = 300; // 300KB
    const maxSizeBytes = maxSizeKB * 1024;
    
    console.log('原始图片大小:', (file.size / 1024).toFixed(2) + 'KB');
    
    // 如果图片已经小于300KB，仍然进行轻度压缩以确保格式一致性
    const options = {
      maxSizeMB: maxSizeBytes / (1024 * 1024), // 转换为MB
      maxWidthOrHeight: 800, // 限制最大宽高
      useWebWorker: true,
      fileType: file.type
    };
    
    const compressedFile = await imageCompression(file, options);
    console.log('压缩后图片大小:', (compressedFile.size / 1024).toFixed(2) + 'KB');
    
    // 如果压缩后仍然超过300KB，进行更强的压缩
    if (compressedFile.size > maxSizeBytes) {
      console.log('第一次压缩后仍然超过300KB，进行二次压缩');
      const stricterOptions = {
        maxSizeMB: 0.29, // 稍微小于300KB
        maxWidthOrHeight: 600,
        useWebWorker: true,
        fileType: file.type
      };
      const recompressedFile = await imageCompression(compressedFile, stricterOptions);
      console.log('二次压缩后图片大小:', (recompressedFile.size / 1024).toFixed(2) + 'KB');
      return recompressedFile;
    }
    
    return compressedFile;
  } catch (error) {
    console.error('图片压缩失败:', error);
    ElMessage.warning('图片压缩失败，将尝试直接上传原图');
    return file;
  }
};

// 自定义头像上传方法
const uploadAvatar = async (options) => {
  try {
    uploading.value = true;
    uploadProgress.value = 0;
    ElMessage.info('正在处理图片，请稍候...');
    const processedFile = await compressImage(options.file);
    
    const base64Data = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => resolve(e.target.result);
      reader.onerror = e => reject(new Error('图片读取失败'));
      reader.readAsDataURL(processedFile);
    });
    
    const base64String = base64Data.split(',')[1];
    
    const response = await axios.post(`${API_BASE_URL}/users/me/avatar`, {
      avatar: base64String,
      filename: processedFile.name,
      contentType: processedFile.type
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      timeout: 60000,
      onUploadProgress: (progressEvent) => {
        uploadProgress.value = Math.round((progressEvent.loaded * 100) / progressEvent.total);
      }
    });
    
    if (response.data.success) {
      if (response.data.user) {
        userStore.user = { ...response.data.user, token: userStore.user.token };
      } else {
        userStore.user = { ...userStore.user, avatar: response.data.avatar };
      }
      userStore.persistUserInfo();
      ElMessage.success('头像上传成功');
      
      setTimeout(() => { uploadProgress.value = 0; }, 3000);
    } else {
      ElMessage.error('头像上传失败: ' + (response.data.message || '未知错误'));
    }
  } catch (error) {
    const errorMsg = error.response?.data?.message || error.response?.data?.detail || error.message;
    ElMessage.error(`头像上传失败: ${errorMsg}`);
  } finally {
    uploading.value = false;
  }
};

// 初始化
onMounted(async () => {
  if (userStore.isAuthenticated) {
    await fetchVerificationStatus();
  } else {
    router.push('/login');
  }
});
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap');

.user-center-container {
  max-width: 900px;
  margin: 0 auto;
  padding: 80px 20px;
  font-family: 'Montserrat', sans-serif;
  color: #000;
}

.page-header {
  padding: 40px 0;
  text-align: center;
  margin-bottom: 60px;
}

.page-title {
  margin: 0 0 10px;
  font-size: 4rem;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: -3px;
  line-height: 1;
}

.subtitle {
  margin: 0;
  color: #888;
  font-size: 1.1rem;
  font-weight: 400;
}

.user-center-content {
  display: flex;
  flex-direction: column;
  gap: 80px;
}

.section-grid {
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: 60px;
}

.section-header {
  grid-column: 1 / 2;
}

.section-title {
  font-size: 1.5rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: -1px;
  margin: 0 0 20px 0;
  line-height: 1.2;
  position: sticky;
  top: 100px;
}

.header-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.header-actions .garrix-btn,
.header-actions .garrix-btn-secondary {
  width: 100%;
}

.section-body {
  grid-column: 2 / 3;
  min-width: 0;
}

.avatar-info-grid {
  display: flex;
  gap: 40px;
}

.avatar-uploader-container {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;
  width: 120px;
}

.avatar-uploader-container :deep(.el-avatar) {
  border: 2px solid #eee;
  background: #f9f9f9;
}
.avatar-uploader-container :deep(.el-avatar .el-icon) {
    font-size: 50px;
}

.upload-progress {
  width: 100%;
}

.user-details {
  flex-grow: 1;
}

.info-display .info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 30px 40px;
  margin-bottom: 30px;
}

.info-item .label, .info-item-bio .label {
  font-weight: 700;
  text-transform: uppercase;
  font-size: 0.9rem;
  margin-bottom: 8px;
  display: block;
}

.info-item .value {
  font-size: 1rem;
  color: #555;
}
.info-item .value-with-status {
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.status-tag {
  font-weight: 600;
  font-size: 0.8rem;
  text-transform: uppercase;
  white-space: nowrap;
}
.status-tag.verified { color: #2a9d8f; }
.status-tag.unverified { color: #e76f51; }

.info-item-bio .bio {
  font-size: 1rem;
  color: #555;
  line-height: 1.6;
  margin: 0;
  white-space: pre-wrap;
}

.user-details .form-actions {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}

.verification-status-card {
  border: 2px solid #000;
  padding: 25px;
  display: flex;
  align-items: center;
  gap: 25px;
}

.verification-status-card.rejected { border-color: #e76f51; }
.verification-status-card.approved { border-color: #2a9d8f; }
.verification-status-card.pending { border-color: #f4a261; }

.status-icon { font-size: 2rem; }
.verification-status-card.rejected .status-icon { color: #e76f51; }
.verification-status-card.approved .status-icon { color: #2a9d8f; }
.verification-status-card.pending .status-icon { color: #f4a261; }

.status-content { flex-grow: 1; }
.status-title {
  margin: 0 0 5px 0;
  font-weight: 800;
  font-size: 1.2rem;
  text-transform: uppercase;
}
.status-description {
  margin: 0;
  color: #555;
  font-size: 0.9rem;
}

.status-actions { flex-shrink: 0; }

.loading-placeholder, .empty-state {
  border: 2px dashed #ccc;
  padding: 40px;
  text-align: center;
}
.loading-placeholder p {
  font-size: 1rem;
  text-transform: uppercase;
  color: #888;
}

.empty-state h4 {
  font-size: 1.2rem;
  font-weight: 700;
  text-transform: uppercase;
  margin: 0 0 10px 0;
}
.empty-state p {
  color: #888;
  margin: 0 0 20px 0;
}

.action-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

:deep(.el-form-item) {
  margin-bottom: 25px;
}

:deep(.el-form-item__label) {
  font-weight: 700;
  color: #000;
  padding-bottom: 10px !important;
  font-size: 0.9rem !important;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  line-height: 1 !important;
}

@media (max-width: 768px) {
  .section-grid {
    grid-template-columns: 1fr;
    gap: 20px;
  }
  .section-header {
    text-align: center;
  }
  .section-title {
    position: static;
  }
  .header-actions {
    flex-direction: row;
    justify-content: center;
  }
  .avatar-info-grid {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }
  .info-display .info-grid {
    grid-template-columns: 1fr;
    text-align: left;
  }
  .info-item .value-with-status {
    justify-content: flex-start;
  }
  .form-actions {
    justify-content: center;
  }
}
</style> 