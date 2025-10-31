<!--
 * 个人中心页面组件
 * 
 * 该组件提供用户个人信息查看和编辑功能，支持与Acmetone主系统的用户数据同步。
 * 设计风格与主页保持一致。
 * 
 * @module views/auth/ProfilePage
 * @requires vue
 * @requires element-plus
 * @requires @/stores/user
 -->
<template>
  <div class="profile-container">
    <div class="profile-header">
      <h1 class="profile-title">个人中心</h1>
      <p class="profile-subtitle">管理您的个人信息和设置</p>
    </div>

    <div class="profile-content">
      <el-row :gutter="20">
        <!-- 左侧用户信息 -->
        <el-col :xs="24" :sm="8">
          <el-card class="profile-card">
            <div class="avatar-container">
              <el-avatar
                :size="100"
                :src="userStore.user?.avatar || defaultAvatar"
                @error="handleAvatarError"
              />
              <div class="avatar-upload">
                <el-upload
                  class="avatar-uploader"
                  action="#"
                  :auto-upload="false"
                  :show-file-list="false"
                  :on-change="handleAvatarChange"
                >
                  <el-button size="small" type="primary">更换头像</el-button>
                </el-upload>
              </div>
            </div>

            <div class="user-info">
              <h3 class="username">{{ userStore.user?.username }}</h3>
              <p class="email">{{ userStore.user?.email }}</p>
              <p class="join-date">
                注册时间：{{ formatDate(userStore.user?.createdAt) }}
              </p>
            </div>

            <div class="sync-info">
              <el-alert
                title="用户数据同步"
                type="info"
                description="您的个人信息会自动与Acmetone主系统同步"
                :closable="false"
                show-icon
              />
            </div>
          </el-card>
        </el-col>

        <!-- 右侧编辑表单 -->
        <el-col :xs="24" :sm="16">
          <el-card class="profile-card">
            <template #header>
              <div class="card-header">
                <span>个人资料</span>
              </div>
            </template>

            <el-form
              ref="profileFormRef"
              :model="profileForm"
              label-position="top"
              :disabled="!isEditing"
            >
              <el-form-item label="个人简介">
                <el-input
                  v-model="profileForm.bio"
                  type="textarea"
                  :rows="4"
                  placeholder="介绍一下自己吧..."
                />
              </el-form-item>

              <el-form-item v-if="!isEditing">
                <el-button type="primary" @click="startEditing">
                  编辑资料
                </el-button>
              </el-form-item>

              <el-form-item v-else>
                <el-button type="primary" @click="saveProfile" :loading="userStore.loading">
                  保存
                </el-button>
                <el-button @click="cancelEditing">取消</el-button>
              </el-form-item>
            </el-form>
          </el-card>

          <!-- 活动记录 -->
          <el-card class="profile-card activity-card">
            <template #header>
              <div class="card-header">
                <span>最近活动</span>
              </div>
            </template>

            <div class="empty-activity" v-if="!hasActivity">
              <el-empty description="暂无活动记录" />
            </div>
            <div v-else>
              <!-- 这里可以展示用户的活动记录，如发布的话题、回复等 -->
              <p>这里将展示您的活动记录，如发布的话题、回复等</p>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 个人中心页面组件
 * 
 * @component
 */
import { ref, reactive, onMounted, computed } from 'vue';
import { ElMessage } from 'element-plus';
import { useUserStore } from '@/stores/user';

// 默认头像
const defaultAvatar = '/images/default-avatar.png';

// 用户状态
const userStore = useUserStore();

// 表单引用
const profileFormRef = ref(null);

// 编辑状态
const isEditing = ref(false);

// 个人资料表单
const profileForm = reactive({
  bio: '',
});

// 是否有活动记录
const hasActivity = ref(false);

/**
 * 格式化日期
 * @param {string} dateString - 日期字符串
 * @returns {string} 格式化后的日期
 */
const formatDate = (dateString?: string) => {
  if (!dateString) return '未知';
  const date = new Date(dateString);
  return date.toLocaleDateString('zh-CN');
};

/**
 * 开始编辑
 */
const startEditing = () => {
  profileForm.bio = userStore.user?.bio || '';
  isEditing.value = true;
};

/**
 * 取消编辑
 */
const cancelEditing = () => {
  isEditing.value = false;
};

/**
 * 保存个人资料
 */
const saveProfile = async () => {
  try {
    await userStore.updateUser({
      bio: profileForm.bio,
    });
    
    isEditing.value = false;
    ElMessage.success('个人资料已更新');
  } catch (error) {
    console.error('更新个人资料失败:', error);
  }
};

/**
 * 处理头像上传
 * @param {Object} file - 上传的文件
 */
const handleAvatarChange = async (file: any) => {
  try {
    await userStore.updateAvatar(file.raw);
    ElMessage.success('头像已更新');
  } catch (error) {
    console.error('更新头像失败:', error);
  }
};

/**
 * 处理头像加载错误
 */
const handleAvatarError = () => {
  ElMessage.warning('头像加载失败，使用默认头像');
};

/**
 * 组件挂载时获取用户信息
 */
onMounted(async () => {
  if (!userStore.user) {
    try {
      await userStore.fetchCurrentUser();
    } catch (error) {
      console.error('获取用户信息失败:', error);
    }
  }
});
</script>

<style scoped>
.profile-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.profile-header {
  margin-bottom: 30px;
  text-align: center;
}

.profile-title {
  font-size: 28px;
  font-weight: 600;
  color: #303133;
  margin: 0;
}

.profile-subtitle {
  font-size: 16px;
  color: #909399;
  margin: 10px 0 0;
}

.profile-content {
  margin-top: 20px;
}

.profile-card {
  margin-bottom: 20px;
}

.avatar-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 20px;
}

.avatar-upload {
  margin-top: 10px;
}

.user-info {
  text-align: center;
  margin-bottom: 20px;
}

.username {
  font-size: 20px;
  font-weight: 600;
  margin: 10px 0 5px;
  color: #303133;
}

.email {
  font-size: 14px;
  color: #606266;
  margin: 0 0 5px;
}

.join-date {
  font-size: 12px;
  color: #909399;
  margin: 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sync-info {
  margin-top: 20px;
}

.activity-card {
  margin-top: 20px;
}

.empty-activity {
  padding: 20px 0;
}

@media (max-width: 768px) {
  .profile-container {
    padding: 10px;
  }
  
  .profile-title {
    font-size: 24px;
  }
  
  .profile-subtitle {
    font-size: 14px;
  }
}
</style> 