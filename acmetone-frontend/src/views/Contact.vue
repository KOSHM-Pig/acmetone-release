<template>
  <div class="page-container">
    <div class="background-text">CONTACT</div>
    <div class="grid-container">
      <div class="left-panel">
        <h1 class="page-title">需要任何帮助？</h1>
        <p class="page-subtitle">我们收到来自世界各地的许多邮件。为了能更好地帮助您，请告诉我们一些关于您的信息。</p>
      </div>
      <div class="right-panel">
        <div class="contact-form">
          <el-form :model="form" label-position="top">
            <el-form-item label="I am a">
              <el-select v-model="form.userType" placeholder="Describe yourself" size="large" @change="onUserTypeChange">
                <el-option label="音乐人 / 艺人" value="artist"></el-option>
                <el-option label="厂牌 / 发行商" value="label"></el-option>
                <el-option label="媒体 / 商务合作" value="press"></el-option>
                <el-option label="普通用户" value="user"></el-option>
              </el-select>
            </el-form-item>

            <el-form-item label="Here to">
              <el-select v-model="form.inquiryType" placeholder="Select inquiry" size="large" :disabled="!form.userType">
                <el-option
                  v-for="item in inquiryOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value">
                </el-option>
              </el-select>
            </el-form-item>
            
            <el-form-item>
              <el-button type="primary" @click="showFullForm = true" size="large" class="submit-button" :disabled="!form.inquiryType">Get Started</el-button>
            </el-form-item>

            <el-dialog v-model="showFullForm" title="详细信息" custom-class="details-dialog">
                <el-form-item label="您的邮箱">
                  <el-input v-model="form.email" placeholder="我们将通过此邮箱与您联系" size="large"></el-input>
                </el-form-item>
                <el-form-item label="消息内容">
                  <el-input 
                    type="textarea" 
                    :rows="5" 
                    v-model="form.message" 
                    placeholder="请详细描述您的问题或需求" 
                    size="large">
                  </el-input>
                </el-form-item>
                <el-button type="primary" @click="submitForm" size="large" class="submit-button">发送</el-button>
            </el-dialog>

          </el-form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { ElMessage } from 'element-plus';

const form = ref({
  userType: '',
  inquiryType: '',
  email: '',
  message: ''
});

const showFullForm = ref(false);

const allInquiryOptions = {
  artist: [ { label: '发行咨询', value: 'distribution' }, { label: '版税问题', value: 'royalty' }, { label: '技术支持', value: 'tech_support' } ],
  label: [ { label: '批量发行合作', value: 'bulk_distribution' }, { label: '平台功能建议', value: 'feature_request' } ],
  press: [ { label: '采访请求', value: 'interview' }, { label: '合作提案', value: 'partnership' } ],
  user: [ { label: '账户问题', value: 'account_issue' }, { label: '一般性问题', value: 'general' } ]
};

const inquiryOptions = computed(() => {
  return allInquiryOptions[form.value.userType] || [];
});

const onUserTypeChange = () => {
  form.value.inquiryType = '';
}

const submitForm = () => {

  ElMessage.success('您的消息已发送，感谢您的联系！');
  showFullForm.value = false;
  form.value = { userType: '', inquiryType: '', email: '', message: '' };
};
</script>

<style scoped>
.page-container {
  padding: 60px 5%;
  background-color: #fff;
  color: #1a1a1a;
  min-height: 80vh;
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
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
.contact-form {
  max-width: 400px;
}
:deep(.el-form-item) {
  margin-bottom: 28px;
}
:deep(.el-form-item__label) {
  font-size: 14px;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 4px !important;
  text-transform: uppercase;
  line-height: 1.5;
}
:deep(.el-select .el-input__wrapper), :deep(.el-input .el-input__wrapper), :deep(.el-textarea .el-textarea__inner) {
  background-color: transparent !important;
  box-shadow: none !important;
  border: none;
  border-bottom: 2px solid #ccc;
  border-radius: 0;
  padding: 0;
}
:deep(.el-select .el-input__wrapper.is-focused), :deep(.el-input .el-input__wrapper:focus), :deep(.el-textarea .el-textarea__inner:focus) {
  border-bottom-color: #1a1a1a;
}
:deep(.el-select .el-input__wrapper.is-disabled) {
  border-bottom: 2px solid #e0e0e0;
  cursor: not-allowed;
}
:deep(.el-select .el-input.is-disabled .el-input__inner) {
  cursor: not-allowed;
  color: #a8a8a8;
}
.submit-button {
  width: 100%;
  background-color: #1a1a1a;
  border-color: #1a1a1a;
  border-radius: 4px;
  padding: 24px;
  font-size: 16px;
  font-weight: 700;
  margin-top: 10px;
}
:deep(.el-button.is-disabled) {
  background-color: #ccc !important;
  border-color: #ccc !important;
  cursor: not-allowed;
}
.submit-button:hover:not(.is-disabled) {
  background-color: #444;
  border-color: #444;
}

:deep(.details-dialog) {
    max-width: 500px;
    width: 90%;
}

@media (max-width: 992px) {
  .grid-container {
    grid-template-columns: 1fr;
    gap: 60px;
    text-align: center;
  }
  .left-panel, .contact-form {
    margin: 0 auto;
  }
  .background-text {
    font-size: 25vw;
    top: 30%;
  }
  .page-title {
    font-size: 48px;
  }
}
</style>