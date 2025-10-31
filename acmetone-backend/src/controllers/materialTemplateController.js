const MaterialTemplate = require('../models/MaterialTemplate');
const { User } = require('../models');
const fs = require('fs');
const path = require('path');

// 创建物料模板 (Admin)
const createMaterialTemplate = async (req, res) => {
  try {
    console.log('创建物料模板请求体:', JSON.stringify(req.body));
    const { name, description, imageUrl, tags } = req.body;
    
    // 验证必填字段
    if (!name) {
      console.log('物料名称为空');
      return res.status(400).json({ message: '物料名称不能为空' });
    }

    // 验证用户ID
    if (!req.user || !req.user.id) {
      console.log('用户ID缺失');
      return res.status(401).json({ message: '用户未认证或ID缺失' });
    }

    console.log(`尝试创建物料模板: ${name}, 创建者ID: ${req.user.id}`);
    
    // 处理tags字段，确保它是有效的JSON数组
    let parsedTags = tags;
    if (typeof tags === 'string') {
      try {
        parsedTags = JSON.parse(tags);
      } catch (e) {
        console.log('解析tags失败，使用空数组代替');
        parsedTags = [];
      }
    }
    
    // 如果parsedTags不是数组，则设为空数组
    if (!Array.isArray(parsedTags)) {
      parsedTags = [];
    }

    const newTemplate = await MaterialTemplate.create({
      name,
      description: description || '',
      imageUrl: imageUrl || '',
      tags: parsedTags,
      createdBy: req.user.id,
    });
    
    console.log(`物料模板创建成功，ID: ${newTemplate.id}`);
    res.status(201).json(newTemplate);
  } catch (error) {
    console.error('创建物料模板失败:', error);
    console.error('错误堆栈:', error.stack);
    
    // 根据错误类型返回不同的错误信息
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ 
        message: '数据验证失败', 
        errors: error.errors.map(e => e.message) 
      });
    }
    
    if (error.name === 'SequelizeForeignKeyConstraintError') {
      return res.status(400).json({ 
        message: '外键约束错误，请检查关联字段' 
      });
    }
    
    res.status(500).json({ 
      message: '服务器错误，创建物料模板失败',
      error: error.message
    });
  }
};

// 获取所有物料模板 (公开)
const getAllMaterialTemplates = async (req, res) => {
  try {
    const templates = await MaterialTemplate.findAll({
      order: [['createdAt', 'DESC']],
      include: [{ model: User, as: 'creator', attributes: ['id', 'username'] }],
    });
    res.json(templates);
  } catch (error) {
    console.error('获取物料模板失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
};

// 更新物料模板 (Admin)
const updateMaterialTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, imageUrl, tags } = req.body;
    const template = await MaterialTemplate.findByPk(id);
    if (!template) return res.status(404).json({ message: '未找到模板' });

    await template.update({ name, description, imageUrl, tags });
    res.json(template);
  } catch (error) {
    console.error('更新物料模板失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
};

// 删除物料模板 (Admin)
const deleteMaterialTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const template = await MaterialTemplate.findByPk(id);
    if (!template) return res.status(404).json({ message: '未找到模板' });

    await template.destroy();
    res.json({ message: '删除成功' });
  } catch (error) {
    console.error('删除物料模板失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
};

const uploadImageBase64 = async (req, res) => {
    try {
        const { image } = req.body;
        if (!image) {
            return res.status(400).json({ message: '未提供图像数据' });
        }

        const matches = image.match(/^data:(.+);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
            return res.status(400).json({ message: '无效的Base64格式' });
        }
        
        const imageType = matches[1];
        const base64Data = matches[2];
        const buffer = Buffer.from(base64Data, 'base64');

        const extension = imageType.split('/')[1] || 'jpg';
        const fileName = `material_${Date.now()}.${extension}`;
        
        const uploadDir = path.resolve(__dirname, '../../uploads/images');
        const filePath = path.join(uploadDir, fileName);

        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        
        fs.writeFileSync(filePath, buffer);

        const relativePath = `/uploads/images/${fileName}`;
        res.json({ imageUrl: relativePath });
    } catch (error) {
        console.error('上传物料图片失败:', error);
        res.status(500).json({ message: '服务器错误' });
    }
};

module.exports = {
  createMaterialTemplate,
  getAllMaterialTemplates,
  updateMaterialTemplate,
  deleteMaterialTemplate,
  uploadImageBase64,
}; 