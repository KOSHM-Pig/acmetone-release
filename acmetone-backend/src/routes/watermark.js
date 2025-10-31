/**
 * 图片水印处理路由
 */
const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

/**
 * 处理图片水印请求
 * 路径格式: /api/watermark/uploads/images/image.jpg
 */
router.get('/uploads/*', async (req, res) => {
  try {
    // 获取原始图片路径
    const imagePath = req.path.replace('/uploads/', '');
    const fullPath = path.join(__dirname, '../../uploads', imagePath);
    
    // 检查文件是否存在
    if (!fs.existsSync(fullPath)) {
      return res.status(404).send('文件不存在');
    }
    
    // 获取水印文本
    const watermarkText = req.query.message || 'Acmetone版权所有';
    
    // 读取原始图片
    const imageBuffer = fs.readFileSync(fullPath);
    
    // 使用sharp处理图片
    const processedImage = await sharp(imageBuffer)
      // 调整图片质量和大小
      .resize({ width: 800, height: 600, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 70 }) // 降低质量
      // 添加水印
      .composite([{
        input: {
          text: {
            text: watermarkText,
            font: 'Arial',
            fontSize: 48,
            rgba: true
          }
        },
        gravity: 'center',
        blend: 'over'
      }])
      .toBuffer();
    
    // 设置响应头
    res.set('Content-Type', 'image/jpeg');
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    
    // 发送处理后的图片
    res.send(processedImage);
  } catch (error) {
    console.error('处理水印图片失败:', error);
    res.status(500).send('处理图片失败');
  }
});

module.exports = router; 