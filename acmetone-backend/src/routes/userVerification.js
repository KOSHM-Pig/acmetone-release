const express = require('express');
const router = express.Router();
const { UserVerification, User } = require('../models');
const { auth, adminAuth } = require('../middleware/auth');
const { encrypt, decrypt, maskIdNumber, maskBankAccount } = require('../utils/encryption');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const appendFile = promisify(fs.appendFile);

// 创建日志目录
const logDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// 日志文件路径
const verificationLogPath = path.join(logDir, 'verification.log');

// 记录日志函数
async function logVerificationAction(action, userId, data = {}) {
  const timestamp = new Date().toISOString();
  const logEntry = `${timestamp} | ${action} | User ID: ${userId} | ${JSON.stringify(data)}\n`;
  
  try {
    await appendFile(verificationLogPath, logEntry);
  } catch (error) {
    console.error('写入日志失败:', error);
    // 日志写入失败不应影响主要功能
  }
}

// 提交实名认证申请
router.post('/', auth, async (req, res) => {
  try {
    console.log('接收到实名认证请求:', { ...req.body, idNumber: '***', bankAccount: '***' });
    
    const { realName, idNumber, bankAccount, bankName } = req.body;
    const userId = req.user.id;
    
    // 验证必要字段
    if (!realName || !idNumber || !bankAccount || !bankName) {
      console.log('实名认证请求缺少必要字段');
      return res.status(400).json({ message: '请提供所有必要信息' });
    }
    
    // 验证身份证号格式
    const idNumberRegex = /(^\d{18}$)|(^\d{17}(\d|X|x)$)/;
    if (!idNumberRegex.test(idNumber)) {
      console.log('身份证号格式不正确:', idNumber.substring(0, 3) + '***');
      return res.status(400).json({ message: '身份证号格式不正确' });
    }
    
    // 检查是否已存在认证记录
    const existingVerification = await UserVerification.findOne({
      where: { userId }
    });
    
    // 加密敏感信息
    let encryptedIdNumber, encryptedBankAccount;
    try {
      encryptedIdNumber = encrypt(idNumber);
      encryptedBankAccount = encrypt(bankAccount);
      console.log('敏感信息加密成功');
    } catch (error) {
      console.error('敏感信息加密失败:', error);
      // 如果加密失败，使用原始值
      encryptedIdNumber = idNumber;
      encryptedBankAccount = bankAccount;
    }
    
    if (existingVerification) {
      // 如果已被拒绝，可以更新重新提交
      if (existingVerification.status === 'rejected') {
        try {
          await existingVerification.update({
            realName,
            idNumber: encryptedIdNumber,
            bankAccount: encryptedBankAccount,
            bankName,
            status: 'pending',
            comment: null
          });
          
          // 记录日志
          await logVerificationAction('RESUBMIT', userId, {
            verificationId: existingVerification.id,
            realName
          });
          
          console.log('实名认证信息更新成功, ID:', existingVerification.id);
          
          return res.status(200).json({
            message: '实名认证信息已更新，等待审核',
            verification: {
              ...existingVerification.toJSON(),
              idNumber: maskIdNumber(idNumber),
              bankAccount: maskBankAccount(bankAccount)
            }
          });
        } catch (updateError) {
          console.error('更新实名认证信息失败:', updateError);
          throw updateError;
        }
      }
      
      // 如果正在审核中或已通过，不允许修改
      console.log('用户已有认证记录，状态:', existingVerification.status);
      
      let decryptedIdNumber, decryptedBankAccount;
      try {
        decryptedIdNumber = decrypt(existingVerification.idNumber);
        decryptedBankAccount = decrypt(existingVerification.bankAccount);
      } catch (decryptError) {
        console.error('解密失败:', decryptError);
        decryptedIdNumber = '解密失败';
        decryptedBankAccount = '解密失败';
      }
      
      return res.status(400).json({
        message: existingVerification.status === 'pending' ? 
          '您的实名认证正在审核中，请耐心等待' : 
          '您已通过实名认证，无需重复提交',
        verification: {
          ...existingVerification.toJSON(),
          idNumber: maskIdNumber(decryptedIdNumber),
          bankAccount: maskBankAccount(decryptedBankAccount)
        }
      });
    }
    
    // 创建新的认证记录
    try {
      const verification = await UserVerification.create({
        realName,
        idNumber: encryptedIdNumber,
        bankAccount: encryptedBankAccount,
        bankName,
        status: 'pending',
        userId
      });
      
      // 记录日志
      await logVerificationAction('SUBMIT', userId, {
        verificationId: verification.id,
        realName
      });
      
      console.log('新实名认证记录创建成功, ID:', verification.id);
      
      res.status(201).json({
        message: '实名认证申请已提交，等待审核',
        verification: {
          ...verification.toJSON(),
          idNumber: maskIdNumber(idNumber),
          bankAccount: maskBankAccount(bankAccount)
        }
      });
    } catch (createError) {
      console.error('创建实名认证记录失败:', createError);
      throw createError;
    }
  } catch (error) {
    console.error('提交实名认证错误:', error);
    res.status(500).json({ message: error.message || '提交实名认证失败，请稍后再试' });
  }
});

// 获取当前用户的认证状态
router.get('/status', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const verification = await UserVerification.findOne({
      where: { userId },
      attributes: ['id', 'status', 'comment', 'createdAt', 'updatedAt']
    });
    
    if (!verification) {
      return res.status(404).json({ 
        message: '未找到实名认证信息',
        isVerified: false
      });
    }
    
    res.json({
      verification,
      isVerified: verification.status === 'approved'
    });
  } catch (error) {
    console.error('获取认证状态错误:', error);
    res.status(500).json({ message: error.message });
  }
});

// 管理员获取所有待审核的认证
router.get('/pending', adminAuth, async (req, res) => {
  try {
    const pendingVerifications = await UserVerification.findAll({
      where: { status: 'pending' },
      include: [{
        model: User,
        attributes: ['id', 'username', 'email']
      }]
    });
    
    // 解密敏感信息，身份证号码掩码处理，银行账号完整显示
    const processedVerifications = pendingVerifications.map(verification => {
      const data = verification.toJSON();
      return {
        ...data,
        idNumber: maskIdNumber(decrypt(data.idNumber)),
        bankAccount: decrypt(data.bankAccount) // 银行账号不加密显示，用于打款
      };
    });
    
    res.json(processedVerifications);
  } catch (error) {
    console.error('获取待审核认证错误:', error);
    res.status(500).json({ message: error.message });
  }
});

// 管理员审核认证
router.post('/:id/review', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, comment } = req.body;
    const adminId = req.user.id;
    
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: '无效的审核状态' });
    }
    
    const verification = await UserVerification.findByPk(id, {
      include: [{
        model: User,
        attributes: ['id', 'username', 'email']
      }]
    });
    
    if (!verification) {
      return res.status(404).json({ message: '未找到认证记录' });
    }
    
    if (verification.status !== 'pending') {
      return res.status(400).json({ message: '该认证已经被审核过' });
    }
    
    // 如果拒绝，必须提供拒绝理由
    if (status === 'rejected' && !comment) {
      return res.status(400).json({ message: '拒绝时必须提供理由' });
    }
    
    // 保存之前的状态
    const previousStatus = verification.status;
    
    await verification.update({
      status,
      comment: status === 'rejected' ? comment : null
    });
    
    // 记录日志
    await logVerificationAction('REVIEW', adminId, {
      verificationId: id,
      userId: verification.userId,
      status,
      comment: status === 'rejected' ? comment : '通过审核'
    });
    
    // 如果状态发生变化，发送邮件通知
    if (previousStatus !== status && verification.User && verification.User.email) {
      // 导入邮件服务
      const { sendVerificationStatusEmail } = require('../utils/emailService');
      
      const userEmail = verification.User.email;
      const verificationData = {
        status,
        comment: status === 'rejected' ? comment : null,
        realName: verification.realName
      };
      
      try {
        await sendVerificationStatusEmail(userEmail, verificationData);
        console.log(`已发送实名认证${status === 'approved' ? '通过' : '拒绝'}邮件到 ${userEmail}`);
      } catch (emailError) {
        console.error('发送实名认证状态变更邮件失败:', emailError);
        // 邮件发送失败不影响API响应
      }
    }
    
    res.json({
      message: status === 'approved' ? '已通过认证' : '已拒绝认证',
      verification: {
        ...verification.toJSON(),
        idNumber: undefined,
        bankAccount: undefined
      }
    });
  } catch (error) {
    console.error('审核认证错误:', error);
    res.status(500).json({ message: error.message });
  }
});

// 管理员获取实名认证详情（包括解密的敏感信息）
router.get('/:id/details', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const verification = await UserVerification.findByPk(id, {
      include: [{
        model: User,
        attributes: ['id', 'username', 'email']
      }]
    });
    
    if (!verification) {
      return res.status(404).json({ message: '未找到认证记录' });
    }
    
    // 解密敏感信息
    const data = verification.toJSON();
    const decryptedData = {
      ...data,
      idNumber: decrypt(data.idNumber),
      bankAccount: decrypt(data.bankAccount)
    };
    
    // 记录日志
    await logVerificationAction('VIEW_DETAILS', req.user.id, {
      verificationId: id,
      userId: verification.userId
    });
    
    res.json(decryptedData);
  } catch (error) {
    console.error('获取认证详情错误:', error);
    res.status(500).json({ message: error.message });
  }
});

// 获取当前用户的认证信息（包括姓名和身份证号）
router.get('/current', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const verification = await UserVerification.findOne({
      where: { userId }
    });
    
    if (!verification) {
      return res.status(404).json({ 
        message: '未找到实名认证信息',
        isVerified: false
      });
    }
    
    // 记录日志，帮助调试
    console.log('获取到用户实名认证信息:', {
      id: verification.id,
      userId: verification.userId,
      hasRealName: !!verification.realName,
      realName: verification.realName,
      status: verification.status
    });
    
    // 解密身份证号码
    let decryptedIdNumber;
    try {
      decryptedIdNumber = decrypt(verification.idNumber);
    } catch (decryptError) {
      console.error('解密身份证号码失败:', decryptError);
      decryptedIdNumber = '解密失败';
    }
    
    // 确保返回的数据包含realName字段
    if (!verification.realName) {
      console.error('警告: 用户ID', userId, '的实名认证记录中没有realName字段');
    }
    
    res.json({
      verification: {
        id: verification.id,
        realName: verification.realName, // 确保返回真实姓名
        idNumber: decryptedIdNumber,
        status: verification.status,
        createdAt: verification.createdAt,
        updatedAt: verification.updatedAt
      },
      isVerified: verification.status === 'approved'
    });
  } catch (error) {
    console.error('获取认证信息错误:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router; 