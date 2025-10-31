<template>
  <div class="purpose-selection">
    <div class="grid-container">
      <div class="left-panel">
        <h1 class="step-title">请问是为了什么？</h1>
        <p class="step-subtitle">选择您使用 Acmetone LABEL 的主要目的</p>
      </div>

      <div class="right-panel">
        <div class="purpose-options">
          <div
            :class="['purpose-option', { 'selected': selectedPurpose === 'artist' }]"
            @click="selectPurpose('artist')"
          >
            <h3>投稿心仪厂牌</h3>
            <p>作为音乐人，向心仪的厂牌投稿您的作品</p>
          </div>

          <div
            :class="['purpose-option', { 'selected': selectedPurpose === 'label' }]"
            @click="selectPurpose('label')"
          >
            <h3>厂牌管理</h3>
            <p>管理厂牌事务，审核作品，处理投稿</p>
          </div>
        </div>

        <div class="step-actions">
          <button
            @click="handleNext"
            :disabled="!selectedPurpose"
            class="acmetone-btn large"
            type="button"
          >
            继续
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

const selectedPurpose = ref(props.modelValue.userType)

// 添加调试信息
console.log('PurposeSelection: initial selectedPurpose:', selectedPurpose.value)
console.log('PurposeSelection: initial modelValue.userType:', props.modelValue.userType)

// 选择目的
const selectPurpose = (purpose) => {
  selectedPurpose.value = purpose

  // 更新状态
  const updatedState = { ...props.modelValue }
  updatedState.userType = purpose

  console.log('PurposeSelection: selected purpose:', purpose)
  console.log('PurposeSelection: updated state:', updatedState)

  // 重置相关状态
  if (purpose === 'artist') {
    updatedState.labelInfo = {
      chineseName: '',
      englishName: '',
      role: '',
      isInJiYinJi: null,
      isInBeatArray: null,
      beatArrayCredentials: {},
      selectedLabelId: null
    }
  } else {
    updatedState.artistInfo = {
      stageName: '',
      musicLinks: []
    }
  }

  emit('update:modelValue', updatedState)
}

// 处理下一步
const handleNext = () => {
  console.log('PurposeSelection handleNext called, selectedPurpose:', selectedPurpose.value)

  if (!selectedPurpose.value) {
    console.log('PurposeSelection: no purpose selected, cannot proceed')
    return
  }

  console.log('PurposeSelection emitting next event')
  emit('next')
}
</script>

<style scoped>
.purpose-selection {
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

.purpose-options {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 28px;
}

.purpose-option {
  padding: 24px;
  border: 1px solid #e0e0e0;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
  background: #fff;
}

.purpose-option:hover {
  border-color: #1a1a1a;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.purpose-option.selected {
  border-color: #1a1a1a;
  background: #f8f9fa;
}

.purpose-option h3 {
  font-size: 18px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0 0 8px 0;
}

.purpose-option p {
  font-size: 14px;
  color: #666;
  margin: 0;
  line-height: 1.5;
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

  .purpose-option {
    padding: 20px;
  }

  .purpose-option h3 {
    font-size: 16px;
  }

  .purpose-option p {
    font-size: 13px;
  }
}
</style>
