<template>
  <div class="labels-container">
    <!-- 顶部标题区域 -->
    <div class="header-section">
      <h1 class="main-title">厂牌管理</h1>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-container">
      <div class="garrix-loading-spinner">
        <div class="spinner-line"></div>
        <div class="spinner-line"></div>
        <div class="spinner-line"></div>
      </div>
    </div>

    <!-- 无厂牌状态 -->
    <div v-else-if="!userLabel" class="no-label-container">
      <div class="no-label-content">
        <div class="no-label-icon">🏢</div>
        <h2>您还没有厂牌</h2>
        <p>申请创建厂牌，开启您的音乐发行之旅</p>
        <AcmetoneBtn 
          type="primary" 
          @click="showCreateForm = true"
          class="create-label-btn"
        >
          申请创建厂牌
        </AcmetoneBtn>
      </div>
    </div>

    <!-- 已有厂牌状态 -->
    <div v-else class="label-info-container">
      <div class="label-card">
        <div class="label-header">
          <div class="label-logo">
            <img v-if="userLabel.logoUrl" :src="userLabel.logoUrl" :alt="userLabel.chineseName" />
            <div v-else class="default-logo">{{ userLabel.chineseName.charAt(0) }}</div>
          </div>
          <div class="label-basic-info">
            <h2>{{ userLabel.chineseName }}</h2>
            <p class="english-name">{{ userLabel.englishName }}</p>
            <div class="status-badge" :class="getStatusClass(userLabel.status)">
              {{ getStatusText(userLabel.status) }}
            </div>
          </div>
        </div>

        <div class="label-details">
          <div class="detail-row" v-if="userLabel.description">
            <span class="label">厂牌描述：</span>
            <span class="value">{{ userLabel.description }}</span>
          </div>
          <div class="detail-row" v-if="userLabel.website">
            <span class="label">官方网站：</span>
            <a :href="userLabel.website" target="_blank" class="value link">{{ userLabel.website }}</a>
          </div>
          <div class="detail-row" v-if="userLabel.contactEmail">
            <span class="label">联系邮箱：</span>
            <span class="value">{{ userLabel.contactEmail }}</span>
          </div>
          <div class="detail-row" v-if="userLabel.contactQqgroup">
            <span class="label">联系QQ群：</span>
            <span class="value">{{ userLabel.contactQqgroup }}</span>
          </div>
          <div class="detail-row">
            <span class="label">申请时间：</span>
            <span class="value">{{ formatDate(userLabel.createdAt) }}</span>
          </div>
          <div class="detail-row" v-if="userLabel.verifiedAt">
            <span class="label">验证时间：</span>
            <span class="value">{{ formatDate(userLabel.verifiedAt) }}</span>
          </div>
        </div>

        <div class="label-actions" v-if="userLabel.status === 'active'">
          <AcmetoneBtn @click="editLabel">编辑厂牌信息</AcmetoneBtn>
        </div>
      </div>
    </div>

    <!-- 创建厂牌抽屉 -->
    <AcmetoneDrawer
      v-model:visible="showCreateForm"
      title="申请创建厂牌"
      size="large"
    >
      <div class="create-form-container">
        <form @submit.prevent="submitApplication">
          <div class="form-group">
            <AcmetoneInput
              v-model="formData.chinese_name"
              label="厂牌中文名"
              placeholder="请输入厂牌中文名"
              required
              :error="errors.chinese_name"
            />
          </div>

          <div class="form-group">
            <AcmetoneInput
              v-model="formData.english_name"
              label="厂牌英文名"
              placeholder="请输入厂牌英文名"
              required
              :error="errors.english_name"
            />
          </div>

          <div class="form-group">
            <AcmetoneInput
              v-model="formData.description"
              type="textarea"
              label="厂牌描述"
              placeholder="请简要描述您的厂牌..."
              :rows="4"
            />
          </div>

          <div class="form-group">
            <AcmetoneInput
              v-model="formData.website"
              label="官方网站"
              placeholder="https://example.com"
            />
          </div>

          <div class="form-group">
            <AcmetoneInput
              v-model="formData.contact_email"
              type="email"
              label="联系邮箱"
              placeholder="contact@example.com"
            />
          </div>

          <div class="form-group">
            <AcmetoneInput
              v-model="formData.contact_qqgroup"
              label="联系QQ群"
              placeholder="请输入QQ群号"
            />
          </div>

          <div class="form-actions">
            <AcmetoneBtn type="secondary" @click="closeCreateForm">取消</AcmetoneBtn>
            <AcmetoneBtn 
              type="primary" 
              @click="submitApplication"
              :loading="submitting"
            >
              提交申请
            </AcmetoneBtn>
          </div>
        </form>
      </div>
    </AcmetoneDrawer>
  </div>
</template>

<script setup>
import AcmetoneBtn from '@/components/acmetone/AcmetoneBtn.vue';
import AcmetoneDrawer from '@/components/acmetone/AcmetoneDrawer.vue';
import AcmetoneInput from '@/components/acmetone/AcmetoneInput.vue';
import labelService from '@/services/labelService';
import { ElMessage } from 'element-plus';
import { onMounted, ref } from 'vue';

// 响应式数据
const loading = ref(true);
const userLabel = ref(null);
const showCreateForm = ref(false);
const submitting = ref(false);

// 表单数据
const formData = ref({
  chinese_name: '',
  english_name: '',
  description: '',
  website: '',
  contact_email: '',
  contact_qqgroup: ''
});

// 表单错误
const errors = ref({});

// 获取用户厂牌信息
const fetchUserLabel = async () => {
  try {
    loading.value = true;
    const response = await labelService.getUserLabel();
    userLabel.value = response.data;
  } catch (error) {
    if (error.response?.status !== 404) {
      console.error('获取厂牌信息失败:', error);
      ElMessage.error('获取厂牌信息失败');
    }
  } finally {
    loading.value = false;
  }
};

// 提交申请
const submitApplication = async () => {
  try {
    // 清除之前的错误
    errors.value = {};
    
    // 基本验证
    if (!formData.value.chinese_name.trim()) {
      errors.value.chinese_name = '请输入厂牌中文名';
      return;
    }
    if (!formData.value.english_name.trim()) {
      errors.value.english_name = '请输入厂牌英文名';
      return;
    }

    submitting.value = true;
    await labelService.createLabel(formData.value);
    
    ElMessage.success('厂牌申请已提交，请等待管理员审核');
    closeCreateForm();
    fetchUserLabel(); // 重新获取数据
  } catch (error) {
    console.error('提交申请失败:', error);
    if (error.response?.data?.errors) {
      errors.value = error.response.data.errors;
    } else {
      ElMessage.error(error.response?.data?.message || '提交申请失败');
    }
  } finally {
    submitting.value = false;
  }
};

// 关闭创建表单
const closeCreateForm = () => {
  showCreateForm.value = false;
  formData.value = {
    chinese_name: '',
    english_name: '',
    description: '',
    website: '',
    contact_email: '',
    contact_qqgroup: ''
  };
  errors.value = {};
};

// 编辑厂牌
const editLabel = () => {
  // TODO: 实现编辑功能
  ElMessage.info('编辑功能即将上线');
};

// 获取状态样式类
const getStatusClass = (status) => {
  const statusMap = {
    pending: 'status-pending',
    active: 'status-active',
    inactive: 'status-inactive'
  };
  return statusMap[status] || 'status-pending';
};

// 获取状态文本
const getStatusText = (status) => {
  const statusMap = {
    pending: '待审核',
    active: '已激活',
    inactive: '已停用'
  };
  return statusMap[status] || '未知状态';
};

// 格式化日期
const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// 组件挂载时获取数据
onMounted(() => {
  fetchUserLabel();
});
</script>

<style scoped>
.labels-container {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.header-section {
  margin-bottom: 32px;
}

.main-title {
  font-size: 32px;
  font-weight: 700;
  color: var(--garrix-black, #000000);
  margin: 0;
  font-family: 'Montserrat', sans-serif;
}

.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
}

.garrix-loading-spinner {
  display: flex;
  gap: 4px;
}

.spinner-line {
  width: 4px;
  height: 40px;
  background: var(--garrix-black, #000000);
  animation: spinner 1.2s infinite ease-in-out;
}

.spinner-line:nth-child(2) {
  animation-delay: -1.1s;
}

.spinner-line:nth-child(3) {
  animation-delay: -1.0s;
}

@keyframes spinner {
  0%, 40%, 100% {
    transform: scaleY(0.4);
  }
  20% {
    transform: scaleY(1.0);
  }
}

.no-label-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
}

.no-label-content {
  text-align: center;
  max-width: 400px;
}

.no-label-icon {
  font-size: 64px;
  margin-bottom: 24px;
}

.no-label-content h2 {
  font-size: 24px;
  font-weight: 600;
  color: var(--garrix-black, #000000);
  margin-bottom: 12px;
}

.no-label-content p {
  font-size: 16px;
  color: var(--garrix-gray, #666666);
  margin-bottom: 32px;
}

.create-label-btn {
  padding: 12px 32px;
}

.label-info-container {
  max-width: 800px;
}

.label-card {
  background: var(--garrix-white, #ffffff);
  border: 1px solid var(--garrix-border, #dddddd);
  border-radius: 8px;
  padding: 32px;
}

.label-header {
  display: flex;
  align-items: flex-start;
  gap: 24px;
  margin-bottom: 32px;
}

.label-logo {
  width: 80px;
  height: 80px;
  border-radius: 8px;
  overflow: hidden;
  flex-shrink: 0;
}

.label-logo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.default-logo {
  width: 100%;
  height: 100%;
  background: var(--garrix-black, #000000);
  color: var(--garrix-white, #ffffff);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  font-weight: 700;
}

.label-basic-info h2 {
  font-size: 24px;
  font-weight: 700;
  color: var(--garrix-black, #000000);
  margin: 0 0 8px 0;
}

.english-name {
  font-size: 16px;
  color: var(--garrix-gray, #666666);
  margin: 0 0 16px 0;
}

.status-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
}

.status-pending {
  background: #fff3cd;
  color: #856404;
  border: 1px solid #ffeaa7;
}

.status-active {
  background: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.status-inactive {
  background: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}

.label-details {
  margin-bottom: 32px;
}

.detail-row {
  display: flex;
  margin-bottom: 12px;
  align-items: flex-start;
}

.detail-row .label {
  font-weight: 600;
  color: var(--garrix-black, #000000);
  min-width: 120px;
  flex-shrink: 0;
}

.detail-row .value {
  color: var(--garrix-gray, #666666);
  flex: 1;
}

.detail-row .link {
  color: var(--garrix-blue, #0066cc);
  text-decoration: none;
}

.detail-row .link:hover {
  text-decoration: underline;
}

.label-actions {
  display: flex;
  gap: 16px;
}

.create-form-container {
  padding: 24px;
}

.form-group {
  margin-bottom: 24px;
}

.form-actions {
  display: flex;
  gap: 16px;
  justify-content: flex-end;
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid var(--garrix-border, #dddddd);
}

@media (max-width: 768px) {
  .labels-container {
    padding: 16px;
  }
  
  .label-header {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }
  
  .detail-row {
    flex-direction: column;
    gap: 4px;
  }
  
  .detail-row .label {
    min-width: auto;
  }
  
  .form-actions {
    flex-direction: column;
  }
}
</style>
