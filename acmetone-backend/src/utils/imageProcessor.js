const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

/**
 * 压缩图片并生成缩略图
 * @param {string} imagePath - 原始图片路径
 * @param {Object} options - 压缩选项
 * @param {number} options.width - 缩略图宽度
 * @param {number} options.height - 缩略图高度
 * @param {number} options.quality - JPEG质量 (1-100)
 * @returns {Promise<string>} - 返回缩略图路径
 */
async function generateThumbnail(imagePath, options = {}) {
  try {
    // 默认选项
    const width = options.width || 500;
    const height = options.height || null; // 保持宽高比
    const quality = options.quality || 70; // 较低的质量以减小文件大小
    
    // 确保原图存在
    if (!fs.existsSync(imagePath)) {
      throw new Error(`原始图片不存在: ${imagePath}`);
    }
    
    // 创建缩略图目录
    const thumbnailDir = path.join(path.dirname(imagePath), 'thumbnails');
    if (!fs.existsSync(thumbnailDir)) {
      fs.mkdirSync(thumbnailDir, { recursive: true });
    }
    
    // 生成缩略图文件名
    const filename = path.basename(imagePath);
    const thumbnailPath = path.join(thumbnailDir, `thumb_${filename}`);
    
    // 压缩图片
    await sharp(imagePath)
      .resize(width, height, {
        fit: 'inside', // 保持宽高比
        withoutEnlargement: true // 避免放大小图片
      })
      .jpeg({ quality }) // 使用较低质量的JPEG格式
      .toFile(thumbnailPath);
    
    console.log(`缩略图生成成功: ${thumbnailPath}`);
    // 返回标准化的路径
    return thumbnailPath.replace(/\\/g, '/');
  } catch (error) {
    console.error('生成缩略图失败:', error);
    // 如果失败，返回原图路径（标准化）
    return imagePath.replace(/\\/g, '/');
  }
}

/**
 * 获取图片的缩略图路径
 * 如果缩略图不存在，则生成一个
 * @param {string} imagePath - 原始图片路径
 * @returns {Promise<string>} - 返回缩略图路径
 */
async function getThumbnailPath(imagePath) {
  try {
    // 标准化路径分隔符为正斜杠
    const normalizedPath = imagePath.replace(/\\/g, '/');
    
    // 检查是否已经是缩略图路径
    if (normalizedPath.includes('/thumbnails/thumb_')) {
      return normalizedPath;
    }
    
    // 构造可能的缩略图路径
    const thumbnailDir = path.join(path.dirname(imagePath), 'thumbnails');
    const filename = path.basename(imagePath);
    const thumbnailPath = path.join(thumbnailDir, `thumb_${filename}`);
    
    // 检查缩略图是否存在
    if (fs.existsSync(thumbnailPath)) {
      // 返回标准化的路径
      return thumbnailPath.replace(/\\/g, '/');
    }
    
    // 如果不存在，生成缩略图
    const generatedPath = await generateThumbnail(imagePath);
    // 返回标准化的路径
    return generatedPath.replace(/\\/g, '/');
  } catch (error) {
    console.error('获取缩略图路径失败:', error);
    // 如果失败，返回原图路径（标准化）
    return imagePath.replace(/\\/g, '/');
  }
}

module.exports = {
  generateThumbnail,
  getThumbnailPath
}; 