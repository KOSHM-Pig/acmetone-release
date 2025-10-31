const express = require('express');
const router = express.Router();
const { User } = require('../models');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { sendPasswordResetCode } = require('../utils/emailService');
const jwt = require('jsonwebtoken');
const ipLookup = require('../utils/ipLookup');
const captchaService = require('../utils/captchaService');
const { auth } = require('../middleware/auth');

// 导入JWT工具
const { verifyToken } = require('../utils/jwt');

// 定义JWT密钥
const JWT_SECRET = 'acmetone-secret-key-yuzhuohengnmsl-likexiansima';

// 使用一个简单的内存存储来限制IP请求频率
const ipRequestTracker = new Map();

// 使用一个简单的内存存储来保存验证码，生产环境中应使用Redis或数据库
const passwordResetTokens = new Map();

// 1. 请求重置密码 (发送验证码)
router.post('/request-password-reset', async (req, res) => {
    const { email, captchaId, captchaX } = req.body;

    if (!captchaService.verifyCaptcha(captchaId, captchaX)) {
        return res.status(400).json({ message: '人机验证失败' });
    }

    const ip = req.ip;

    // --- IP请求频率限制 ---
    const now = Date.now();
    const lastRequestTime = ipRequestTracker.get(ip);
    if (lastRequestTime && (now - lastRequestTime < 60000)) { // 60秒冷却时间
        console.warn(`[SECURITY] IP <${ip}> 请求验证码过于频繁`);
        return res.status(429).json({ message: '您的请求过于频繁，请稍后再试' });
    }
    // --- 结束 ---

    if (!email) {
        return res.status(400).json({ message: '请输入邮箱地址' });
    }

    try {
        const user = await User.findOne({ where: { email } });
        if (!user) {
            // 为安全起见，不明确提示用户是否存在
            return res.status(200).json({ message: '如果邮箱地址有效，您将会收到一封包含验证码的邮件。' });
        }

        const token = crypto.randomInt(100000, 999999).toString();
        const expires = Date.now() + 600000; // 10分钟有效期

        passwordResetTokens.set(email, { token, expires });

        await sendPasswordResetCode(email, token);

        // 记录当前IP的请求时间
        ipRequestTracker.set(ip, now);

        res.status(200).json({ message: '如果邮箱地址有效，您将会收到一封包含验证码的邮件。' });

    } catch (error) {
        console.error('请求重置密码失败:', error);
        res.status(500).json({ message: '发送验证码失败，请稍后再试' });
    }
});

// 2. 重置密码 (验证并更新)
router.post('/reset-password', async (req, res) => {
    const { email, token, newPassword } = req.body;

    console.log('--- [调试] 开始处理重置密码请求 ---');
    console.log('[调试] 收到的请求参数:', { email, token, newPassword: '***' }); // 为安全起见，不在日志中直接显示密码

    if (!email || !token || !newPassword) {
        console.log('[调试] 检查失败: 缺少必要信息');
        return res.status(400).json({ message: '缺少必要信息' });
    }
    
    if (newPassword.length < 6) {
        console.log('[调试] 检查失败: 密码长度不足');
        return res.status(400).json({ message: '新密码长度不能小于6个字符' });
    }

    const savedTokenInfo = passwordResetTokens.get(email);
    
    console.log(`[调试] 从缓存中为邮箱 <${email}> 获取到的验证码信息:`, savedTokenInfo);

    if (!savedTokenInfo) {
        console.log('[调试] 验证失败: 未找到该邮箱的验证码信息');
        return res.status(400).json({ message: '验证码无效或已过期' });
    }

    console.log(`[调试] 用户提交的验证码: ${token}`);
    console.log(`[调试] 系统保存的验证码: ${savedTokenInfo.token}`);
    console.log(`[调试] 验证码是否匹配: ${savedTokenInfo.token === token}`);

    if (savedTokenInfo.token !== token) {
        console.log('[调试] 验证失败: 验证码不匹配');
        return res.status(400).json({ message: '验证码无效或已过期' });
    }

    console.log(`[调试] 检查验证码是否过期. 当前时间: ${Date.now()}, 过期时间: ${savedTokenInfo.expires}`);
    if (Date.now() > savedTokenInfo.expires) {
        console.log('[调试] 验证失败: 验证码已过期');
        passwordResetTokens.delete(email);
        return res.status(400).json({ message: '验证码已过期，请重新获取' });
    }

    try {
        const user = await User.findOne({ where: { email } });
        if (!user) {
            console.log(`[调试] 数据库查询失败: 邮箱 <${email}> 对应的用户不存在`);
            return res.status(404).json({ message: '用户不存在' });
        }
        console.log(`[调试] 在数据库中找到用户:`, user.toJSON());

        console.log(`[调试] 准备为用户 ${user.id} 更新密码。新密码(明文): ${newPassword}`);
        
        // 直接将新密码赋值给user.password，让模型的setter处理哈希
        user.password = newPassword;
        await user.save();
        
        console.log(`[调试] 用户 ${user.id} 的密码已成功更新。`);

        passwordResetTokens.delete(email); // 使用后立即删除
        console.log(`[调试] 已从缓存中删除邮箱 <${email}> 的验证码。`);

        res.status(200).json({ message: '密码重置成功' });

    } catch (error) {
        console.error('重置密码失败:', error);
        res.status(500).json({ message: '密码重置失败，请稍后再试' });
    }
});

// 3. 用户登录
router.post('/login', async (req, res) => {
    const { username, password, captchaId, captchaX } = req.body;
    console.log('--- [AUTH] 开始处理登录请求 ---');
    console.log(`[AUTH] 用户名: ${username}, 密码: ***`);

    if (!captchaService.verifyCaptcha(captchaId, captchaX)) {
        return res.status(400).json({ message: '人机验证失败' });
    }

    if (!username || !password) {
        return res.status(400).json({ message: '请输入用户名和密码' });
    }

    try {
        const user = await User.findOne({ where: { username } });
        if (!user) {
            console.log(`[AUTH] 登录失败: 用户名 <${username}> 不存在`);
            // 为安全起见，返回通用错误信息
            return res.status(401).json({ message: '用户名或密码错误' });
        }

        // 检查账户是否被禁用
        if (!user.isActive) {
            console.log(`[AUTH] 登录失败: 用户 <${username}> 账号已被禁用`);
            return res.status(403).json({ message: '您的账号已被禁用，请联系管理员' });
        }
        
        console.log(`[AUTH] 数据库中找到用户: ${user.username}`);
        console.log(`[AUTH] 数据库中的密码哈希: ${user.password}`);
        console.log(`[AUTH] 用户输入的密码: ${password}`);

        const passwordIsValid = await bcrypt.compare(password, user.password);

        console.log(`[AUTH] 密码比对结果: ${passwordIsValid}`);

        if (!passwordIsValid) {
            console.log(`[AUTH] 密码验证失败`);
            return res.status(401).json({ message: '用户名或密码错误' });
        }

        // 异步更新登录信息，不阻塞登录流程
        (async () => {
            try {
                const ip = req.ip;
                const location = await ipLookup.lookupIp(ip);
                user.lastLoginAt = new Date();
                user.lastLoginIp = ip;
                user.lastLoginLocation = location;
                await user.save();
                console.log(`[AUTH] 用户 <${username}> 登录信息已更新: IP=${ip}, Location=${location}`);
            } catch (e) {
                console.error(`[AUTH] 更新用户 <${username}> 的登录信息失败:`, e);
            }
        })();

        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            JWT_SECRET,
            { expiresIn: '24h' } // 修改为24小时
        );

        console.log(`[AUTH] 登录成功，为用户 <${username}> 生成 Token`);
        
        // 确保返回完整的用户信息，包括头像、昵称和个人介绍
        const userInfo = {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            isEmailVerified: user.isEmailVerified,
            avatar: user.avatar || null,
            nickname: user.nickname || null,
            bio: user.bio || null
        };
        
        console.log('[AUTH] 返回给前端的用户信息:', {
            id: userInfo.id,
            username: userInfo.username,
            email: userInfo.email,
            role: userInfo.role,
            avatar: userInfo.avatar,
            nickname: userInfo.nickname,
            bio: userInfo.bio ? '有内容' : '无内容'
        });
        
        res.status(200).json({
            token,
            user: userInfo
        });

    } catch (error) {
        console.error('[AUTH] 登录过程中发生严重错误:', error);
        res.status(500).json({ message: '登录失败，服务器内部错误' });
    }
});

// 4. 心跳包 - 刷新令牌
router.post('/heartbeat', auth, async (req, res) => {
    try {
        const user = req.user;
        
        // 检查用户状态是否有效
        const currentUser = await User.findByPk(user.id);
        if (!currentUser || !currentUser.isActive) {
            return res.status(401).json({ 
                valid: false, 
                message: '用户状态无效，请重新登录',
                code: 'AUTH_INVALID'
            });
        }
        
        // 生成新的令牌
        const newToken = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        console.log(`[AUTH] 心跳包接收成功，为用户 <${user.username}> 刷新 Token`);
        
        res.status(200).json({
            token: newToken,
            valid: true,
            message: '令牌已刷新'
        });
    } catch (error) {
        console.error('[AUTH] 处理心跳包请求时发生错误:', error);
        res.status(401).json({ 
            valid: false, 
            message: '刷新令牌失败，请重新登录',
            code: 'AUTH_FAILED'
        });
    }
});

/**
 * @route   GET /api/auth/validate
 * @desc    验证用户登录状态是否有效
 * @access  Private
 */
router.get('/validate', auth, async (req, res) => {
  try {
    // 如果能通过auth中间件，说明token有效
    // 为了进一步验证，可以检查用户是否仍然存在
    const user = await User.findByPk(req.user.id);
    
    if (!user) {
      return res.status(401).json({ 
        valid: false, 
        message: '用户不存在',
        code: 'USER_NOT_FOUND'
      });
    }
    
    // 检查用户是否被禁用
    if (!user.isActive) {
      return res.status(401).json({ 
        valid: false, 
        message: '账号已被禁用',
        code: 'USER_DISABLED'
      });
    }
    
    // 登录状态有效
    return res.json({ 
      valid: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        avatar: user.avatar || null,
        nickname: user.nickname || null
      }
    });
  } catch (error) {
    console.error('验证登录状态失败:', error);
    return res.status(401).json({ 
      valid: false, 
      message: '验证失败，请重新登录',
      code: 'AUTH_ERROR'
    });
  }
});

module.exports = router; 