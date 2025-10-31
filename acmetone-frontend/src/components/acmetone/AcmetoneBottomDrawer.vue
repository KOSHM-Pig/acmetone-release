<!-- 
    Acmetone底部抽屉组件 - 专门用于从底部滑出的全屏抽屉
    支持全屏覆盖，适用于LRC制作器等需要大空间的功能
-->
<template>
  <Teleport to="body">
    <Transition name="bottom-drawer">
      <div v-if="visible" class="acmetone-bottom-drawer-overlay" @click="handleOverlayClick">
        <div 
          class="acmetone-bottom-drawer"
          @click.stop
          role="dialog"
          :aria-labelledby="titleId"
        >
          <!-- 抽屉头部 -->
          <div class="drawer-header">
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

const titleId = computed(() => `bottom-drawer-title-${Date.now()}`);

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
.acmetone-bottom-drawer-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  z-index: 3000;
  display: flex;
  align-items: flex-end;
}

.acmetone-bottom-drawer {
  width: 100%;
  height: 100vh;
  background: var(--garrix-white, #ffffff);
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  border-top-left-radius: 12px;
  border-top-right-radius: 12px;
}

.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid var(--garrix-border-grey, #e0e0e0);
  flex-shrink: 0;
  background: var(--garrix-white, #ffffff);
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
  flex: 1;
  overflow: auto;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
}

.drawer-footer {
  padding: 20px 24px;
  border-top: 1px solid var(--garrix-border-grey, #e0e0e0);
  flex-shrink: 0;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  background: var(--garrix-white, #ffffff);
}

/* 动画效果 */
.bottom-drawer-enter-active,
.bottom-drawer-leave-active {
  transition: all 0.3s cubic-bezier(0.25, 0.1, 0.25, 1);
}

.bottom-drawer-enter-from,
.bottom-drawer-leave-to {
  opacity: 0;
}

.bottom-drawer-enter-from .acmetone-bottom-drawer,
.bottom-drawer-leave-to .acmetone-bottom-drawer {
  transform: translateY(100%);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .drawer-header {
    padding: 16px 20px;
  }
  
  .drawer-footer {
    padding: 16px 20px;
    flex-direction: column;
  }
  
  .drawer-title h3 {
    font-size: 18px;
  }
}
</style>
