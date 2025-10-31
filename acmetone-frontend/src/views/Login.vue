<template>
  <div class="login-container">
    <!-- 加载动画容器 -->
    <div class="loaders-container" v-if="isLoading">
      <div class="loader">
        <svg viewBox="0 0 80 80">
          <circle r="32" cy="40" cx="40" id="test"></circle>
        </svg>
      </div>

      <div class="loader triangle">
        <svg viewBox="0 0 86 80">
          <polygon points="43 8 79 72 7 72"></polygon>
        </svg>
      </div>

      <div class="loader">
        <svg viewBox="0 0 80 80">
          <rect height="64" width="64" y="8" x="8"></rect>
        </svg>
      </div>
    </div>

    <div class="container" v-else :class="{ 'fade-in': !isLoading }">
      <div class="form-container">
        <form class="form" @submit.prevent="handleSubmit">
          <h2 class="form-title">登录</h2>
          
          <div class="breadcrumb">
            <span class="link" @click="$router.push('/')">首页</span>
            <span class="separator">></span>
            <span class="current">登录账号</span>
          </div>
          
          <div class="input-block">
            <label for="username">用户名</label>
            <input class="input" type="text" id="username" v-model="form.username" required="">
          </div>
          
          <div class="input-block password-block">
            <label for="password">密码</label>
            <input class="input" type="password" id="password" v-model="form.password" required="">
          </div>
          
          <div class="forgot-password">
            <router-link to="/forgot-password">忘记密码?</router-link>
          </div>
          
            <div class="button-container">
              <button type="button" @click="showCaptchaDialog" :disabled="loading" class="submit-btn">
                <span class="btn-text">{{ loading ? '登录中...' : '登录' }}</span>
                <div class="submit-loader" v-if="loading">
                  <div class="loader mini-loader">
                    <svg viewBox="0 0 80 80">
                      <circle r="32" cy="40" cx="40"></circle>
                    </svg>
                  </div>
                </div>
              </button>
              <button type="button" class="register-btn" @click="$router.push('/register')">注册账号</button>
          </div>
        </form>
      </div>
    </div>
    
    <!-- 邮箱验证提示 -->
    <el-alert
      v-if="showVerificationAlert"
      title="请验证您的邮箱"
      type="warning"
      description="您的邮箱尚未验证，部分功能可能受限。请查收邮箱并点击验证链接，或点击下方按钮重新发送验证邮件。"
      :closable="false"
      show-icon
      class="verification-alert animate__animated animate__fadeInUp"
      style="animation-delay: 0.5s;"
    >
      <template #default>
        <div class="verification-actions">
          <el-button 
            type="primary" 
            size="small" 
            @click="resendVerificationEmail"
            :loading="resendLoading"
          >
            重新发送验证邮件
          </el-button>
        </div>
      </template>
    </el-alert>

    <!-- 滑块验证码弹窗 -->
    <el-dialog
      v-model="captchaDialogVisible"
      title="请完成人机验证"
      width="360px"
      :close-on-click-modal="false"
      @closed="onCaptchaDialogClose"
    >
      <SliderCaptcha v-if="captchaDialogVisible" @success="onCaptchaSuccess" @close="captchaDialogVisible = false" />
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '../stores/user';
import { ElMessage, ElDialog } from 'element-plus';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import SliderCaptcha from '../components/SliderCaptcha.vue';

const router = useRouter();
const userStore = useUserStore();
const loading = ref(false);
const resendLoading = ref(false);
const showVerificationAlert = ref(false);
const isLoading = ref(true);
const captchaDialogVisible = ref(false);

// 生成随机加载时间（0.4秒到1.2秒之间，10%概率为3秒）
const getRandomLoadingTime = () => {
  // 10%概率返回3秒
  if (Math.random() < 0.1) {
    return 3000;
  }
  // 90%概率返回0.4-1.2秒之间的随机时间
  return Math.floor(Math.random() * (1200 - 400 + 1) + 400);
};

// 模拟页面加载完成
onMounted(() => {
  const randomTime = getRandomLoadingTime();
  setTimeout(() => {
    isLoading.value = false;
  }, randomTime);
});

const form = reactive({
  username: '',
  password: '',
});

const handleSubmit = async () => {
  try {
    // 验证表单
    if (!form.username) {
      ElMessage.warning('请输入用户名');
      return;
    }
    
    if (!form.password) {
      ElMessage.warning('请输入密码');
      return;
    }
    
    loading.value = true;
    const { needVerification } = await userStore.login(form.username, form.password);
    
    // 登录后强制刷新用户信息，确保头像URL包含时间戳
    try {
      await userStore.fetchUserInfo();
      
      // 检查是否有头像并为其添加时间戳
      if (userStore.user && userStore.user.avatar) {
        const timestamp = Date.now();
        const avatarUrl = userStore.user.avatar;
        const refreshedAvatarUrl = avatarUrl.includes('?') 
          ? `${avatarUrl}&refresh=${timestamp}` 
          : `${avatarUrl}?refresh=${timestamp}`;
        
        // 更新用户头像URL
        userStore.user.avatar = refreshedAvatarUrl;
        // 保存更新后的用户信息
        userStore.persistUserInfo();
        
        console.log('登录后强制刷新头像URL:', refreshedAvatarUrl);
      }
    } catch (err) {
      console.error('刷新用户信息失败:', err);
      // 继续执行，不阻止登录成功流程
    }
    
    if (needVerification) {
      showVerificationAlert.value = true;
      ElMessage.warning('登录成功，但您的邮箱尚未验证');
    } else {
      ElMessage.success('登录成功');
      // 根据用户角色决定跳转目标
      if (userStore.isAdmin) {
        router.push('/admin/all-albums');
      } else {
        router.push('/user-center');
      }
    }
  } catch (error) {
    // 直接使用后端返回的错误消息
    ElMessage.error(error.response?.data?.message || '登录失败，请稍后再试');
  } finally {
    loading.value = false;
  }
};

// 重新发送验证邮件
const resendVerificationEmail = async () => {
  try {
    resendLoading.value = true;
    await userStore.resendVerificationEmail();
    ElMessage.success('验证邮件已发送，请查收');
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '发送验证邮件失败');
  } finally {
    resendLoading.value = false;
  }
};

const showCaptchaDialog = () => {
  if (!form.username || !form.password) {
    ElMessage.warning('请输入用户名和密码');
    return;
  }
  captchaDialogVisible.value = true;
};

const onCaptchaDialogClose = () => {
  // 如果用户关闭了弹窗，但请求已发送，需要重置加载状态
  if (loading.value) {
    loading.value = false;
  }
};

const onCaptchaSuccess = async (captchaResult) => {
  captchaDialogVisible.value = false;
  loading.value = true;
  try {
    await userStore.login({
      ...form,
      captchaId: captchaResult.captchaId,
      captchaX: captchaResult.captchaX,
    });
    ElMessage.success('登录成功');
    router.push('/');
  } catch (error) {
    // 直接使用后端返回的错误消息
    ElMessage.error(error.response?.data?.message || '登录失败，请稍后再试');
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.login-container {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: #ffffff;
  font-family: var(--garrix-font-primary, 'Montserrat'), sans-serif;
}

/* 加载动画样式 */
.loaders-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
  position: relative;
  z-index: 1;
}

.loader {
  --path: #2f3545;
  --dot: #5628ee;
  --duration: 3s;
  width: 44px;
  height: 44px;
  position: relative;
}

.loader:before {
  content: "";
  width: 6px;
  height: 6px;
  border-radius: 50%;
  position: absolute;
  display: block;
  background: var(--dot);
  top: 37px;
  left: 19px;
  transform: translate(-18px, -18px);
  animation: dotRect var(--duration) cubic-bezier(0.785, 0.135, 0.15, 0.86)
    infinite;
}

.loader svg {
  display: block;
  width: 100%;
  height: 100%;
}

.loader svg rect,
.loader svg polygon,
.loader svg circle {
  fill: none;
  stroke: var(--path);
  stroke-width: 10px;
  stroke-linejoin: round;
  stroke-linecap: round;
}

.loader svg polygon {
  stroke-dasharray: 145 76 145 76;
  stroke-dashoffset: 0;
  animation: pathTriangle var(--duration) cubic-bezier(0.785, 0.135, 0.15, 0.86)
    infinite;
}

.loader svg rect {
  stroke-dasharray: 192 64 192 64;
  stroke-dashoffset: 0;
  animation: pathRect 3s cubic-bezier(0.785, 0.135, 0.15, 0.86) infinite;
}

.loader svg circle {
  stroke-dasharray: 150 50 150 50;
  stroke-dashoffset: 75;
  animation: pathCircle var(--duration) cubic-bezier(0.785, 0.135, 0.15, 0.86)
    infinite;
}

.loader.triangle {
  width: 48px;
}

.loader.triangle:before {
  left: 21px;
  transform: translate(-10px, -18px);
  animation: dotTriangle var(--duration) cubic-bezier(0.785, 0.135, 0.15, 0.86)
    infinite;
}

@keyframes pathTriangle {
  33% {
    stroke-dashoffset: 74;
  }

  66% {
    stroke-dashoffset: 147;
  }

  100% {
    stroke-dashoffset: 221;
  }
}

@keyframes dotTriangle {
  33% {
    transform: translate(0, 0);
  }

  66% {
    transform: translate(10px, -18px);
  }

  100% {
    transform: translate(-10px, -18px);
  }
}

@keyframes pathRect {
  25% {
    stroke-dashoffset: 64;
  }

  50% {
    stroke-dashoffset: 128;
  }

  75% {
    stroke-dashoffset: 192;
  }

  100% {
    stroke-dashoffset: 256;
  }
}

@keyframes dotRect {
  25% {
    transform: translate(0, 0);
  }

  50% {
    transform: translate(18px, -18px);
  }

  75% {
    transform: translate(0, -36px);
  }

  100% {
    transform: translate(-18px, -18px);
  }
}

@keyframes pathCircle {
  25% {
    stroke-dashoffset: 125;
  }

  50% {
    stroke-dashoffset: 175;
  }

  75% {
    stroke-dashoffset: 225;
  }

  100% {
    stroke-dashoffset: 275;
  }
}

.loader {
  display: inline-block;
  margin: 0 16px;
}

/* 缩小版加载器 */
.mini-loader {
  --path: #ffffff;
  --dot: #ffffff;
  --duration: 2s;
  width: 24px;
  height: 24px;
  margin: 0 8px;
}

.mini-loader:before {
  width: 4px;
  height: 4px;
  top: 20px;
  left: 10px;
}

.mini-loader svg circle,
.mini-loader svg rect,
.mini-loader svg polygon {
  stroke-width: 8px;
}

/* 淡入动画 */
.fade-in {
  animation: fadeIn 0.8s ease-in-out;
}

@keyframes fadeIn {
  0% {
    opacity: 0;
    transform: translateY(20px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate__animated {
  animation-duration: 0.8s;
  animation-fill-mode: both;
}

.animate__fadeInDown {
  animation-name: fadeInDown;
}

.animate__fadeInLeft {
  animation-name: fadeInLeft;
}

.animate__fadeInUp {
  animation-name: fadeInUp;
}

@keyframes fadeInDown {
  from {
    opacity: 0;
    transform: translate3d(0, -30px, 0);
  }
  to {
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }
}

@keyframes fadeInLeft {
  from {
    opacity: 0;
    transform: translate3d(-30px, 0, 0);
  }
  to {
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translate3d(0, 30px, 0);
  }
  to {
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }
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

.verification-alert {
  position: relative;
  z-index: 1;
  max-width: 520px;
  margin-top: 30px;
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
  background-color: #ffffff;
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

@media (max-width: 768px) {
  .container {
    width: 90%;
    padding: 15px;
  }
}
</style> 