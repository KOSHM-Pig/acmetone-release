const express = require('express');
const router = express.Router();
const { User, VerificationToken } = require('../models');
const { generateToken } = require('../utils/jwt');
const { auth, adminAuth } = require('../middleware/auth');
const { Op } = require('sequelize');
const crypto = require('crypto');
const { sendVerificationCode, sendVerificationEmail, sendPasswordResetEmail } = require('../utils/emailService');
const { uploadImage, uploadAvatar, handleUploadError } = require('../middleware/upload');
const path = require('path');
const fs = require('fs');
const { sequelize } = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const captchaService = require('../utils/captchaService');

// 配置前端URL
const FRONTEND_URL = 'https://www.acmetone.com';

// 使用内存存储验证码（生产环境应使用数据库或Redis）
const verificationCodes = new Map();

// 使用一个简单的内存存储来限制IP请求频率
const ipRequestTracker = new Map();

// 生成随机令牌
const generateRandomToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// 生成随机验证码
const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// 发送邮箱验证码
router.post('/send-verification-code', async (req, res) => {
  try {
    const ip = req.ip;

    // --- IP请求频率限制 ---
    const now = Date.now();
    const lastRequestTime = ipRequestTracker.get(ip);
    if (lastRequestTime && (now - lastRequestTime < 60000)) { // 60秒冷却时间
        console.warn(`[SECURITY] IP <${ip}> 在注册时请求验证码过于频繁`);
        return res.status(429).json({ message: '您的请求过于频繁，请稍后再试' });
    }
    // --- 结束 ---

    console.log('-----------------------------------------------------');
    console.log('收到发送验证码请求');
    console.log('请求体:', JSON.stringify(req.body, null, 2));
    
    const { email, captchaId, captchaX } = req.body;
    
    if (!email) {
      console.error('缺少邮箱地址');
      return res.status(400).json({ message: '请提供邮箱地址' });
    }
    
    if (!captchaService.verifyCaptcha(captchaId, captchaX)) {
      return res.status(400).json({ message: '人机验证失败' });
    }
    
    // 检查邮箱是否已注册
    console.log('检查邮箱是否已注册:', email);
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      console.error('邮箱已被注册:', {
        userId: existingUser.id,
        username: existingUser.username
      });
      return res.status(400).json({ message: '该邮箱已被注册' });
    }
    
    // 生成6位数验证码
    const verificationCode = generateVerificationCode();
    console.log('生成验证码:', verificationCode);
    
    // 将验证码存储到内存，并设置10分钟后过期
    const expireTime = Date.now() + 10 * 60 * 1000; // 10分钟
    verificationCodes.set(email, {
      code: verificationCode,
      expireAt: expireTime
    });
    console.log('验证码已存储:', {
      email,
      code: verificationCode,
      expireAt: new Date(expireTime)
    });
    
    // 设置定时器，10分钟后自动清除验证码
    setTimeout(() => {
      if (verificationCodes.has(email) && verificationCodes.get(email).code === verificationCode) {
        console.log('验证码过期，自动清除:', {
          email,
          code: verificationCode
        });
        verificationCodes.delete(email);
      }
    }, 10 * 60 * 1000);
    
    // 发送验证码邮件
    console.log('正在发送验证码邮件...');
    const emailResult = await sendVerificationCode(email, verificationCode);
    console.log('邮件发送结果:', emailResult);
    
    // 记录当前IP的请求时间
    ipRequestTracker.set(ip, now);

    console.log('验证码发送成功');
    console.log('-----------------------------------------------------');
    
    res.json({ message: '验证码已发送到您的邮箱，请查收' });
  } catch (error) {
    console.error('-----------------------------------------------------');
    console.error('发送验证码过程中发生错误:');
    console.error('错误名称:', error.name);
    console.error('错误消息:', error.message);
    console.error('错误堆栈:', error.stack);
    console.error('-----------------------------------------------------');
    
    res.status(500).json({ message: '发送验证码失败，请稍后再试' });
  }
});

// 注册
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, verificationCode, captchaId, captchaX } = req.body;

    if (!captchaService.verifyCaptcha(captchaId, captchaX)) {
      return res.status(400).json({ message: '人机验证失败' });
    }

    // 验证邮箱验证码
    const storedCode = verificationCodes.get(email);
    if (!storedCode || storedCode.code !== verificationCode || Date.now() > storedCode.expireAt) {
      return res.status(400).json({ message: '验证码已过期或不正确' });
    }

    console.log('-----------------------------------------------------');
    console.log('收到用户注册请求');
    console.log('请求体:', JSON.stringify(req.body, null, 2));
    
    // 使用Sequelize语法检查用户名或邮箱是否已存在
    console.log('检查用户名或邮箱是否已存在');
    const existingUser = await User.findOne({
      where: {
        [Op.or]: [
          { username: username },
          { email: email }
        ]
      }
    });
    
    if (existingUser) {
      console.error('用户已存在:', {
        id: existingUser.id,
        username: existingUser.username === username,
        email: existingUser.email === email
      });
      return res.status(400).json({ message: '用户名或邮箱已存在' });
    }

    console.log('创建新用户');
    
    // 手动哈希密码（使用同步方法）
    const passwordHash = bcrypt.hashSync(password, 10);
    console.log('手动生成的密码哈希:', passwordHash);
    
    // 使用直接SQL创建用户
    const [results] = await sequelize.query(
      `INSERT INTO users (username, email, password, role, isEmailVerified, createdAt, updatedAt) 
       VALUES (?, ?, ?, 'user', true, NOW(), NOW())`,
      {
        replacements: [username, email, passwordHash],
        type: sequelize.QueryTypes.INSERT
      }
    );
    
    const userId = results;
    
    console.log('用户创建成功:', {
      id: userId,
      username,
      email
    });
    
    // 查询创建的用户
    const [newUser] = await sequelize.query(
      'SELECT * FROM users WHERE id = ?',
      {
        replacements: [userId],
        type: sequelize.QueryTypes.SELECT
      }
    );
    
    console.log('新用户从数据库读取:', {
      id: newUser.id,
      username: newUser.username,
      savedPasswordHash: newUser.password === passwordHash
    });

    // 生成JWT令牌
    console.log('生成JWT令牌');
    const jwtToken = generateToken(newUser);
    
    // 删除验证码
    console.log('删除验证码');
    verificationCodes.delete(email);

    console.log('注册成功，返回响应');
    console.log('-----------------------------------------------------');
    
    res.status(201).json({
      token: jwtToken,
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
        isEmailVerified: true
      },
      message: '注册成功'
    });
  } catch (error) {
    console.error('-----------------------------------------------------');
    console.error('注册过程中发生错误:');
    console.error('错误名称:', error.name);
    console.error('错误消息:', error.message);
    console.error('错误堆栈:', error.stack);
    
    // 检查是否是Sequelize验证错误
    if (error.name === 'SequelizeValidationError') {
      console.error('Sequelize验证错误:');
      error.errors.forEach((err, index) => {
        console.error(`错误 ${index + 1}:`, {
          message: err.message,
          type: err.type,
          path: err.path,
          value: err.value
        });
      });
    }
    
    // 检查是否是Sequelize唯一约束错误
    if (error.name === 'SequelizeUniqueConstraintError') {
      console.error('Sequelize唯一约束错误:');
      error.errors.forEach((err, index) => {
        console.error(`错误 ${index + 1}:`, {
          message: err.message,
          type: err.type,
          path: err.path,
          value: err.value
        });
      });
    }
    
    console.error('-----------------------------------------------------');
    res.status(400).json({ message: error.message });
  }
});

// 验证邮箱
router.get('/verify-email', async (req, res) => {
  try {
    const { token } = req.query;
    
    if (!token) {
      return res.status(400).json({ message: '缺少验证令牌' });
    }
    
    const verificationToken = await VerificationToken.findOne({
      where: {
        token,
        type: 'email_verification',
        usedAt: null,
        expiresAt: { [Op.gt]: new Date() }
      }
    });
    
    if (!verificationToken) {
      return res.status(400).json({ message: '验证令牌无效或已过期' });
    }
    
    // 更新用户为已验证
    const user = await User.findByPk(verificationToken.userId);
    
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }
    
    user.isEmailVerified = true;
    await user.save();
    
    // 标记令牌为已使用
    verificationToken.usedAt = new Date();
    await verificationToken.save();
    
    // 重定向到前端的验证成功页面
    res.redirect(`${FRONTEND_URL}/email-verified`);
  } catch (error) {
    console.error('验证邮箱错误:', error);
    res.status(400).json({ message: error.message });
  }
});

// 重新发送验证邮件
router.post('/resend-verification', auth, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }
    
    if (user.isEmailVerified) {
      return res.status(400).json({ message: '邮箱已验证' });
    }
    
    // 检查是否有未过期的验证令牌
    const existingToken = await VerificationToken.findOne({
      where: {
        userId: user.id,
        type: 'email_verification',
        usedAt: null,
        expiresAt: { [Op.gt]: new Date() }
      }
    });
    
    let token;
    
    if (existingToken) {
      // 使用现有令牌
      token = existingToken.token;
    } else {
      // 创建新令牌
      token = generateRandomToken();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24); // 24小时后过期
      
      await VerificationToken.create({
        userId: user.id,
        token,
        type: 'email_verification',
        expiresAt
      });
    }
    
    // 发送验证邮件
    await sendVerificationEmail(user.email, token);
    
    res.json({ message: '验证邮件已发送，请查收' });
  } catch (error) {
    console.error('重新发送验证邮件错误:', error);
    res.status(400).json({ message: error.message });
  }
});

// 导入 auth.js 中的 router，并重命名以避免冲突
const authRouter = require('./auth');

// 登录
router.post('/login', (req, res, next) => {
  console.log('--- [兼容层] /api/users/login 请求已收到，将转发至 /api/auth/login ---');
  // 将请求手动路由到 authRouter 来处理
  // 注意：这是一种临时兼容方案，长远建议统一前端请求至 /api/auth/login
  authRouter(req, res, next);
});

// 忘记密码 - 发送重置邮件
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: '请提供邮箱地址' });
    }
    
    const user = await User.findOne({ where: { email } });
    
    if (!user) {
      return res.status(404).json({ message: '该邮箱未注册' });
    }
    
    // 生成重置令牌
    const token = generateRandomToken();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // 1小时后过期
    
    await VerificationToken.create({
      userId: user.id,
      token,
      type: 'password_reset',
      expiresAt
    });
    
    // 发送重置邮件
    await sendPasswordResetEmail(email, token);
    
    res.json({ message: '密码重置邮件已发送，请查收' });
  } catch (error) {
    console.error('忘记密码错误:', error);
    res.status(400).json({ message: error.message });
  }
});

// 重置密码
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    if (!token || !newPassword) {
      return res.status(400).json({ message: '缺少必要参数' });
    }
    
    const verificationToken = await VerificationToken.findOne({
      where: {
        token,
        type: 'password_reset',
        usedAt: null,
        expiresAt: { [Op.gt]: new Date() }
      }
    });
    
    if (!verificationToken) {
      return res.status(400).json({ message: '重置令牌无效或已过期' });
    }
    
    // 更新用户密码
    const user = await User.findByPk(verificationToken.userId);
    
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }
    
    user.password = newPassword;
    await user.save();
    
    // 标记令牌为已使用
    verificationToken.usedAt = new Date();
    await verificationToken.save();
    
    res.json({ message: '密码重置成功' });
  } catch (error) {
    console.error('重置密码错误:', error);
    res.status(400).json({ message: error.message });
  }
});

// 获取当前用户信息
router.get('/me', auth, async (req, res) => {
  try {
    console.log('获取用户信息请求，用户ID:', req.user.id);
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] }
    });
    
    if (!user) {
      console.log('用户不存在');
      return res.status(404).json({ message: '用户不存在' });
    }
    
    // 确保返回的用户数据包含所有字段
    const userData = user.toJSON();
    console.log('返回用户信息:', {
      id: userData.id,
      username: userData.username,
      email: userData.email,
      role: userData.role,
      avatar: userData.avatar || null,
      nickname: userData.nickname || null,
      bio: userData.bio || null
    });
    
    res.json(userData);
  } catch (error) {
    console.error('获取用户信息错误:', error);
    res.status(400).json({ message: error.message });
  }
});

// 更新用户头像 (Base64版本)
router.post('/me/avatar', auth, async (req, res) => {
  try {
    console.log('收到头像上传请求');
    const { avatar, filename, contentType } = req.body;
    
    if (!avatar) {
      console.log('未提供头像数据');
      return res.status(400).json({ 
        success: false, 
        message: '未提供头像数据' 
      });
    }
    
    // 检查内容类型
    if (!contentType || !contentType.startsWith('image/')) {
      console.log('无效的图片格式:', contentType);
      return res.status(400).json({ 
        success: false, 
        message: '无效的图片格式，仅支持JPG和PNG格式' 
      });
    }
    
    // 获取文件扩展名
    const extension = contentType === 'image/png' ? '.png' : '.jpg';
    
    // 创建文件名
    const userId = req.user.id;
    const timestamp = Date.now();
    const fileName = `avatar_${userId}_${timestamp}${extension}`;
    
    // 使用绝对路径保存文件
    const uploadDir = path.resolve(__dirname, '../../uploads/images');
    const filePath = path.join(uploadDir, fileName);
    
    console.log('准备保存头像文件:', {
      userId,
      contentType,
      extension,
      fileName,
      filePath,
      uploadDir
    });
    
    // 确保目录存在
    if (!fs.existsSync(uploadDir)) {
      console.log('创建目录:', uploadDir);
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    // 将base64转换为buffer并保存为文件
    const buffer = Buffer.from(avatar, 'base64');
    fs.writeFileSync(filePath, buffer);
    console.log('头像文件已保存:', filePath);
    
    // 使用正确的相对路径格式
    const avatarUrl = `/uploads/images/${fileName}`;
    console.log('头像URL:', avatarUrl);
    
    // 更新用户头像路径
    const user = await User.findByPk(req.user.id);
    if (!user) {
      // 如果找不到用户，删除上传的文件
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log('用户不存在，已删除头像文件');
      }
      
      return res.status(404).json({ 
        success: false, 
        message: '用户不存在' 
      });
    }
    
    // 保存正确的URL路径
    console.log('更新前的头像路径:', user.avatar);
    
    try {
      // 更新用户头像
      user.avatar = avatarUrl;
      await user.save();
      console.log('用户头像已更新:', user.avatar);
      
      // 重新查询用户以确保数据已更新
      const updatedUser = await User.findByPk(req.user.id, {
        attributes: { exclude: ['password'] }
      });
      
      // 确保返回的用户数据包含所有字段
      const userData = updatedUser.toJSON();
      
      console.log('返回给前端的用户数据:', {
        id: userData.id,
        username: userData.username,
        avatar: userData.avatar,
        nickname: userData.nickname || null,
        bio: userData.bio || null
      });
      
      res.json({ 
        success: true, 
        message: '头像上传成功',
        avatar: avatarUrl,
        user: userData
      });
    } catch (updateError) {
      console.error('更新头像路径时出错:', updateError);
      
      // 如果更新失败，删除上传的文件
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log('更新失败，已删除头像文件');
      }
      
      res.status(500).json({
        success: false,
        message: '更新用户头像失败: ' + updateError.message
      });
    }
  } catch (error) {
    console.error('处理头像上传错误:', error);
    res.status(500).json({ 
      success: false, 
      message: '头像上传失败: ' + error.message 
    });
  }
});

// 更新用户信息
router.put('/me', auth, async (req, res) => {
  try {
    const { nickname, bio } = req.body;
    
    const user = await User.findByPk(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }
    
    // 只允许更新特定字段
    if (nickname !== undefined) user.nickname = nickname;
    if (bio !== undefined) user.bio = bio;
    
    await user.save();
    
    // 返回更新后的用户信息（排除密码）
    const userData = user.toJSON();
    delete userData.password;
    
    res.json(userData);
  } catch (error) {
    console.error('更新用户信息错误:', error);
    res.status(400).json({ message: error.message });
  }
});

module.exports = router; 