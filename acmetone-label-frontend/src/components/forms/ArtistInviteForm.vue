<template>
  <div class="artist-invite-form">
    <AcmetoneCard>
      <form @submit.prevent="handleSubmit">
        <div class="form-group">
          <label class="form-label required">邀请方式</label>
          <div class="radio-group">
            <label class="radio-item" :class="{ active: inviteForm.inviteType === 'email' }">
              <input 
                type="radio" 
                v-model="inviteForm.inviteType" 
                value="email"
                class="radio-input"
              />
              <span class="radio-icon">@</span>
              <span class="radio-text">邮箱邀请</span>
            </label>
            <label class="radio-item" :class="{ active: inviteForm.inviteType === 'phone' }">
              <input 
                type="radio" 
                v-model="inviteForm.inviteType" 
                value="phone"
                class="radio-input"
              />
              <span class="radio-icon">📱</span>
              <span class="radio-text">手机邀请</span>
            </label>
            <label class="radio-item" :class="{ active: inviteForm.inviteType === 'link' }">
              <input 
                type="radio" 
                v-model="inviteForm.inviteType" 
                value="link"
                class="radio-input"
              />
              <span class="radio-icon">🔗</span>
              <span class="radio-text">邀请链接</span>
            </label>
          </div>
          <span v-if="errors.inviteType" class="error-text">{{ errors.inviteType }}</span>
        </div>

        <div 
          v-if="inviteForm.inviteType === 'email'"
          class="form-group"
        >
          <AcmetoneInput
            v-model="inviteForm.email"
            type="email"
            label="邮箱地址"
            placeholder="请输入艺人邮箱地址"
            required
            :error="errors.email"
          />
        </div>

        <div 
          v-if="inviteForm.inviteType === 'phone'"
          class="form-group"
        >
          <AcmetoneInput
            v-model="inviteForm.phone"
            type="text"
            label="手机号码"
            placeholder="请输入艺人手机号码"
            required
            :error="errors.phone"
          />
        </div>

        <div class="form-group">
          <AcmetoneInput
            v-model="inviteForm.artistName"
            type="text"
            label="艺人姓名"
            placeholder="请输入艺人姓名（可选）"
          />
        </div>

        <div class="form-group">
          <AcmetoneInput
            v-model="inviteForm.message"
            type="textarea"
            label="邀请消息"
            placeholder="请输入邀请消息..."
            :maxlength="300"
            :rows="4"
          />
        </div>

        <div 
          v-if="inviteForm.inviteType === 'link'"
          class="form-group"
        >
          <label class="form-label">邀请链接</label>
          <div class="invite-link-section">
            <div class="link-input-group">
              <AcmetoneInput
                :model-value="generatedLink"
                readonly
                placeholder="点击生成邀请链接"
              />
              <AcmetoneBtn 
                @click="generateLink" 
                :loading="generating"
                type="primary"
              >
                生成链接
              </AcmetoneBtn>
            </div>
            <AcmetoneBtn 
              v-if="generatedLink"
              @click="copyLink"
              size="small"
              class="copy-btn"
            >
              复制链接
            </AcmetoneBtn>
          </div>
        </div>
      </form>
    </AcmetoneCard>

    <div class="form-actions">
      <AcmetoneBtn @click="handleCancel">取消</AcmetoneBtn>
      <AcmetoneBtn 
        type="primary" 
        @click="handleSubmit"
        :loading="submitting"
      >
        发送邀请
      </AcmetoneBtn>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import AcmetoneCard from '@/components/acmetone/AcmetoneCard.vue'
import AcmetoneBtn from '@/components/acmetone/AcmetoneBtn.vue'
import AcmetoneInput from '@/components/acmetone/AcmetoneInput.vue'

// Emits
const emit = defineEmits(['success', 'cancel'])

// 状态
const submitting = ref(false)
const generating = ref(false)
const generatedLink = ref('')
const errors = ref({})

// 邀请表单数据
const inviteForm = reactive({
  inviteType: 'email',
  email: '',
  phone: '',
  artistName: '',
  message: '欢迎加入我们的厂牌！我们期待与您合作，共同创造优秀的音乐作品。'
})

// 方法
const validateForm = () => {
  errors.value = {}
  
  if (!inviteForm.inviteType) {
    errors.value.inviteType = '请选择邀请方式'
  }
  
  if (inviteForm.inviteType === 'email') {
    if (!inviteForm.email) {
      errors.value.email = '请输入邮箱地址'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteForm.email)) {
      errors.value.email = '请输入正确的邮箱格式'
    }
  }
  
  if (inviteForm.inviteType === 'phone') {
    if (!inviteForm.phone) {
      errors.value.phone = '请输入手机号码'
    } else if (!/^1[3-9]\d{9}$/.test(inviteForm.phone)) {
      errors.value.phone = '请输入正确的手机号码'
    }
  }
  
  return Object.keys(errors.value).length === 0
}

const generateLink = async () => {
  try {
    generating.value = true
    
    // 模拟生成邀请链接
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    const linkId = Math.random().toString(36).substring(2, 15)
    generatedLink.value = `${window.location.origin}/invite/${linkId}`
    
    showMessage('邀请链接已生成', 'success')
  } catch (error) {
    showMessage('生成链接失败', 'error')
  } finally {
    generating.value = false
  }
}

const copyLink = async () => {
  try {
    await navigator.clipboard.writeText(generatedLink.value)
    showMessage('链接已复制到剪贴板', 'success')
  } catch (error) {
    showMessage('复制失败，请手动复制', 'error')
  }
}

const handleSubmit = async () => {
  try {
    if (!validateForm()) return

    if (inviteForm.inviteType === 'link' && !generatedLink.value) {
      showMessage('请先生成邀请链接', 'warning')
      return
    }

    submitting.value = true

    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1500))

    const inviteData = {
      ...inviteForm,
      inviteLink: generatedLink.value,
      inviteDate: new Date().toISOString()
    }

    console.log('发送邀请数据:', inviteData)
    
    showMessage('邀请已发送', 'success')
    emit('success', inviteData)
  } catch (error) {
    console.error('发送邀请失败:', error)
    showMessage('发送邀请失败，请重试', 'error')
  } finally {
    submitting.value = false
  }
}

const handleCancel = () => {
  emit('cancel')
}

const showMessage = (message, type) => {
  console.log(`${type.toUpperCase()}: ${message}`)
}
</script>

<style scoped>
.artist-invite-form {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* 表单组 */
.form-group {
  margin-bottom: 24px;
}

.form-label {
  display: block;
  font-size: 14px;
  font-weight: 700;
  color: var(--garrix-black, #1d1d1f);
  margin-bottom: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-family: var(--garrix-font-primary, 'Montserrat', sans-serif);
}

.form-label.required::after {
  content: ' *';
  color: #dc2626;
}

/* 单选按钮组 */
.radio-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.radio-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  border: 2px solid var(--garrix-border-grey, #e0e0e0);
  background: var(--garrix-white, #ffffff);
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.radio-item:hover {
  border-color: var(--garrix-black, #1d1d1f);
  box-shadow: 2px 2px 0 rgba(0, 0, 0, 0.1);
}

.radio-item.active {
  background: var(--garrix-black, #1d1d1f);
  color: var(--garrix-white, #ffffff);
  border-color: var(--garrix-black, #1d1d1f);
  box-shadow: 4px 4px 0 rgba(0, 0, 0, 0.1);
}

.radio-input {
  display: none;
}

.radio-icon {
  font-size: 18px;
  font-weight: bold;
}

.radio-text {
  flex: 1;
}

/* 邀请链接部分 */
.invite-link-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.link-input-group {
  display: flex;
  gap: 12px;
  align-items: flex-end;
}

.link-input-group > :first-child {
  flex: 1;
}

.copy-btn {
  align-self: flex-start;
}

/* 错误文本 */
.error-text {
  display: block;
  color: #dc2626;
  font-size: 12px;
  font-weight: 600;
  margin-top: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* 操作按钮 */
.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 16px;
  padding: 24px 0;
  border-top: 2px solid var(--garrix-black, #1d1d1f);
  margin-top: 32px;
}

/* 响应式 */
@media (max-width: 768px) {
  .link-input-group {
    flex-direction: column;
    align-items: stretch;
  }
  
  .form-actions {
    flex-direction: column;
  }
}
</style>
