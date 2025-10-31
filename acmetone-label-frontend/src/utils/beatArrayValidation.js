import axios from 'axios'
import CryptoJS from 'crypto-js'

/**
 * 节奏阵列验证服务
 * 用于验证节奏阵列账号密码的有效性
 */

// 节奏阵列API基础URL
const BEAT_ARRAY_API_URL = 'https://www.beatarray.com/api'

/**
 * MD5加密函数
 * @param {string} text - 需要加密的文本
 * @returns {string} - 加密后的字符串
 */
const md5Encrypt = (text) => {
  return CryptoJS.MD5(text).toString()
}

/**
 * 创建axios实例
 */
const createAxiosInstance = () => {
  const instance = axios.create({
    baseURL: BEAT_ARRAY_API_URL,
    timeout: 10000
  })

  // 请求拦截器
  instance.interceptors.request.use(
    config => {
      console.log(`[BeatArray] 发送请求: ${config.method.toUpperCase()} ${config.url}`)
      return config
    },
    error => {
      console.error('[BeatArray] 请求错误:', error)
      return Promise.reject(error)
    }
  )

  // 响应拦截器
  instance.interceptors.response.use(
    response => {
      console.log(`[BeatArray] 响应状态码: ${response.status}`)
      return response
    },
    error => {
      console.error('[BeatArray] 响应错误:', error)
      return Promise.reject(error)
    }
  )

  return instance
}

/**
 * 验证节奏阵列账号密码
 * @param {string} email - 邮箱账号
 * @param {string} password - 密码（明文）
 * @returns {Promise<Object>} - 返回验证结果
 */
export const validateBeatArrayCredentials = async (email, password) => {
  try {
    if (!email || !password) {
      return {
        success: false,
        message: '账号和密码不能为空'
      }
    }

    const instance = createAxiosInstance()
    
    // 对密码进行MD5加密
    const encryptedPassword = md5Encrypt(password)
    
    // 构造登录请求数据
    const loginPayload = {
      mail: email,
      password: encryptedPassword
    }
    
    console.log('[BeatArray] 正在验证账号密码...')
    const response = await instance.post('/users/login', loginPayload)
    
    const data = response.data
    if (data.status === 0 && data.msg === '登录成功') {
      console.log('[BeatArray] 账号密码验证成功')
      
      return {
        success: true,
        message: '节奏阵列账号密码验证成功',
        token: data.data.token
      }
    } else {
      console.error('[BeatArray] 账号密码验证失败:', data.msg)
      return {
        success: false,
        message: data.msg || '账号密码验证失败'
      }
    }
  } catch (error) {
    console.error('[BeatArray] 验证过程中出错:', error)
    
    let errorMessage = '验证失败，请检查网络连接'
    
    if (error.response) {
      const status = error.response.status
      const data = error.response.data
      
      if (status === 401) {
        errorMessage = '账号或密码错误'
      } else if (status === 403) {
        errorMessage = '账号被禁用或无权限'
      } else if (status >= 500) {
        errorMessage = '节奏阵列服务器错误，请稍后重试'
      } else if (data && data.msg) {
        errorMessage = data.msg
      }
    } else if (error.code === 'ECONNABORTED') {
      errorMessage = '请求超时，请检查网络连接'
    } else if (error.code === 'NETWORK_ERROR') {
      errorMessage = '网络连接失败'
    }
    
    return {
      success: false,
      message: errorMessage
    }
  }
}

/**
 * 检查节奏阵列服务是否可用
 * @returns {Promise<boolean>} - 服务是否可用
 */
export const checkBeatArrayService = async () => {
  try {
    const instance = createAxiosInstance()
    // 使用一个简单的请求来检查服务状态
    await instance.get('/users/login', {
      timeout: 5000,
      validateStatus: (status) => status < 500 // 只要不是服务器错误就认为服务可用
    })
    return true
  } catch (error) {
    console.warn('[BeatArray] 服务不可用:', error.message)
    return false
  }
}
