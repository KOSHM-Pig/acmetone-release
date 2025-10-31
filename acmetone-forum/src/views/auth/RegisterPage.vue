<!--
 * 注册页面组件
 * 
 * 该组件提供用户注册功能，支持与Acmetone主系统的用户数据同步。
 * 设计风格与主页保持一致。
 * 
 * @module views/auth/RegisterPage
 * @requires vue
 * @requires vue-router
 * @requires element-plus
 * @requires @/stores/user
 -->
<template>
  <div class="register-container">
    <div class="register-card">
      <h2 class="register-title">注册 Acmetone 论坛</h2>
      <p class="register-subtitle">加入全球电子音乐爱好者社区</p>

      <el-form
        ref="registerFormRef"
        :model="registerForm"
        :rules="registerRules"
        label-position="top"
        @submit.prevent="handleRegister"
      >
        <el-form-item label="用户名" prop="username">
          <el-input
            v-model="registerForm.username"
            placeholder="请输入用户名"
            prefix-icon="User"
          />
        </el-form-item>

        <el-form-item label="邮箱" prop="email">
          <el-input
            v-model="registerForm.email"
            placeholder="请输入邮箱"
            prefix-icon="Message"
          />
        </el-form-item>

        <el-form-item label="密码" prop="password">
          <el-input
            v-model="registerForm.password"
            type="password"
            placeholder="请输入密码"
            prefix-icon="Lock"
            show-password
          />
        </el-form-item>

        <el-form-item label="确认密码" prop="confirmPassword">
          <el-input
            v-model="registerForm.confirmPassword"
            type="password"
            placeholder="请再次输入密码"
            prefix-icon="Lock"
            show-password
          />
        </el-form-item>

        <div class="register-actions">
          <el-button
            type="primary"
            native-type="submit"
            :loading="userStore.loading"
            class="register-button"
          >
            注册
          </el-button>
        </div>

        <div class="register-links">
          <router-link to="/login" class="login-link">
            已有账号？立即登录
          </router-link>
        </div>
      </el-form>

      <div v-if="userStore.error" class="register-error">
        {{ userStore.error }}
      </div>

      <div class="register-sync-info">
        <el-alert
          title="用户数据同步"
          type="info"
          description="注册成功后，您的账号将自动同步到Acmetone主系统，您可以使用相同的账号登录两个系统。"
          :closable="false"
          show-icon
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 注册页面组件
 * 
 * @component
 */
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { User, Message, Lock } from '@element-plus/icons-vue';
import { useUserStore } from '@/stores/user';

// 路由实例
const router = useRouter();

// 用户状态
const userStore = useUserStore();

// 注册表单
const registerForm = reactive({
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
});

// 表单验证规则
const validatePass2 = (rule: any, value: string, callback: any) => {
  if (value === '') {
    callback(new Error('请再次输入密码'));
  } else if (value !== registerForm.password) {
    callback(new Error('两次输入密码不一致'));
  } else {
    callback();
  }
};

const registerRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 50, message: '用户名长度应在3-50个字符之间', trigger: 'blur' },
  ],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度应至少为6个字符', trigger: 'blur' },
  ],
  confirmPassword: [
    { required: true, message: '请再次输入密码', trigger: 'blur' },
    { validator: validatePass2, trigger: 'blur' },
  ],
};

// 表单引用
const registerFormRef = ref(null);

/**
 * 处理注册
 * 注册成功后会自动将新用户同步到Acmetone主系统
 */
const handleRegister = async () => {
  if (!registerFormRef.value) return;
  
  try {
    // @ts-ignore - 忽略类型检查，表单验证方法在运行时存在
    await registerFormRef.value.validate();
    
    await userStore.register({
      username: registerForm.username,
      email: registerForm.email,
      password: registerForm.password,
    });
    
    ElMessage.success('注册成功，请登录');
    router.push('/login');
  } catch (error) {
    // 错误已在store中处理
    console.error('注册失败:', error);
  }
};
</script>

<style scoped>
.register-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: calc(100vh - 60px);
  padding: 20px;
  background-color: #f5f7fa;
}

.register-card {
  width: 100%;
  max-width: 400px;
  padding: 30px;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.register-title {
  margin: 0 0 10px;
  font-size: 24px;
  font-weight: 600;
  text-align: center;
  color: #303133;
}

.register-subtitle {
  margin: 0 0 30px;
  font-size: 14px;
  text-align: center;
  color: #909399;
}

.register-actions {
  margin-top: 20px;
}

.register-button {
  width: 100%;
}

.register-links {
  margin-top: 15px;
  text-align: center;
}

.login-link {
  color: #409eff;
  font-size: 14px;
  text-decoration: none;
}

.register-error {
  margin-top: 15px;
  padding: 10px;
  color: #f56c6c;
  background-color: #fef0f0;
  border-radius: 4px;
}

.register-sync-info {
  margin-top: 20px;
}
</style> 