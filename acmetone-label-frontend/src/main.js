import { createPinia } from 'pinia'
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { useAuthStore } from './stores/authStore'

// 引入Element Plus图标
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
// 引入Element Plus组件库与样式
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'

// 引入自定义样式
import './style.css'

// 引入通知组件
import AcmetoneNotification from './components/AcmetoneNotification.vue'

// 创建Vue应用
const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(ElementPlus)

// 全局注册通知组件
app.component('AcmetoneNotification', AcmetoneNotification)

// 注册所有Element Plus图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

// 初始化认证状态
const authStore = useAuthStore()
authStore.initAuth()

app.mount('#app')
