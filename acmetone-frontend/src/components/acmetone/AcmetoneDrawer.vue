<!-- 
    这个组件是Acmetone的抽屉组件，用于在Acmetone的页面中使用。
    它继承了Acmetone的样式，并添加了更多的样式和功能。
    它是一个通用的抽屉组件，可以用于任何需要侧边面板的地方。
    它支持以下功能：
    1. 支持不同的方向：left, right, top, bottom
    2. 支持不同的尺寸：small, medium, large, fullscreen
    3. 支持自定义标题
    4. 支持关闭按钮
    5. 支持遮罩层点击关闭
    6. 支持ESC键关闭
    7. 支持动画效果
-->
<template>
  <Teleport to="body">
    <Transition name="drawer">
      <div v-if="visible" class="acmetone-drawer-overlay" @click="handleOverlayClick">
        <div 
          :class="['acmetone-drawer', direction, size]"
          @click.stop
          role="dialog"
          :aria-labelledby="titleId"
        >
          <!-- 抽屉头部 -->
          <div v-if="title || $slots.header || showClose" class="drawer-header">
            <div class="drawer-title">
              <slot name="header">
                <h3 :id="titleId">{{ title }}</h3>
              </slot>
            </div>
            <button 
              v-if="showClose" 
              class="drawer-close"
              @click="handleClose"
              aria-label="关闭抽屉"
            >
              ✕
            </button>
          </div>

          <!-- 抽屉内容 -->
          <div class="drawer-body">
            <slot></slot>
          </div>

          <!-- 抽屉底部 -->
          <div v-if="$slots.footer" class="drawer-footer">
            <slot name="footer"></slot>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed, onMounted, onUnmounted, toRefs, watch } from 'vue';

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    default: ''
  },
  direction: {
    type: String,
    default: 'right',
    validator: (value) => ['left', 'right', 'top', 'bottom'].includes(value)
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

const titleId = computed(() => `drawer-title-${Date.now()}`);

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
.acmetone-drawer-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  display: flex;
}

.acmetone-drawer {
  background: var(--garrix-white, #ffffff);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}

/* 方向 */
.acmetone-drawer.right {
  margin-left: auto;
  height: 100%;
}

.acmetone-drawer.left {
  margin-right: auto;
  height: 100%;
}

.acmetone-drawer.top {
  margin-bottom: auto;
  width: 100%;
}

.acmetone-drawer.bottom {
  margin-top: auto;
  width: 100%;
}

/* 尺寸 */
.acmetone-drawer.right.small,
.acmetone-drawer.left.small {
  width: 400px;
  max-width: 90vw;
}

.acmetone-drawer.right.medium,
.acmetone-drawer.left.medium {
  width: 600px;
  max-width: 90vw;
}

.acmetone-drawer.right.large,
.acmetone-drawer.left.large {
  width: 800px;
  max-width: 90vw;
}

.acmetone-drawer.right.fullscreen,
.acmetone-drawer.left.fullscreen {
  width: 100vw;
}

.acmetone-drawer.top.small,
.acmetone-drawer.bottom.small {
  height: 300px;
  max-height: 90vh;
}

.acmetone-drawer.top.medium,
.acmetone-drawer.bottom.medium {
  height: 500px;
  max-height: 90vh;
}

.acmetone-drawer.top.large,
.acmetone-drawer.bottom.large {
  height: 700px;
  max-height: 90vh;
}

.acmetone-drawer.top.fullscreen,
.acmetone-drawer.bottom.fullscreen {
  height: 100vh;
}

.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px;
  border-bottom: 1px solid var(--garrix-border-grey, #e0e0e0);
  flex-shrink: 0;
}

.drawer-title h3 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--garrix-black, #1d1d1f);
}

.drawer-close {
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

.drawer-close:hover {
  background: var(--garrix-border-grey, #e0e0e0);
  color: var(--garrix-black, #1d1d1f);
}

.drawer-body {
  padding: 24px;
  flex: 1;
  overflow-y: auto;
}

.drawer-footer {
  padding: 24px;
  border-top: 1px solid var(--garrix-border-grey, #e0e0e0);
  flex-shrink: 0;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

/* 动画效果 */
.drawer-enter-active,
.drawer-leave-active {
  transition: all 0.3s cubic-bezier(0.25, 0.1, 0.25, 1);
}

.drawer-enter-from,
.drawer-leave-to {
  opacity: 0;
}

.drawer-enter-from .acmetone-drawer.right,
.drawer-leave-to .acmetone-drawer.right {
  transform: translateX(100%);
}

.drawer-enter-from .acmetone-drawer.left,
.drawer-leave-to .acmetone-drawer.left {
  transform: translateX(-100%);
}

.drawer-enter-from .acmetone-drawer.top,
.drawer-leave-to .acmetone-drawer.top {
  transform: translateY(-100%);
}

.drawer-enter-from .acmetone-drawer.bottom,
.drawer-leave-to .acmetone-drawer.bottom {
  transform: translateY(100%);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .acmetone-drawer.right.small,
  .acmetone-drawer.right.medium,
  .acmetone-drawer.right.large,
  .acmetone-drawer.left.small,
  .acmetone-drawer.left.medium,
  .acmetone-drawer.left.large {
    width: 100vw;
    max-width: none;
  }
  
  .drawer-header,
  .drawer-body,
  .drawer-footer {
    padding: 16px;
  }
  
  .drawer-footer {
    flex-direction: column;
  }
}
</style>
