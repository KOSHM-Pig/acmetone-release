/**
 * Acmetone 通知服务
 * 全局通知管理，符合 Acmetone 设计风格
 */

let notificationInstance = null

// 设置通知实例
export const setNotificationInstance = (instance) => {
  notificationInstance = instance
}

// 通知方法
export const notification = {
  success: (message, duration = 4000) => {
    if (notificationInstance) {
      return notificationInstance.success(message, duration)
    }
    console.log('✓ Success:', message)
  },
  
  error: (message, duration = 4000) => {
    if (notificationInstance) {
      return notificationInstance.error(message, duration)
    }
    console.error('✕ Error:', message)
  },
  
  warning: (message, duration = 4000) => {
    if (notificationInstance) {
      return notificationInstance.warning(message, duration)
    }
    console.warn('! Warning:', message)
  },
  
  info: (message, duration = 4000) => {
    if (notificationInstance) {
      return notificationInstance.info(message, duration)
    }
    console.info('i Info:', message)
  },
  
  // 清空所有通知
  clear: () => {
    if (notificationInstance) {
      notificationInstance.clearAll()
    }
  }
}

// 默认导出
export default notification
