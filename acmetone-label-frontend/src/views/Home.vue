<template>
  <!-- 主页Header -->
  <MainHeader />

  <!-- 轮播Banner -->
  <BannerSlider />

  <!-- 热门厂牌推荐 -->
  <HotLabels />

</template>

<script setup>
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import MainHeader from '../components/MainHeader.vue';
import BannerSlider from '../components/BannerSlider.vue';
import HotLabels from '../components/HotLabels.vue';
import AcmetoneBtn from '../components/acmetone/AcmetoneBtn.vue';
import AcmetoneSelect from '../components/acmetone/AcmetoneSelect.vue';
import { AuthService } from '../services/AuthService.js';
import OnboardingService from '../services/OnboardingService.js';

const router = useRouter();
const selectedModule = ref('');
const loading = ref(true);

const moduleOptions = [
  { value: 'artist', label: '艺人管理' },
  { value: 'album', label: '专辑管理' },
  { value: 'release', label: '发行管理' },
  { value: 'analytics', label: '数据分析' }
];

/**
 * 检查向导状态（仅对已登录用户）
 */
const checkOnboardingStatus = async () => {
  try {
    console.log('检查向导状态...');

    // 如果用户未登录，直接返回，不进行跳转
    if (!AuthService.isAuthenticated()) {
      console.log('用户未登录，显示公开主页内容');
      loading.value = false;
      return;
    }

    // 获取向导状态
    const response = await OnboardingService.getStatus();
    console.log('向导状态响应:', response);

    if (response.success && response.data) {
      const { user } = response.data;

      // 如果向导未完成，跳转到向导页面
      if (!user.onboardingCompleted) {
        console.log('向导未完成，跳转到向导页面');
        router.push('/onboarding');
        return;
      }

      console.log('向导已完成，用户可以使用主页面');
    }
  } catch (error) {
    console.error('检查向导状态失败:', error);

    // 如果是认证错误，清除无效token但不跳转
    if (error.response?.status === 401) {
      console.log('认证失败，清除无效token');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  } finally {
    loading.value = false;
  }
};

const handleEnterModule = () => {
  console.log('进入模块:', selectedModule.value);
  // 这里可以添加路由跳转逻辑
};

// 页面加载时检查向导状态
onMounted(() => {
  checkOnboardingStatus();
});
</script>

<style scoped>
.page-container {
  padding: 150px 5% 60px; /* 顶部留出Header空间 */
  background-color: #fff;
  color: #1a1a1a;
  min-height: 100vh;
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
}
</style>
