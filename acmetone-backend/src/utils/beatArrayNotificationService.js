const axios = require('axios');
const { sendBeatArrayApprovedEmail, sendBeatArrayRejectedEmail } = require('./emailService');
const { User } = require('../models');

// 节奏阵列API基础URL
const BEAT_ARRAY_API_URL = 'https://www.beatarray.com/api';

/**
 * 处理节奏阵列投稿审核通知
 * @param {Object} submissionData - 投稿数据
 * @param {string} action - 操作类型：'approve' 或 'reject'
 * @param {string} comment - 审核意见或拒绝原因
 * @param {Object} labelInfo - 厂牌信息
 * @param {number} userId - 处理审核的用户ID（极音记系统的用户ID）
 * @returns {Promise<Object>} - 返回处理结果
 */
const handleBeatArraySubmissionNotification = async (submissionData, action, comment, labelInfo, userId) => {
  try {
    console.log('-----------------------------------------------------');
    console.log('开始处理节奏阵列投稿审核通知');
    console.log('操作类型:', action);
    console.log('投稿数据:', submissionData ? {
      id: submissionData.id,
      title: submissionData.title,
      author: submissionData.author,
      user: submissionData.user ? {
        id: submissionData.user.id,
        name: submissionData.user.name,
        mail: submissionData.user.mail
      } : null
    } : null);
    console.log('厂牌信息:', labelInfo);
    console.log('处理用户ID:', userId);
    console.log('审核意见/拒绝原因:', comment);
    
    // 检查必要的数据
    if (!submissionData) {
      console.error('投稿数据为空，无法发送通知');
      return { success: false, message: '投稿数据为空' };
    }

    // 检查用户邮箱
    let userEmail = null;
    if (submissionData.user && submissionData.user.mail) {
      userEmail = submissionData.user.mail;
    } else {
      console.error('投稿数据中缺少用户邮箱，无法发送通知');
      return { success: false, message: '缺少用户邮箱' };
    }
    
    console.log('将发送通知到用户邮箱:', userEmail);
    
    // 准备邮件数据
    const emailData = {
      title: submissionData.title || '未知作品',
      author: submissionData.author || '未知作者',
      labelNameZh: labelInfo.nameZh || '节奏阵列',
      labelNameEn: labelInfo.nameEn || 'Beat Array',
      labelId: labelInfo.id,
      userId: userId // 处理审核的用户ID
    };

    console.log('准备发送邮件，邮件数据:', emailData);

    let result;
    
    if (action === 'approve') {
      // 通过审核
      emailData.comment = comment || '恭喜您，您的作品已通过审核！';
      console.log('发送通过审核邮件，审核意见:', emailData.comment);
      result = await sendBeatArrayApprovedEmail(userEmail, emailData);
    } else if (action === 'reject') {
      // 拒绝审核
      emailData.reason = comment || '很遗憾，您的作品未能通过审核。';
      console.log('发送拒绝审核邮件，拒绝原因:', emailData.reason);
      result = await sendBeatArrayRejectedEmail(userEmail, emailData);
    } else {
      console.error('未知的操作类型:', action);
      return { success: false, message: '未知的操作类型' };
    }

    console.log('邮件发送结果:', result);

    if (result.success) {
      console.log(`成功发送${action === 'approve' ? '通过' : '拒绝'}通知邮件到 ${userEmail}`);
      console.log('-----------------------------------------------------');
      return { 
        success: true, 
        message: `已成功发送${action === 'approve' ? '通过' : '拒绝'}通知邮件到 ${userEmail}` 
      };
    } else if (result.disabled) {
      console.log('邮件通知功能已禁用');
      console.log('-----------------------------------------------------');
      return { 
        success: false, 
        message: '邮件通知功能已禁用' 
      };
    } else {
      console.error('发送邮件失败:', result.error);
      console.log('-----------------------------------------------------');
      return { 
        success: false, 
        message: '发送邮件失败', 
        error: result.error 
      };
    }
  } catch (error) {
    console.error('处理节奏阵列投稿通知出错:', error);
    console.log('-----------------------------------------------------');
    return { 
      success: false, 
      message: '处理通知失败', 
      error: error.message 
    };
  }
};

/**
 * 获取厂牌信息
 * @param {number} labelId - 厂牌ID
 * @param {string} token - 节奏阵列平台的访问令牌
 * @returns {Promise<Object>} - 返回厂牌信息
 */
const getLabelInfo = async (labelId, token) => {
  try {
    console.log('-----------------------------------------------------');
    console.log('正在获取厂牌信息, labelId:', labelId);
    
    // 确保labelId是数字类型
    const numericLabelId = parseInt(labelId, 10);
    console.log('转换后的labelId:', numericLabelId);
    
    // 扩展预设的厂牌信息列表
    const defaultLabels = {
      '112': { nameZh: '节奏阵列', nameEn: 'Beat Array' },
      '113': { nameZh: '节奏阵列厂牌2', nameEn: 'Beat Array Label 2' },
      '114': { nameZh: '节奏阵列', nameEn: 'Beat Array' },
      '115': { nameZh: '节奏阵列', nameEn: 'Beat Array' },
      // 添加更多预设厂牌
    };
    
    // 尝试从节奏阵列API获取厂牌详情
    try {
      console.log('尝试从API获取厂牌信息...');
      const instance = axios.create({
        baseURL: BEAT_ARRAY_API_URL,
        headers: { token }
      });
      
      // 尝试获取厂牌列表，找到对应的厂牌
      console.log('发送请求到:', `${BEAT_ARRAY_API_URL}/label/getLabelList`);
      const response = await instance.get('/label/getLabelList');
      
      console.log('API响应状态:', response.data.status);
      if (response.data.status === 0) {
        const labels = response.data.data;
        console.log('获取到厂牌列表，共', labels.length, '个厂牌');
        
        // 打印所有厂牌ID以便调试
        console.log('所有厂牌ID:', labels.map(l => l.id));
        
        const label = labels.find(l => l.id === numericLabelId);
        
        if (label) {
          console.log('从API获取到厂牌信息:', {
            id: label.id,
            nameZh: label.nameZh,
            nameEn: label.nameEn
          });
          
          // 更新预设厂牌信息，以便下次使用
          defaultLabels[numericLabelId] = { 
            nameZh: label.nameZh, 
            nameEn: label.nameEn 
          };
          
          return {
            id: label.id,
            nameZh: label.nameZh,
            nameEn: label.nameEn
          };
        } else {
          console.log(`未在API返回的厂牌列表中找到ID为${numericLabelId}的厂牌`);
        }
      } else {
        console.log('API返回错误状态:', response.data.msg);
      }
    } catch (apiError) {
      console.error('从API获取厂牌信息失败:', apiError.message);
      if (apiError.response) {
        console.error('API错误响应:', apiError.response.status, apiError.response.data);
      }
    }
    
    // 如果API获取失败，使用预设的厂牌信息
    console.log('尝试使用预设的厂牌信息...');
    
    if (defaultLabels[numericLabelId]) {
      console.log('使用预设的厂牌信息:', defaultLabels[numericLabelId]);
      return {
        id: numericLabelId,
        ...defaultLabels[numericLabelId]
      };
    }
    
    // 如果没有预设信息，返回通用厂牌信息
    console.log('使用通用厂牌信息');
    return {
      id: numericLabelId,
      nameZh: '节奏阵列',
      nameEn: 'Beat Array'
    };
  } catch (error) {
    console.error('获取厂牌信息失败:', error);
    return {
      id: labelId,
      nameZh: '节奏阵列',
      nameEn: 'Beat Array'
    };
  } finally {
    console.log('-----------------------------------------------------');
  }
};

module.exports = {
  handleBeatArraySubmissionNotification,
  getLabelInfo
}; 