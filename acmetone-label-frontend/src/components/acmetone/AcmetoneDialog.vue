<!-- 
    这个组件是Acmetone的对话框组件，用于在Acmetone的页面中使用。
    它继承了Acmetone的样式，并添加了更多的样式和功能。
    它是一个通用的对话框组件，可以用于任何需要对话框的地方。
    它支持以下功能：
    1. 支持不同的尺寸：small, medium, large, fullscreen
    2. 支持自定义标题
    3. 支持关闭按钮
    4. 支持遮罩层点击关闭
    5. 支持ESC键关闭
    6. 支持动画效果
-->
<template>
  <div class="acmetone-dialog-wrapper" v-bind="$attrs">
    <Teleport to="body" v-if="visible">
      <Transition name="dialog">
        <div class="acmetone-dialog-overlay" @click="handleOverlayClick">
        <div
          :class="['acmetone-dialog', size]"
          @click.stop
          role="dialog"
          :aria-labelledby="titleId"
        >
          <!-- 对话框头部 -->
          <div v-if="title || $slots.header || showClose" class="dialog-header">
            <div class="dialog-title">
              <slot name="header">
                <h3 :id="titleId">{{ title }}</h3>
              </slot>
            </div>
            <button 
              v-if="showClose" 
              class="dialog-close"
              @click="handleClose"
              aria-label="关闭对话框"
            >
              ✕
            </button>
          </div>

          <!-- 对话框内容 -->
          <div class="dialog-body">
            <slot></slot>
          </div>

          <!-- 对话框底部 -->
          <div v-if="$slots.footer" class="dialog-footer">
            <slot name="footer"></slot>
          </div>
        </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, toRefs, watch } from 'vue';

defineOptions({
  inheritAttrs: false
});

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    default: ''
  },
  size: {
    type: String,
    default: 'medium',
    validator: (value) => ['small', 'medium', 'large', 'fullscreen'].includes(value)
  },
  showClose: {
    type: Boolean,
    default: true
  },
  closeOnClickOutside: {
    type: Boolean,
    default: true
  },
  closeOnEscape: {
    type: Boolean,
    default: true
  }
});

const emit = defineEmits(['update:visible', 'close']);

const titleId = computed(() => `dialog-title-${Date.now()}`);

const handleClose = () => {
  emit('update:visible', false);
  emit('close');
};

const handleOverlayClick = () => {
  if (props.closeOnClickOutside) {
    handleClose();
  }
};

const handleEscape = (event) => {
  if (event.key === 'Escape' && props.closeOnEscape && props.visible) {
    handleClose();
  }
};

onMounted(() => {
  document.addEventListener('keydown', handleEscape);
  if (props.visible) {
    document.body.style.overflow = 'hidden';
  }
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleEscape);
  document.body.style.overflow = '';
});

// 监听visible变化，控制body滚动
const { visible } = toRefs(props);
watch(visible, (newVal) => {
  if (newVal) {
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = '';
  }
});
</script>

<style scoped>
.acmetone-dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10001;
  padding: 20px;
  box-sizing: border-box;
}

.acmetone-dialog {
  background: var(--garrix-white, #ffffff);
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  position: relative;
}

.acmetone-dialog.small {
  width: 400px;
  max-width: 90vw;
}

.acmetone-dialog.medium {
  width: 600px;
  max-width: 90vw;
}

.acmetone-dialog.large {
  width: 800px;
  max-width: 90vw;
}

.acmetone-dialog.fullscreen {
  width: 95vw;
  height: 95vh;
  max-width: none;
  max-height: none;
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 24px 0 24px;
  border-bottom: 1px solid var(--garrix-border-grey, #e0e0e0);
  margin-bottom: 24px;
}

.dialog-title h3 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--garrix-black, #1d1d1f);
}

.dialog-close {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: var(--garrix-grey, #86868b);
  padding: 8px;
  border-radius: 50%;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
}

.dialog-close:hover {
  background: var(--garrix-border-grey, #e0e0e0);
  color: var(--garrix-black, #1d1d1f);
}

.dialog-body {
  padding: 0 24px;
  flex: 1;
  overflow-y: auto;
}

.dialog-footer {
  padding: 24px;
  border-top: 1px solid var(--garrix-border-grey, #e0e0e0);
  margin-top: 24px;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

/* 动画效果 */
.dialog-enter-active,
.dialog-leave-active {
  transition: all 0.3s cubic-bezier(0.25, 0.1, 0.25, 1);
}

.dialog-enter-from,
.dialog-leave-to {
  opacity: 0;
}

.dialog-enter-from .acmetone-dialog,
.dialog-leave-to .acmetone-dialog {
  transform: scale(0.9) translateY(-20px);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .acmetone-dialog-overlay {
    padding: 10px;
  }

  .acmetone-dialog.small,
  .acmetone-dialog.medium,
  .acmetone-dialog.large {
    width: 100%;
    max-width: none;
  }

  .dialog-header,
  .dialog-body,
  .dialog-footer {
    padding-left: 16px;
    padding-right: 16px;
  }

  .dialog-footer {
    flex-direction: column;
  }
}

/* Wrapper样式 */
.acmetone-dialog-wrapper {
  display: contents; /* 不影响布局 */
}
</style>
