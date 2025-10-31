<!-- 
    这个组件是Acmetone的单选按钮组组件，用于在Acmetone的页面中使用。
    它继承了Acmetone的样式，并添加了更多的样式和功能。
    它是一个通用的单选按钮组件，可以用于任何需要单选的地方。
    它支持以下功能：
    1. 支持v-model双向绑定
    2. 支持自定义选项
    3. 支持禁用状态
    4. 支持自定义样式
-->
<template>
  <div class="acmetone-radio-group" :class="{ 'vertical': vertical }">
    <label 
      v-for="option in options" 
      :key="option.value" 
      class="radio"
      :class="{ 'disabled': disabled || option.disabled }"
    >
      <input 
        type="radio" 
        :name="name" 
        :value="option.value"
        :checked="modelValue === option.value"
        :disabled="disabled || option.disabled"
        @change="updateValue(option.value)"
      >
      <span class="name">
        <slot name="option" :option="option">
          <div class="option-content">
            <img v-if="option.icon" :src="option.icon" :alt="option.label" class="option-icon" />
            <span>{{ option.label }}</span>
          </div>
        </slot>
      </span>
    </label>
  </div>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue';

const props = defineProps({
  modelValue: {
    type: [String, Number, Boolean],
    required: true
  },
  options: {
    type: Array,
    required: true,
    // 每个选项应该有 value, label, 可选的 icon, disabled
  },
  name: {
    type: String,
    default: () => `radio-group-${Date.now()}`
  },
  disabled: {
    type: Boolean,
    default: false
  },
  vertical: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['update:modelValue', 'change']);

const updateValue = (value) => {
  emit('update:modelValue', value);
  emit('change', value);
};
</script>

<style scoped>

.acmetone-radio-group {
  position: relative;
  display: flex;
  flex-wrap: wrap;
  border-radius: 0.5rem;
  background-color: #EEE;
  box-sizing: border-box;
  box-shadow: 0 0 0px 1px rgba(0, 0, 0, 0.06);
  padding: 0.25rem;
  width: 100%;
  font-size: 14px;
}

.acmetone-radio-group.vertical {
  flex-direction: column;
}

.acmetone-radio-group .radio {
  flex: 1 1 auto;
  text-align: center;
}

.acmetone-radio-group .radio input {
  display: none;
}

.acmetone-radio-group .radio .name {
  display: flex;
  cursor: pointer;
  align-items: center;
  justify-content: center;
  border-radius: 0.5rem;
  border: none;
  padding: .5rem 0;
  color: rgba(51, 65, 85, 1);
  transition: all .15s ease-in-out;
}

.acmetone-radio-group .radio input:checked + .name {
  background-color: #fff;
  font-weight: 600;
}

.acmetone-radio-group .radio.disabled .name {
  opacity: 0.6;
  cursor: not-allowed;
}

.option-content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 0 10px;
}

.option-icon {
  width: 24px;
  height: 24px;
  object-fit: contain;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .acmetone-radio-group {
    flex-direction: column;
  }
  
  .option-content {
    width: 100%;
    justify-content: center;
  }
}
</style> 