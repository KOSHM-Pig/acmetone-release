const express = require('express');
const router = express.Router();
const { adminAuth } = require('../middleware/auth');
const { Label, User } = require('../models');
const { Op } = require('sequelize');

// 健康检查端点
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'AdminLabels API is working',
    timestamp: new Date().toISOString()
  });
});

// 获取所有厂牌申请（管理员）
router.get('/', adminAuth, async (req, res) => {
  try {
    const { page = 1, pageSize = 20, status, search } = req.query;
    const offset = (page - 1) * pageSize;
    const limit = parseInt(pageSize);
    
    // 构建查询条件
    const whereClause = {};
    
    if (status) {
      whereClause.status = status;
    }
    
    if (search) {
      whereClause[Op.or] = [
        { chineseName: { [Op.like]: `%${search}%` } },
        { englishName: { [Op.like]: `%${search}%` } }
      ];
    }
    
    const { count, rows } = await Label.findAndCountAll({
      where: whereClause,
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'username', 'email']
      }, {
        model: User,
        as: 'reviewer',
        attributes: ['id', 'username'],
        required: false
      }],
      order: [['created_at', 'DESC']],
      offset,
      limit
    });
    
    // 返回安全的厂牌信息
    const safeLabels = rows.map(label => label.getSafeInfo());
    
    res.json({
      success: true,
      data: {
        labels: safeLabels,
        total: count,
        page: parseInt(page),
        pageSize: limit,
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('获取厂牌列表失败:', error);
    res.status(500).json({ message: '获取厂牌列表失败', error: error.message });
  }
});

// 获取厂牌详情（管理员）
router.get('/:id', adminAuth, async (req, res) => {
  try {
    const labelId = req.params.id;
    
    const label = await Label.findByPk(labelId, {
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'username', 'email']
      }, {
        model: User,
        as: 'reviewer',
        attributes: ['id', 'username'],
        required: false
      }]
    });
    
    if (!label) {
      return res.status(404).json({ message: '厂牌不存在' });
    }
    
    res.json(label.getSafeInfo());
  } catch (error) {
    console.error('获取厂牌详情失败:', error);
    res.status(500).json({ message: '获取厂牌详情失败', error: error.message });
  }
});

// 审核厂牌申请（管理员）
router.put('/:id/review', adminAuth, async (req, res) => {
  try {
    const labelId = req.params.id;
    const reviewerId = req.user.id;
    const { status, comment } = req.body;
    
    // 验证状态值
    if (!['active', 'inactive'].includes(status)) {
      return res.status(400).json({ message: '无效的审核状态' });
    }
    
    // 查找厂牌
    const label = await Label.findByPk(labelId, {
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'username', 'email']
      }]
    });
    
    if (!label) {
      return res.status(404).json({ message: '厂牌不存在' });
    }
    
    // 检查是否已经审核过
    if (label.status !== 'pending') {
      return res.status(400).json({ message: '该厂牌申请已经审核过了' });
    }
    
    // 更新审核信息
    const updateData = {
      status,
      verifiedBy: reviewerId,
      verifiedAt: new Date()
    };
    
    if (comment) {
      updateData.reviewComment = comment;
    }
    
    // 如果是激活状态，设置验证时间
    if (status === 'active') {
      updateData.verified = true;
      updateData.verifiedAt = new Date();
    }
    
    await label.update(updateData);
    
    // 重新获取更新后的数据
    const updatedLabel = await Label.findByPk(labelId, {
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'username', 'email']
      }, {
        model: User,
        as: 'reviewer',
        attributes: ['id', 'username'],
        required: false
      }]
    });
    
    res.json({
      message: `厂牌申请已${status === 'active' ? '通过' : '拒绝'}`,
      label: updatedLabel.getSafeInfo()
    });
  } catch (error) {
    console.error('审核厂牌申请失败:', error);
    res.status(500).json({ message: '审核厂牌申请失败', error: error.message });
  }
});

// 删除厂牌（管理员）
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const labelId = req.params.id;
    
    const label = await Label.findByPk(labelId);
    if (!label) {
      return res.status(404).json({ message: '厂牌不存在' });
    }
    
    await label.destroy();
    
    res.json({ message: '厂牌已删除' });
  } catch (error) {
    console.error('删除厂牌失败:', error);
    res.status(500).json({ message: '删除厂牌失败', error: error.message });
  }
});

// 获取厂牌统计信息（管理员）
router.get('/stats/overview', adminAuth, async (req, res) => {
  try {
    const totalCount = await Label.count();
    const pendingCount = await Label.count({ where: { status: 'pending' } });
    const activeCount = await Label.count({ where: { status: 'active' } });
    const inactiveCount = await Label.count({ where: { status: 'inactive' } });
    
    res.json({
      total: totalCount,
      pending: pendingCount,
      active: activeCount,
      inactive: inactiveCount
    });
  } catch (error) {
    console.error('获取厂牌统计信息失败:', error);
    res.status(500).json({ message: '获取厂牌统计信息失败', error: error.message });
  }
});

module.exports = router;
