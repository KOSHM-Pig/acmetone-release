<template>
  <div class="jiyinji-status">
    <div class="grid-container">
      <div class="left-panel">
        <h1 class="step-title">厂牌是否在极音记入驻过？</h1>
        <p class="step-subtitle">请选择您的厂牌在极音记的入驻状态</p>
      </div>

      <div class="right-panel">
        <div class="status-options">
          <div
            :class="['status-option', { 'selected': selectedStatus === true }]"
            @click="selectStatus(true)"
          >
            <h3>已入驻</h3>
            <p>我的厂牌已经在极音记平台入驻，需要申请认证身份</p>
          </div>

          <div
            :class="['status-option', { 'selected': selectedStatus === false }]"
            @click="selectStatus(false)"
          >
            <h3>未入驻</h3>
            <p>我的厂牌还没有在极音记入驻，需要创建新的厂牌信息</p>
          </div>
        </div>

        <div class="step-actions">
          <button
            @click="handleNext"
            :disabled="selectedStatus === null"
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

const selectedStatus = ref(props.modelValue.labelInfo.isInJiYinJi)

// 选择状态
const selectStatus = (status) => {
  selectedStatus.value = status
  
  // 更新状态
  const updatedState = { ...props.modelValue }
  updatedState.labelInfo.isInJiYinJi = status
  
  // 重置相关状态
  if (status) {
    // 已入驻 - 清空新建厂牌的信息
    updatedState.labelInfo.chineseName = ''
    updatedState.labelInfo.englishName = ''
    updatedState.labelInfo.selectedLabelId = null
  } else {
    // 未入驻 - 清空搜索相关信息
    updatedState.labelInfo.selectedLabelId = null
  }
  
  emit('update:modelValue', updatedState)
}

// 处理下一步
const handleNext = () => {
  if (selectedStatus.value !== null) {
    emit('next')
  }
}
</script>

<style scoped>
.jiyinji-status {
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

.status-options {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 28px;
}

.status-option {
  padding: 24px;
  border: 1px solid #e0e0e0;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
  background: #fff;
}

.status-option:hover {
  border-color: #1a1a1a;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.status-option.selected {
  border-color: #1a1a1a;
  background: #f8f9fa;
}

.status-option h3 {
  font-size: 18px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0 0 8px 0;
}

.status-option p {
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

  .status-option {
    padding: 20px;
  }

  .status-option h3 {
    font-size: 16px;
  }

  .status-option p {
    font-size: 13px;
  }
}
</style>
