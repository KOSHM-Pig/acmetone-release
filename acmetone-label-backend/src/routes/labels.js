const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const Label = require('../models/Label');
const User = require('../models/User');
const { body, validationResult } = require('express-validator');

/**
 * 厂牌管理路由
 * 处理厂牌的创建、查询、更新等操作
 */

// 验证请求的中间件
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const ip = logger.getClientIP(req);
    logger.warn('请求验证失败', {
      errors: errors.array(),
      userId: req.user?.id,
      ip
    });

    return res.status(400).json({
      success: false,
      message: '请求参数验证失败',
      errors: errors.array()
    });
  }
  next();
};

// 获取用户的厂牌信息
router.get('/user', async (req, res) => {
  const ip = logger.getClientIP(req);

  try {
    const mainBackendUserId = req.user.id;

    logger.info('获取用户厂牌信息', {
      mainBackendUserId,
      ip
    });

    // 查找用户的厂牌
    const label = await Label.findByMainBackendUserId(mainBackendUserId);

    if (!label) {
      return res.status(404).json({
        success: false,
        message: '未找到厂牌信息'
      });
    }

    logger.success('获取用户厂牌信息成功', {
      labelId: label.id,
      mainBackendUserId,
      ip
    });

    res.json({
      success: true,
      message: '厂牌信息获取成功',
      data: label.toApiResponse()
    });
  } catch (error) {
    logger.error('获取用户厂牌信息失败', {
      error: error.message,
      stack: error.stack,
      mainBackendUserId: req.user?.id,
      ip
    });

    res.status(500).json({
      success: false,
      message: '获取厂牌信息失败'
    });
  }
});

// 获取用户的厂牌角色
router.get('/user/role', async (req, res) => {
  const ip = logger.getClientIP(req);

  try {
    const mainBackendUserId = req.user.id;

    logger.info('获取用户厂牌角色', {
      mainBackendUserId,
      ip
    });

    // 查找用户
    const user = await User.findByMainBackendUserId(mainBackendUserId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    // 查找用户的厂牌成员关系
    const LabelMember = require('../models/LabelMember');
    const member = await LabelMember.findByUserId(user.id);

    if (!member) {
      return res.status(404).json({
        success: false,
        message: '用户不是任何厂牌的成员'
      });
    }

    logger.success('获取用户厂牌角色成功', {
      userId: user.id,
      role: member.role,
      labelId: member.labelId,
      mainBackendUserId,
      ip
    });

    res.json({
      success: true,
      message: '用户厂牌角色获取成功',
      data: {
        role: member.role,
        labelId: member.labelId,
        isVerified: member.isVerified,
        status: member.status
      }
    });
  } catch (error) {
    logger.error('获取用户厂牌角色失败', {
      error: error.message,
      stack: error.stack,
      mainBackendUserId: req.user?.id,
      ip
    });

    res.status(500).json({
      success: false,
      message: '获取用户厂牌角色失败'
    });
  }
});

// 获取当前用户的厂牌信息
router.get('/info', async (req, res) => {
  const ip = logger.getClientIP(req);

  try {
    const mainBackendUserId = req.user.id;

    logger.info('获取厂牌信息', {
      mainBackendUserId,
      ip
    });

    // 查找用户
    const user = await User.findByMainBackendUserId(mainBackendUserId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    // 查找用户的厂牌成员关系
    const LabelMember = require('../models/LabelMember');
    const member = await LabelMember.findByUserId(user.id);

    if (!member) {
      return res.status(404).json({
        success: false,
        message: '用户不是任何厂牌的成员'
      });
    }

    // 只有主理人可以查看和修改厂牌信息
    if (member.role !== 'owner') {
      return res.status(403).json({
        success: false,
        message: '只有主理人可以访问厂牌信息'
      });
    }

    // 获取厂牌信息
    const label = await Label.findById(member.labelId);
    if (!label) {
      return res.status(404).json({
        success: false,
        message: '厂牌不存在'
      });
    }

    logger.success('获取厂牌信息成功', {
      labelId: label.id,
      labelName: label.chineseName,
      mainBackendUserId,
      ip
    });

    res.json({
      success: true,
      message: '厂牌信息获取成功',
      data: label
    });
  } catch (error) {
    logger.error('获取厂牌信息失败', {
      error: error.message,
      stack: error.stack,
      mainBackendUserId: req.user?.id,
      ip
    });

    res.status(500).json({
      success: false,
      message: '获取厂牌信息失败'
    });
  }
});

// 更新厂牌信息
router.put('/info', async (req, res) => {
  const ip = logger.getClientIP(req);

  try {
    const mainBackendUserId = req.user.id;
    const updateData = req.body;

    logger.info('更新厂牌信息', {
      mainBackendUserId,
      updateData,
      ip
    });

    // 查找用户
    const user = await User.findByMainBackendUserId(mainBackendUserId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    // 查找用户的厂牌成员关系
    const LabelMember = require('../models/LabelMember');
    const member = await LabelMember.findByUserId(user.id);

    if (!member) {
      return res.status(404).json({
        success: false,
        message: '用户不是任何厂牌的成员'
      });
    }

    // 只有主理人可以修改厂牌信息
    if (member.role !== 'owner') {
      return res.status(403).json({
        success: false,
        message: '只有主理人可以修改厂牌信息'
      });
    }

    // 验证必填字段
    if (!updateData.chinese_name || !updateData.chinese_name.trim()) {
      return res.status(400).json({
        success: false,
        message: '厂牌中文名不能为空'
      });
    }

    // 检查厂牌名称是否已存在（排除当前厂牌）
    if (updateData.chinese_name !== member.labelId) {
      const existingLabel = await Label.findByChineseName(updateData.chinese_name);
      if (existingLabel && existingLabel.id !== member.labelId) {
        return res.status(409).json({
          success: false,
          message: '厂牌中文名已存在'
        });
      }
    }

    if (updateData.english_name) {
      const existingEnglishLabel = await Label.findByEnglishName(updateData.english_name);
      if (existingEnglishLabel && existingEnglishLabel.id !== member.labelId) {
        return res.status(409).json({
          success: false,
          message: '厂牌英文名已存在'
        });
      }
    }

    // 更新厂牌信息
    const updatedLabel = await Label.updateById(member.labelId, updateData);

    logger.success('更新厂牌信息成功', {
      labelId: member.labelId,
      labelName: updateData.chinese_name,
      mainBackendUserId,
      ip
    });

    res.json({
      success: true,
      message: '厂牌信息更新成功',
      data: updatedLabel
    });
  } catch (error) {
    logger.error('更新厂牌信息失败', {
      error: error.message,
      stack: error.stack,
      mainBackendUserId: req.user?.id,
      ip
    });

    res.status(500).json({
      success: false,
      message: '更新厂牌信息失败'
    });
  }
});

// 申请入驻极音记
router.post('/connect-jiyinji', async (req, res) => {
  const ip = logger.getClientIP(req);

  try {
    const mainBackendUserId = req.user.id;

    logger.info('申请入驻极音记', {
      mainBackendUserId,
      ip
    });

    // 查找用户
    const user = await User.findByMainBackendUserId(mainBackendUserId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    // 查找用户的厂牌成员关系
    const LabelMember = require('../models/LabelMember');
    const member = await LabelMember.findByUserId(user.id);

    if (!member || member.role !== 'owner') {
      return res.status(403).json({
        success: false,
        message: '只有主理人可以申请入驻极音记'
      });
    }

    // 获取当前厂牌信息
    const label = await Label.findById(member.labelId);
    if (!label) {
      return res.status(404).json({
        success: false,
        message: '厂牌不存在'
      });
    }

    // 检查是否已经入驻
    if (label.isInJiYinJi) {
      return res.status(409).json({
        success: false,
        message: '厂牌已在极音记入驻'
      });
    }

    // 更新厂牌状态为入驻极音记
    const updatedLabel = await Label.updateById(member.labelId, {
      is_in_jiyinji: true
    });

    logger.success('极音记入驻申请成功', {
      labelId: member.labelId,
      labelName: label.chineseName,
      mainBackendUserId,
      ip
    });

    res.json({
      success: true,
      message: '极音记入驻申请成功',
      data: updatedLabel
    });
  } catch (error) {
    logger.error('申请入驻极音记失败', {
      error: error.message,
      stack: error.stack,
      mainBackendUserId: req.user?.id,
      ip
    });

    res.status(500).json({
      success: false,
      message: '申请入驻极音记失败'
    });
  }
});

// 退出极音记
router.post('/disconnect-jiyinji', async (req, res) => {
  const ip = logger.getClientIP(req);

  try {
    const mainBackendUserId = req.user.id;

    logger.info('退出极音记', {
      mainBackendUserId,
      ip
    });

    // 查找用户
    const user = await User.findByMainBackendUserId(mainBackendUserId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    // 查找用户的厂牌成员关系
    const LabelMember = require('../models/LabelMember');
    const member = await LabelMember.findByUserId(user.id);

    if (!member || member.role !== 'owner') {
      return res.status(403).json({
        success: false,
        message: '只有主理人可以退出极音记'
      });
    }

    // 获取当前厂牌信息
    const label = await Label.findById(member.labelId);
    if (!label) {
      return res.status(404).json({
        success: false,
        message: '厂牌不存在'
      });
    }

    // 检查是否已经退出
    if (!label.isInJiYinJi) {
      return res.status(409).json({
        success: false,
        message: '厂牌未在极音记入驻'
      });
    }

    // 更新厂牌状态
    const updatedLabel = await Label.updateById(member.labelId, {
      is_in_jiyinji: false
    });

    logger.success('极音记退出成功', {
      labelId: member.labelId,
      labelName: label.chineseName,
      mainBackendUserId,
      ip
    });

    res.json({
      success: true,
      message: '已退出极音记',
      data: updatedLabel
    });
  } catch (error) {
    logger.error('退出极音记失败', {
      error: error.message,
      stack: error.stack,
      mainBackendUserId: req.user?.id,
      ip
    });

    res.status(500).json({
      success: false,
      message: '退出极音记失败'
    });
  }
});

// 获取厂牌列表
router.get('/', async (req, res) => {
  const ip = logger.getClientIP(req);

  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    logger.info('获取厂牌列表', {
      page,
      limit,
      userId: req.user.id,
      ip
    });

    // 获取厂牌列表
    const labels = await Label.findAll({
      orderBy: 'created_at DESC',
      limit: `${offset}, ${limit}`
    });

    // 获取总数（这里简化处理，实际应该单独查询总数）
    const total = labels.length;

    logger.success('获取厂牌列表成功', {
      total,
      page,
      limit,
      userId: req.user.id,
      ip
    });

    res.json({
      success: true,
      message: '厂牌列表获取成功',
      data: {
        labels: labels.map(label => label.toApiResponse()),
        total,
        page,
        limit
      }
    });
  } catch (error) {
    logger.error('获取厂牌列表失败', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id,
      ip
    });

    res.status(500).json({
      success: false,
      message: '获取厂牌列表失败'
    });
  }
});

// 获取单个厂牌详情
router.get('/:id', async (req, res) => {
  const ip = logger.getClientIP(req);
  const { id } = req.params;

  try {
    logger.info('获取厂牌详情', {
      labelId: id,
      userId: req.user.id,
      ip: ip
    });

    // 查找厂牌
    const label = await Label.findById(id);

    if (!label) {
      return res.status(404).json({
        success: false,
        message: '厂牌不存在'
      });
    }

    logger.success('获取厂牌详情成功', {
      labelId: id,
      userId: req.user.id,
      ip
    });

    res.json({
      success: true,
      message: '厂牌详情获取成功',
      data: label.toApiResponse()
    });
  } catch (error) {
    logger.error('获取厂牌详情失败', {
      error: error.message,
      stack: error.stack,
      labelId: id,
      userId: req.user?.id,
      ip: ip
    });

    res.status(500).json({
      success: false,
      message: '获取厂牌详情失败'
    });
  }
});

// 创建新厂牌
router.post('/', async (req, res) => {
  const ip = logger.getClientIP(req);

  try {
    const { name, description } = req.body;

    logger.info('创建新厂牌', {
      name: name,
      userId: req.user.id,
      ip: ip
    });

    // 基础验证
    if (!name) {
      logger.warn('创建厂牌失败：缺少厂牌名称', {
        userId: req.user.id,
        ip: ip
      });

      return res.status(400).json({
        success: false,
        message: '厂牌名称不能为空'
      });
    }

    // TODO: 实现创建厂牌的逻辑
    const newLabel = {
      id: Date.now().toString(),
      name,
      description: description || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: req.user.id
    };

    logger.success('厂牌创建成功', {
      labelId: newLabel.id,
      name: name,
      userId: req.user.id,
      ip: ip
    });

    res.status(201).json({
      success: true,
      message: '厂牌创建成功',
      data: newLabel
    });
  } catch (error) {
    logger.error('创建厂牌失败', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id,
      ip: ip
    });

    res.status(500).json({
      success: false,
      message: '创建厂牌失败'
    });
  }
});

// 更新厂牌
router.put('/:id', async (req, res) => {
  const ip = logger.getClientIP(req);
  const { id } = req.params;

  try {
    const { name, description } = req.body;

    logger.info('更新厂牌', {
      labelId: id,
      name: name,
      userId: req.user.id,
      ip: ip
    });

    // TODO: 实现更新厂牌的逻辑
    const updatedLabel = {
      id,
      name: name || '更新的厂牌',
      description: description || '更新的描述',
      updatedAt: new Date().toISOString(),
      updatedBy: req.user.id
    };

    logger.success('厂牌更新成功', {
      labelId: id,
      userId: req.user.id,
      ip: ip
    });

    res.json({
      success: true,
      message: '厂牌更新成功',
      data: updatedLabel
    });
  } catch (error) {
    logger.error('更新厂牌失败', {
      error: error.message,
      stack: error.stack,
      labelId: id,
      userId: req.user?.id,
      ip: ip
    });

    res.status(500).json({
      success: false,
      message: '更新厂牌失败'
    });
  }
});

// 删除厂牌
router.delete('/:id', async (req, res) => {
  const ip = logger.getClientIP(req);
  const { id } = req.params;

  try {
    logger.info('删除厂牌', {
      labelId: id,
      userId: req.user.id,
      ip: ip
    });

    // TODO: 实现删除厂牌的逻辑
    const deletedLabel = {
      id,
      deletedAt: new Date().toISOString(),
      deletedBy: req.user.id
    };

    logger.success('厂牌删除成功', {
      labelId: id,
      userId: req.user.id,
      ip: ip
    });

    res.json({
      success: true,
      message: '厂牌删除成功',
      data: deletedLabel
    });
  } catch (error) {
    logger.error('删除厂牌失败', {
      error: error.message,
      stack: error.stack,
      labelId: id,
      userId: req.user?.id,
      ip: ip
    });

    res.status(500).json({
      success: false,
      message: '删除厂牌失败'
    });
  }
});

module.exports = router;
