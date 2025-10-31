<template>
  <div class="beatarray-auth">
    <div class="step-header">
      <h2>节奏阵列认证</h2>
      <p>作为主理人，您需要提供节奏阵列的认证信息</p>
    </div>

    <div class="auth-section">
      <div class="status-question">
        <h3>厂牌是否在节奏阵列入驻？</h3>
        <div class="choice-buttons">
          <button 
            :class="['choice-btn', { 'active': isInBeatArray === true }]"
            @click="setInBeatArray(true)"
            type="button"
          >
            已入驻
          </button>
          <button 
            :class="['choice-btn', { 'active': isInBeatArray === false }]"
            @click="setInBeatArray(false)"
            type="button"
          >
            未入驻
          </button>
        </div>
      </div>

      <!-- 已入驻 - 需要填写账号密码 -->
      <div v-if="isInBeatArray === true" class="credentials-section">
        <div class="credentials-form">
          <div class="input-wrapper">
            <label for="beatArrayUsername" class="input-label">节奏阵列账号</label>
            <input
              id="beatArrayUsername"
              v-model="credentials.username"
              type="text"
              class="acmetone-input"
              placeholder="请输入节奏阵列账号"
              @input="handleCredentialsChange"
            />
          </div>

          <div class="input-wrapper">
            <label for="beatArrayPassword" class="input-label">节奏阵列密码</label>
            <input
              id="beatArrayPassword"
              v-model="credentials.password"
              type="password"
              class="acmetone-input"
              placeholder="请输入节奏阵列密码"
              @input="handleCredentialsChange"
            />
          </div>
        </div>

        <div class="security-note">
          <div class="note-icon">🔒</div>
          <div class="note-content">
            <strong>安全提示：</strong>您的账号密码将被加密存储，仅用于验证厂牌身份，不会被用于其他用途。
          </div>
        </div>
      </div>

      <!-- 未入驻 - 显示提示信息 -->
      <div v-else-if="isInBeatArray === false" class="not-registered-info">
        <div class="info-icon">ℹ️</div>
        <div class="info-content">
          <h4>未入驻节奏阵列</h4>
          <p>您可以继续完成 Acmetone LABEL 的设置。如需在节奏阵列入驻，请访问节奏阵列官网进行注册。</p>
        </div>
      </div>
    </div>

    <div class="step-actions">
      <button 
        @click="handleNext"
        :disabled="!canProceed"
        class="acmetone-btn large"
        type="button"
      >
        完成认证
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'

const props = defineProps({
  modelValue: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['update:modelValue', 'next'])

const isInBeatArray = ref(props.modelValue.labelInfo.isInBeatArray)
const credentials = reactive({
  username: props.modelValue.labelInfo.beatArrayCredentials?.username || '',
  password: props.modelValue.labelInfo.beatArrayCredentials?.password || ''
})

// 设置是否在节奏阵列入驻
const setInBeatArray = (status) => {
  isInBeatArray.value = status
  
  if (!status) {
    // 未入驻，清空凭据
    credentials.username = ''
    credentials.password = ''
  }
  
  updateModelValue()
}

// 处理凭据变化
const handleCredentialsChange = () => {
  updateModelValue()
}

// 更新模型值
const updateModelValue = () => {
  const updatedState = { ...props.modelValue }
  updatedState.labelInfo.isInBeatArray = isInBeatArray.value
  
  if (isInBeatArray.value) {
    updatedState.labelInfo.beatArrayCredentials = {
      username: credentials.username,
      password: credentials.password
    }
  } else {
    updatedState.labelInfo.beatArrayCredentials = {}
  }
  
  emit('update:modelValue', updatedState)
}

// 是否可以继续
const canProceed = computed(() => {
  if (isInBeatArray.value === null) {
    return false
  }
  
  if (isInBeatArray.value === true) {
    return credentials.username.trim().length > 0 && 
           credentials.password.trim().length > 0
  }
  
  return true // 未入驻可以直接继续
})

// 处理下一步
const handleNext = () => {
  if (canProceed.value) {
    emit('next')
  }
}
</script>

<style scoped>
.beatarray-auth {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 32px;
  text-align: center;
}

.step-header h2 {
  font-size: 24px;
  font-weight: 600;
  color: var(--garrix-black, #1d1d1f);
  margin: 0 0 8px 0;
  font-family: var(--garrix-font-primary);
}

.step-header p {
  font-size: 14px;
  color: var(--garrix-grey, #86868b);
  margin: 0;
  font-family: var(--garrix-font-primary);
}

.auth-section {
  display: flex;
  flex-direction: column;
  gap: 24px;
  text-align: left;
}

.status-question h3 {
  font-size: 18px;
  font-weight: 600;
  color: var(--garrix-black, #1d1d1f);
  margin: 0 0 16px 0;
  font-family: var(--garrix-font-primary);
  text-align: center;
}

.choice-buttons {
  display: flex;
  gap: 16px;
  justify-content: center;
}

.choice-btn {
  padding: 12px 24px;
  border: 1px solid var(--garrix-border-grey, #d2d2d7);
  background: var(--garrix-white, #ffffff);
  color: var(--garrix-grey, #86868b);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: var(--garrix-font-primary);
}

.choice-btn:hover {
  border-color: var(--garrix-black, #1d1d1f);
  color: var(--garrix-black, #1d1d1f);
}

.choice-btn.active {
  border-color: var(--garrix-black, #1d1d1f);
  background: var(--garrix-black, #1d1d1f);
  color: var(--garrix-white, #ffffff);
}

.credentials-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.credentials-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 400px;
  margin: 0 auto;
  width: 100%;
}

.input-wrapper {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.input-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--garrix-black, #1d1d1f);
  font-family: var(--garrix-font-primary);
}

.acmetone-input {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid var(--garrix-border-grey, #d2d2d7);
  background: var(--garrix-white, #ffffff);
  font-size: 16px;
  font-family: var(--garrix-font-primary);
  transition: border-color 0.2s ease;
}

.acmetone-input:focus {
  outline: none;
  border-color: var(--garrix-black, #1d1d1f);
}

.acmetone-input::placeholder {
  color: var(--garrix-grey, #86868b);
}

.security-note,
.not-registered-info {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  background: var(--garrix-light-grey, #f8f9fa);
  border: 1px solid var(--garrix-border-grey, #d2d2d7);
  max-width: 500px;
  margin: 0 auto;
  width: 100%;
}

.note-icon,
.info-icon {
  font-size: 20px;
  flex-shrink: 0;
  margin-top: 2px;
}

.note-content,
.info-content {
  font-size: 14px;
  color: var(--garrix-grey, #86868b);
  font-family: var(--garrix-font-primary);
  line-height: 1.4;
}

.note-content strong,
.info-content h4 {
  color: var(--garrix-black, #1d1d1f);
  margin: 0 0 4px 0;
  font-size: 14px;
  font-weight: 600;
}

.info-content p {
  margin: 0;
}

.step-actions {
  display: flex;
  justify-content: center;
}

.acmetone-btn {
  background: none;
  border: 1px solid var(--garrix-black, #1d1d1f);
  color: var(--garrix-black, #1d1d1f);
  font-weight: 600;
  padding: 12px 32px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: var(--garrix-font-primary);
}

.acmetone-btn.large {
  padding: 16px 40px;
  font-size: 16px;
}

.acmetone-btn:hover:not(:disabled) {
  background: var(--garrix-black, #1d1d1f);
  color: var(--garrix-white, #ffffff);
}

.acmetone-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .step-header h2 {
    font-size: 20px;
  }
  
  .choice-buttons {
    flex-direction: column;
    align-items: center;
  }
  
  .choice-btn {
    width: 200px;
  }
  
  .credentials-form {
    max-width: none;
  }
  
  .security-note,
  .not-registered-info {
    max-width: none;
  }
}
</style>
