const express = require('express');
const router = express.Router();
const { EmailSetting, User } = require('../models');
const { auth, adminAuth } = require('../middleware/auth');
const { EMAIL_SETTINGS, getAllEmailSettings, updateEmailSetting } = require('../utils/emailSettingService');

// 获取所有邮件设置
router.get('/', auth, adminAuth, async (req, res) => {
  try {
    const settings = await getAllEmailSettings();
    res.json(settings);
  } catch (error) {
    console.error('获取邮件设置失败:', error);
    res.status(500).json({ message: '获取邮件设置失败' });
  }
});

// 获取邮件设置类型常量
router.get('/types', auth, adminAuth, (req, res) => {
  try {
    res.json(EMAIL_SETTINGS);
  } catch (error) {
    console.error('获取邮件设置类型失败:', error);
    res.status(500).json({ message: '获取邮件设置类型失败' });
  }
});

// 更新邮件设置
router.put('/:settingType', auth, adminAuth, async (req, res) => {
  try {
    const { settingType } = req.params;
    const { enabled, subject, description } = req.body;
    
    // 验证设置类型是否有效
    const validTypes = Object.values(EMAIL_SETTINGS);
    if (!validTypes.includes(settingType)) {
      return res.status(400).json({ message: '无效的邮件设置类型' });
    }
    
    // 更新设置
    const updatedSetting = await updateEmailSetting(
      settingType, 
      { enabled, subject, description },
      req.user.id
    );
    
    // 获取修改者信息
    let modifiedBy = null;
    if (updatedSetting.lastModifiedBy) {
      modifiedBy = await User.findByPk(updatedSetting.lastModifiedBy, {
        attributes: ['id', 'username', 'email']
      });
    }
    
    res.json({
      ...updatedSetting.toJSON(),
      modifiedBy
    });
  } catch (error) {
    console.error('更新邮件设置失败:', error);
    res.status(500).json({ message: '更新邮件设置失败' });
  }
});

// 批量更新邮件设置
router.put('/', auth, adminAuth, async (req, res) => {
  try {
    const { settings } = req.body;
    
    if (!Array.isArray(settings)) {
      return res.status(400).json({ message: '无效的请求格式，应为设置数组' });
    }
    
    // 批量更新设置
    const updatedSettings = [];
    for (const setting of settings) {
      if (!setting.settingType) continue;
      
      const updatedSetting = await updateEmailSetting(
        setting.settingType,
        {
          enabled: setting.enabled,
          subject: setting.subject,
          description: setting.description
        },
        req.user.id
      );
      
      updatedSettings.push(updatedSetting);
    }
    
    res.json(updatedSettings);
  } catch (error) {
    console.error('批量更新邮件设置失败:', error);
    res.status(500).json({ message: '批量更新邮件设置失败' });
  }
});

module.exports = router; 