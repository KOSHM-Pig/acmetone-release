<template>
  <div id="app">
    <router-view />
    <!-- 全局通知组件 -->
    <AcmetoneNotification ref="notificationRef" />
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { setNotificationInstance } from './utils/notification'

const notificationRef = ref(null)

// 在组件挂载后设置通知实例
onMounted(() => {
  if (notificationRef.value) {
    setNotificationInstance(notificationRef.value)
  }
})
</script>

<style>
#app {
  font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #1a1a1a;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  background-color: #fff;
}
</style>
