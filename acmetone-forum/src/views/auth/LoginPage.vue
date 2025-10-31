<!--
 * 登录页面组件
 * 
 * 该组件提供用户登录功能，支持与Acmetone主系统的用户数据同步。
 * 
 * @module views/auth/LoginPage
 * @requires vue
 * @requires vue-router
 * @requires element-plus
 * @requires @/stores/user
 -->
<template>
  <div class="login-container">
    <div class="login-card">
      <h2 class="login-title">登录 Acmetone 论坛</h2>
      <p class="login-subtitle">与全球电子音乐爱好者交流</p>

      <el-form
        ref="loginFormRef"
        :model="loginForm"
        :rules="loginRules"
        label-position="top"
        @submit.prevent="handleLogin"
      >
        <el-form-item label="用户名" prop="username">
          <el-input
            v-model="loginForm.username"
            placeholder="请输入用户名"
            prefix-icon="el-icon-user"
          />
        </el-form-item>

        <el-form-item label="密码" prop="password">
          <el-input
            v-model="loginForm.password"
            type="password"
            placeholder="请输入密码"
            prefix-icon="el-icon-lock"
            show-password
          />
        </el-form-item>

        <div class="login-actions">
          <el-button
            type="primary"
            native-type="submit"
            :loading="userStore.loading"
            class="login-button"
          >
            登录
          </el-button>
        </div>

        <div class="login-links">
          <router-link to="/register" class="register-link">
            没有账号？立即注册
          </router-link>
        </div>
      </el-form>

      <div v-if="userStore.error" class="login-error">
        {{ userStore.error }}
      </div>

      <div class="login-sync-info">
        <el-alert
          title="用户数据同步"
          type="info"
          description="登录时会自动与Acmetone主系统同步您的用户数据，确保您在两个系统中使用相同的账号。"
          :closable="false"
          show-icon
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 登录页面组件
 * 
 * @component
 */
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { useUserStore } from '@/stores/user';

// 路由实例
const router = useRouter();

// 用户状态
const userStore = useUserStore();

// 登录表单
const loginForm = reactive({
  username: '',
  password: '',
});

// 表单验证规则
const loginRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 50, message: '用户名长度应在3-50个字符之间', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度应至少为6个字符', trigger: 'blur' },
  ],
};

// 表单引用
const loginFormRef = ref(null);

/**
 * 处理登录
 * 登录成功后会自动与Acmetone主系统同步用户数据
 */
const handleLogin = async () => {
  if (!loginFormRef.value) return;
  
  try {
    // @ts-ignore - 忽略类型检查，表单验证方法在运行时存在
    await loginFormRef.value.validate();
    
    await userStore.login({
      username: loginForm.username,
      password: loginForm.password,
    });
    
    ElMessage.success('登录成功');
    router.push('/');
  } catch (error) {
    // 错误已在store中处理
    console.error('登录失败:', error);
  }
};
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: calc(100vh - 60px);
  padding: 20px;
  background-color: #f5f7fa;
}

.login-card {
  width: 100%;
  max-width: 400px;
  padding: 30px;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.login-title {
  margin: 0 0 10px;
  font-size: 24px;
  font-weight: 600;
  text-align: center;
  color: #303133;
}

.login-subtitle {
  margin: 0 0 30px;
  font-size: 14px;
  text-align: center;
  color: #909399;
}

.login-actions {
  margin-top: 20px;
}

.login-button {
  width: 100%;
}

.login-links {
  margin-top: 15px;
  text-align: center;
}

.register-link {
  color: #409eff;
  font-size: 14px;
  text-decoration: none;
}

.login-error {
  margin-top: 15px;
  padding: 10px;
  color: #f56c6c;
  background-color: #fef0f0;
  border-radius: 4px;
}

.login-sync-info {
  margin-top: 20px;
}
</style> 