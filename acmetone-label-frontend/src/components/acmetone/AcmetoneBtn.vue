<!--
    这个组件是Acmetone的按钮组件，用于在Acmetone的页面中使用。
    它继承了Acmetone的样式，并添加了更多的样式和功能。
    它是一个通用的按钮组件，可以用于任何需要按钮的地方。
    它支持以下功能：
    1. 支持不同的尺寸：small, medium, large
    2. 支持不同的类型：primary, secondary, danger, success, ghost
    3. 支持禁用状态
    4. 支持点击事件
    5. 支持加载状态
    6. 支持图标
-->
<template>
  <button
    :class="['acmetone-btn', size, type, { disabled, loading }]"
    :disabled="disabled || loading"
    @click="$emit('click', $event)"
  >
    <span v-if="loading" class="loading-spinner"></span>
    <span v-if="icon && !loading" :class="['icon', icon]"></span>
    <slot v-if="!loading"></slot>
  </button>
</template>

<script setup>
defineProps({
  size: {
    type: String,
    default: '',
    validator: (value) => ['small', 'medium', 'large', ''].includes(value)
  },
  type: {
    type: String,
    default: '',
    validator: (value) => ['primary', 'secondary', 'danger', 'success', 'ghost', ''].includes(value)
  },
  disabled: {
    type: Boolean,
    default: false
  },
  loading: {
    type: Boolean,
    default: false
  },
  icon: {
    type: String,
    default: ''
  }
});

defineEmits(['click']);
</script>

<style scoped>
.acmetone-btn {
  background: none;
  border: 1px solid var(--garrix-black, #1d1d1f);
  color: var(--garrix-black, #1d1d1f);
  font-weight: 600;
  padding: 8px 16px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.acmetone-btn:hover:not(:disabled) {
  background-color: var(--garrix-black, #1d1d1f);
  color: var(--garrix-white, #ffffff);
  box-shadow: 2px 2px 0 rgba(0, 0, 0, 0.1);
}

.acmetone-btn.small {
  padding: 6px 12px;
  font-size: 12px;
}

.acmetone-btn.medium {
  padding: 10px 18px;
  font-size: 14px;
}

.acmetone-btn.large {
  padding: 12px 24px;
  font-size: 16px;
}

.acmetone-btn.secondary {
  border-color: var(--garrix-border-grey, #d2d2d7);
  color: var(--garrix-grey, #86868b);
}

.acmetone-btn.secondary:hover:not(:disabled) {
  background-color: var(--garrix-grey, #86868b);
  color: var(--garrix-white, #ffffff);
}

.acmetone-btn.danger {
  border-color: #E53935;
  color: #C62828;
}

.acmetone-btn.danger:hover:not(:disabled) {
  background-color: #E53935;
  color: var(--garrix-white, #ffffff);
}

.acmetone-btn.success {
  border-color: #4CAF50;
  color: #2E7D32;
}

.acmetone-btn.success:hover:not(:disabled) {
  background-color: #4CAF50;
  color: var(--garrix-white, #ffffff);
}

.acmetone-btn.disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.acmetone-btn.disabled:hover {
  box-shadow: none;
  background: none;
  color: inherit;
}
</style>
