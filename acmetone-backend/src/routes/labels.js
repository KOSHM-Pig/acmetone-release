const express = require('express');
const router = express.Router();
const { auth, adminAuth } = require('../middleware/auth');
const { Label, User } = require('../models');
const { Op } = require('sequelize');

// 获取用户的厂牌信息
router.get('/user', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const label = await Label.findOne({
      where: { userId },
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'username', 'email']
      }]
    });
    
    if (!label) {
      return res.status(404).json({ message: '未找到厂牌信息' });
    }
    
    // 返回安全的厂牌信息（不包含敏感信息）
    res.json(label.getSafeInfo());
  } catch (error) {
    console.error('获取用户厂牌信息失败:', error);
    res.status(500).json({ message: '获取厂牌信息失败', error: error.message });
  }
});

// 创建厂牌申请
router.post('/', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      chinese_name,
      english_name,
      description,
      website,
      contact_email,
      contact_qqgroup,
      beatarray_account,
      beatarray_password
    } = req.body;
    
    // 验证必填字段
    if (!chinese_name || !english_name) {
      return res.status(400).json({ 
        message: '厂牌中文名和英文名为必填项',
        errors: {
          chinese_name: !chinese_name ? '请输入厂牌中文名' : null,
          english_name: !english_name ? '请输入厂牌英文名' : null
        }
      });
    }
    
    // 检查用户是否已有厂牌
    const existingLabel = await Label.findOne({ where: { userId } });
    if (existingLabel) {
      return res.status(400).json({ message: '您已经有厂牌了，无法重复申请' });
    }
    
    // 检查厂牌名称是否已存在
    const nameExists = await Label.checkNameExists(chinese_name, english_name);
    if (nameExists) {
      return res.status(400).json({ 
        message: '厂牌名称已存在',
        errors: {
          chinese_name: nameExists.chineseName === chinese_name ? '该中文名已被使用' : null,
          english_name: nameExists.englishName === english_name ? '该英文名已被使用' : null
        }
      });
    }
    
    // 创建厂牌申请
    const labelData = {
      userId,
      chineseName: chinese_name,
      englishName: english_name,
      description,
      website,
      contactEmail: contact_email,
      contactQqgroup: contact_qqgroup,
      beatArrayAccount: beatarray_account,
      beatArrayPassword: beatarray_password, // 模型会自动处理加密
      status: 'pending'
    };
    
    const label = await Label.create(labelData);
    
    res.status(201).json({
      message: '厂牌申请已提交，请等待管理员审核',
      label: label.getSafeInfo()
    });
  } catch (error) {
    console.error('创建厂牌申请失败:', error);
    res.status(500).json({ message: '创建厂牌申请失败', error: error.message });
  }
});

// 更新厂牌信息
router.put('/:id', auth, async (req, res) => {
  try {
    const labelId = req.params.id;
    const userId = req.user.id;
    const {
      chinese_name,
      english_name,
      description,
      website,
      contact_email,
      contact_qqgroup,
      beatarray_account,
      beatarray_password
    } = req.body;
    
    // 查找厂牌
    const label = await Label.findByPk(labelId);
    if (!label) {
      return res.status(404).json({ message: '厂牌不存在' });
    }
    
    // 检查权限
    if (label.userId !== userId) {
      return res.status(403).json({ message: '无权限修改此厂牌' });
    }
    
    // 检查是否可以编辑
    if (!label.canEdit()) {
      return res.status(400).json({ message: '当前状态下无法编辑厂牌信息' });
    }
    
    // 验证必填字段
    if (!chinese_name || !english_name) {
      return res.status(400).json({ 
        message: '厂牌中文名和英文名为必填项',
        errors: {
          chinese_name: !chinese_name ? '请输入厂牌中文名' : null,
          english_name: !english_name ? '请输入厂牌英文名' : null
        }
      });
    }
    
    // 检查厂牌名称是否已存在（排除当前厂牌）
    const nameExists = await Label.checkNameExists(chinese_name, english_name, labelId);
    if (nameExists) {
      return res.status(400).json({ 
        message: '厂牌名称已存在',
        errors: {
          chinese_name: nameExists.chineseName === chinese_name ? '该中文名已被使用' : null,
          english_name: nameExists.englishName === english_name ? '该英文名已被使用' : null
        }
      });
    }
    
    // 更新厂牌信息
    const updateData = {
      chineseName: chinese_name,
      englishName: english_name,
      description,
      website,
      contactEmail: contact_email,
      contactQqgroup: contact_qqgroup,
      beatArrayAccount: beatarray_account
    };

    // 如果提供了新密码，则更新
    if (beatarray_password) {
      updateData.beatArrayPassword = beatarray_password;
    }
    
    await label.update(updateData);
    
    res.json({
      message: '厂牌信息更新成功',
      label: label.getSafeInfo()
    });
  } catch (error) {
    console.error('更新厂牌信息失败:', error);
    res.status(500).json({ message: '更新厂牌信息失败', error: error.message });
  }
});

module.exports = router;
