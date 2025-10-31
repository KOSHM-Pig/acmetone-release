<!--
 * 用户信息组件
 * 
 * 该组件显示用户登录状态、头像和下拉菜单，支持登录、注册、个人中心和登出功能。
 * 
 * @module components/common/UserInfo
 * @requires vue
 * @requires vue-router
 * @requires element-plus
 * @requires @/stores/user
 -->
<template>
  <div class="user-info-container">
    <!-- 未登录状态 -->
    <template v-if="!userStore.isAuthenticated">
      <el-button
        type="primary"
        size="small"
        @click="$router.push('/login')"
      >
        登录
      </el-button>
      <el-button
        plain
        size="small"
        @click="$router.push('/register')"
      >
        注册
      </el-button>
    </template>

    <!-- 已登录状态 -->
    <el-dropdown v-else @command="handleCommand">
      <div class="user-avatar-container">
        <el-avatar
          :size="32"
          :src="userStore.user?.avatar || defaultAvatar"
        />
        <span class="username">{{ userStore.user?.username }}</span>
        <el-icon><arrow-down /></el-icon>
      </div>
      <template #dropdown>
        <el-dropdown-menu>
          <el-dropdown-item command="profile">个人中心</el-dropdown-item>
          <el-dropdown-item command="logout">退出登录</el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>
  </div>
</template>

<script setup lang="ts">
/**
 * 用户信息组件
 * 
 * @component
 */
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { ArrowDown } from '@element-plus/icons-vue';
import { useUserStore } from '@/stores/user';

// 默认头像
const defaultAvatar = '/images/default-avatar.png';

// 路由实例
const router = useRouter();

// 用户状态
const userStore = useUserStore();

/**
 * 处理下拉菜单命令
 * 
 * @param {string} command - 下拉菜单命令
 */
const handleCommand = (command: string) => {
  switch (command) {
    case 'profile':
      router.push('/profile');
      break;
    case 'logout':
      userStore.logout();
      ElMessage.success('已退出登录');
      router.push('/');
      break;
    default:
      break;
  }
};

/**
 * 组件挂载时，尝试获取当前用户信息
 * 获取信息时会检查并同步Acmetone主系统中的最新用户数据
 */
onMounted(async () => {
  if (userStore.isAuthenticated && !userStore.user) {
    try {
      await userStore.fetchCurrentUser();
    } catch (error) {
      console.error('获取用户信息失败:', error);
    }
  } else {
    // 从本地存储恢复用户信息
    userStore.initializeUser();
  }
});
</script>

<style scoped>
.user-info-container {
  display: flex;
  align-items: center;
  gap: 10px;
}

.user-avatar-container {
  display: flex;
  align-items: center;
  cursor: pointer;
  padding: 2px 8px;
  border-radius: 4px;
  transition: background-color 0.3s;
}

.user-avatar-container:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.username {
  margin: 0 5px;
  font-size: 14px;
  color: var(--acmetone-white, #ffffff);
}

/* 按钮样式与主题保持一致 */
:deep(.el-button) {
  border-radius: 20px;
  padding: 10px 20px;
  font-weight: 600;
}

:deep(.el-button--primary) {
  background-color: var(--acmetone-hover, #00c8ff);
  border-color: var(--acmetone-hover, #00c8ff);
}

:deep(.el-button--default) {
  color: var(--acmetone-white, #ffffff);
  border-color: var(--acmetone-white, #ffffff);
}

:deep(.el-dropdown-menu) {
  background-color: var(--acmetone-dark-gray, #1a1a1a);
  border: 1px solid var(--acmetone-border, #333333);
}

:deep(.el-dropdown-menu__item) {
  color: var(--acmetone-white, #ffffff);
}

:deep(.el-dropdown-menu__item:hover) {
  background-color: var(--acmetone-border, #333333);
}
</style> 