<!--
  Acmetone 通知框组件
  简洁的右上角通知提示，符合 Acmetone 设计风格
-->
<template>
  <Teleport to="body">
    <div class="notification-container">
      <TransitionGroup name="notification" tag="div">
        <div
          v-for="notification in notifications"
          :key="notification.id"
          :class="['notification', notification.type]"
        >
          <div class="notification-content">
            <div class="notification-icon">
              <span v-if="notification.type === 'success'">✓</span>
              <span v-else-if="notification.type === 'error'">✕</span>
              <span v-else-if="notification.type === 'warning'">!</span>
              <span v-else>i</span>
            </div>
            <div class="notification-message">
              {{ notification.message }}
            </div>
            <button 
              class="notification-close" 
              @click="removeNotification(notification.id)"
              type="button"
            >
              ✕
            </button>
          </div>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup>
import { ref } from 'vue'

const notifications = ref([])
let notificationId = 0

// 添加通知
const addNotification = (message, type = 'info', duration = 4000) => {
  const id = ++notificationId
  const notification = {
    id,
    message,
    type,
    duration
  }
  
  notifications.value.push(notification)
  
  // 自动移除
  if (duration > 0) {
    setTimeout(() => {
      removeNotification(id)
    }, duration)
  }
  
  return id
}

// 移除通知
const removeNotification = (id) => {
  const index = notifications.value.findIndex(n => n.id === id)
  if (index > -1) {
    notifications.value.splice(index, 1)
  }
}

// 清空所有通知
const clearAll = () => {
  notifications.value = []
}

// 暴露方法给外部使用
defineExpose({
  addNotification,
  removeNotification,
  clearAll,
  success: (message, duration) => addNotification(message, 'success', duration),
  error: (message, duration) => addNotification(message, 'error', duration),
  warning: (message, duration) => addNotification(message, 'warning', duration),
  info: (message, duration) => addNotification(message, 'info', duration)
})
</script>

<style scoped>
.notification-container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 10002;
  pointer-events: none;
  max-width: 400px;
}

.notification {
  background: var(--garrix-white, #ffffff);
  border: 1px solid var(--garrix-border-grey, #d2d2d7);
  margin-bottom: 12px;
  min-width: 300px;
  max-width: 400px;
  pointer-events: auto;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.notification-content {
  display: flex;
  align-items: flex-start;
  padding: 16px;
  gap: 12px;
}

.notification-icon {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: bold;
  flex-shrink: 0;
  margin-top: 1px;
}

.notification-message {
  flex: 1;
  font-family: var(--garrix-font-primary);
  font-size: 14px;
  line-height: 1.4;
  color: var(--garrix-black, #1d1d1f);
}

.notification-close {
  background: none;
  border: none;
  color: var(--garrix-grey, #86868b);
  cursor: pointer;
  padding: 0;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  transition: color 0.2s ease;
  flex-shrink: 0;
}

.notification-close:hover {
  color: var(--garrix-black, #1d1d1f);
}

/* 不同类型的样式 */
.notification.success {
  border-left: 3px solid #22c55e;
}

.notification.success .notification-icon {
  color: #22c55e;
}

.notification.error {
  border-left: 3px solid #ef4444;
}

.notification.error .notification-icon {
  color: #ef4444;
}

.notification.warning {
  border-left: 3px solid #f59e0b;
}

.notification.warning .notification-icon {
  color: #f59e0b;
}

.notification.info {
  border-left: 3px solid var(--garrix-black, #1d1d1f);
}

.notification.info .notification-icon {
  color: var(--garrix-black, #1d1d1f);
}

/* 动画效果 */
.notification-enter-active {
  transition: all 0.3s ease;
}

.notification-leave-active {
  transition: all 0.3s ease;
}

.notification-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.notification-leave-to {
  opacity: 0;
  transform: translateX(100%);
}

.notification-move {
  transition: transform 0.3s ease;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .notification-container {
    top: 10px;
    right: 10px;
    left: 10px;
  }
  
  .notification {
    min-width: auto;
    max-width: none;
  }
}
</style>
