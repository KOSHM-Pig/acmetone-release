<template>
  <div class="label-info-input">
    <div class="grid-container">
      <div class="left-panel">
        <h1 class="step-title">厂牌名是什么？</h1>
        <p class="step-subtitle">请输入您的厂牌中文名和英文名</p>
      </div>

      <div class="right-panel">
        <div class="input-section">
          <div class="input-group">
            <div class="input-wrapper">
              <label for="chineseName" class="input-label">厂牌中文名 *</label>
              <input
                id="chineseName"
                v-model="chineseName"
                type="text"
                class="acmetone-input"
                placeholder="请输入厂牌中文名"
                maxlength="50"
                @input="handleInput"
              />
              <div class="input-hint">
                {{ chineseName.length }}/50 字符
              </div>
            </div>

            <div class="input-wrapper">
              <label for="englishName" class="input-label">厂牌英文名 *</label>
              <input
                id="englishName"
                v-model="englishName"
                type="text"
                class="acmetone-input"
                placeholder="请输入厂牌英文名"
                maxlength="100"
                @input="handleInput"
              />
              <div class="input-hint">
                {{ englishName.length }}/100 字符
              </div>
            </div>
          </div>

          <div class="info-note">
            <strong>提示：</strong>厂牌名称将用于在平台上展示，请确保信息准确无误。
          </div>
        </div>

        <div class="step-actions">
          <button
            @click="handleNext"
            :disabled="!canProceed"
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
import { computed, ref, watch } from 'vue'

const props = defineProps({
  modelValue: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['update:modelValue', 'next'])

const chineseName = ref(props.modelValue.labelInfo.chineseName)
const englishName = ref(props.modelValue.labelInfo.englishName)

// 监听输入变化
watch([chineseName, englishName], () => {
  const updatedState = { ...props.modelValue }
  updatedState.labelInfo.chineseName = chineseName.value
  updatedState.labelInfo.englishName = englishName.value
  emit('update:modelValue', updatedState)
})

// 是否可以继续
const canProceed = computed(() => {
  return chineseName.value.trim().length >= 2 && 
         englishName.value.trim().length >= 2
})

// 处理输入
const handleInput = () => {
  // 可以在这里添加实时验证逻辑
}

// 处理下一步
const handleNext = () => {
  if (canProceed.value) {
    emit('next')
  }
}
</script>

<style scoped>
.label-info-input {
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

.input-section {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 20px;
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
  color: #1a1a1a;
}

.acmetone-input {
  width: 100%;
  padding: 16px;
  border: 1px solid #e0e0e0;
  background: #fff;
  font-size: 16px;
  transition: border-color 0.2s ease;
  box-sizing: border-box;
}

.acmetone-input:focus {
  outline: none;
  border-color: #1a1a1a;
}

.acmetone-input::placeholder {
  color: #999;
}

.input-hint {
  font-size: 12px;
  color: #666;
}

.info-note {
  padding: 16px;
  background: #f8f9fa;
  border: 1px solid #e0e0e0;
  font-size: 14px;
  color: #666;
  line-height: 1.5;
  margin-bottom: 28px;
}

.info-note strong {
  color: #1a1a1a;
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

  .acmetone-input {
    padding: 14px;
  }
}
</style>
