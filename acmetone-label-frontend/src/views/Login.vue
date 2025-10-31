<template>
  <div class="page-container">
    <div class="background-text">LOGIN</div>
    <div class="grid-container">
      <div class="left-panel">
        <h1 class="page-title">登录</h1>
        <p class="page-subtitle">LOGIN</p>
      </div>
      <div class="right-panel">
        <div class="container">
          <div class="form-container">
        <form class="form" @submit.prevent="handleLogin">


          <div class="input-block">
            <label for="username">用户名</label>
            <input
              class="input"
              type="text"
              id="username"
              v-model="loginForm.username"
              placeholder="请输入用户名"
              required
            >
          </div>

          <div class="input-block password-block">
            <label for="password">密码</label>
            <input
              class="input"
              type="password"
              id="password"
              v-model="loginForm.password"
              placeholder="请输入密码"
              required
              @keyup.enter="handleLogin"
            >
          </div>

          <div class="forgot-password">
            <a href="#" @click.prevent="handleForgotPassword">忘记密码?</a>
          </div>

          <div class="button-container">
            <button
              type="button"
              :disabled="authStore.loading || !canSubmit"
              class="submit-btn"
              @click="showCaptchaDialog"
            >
              <span class="btn-text">{{ authStore.loading ? '登录中...' : '登录' }}</span>
              <div class="submit-loader" v-if="authStore.loading">
                <div class="loader mini-loader">
                  <svg viewBox="0 0 80 80">
                    <circle r="32" cy="40" cx="40"></circle>
                  </svg>
                </div>
              </div>
            </button>
            <button
              type="button"
              class="register-btn"
              @click="handleRegister"
            >
              注册账号
            </button>
          </div>
        </form>
          </div>
        </div>
      </div>
    </div>

    <!-- 滑块验证码模态框 -->
    <SliderCaptcha
      v-if="captchaDialogVisible"
      @success="onCaptchaSuccess"
      @close="onCaptchaDialogClose"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import SliderCaptcha from '../components/SliderCaptcha.vue'
import OnboardingService from '../services/OnboardingService.js'
import { useAuthStore } from '../stores/authStore'
import notification from '../utils/notification'

const router = useRouter()
const authStore = useAuthStore()

// 登录表单数据
const loginForm = reactive({
  username: '',
  password: ''
})

// 验证码弹窗状态
const captchaDialogVisible = ref(false)

// 计算属性：是否可以提交
const canSubmit = computed(() => {
  return loginForm.username && loginForm.password && loginForm.password.length >= 6
})

// 检查向导状态并重定向
const checkOnboardingAndRedirect = async () => {
  try {
    console.log('[Login] 检查向导状态...')

    // 获取向导状态
    const response = await OnboardingService.getStatus()
    console.log('[Login] 向导状态响应:', response)

    if (response.success && response.data) {
      const { user } = response.data

      // 如果向导未完成，跳转到向导页面
      if (!user.onboardingCompleted) {
        console.log('[Login] 向导未完成，跳转到向导页面')
        router.push('/onboarding')
        return
      }

      // 向导已完成，跳转到主页面
      console.log('[Login] 向导已完成，跳转到主页面')
      router.push('/')
    } else {
      // 如果获取状态失败，默认跳转到向导页面
      console.log('[Login] 获取向导状态失败，跳转到向导页面')
      router.push('/onboarding')
    }
  } catch (error) {
    console.error('[Login] 检查向导状态失败:', error)

    // 如果是认证错误，说明token有问题，清除认证状态
    if (error.response?.status === 401) {
      console.log('[Login] 认证失败，清除认证状态')
      authStore.logout()
      notification.error('登录状态已过期，请重新登录')
      return
    }

    // 其他错误，默认跳转到向导页面
    console.log('[Login] 检查向导状态出错，跳转到向导页面')
    router.push('/onboarding')
  }
}

// 组件挂载时检查认证状态
onMounted(async () => {
  // 如果已经登录，检查向导状态
  if (authStore.isAuthenticated) {
    console.log('[Login] 用户已登录，检查向导状态')
    await checkOnboardingAndRedirect()
  }
})

// 显示验证码弹窗
const showCaptchaDialog = () => {
  if (!canSubmit.value) {
    notification.warning('请输入用户名和密码')
    return
  }
  captchaDialogVisible.value = true
}

// 验证码弹窗关闭时的处理
const onCaptchaDialogClose = () => {
  captchaDialogVisible.value = false
  // 如果用户关闭了弹窗，但请求已发送，需要重置加载状态
  if (authStore.loading) {
    // 这里可以添加取消请求的逻辑
  }
}

// 验证码验证成功后的处理
const onCaptchaSuccess = async (captchaResult) => {
  captchaDialogVisible.value = false

  try {
    console.log('[Login] 开始登录流程，包含验证码')

    // 使用authStore的login方法，包含验证码信息
    const result = await authStore.login({
      username: loginForm.username,
      password: loginForm.password,
      captchaId: captchaResult.captchaId,
      captchaX: captchaResult.captchaX
    })

    if (result.success) {
      console.log('[Login] 登录成功，检查向导状态')
      notification.success('登录成功')

      // 检查向导状态并跳转
      await checkOnboardingAndRedirect()
    } else {
      console.error('[Login] 登录失败:', result.message)
      notification.error(result.message || '登录失败')
    }
  } catch (error) {
    console.error('[Login] 登录过程中发生错误:', error)
    notification.error('登录失败，请稍后再试')
  }
}

// 处理登录（现在通过验证码触发）
const handleLogin = async () => {
  // 这个方法现在主要用于表单提交时触发验证码
  showCaptchaDialog()
}

// 处理忘记密码
const handleForgotPassword = () => {
  router.push('/forgot-password')
}

// 处理注册
const handleRegister = () => {
  router.push('/register')
}
</script>

<style scoped>
.page-container {
  /* 顶部有固定 Header，容器需下移并以可视高度居中 */
  margin-top: 90px; /* Header 高度 */
  padding: 0 5% 40px; /* 去掉顶部 padding，保留左右与底部间距 */
  background-color: #fff;
  color: #1a1a1a;
  min-height: calc(100vh - 90px); /* 视口高度减 Header */
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center; /* 垂直居中 */
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

/* 新的登录面板样式 */
.container {
  display: flex;
  width: 520px;
  max-width: 90%;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  background-color: transparent;
  border-radius: 0;
  z-index: 1;
  height: auto;
  padding: 20px;
}

.form-container {
  width: 100%;
  height: 100%;
}

.form {
  display: flex;
  flex-direction: column;
  justify-content: center;
  height: 100%;
  width: 100%;
  left: 0;
  position: relative;
}

.input,
button {
  outline: none;
  margin: 0;
  width: 100%;
  display: block;
  color: #000000;
  font-weight: 500;
  font-size: 1em;
  font-family: var(--garrix-font-primary, 'Montserrat'), sans-serif;
}

.input {
  box-shadow: none;
  background: transparent;
  backdrop-filter: none;
  border-radius: 0;
  border: none;
  border-bottom: 1px solid #e0e0e0;
  transition: all 0.3s ease;
  padding: 12px 5px;
}

.input:focus {
  box-shadow: none;
  border-bottom: 1px solid #000000;
  transform: none;
}

/* 输入框样式 */
.input-block {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  margin-bottom: 20px;
  width: 100%;
}

label {
  margin-bottom: 8px;
  color: #000000;
  font-size: 0.9em;
  font-weight: 500;
}

.forgot-password {
  align-self: flex-end;
  margin-top: 5px;
  margin-bottom: 20px;
}

a {
  color: #666666;
  text-decoration: none;
  font-size: 0.85em;
}

a:hover {
  text-decoration: none;
  color: #000000;
}

.form-title {
  color: #000000;
  text-align: center;
  margin-bottom: 10px;
  font-size: 2em;
  font-weight: 700;
}

.breadcrumb {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 30px;
  color: #666666;
  font-size: 0.85em;
}

.breadcrumb .link {
  cursor: pointer;
}

.breadcrumb .link:hover {
  color: #000000;
}

.breadcrumb .separator {
  margin: 0 8px;
}

.breadcrumb .current {
  font-weight: 500;
}

button {
  background-color: #000000;
  color: #ffffff;
  font-size: 0.9em;
  box-shadow: none;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: all 0.3s ease;
  z-index: 1;
  border: none;
  border-radius: 0;
  padding: 15px 10px;
  text-transform: uppercase;
  letter-spacing: 1px;
  font-weight: 600;
  width: 100%;
  margin-bottom: 15px;
}

button:hover {
  opacity: 0.9;
}

button:disabled {
  background-color: #999999;
  cursor: not-allowed;
}

.register-btn {
  background-color: #ffffff;
  color: #000000;
  border: 1px solid #000000;
}

.button-container {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* 提交按钮加载动画 */
.submit-btn {
  display: flex;
  align-items: center;
  justify-content: center;
}

.submit-loader {
  margin-left: 8px;
}

/* 加载动画 */
.loader {
  width: 20px;
  height: 20px;
}

.loader svg {
  width: 100%;
  height: 100%;
  animation: rotate 2s linear infinite;
}

.loader circle {
  fill: none;
  stroke: #ffffff;
  stroke-width: 2;
  stroke-dasharray: 150, 200;
  stroke-dashoffset: -10;
  stroke-linecap: round;
  animation: dash 1.5s ease-in-out infinite;
}

@keyframes rotate {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

@keyframes dash {
  0% {
    stroke-dasharray: 1, 200;
    stroke-dashoffset: 0;
  }
  50% {
    stroke-dasharray: 89, 200;
    stroke-dashoffset: -35px;
  }
  100% {
    stroke-dasharray: 89, 200;
    stroke-dashoffset: -124px;
  }
}

@media (max-width: 992px) {
  .grid-container {
    grid-template-columns: 1fr;
    gap: 60px;
    text-align: center;
  }

  .left-panel, .container {
    margin: 0 auto;
  }

  .background-text {
    font-size: 25vw;
    top: 30%;
  }

  .page-title {
    font-size: 48px;
  }

  .container {
    width: 90%;
    padding: 15px;
  }
}
</style>
