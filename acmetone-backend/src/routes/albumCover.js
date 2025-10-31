const express = require('express');
const router = express.Router();
const { Album } = require('../models');
const { auth } = require('../middleware/auth');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');

// 配置上传中间件
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../../uploads/album_covers');
    // 确保目录存在
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // 获取文件扩展名
    let ext = path.extname(file.originalname).toLowerCase();
    
    // 如果没有扩展名，根据mimetype添加一个
    if (!ext) {
      if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/jpg') {
        ext = '.jpg';
      } else if (file.mimetype === 'image/png') {
        ext = '.png';
      } else if (file.mimetype === 'image/gif') {
        ext = '.gif';
      } else if (file.mimetype === 'image/webp') {
        ext = '.webp';
      } else {
        ext = '.jpg'; // 默认使用jpg
      }
    }
    
    // 使用UUID生成唯一文件名，避免冲突
    const uniqueFilename = `album_cover_${Date.now()}_${uuidv4()}${ext}`;
    console.log(`保存专辑封面: ${uniqueFilename}, 原始名称: ${file.originalname}, MIME类型: ${file.mimetype}`);
    cb(null, uniqueFilename);
  }
});

// 文件类型过滤
const fileFilter = (req, file, cb) => {
  // 只接受图片文件
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('仅支持上传图片文件'), false);
  }
};

// 配置上传中间件
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 限制10MB
  }
});

// 获取相对路径
const getRelativePath = (filePath) => {
  if (!filePath) return null;
  
  // 将反斜杠替换为正斜杠
  const normalizedPath = filePath.replace(/\\/g, '/');
  
  // 检查路径是否包含uploads目录
  if (normalizedPath.includes('uploads/')) {
    return normalizedPath.substring(normalizedPath.indexOf('uploads/'));
  } else if (normalizedPath.includes('uploads\\')) {
    const path = normalizedPath.substring(normalizedPath.indexOf('uploads\\'));
    return path.replace(/\\/g, '/');
  }
  
  // 如果不包含uploads目录，则返回原始路径
  return normalizedPath;
};

// 上传专辑封面图片
router.post('/:albumId', auth, async (req, res) => {
  try {
    const { albumId } = req.params;
    
    // 验证专辑ID
    if (!albumId || isNaN(parseInt(albumId))) {
      return res.status(400).json({
        message: '无效的专辑ID',
        detail: '请提供有效的专辑ID'
      });
    }
    
    // 查询专辑信息
    const album = await Album.findByPk(albumId);
    if (!album) {
      return res.status(404).json({
        message: '专辑不存在',
        detail: `ID为${albumId}的专辑不存在`
      });
    }
    
    // 检查用户权限
    const isAdmin = req.user.role === 'admin';
    const isOwner = album.submittedById === req.user.id;
    
    if (!isAdmin && !isOwner) {
      return res.status(403).json({
        message: '无权操作',
        detail: '只有专辑所有者或管理员可以修改封面图片'
      });
    }
    
    // 检查专辑状态
    const isDraft = album.status === 'draft' || 
                    album.status === 'pending' && album.comment === 'DRAFT: 尚未提交审核';
    const isRejected = album.status === 'rejected';
    
    if (!isAdmin && !isDraft && !isRejected) {
      return res.status(403).json({
        message: '无法修改',
        detail: '只有草稿状态或已拒绝状态的专辑可以修改封面'
      });
    }
    
    // 使用multer处理文件上传
    upload.single('coverImage')(req, res, async (err) => {
      if (err) {
        console.error('文件上传错误:', err);
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(413).json({
            message: '文件大小超过限制',
            detail: '请上传小于10MB的图片文件'
          });
        }
        return res.status(400).json({
          message: '文件上传失败',
          detail: err.message
        });
      }
      
      // 检查是否有文件上传
      if (!req.file) {
        return res.status(400).json({
          message: '未接收到文件',
          detail: '请选择要上传的封面图片'
        });
      }
      
      try {
        // 获取文件相对路径
        const filePath = getRelativePath(req.file.path);
        
        // 删除旧封面图片(如果存在)
        if (album.coverImage) {
          try {
            const oldFilePath = path.join(__dirname, '../../', album.coverImage);
            if (fs.existsSync(oldFilePath)) {
              fs.unlinkSync(oldFilePath);
              console.log(`已删除旧封面图片: ${oldFilePath}`);
            }
          } catch (deleteError) {
            console.error('删除旧封面图片失败:', deleteError);
            // 继续执行，不因删除旧文件失败而中断
          }
        }
        
        // 更新数据库中的封面图片路径
        await album.update({ coverImage: filePath });
        
        // 返回成功结果
        return res.json({
          message: '封面图片上传成功',
          coverImage: filePath
        });
      } catch (error) {
        console.error('更新专辑封面失败:', error);
        return res.status(500).json({
          message: '更新专辑封面失败',
          detail: error.message
        });
      }
    });
  } catch (error) {
    console.error('处理专辑封面上传请求失败:', error);
    return res.status(500).json({
      message: '服务器错误',
      detail: error.message
    });
  }
});

// 上传专辑封面图片 - Base64方式
router.post('/:albumId/base64', auth, async (req, res) => {
  try {
    const { albumId } = req.params;
    const { fileName, fileType, fileSize, fileData } = req.body;
    
    // 验证请求数据
    if (!fileData) {
      return res.status(400).json({
        message: '无效的请求数据',
        detail: '缺少文件数据'
      });
    }
    
    // 验证专辑ID
    if (!albumId || isNaN(parseInt(albumId))) {
      return res.status(400).json({
        message: '无效的专辑ID',
        detail: '请提供有效的专辑ID'
      });
    }
    
    // 查询专辑信息
    const album = await Album.findByPk(albumId);
    if (!album) {
      return res.status(404).json({
        message: '专辑不存在',
        detail: `ID为${albumId}的专辑不存在`
      });
    }
    
    // 检查用户权限
    const isAdmin = req.user.role === 'admin';
    const isOwner = album.submittedById === req.user.id;
    
    if (!isAdmin && !isOwner) {
      return res.status(403).json({
        message: '无权操作',
        detail: '只有专辑所有者或管理员可以修改封面图片'
      });
    }
    
    // 检查专辑状态
    const isDraft = album.status === 'draft' || 
                    album.status === 'pending' && album.comment === 'DRAFT: 尚未提交审核';
    const isRejected = album.status === 'rejected';
    
    if (!isAdmin && !isDraft && !isRejected) {
      return res.status(403).json({
        message: '无法修改',
        detail: '只有草稿状态或已拒绝状态的专辑可以修改封面'
      });
    }
    
    // 检查文件大小
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (fileSize > maxSize) {
      return res.status(413).json({
        message: '文件大小超过限制',
        detail: '请上传小于10MB的图片文件'
      });
    }
    
    // 检查文件类型
    if (!fileType.startsWith('image/')) {
      return res.status(400).json({
        message: '文件类型不支持',
        detail: '只能上传图片文件'
      });
    }
    
    // 获取文件扩展名
    let ext = '';
    if (fileType === 'image/jpeg' || fileType === 'image/jpg') {
      ext = '.jpg';
    } else if (fileType === 'image/png') {
      ext = '.png';
    } else if (fileType === 'image/gif') {
      ext = '.gif';
    } else if (fileType === 'image/webp') {
      ext = '.webp';
    } else {
      ext = '.jpg'; // 默认使用jpg
    }
    
    // 生成唯一文件名
    const uniqueFilename = `album_cover_${Date.now()}_${uuidv4()}${ext}`;
    const uploadDir = path.join(__dirname, '../../uploads/album_covers');
    const filePath = path.join(uploadDir, uniqueFilename);
    
    // 确保目录存在
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    // 将Base64数据写入文件
    const buffer = Buffer.from(fileData, 'base64');
    fs.writeFileSync(filePath, buffer);
    
    console.log(`Base64上传专辑封面: ${uniqueFilename}, 原始名称: ${fileName}, MIME类型: ${fileType}`);
    
    // 获取相对路径
    const relativePath = getRelativePath(filePath);
    
    // 对于临时模式，直接返回路径，不更新数据库
    if (albumId === 'temp') {
      console.log(`[ALBUM COVER] 临时上传模式，生成封面路径: ${relativePath}`);
      
      // 返回成功结果
      return res.json({
        message: '封面图片上传成功',
        coverImage: relativePath
      });
    } 
    // 对于常规专辑，更新数据库
    else {
      // 删除旧封面图片(如果存在)
      if (album.coverImage) {
        try {
          const oldFilePath = path.join(__dirname, '../../', album.coverImage);
          if (fs.existsSync(oldFilePath)) {
            fs.unlinkSync(oldFilePath);
            console.log(`已删除旧封面图片: ${oldFilePath}`);
          }
        } catch (deleteError) {
          console.error('删除旧封面图片失败:', deleteError);
          // 继续执行，不因删除旧文件失败而中断
        }
      }
      
      // 更新数据库中的封面图片路径
      await album.update({ coverImage: relativePath });
      
      // 返回成功结果
      return res.json({
        message: '封面图片上传成功',
        coverImage: relativePath
      });
    }
  } catch (error) {
    console.error('处理Base64专辑封面上传请求失败:', error);
    return res.status(500).json({
      message: '服务器错误',
      detail: error.message
    });
  }
});

// 获取专辑封面图片
router.get('/:albumId', async (req, res) => {
  try {
    const { albumId } = req.params;
    
    // 验证专辑ID
    if (!albumId || isNaN(parseInt(albumId))) {
      return res.status(400).json({
        message: '无效的专辑ID',
        detail: '请提供有效的专辑ID'
      });
    }
    
    // 查询专辑信息
    const album = await Album.findByPk(albumId);
    if (!album) {
      return res.status(404).json({
        message: '专辑不存在',
        detail: `ID为${albumId}的专辑不存在`
      });
    }
    
    // 检查是否有封面图片
    if (!album.coverImage) {
      return res.status(404).json({
        message: '封面图片不存在',
        detail: '该专辑没有封面图片'
      });
    }
    
    // 返回封面图片路径
    return res.json({
      coverImage: album.coverImage
    });
  } catch (error) {
    console.error('获取专辑封面失败:', error);
    return res.status(500).json({
      message: '服务器错误',
      detail: error.message
    });
  }
});

// 上传封面图片分片 - Base64分片上传
router.post('/:albumId/upload-chunk-base64', auth, async (req, res) => {
  try {
    const { albumId } = req.params;
    const { fileId, chunkIndex, totalChunks, fileName, fileType, chunkData } = req.body;
    
    console.log(`[ALBUM COVER] 接收到分片上传请求: albumId=${albumId}, fileId=${fileId}, chunkIndex=${chunkIndex}, totalChunks=${totalChunks}`);
    
    // 验证请求数据
    if (!fileId || chunkIndex === undefined || !totalChunks || !chunkData) {
      console.log(`[ALBUM COVER] 请求数据验证失败: fileId=${fileId}, chunkIndex=${chunkIndex}, totalChunks=${totalChunks}`);
      return res.status(400).json({
        message: '无效的请求数据',
        detail: '缺少必要的分片信息'
      });
    }
    
    // 特殊处理: 如果albumId是"temp"，表示这是新专辑的预上传，跳过专辑验证
    if (albumId === 'temp') {
      console.log(`[ALBUM COVER] 检测到临时albumId="temp"，跳过专辑验证，允许预上传`);
      // 允许继续处理，不做专辑验证
    } 
    // 常规专辑ID处理
    else {
      // 验证专辑ID
      if (!albumId || isNaN(parseInt(albumId))) {
        console.log(`[ALBUM COVER] 无效的专辑ID: ${albumId}`);
        return res.status(400).json({
          message: '无效的专辑ID',
          detail: '请提供有效的专辑ID'
        });
      }
      
      // 查询专辑信息
      const album = await Album.findByPk(albumId);
      if (!album) {
        console.log(`[ALBUM COVER] 专辑不存在: albumId=${albumId}`);
        return res.status(404).json({
          message: '专辑不存在',
          detail: `ID为${albumId}的专辑不存在`
        });
      }
      
      // 检查用户权限
      const isAdmin = req.user.role === 'admin';
      const isOwner = album.submittedById === req.user.id;
      
      if (!isAdmin && !isOwner) {
        console.log(`[ALBUM COVER] 无权操作: userId=${req.user.id}, albumOwnerId=${album.submittedById}, userRole=${req.user.role}`);
        return res.status(403).json({
          message: '无权操作',
          detail: '只有专辑所有者或管理员可以修改封面图片'
        });
      }
      
      // 检查专辑状态
      const isDraft = album.status === 'draft' || 
                      album.status === 'pending' && album.comment === 'DRAFT: 尚未提交审核';
      const isRejected = album.status === 'rejected';
      
      if (!isAdmin && !isDraft && !isRejected) {
        console.log(`[ALBUM COVER] 无法修改: albumId=${albumId}, status=${album.status}`);
        return res.status(403).json({
          message: '无法修改',
          detail: '只有草稿状态或已拒绝状态的专辑可以修改封面'
        });
      }
    }
    
    // 创建临时目录用于存储分片
    const tempChunksDir = path.join(__dirname, '../../uploads/temp/chunks', fileId);
    if (!fs.existsSync(tempChunksDir)) {
      fs.mkdirSync(tempChunksDir, { recursive: true });
    }
    
    // 将Base64分片数据写入临时文件
    const chunkFilePath = path.join(tempChunksDir, `${chunkIndex}`);
    const buffer = Buffer.from(chunkData, 'base64');
    fs.writeFileSync(chunkFilePath, buffer);
    
    console.log(`专辑封面分片已保存: albumId=${albumId}, fileId=${fileId}, chunkIndex=${chunkIndex}, totalChunks=${totalChunks}`);
    
    return res.json({
      message: '分片上传成功',
      chunkIndex: chunkIndex,
      totalChunks: totalChunks,
      fileId: fileId
    });
  } catch (error) {
    console.error('处理分片上传请求失败:', error);
    return res.status(500).json({
      message: '服务器错误',
      detail: error.message
    });
  }
});

// 合并封面图片分片
router.post('/:albumId/merge-chunks-base64', auth, async (req, res) => {
  try {
    const { albumId } = req.params;
    const { fileId, totalChunks, filename, fileType } = req.body;
    
    console.log(`[ALBUM COVER] 接收到分片合并请求: albumId=${albumId}, fileId=${fileId}, totalChunks=${totalChunks}`);
    
    // 验证请求数据
    if (!fileId || !totalChunks) {
      console.log(`[ALBUM COVER] 请求数据验证失败: fileId=${fileId}, totalChunks=${totalChunks}`);
      return res.status(400).json({
        message: '无效的请求数据',
        detail: '缺少必要的分片信息'
      });
    }
    
    let album = null;
    
    // 特殊处理: 如果albumId是"temp"，表示这是新专辑的预上传，跳过专辑验证
    if (albumId === 'temp') {
      console.log(`[ALBUM COVER] 检测到临时albumId="temp"，跳过专辑验证，允许预合并`);
      // 允许继续处理，不做专辑验证
    }
    // 常规专辑ID处理
    else {
      // 验证专辑ID
      if (!albumId || isNaN(parseInt(albumId))) {
        console.log(`[ALBUM COVER] 无效的专辑ID: ${albumId}`);
        return res.status(400).json({
          message: '无效的专辑ID',
          detail: '请提供有效的专辑ID'
        });
      }
      
      try {
        // 查询专辑信息
        album = await Album.findByPk(albumId);
        if (!album) {
          console.log(`[ALBUM COVER] 专辑不存在: albumId=${albumId}`);
          return res.status(404).json({
            message: '专辑不存在',
            detail: `ID为${albumId}的专辑不存在`
          });
        }
      } catch (dbError) {
        console.error(`[ALBUM COVER] 查询专辑数据库错误:`, dbError);
        return res.status(500).json({
          message: '数据库查询错误',
          detail: dbError.message
        });
      }
      
      // 检查用户权限
      const isAdmin = req.user.role === 'admin';
      const isOwner = album.submittedById === req.user.id;
      
      if (!isAdmin && !isOwner) {
        console.log(`[ALBUM COVER] 无权操作: userId=${req.user.id}, albumOwnerId=${album.submittedById}, userRole=${req.user.role}`);
        return res.status(403).json({
          message: '无权操作',
          detail: '只有专辑所有者或管理员可以修改封面图片'
        });
      }
      
      // 检查专辑状态
      const isDraft = album.status === 'draft' || 
                      album.status === 'pending' && album.comment === 'DRAFT: 尚未提交审核';
      const isRejected = album.status === 'rejected';
      
      if (!isAdmin && !isDraft && !isRejected) {
        console.log(`[ALBUM COVER] 无法修改: albumId=${albumId}, status=${album.status}`);
        return res.status(403).json({
          message: '无法修改',
          detail: '只有草稿状态或已拒绝状态的专辑可以修改封面'
        });
      }
    }
    
    // 获取临时分片目录
    const tempChunksDir = path.join(__dirname, '../../uploads/temp/chunks', fileId);
    
    try {
      // 检查临时目录是否存在
      if (!fs.existsSync(tempChunksDir)) {
        console.error(`[ALBUM COVER] 临时分片目录不存在: ${tempChunksDir}`);
        return res.status(400).json({
          message: '找不到分片文件',
          detail: '请先上传所有分片'
        });
      }
    } catch (fsError) {
      console.error(`[ALBUM COVER] 检查临时分片目录时出错:`, fsError);
      return res.status(500).json({
        message: '文件系统错误',
        detail: `检查临时分片目录失败: ${fsError.message}`
      });
    }
    
    // 检查是否所有分片都已上传
    const checkFiles = [];
    try {
      for (let i = 0; i < totalChunks; i++) {
        const chunkPath = path.join(tempChunksDir, `${i}`);
        if (!fs.existsSync(chunkPath)) {
          console.error(`[ALBUM COVER] 缺少分片文件: ${chunkPath}`);
          return res.status(400).json({
            message: '分片文件不完整',
            detail: `缺少分片 ${i}`
          });
        }
        checkFiles.push(chunkPath);
      }
      console.log(`所有分片已验证完整: fileId=${fileId}, totalChunks=${totalChunks}`);
    } catch (fsError) {
      console.error(`[ALBUM COVER] 验证分片文件时出错:`, fsError);
      return res.status(500).json({
        message: '文件系统错误',
        detail: `验证分片文件失败: ${fsError.message}`
      });
    }
    
    // 获取文件扩展名
    let ext = '';
    if (fileType === 'image/jpeg' || fileType === 'image/jpg') {
      ext = '.jpg';
    } else if (fileType === 'image/png') {
      ext = '.png';
    } else if (fileType === 'image/gif') {
      ext = '.gif';
    } else if (fileType === 'image/webp') {
      ext = '.webp';
    } else {
      ext = '.jpg'; // 默认使用jpg
    }
    
    // 生成唯一文件名
    const uniqueFilename = `album_cover_${Date.now()}_${uuidv4()}${ext}`;
    const uploadDir = path.join(__dirname, '../../uploads/album_covers');
    const filePath = path.join(uploadDir, uniqueFilename);
    
    // 确保目录存在
    try {
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
        console.log(`[ALBUM COVER] 创建上传目录: ${uploadDir}`);
      }
    } catch (mkdirError) {
      console.error(`[ALBUM COVER] 创建上传目录失败:`, mkdirError);
      return res.status(500).json({
        message: '文件系统错误',
        detail: `创建上传目录失败: ${mkdirError.message}`
      });
    }
    
    // 使用缓冲区合并文件，避免流的潜在问题
    try {
      console.log(`[ALBUM COVER] 开始合并分片到文件: ${filePath}`);
      
      // 创建一个缓冲区来存储所有数据
      let buffers = [];
      
      // 按顺序读取所有分片
      for (let i = 0; i < totalChunks; i++) {
        const chunkPath = path.join(tempChunksDir, `${i}`);
        console.log(`[ALBUM COVER] 读取分片 ${i+1}/${totalChunks}: ${chunkPath}`);
        
        try {
          const chunkData = fs.readFileSync(chunkPath);
          buffers.push(chunkData);
        } catch (readError) {
          console.error(`[ALBUM COVER] 读取分片 ${i} 失败:`, readError);
          return res.status(500).json({
            message: '文件系统错误',
            detail: `读取分片 ${i} 失败: ${readError.message}`
          });
        }
      }
      
      // 合并所有缓冲区
      const finalBuffer = Buffer.concat(buffers);
      
      // 写入最终文件
      try {
        fs.writeFileSync(filePath, finalBuffer);
        console.log(`[ALBUM COVER] 成功写入合并文件: ${filePath}, 大小: ${finalBuffer.length} 字节`);
      } catch (writeError) {
        console.error(`[ALBUM COVER] 写入合并文件失败:`, writeError);
        return res.status(500).json({
          message: '文件系统错误',
          detail: `写入合并文件失败: ${writeError.message}`
        });
      }
      
      // 清理分片文件
      try {
        for (let i = 0; i < totalChunks; i++) {
          const chunkPath = path.join(tempChunksDir, `${i}`);
          if (fs.existsSync(chunkPath)) {
            fs.unlinkSync(chunkPath);
          }
        }
        
        // 删除临时分片目录
        if (fs.existsSync(tempChunksDir)) {
          fs.rmdirSync(tempChunksDir);
        }
        
        console.log(`[ALBUM COVER] 已清理临时分片文件和目录`);
      } catch (cleanupError) {
        // 仅记录清理错误，不影响整体流程
        console.error(`[ALBUM COVER] 清理临时文件时出错:`, cleanupError);
      }
    } catch (mergeError) {
      console.error(`[ALBUM COVER] 合并分片过程中出错:`, mergeError);
      return res.status(500).json({
        message: '文件合并错误',
        detail: mergeError.message
      });
    }
    
    // 获取相对路径
    const relativePath = getRelativePath(filePath);
    
    // 对于临时模式，直接返回路径，不更新数据库
    if (albumId === 'temp') {
      console.log(`[ALBUM COVER] 临时上传模式，生成封面路径: ${relativePath}`);
      
      // 返回成功结果
      return res.json({
        message: '封面图片上传成功',
        coverImage: relativePath
      });
    } 
    // 对于常规专辑，更新数据库
    else {
      try {
        // 删除旧封面图片(如果存在)
        if (album.coverImage) {
          try {
            const oldFilePath = path.join(__dirname, '../../', album.coverImage);
            if (fs.existsSync(oldFilePath)) {
              fs.unlinkSync(oldFilePath);
              console.log(`[ALBUM COVER] 已删除旧封面图片: ${oldFilePath}`);
            }
          } catch (deleteError) {
            console.error('[ALBUM COVER] 删除旧封面图片失败:', deleteError);
            // 继续执行，不因删除旧文件失败而中断
          }
        }
        
        // 更新数据库中的封面图片路径
        await album.update({ coverImage: relativePath });
        console.log(`[ALBUM COVER] 已更新数据库中的封面图片路径: albumId=${albumId}, path=${relativePath}`);
        
        // 返回成功结果
        return res.json({
          message: '封面图片上传成功',
          coverImage: relativePath
        });
      } catch (dbError) {
        console.error(`[ALBUM COVER] 更新数据库中的封面图片路径失败:`, dbError);
        return res.status(500).json({
          message: '数据库更新错误',
          detail: dbError.message
        });
      }
    }
  } catch (error) {
    console.error('[ALBUM COVER] 合并分片失败，未捕获的错误:', error);
    return res.status(500).json({
      message: '服务器错误',
      detail: error.message
    });
  }
});

module.exports = router; 