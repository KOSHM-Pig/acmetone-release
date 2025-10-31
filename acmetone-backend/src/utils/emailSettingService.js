const { EmailSetting } = require('../models');

// 邮件设置类型常量
const EMAIL_SETTINGS = {
  VERIFICATION_CODE: 'verification_code',
  EMAIL_VERIFICATION: 'email_verification',
  PASSWORD_RESET: 'password_reset',
  ALBUM_APPROVED: 'album_approved',
  ALBUM_REJECTED: 'album_rejected',
  VERIFICATION_STATUS_CHANGE: 'verification_status_change',
  BEAT_ARRAY_APPROVED: 'beat_array_approved',
  BEAT_ARRAY_REJECTED: 'beat_array_rejected'
};

// 检查指定类型的邮件通知是否启用
const isEmailEnabled = async (settingType) => {
  try {
    const setting = await EmailSetting.findByPk(settingType);
    // 如果设置不存在，默认为启用
    if (!setting) {
      return true;
    }
    return setting.enabled;
  } catch (error) {
    console.error(`检查邮件设置(${settingType})时出错:`, error);
    // 出错时默认为启用
    return true;
  }
};

// 获取所有邮件设置
const getAllEmailSettings = async () => {
  try {
    return await EmailSetting.findAll();
  } catch (error) {
    console.error('获取所有邮件设置时出错:', error);
    throw error;
  }
};

// 更新邮件设置
const updateEmailSetting = async (settingType, data, userId) => {
  try {
    const [setting, created] = await EmailSetting.findOrCreate({
      where: { settingType },
      defaults: {
        enabled: data.enabled !== undefined ? data.enabled : true,
        subject: data.subject || null,
        description: data.description || null,
        lastModifiedBy: userId
      }
    });

    if (!created) {
      await setting.update({
        enabled: data.enabled !== undefined ? data.enabled : setting.enabled,
        subject: data.subject || setting.subject,
        description: data.description || setting.description,
        lastModifiedBy: userId
      });
    }

    return setting;
  } catch (error) {
    console.error(`更新邮件设置(${settingType})时出错:`, error);
    throw error;
  }
};

// 初始化默认邮件设置
const initializeDefaultSettings = async () => {
  try {
    const defaultSettings = [
      {
        settingType: EMAIL_SETTINGS.VERIFICATION_CODE,
        enabled: true,
        subject: '极音记 - 邮箱验证码',
        description: '发送给用户的邮箱验证码'
      },
      {
        settingType: EMAIL_SETTINGS.EMAIL_VERIFICATION,
        enabled: true,
        subject: '极音记 - 邮箱验证',
        description: '用户注册后的邮箱验证链接'
      },
      {
        settingType: EMAIL_SETTINGS.PASSWORD_RESET,
        enabled: true,
        subject: '极音记 - 密码重置',
        description: '用户请求重置密码时发送的邮件'
      },
      {
        settingType: EMAIL_SETTINGS.ALBUM_APPROVED,
        enabled: true,
        subject: '极音记 - 专辑审核通过通知',
        description: '专辑审核通过时发送给用户的通知'
      },
      {
        settingType: EMAIL_SETTINGS.ALBUM_REJECTED,
        enabled: true,
        subject: '极音记 - 专辑审核未通过通知',
        description: '专辑审核未通过时发送给用户的通知'
      },
      {
        settingType: EMAIL_SETTINGS.VERIFICATION_STATUS_CHANGE,
        enabled: true,
        subject: '极音记 - 实名认证状态变更通知',
        description: '用户实名认证状态变更时发送的通知'
      },
      {
        settingType: EMAIL_SETTINGS.BEAT_ARRAY_APPROVED,
        enabled: true,
        subject: '节奏阵列 - 投稿审核通过通知',
        description: '节奏阵列投稿审核通过时发送给用户的通知',
        template: `尊敬的{{author}}：

您好！

我们很高兴地通知您，您的作品《{{title}}》已通过{{labelNameZh}}({{labelNameEn}})的审核。

审核意见：
{{comment}}

感谢您的投稿！

祝好，
{{labelNameZh}}团队`
      },
      {
        settingType: EMAIL_SETTINGS.BEAT_ARRAY_REJECTED,
        enabled: true,
        subject: '节奏阵列 - 投稿审核未通过通知',
        description: '节奏阵列投稿审核未通过时发送给用户的通知',
        template: `尊敬的{{author}}：

您好！

很遗憾，您的作品《{{title}}》未能通过{{labelNameZh}}({{labelNameEn}})的审核。

拒绝原因：
{{reason}}

欢迎您继续改进作品后再次投稿。

祝好，
{{labelNameZh}}团队`
      }
    ];

    // 批量创建或更新默认设置
    for (const setting of defaultSettings) {
      await EmailSetting.findOrCreate({
        where: { settingType: setting.settingType },
        defaults: setting
      });
    }

    console.log('默认邮件设置初始化完成');
  } catch (error) {
    console.error('初始化默认邮件设置时出错:', error);
  }
};

module.exports = {
  EMAIL_SETTINGS,
  isEmailEnabled,
  getAllEmailSettings,
  updateEmailSetting,
  initializeDefaultSettings
}; 