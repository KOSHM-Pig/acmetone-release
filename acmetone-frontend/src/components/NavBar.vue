<template>
  <el-menu 
    :default-active="activeIndex"
    class="nav-menu"
    mode="horizontal"
    :router="true"
  >
    <el-menu-item index="/">首页</el-menu-item>
    
    <template v-if="userStore.isAuthenticated">
      <el-menu-item index="/albums">我的专辑</el-menu-item>
      <el-menu-item index="/albums/new">创建专辑</el-menu-item>
      <el-menu-item index="/services">增值服务</el-menu-item>
      <el-menu-item index="/artist-wiki">歌手Wiki</el-menu-item>
      <el-menu-item index="/beat-array-submissions">节奏阵列投稿</el-menu-item>
      
      <el-sub-menu index="user">
        <template #title>用户中心</template>
        <el-menu-item index="/user-center">个人信息</el-menu-item>
        <el-menu-item index="/user-center/contracts">生效合同</el-menu-item>
        <el-menu-item index="/user-verification">
          实名认证
          <el-tag 
            v-if="isVerified" 
            type="success" 
            size="small" 
            effect="dark"
            class="verification-tag"
          >
            已认证
          </el-tag>
          <el-tag 
            v-else-if="verificationStatus === 'pending'" 
            type="warning" 
            size="small" 
            effect="dark"
            class="verification-tag"
          >
            审核中
          </el-tag>
          <el-tag 
            v-else-if="verificationStatus === 'rejected'" 
            type="danger" 
            size="small" 
            effect="dark"
            class="verification-tag"
          >
            已拒绝
          </el-tag>
        </el-menu-item>
      </el-sub-menu>
      
      <el-sub-menu index="admin" v-if="userStore.isAdmin">
        <template #title>管理功能</template>
        <el-menu-item index="/admin/workbench">审核工作台</el-menu-item>
        <el-menu-item index="/admin/albums">专辑审核</el-menu-item>
        <el-menu-item index="/admin/artist-requests">歌手修改请求</el-menu-item>
        <el-menu-item index="/admin/user-verification">实名认证审核</el-menu-item>
        <el-menu-item index="/admin/email-settings">邮件通知设置</el-menu-item>
      </el-sub-menu>
      
      <el-menu-item @click="handleLogout">退出登录</el-menu-item>
    </template>
    
    <template v-else>
      <el-menu-item index="/login">登录</el-menu-item>
      <el-menu-item index="/register">注册</el-menu-item>
    </template>
  </el-menu>
</template>

<script setup>
import { useUserStore } from '@/stores/user';
import { useUserVerificationStore } from '@/stores/userVerification';
import { ElMessage } from 'element-plus';
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const userVerificationStore = useUserVerificationStore();

const activeIndex = computed(() => route.path);
const isVerified = ref(false);
const verificationStatus = ref(null);

// 获取用户认证状态
const fetchVerificationStatus = async () => {
  if (!userStore.isAuthenticated) return;
  
  // 避免频繁请求，添加节流逻辑
  if (isVerified.value !== undefined) return;
  
  try {
    const result = await userVerificationStore.getVerificationStatus();
    isVerified.value = result.isVerified;
    verificationStatus.value = result.verification?.status || null;
  } catch (error) {
    if (error.response?.status !== 404) {
      console.error('获取认证状态失败:', error);
    }
  }
};

// 监听用户状态变化
watch(() => userStore.isAuthenticated, (newValue) => {
  if (newValue) {
    fetchVerificationStatus();
  } else {
    // 用户登出时重置认证状态
    isVerified.value = undefined;
    verificationStatus.value = null;
  }
}, { immediate: true });

const handleLogout = () => {
  userStore.logout();
  userVerificationStore.resetState();
  ElMessage.success('已退出登录');
  router.push('/login');
};

onMounted(() => {
  if (userStore.isAuthenticated && isVerified.value === undefined) {
    fetchVerificationStatus();
  }
});
</script>

<style scoped>
.nav-menu {
  margin-bottom: 20px;
}

.verification-tag {
  margin-left: 5px;
}
</style> 