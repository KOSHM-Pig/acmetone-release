const express = require('express');
const router = express.Router();
const { CoverTemplate } = require('../models');
const { auth, adminAuth } = require('../middleware/auth');

// GET all cover templates
router.get('/', auth, async (req, res) => {
  try {
    console.log('[DEBUG] GET /api/cover-templates - 开始获取封面模板');
    console.log('[DEBUG] 用户ID:', req.user ? req.user.id : '未认证');

    // 检查数据库连接
    try {
      await CoverTemplate.sequelize.authenticate();
      console.log('[DEBUG] 数据库连接正常');
    } catch (dbError) {
      console.error('[ERROR] 数据库连接测试失败:', dbError);
      return res.status(500).json({ message: '数据库连接失败', error: dbError.message });
    }

    // 检查模型是否正确定义
    console.log('[DEBUG] CoverTemplate 模型:', 
      Object.keys(CoverTemplate).join(', '), 
      '表名:', CoverTemplate.tableName);

    const templates = await CoverTemplate.findAll({
      order: [['createdAt', 'DESC']],
    });
    
    console.log(`[DEBUG] 成功获取 ${templates.length} 个模板`);
    res.json(templates);
  } catch (error) {
    console.error('[ERROR] 获取模板失败:', error);
    console.error('[ERROR] 错误堆栈:', error.stack);
    res.status(500).json({ 
      message: '获取模板失败', 
      error: error.message,
      stack: process.env.NODE_ENV === 'production' ? undefined : error.stack 
    });
  }
});

// POST a new cover template
router.post('/', auth, adminAuth, async (req, res) => {
  const { name, definition } = req.body;
  if (!name || !definition) {
    return res.status(400).json({ message: '模板名称和定义不能为空' });
  }

  try {
    const newTemplate = await CoverTemplate.create({ name, definition });
    res.status(201).json(newTemplate);
  } catch (error) {
    res.status(500).json({ message: '创建模板失败' });
  }
});

// PUT to update a cover template
router.put('/:id', auth, adminAuth, async (req, res) => {
  const { name, definition } = req.body;
  if (!name || !definition) {
    return res.status(400).json({ message: '模板名称和定义不能为空' });
  }

  try {
    const template = await CoverTemplate.findByPk(req.params.id);
    if (!template) {
      return res.status(404).json({ message: '模板未找到' });
    }

    template.name = name;
    template.definition = definition;
    await template.save();

    res.json(template);
  } catch (error) {
    res.status(500).json({ message: '更新模板失败' });
  }
});

// DELETE a cover template
router.delete('/:id', auth, adminAuth, async (req, res) => {
  try {
    const template = await CoverTemplate.findByPk(req.params.id);
    if (!template) {
      return res.status(404).json({ message: '模板未找到' });
    }
    await template.destroy();
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: '删除模板失败' });
  }
});

module.exports = router; 