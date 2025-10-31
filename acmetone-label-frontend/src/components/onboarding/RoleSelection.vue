<template>
  <div class="role-selection">
    <div class="grid-container">
      <div class="left-panel">
        <h1 class="step-title">请选择您在厂牌中的身份</h1>
        <p class="step-subtitle">不同身份拥有不同的权限和职责</p>
      </div>

      <div class="right-panel">
        <div class="role-options">
          <div
            v-for="role in roles"
            :key="role.value"
            :class="['role-option', { 'selected': selectedRole === role.value }]"
            @click="selectRole(role.value)"
          >
            <div class="role-content">
              <div class="role-title">{{ role.label }}</div>
              <div class="role-description">{{ role.description }}</div>
              <div v-if="role.value === 'owner'" class="role-note">
                * 主理人身份需要额外的节奏阵列认证
              </div>
            </div>
          </div>
        </div>

        <div class="step-actions">
          <button
            @click="handleNext"
            :disabled="!selectedRole"
            class="acmetone-btn large"
            type="button"
          >
            {{ selectedRole === 'owner' ? '继续认证' : '完成设置' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  modelValue: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['update:modelValue', 'next'])

const selectedRole = ref(props.modelValue.labelInfo.role)

// 身份选项
const roles = [
  { 
    value: 'owner', 
    label: '主理人', 
    icon: '👑',
    description: '拥有厂牌最高权限，负责整体运营和决策' 
  },
  { 
    value: 'reviewer', 
    label: '审核', 
    icon: '🔍',
    description: '负责作品审核工作，确保内容质量' 
  },
  { 
    value: 'designer', 
    label: '美工', 
    icon: '🎨',
    description: '负责视觉设计工作，包括封面、宣传等' 
  },
  { 
    value: 'copywriter', 
    label: '文案', 
    icon: '✍️',
    description: '负责文案策划工作，包括宣传文案等' 
  }
]

// 选择身份
const selectRole = (role) => {
  selectedRole.value = role
  
  // 更新状态
  const updatedState = { ...props.modelValue }
  updatedState.labelInfo.role = role
  
  emit('update:modelValue', updatedState)
}

// 处理下一步
const handleNext = () => {
  if (selectedRole.value) {
    emit('next')
  }
}
</script>

<style scoped>
.role-selection {
  width: 100%;
}

.grid-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10%;
  align-items: center;
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
}

.left-panel {
  max-width: 450px;
}

.step-title {
  font-size: 64px;
  font-weight: 900;
  line-height: 1.1;
  margin-bottom: 24px;
  color: #1a1a1a;
}

.step-subtitle {
  font-size: 16px;
  color: #555;
  line-height: 1.6;
  margin: 0;
}

.right-panel {
  max-width: 400px;
}

.role-options {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 28px;
}

.role-option {
  padding: 24px;
  border: 1px solid #e0e0e0;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
  background: #fff;
}

.role-option:hover {
  border-color: #1a1a1a;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.role-option.selected {
  border-color: #1a1a1a;
  background: #f8f9fa;
}

.role-content {
  width: 100%;
}

.role-title {
  font-size: 18px;
  font-weight: 700;
  color: #1a1a1a;
  margin-bottom: 8px;
}

.role-description {
  font-size: 14px;
  color: #666;
  margin-bottom: 8px;
  line-height: 1.5;
}

.role-note {
  font-size: 12px;
  color: #1a1a1a;
  font-style: italic;
}

.step-actions {
  margin-top: 10px;
}

.acmetone-btn {
  width: 100%;
  padding: 24px;
  font-size: 16px;
  font-weight: 700;
  background: #1a1a1a;
  color: #fff;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.acmetone-btn:hover:not(:disabled) {
  background: #333;
}

.acmetone-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: #ccc;
}

/* 响应式设计 */
@media (max-width: 992px) {
  .grid-container {
    grid-template-columns: 1fr;
    gap: 60px;
    text-align: center;
  }

  .left-panel, .right-panel {
    margin: 0 auto;
  }

  .step-title {
    font-size: 48px;
  }
}

@media (max-width: 768px) {
  .step-title {
    font-size: 36px;
  }

  .role-option {
    padding: 20px;
  }

  .role-title {
    font-size: 16px;
  }

  .role-description {
    font-size: 13px;
  }
}
</style>
