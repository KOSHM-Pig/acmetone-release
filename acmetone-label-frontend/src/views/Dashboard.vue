<template>
  <div>
    <!-- 根据用户角色显示对应的仪表盘 -->
    <component
      :is="currentDashboard"
      v-if="!loading && userRole && currentDashboard"
    />

    <!-- 开发测试：角色切换面板 -->
    <div v-if="isDevelopment && !loading" class="dev-panel">
      <div class="dev-controls">
        <label>测试角色切换：</label>
        <select v-model="userRole">
          <option value="artist">艺人</option>
          <option value="owner">主理人</option>
          <option value="reviewer">审核</option>
          <option value="designer">美工</option>
          <option value="copywriter">文案</option>
        </select>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="page-container">
      <div class="loading-container">
        <div class="loading-spinner"></div>
        <p>正在加载仪表盘...</p>
      </div>
    </div>

    <!-- 错误状态 -->
    <div v-if="!loading && (!userRole || !currentDashboard)" class="page-container">
      <div class="error-container">
        <h2>无法确定用户角色</h2>
        <p>请联系管理员或重新登录</p>
        <p v-if="userRole">当前角色: {{ userRole }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { AuthService } from '../services/AuthService.js';
import LabelService from '../services/LabelService.js';
import OnboardingService from '../services/OnboardingService.js';

// 动态导入仪表盘组件
import ArtistDashboard from './dashboards/ArtistDashboard.vue';
import CopywriterDashboard from './dashboards/CopywriterDashboard.vue';
import DesignerDashboard from './dashboards/DesignerDashboard.vue';
import OwnerDashboard from './dashboards/OwnerDashboard.vue';
import ReviewerDashboard from './dashboards/ReviewerDashboard.vue';

const router = useRouter();
const selectedModule = ref('');
const loading = ref(true);
const userRole = ref('');
const userInfo = ref(null);

// 开发模式标识
const isDevelopment = ref(process.env.NODE_ENV === 'development');

// 根据用户角色返回对应的仪表盘组件
const currentDashboard = computed(() => {
  const dashboardMap = {
    'artist': ArtistDashboard,
    'owner': OwnerDashboard,
    'reviewer': ReviewerDashboard,
    'designer': DesignerDashboard,
    'copywriter': CopywriterDashboard
  };

  return dashboardMap[userRole.value] || null;
});

// 根据角色定义不同的模块选项
const getRoleModuleOptions = (role) => {
  switch (role) {
    case 'artist':
      return [
        { value: 'browse-labels', label: '浏览厂牌' },
        { value: 'submit-music', label: '投稿音乐' },
        { value: 'my-submissions', label: '我的投稿' },
        { value: 'profile', label: '个人资料' },
        { value: 'settings', label: '设置' }
      ];
    case 'owner': // 主理人
      return [
        { value: 'label-overview', label: '厂牌概览' },
        { value: 'submissions', label: '投稿管理' },
        { value: 'artists', label: '艺人管理' },
        { value: 'releases', label: '发行管理' },
        { value: 'analytics', label: '数据分析' },
        { value: 'team', label: '团队管理' },
        { value: 'settings', label: '厂牌设置' }
      ];
    case 'reviewer': // 审核
      return [
        { value: 'review-queue', label: '审核队列' },
        { value: 'reviewed-items', label: '已审核项目' },
        { value: 'review-stats', label: '审核统计' },
        { value: 'guidelines', label: '审核指南' },
        { value: 'settings', label: '设置' }
      ];
    case 'designer': // 美工
      return [
        { value: 'design-tasks', label: '设计任务' },
        { value: 'artwork-library', label: '作品库' },
        { value: 'templates', label: '模板管理' },
        { value: 'brand-assets', label: '品牌资产' },
        { value: 'settings', label: '设置' }
      ];
    case 'copywriter': // 文案
      return [
        { value: 'writing-tasks', label: '文案任务' },
        { value: 'content-library', label: '内容库' },
        { value: 'style-guide', label: '风格指南' },
        { value: 'campaigns', label: '推广活动' },
        { value: 'settings', label: '设置' }
      ];
    default:
      return [
        { value: 'settings', label: '设置' }
      ];
  }
};

// 计算当前用户的模块选项
const moduleOptions = computed(() => {
  return getRoleModuleOptions(userRole.value);
});

// 获取角色显示名称
const getRoleDisplayName = (role) => {
  const roleNames = {
    'artist': '艺人',
    'owner': '主理人',
    'reviewer': '审核',
    'designer': '美工',
    'copywriter': '文案'
  };
  return roleNames[role] || '用户';
};

// 获取角色描述
const getRoleDescription = (role) => {
  const descriptions = {
    'artist': '发现心仪的厂牌，投稿您的音乐作品，开启音乐之旅。',
    'owner': '管理您的厂牌，审核投稿，发展艺人，打造音乐品牌。',
    'reviewer': '审核投稿作品，维护厂牌质量，发现优秀音乐人才。',
    'designer': '创作视觉设计，制作专辑封面，打造厂牌视觉形象。',
    'copywriter': '撰写推广文案，策划营销活动，传播厂牌文化。'
  };
  return descriptions[role] || '欢迎使用 Acmetone LABEL 平台。';
};

/**
 * 检查用户状态
 */
const checkUserStatus = async () => {
  try {
    console.log('检查用户状态...');

    // 检查是否已登录
    if (!AuthService.isAuthenticated()) {
      console.log('用户未登录，跳转到登录页');
      router.push('/login');
      return;
    }

    // 获取向导状态
    const response = await OnboardingService.getStatus();
    console.log('用户状态响应:', response);

    if (response.success && response.data) {
      const { user } = response.data;

      // 如果向导未完成，跳转到向导页面
      if (!user.onboardingCompleted) {
        console.log('向导未完成，跳转到向导页面');
        router.push('/onboarding');
        return;
      }

      // 设置用户信息
      userInfo.value = user;

      // 确定用户角色
      if (user.userType === 'artist') {
        userRole.value = 'artist';
      } else if (user.userType === 'label') {
        // 对于厂牌用户，获取具体的角色
        try {
          const roleResponse = await LabelService.getUserLabelRole();
          if (roleResponse.success && roleResponse.data) {
            userRole.value = roleResponse.data.role; // owner, reviewer, designer, copywriter
          } else {
            // 如果获取角色失败，默认设置为主理人
            userRole.value = 'owner';
          }
        } catch (error) {
          console.error('获取用户厂牌角色失败:', error);
          // 默认设置为主理人
          userRole.value = 'owner';
        }
      }

      console.log('用户状态正常，角色:', userRole.value);
    }
  } catch (error) {
    console.error('检查用户状态失败:', error);

    // 如果是认证错误，跳转到登录页
    if (error.response?.status === 401) {
      console.log('认证失败，跳转到登录页');
      router.push('/login');
    }
  } finally {
    loading.value = false;
  }
};

const handleEnterModule = () => {
  console.log('进入模块:', selectedModule.value, '用户角色:', userRole.value);

  // 根据不同角色和模块进行路由跳转
  const moduleRoutes = {
    // 艺人模块路由
    'browse-labels': '/artist/labels',
    'submit-music': '/artist/submit',
    'my-submissions': '/artist/submissions',
    'profile': '/artist/profile',

    // 主理人模块路由
    'label-overview': '/owner/overview',
    'submissions': '/owner/submissions',
    'artists': '/owner/artists',
    'releases': '/owner/releases',
    'analytics': '/owner/analytics',
    'team': '/owner/team',

    // 审核模块路由
    'review-queue': '/reviewer/queue',
    'reviewed-items': '/reviewer/reviewed',
    'review-stats': '/reviewer/stats',
    'guidelines': '/reviewer/guidelines',

    // 美工模块路由
    'design-tasks': '/designer/tasks',
    'artwork-library': '/designer/library',
    'templates': '/designer/templates',
    'brand-assets': '/designer/assets',

    // 文案模块路由
    'writing-tasks': '/copywriter/tasks',
    'content-library': '/copywriter/library',
    'style-guide': '/copywriter/guide',
    'campaigns': '/copywriter/campaigns',

    // 通用模块路由
    'settings': '/settings'
  };

  const route = moduleRoutes[selectedModule.value];
  if (route) {
    console.log('跳转到:', route);
    // router.push(route);
    // 暂时显示提示，实际项目中取消注释上面的路由跳转
    alert(`即将跳转到: ${route}\n模块: ${selectedModule.value}\n角色: ${getRoleDisplayName(userRole.value)}`);
  } else {
    console.log('未找到对应的路由:', selectedModule.value);
  }
};

// 页面加载时检查用户状态
onMounted(() => {
  checkUserStatus();
});
</script>

<style scoped>
.page-container {
  padding: 60px 5%;
  background-color: #fff;
  color: #1a1a1a;
  min-height: 80vh;
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
}

.background-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) rotate(90deg);
  font-size: 18vw;
  font-weight: 900;
  color: rgba(0, 0, 0, 0.04);
  z-index: 1;
  pointer-events: none;
  white-space: nowrap;
}

.grid-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10%;
  align-items: center;
  position: relative;
  z-index: 2;
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
}

.left-panel {
  max-width: 450px;
}

.page-title {
  font-size: 64px;
  font-weight: 900;
  line-height: 1.1;
  margin-bottom: 24px;
}

.page-subtitle {
  font-size: 16px;
  color: #555;
  line-height: 1.6;
}

.content-form {
  max-width: 400px;
}

.form-group {
  margin-bottom: 28px;
}

.action-button {
  width: 100%;
  padding: 24px;
  font-size: 16px;
  font-weight: 700;
  margin-top: 10px;
}

/* 加载状态 */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  text-align: center;
  position: relative;
  z-index: 2;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #1a1a1a;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-container p {
  font-size: 16px;
  color: #666;
  margin: 0;
}

/* 错误状态 */
.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  text-align: center;
  position: relative;
  z-index: 2;
}

.error-container h2 {
  font-size: 24px;
  color: #e74c3c;
  margin-bottom: 16px;
}

.error-container p {
  font-size: 16px;
  color: #666;
  margin: 8px 0;
}

/* 开发面板 */
.dev-panel {
  position: fixed;
  top: 20px;
  right: 20px;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 16px;
  border-radius: 8px;
  z-index: 9999;
  font-size: 14px;
}

.dev-controls {
  display: flex;
  align-items: center;
  gap: 12px;
}

.dev-controls label {
  font-weight: 600;
}

.dev-controls select {
  padding: 8px 12px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
}

@media (max-width: 992px) {
  .grid-container {
    grid-template-columns: 1fr;
    gap: 60px;
    text-align: center;
  }

  .left-panel, .content-form {
    margin: 0 auto;
  }

  .background-text {
    font-size: 25vw;
    top: 30%;
  }

  .page-title {
    font-size: 48px;
  }

  .dev-panel {
    position: relative;
    top: auto;
    right: auto;
    margin: 20px;
  }
}
</style>
