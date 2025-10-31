import axios from 'axios';
import { ElMessage } from 'element-plus';
import CryptoJS from 'crypto-js';
import { API_BASE_URL } from '../config';

/**
 * 节奏阵列服务 - 处理节奏阵列的投稿相关功能
 */

// 节奏阵列API基础URL
const BEAT_ARRAY_API_URL = 'https://www.beatarray.com/api';

// 创建axios实例，带有重试机制
const createAxiosInstance = () => {
  const instance = axios.create({
    baseURL: BEAT_ARRAY_API_URL,
    timeout: 10000
  });

  // 请求拦截器
  instance.interceptors.request.use(
    config => {
      console.log(`发送请求: ${config.method.toUpperCase()} ${config.url}`);
      return config;
    },
    error => {
      console.error('请求错误:', error);
      return Promise.reject(error);
    }
  );

  // 响应拦截器
  instance.interceptors.response.use(
    response => {
      console.log(`响应状态码: ${response.status}`);
      return response;
    },
    error => {
      console.error('响应错误:', error);
      // 重试逻辑可以在这里实现
      return Promise.reject(error);
    }
  );

  return instance;
};

/**
 * MD5加密函数
 * @param {string} text - 需要加密的文本
 * @returns {string} - 加密后的字符串
 */
const md5Encrypt = (text) => {
  return CryptoJS.MD5(text).toString();
};

/**
 * 登录节奏阵列平台
 * @param {string} email - 邮箱
 * @param {string} password - 密码（明文）
 * @returns {Promise<Object>} - 返回登录结果，包含token和用户信息
 */
export const loginToBeatArray = async (email, password) => {
  try {
    const instance = createAxiosInstance();
    
    // 对密码进行MD5加密
    const encryptedPassword = md5Encrypt(password);
    
    // 构造登录请求数据
    const loginPayload = {
      mail: email,
      password: encryptedPassword
    };
    
    console.log('正在登录节奏阵列平台...');
    const response = await instance.post('/users/login', loginPayload);
    
    const data = response.data;
    if (data.status === 0 && data.msg === '登录成功') {
      console.log('节奏阵列平台登录成功');
      
      // 获取token和用户ID
      const token = data.data.token;
      
      // 保存token到localStorage
      localStorage.setItem('beatArrayToken', token);
      
      // 获取用户信息（包括厂牌信息）
      const userInfoResponse = await instance.get('/users/getUserInfo', {
        headers: { token }
      });
      
      if (userInfoResponse.data.status === 0) {
        const userInfo = userInfoResponse.data.data;
        // 提取厂牌信息
        const labels = userInfo.roles.map(role => ({
          id: role.labelId,
          url: role.label.url,
          nameEn: role.label.nameEn,
          nameZh: role.label.nameZh,
          roleType: role.type
        }));
        
        return {
          success: true,
          token,
          userInfo,
          labels,
          message: '登录成功'
        };
      } else {
        console.error('获取用户信息失败:', userInfoResponse.data.msg);
        return {
          success: true,
          token,
          message: '登录成功，但无法获取用户详情'
        };
      }
    } else {
      console.error('节奏阵列平台登录失败:', data.msg);
      return {
        success: false,
        message: data.msg || '登录失败'
      };
    }
  } catch (error) {
    console.error('节奏阵列平台登录出错:', error);
    return {
      success: false,
      message: error.response?.data?.msg || '登录请求失败，请检查网络连接'
    };
  }
};

/**
 * 获取节奏阵列投稿列表
 * @param {Object} params - 查询参数
 * @param {number} params.page - 页码
 * @param {number} params.pageSize - 每页数量
 * @param {string} params.sortKey - 排序字段
 * @param {number} params.sortMethod - 排序方法（1:升序，-1:降序）
 * @param {number} params.labelId - 厂牌ID
 * @returns {Promise<Object>} - 返回投稿列表数据
 */
export const getSubmissions = async (params = {}) => {
  try {
    const token = localStorage.getItem('beatArrayToken');
    if (!token) {
      return {
        success: false,
        message: '未登录节奏阵列平台，请先登录'
      };
    }
    
    const instance = createAxiosInstance();
    instance.defaults.headers.common['token'] = token;
    
    // 设置默认参数
    const defaultParams = {
      page: 1,
      pageSize: 10,
      sortKey: 'createdTime',
      sortMethod: -1,
      labelId: params.labelId || localStorage.getItem('beatArraySelectedLabelId') || 112  // 使用传入或本地存储的厂牌ID
    };
    
    // 合并默认参数和传入的参数
    const queryParams = { ...defaultParams, ...params };
    
    console.log('正在获取节奏阵列投稿列表...', queryParams);
    const response = await instance.get('/submit/labelAuditGetSubmits', { params: queryParams });
    
    const data = response.data;
    if (data.status === 0 && data.msg === '获取成功') {
      console.log('获取节奏阵列投稿列表成功');
      return {
        success: true,
        total: data.data.total,
        list: data.data.list,
        message: '获取成功'
      };
    } else {
      console.error('获取节奏阵列投稿列表失败:', data.msg);
      return {
        success: false,
        message: data.msg || '获取投稿列表失败'
      };
    }
  } catch (error) {
    console.error('获取节奏阵列投稿列表出错:', error);
    return {
      success: false,
      message: error.response?.data?.msg || '获取投稿列表请求失败，请检查网络连接'
    };
  }
};

/**
 * 获取用户信息及厂牌列表
 * @returns {Promise<Object>} - 返回用户信息和厂牌列表
 */
export const getUserLabels = async () => {
  try {
    const token = localStorage.getItem('beatArrayToken');
    if (!token) {
      return {
        success: false,
        message: '未登录节奏阵列平台，请先登录'
      };
    }
    
    const instance = createAxiosInstance();
    instance.defaults.headers.common['token'] = token;
    
    console.log('正在获取用户信息及厂牌列表...');
    const response = await instance.get('/users/getUserInfo');
    
    const data = response.data;
    if (data.status === 0) {
      console.log('获取用户信息及厂牌列表成功');
      
      // 提取厂牌信息
      const userInfo = data.data;
      const labels = userInfo.roles.map(role => ({
        id: role.labelId,
        url: role.label.url,
        nameEn: role.label.nameEn,
        nameZh: role.label.nameZh,
        roleType: role.type
      }));
      
      // 缓存厂牌列表到localStorage
      try {
        localStorage.setItem('beatArrayLabels', JSON.stringify(labels));
        console.log('厂牌列表已缓存到localStorage');
      } catch (cacheError) {
        console.error('缓存厂牌列表失败:', cacheError);
      }
      
      // 同时获取完整的厂牌列表（包括用户没有权限的厂牌）
      try {
        const labelsResponse = await instance.get('/label/getLabelList');
        if (labelsResponse.data.status === 0) {
          const allLabels = labelsResponse.data.data;
          localStorage.setItem('beatArrayAllLabels', JSON.stringify(allLabels));
          console.log('完整厂牌列表已缓存到localStorage');
        }
      } catch (labelsError) {
        console.error('获取完整厂牌列表失败:', labelsError);
      }
      
      return {
        success: true,
        userInfo,
        labels,
        message: '获取成功'
      };
    } else {
      console.error('获取用户信息及厂牌列表失败:', data.msg);
      return {
        success: false,
        message: data.msg || '获取用户信息失败'
      };
    }
  } catch (error) {
    console.error('获取用户信息及厂牌列表出错:', error);
    return {
      success: false,
      message: error.response?.data?.msg || '请求失败，请检查网络连接'
    };
  }
};

/**
 * 处理投稿审批
 * @param {string} submissionId - 投稿ID
 * @param {string} action - 审批动作（'approve'或'reject'）
 * @param {number} currentStatus - 当前状态（0:待审核, 1:审核中）
 * @param {string} comment - 审核意见（通过或拒绝的原因）
 * @param {number} labelId - 厂牌ID
 * @param {Object} submissionInfo - 投稿信息（标题、作者、邮箱等）
 * @returns {Promise<Object>} - 返回处理结果
 */
export const processSubmission = async (submissionId, action, currentStatus = 0, comment = '', labelId = null, submissionInfo = {}) => {
  try {
    const token = localStorage.getItem('beatArrayToken');
    if (!token) {
      return {
        success: false,
        message: '未登录节奏阵列平台，请先登录'
      };
    }
    
    const instance = createAxiosInstance();
    instance.defaults.headers.common['token'] = token;
    
    // 所有审核操作都使用auditSubmit接口
    const endpoint = '/submit/auditSubmit';
    
    // 如果没有提供labelId，则尝试从localStorage获取
    const finalLabelId = labelId || localStorage.getItem('beatArraySelectedLabelId') || 112;
    
    // 准备不同状态下的审核意见默认值
    let defaultComment = '';
    if (action === 'approve') {
      defaultComment = currentStatus === 0 ? '初审通过' : '复审通过';
    } else {
      defaultComment = '拒绝投稿';
    }
    
    // 构造请求数据
    const payload = {
      id: submissionId, 
      labelId: parseInt(finalLabelId),
      status: action === 'approve',  // true=通过, false=拒绝
      comment: comment || defaultComment
    };
    
    // 验证拒绝原因
    if (action === 'reject') {
      console.log('拒绝投稿，拒绝原因:', comment);
      if (!comment) {
        console.error('拒绝时必须提供原因，但拒绝原因为空');
      return {
        success: false,
        message: '拒绝时必须提供原因'
      };
      }
    }
    
    console.log(`正在${action === 'approve' ? '通过' : '拒绝'}投稿...`, payload);
    const response = await instance.post(endpoint, payload);
    
    const data = response.data;
    if (data.status === 0) {
      console.log('处理投稿成功');
      
      // 同步调用极音记API发送邮件通知
      try {
        const acmetoneToken = localStorage.getItem('token');
        if (acmetoneToken) {
          console.log('正在调用极音记API发送邮件通知...');
          
          // 使用传入的投稿信息或默认值
          const { title = '', author = '', email = '', labelNameZh: infoLabelNameZh = '', labelNameEn: infoLabelNameEn = '' } = submissionInfo;
          
          // 获取当前选中厂牌的名称
          let labelNameZh = infoLabelNameZh || '节奏阵列';
          let labelNameEn = infoLabelNameEn || 'Beat Array';
          
          // 如果submissionInfo中没有提供厂牌名称，尝试从缓存获取
          if (!infoLabelNameZh || !infoLabelNameEn) {
          // 尝试从localStorage获取已缓存的厂牌列表
          try {
            const cachedLabelsStr = localStorage.getItem('beatArrayLabels');
            if (cachedLabelsStr) {
              const cachedLabels = JSON.parse(cachedLabelsStr);
              const selectedLabel = cachedLabels.find(label => label.id === parseInt(finalLabelId));
              if (selectedLabel) {
                  labelNameZh = selectedLabel.nameZh || labelNameZh;
                  labelNameEn = selectedLabel.nameEn || labelNameEn;
                console.log('从缓存获取到厂牌名称:', { labelNameZh, labelNameEn });
              }
            }
          } catch (cacheError) {
            console.error('读取缓存厂牌信息失败:', cacheError);
          }
          
          // 如果缓存中没有厂牌信息，尝试从API获取
          if (labelNameZh === '节奏阵列' && labelNameEn === 'Beat Array') {
            try {
              const labelsResponse = await instance.get('/label/getLabelList');
              if (labelsResponse.data.status === 0) {
                const labels = labelsResponse.data.data;
                const selectedLabel = labels.find(label => label.id === parseInt(finalLabelId));
                if (selectedLabel) {
                    labelNameZh = selectedLabel.nameZh || labelNameZh;
                    labelNameEn = selectedLabel.nameEn || labelNameEn;
                  console.log('从API获取到厂牌名称:', { labelNameZh, labelNameEn });
                  
                  // 缓存厂牌列表以便下次使用
                  localStorage.setItem('beatArrayLabels', JSON.stringify(labels));
                }
              }
            } catch (apiError) {
              console.error('获取厂牌列表失败:', apiError);
            }
            }
          } else {
            console.log('使用submissionInfo中提供的厂牌名称:', { labelNameZh, labelNameEn });
          }
          
          // 直接发送通知，使用传入的投稿信息和厂牌名称
          await axios.post(`${API_BASE_URL}/beat-array/notify-submission`, {
            submissionId,
            action,
            comment,
            labelId: finalLabelId,
            labelNameZh,  // 添加厂牌中文名
            labelNameEn,  // 添加厂牌英文名
            title,
            author,
            userEmail: email
          }, {
            headers: { 
              'Authorization': `Bearer ${acmetoneToken}`,
              'Beat-Array-Token': token
            }
          });
          console.log('邮件通知请求已发送，包含厂牌名称:', { labelNameZh, labelNameEn });
        }
      } catch (notifyError) {
        console.error('发送邮件通知失败，但投稿处理已成功:', notifyError);
      }
      
      return {
        success: true,
        message: data.msg || '操作成功'
      };
    } else {
      console.error('处理投稿失败:', data.msg);
      return {
        success: false,
        message: data.msg || '操作失败'
      };
    }
  } catch (error) {
    console.error('处理投稿出错:', error);
    return {
      success: false,
      message: error.response?.data?.msg || '请求失败，请检查网络连接'
    };
  }
};

/**
 * 验证节奏阵列登录状态
 * @returns {Promise<boolean>} - 返回是否已登录
 */
export const checkBeatArrayLoginStatus = async () => {
  const token = localStorage.getItem('beatArrayToken');
  if (!token) {
    return false;
  }
  
  try {
    // 创建axios实例
    const instance = createAxiosInstance();
    instance.defaults.headers.common['token'] = token;
    
    // 尝试获取用户信息，测试token是否有效
    const response = await instance.get('/users/getUserInfo');
    
    return response.data.status === 0;
  } catch (error) {
    console.error('验证节奏阵列登录状态出错:', error);
    return false;
  }
};

/**
 * 登出节奏阵列平台
 */
export const logoutFromBeatArray = () => {
  localStorage.removeItem('beatArrayToken');
  localStorage.removeItem('beatArrayLabels');
  localStorage.removeItem('beatArrayAllLabels');
  localStorage.removeItem('beatArraySelectedLabelId');
  console.log('已登出节奏阵列平台，并清除所有厂牌相关信息');
};

/**
 * 获取邮件模板设置
 * @returns {Promise<Object>} - 返回邮件设置
 */
export const fetchEmailSettings = async () => {
  try {
    const beatArrayToken = localStorage.getItem('beatArrayToken');
    const acmetoneToken = localStorage.getItem('token');
    
    if (!beatArrayToken) {
      return {
        success: false,
        message: '未登录节奏阵列平台，请先登录'
      };
    }
    
    if (!acmetoneToken) {
      return {
        success: false,
        message: '未登录极音记平台，请先登录'
      };
    }
    
    // 使用极音记API获取邮件设置，使用极音记的令牌进行身份验证
    const response = await axios.get(`${API_BASE_URL}/beat-array/email-settings`, {
      headers: { 
        'Authorization': `Bearer ${acmetoneToken}`,
        'Beat-Array-Token': beatArrayToken
      }
    });
    
    if (response.data.success) {
      return {
        success: true,
        settings: response.data.settings,
        message: '获取邮件设置成功'
      };
    } else {
      console.error('获取邮件设置失败:', response.data.message);
      return {
        success: false,
        message: response.data.message || '获取邮件设置失败'
      };
    }
  } catch (error) {
    console.error('获取邮件设置出错:', error);
    return {
      success: false,
      message: error.response?.data?.message || '获取邮件设置请求失败，请检查网络连接'
    };
  }
};

/**
 * 更新邮件模板设置
 * @param {Object} settings - 邮件设置
 * @returns {Promise<Object>} - 返回更新结果
 */
export const updateEmailSettings = async (settings) => {
  try {
    const beatArrayToken = localStorage.getItem('beatArrayToken');
    const acmetoneToken = localStorage.getItem('token');
    
    if (!beatArrayToken) {
      return {
        success: false,
        message: '未登录节奏阵列平台，请先登录'
      };
    }
    
    if (!acmetoneToken) {
      return {
        success: false,
        message: '未登录极音记平台，请先登录'
      };
    }
    
    // 使用极音记API更新邮件设置，使用极音记的令牌进行身份验证
    const response = await axios.post(`${API_BASE_URL}/beat-array/email-settings`, settings, {
      headers: { 
        'Authorization': `Bearer ${acmetoneToken}`,
        'Beat-Array-Token': beatArrayToken
      }
    });
    
    if (response.data.success) {
      return {
        success: true,
        message: '更新邮件设置成功'
      };
    } else {
      console.error('更新邮件设置失败:', response.data.message);
      return {
        success: false,
        message: response.data.message || '更新邮件设置失败'
      };
    }
  } catch (error) {
    console.error('更新邮件设置出错:', error);
    return {
      success: false,
      message: error.response?.data?.message || '更新邮件设置请求失败，请检查网络连接'
    };
  }
}; 