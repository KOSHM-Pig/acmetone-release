<template>
  <div class="step-indicator">
    <div class="step-info">
      <div class="step-counter">
        第 {{ currentStep }} 步，共 {{ totalSteps }} 步
      </div>
      <div class="step-percentage">
        {{ Math.round(progressPercentage) }}% 完成
      </div>
    </div>

    <div class="step-progress">
      <div
        class="progress-bar"
        :style="{ width: progressPercentage + '%' }"
      ></div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  currentStep: {
    type: Number,
    required: true
  },
  totalSteps: {
    type: Number,
    required: true
  },
  stepTitles: {
    type: Array,
    default: () => []
  }
})

// 计算进度百分比
const progressPercentage = computed(() => {
  return (props.currentStep / props.totalSteps) * 100
})

// 当前步骤标题
const currentStepTitle = computed(() => {
  return props.stepTitles[props.currentStep - 1] || ''
})
</script>

<style scoped>
.step-indicator {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.step-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.step-counter {
  font-size: 14px;
  color: #666;
  font-weight: 500;
}

.step-percentage {
  font-size: 14px;
  color: #1a1a1a;
  font-weight: 600;
}

.step-progress {
  width: 100%;
  height: 3px;
  background: rgba(0, 0, 0, 0.1);
  position: relative;
  overflow: hidden;
  border-radius: 2px;
}

.progress-bar {
  height: 100%;
  background: #1a1a1a;
  transition: width 0.4s ease;
  border-radius: 2px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .step-counter,
  .step-percentage {
    font-size: 12px;
  }

  .step-progress {
    height: 2px;
  }
}
</style>
