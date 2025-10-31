<template>
  <div class="verification-container">
    <el-card>
      <template #header>
        <h2>用户实名认证</h2>
      </template>

      <!-- 认证状态显示 -->
      <div v-if="verification" class="verification-status">
        <el-alert
          :title="getStatusTitle(verification.status)"
          :type="getStatusType(verification.status)"
          :description="getStatusDescription(verification)"
          :closable="false"
          show-icon
          class="status-alert"
        />
        
        <!-- 被拒绝时显示重新提交按钮 -->
        <div v-if="verification.status === 'rejected'" class="resubmit-section">
          <el-button type="primary" @click="showForm = true">重新提交认证</el-button>
        </div>
      </div>

      <!-- 认证表单 -->
      <div v-if="!verification || (verification.status === 'rejected' && showForm)">
        <p class="verification-intro">
          为确保音乐版权和收益分配的合法性，发行音乐前需要完成实名认证。请填写以下信息：
        </p>
        
        <!-- 表单验证错误提示 -->
        <el-alert
          v-if="formError"
          title="表单填写有误"
          type="error"
          :description="formError"
          show-icon
          :closable="true"
          @close="formError = ''"
          class="form-error-alert"
        />
        
        <el-form
          ref="formRef"
          :model="form"
          :rules="rules"
          label-width="120px"
          @submit.prevent="handleSubmit"
          status-icon
          :label-position="labelPosition"
        >
          <el-form-item label="真实姓名" prop="realName">
            <el-input v-model="form.realName" placeholder="请输入您的真实姓名" />
            <div class="form-tip">请输入您的真实姓名，需与身份证姓名一致</div>
          </el-form-item>

          <el-form-item label="身份证号" prop="idNumber">
            <el-input 
              v-model="form.idNumber" 
              placeholder="请输入18位身份证号码"
              maxlength="18"
              show-password
            />
            <div class="form-tip">请输入18位身份证号码，最后一位可能是X</div>
          </el-form-item>

          <el-form-item label="银行账号" prop="bankAccount">
            <el-input 
              v-model="form.bankAccount" 
              placeholder="请输入收款银行账号"
              show-password
            />
            <div class="form-tip">请输入您的银行卡号，用于收取音乐版权收益</div>
          </el-form-item>

          <el-form-item label="开户银行" prop="bankName">
            <el-input v-model="form.bankName" placeholder="请输入开户银行名称" />
            <div class="form-tip">例如：中国建设银行上海分行</div>
          </el-form-item>

          <el-form-item>
            <el-button type="primary" native-type="submit" :loading="loading">
              提交认证
            </el-button>
            <el-button @click="resetForm" :disabled="loading">
              重置表单
            </el-button>
            <el-button @click="$router.push('/user-center')" :disabled="loading">
              返回
            </el-button>
          </el-form-item>
        </el-form>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useUserVerificationStore } from '../stores/userVerification';
import { ElMessage } from 'element-plus';

const router = useRouter();
const userVerificationStore = useUserVerificationStore();
const formRef = ref(null);
const loading = ref(false);
const verification = ref(null);
const showForm = ref(false);
const formError = ref('');

// 根据屏幕宽度动态调整表单标签位置
const screenWidth = ref(window.innerWidth);
const labelPosition = computed(() => screenWidth.value < 768 ? 'top' : 'left');

onMounted(() => {
  window.addEventListener('resize', () => {
    screenWidth.value = window.innerWidth;
  });
});

const form = reactive({
  realName: '',
  idNumber: '',
  bankAccount: '',
  bankName: ''
});

// 表单验证规则
const rules = {
  realName: [
    { required: true, message: '请输入真实姓名', trigger: 'blur' }
  ],
  idNumber: [
    { required: true, message: '请输入身份证号码', trigger: 'blur' },
    { 
      pattern: /(^\d{18}$)|(^\d{17}(\d|X|x)$)/, 
      message: '请输入正确的18位身份证号码（必须是数字，最后一位可以是X）', 
      trigger: 'blur' 
    }
  ],
  bankAccount: [
    { required: true, message: '请输入银行账号', trigger: 'blur' },
    { min: 10, message: '银行账号长度不能少于10位', trigger: 'blur' }
  ],
  bankName: [
    { required: true, message: '请输入开户银行名称', trigger: 'blur' },
    { min: 4, message: '请输入完整的银行名称（如：中国建设银行）', trigger: 'blur' }
  ]
};

// 获取认证状态文本
const getStatusTitle = (status) => {
  switch (status) {
    case 'pending': return '认证审核中';
    case 'approved': return '认证已通过';
    case 'rejected': return '认证被拒绝';
    default: return '未认证';
  }
};

// 获取认证状态类型
const getStatusType = (status) => {
  switch (status) {
    case 'pending': return 'warning';
    case 'approved': return 'success';
    case 'rejected': return 'error';
    default: return 'info';
  }
};

// 获取认证状态描述
const getStatusDescription = (verification) => {
  switch (verification.status) {
    case 'pending':
      return '您的实名认证申请正在审核中，请耐心等待。审核通过后，您将可以发行音乐作品。';
    case 'approved':
      return '您的实名认证已通过审核，可以正常发行音乐作品。';
    case 'rejected':
      return `您的实名认证申请被拒绝。原因：${verification.comment || '未提供拒绝理由'}。请修改信息后重新提交。`;
    default:
      return '请提交实名认证信息，审核通过后才能发行音乐作品。';
  }
};

// 提交表单
const handleSubmit = async () => {
  if (!formRef.value) return;
  
  try {
    // 清除之前的错误
    formError.value = '';
    
    // 表单验证前先检查基本格式
    if (form.idNumber && form.idNumber.length !== 18) {
      formError.value = '身份证号必须是18位';
      return;
    }
    
    // 表单验证
    const valid = await formRef.value.validate().catch(error => {
      console.error('表单验证失败:', error);
      
      // 尝试从错误中提取具体的验证错误信息
      if (error && typeof error === 'object') {
        const errorFields = [];
        Object.keys(error).forEach(field => {
          if (Array.isArray(error[field])) {
            error[field].forEach(err => {
              errorFields.push(err.message);
            });
          }
        });
        
        if (errorFields.length > 0) {
          formError.value = errorFields.join('；');
        }
      }
      
      return false;
    });
    
    if (!valid) {
      if (!formError.value) {
        formError.value = '请正确填写所有必填项';
      }
      return; // 如果验证失败，直接返回，不继续执行
    }
    
    loading.value = true;
    
    console.log('提交实名认证表单:', {
      ...form,
      idNumber: form.idNumber.substring(0, 3) + '***' + form.idNumber.substring(form.idNumber.length - 4),
      bankAccount: form.bankAccount.substring(0, 4) + '***' + form.bankAccount.substring(form.bankAccount.length - 4)
    });
    
    // 提交认证
    const result = await userVerificationStore.submitVerification({
      realName: form.realName,
      idNumber: form.idNumber,
      bankAccount: form.bankAccount,
      bankName: form.bankName
    });
    
    verification.value = result.verification;
    showForm.value = false;
    
    ElMessage.success(result.message || '实名认证申请已提交');
  } catch (error) {
    console.error('提交实名认证失败:', error);
    
    // 更友好的错误提示
    if (error.response?.data?.message) {
      formError.value = error.response.data.message;
    } else if (typeof error === 'string') {
      formError.value = error;
    } else {
      formError.value = '提交实名认证失败，请稍后再试';
    }
  } finally {
    loading.value = false;
  }
};

// 重置表单
const resetForm = () => {
  if (formRef.value) {
    formRef.value.resetFields();
    formError.value = '';
  }
};

// 初始化
onMounted(async () => {
  try {
    loading.value = true;
    const result = await userVerificationStore.getVerificationStatus();
    verification.value = result.verification;
  } catch (error) {
    if (error.response?.status !== 404) {
      ElMessage.error(error.toString());
    }
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
/* Martin Garrix Design Language - White Theme */
.verification-container {
  max-width: 800px;
  margin: 40px auto;
  padding: 24px;
  background-color: #f5f5f7; /* --garrix-off-white */
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
}

:deep(.el-card) {
  background-color: #ffffff; /* --garrix-white */
  border-radius: 0;
  border: 1px solid #000000; /* --garrix-black */
  box-shadow: 5px 5px 0px 0px rgba(0,0,0,1);
  padding: 20px;
}

h2 {
  font-size: 20px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  color: #000000; /* --garrix-black */
}

.verification-intro {
  margin-bottom: 30px;
  color: #333;
  line-height: 1.7;
  font-size: 14px;
}

/* Alert Styles */
:deep(.el-alert) {
  border-radius: 0;
  border-width: 2px;
  border-style: solid;
  padding: 16px;
}
:deep(.el-alert--success) {
  border-color: #28a745; background-color: #fff;
}
:deep(.el-alert--success .el-alert__title) { color: #28a745; }
:deep(.el-alert--success .el-alert__description) { color: #333; }
:deep(.el-alert--warning) {
  border-color: #ffc107; background-color: #fff;
}
:deep(.el-alert--warning .el-alert__title) { color: #ffc107; }
:deep(.el-alert--warning .el-alert__description) { color: #333; }
:deep(.el-alert--error) {
  border-color: #dc3545; background-color: #fff;
}
:deep(.el-alert--error .el-alert__title) { color: #dc3545; }
:deep(.el-alert--error .el-alert__description) { color: #333; }

:deep(.el-alert__title) {
  font-size: 16px;
  font-weight: 700;
  text-transform: uppercase;
}
:deep(.el-alert__description) {
  font-size: 14px;
}

.resubmit-section {
  margin-top: 24px;
  text-align: center;
}

/* Form Styles */
:deep(.el-form-item__label) {
  color: #666;
  text-transform: uppercase;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.2;
}

:deep(.el-input__wrapper), :deep(.el-textarea__inner) {
  background-color: #ffffff;
  border: 2px solid #000;
  border-radius: 0;
  box-shadow: none !important;
  padding: 8px 12px;
  height: 44px;
  transition: all 0.2s ease;
}
:deep(.el-input__wrapper:hover), :deep(.el-textarea__inner:hover) {
  background-color: #f5f5f7;
}

.form-tip {
  font-size: 12px;
  color: #999;
  margin-top: 6px;
  line-height: 1.4;
}

/* Button Styles */
:deep(.el-button) {
  border-radius: 0;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  transition: all 0.3s ease;
  border-width: 2px;
  box-shadow: none;
  padding: 12px 24px;
  height: auto;
}
:deep(.el-button--primary) {
  background-color: #000000;
  border-color: #000000;
  color: #ffffff;
}
:deep(.el-button--primary:hover) {
  background-color: #ffffff;
  color: #000000;
}
/* Default/Secondary button */
:deep(.el-button.el-button--default) {
  background-color: transparent;
  border-color: #000;
  color: #000;
}
:deep(.el-button.el-button--default:hover) {
  background-color: #000;
  color: #fff;
}

.form-error-alert {
  margin-bottom: 20px;
}

/* 响应式布局 */
@media (max-width: 768px) {
  .verification-container {
    margin: 20px;
    padding: 15px;
  }

  :deep(.el-card) {
    padding: 15px;
  }
}

@media (max-width: 576px) {
  .verification-container {
    margin: 10px;
    padding: 0;
    background-color: #fff; /* 在移动端让背景和卡片融为一体 */
  }

  :deep(.el-card) {
    border: none;
    box-shadow: none;
    padding: 10px;
  }

  h2 {
    font-size: 18px;
  }

  /* 堆叠按钮 */
  :deep(.el-form-item__content .el-button) {
    width: 100%;
    margin: 0 0 10px 0 !important;
  }

  :deep(.el-form-item__content .el-button:last-child) {
    margin-bottom: 0 !important;
  }
}
</style> 