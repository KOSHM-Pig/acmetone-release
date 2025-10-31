<!-- 
    这个组件是Acmetone的下拉选择框组件，用于在Acmetone的页面中使用。
    它继承了Acmetone的样式，并添加了更多的样式和功能。
    它是一个通用的下拉选择框组件，可以用于任何需要选择的地方。
    它支持以下功能：
    1. 支持v-model双向绑定
    2. 支持自定义选项
    3. 支持禁用状态
    4. 支持占位符
    5. 支持清除功能
-->
<template>
  <div class="acmetone-select-wrapper" :class="{ 'disabled': disabled, 'focused': isFocused }">
    <div v-if="label" class="select-label">
      <label>{{ label }}</label>
      <span v-if="required" class="required">*</span>
    </div>
    
    <div class="select-container" @click="toggleDropdown">
      <div class="select-input" :class="{ 'has-value': hasValue }">
        <span v-if="hasValue" class="selected-text">{{ selectedLabel }}</span>
        <span v-else class="placeholder">{{ placeholder }}</span>
        <span class="select-arrow" :class="{ 'open': showDropdown }">▼</span>
      </div>
      
      <Transition name="dropdown">
        <div v-if="showDropdown" class="select-dropdown" @click.stop>
          <div class="dropdown-content">
            <div
              v-for="option in options"
              :key="option.value"
              class="dropdown-item"
              :class="{
                'selected': modelValue === option.value,
                'disabled': option.disabled
              }"
              @click="selectOption(option)"
            >
              <span class="option-text">{{ option.label }}</span>
              <span v-if="modelValue === option.value" class="check-icon">✓</span>
            </div>
          </div>
        </div>
      </Transition>
    </div>
    
    <div v-if="error || helperText" class="select-helper">
      <span v-if="error" class="error-text">{{ error }}</span>
      <span v-else-if="helperText" class="helper-text">{{ helperText }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue';

const props = defineProps({
  modelValue: {
    type: [String, Number, Boolean],
    default: ''
  },
  options: {
    type: Array,
    required: true,
    // 每个选项应该有 value, label, 可选的 disabled
  },
  label: {
    type: String,
    default: ''
  },
  placeholder: {
    type: String,
    default: '请选择'
  },
  disabled: {
    type: Boolean,
    default: false
  },
  required: {
    type: Boolean,
    default: false
  },
  error: {
    type: String,
    default: ''
  },
  helperText: {
    type: String,
    default: ''
  },
  clearable: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['update:modelValue', 'change']);

const showDropdown = ref(false);
const isFocused = ref(false);

const hasValue = computed(() => {
  return props.modelValue !== '' && props.modelValue !== null && props.modelValue !== undefined;
});

const selectedLabel = computed(() => {
  const selectedOption = props.options.find(option => option.value === props.modelValue);
  return selectedOption ? selectedOption.label : '';
});

const toggleDropdown = () => {
  if (props.disabled) return;
  showDropdown.value = !showDropdown.value;
  isFocused.value = showDropdown.value;
};

const selectOption = (option) => {
  if (option.disabled) return;
  
  emit('update:modelValue', option.value);
  emit('change', option.value);
  showDropdown.value = false;
  isFocused.value = false;
};

const closeDropdown = (event) => {
  if (!event.target.closest('.acmetone-select-wrapper')) {
    showDropdown.value = false;
    isFocused.value = false;
  }
};

onMounted(() => {
  document.addEventListener('click', closeDropdown);
});

onUnmounted(() => {
  document.removeEventListener('click', closeDropdown);
});
</script>

<style scoped>
.acmetone-select-wrapper {
  width: 100%;
  font-family: var(--garrix-font-primary, 'Montserrat', sans-serif);
  position: relative;
}

.select-label {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 500;
  color: var(--garrix-black, #1d1d1f);
}

.required {
  color: #dc2626;
  margin-left: 4px;
}

.select-container {
  position: relative;
  cursor: pointer;
}

.select-input {
  width: 100%;
  border: 2px solid var(--garrix-black, #1d1d1f);
  border-radius: 0;
  background: var(--garrix-white, #ffffff);
  color: var(--garrix-black, #1d1d1f);
  font-size: 14px;
  padding: 12px 40px 12px 16px;
  transition: all 0.2s ease;
  outline: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 4px 4px 0 rgba(0, 0, 0, 0.1);
}

.acmetone-select-wrapper.focused .select-input {
  box-shadow: 6px 6px 0 rgba(0, 0, 0, 0.1);
}

.selected-text {
  color: var(--garrix-black, #1d1d1f);
  font-weight: 500;
}

.placeholder {
  color: var(--garrix-grey, #86868b);
}

.select-arrow {
  position: absolute;
  right: 12px;
  font-size: 12px;
  color: var(--garrix-black, #1d1d1f);
  transition: transform 0.2s ease;
  pointer-events: none;
}

.select-arrow.open {
  transform: rotate(180deg);
}

.select-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  z-index: 1000;
  background: var(--garrix-white, #ffffff);
  border: 2px solid var(--garrix-black, #1d1d1f);
  border-top: none;
  box-shadow: 4px 4px 0 rgba(0, 0, 0, 0.1);
  max-height: 200px;
  overflow-y: auto;
}

.dropdown-content {
  padding: 0;
}

.dropdown-item {
  padding: 12px 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--garrix-border-grey, #e0e0e0);
}

.dropdown-item:last-child {
  border-bottom: none;
}

.dropdown-item:hover:not(.disabled) {
  background: var(--garrix-light-grey, #f8f9fa);
}

.dropdown-item.selected {
  background: var(--garrix-black, #1d1d1f);
  color: var(--garrix-white, #ffffff);
}

.dropdown-item.disabled {
  opacity: 0.6;
  cursor: not-allowed;
  color: var(--garrix-grey, #86868b);
}

.option-text {
  flex: 1;
}

.check-icon {
  font-size: 14px;
  font-weight: bold;
}

/* 状态 */
.acmetone-select-wrapper.disabled .select-input {
  background: var(--garrix-light-grey, #f8f9fa);
  color: var(--garrix-grey, #86868b);
  cursor: not-allowed;
  border-color: var(--garrix-border-grey, #e0e0e0);
}

.acmetone-select-wrapper.disabled .select-container {
  cursor: not-allowed;
}

/* 帮助文本 */
.select-helper {
  margin-top: 6px;
  font-size: 12px;
}

.error-text {
  color: #dc2626;
}

.helper-text {
  color: var(--garrix-grey, #86868b);
}

/* 滚动条样式 */
.select-dropdown::-webkit-scrollbar {
  width: 6px;
}

.select-dropdown::-webkit-scrollbar-track {
  background: var(--garrix-light-grey, #f8f9fa);
}

.select-dropdown::-webkit-scrollbar-thumb {
  background: var(--garrix-grey, #86868b);
  border-radius: 3px;
}

.select-dropdown::-webkit-scrollbar-thumb:hover {
  background: var(--garrix-black, #1d1d1f);
}

/* 下拉动画 */
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.2s cubic-bezier(0.25, 0.1, 0.25, 1);
  transform-origin: top;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: scaleY(0.8) translateY(-8px);
}

.dropdown-enter-to,
.dropdown-leave-from {
  opacity: 1;
  transform: scaleY(1) translateY(0);
}
</style>
