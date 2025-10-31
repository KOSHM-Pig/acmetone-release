import axios from 'axios'
import { labelBackend_API_URL, mainBackend_API_URL } from '../config/config.js'

// 创建axios实例 - 用于厂牌后端服务
const api = axios.create({
  baseURL: labelBackend_API_URL, // 厂牌后端服务地址
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 创建认证服务的axios实例 - 直接连接到主后端
const authApi = axios.create({
  baseURL: mainBackend_API_URL, // 主后端服务地址
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 通用的请求拦截器函数
const addAuthInterceptor = (axiosInstance) => {
  axiosInstance.interceptors.request.use(
    (config) => {
      // 从localStorage获取token
      const token = localStorage.getItem('token')
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
      return config
    },
    (error) => {
      console.error('请求拦截器错误:', error)
      return Promise.reject(error)
    }
  )
}

// 为两个axios实例都添加请求拦截器
addAuthInterceptor(api)
addAuthInterceptor(authApi)

// 通用的响应拦截器函数
const addResponseInterceptor = (axiosInstance) => {
  axiosInstance.interceptors.response.use(
    (response) => {
      return response
    },
    (error) => {
      console.error('API请求错误:', error)

      // 处理不同的错误状态码
      if (error.response) {
        const { status, data } = error.response

        switch (status) {
          case 401:
            // 未授权，清除token并跳转到登录页
            localStorage.removeItem('token')
            localStorage.removeItem('user')
            console.error('登录已过期，请重新登录')
            window.location.href = '/login'
            break
          case 403:
            console.error('没有权限访问该资源')
            break
          case 404:
            console.error('请求的资源不存在')
            break
          case 500:
            console.error('服务器内部错误')
            break
          default:
            console.error(data?.message || '请求失败')
        }
      } else if (error.request) {
        // 网络错误
        console.error('网络连接失败，请检查网络设置')
      } else {
        console.error('请求配置错误')
      }

      return Promise.reject(error)
    }
  )
}

// 为两个axios实例都添加响应拦截器
addResponseInterceptor(api)
addResponseInterceptor(authApi)

export default api
export { authApi }

