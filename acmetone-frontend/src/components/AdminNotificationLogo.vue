<template>
  <div class="admin-notification-logo">
    <!-- 有审核信息时显示提示 -->
    <div v-if="hasNotifications" class="notification-mode" @click="handleClick">
      <div class="notification-content">
        <div class="notification-icon">
          <span class="notification-count">{{ totalCount }}</span>
        </div>
        <div class="notification-text">
          <div class="notification-title">待处理</div>
          <div class="notification-subtitle">{{ getNotificationText() }}</div>
        </div>
      </div>
      <div class="notification-indicator"></div>
    </div>

    <!-- 没有审核信息时显示LOGO -->
    <router-link v-else to="/" class="logo-mode">
      ACMETONE
    </router-link>
  </div>
</template>

<script>
import { useNotificationStore } from '@/stores/notification';
import { useUserStore } from '@/stores/user';
import { computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';

export default {
  name: 'AdminNotificationLogo',
  setup() {
    const router = useRouter();
    const notificationStore = useNotificationStore();
    const userStore = useUserStore();

    // 计算是否有通知
    const hasNotifications = computed(() => {
      return userStore.isAdmin && notificationStore.totalPendingCount > 0;
    });

    // 总数量
    const totalCount = computed(() => {
      return notificationStore.totalPendingCount;
    });

    // 格式化显示数量
    const formattedCount = computed(() => {
      return totalCount.value > 99 ? '99+' : totalCount.value.toString();
    });

    // 获取通知文本
    const getNotificationText = () => {
      const counts = [];

      if (notificationStore.pendingAlbums > 0) {
        counts.push(`${notificationStore.pendingAlbums}个专辑`);
      }

      if (notificationStore.pendingArtistRequests > 0) {
        counts.push(`${notificationStore.pendingArtistRequests}个歌手`);
      }

      if (notificationStore.pendingVerifications > 0) {
        counts.push(`${notificationStore.pendingVerifications}个认证`);
      }

      if (notificationStore.pendingMaterialCount > 0) {
        counts.push(`${notificationStore.pendingMaterialCount}个待递交`);
      }

      if (counts.length === 0) {
        return '暂无待处理';
      }

      if (counts.length === 1) {
        return counts[0];
      }

      if (counts.length === 2) {
        return counts.join('、');
      }

      // 超过2个类型，显示前2个 + 等
      return `${counts.slice(0, 2).join('、')}等`;
    };

    // 点击处理
    const handleClick = () => {
      // 跳转到审核工作台
      router.push('/admin/workbench');
    };

    // 定时器
    let updateTimer = null;

    // 组件挂载
    onMounted(() => {
      // 如果是管理员，立即获取通知数据
      if (userStore.isAdmin) {
        notificationStore.fetchNotifications();
        
        // 设置定时更新
        updateTimer = setInterval(() => {
          notificationStore.fetchNotifications();
        }, 60000); // 1分钟更新一次
      }
    });

    // 组件卸载
    onUnmounted(() => {
      if (updateTimer) {
        clearInterval(updateTimer);
      }
    });

    return {
      hasNotifications,
      totalCount: formattedCount,
      getNotificationText,
      handleClick
    };
  }
};
</script>

<style scoped>
.admin-notification-logo {
  display: flex;
  align-items: center;
  height: 100%;
}

/* LOGO模式 */
.logo-mode {
  font-family: 'Montserrat', sans-serif;
  font-size: 24px;
  font-weight: 800;
  color: #000000;
  text-decoration: none;
  text-transform: uppercase;
  letter-spacing: 2px;
  transition: color 0.3s ease;
}

.logo-mode:hover {
  color: #666666;
}

/* 通知模式 */
.notification-mode {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
}

.notification-mode:hover {
  background: rgba(0, 0, 0, 0.05);
}

.notification-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.notification-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: #000000;
  color: #ffffff;
  font-family: 'Montserrat', sans-serif;
  font-size: 12px;
  font-weight: 700;
  position: relative;
}

.notification-count {
  line-height: 1;
}

.notification-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.notification-title {
  font-family: 'Montserrat', sans-serif;
  font-size: 14px;
  font-weight: 700;
  color: #000000;
  text-transform: uppercase;
  letter-spacing: 1px;
  line-height: 1;
}

.notification-subtitle {
  font-size: 11px;
  color: #666666;
  font-weight: 500;
  line-height: 1;
}

.notification-indicator {
  width: 8px;
  height: 8px;
  background: #ff4444;
  border-radius: 50%;
  position: absolute;
  top: 6px;
  right: 6px;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.2);
    opacity: 0.7;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .notification-mode {
    padding: 6px 12px;
  }
  
  .notification-icon {
    width: 28px;
    height: 28px;
    font-size: 10px;
  }
  
  .notification-title {
    font-size: 12px;
  }
  
  .notification-subtitle {
    font-size: 10px;
  }
  
  .logo-mode {
    font-size: 20px;
  }
}

@media (max-width: 480px) {
  .notification-text {
    display: none;
  }
  
  .notification-content {
    gap: 0;
  }
}
</style>
