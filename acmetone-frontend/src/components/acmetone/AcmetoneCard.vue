<!-- 
    这个组件是Acmetone的卡片组件，用于在Acmetone的页面中使用。
    它继承了Acmetone的样式，并添加了更多的样式和功能。
    它是一个通用的卡片组件，可以用于任何需要卡片的地方。
    它支持以下功能：
    1. 支持不同的尺寸：small, medium, large
    2. 支持阴影效果
    3. 支持悬停效果
    4. 支持圆角设置
    5. 支持边框设置
-->
<template>
  <div 
    :class="['acmetone-card', size, { 
      'has-shadow': shadow, 
      'has-hover': hover,
      'has-border': border 
    }]"
    :style="{ borderRadius: borderRadius }"
  >
    <div v-if="$slots.header" class="card-header">
      <slot name="header"></slot>
    </div>
    <div class="card-body">
      <slot></slot>
    </div>
    <div v-if="$slots.footer" class="card-footer">
      <slot name="footer"></slot>
    </div>
  </div>
</template>

<script setup>
defineProps({
  size: {
    type: String,
    default: 'medium',
    validator: (value) => ['small', 'medium', 'large'].includes(value)
  },
  shadow: {
    type: Boolean,
    default: true
  },
  hover: {
    type: Boolean,
    default: true
  },
  border: {
    type: Boolean,
    default: false
  },
  borderRadius: {
    type: String,
    default: '16px'
  }
});
</script>

<style scoped>
.acmetone-card {
  background: var(--garrix-white, #ffffff);
  border: 1px solid transparent;
  transition: all 0.3s cubic-bezier(0.25, 0.1, 0.25, 1);
  overflow: hidden;
  position: relative;
}

.acmetone-card.has-shadow {
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

.acmetone-card.has-border {
  border-color: var(--garrix-border-grey, #e0e0e0);
}

.acmetone-card.has-hover:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
}

.acmetone-card.small {
  padding: 12px;
}

.acmetone-card.medium {
  padding: 20px;
}

.acmetone-card.large {
  padding: 32px;
}

.card-header {
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--garrix-border-grey, #e0e0e0);
}

.card-body {
  flex: 1;
}

.card-footer {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--garrix-border-grey, #e0e0e0);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .acmetone-card.large {
    padding: 20px;
  }
  
  .acmetone-card.medium {
    padding: 16px;
  }
}
</style>
