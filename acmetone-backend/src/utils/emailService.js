const nodemailer = require('nodemailer');
const { isEmailEnabled, EMAIL_SETTINGS } = require('./emailSettingService');
const { EmailSetting } = require('../models');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const readFileAsync = promisify(fs.readFile);

// 正确导入 EmailLog 模型
const EmailLog = require('../models/EmailLog');

// 配置静态文件URL和前端URL
const STATIC_BASE_URL = 'http://47.121.194.8';
const FRONTEND_URL = 'http://www.acmetone.com';

// 创建邮件发送器
const transporter = nodemailer.createTransport({
  host: 'smtp.exmail.qq.com',
  port: 465,
  secure: true, // 使用SSL
  auth: {
    user: 'website@acmetone.com',
    pass: 'dk9zSRwnd73D7khm' // 授权码
  }
});

// 通用邮件发送函数
const sendMail = async (to, subject, content, type = 'general') => {
  try {
    console.log('-----------------------------------------------------');
    console.log('开始发送邮件');
    console.log('收件人:', to);
    console.log('主题:', subject);
    console.log('邮件类型:', type);
    console.log('邮件内容:');
    console.log(content);
    
    // 创建HTML版本的邮件内容
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
        ${content.split('\n').map(line => `<p style="color: #555; font-size: 16px; line-height: 1.5;">${line}</p>`).join('')}
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #888; font-size: 14px;">
          <p>此邮件由系统自动发送，请勿回复。</p>
          <p>&copy; ${new Date().getFullYear()} 极音记 版权所有</p>
        </div>
      </div>
    `;
    
    // 邮件内容
    const mailOptions = {
      from: '"极音记" <website@acmetone.com>',
      to,
      subject,
      text: content,
      html: htmlContent
    };
    
    console.log('邮件配置:', {
      host: process.env.SMTP_HOST || 'smtp.exmail.qq.com',
      port: process.env.SMTP_PORT || 465,
      user: process.env.SMTP_USER || 'website@acmetone.com'
    });
    
    // 发送邮件
    console.log('正在连接SMTP服务器并发送邮件...');
    const info = await transporter.sendMail(mailOptions);
    console.log('邮件已发送:', info.messageId);
    console.log('邮件发送详情:', info);
    
    // 记录邮件发送日志
    try {
      await EmailLog.create({
        to,
        subject,
        content,
        htmlContent,
        type,
        status: 'success',
        messageId: info.messageId
      });
      console.log('邮件日志已记录');
    } catch (logError) {
      console.error('记录邮件日志失败:', logError);
    }
    
    console.log('-----------------------------------------------------');
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('发送邮件失败:', error);
    console.error('错误详情:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: error.code
    });
    
    // 记录失败的邮件日志
    try {
      await EmailLog.create({
        to,
        subject,
        content,
        type,
        status: 'failed',
        error: error.message
      });
      console.log('失败邮件日志已记录');
    } catch (logError) {
      console.error('记录失败邮件日志失败:', logError);
    }
    
    console.log('-----------------------------------------------------');
    return { success: false, error: error.message };
  }
};

// 发送邮箱验证码
const sendVerificationCode = async (to, code) => {
  try {
    // 检查此类型邮件是否启用
    const enabled = await isEmailEnabled(EMAIL_SETTINGS.VERIFICATION_CODE);
    if (!enabled) {
      console.log('验证码邮件功能已禁用');
      return { success: false, disabled: true };
    }
    
    // 邮件内容
    const mailOptions = {
      from: '"极音记" <website@acmetone.com>',
      to,
      subject: '极音记 - 邮箱验证码',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
          <h2 style="color: #333; text-align: center;">极音记 - 邮箱验证码</h2>
          <p style="color: #555; font-size: 16px; line-height: 1.5;">您好，</p>
          <p style="color: #555; font-size: 16px; line-height: 1.5;">您正在注册极音记账户，请使用以下验证码完成注册：</p>
          <div style="text-align: center; margin: 30px 0;">
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 4px; font-size: 24px; font-weight: bold; letter-spacing: 5px;">
              ${code}
            </div>
          </div>
          <p style="color: #555; font-size: 16px; line-height: 1.5;">验证码有效期为10分钟。如果您没有注册极音记账户，请忽略此邮件。</p>
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #888; font-size: 14px;">
            <p>此邮件由系统自动发送，请勿回复。</p>
            <p>&copy; ${new Date().getFullYear()} 极音记 版权所有</p>
          </div>
        </div>
      `
    };
    
    // 发送邮件
    console.log('正在发送验证码邮件到:', to);
    console.log('邮件配置:', {
      host: process.env.SMTP_HOST || 'smtp.exmail.qq.com',
      port: process.env.SMTP_PORT || 465,
      user: process.env.SMTP_USER || 'website@acmetone.com'
    });
    
    const content = `您好，

您正在注册极音记账户，请使用以下验证码完成注册：

${code}

验证码有效期为10分钟。如果您没有注册极音记账户，请忽略此邮件。`;
    
    const result = await sendMail(to, mailOptions.subject, content, 'verification_code');
    console.log('验证码邮件已发送:', result.messageId);
    return result;
  } catch (error) {
    console.error('发送验证码邮件失败:', error);
    console.error('错误详情:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: error.code
    });
    return { success: false, error: error.message };
  }
};

// 发送重置密码验证码
const sendPasswordResetCode = async (to, code) => {
  try {
    // 检查此类型邮件是否启用
    const enabled = await isEmailEnabled(EMAIL_SETTINGS.PASSWORD_RESET);
    if (!enabled) {
      console.log('密码重置邮件功能已禁用');
      return { success: false, disabled: true };
    }
    
    // 邮件内容
    const subject = '极音记 - 重置密码验证码';
    const content = `您好，

您正在申请重置您在极音记的账户密码。

您的验证码是: ${code}

此验证码有效期为10分钟。如果您没有请求重置密码，请忽略此邮件。`;
    
    // 发送邮件
    const result = await sendMail(to, subject, content, 'password_reset_code');
    console.log('重置密码验证码邮件已发送:', result.messageId);
    return result;
  } catch (error) {
    console.error('发送重置密码验证码邮件失败:', error);
    return { success: false, error: error.message };
  }
};

// 发送验证邮件
const sendVerificationEmail = async (to, token) => {
  try {
    // 检查此类型邮件是否启用
    const enabled = await isEmailEnabled(EMAIL_SETTINGS.EMAIL_VERIFICATION);
    if (!enabled) {
      console.log('验证邮件功能已禁用');
      return { success: false, disabled: true };
    }
    
    // 构建验证链接
    const verificationLink = `${STATIC_BASE_URL}/api/auth/verify-email?token=${token}`;
    
    // 邮件内容
    const subject = '极音记 - 邮箱验证';
    const content = `您好，

感谢您注册极音记账户。请点击以下链接验证您的邮箱地址：

${verificationLink}

此链接有效期为24小时。如果您没有注册极音记账户，请忽略此邮件。`;
    
    // 发送邮件
    const result = await sendMail(to, subject, content, 'email_verification');
    console.log('验证邮件已发送:', result.messageId);
    return result;
  } catch (error) {
    console.error('发送验证邮件失败:', error);
    return { success: false, error: error.message };
  }
};

// 发送密码重置邮件
const sendPasswordResetEmail = async (to, token) => {
  try {
    // 检查此类型邮件是否启用
    const enabled = await isEmailEnabled(EMAIL_SETTINGS.PASSWORD_RESET);
    if (!enabled) {
      console.log('密码重置邮件功能已禁用');
      return { success: false, disabled: true };
    }
    
    // 构建重置链接
    const resetLink = `${FRONTEND_URL}/reset-password?token=${token}`;
    
    // 邮件内容
    const subject = '极音记 - 密码重置';
    const content = `您好，

我们收到了您的密码重置请求。请点击以下链接重置您的密码：

${resetLink}

此链接有效期为1小时。如果您没有请求重置密码，请忽略此邮件。`;
    
    // 发送邮件
    const result = await sendMail(to, subject, content, 'password_reset');
    console.log('密码重置邮件已发送:', result.messageId);
    return result;
  } catch (error) {
    console.error('发送密码重置邮件失败:', error);
    return { success: false, error: error.message };
  }
};

// 发送专辑审核通过通知
const sendAlbumApprovedEmail = async (to, albumData) => {
  try {
    // 检查此类型邮件是否启用
    const enabled = await isEmailEnabled(EMAIL_SETTINGS.ALBUM_APPROVED);
    if (!enabled) {
      console.log('专辑审核通过邮件功能已禁用');
      return { success: false, disabled: true };
    }
    
    const { title, id } = albumData;
    const albumLink = `${FRONTEND_URL}/albums/${id}`;
    const albumLinksManagementUrl = `${FRONTEND_URL}/admin/album-links`;
    
    // 邮件内容
    const subject = '极音记 - 专辑审核通过通知';
    const content = `您好，

恭喜您！您的专辑 ${title} 已通过审核。

您可以通过以下链接查看专辑详情：
${albumLink}

系统已自动为您的专辑创建了一个专辑链接页面（默认为隐藏状态）。您可以在管理后台的专辑链接管理中找到它，并进行编辑和发布：
${albumLinksManagementUrl}

您的专辑将按照发行日期在各大音乐平台上线，请耐心等待。`;
    
    // 发送邮件
    const result = await sendMail(to, subject, content, 'album_approved');
    console.log('专辑审核通过邮件已发送:', result.messageId);
    return result;
  } catch (error) {
    console.error('发送专辑审核通过邮件失败:', error);
    return { success: false, error: error.message };
  }
};

// 发送专辑审核拒绝通知
const sendAlbumRejectedEmail = async (to, albumData) => {
  try {
    // 检查此类型邮件是否启用
    const enabled = await isEmailEnabled(EMAIL_SETTINGS.ALBUM_REJECTED);
    if (!enabled) {
      console.log('专辑审核拒绝邮件功能已禁用');
      return { success: false, disabled: true };
    }
    
    const { title, id, comment } = albumData;
    const albumLink = `${FRONTEND_URL}/albums/${id}`;
    
    // 邮件内容
    const subject = '极音记 - 专辑审核未通过通知';
    const content = `您好，

很遗憾，您的专辑 ${title} 未通过审核。

拒绝原因：
            ${comment || '未提供具体原因'}

您可以通过以下链接查看专辑详情并进行修改：
${albumLink}

修改完成后，您可以重新提交审核。如有任何疑问，请联系客服。`;
    
    // 发送邮件
    const result = await sendMail(to, subject, content, 'album_rejected');
    console.log('专辑审核拒绝邮件已发送:', result.messageId);
    return result;
  } catch (error) {
    console.error('发送专辑审核拒绝邮件失败:', error);
    return { success: false, error: error.message };
  }
};

// 发送实名认证状态变更通知
const sendVerificationStatusEmail = async (to, verificationData) => {
  try {
    // 检查此类型邮件是否启用
    const enabled = await isEmailEnabled(EMAIL_SETTINGS.VERIFICATION_STATUS_CHANGE);
    if (!enabled) {
      console.log('实名认证状态变更邮件功能已禁用');
      return { success: false, disabled: true };
    }
    
    const { status, comment } = verificationData;
    const isApproved = status === 'approved';
    const verificationLink = `${FRONTEND_URL}/user-verification`;
    
    // 邮件内容
    const subject = `极音记 - 实名认证${isApproved ? '通过' : '未通过'}通知`;
    let content;
    
    if (isApproved) {
      content = `您好，

恭喜您！您的实名认证已通过审核。

现在您可以提交专辑进行审核了。

您可以通过以下链接查看认证信息：
${verificationLink}

如有任何疑问，请联系客服。`;
    } else {
      content = `您好，

很遗憾，您的实名认证未通过审核。

拒绝原因：
              ${comment || '未提供具体原因'}

您可以通过以下链接重新提交实名认证：
${verificationLink}

如有任何疑问，请联系客服。`;
    }
    
    // 发送邮件
    const result = await sendMail(to, subject, content, 'verification_status');
    console.log(`实名认证${isApproved ? '通过' : '未通过'}邮件已发送:`, result.messageId);
    return result;
  } catch (error) {
    console.error('发送实名认证状态变更邮件失败:', error);
    return { success: false, error: error.message };
  }
};

// 发送节奏阵列投稿审核通过通知
const sendBeatArrayApprovedEmail = async (to, data) => {
  try {
    console.log('-----------------------------------------------------');
    console.log('开始发送节奏阵列专辑上架通知邮件');
    console.log('收件人:', to);
    console.log('邮件数据:', JSON.stringify(data, null, 2));
    
    // 检查此类型邮件是否启用
    const enabled = await isEmailEnabled(EMAIL_SETTINGS.BEAT_ARRAY_APPROVED);
    if (!enabled) {
      console.log('节奏阵列专辑上架通知邮件功能已禁用');
      return { success: false, disabled: true };
    }
    
    // 尝试获取用户自定义模板
    let template = null;
    let subject = '节奏阵列 - 专辑上架通知';
    
    if (data.userId) {
      console.log(`尝试获取用户(${data.userId})的自定义模板`);
      // 如果提供了用户ID，尝试获取用户自定义模板
      const { UserEmailTemplate } = require('../models');
      
      // 首先尝试获取特定厂牌的模板
      let userTemplate = null;
      if (data.labelId) {
        console.log(`尝试获取针对厂牌(${data.labelId})的特定模板`);
        userTemplate = await UserEmailTemplate.findOne({
          where: {
            userId: data.userId,
            templateType: 'beat_array_approved',
            labelId: data.labelId
          }
        });
      }
      
      // 如果没有找到特定厂牌的模板，尝试获取通用模板（labelId为null的模板）
      if (!userTemplate || !userTemplate.enabled) {
        console.log('未找到特定厂牌模板或模板已禁用，尝试获取通用模板');
        userTemplate = await UserEmailTemplate.findOne({
          where: {
            userId: data.userId,
            templateType: 'beat_array_approved',
            labelId: null
          }
        });
      }
      
      // 如果仍然没有找到，尝试获取任何该用户的模板
      if (!userTemplate || !userTemplate.enabled) {
        console.log('未找到通用模板，尝试获取任何模板');
        userTemplate = await UserEmailTemplate.findOne({
          where: {
            userId: data.userId,
            templateType: 'beat_array_approved'
          }
        });
      }
      
      if (userTemplate && userTemplate.enabled) {
        console.log('找到用户自定义模板，使用自定义模板');
        template = userTemplate.template;
        subject = userTemplate.subject || '节奏阵列 - 专辑上架通知';
      } else {
        console.log('未找到用户自定义模板或模板已禁用');
      }
    }
    
    // 如果没有找到用户自定义模板，则使用默认模板
    if (!template) {
      console.log('使用系统默认模板');
      // 获取邮件设置
      const setting = await EmailSetting.findByPk(EMAIL_SETTINGS.BEAT_ARRAY_APPROVED);
      subject = setting?.subject || '节奏阵列 - 专辑上架通知';
      console.log('邮件主题:', subject);
      
      // 获取模板内容
      template = setting?.template || `尊敬的{{author}}：

您好，感谢您投稿 {{labelNameZh}} {{labelNameEn}}！

恭喜您！您的专辑《{{title}}》已成功上架。

{{comment}}

祝好，
{{labelNameZh}}团队`;
    }

    // 提取邮件数据中的变量值
    const { title, author, labelNameZh, labelNameEn, comment } = data;
    
    // 替换主题中的变量
    let processedSubject = subject
      .replace(/{{title}}/g, title || '')
      .replace(/{{author}}/g, author || '')
      .replace(/{{labelNameZh}}/g, labelNameZh || '节奏阵列')
      .replace(/{{labelNameEn}}/g, labelNameEn || 'Beat Array');
    
    // 替换内容中的变量
    let content = template
      .replace(/{{title}}/g, title || '')
      .replace(/{{author}}/g, author || '')
      .replace(/{{labelNameZh}}/g, labelNameZh || '节奏阵列')
      .replace(/{{labelNameEn}}/g, labelNameEn || 'Beat Array')
      .replace(/{{comment}}/g, comment || '');
    
    console.log('最终邮件主题:', processedSubject);
    console.log('最终邮件内容:');
    console.log(content);
    
    // 创建HTML版本的邮件内容
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
        ${content.split('\n').map(line => `<p style="color: #555; font-size: 16px; line-height: 1.5;">${line}</p>`).join('')}
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #888; font-size: 14px;">
          <p>此邮件由系统自动发送，请勿回复。</p>
          <p>&copy; ${new Date().getFullYear()} 极音记 版权所有</p>
        </div>
      </div>
    `;
    
    // 邮件内容
    const mailOptions = {
      from: '"极音记" <website@acmetone.com>',
      to,
      subject: processedSubject,
      text: content,
      html: htmlContent
    };
    
    // 发送邮件
    console.log('正在发送邮件...');
    const info = await transporter.sendMail(mailOptions);
    console.log('邮件已发送:', info.messageId);
    
    // 记录邮件日志
    try {
      await EmailLog.create({
        to,
        subject: processedSubject,
        content,
        htmlContent,
        type: 'beat_array_approved',
        status: 'success',
        messageId: info.messageId
      });
      console.log('邮件日志已记录');
    } catch (logError) {
      console.error('记录邮件日志失败:', logError);
    }
    
    console.log('邮件发送结果:', { success: true, messageId: info.messageId });
    console.log('节奏阵列专辑上架通知邮件发送完成');
    console.log('-----------------------------------------------------');
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('发送节奏阵列专辑上架通知邮件失败:', error);
    return { success: false, message: '发送邮件失败', error: error.message };
  }
};

// 发送节奏阵列投稿审核拒绝通知
const sendBeatArrayRejectedEmail = async (to, data) => {
  try {
    console.log('-----------------------------------------------------');
    console.log('开始发送节奏阵列投稿审核拒绝邮件');
    console.log('收件人:', to);
    console.log('邮件数据:', JSON.stringify(data, null, 2));
    
    // 检查此类型邮件是否启用
    const enabled = await isEmailEnabled(EMAIL_SETTINGS.BEAT_ARRAY_REJECTED);
    if (!enabled) {
      console.log('节奏阵列投稿审核拒绝邮件功能已禁用');
      return { success: false, disabled: true };
    }
    
    // 尝试获取用户自定义模板
    let template = null;
    let subject = '节奏阵列 - 投稿审核未通过通知';
    
    if (data.userId) {
      console.log(`尝试获取用户(${data.userId})的自定义模板`);
      // 如果提供了用户ID，尝试获取用户自定义模板
      const { UserEmailTemplate } = require('../models');
      
      // 首先尝试获取特定厂牌的模板
      let userTemplate = null;
      if (data.labelId) {
        console.log(`尝试获取针对厂牌(${data.labelId})的特定模板`);
        userTemplate = await UserEmailTemplate.findOne({
          where: {
            userId: data.userId,
            templateType: 'beat_array_rejected',
            labelId: data.labelId
          }
        });
      }
      
      // 如果没有找到特定厂牌的模板，尝试获取通用模板（labelId为null的模板）
      if (!userTemplate || !userTemplate.enabled) {
        console.log('未找到特定厂牌模板或模板已禁用，尝试获取通用模板');
        userTemplate = await UserEmailTemplate.findOne({
          where: {
            userId: data.userId,
            templateType: 'beat_array_rejected',
            labelId: null
          }
        });
      }
      
      // 如果仍然没有找到，尝试获取任何该用户的模板
      if (!userTemplate || !userTemplate.enabled) {
        console.log('未找到通用模板，尝试获取任何模板');
        userTemplate = await UserEmailTemplate.findOne({
          where: {
            userId: data.userId,
            templateType: 'beat_array_rejected'
          }
        });
      }
      
      if (userTemplate && userTemplate.enabled) {
        console.log('找到用户自定义模板，使用自定义模板');
        template = userTemplate.template;
        subject = userTemplate.subject || '节奏阵列 - 投稿审核未通过通知';
      } else {
        console.log('未找到用户自定义模板或模板已禁用');
      }
    }
    
    // 如果没有找到用户自定义模板，则使用默认模板
    if (!template) {
      console.log('使用系统默认模板');
      // 获取邮件设置
      const setting = await EmailSetting.findByPk(EMAIL_SETTINGS.BEAT_ARRAY_REJECTED);
      subject = setting?.subject || '节奏阵列 - 投稿审核未通过通知';
      console.log('邮件主题:', subject);
      
      // 获取模板内容
      template = setting?.template || `尊敬的{{author}}：

您好！

很遗憾，您的作品《{{title}}》未能通过{{labelNameZh}}({{labelNameEn}})的审核。

拒绝原因：
{{reason}}

欢迎您继续改进作品后再次投稿。

祝好，
{{labelNameZh}}团队`;
    }

    // 提取邮件数据中的变量值
    const { title, author, labelNameZh, labelNameEn, reason } = data;
    
    // 替换主题中的变量
    let processedSubject = subject
      .replace(/{{title}}/g, title || '')
      .replace(/{{author}}/g, author || '')
      .replace(/{{labelNameZh}}/g, labelNameZh || '节奏阵列')
      .replace(/{{labelNameEn}}/g, labelNameEn || 'Beat Array');
    
    // 替换内容中的变量
    let content = template
      .replace(/{{title}}/g, title || '')
      .replace(/{{author}}/g, author || '')
      .replace(/{{labelNameZh}}/g, labelNameZh || '节奏阵列')
      .replace(/{{labelNameEn}}/g, labelNameEn || 'Beat Array')
      .replace(/{{reason}}/g, reason || '');
    
    console.log('最终邮件主题:', processedSubject);
    console.log('最终邮件内容:');
    console.log(content);
    
    // 创建HTML版本的邮件内容
    const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
        ${content.split('\n').map(line => `<p style="color: #555; font-size: 16px; line-height: 1.5;">${line}</p>`).join('')}
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #888; font-size: 14px;">
            <p>此邮件由系统自动发送，请勿回复。</p>
            <p>&copy; ${new Date().getFullYear()} 极音记 版权所有</p>
          </div>
        </div>
    `;
    
    // 邮件内容
    const mailOptions = {
      from: '"极音记" <website@acmetone.com>',
      to,
      subject: processedSubject,
      text: content,
      html: htmlContent
    };
    
    // 发送邮件
    console.log('正在发送邮件...');
    const info = await transporter.sendMail(mailOptions);
    console.log('邮件已发送:', info.messageId);
    
    // 记录邮件日志
    try {
      await EmailLog.create({
        to,
        subject: processedSubject,
        content,
        htmlContent,
        type: 'beat_array_rejected',
        status: 'success',
        messageId: info.messageId
      });
      console.log('邮件日志已记录');
    } catch (logError) {
      console.error('记录邮件日志失败:', logError);
    }
    
    console.log('邮件发送结果:', { success: true, messageId: info.messageId });
    console.log('节奏阵列投稿审核拒绝邮件发送完成');
    console.log('-----------------------------------------------------');
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('发送节奏阵列投稿审核拒绝邮件失败:', error);
    return { success: false, message: '发送邮件失败', error: error.message };
  }
};

// 发送专辑上架通知邮件
const sendAlbumReleasedEmail = async (to, data) => {
  try {
    console.log('-----------------------------------------------------');
    console.log('开始发送专辑上架通知邮件');
    console.log('收件人:', to);
    console.log('邮件数据:', JSON.stringify(data, null, 2));
    
    // 提取邮件数据中的变量值
    const { title, author, labelNameZh, labelNameEn } = data;
    
    // 设置邮件主题
    const subject = '恭喜！您的专辑已成功上架';
    
    // 设置邮件内容
    const content = `尊敬的${author || '用户'}：

您好！

我们很高兴地通知您，您的专辑《${title || ''}》已经成功上架到国内音乐平台。

您现在可以在各大音乐平台上搜索并欣赏您的作品了。感谢您选择${labelNameZh || '极音记'}(${labelNameEn || 'Acmetone'})发行您的音乐作品。

祝您音乐之旅愉快！

${labelNameZh || '极音记'}团队`;
    
    console.log('最终邮件主题:', subject);
    console.log('最终邮件内容:');
    console.log(content);
    
    // 创建HTML版本的邮件内容
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
        ${content.split('\n').map(line => `<p style="color: #555; font-size: 16px; line-height: 1.5;">${line}</p>`).join('')}
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #888; font-size: 14px;">
          <p>此邮件由系统自动发送，请勿回复。</p>
          <p>&copy; ${new Date().getFullYear()} 极音记 版权所有</p>
        </div>
      </div>
    `;
    
    // 邮件内容
    const mailOptions = {
      from: '"极音记" <website@acmetone.com>',
      to,
      subject,
      text: content,
      html: htmlContent
    };
    
    // 发送邮件
    console.log('正在发送邮件...');
    const info = await transporter.sendMail(mailOptions);
    console.log('邮件已发送:', info.messageId);
    
    // 使用Sequelize模型记录邮件日志
    try {
      const { EmailLog } = require('../models');
      
      await EmailLog.create({
        to: to,
        subject: subject,
        content: content,
        htmlContent: htmlContent,
        type: 'album_released',
        status: 'success',
        messageId: info.messageId
      });
      
      console.log('邮件日志已记录到MySQL数据库');
    } catch (logError) {
      // 日志记录失败不影响邮件发送结果
      console.error('记录邮件日志到MySQL失败:', logError);
      console.error('但邮件已成功发送，继续执行');
    }
    
    console.log('邮件发送结果:', { success: true, messageId: info.messageId });
    console.log('专辑上架通知邮件发送完成');
    console.log('-----------------------------------------------------');
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('发送专辑上架通知邮件失败:', error);
    
    // 使用Sequelize模型记录失败日志
    try {
      const { EmailLog } = require('../models');
      
      await EmailLog.create({
        to: to,
        subject: '专辑上架通知',
        content: JSON.stringify(data),
        type: 'album_released',
        status: 'failed',
        error: error.message
      });
      
      console.log('失败邮件日志已记录到MySQL数据库');
    } catch (logError) {
      console.error('记录失败邮件日志到MySQL失败:', logError);
    }
    
    return { success: false, message: '发送邮件失败', error: error.message };
  }
};

// 导出函数
module.exports = {
  sendVerificationCode,
  sendPasswordResetCode,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendAlbumApprovedEmail,
  sendAlbumRejectedEmail,
  sendVerificationStatusEmail,
  sendBeatArrayApprovedEmail,
  sendBeatArrayRejectedEmail,
  sendAlbumReleasedEmail,
  sendMail  // 导出通用邮件发送函数
}; 