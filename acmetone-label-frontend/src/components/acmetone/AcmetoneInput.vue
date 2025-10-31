<!-- 
    这个组件是Acmetone的输入框组件，用于在Acmetone的页面中使用。
    它继承了Acmetone的样式，并添加了更多的样式和功能。
    它是一个通用的输入框组件，可以用于任何需要输入框的地方。
    它支持以下功能：
    1. 支持不同的类型：text, password, email, number, textarea
    2. 支持不同的尺寸：small, medium, large
    3. 支持禁用状态
    4. 支持错误状态
    5. 支持前缀和后缀图标
    6. 支持清除按钮
-->
<template>
  <div :class="['acmetone-input-wrapper', size, { 
    'disabled': disabled, 
    'error': error,
    'focused': isFocused 
  }]">
    <div v-if="label" class="input-label">
      <label :for="inputId">{{ label }}</label>
      <span v-if="required" class="required">*</span>
    </div>
    
    <div class="input-container">
      <span v-if="prefixIcon" :class="['input-icon', 'prefix', prefixIcon]"></span>
      
      <textarea
        v-if="type === 'textarea'"
        :id="inputId"
        v-model="inputValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :rows="rows"
        :maxlength="maxlength"
        :class="['input-field', 'textarea', { 'has-prefix': prefixIcon, 'has-suffix': suffixIcon || clearable }]"
        @focus="handleFocus"
        @blur="handleBlur"
        @input="handleInput"
        @scroll="handleScroll"
      />
      
      <input
        v-else
        :id="inputId"
        v-model="inputValue"
        :type="type"
        :placeholder="placeholder"
        :disabled="disabled"
        :maxlength="maxlength"
        :min="min"
        :max="max"
        :step="step"
        :class="['input-field', { 'has-prefix': prefixIcon, 'has-suffix': suffixIcon || clearable }]"
        @focus="handleFocus"
        @blur="handleBlur"
        @input="handleInput"
      />
      
      <button
        v-if="clearable && inputValue && !disabled"
        class="clear-button"
        @click="handleClear"
        type="button"
      >
        ✕
      </button>
      
      <span v-if="suffixIcon" :class="['input-icon', 'suffix', suffixIcon]"></span>
    </div>
    
    <div v-if="error || helperText" class="input-helper">
      <span v-if="error" class="error-text">{{ error }}</span>
      <span v-else-if="helperText" class="helper-text">{{ helperText }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';

const props = defineProps({
  modelValue: {
    type: [String, Number],
    default: ''
  },
  type: {
    type: String,
    default: 'text',
    validator: (value) => ['text', 'password', 'email', 'number', 'textarea'].includes(value)
  },
  size: {
    type: String,
    default: 'medium',
    validator: (value) => ['small', 'medium', 'large'].includes(value)
  },
  label: {
    type: String,
    default: ''
  },
  placeholder: {
    type: String,
    default: ''
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
  prefixIcon: {
    type: String,
    default: ''
  },
  suffixIcon: {
    type: String,
    default: ''
  },
  clearable: {
    type: Boolean,
    default: false
  },
  maxlength: {
    type: Number,
    default: null
  },
  rows: {
    type: Number,
    default: 4
  },
  min: {
    type: Number,
    default: null
  },
  max: {
    type: Number,
    default: null
  },
  step: {
    type: Number,
    default: null
  }
});

const emit = defineEmits(['update:modelValue', 'focus', 'blur', 'input', 'clear', 'scroll']);

const isFocused = ref(false);
const inputId = computed(() => `input-${Date.now()}`);

const inputValue = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
});

const handleFocus = (event) => {
  isFocused.value = true;
  emit('focus', event);
};

const handleBlur = (event) => {
  isFocused.value = false;
  emit('blur', event);
};

const handleInput = (event) => {
  emit('input', event);
};

const handleClear = () => {
  inputValue.value = '';
  emit('clear');
};

const handleScroll = (event) => {
  emit('scroll', event);
};
</script>

<style scoped>
.acmetone-input-wrapper {
  width: 100%;
  font-family: var(--garrix-font-primary, 'Montserrat', sans-serif);
}

.input-label {
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

.input-container {
  position: relative;
  display: flex;
  align-items: center;
}

.input-field {
  width: 100%;
  border: 1px solid var(--garrix-border-grey, #e0e0e0);
  border-radius: 8px;
  background: var(--garrix-white, #ffffff);
  color: var(--garrix-black, #1d1d1f);
  font-size: 14px;
  transition: all 0.2s ease;
  outline: none;
}

.input-field:focus {
  border-color: var(--garrix-black, #1d1d1f);
  box-shadow: 0 0 0 3px rgba(29, 29, 31, 0.1);
}

.input-field::placeholder {
  color: var(--garrix-grey, #86868b);
}

/* 尺寸 */
.acmetone-input-wrapper.small .input-field {
  padding: 8px 12px;
  font-size: 13px;
}

.acmetone-input-wrapper.medium .input-field {
  padding: 12px 16px;
  font-size: 14px;
}

.acmetone-input-wrapper.large .input-field {
  padding: 16px 20px;
  font-size: 16px;
}

/* 文本域 */
.input-field.textarea {
  resize: vertical;
  min-height: 80px;
}

/* 图标 */
.input-icon {
  position: absolute;
  font-size: 16px;
  color: var(--garrix-grey, #86868b);
  pointer-events: none;
}

.input-icon.prefix {
  left: 12px;
}

.input-icon.suffix {
  right: 12px;
}

.acmetone-input-wrapper.small .input-icon.prefix {
  left: 10px;
}

.acmetone-input-wrapper.small .input-icon.suffix {
  right: 10px;
}

.acmetone-input-wrapper.large .input-icon.prefix {
  left: 16px;
}

.acmetone-input-wrapper.large .input-icon.suffix {
  right: 16px;
}

/* 有前缀图标时的内边距 */
.input-container .input-field.has-prefix {
  padding-left: 40px;
}

.input-container .input-field.has-suffix {
  padding-right: 40px;
}

/* 清除按钮 */
.clear-button {
  position: absolute;
  right: 8px;
  background: none;
  border: none;
  color: var(--garrix-grey, #86868b);
  cursor: pointer;
  font-size: 12px;
  padding: 4px;
  border-radius: 50%;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
}

.clear-button:hover {
  background: var(--garrix-border-grey, #e0e0e0);
  color: var(--garrix-black, #1d1d1f);
}

/* 状态 */
.acmetone-input-wrapper.disabled .input-field {
  background: var(--garrix-light-grey, #f8f9fa);
  color: var(--garrix-grey, #86868b);
  cursor: not-allowed;
}

.acmetone-input-wrapper.error .input-field {
  border-color: #dc2626;
}

.acmetone-input-wrapper.error .input-field:focus {
  border-color: #dc2626;
  box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.1);
}

.acmetone-input-wrapper.focused .input-field {
  border-color: var(--garrix-black, #1d1d1f);
}

/* 帮助文本 */
.input-helper {
  margin-top: 6px;
  font-size: 12px;
}

.error-text {
  color: #dc2626;
}

.helper-text {
  color: var(--garrix-grey, #86868b);
}
</style>
