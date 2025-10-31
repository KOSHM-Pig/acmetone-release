<template>
  <div class="onboarding-page">
    <!-- 进度条在最顶部 -->
    <div class="progress-bar-container">
      <StepIndicator
        :current-step="currentStep"
        :total-steps="totalSteps"
      />
    </div>

    <!-- 主要内容区域 -->
    <div class="onboarding-container">
      <div class="background-text">ONBOARDING</div>

      <div class="onboarding-content">
        <!-- 加载状态 -->
        <div v-if="isLoading" class="loading-container">
          <div class="loading-spinner"></div>
          <p>正在检查您的状态...</p>
        </div>

        <!-- 向导内容 -->
        <Transition v-else name="step" mode="out-in">
          <component
            :is="currentStepComponent"
            :key="`step-${currentStep}-${onboardingState.userType}`"
            :model-value="onboardingState"
            @update:model-value="handleStateUpdate"
            @next="handleNext"
            @back="handleBack"
            @complete="handleComplete"
          />
        </Transition>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import OnboardingService from '../services/OnboardingService'
import notification from '../utils/notification'

// 导入步骤组件
import ArtistNameInput from '../components/onboarding/ArtistNameInput.vue'
import JiYinJiStatus from '../components/onboarding/JiYinJiStatus.vue'
import LabelInfoInput from '../components/onboarding/LabelInfoInput.vue'
import MusicLinksInput from '../components/onboarding/MusicLinksInput.vue'
import PurposeSelection from '../components/onboarding/PurposeSelection.vue'
import RoleSelection from '../components/onboarding/RoleSelection.vue'
import StepIndicator from '../components/onboarding/StepIndicator.vue'
import WelcomeStep from '../components/onboarding/WelcomeStep.vue'

const router = useRouter()

// 加载状态
const isLoading = ref(true)

// 向导状态
const onboardingState = reactive({
  currentStep: 1,
  userType: '', // 'artist' | 'label'
  artistInfo: {
    stageName: '',
    musicLinks: []
  },
  labelInfo: {
    chineseName: '',
    englishName: '',
    role: '', // 'owner' | 'reviewer' | 'designer' | 'copywriter'
    isInJiYinJi: null, // null表示未选择，true/false表示已选择
    isInBeatArray: null,
    beatArrayCredentials: {},
    selectedLabelId: null // 用于已入驻厂牌的ID
  }
})

const currentStep = ref(1)

// 检查用户向导状态
const checkOnboardingStatus = async () => {
  try {
    console.log('检查用户向导状态...')
    const response = await OnboardingService.getStatus()

    if (response.success && response.data) {
      const { user, progress } = response.data

      console.log('用户向导状态:', user)
      console.log('向导进度:', progress)

      // 如果用户已完成向导，直接跳转到仪表盘
      if (user.onboardingCompleted) {
        console.log('用户已完成向导，跳转到仪表盘')
        notification.info('欢迎回来！')
        router.replace('/dashboard')
        return
      }

      // 如果用户有进度，恢复状态
      if (user.userType) {
        onboardingState.userType = user.userType
        currentStep.value = user.onboardingStep || 1
        console.log('恢复用户向导状态:', user.userType, '步骤:', currentStep.value)
      }
    }
  } catch (error) {
    console.error('检查向导状态失败:', error)
    // 如果检查失败，继续显示向导页面
  } finally {
    isLoading.value = false
  }
}

// 页面加载时检查向导状态
onMounted(() => {
  checkOnboardingStatus()
})

// 计算当前步骤组件
const currentStepComponent = computed(() => {
  const stepMap = getStepMap()
  const component = stepMap[currentStep.value] || PurposeSelection
  console.log('Current step:', currentStep.value, 'Component:', component.name || component)
  console.log('Step map:', stepMap)
  return component
})

// 获取步骤映射
const getStepMap = () => {
  const map = { 1: PurposeSelection }

  // 简化逻辑，先确保基本步骤能工作
  if (onboardingState.userType === 'artist') {
    map[2] = ArtistNameInput
    map[3] = MusicLinksInput
    map[4] = WelcomeStep
  } else if (onboardingState.userType === 'label') {
    map[2] = JiYinJiStatus
    map[3] = LabelInfoInput // 暂时简化，总是显示厂牌信息输入
    map[4] = RoleSelection
    map[5] = WelcomeStep
  }

  return map
}

// 计算总步骤数
const totalSteps = computed(() => {
  if (onboardingState.userType === 'artist') {
    return 4 // 目的选择 + 艺名 + 音乐链接 + 欢迎
  } else if (onboardingState.userType === 'label') {
    return 5 // 目的选择 + 极音记状态 + 厂牌信息 + 身份选择 + 欢迎
  }
  return 6 // 默认最大步骤数
})

// 步骤标题
const stepTitles = computed(() => {
  const titles = ['选择目的']

  if (onboardingState.userType === 'artist') {
    titles.push('艺名设置', '音乐链接', '完成设置')
  } else if (onboardingState.userType === 'label') {
    titles.push('极音记状态')

    if (onboardingState.labelInfo.isInJiYinJi) {
      titles.push('搜索厂牌')
    } else {
      titles.push('厂牌信息')
    }

    titles.push('身份选择')

    if (onboardingState.labelInfo.role === 'owner') {
      titles.push('节奏阵列')
    }

    titles.push('完成设置')
  }

  return titles
})

// 是否显示导航按钮
const showNavigation = computed(() => {
  // 欢迎步骤不显示导航按钮
  const currentComponent = getStepMap()[currentStep.value]
  return currentComponent !== WelcomeStep
})

// 是否为最后一步
const isLastStep = computed(() => {
  return currentStep.value === totalSteps.value
})

// 是否可以继续
const canProceed = computed(() => {
  // 这里可以添加各步骤的验证逻辑
  return true
})

// 处理状态更新
const handleStateUpdate = (newState) => {
  console.log('handleStateUpdate called with:', newState)
  Object.assign(onboardingState, newState)
  console.log('onboardingState after update:', onboardingState)
}

// 处理下一步
const handleNext = () => {
  console.log('handleNext called, current step:', currentStep.value)
  console.log('onboardingState:', onboardingState)

  if (currentStep.value < totalSteps.value) {
    currentStep.value++
    console.log('moved to step:', currentStep.value)
  }
}

// 处理上一步
const handleBack = () => {
  if (currentStep.value > 1) {
    currentStep.value--
  }
}

// 处理完成
const handleComplete = async () => {
  try {
    notification.success('设置完成，欢迎使用 Acmetone LABEL！')

    // 跳转到主应用
    router.push('/dashboard')
  } catch (error) {
    console.error('完成向导失败:', error)
    notification.error('跳转失败，请重试')
  }
}
</script>

<style scoped>
.onboarding-page {
  min-height: 100vh;
  background: #fff;
  color: #1a1a1a;
  font-family: var(--garrix-font-primary);
  display: flex;
  flex-direction: column;
}

/* 进度条容器 */
.progress-bar-container {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  padding: 20px 5%;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
}

/* 主要内容区域 */
.onboarding-container {
  flex: 1;
  padding: 120px 5% 60px; /* 顶部留出进度条空间 */
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - 120px);
}

/* 背景文字装饰 */
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

/* 内容区域 */
.onboarding-content {
  position: relative;
  z-index: 2;
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
}

/* 加载状态 */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  text-align: center;
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

/* 步骤切换动画 */
.step-enter-active,
.step-leave-active {
  transition: all 0.4s ease;
}

.step-enter-from {
  opacity: 0;
  transform: translateY(30px);
}

.step-leave-to {
  opacity: 0;
  transform: translateY(-30px);
}

/* 响应式设计 */
@media (max-width: 992px) {
  .onboarding-container {
    padding: 100px 5% 40px;
  }

  .background-text {
    font-size: 25vw;
    top: 30%;
  }
}

@media (max-width: 768px) {
  .progress-bar-container {
    padding: 15px 5%;
  }

  .onboarding-container {
    padding: 80px 5% 30px;
  }

  .background-text {
    font-size: 30vw;
  }
}
</style>
