<template>
  <div class="register-container">
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
        <form class="form" @submit.prevent="handleSubmit" ref="formRef">
          <h2 class="form-title">注册</h2>
          
          <div class="breadcrumb">
            <span class="link">首页</span>
            <span class="separator">></span>
            <span class="current">创建账号</span>
          </div>
          
          <div class="input-block">
            <label for="username">用户名</label>
            <input class="input" type="text" id="username" v-model="form.username" required="">
          </div>
          
          <div class="input-block">
            <label for="email">邮箱</label>
            <input class="input" type="email" id="email" v-model="form.email" required="">
          </div>
          
          <div class="input-block verification-block">
            <label for="verificationCode">验证码</label>
            <input class="input" type="text" id="verificationCode" v-model="form.verificationCode" required="">
            <button 
              type="button" 
              class="verification-btn" 
              :class="{ 'counting': cooldown > 0 }"
              :disabled="!form.email || !validateEmail(form.email) || cooldown > 0 || sendingCode" 
              @click="showCaptchaDialog('sendCode')"
            >
              {{ cooldown > 0 ? `${cooldown}秒` : '获取验证码' }}
            </button>
          </div>
          
          <div class="input-block password-block">
            <label for="password">密码</label>
            <input class="input" type="password" id="password" v-model="form.password" required="">
          </div>
          
          <div class="input-block password-block">
            <label for="confirmPassword">确认密码</label>
            <input class="input" type="password" id="confirmPassword" v-model="form.confirmPassword" required="">
          </div>
          
          <div class="terms-box">
            <p>注册即表示您同意我们的隐私政策和服务条款。</p>
          </div>
          
            <div class="button-container">
              <button type="button" @click="showCaptchaDialog('register')" :disabled="loading" class="submit-btn">
                <span class="btn-text">{{ loading ? '注册中...' : '注册' }}</span>
                <div class="submit-loader" v-if="loading">
                  <div class="loader mini-loader">
                    <svg viewBox="0 0 80 80">
                      <circle r="32" cy="40" cx="40"></circle>
                    </svg>
                  </div>
                </div>
              </button>
              <button type="button" class="login-btn" @click="$router.push('/login')">返回登录</button>
          </div>
        </form>
      </div>
    </div>

    <!-- 滑块验证码弹窗 -->
    <el-dialog
      v-model="captchaDialogVisible"
      title="请完成人机验证"
      width="360px"
      :close-on-click-modal="false"
    >
      <SliderCaptcha v-if="captchaDialogVisible" @success="onCaptchaSuccess" @close="captchaDialogVisible = false" />
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onUnmounted, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '../stores/user';
import { ElMessage, ElDialog } from 'element-plus';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import SliderCaptcha from '../components/SliderCaptcha.vue';

const router = useRouter();
const userStore = useUserStore();
const formRef = ref(null);
const loading = ref(false);
const sendingCode = ref(false);
const cooldown = ref(0);
let cooldownTimer = null;
const isLoading = ref(true);
const captchaDialogVisible = ref(false);
let captchaAction = ref(''); // 'sendCode' or 'register'

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
  email: '',
  verificationCode: '',
  password: '',
  confirmPassword: '',
});

const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// 手动验证表单
const validateForm = () => {
  // 验证用户名
  if (!form.username) {
    ElMessage.warning('请输入用户名');
    return false;
  }
  if (form.username.length < 3 || form.username.length > 20) {
    ElMessage.warning('用户名长度应在3到20个字符之间');
    return false;
  }
  
  // 验证邮箱
  if (!form.email) {
    ElMessage.warning('请输入邮箱地址');
    return false;
  }
  if (!validateEmail(form.email)) {
    ElMessage.warning('请输入有效的邮箱地址');
    return false;
  }
  
  // 验证验证码
  if (!form.verificationCode) {
    ElMessage.warning('请输入验证码');
    return false;
  }
  if (form.verificationCode.length !== 6) {
    ElMessage.warning('验证码长度应为6位');
    return false;
  }
  
  // 验证密码
  if (!form.password) {
    ElMessage.warning('请输入密码');
    return false;
  }
  if (form.password.length < 6) {
    ElMessage.warning('密码长度不能小于6个字符');
    return false;
  }
  
  // 验证确认密码
  if (!form.confirmPassword) {
    ElMessage.warning('请再次输入密码');
    return false;
  }
  if (form.password !== form.confirmPassword) {
    ElMessage.warning('两次输入密码不一致');
    return false;
  }
  
  return true;
};

const showCaptchaDialog = (action) => {
  if (action === 'sendCode' && !form.email) {
    ElMessage.warning('请输入邮箱地址');
    return;
  }
  if (action === 'register' && (!form.username || !form.email || !form.password)) {
    ElMessage.warning('请填写完整的注册信息');
    return;
  }
  captchaAction.value = action;
  captchaDialogVisible.value = true;
};

const onCaptchaSuccess = async (captchaResult) => {
  captchaDialogVisible.value = false;
  if (captchaAction.value === 'sendCode') {
    await sendVerificationCode(captchaResult);
  } else if (captchaAction.value === 'register') {
    await handleRegister(captchaResult);
  }
};

const sendVerificationCode = async (captchaResult) => {
  sendingCode.value = true;
  try {
    await axios.post(`${API_BASE_URL}/users/send-verification-code`, {
      email: form.email,
      captchaId: captchaResult.captchaId,
      captchaX: captchaResult.captchaX,
    });
    ElMessage.success('验证码已发送');
    // 开始倒计时
    cooldown.value = 60;
    cooldownTimer = setInterval(() => {
      cooldown.value--;
      if (cooldown.value <= 0) {
        clearInterval(cooldownTimer);
      }
    }, 1000);
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '发送失败');
  } finally {
    sendingCode.value = false;
  }
};

const handleRegister = async (captchaResult) => {
  loading.value = true;
  try {
    await axios.post(`${API_BASE_URL}/users/register`, {
      ...form,
      captchaId: captchaResult.captchaId,
      captchaX: captchaResult.captchaX,
    });
    ElMessage.success('注册成功！');
    // 注册成功后跳转到登录页
    router.push('/login');
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '注册失败');
  } finally {
    loading.value = false;
  }
};

// 组件卸载时清除定时器
onUnmounted(() => {
  if (cooldownTimer) {
    clearInterval(cooldownTimer);
  }
});
</script>

<style scoped>
.register-container {
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

/* 新的注册面板样式 */
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

.login-btn {
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

/* 验证码按钮样式 */
.verification-block {
  position: relative;
}

.verification-btn {
  position: absolute;
  right: 0;
  bottom: 12px;
  width: auto;
  height: 30px;
  padding: 0 10px;
  line-height: 28px;
  font-size: 0.7em;
  letter-spacing: 1px;
  background-color: transparent;
  color: #000000;
  border: 1px solid #000000;
  cursor: pointer;
  margin: 0;
}

.verification-btn:hover {
  background-color: #000000;
  color: #ffffff;
}

.verification-btn.counting {
  background-color: #999999;
  color: #ffffff;
  border-color: #999999;
  cursor: not-allowed;
}

.terms-box {
  margin: 10px 0 20px;
  font-size: 0.85em;
  color: #666666;
  text-align: center;
}

@media (max-width: 768px) {
  .container {
    width: 90%;
    padding: 15px;
}

  .verification-btn {
    font-size: 0.65em;
    padding: 0 5px;
  }
}
</style> 