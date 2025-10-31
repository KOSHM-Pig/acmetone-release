import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import zhCn from 'element-plus/dist/locale/zh-cn.mjs'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import App from './App.vue'
import router from './router'
import axios from 'axios'
import { useUserStore } from './stores/user'
import { useBeatArrayStore } from './stores/beatArray'
import { API_BASE_URL } from './config'
import { ElMessage, ElLoading } from 'element-plus'

// 引入自定义样式
import './style.css'
import './assets/styles/fonts.css'
// import './assets/styles/darkTheme.css' // 移除黑色主题
import './assets/styles/garrix-theme.css' // 仅使用白色主题

// 导入登录状态检测器和自定义Axios实例
import authChecker from './utils/authChecker'
import axiosInstance from './utils/axiosSetup'

// 创建Vue应用
const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(ElementPlus, {
  locale: zhCn,
})

// 全局注册 ElLoading 组件
app.component('el-loading', ElLoading)

// 注册所有Element Plus图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

// 初始化用户认证状态
const userStore = useUserStore()
// 初始化节奏阵列状态
const beatArrayStore = useBeatArrayStore()

// 设置axios默认配置
axios.defaults.baseURL = API_BASE_URL

// 防止循环请求的标记
let isRefreshing = false;
let pendingRequests = [];

// 添加axios请求拦截器，确保每次请求都使用最新的token
axios.interceptors.request.use(
  config => {
    const currentToken = localStorage.getItem('token')
    if (currentToken) {
      config.headers.Authorization = `Bearer ${currentToken}`
    }
    return config
  },
  error => {
    return Promise.reject(error)
  }
)

// 添加axios响应拦截器
axios.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;
    const userStore = useUserStore();

    // 关键修复：处理401错误
    if (error.response && error.response.status === 401) {
      // 检查是否是登录请求，如果是，则不进行任何全局操作，让组件自行处理
      if (originalRequest.url.includes('/users/login') || originalRequest.url.includes('/auth/login')) {
        console.warn('登录请求失败，由组件自行处理。');
        return Promise.reject(error); // 直接拒绝，让组件的catch捕获
      }
      
      // 检查是否是验证码失败，如果是，则不进行任何全局操作
      if (error.response.data && error.response.data.message === '人机验证失败') {
        console.warn('人机验证失败，由组件自行处理。');
        return Promise.reject(error); // 直接拒绝，让组件的catch捕获
      }

      // 处理JWT过期的情况 - 不再尝试刷新token，直接登出
      console.error('认证失败，执行登出操作');
      userStore.logout();
      return Promise.reject(error);
    }
    
    return Promise.reject(error);
  }
);

// 在应用挂载前初始化用户状态
async function initApp() {
  try {
    // 先挂载应用，确保页面内容可见
    app.mount('#app')
    
    // 然后异步初始化用户状态
    await userStore.init()
  } catch (error) {
    console.error('初始化用户状态失败:', error)
    // 即使初始化失败，应用已经挂载，用户可以看到页面内容
  }
}

initApp()

// 将自定义Axios实例添加到全局属性
app.config.globalProperties.$axios = axiosInstance

// 启动登录状态检测器（每10分钟检查一次）
authChecker.startChecking(10 * 60 * 1000)
