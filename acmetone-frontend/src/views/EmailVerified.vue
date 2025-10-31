<template>
  <div class="email-verified-container">
    <el-card class="email-verified-card">
      <el-result
        icon="success"
        title="邮箱验证成功"
        sub-title="您的邮箱已成功验证，现在可以使用所有功能了。"
      >
        <template #extra>
          <el-button type="primary" @click="$router.push('/login')">
            立即登录
          </el-button>
        </template>
      </el-result>
    </el-card>
  </div>
</template>

<script setup>
import { onMounted } from 'vue';
import { ElMessage } from 'element-plus';

onMounted(() => {
  ElMessage.success('邮箱验证成功');
});
</script>

<style scoped>
.email-verified-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: calc(100vh - 200px);
}

.email-verified-card {
  width: 100%;
  max-width: 500px;
}
</style> 