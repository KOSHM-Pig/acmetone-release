const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { EmailSetting, UserEmailTemplate } = require('../models');
const { EMAIL_SETTINGS } = require('../utils/emailSettingService');
const { handleBeatArraySubmissionNotification, getLabelInfo } = require('../utils/beatArrayNotificationService');
const axios = require('axios');

// 节奏阵列API基础URL
const BEAT_ARRAY_API_URL = 'https://www.beatarray.com/api';

// 获取节奏阵列邮件设置
router.get('/email-settings', auth, async (req, res) => {
  try {
    // 验证节奏阵列Token
    const beatArrayToken = req.headers['beat-array-token'];
    if (!beatArrayToken) {
      return res.status(401).json({ 
        success: false, 
        message: '缺少节奏阵列令牌' 
      });
    }
    
    // 获取用户ID
    const userId = req.user.id;
    
    // 获取用户的自定义模板
    const approvedTemplate = await UserEmailTemplate.findOne({
      where: {
        userId,
        templateType: 'beat_array_approved'
      }
    });
    
    const rejectedTemplate = await UserEmailTemplate.findOne({
      where: {
        userId,
        templateType: 'beat_array_rejected'
      }
    });
    
    // 如果没有找到用户自定义模板，则使用系统默认模板
    const defaultApprovedSetting = await EmailSetting.findByPk(EMAIL_SETTINGS.BEAT_ARRAY_APPROVED);
    const defaultRejectedSetting = await EmailSetting.findByPk(EMAIL_SETTINGS.BEAT_ARRAY_REJECTED);

    // 构建返回数据
    const settings = {
      approved: {
        enabled: approvedTemplate ? approvedTemplate.enabled : (defaultApprovedSetting ? defaultApprovedSetting.enabled : true),
        subject: approvedTemplate ? approvedTemplate.subject : (defaultApprovedSetting ? defaultApprovedSetting.subject : '节奏阵列 - 投稿审核通过通知'),
        template: approvedTemplate ? approvedTemplate.template : (defaultApprovedSetting && defaultApprovedSetting.template ? defaultApprovedSetting.template : `尊敬的{{author}}：

您好！

我们很高兴地通知您，您的作品《{{title}}》已通过{{labelNameZh}}({{labelNameEn}})的审核。

审核意见：
{{comment}}

感谢您的投稿！

祝好，
{{labelNameZh}}团队`)
      },
      rejected: {
        enabled: rejectedTemplate ? rejectedTemplate.enabled : (defaultRejectedSetting ? defaultRejectedSetting.enabled : true),
        subject: rejectedTemplate ? rejectedTemplate.subject : (defaultRejectedSetting ? defaultRejectedSetting.subject : '节奏阵列 - 投稿审核未通过通知'),
        template: rejectedTemplate ? rejectedTemplate.template : (defaultRejectedSetting && defaultRejectedSetting.template ? defaultRejectedSetting.template : `尊敬的{{author}}：

您好！

很遗憾，您的作品《{{title}}》未能通过{{labelNameZh}}({{labelNameEn}})的审核。

拒绝原因：
{{reason}}

欢迎您继续改进作品后再次投稿。

祝好，
{{labelNameZh}}团队`)
      }
    };

    res.json({
      success: true,
      settings
    });
  } catch (error) {
    console.error('获取节奏阵列邮件设置失败:', error);
    res.status(500).json({ 
      success: false, 
      message: '获取邮件设置失败' 
    });
  }
});

// 更新节奏阵列邮件设置
router.post('/email-settings', auth, async (req, res) => {
  try {
    // 验证节奏阵列Token
    const beatArrayToken = req.headers['beat-array-token'];
    if (!beatArrayToken) {
      return res.status(401).json({ 
        success: false, 
        message: '缺少节奏阵列令牌' 
      });
    }
    
    const userId = req.user.id;
    const { approved, rejected, labelId } = req.body;
    
    // 更新通过邮件设置
    if (approved) {
      const [approvedTemplate, created] = await UserEmailTemplate.findOrCreate({
        where: {
          userId,
          templateType: 'beat_array_approved'
        },
        defaults: {
          userId,
          templateType: 'beat_array_approved',
          enabled: approved.enabled !== undefined ? approved.enabled : true,
          subject: approved.subject || '节奏阵列 - 投稿审核通过通知',
          template: approved.template || '',
          labelId: labelId || null
        }
      });

      if (!created) {
        await approvedTemplate.update({
          enabled: approved.enabled !== undefined ? approved.enabled : approvedTemplate.enabled,
          subject: approved.subject || approvedTemplate.subject,
          template: approved.template || approvedTemplate.template,
          labelId: labelId || approvedTemplate.labelId
        });
      }
    }
    
    // 更新拒绝邮件设置
    if (rejected) {
      const [rejectedTemplate, created] = await UserEmailTemplate.findOrCreate({
        where: {
          userId,
          templateType: 'beat_array_rejected'
        },
        defaults: {
          userId,
          templateType: 'beat_array_rejected',
          enabled: rejected.enabled !== undefined ? rejected.enabled : true,
          subject: rejected.subject || '节奏阵列 - 投稿审核未通过通知',
          template: rejected.template || '',
          labelId: labelId || null
        }
      });

      if (!created) {
        await rejectedTemplate.update({
          enabled: rejected.enabled !== undefined ? rejected.enabled : rejectedTemplate.enabled,
          subject: rejected.subject || rejectedTemplate.subject,
          template: rejected.template || rejectedTemplate.template,
          labelId: labelId || rejectedTemplate.labelId
        });
      }
    }

    res.json({
      success: true,
      message: '邮件设置已更新'
    });
  } catch (error) {
    console.error('更新节奏阵列邮件设置失败:', error);
    res.status(500).json({ 
      success: false, 
      message: '更新邮件设置失败' 
    });
  }
});

// 处理投稿审批后的邮件通知
router.post('/notify-submission', auth, async (req, res) => {
  try {
    // 验证节奏阵列Token
    const beatArrayToken = req.headers['beat-array-token'];
    if (!beatArrayToken) {
      return res.status(401).json({ 
        success: false, 
        message: '缺少节奏阵列令牌' 
      });
    }
    
    // 获取请求参数
    const { submissionId, action, comment, labelId, title, author, userEmail, labelNameZh, labelNameEn } = req.body;
    const userId = req.user.id;
    
    console.log('-----------------------------------------------------');
    console.log('收到投稿审批邮件通知请求:');
    console.log('投稿ID:', submissionId);
    console.log('操作类型:', action);
    console.log('审核意见/拒绝原因:', comment);
    console.log('厂牌ID:', labelId);
    console.log('厂牌中文名:', labelNameZh);
    console.log('厂牌英文名:', labelNameEn);
    console.log('作品标题:', title);
    console.log('作者:', author);
    console.log('用户邮箱:', userEmail);
    console.log('处理用户ID:', userId);
    
    if (!submissionId || !action || !labelId) {
      console.error('请求参数不完整');
      return res.status(400).json({
        success: false,
        message: '请求参数不完整'
      });
    }
    
    if (!['approve', 'reject'].includes(action)) {
      console.error('无效的操作类型:', action);
      return res.status(400).json({
        success: false,
        message: '无效的操作类型'
      });
    }
    
    // 直接使用前端提供的数据构造投稿信息
    const submissionData = {
      id: submissionId,
      title: title || '未知作品',
      author: author || '未知作者',
      user: {
        id: null,
        name: author || '未知用户',
        mail: userEmail
      }
    };
    
    // 检查是否提供了用户邮箱
    if (!userEmail) {
      console.error('缺少用户邮箱，无法发送通知');
      return res.status(400).json({
        success: false,
        message: '缺少用户邮箱，无法发送通知'
      });
    }
    
    console.log('投稿数据:', submissionData);
    
    // 获取厂牌信息
    console.log('正在获取厂牌信息...');
    // 如果前端提供了厂牌名称，优先使用前端提供的
    let labelInfo;
    if (labelNameZh && labelNameEn) {
      labelInfo = {
        id: labelId,
        nameZh: labelNameZh,
        nameEn: labelNameEn
      };
      console.log('使用前端提供的厂牌信息:', labelInfo);
    } else {
      // 否则从API获取
      labelInfo = await getLabelInfo(labelId, beatArrayToken);
      console.log('从API获取到厂牌信息:', labelInfo);
    }
    
    // 处理通知
    console.log('正在处理通知...');
    const result = await handleBeatArraySubmissionNotification(
      submissionData,
      action,
      comment,
      labelInfo,
      userId
    );
    
    if (result.success) {
      console.log('通知处理成功:', result.message);
      return res.json({
        success: true,
        message: result.message
      });
    } else {
      console.error('通知处理失败:', result.message);
      return res.status(500).json({
        success: false,
        message: result.message,
        error: result.error
      });
    }
  } catch (error) {
    console.error('处理投稿审批邮件通知请求出错:', error);
    return res.status(500).json({
      success: false,
      message: '处理请求失败',
      error: error.message
    });
  }
});

module.exports = router; 