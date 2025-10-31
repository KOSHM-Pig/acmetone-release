<!-- 
    这个组件是Acmetone的标签组件，用于在Acmetone的页面中使用。
    它继承了Acmetone的样式，并添加了更多的样式和功能。
    它是一个通用的标签组件，可以用于任何需要标签的地方。
    它支持以下功能：
    1. 支持不同的类型：default, primary, success, warning, danger, info
    2. 支持不同的尺寸：small, medium, large
    3. 支持可关闭标签
    4. 支持自定义颜色
    5. 支持圆角设置
-->
<template>
  <span 
    :class="['acmetone-tag', type, size, { 'closable': closable }]"
    :style="customStyle"
  >
    <slot></slot>
    <button 
      v-if="closable" 
      class="tag-close"
      @click="handleClose"
      aria-label="关闭标签"
    >
      ✕
    </button>
  </span>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  type: {
    type: String,
    default: 'default',
    validator: (value) => ['default', 'primary', 'success', 'warning', 'danger', 'info'].includes(value)
  },
  size: {
    type: String,
    default: 'medium',
    validator: (value) => ['small', 'medium', 'large'].includes(value)
  },
  closable: {
    type: Boolean,
    default: false
  },
  color: {
    type: String,
    default: ''
  },
  backgroundColor: {
    type: String,
    default: ''
  },
  borderColor: {
    type: String,
    default: ''
  }
});

const emit = defineEmits(['close']);

const customStyle = computed(() => {
  const style = {};
  if (props.color) style.color = props.color;
  if (props.backgroundColor) style.backgroundColor = props.backgroundColor;
  if (props.borderColor) style.borderColor = props.borderColor;
  return style;
});

const handleClose = () => {
  emit('close');
};
</script>

<style scoped>
.acmetone-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 20px;
  font-weight: 500;
  font-size: 12px;
  line-height: 1;
  border: 1px solid transparent;
  transition: all 0.2s ease;
  white-space: nowrap;
}

/* 尺寸 */
.acmetone-tag.small {
  padding: 2px 8px;
  font-size: 11px;
}

.acmetone-tag.medium {
  padding: 4px 12px;
  font-size: 12px;
}

.acmetone-tag.large {
  padding: 6px 16px;
  font-size: 14px;
}

/* 类型 */
.acmetone-tag.default {
  background: var(--garrix-light-grey, #f8f9fa);
  color: var(--garrix-black, #1d1d1f);
  border-color: var(--garrix-border-grey, #e0e0e0);
}

.acmetone-tag.primary {
  background: var(--garrix-black, #1d1d1f);
  color: var(--garrix-white, #ffffff);
  border-color: var(--garrix-black, #1d1d1f);
}

.acmetone-tag.success {
  background: #f0f9ff;
  color: #0369a1;
  border-color: #bae6fd;
}

.acmetone-tag.warning {
  background: #fffbeb;
  color: #d97706;
  border-color: #fed7aa;
}

.acmetone-tag.danger {
  background: #fef2f2;
  color: #dc2626;
  border-color: #fecaca;
}

.acmetone-tag.info {
  background: #f0f9ff;
  color: #0284c7;
  border-color: #bae6fd;
}

/* 可关闭标签 */
.acmetone-tag.closable {
  padding-right: 8px;
}

.tag-close {
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
  font-size: 10px;
  padding: 2px;
  border-radius: 50%;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  opacity: 0.7;
}

.tag-close:hover {
  opacity: 1;
  background: rgba(0, 0, 0, 0.1);
}

.acmetone-tag.primary .tag-close:hover {
  background: rgba(255, 255, 255, 0.2);
}

/* 悬停效果 */
.acmetone-tag.default:hover {
  background: var(--garrix-border-grey, #e0e0e0);
}

.acmetone-tag.primary:hover {
  background: var(--garrix-grey, #86868b);
}

.acmetone-tag.success:hover {
  background: #e0f2fe;
}

.acmetone-tag.warning:hover {
  background: #fef3c7;
}

.acmetone-tag.danger:hover {
  background: #fee2e2;
}

.acmetone-tag.info:hover {
  background: #e0f2fe;
}
</style>
