const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { promisify } = require('util');
const fsPromises = require('fs').promises;
const rimraf = require('rimraf');
const sharp = require('sharp'); // 引入sharp库
const { encryptFilePath, decryptFilePath, isPathEncrypted } = require('../utils/encryption');

// 确保上传目录存在
const ensureDirectoryExists = (directory) => {
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
    console.log(`创建目录: ${directory}`);
  }
};

// 创建上传目录
const uploadsDir = path.join(__dirname, '../../uploads');
const audioDir = path.join(uploadsDir, 'audio');
const imageDir = path.join(uploadsDir, 'images');
const thumbnailsDir = path.join(imageDir, 'thumbnails'); // 缩略图目录
const pdfDir = path.join(uploadsDir, 'pdf');
const chunksDir = path.join(uploadsDir, 'chunks');
const dynamicCoversDir = path.join(uploadsDir, 'dynamic_covers'); // 动态封面目录
const tempDir = path.join(__dirname, '../../temp');

// 创建相对路径，用于存储到数据库
const audioRelativeDir = 'uploads/audio';
const imageRelativeDir = 'uploads/images';
const pdfRelativeDir = 'uploads/pdf';
const chunksRelativeDir = 'uploads/chunks';
const dynamicCoversRelativeDir = 'uploads/dynamic_covers'; // 动态封面相对路径

// 确保所有目录存在
ensureDirectoryExists(uploadsDir);
ensureDirectoryExists(audioDir);
ensureDirectoryExists(imageDir);
ensureDirectoryExists(thumbnailsDir); // 确保缩略图目录存在
ensureDirectoryExists(pdfDir);
ensureDirectoryExists(chunksDir);
ensureDirectoryExists(dynamicCoversDir); // 确保动态封面目录存在
ensureDirectoryExists(tempDir);

// 音频文件存储配置
const audioStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, audioDir);
  },
  filename: (req, file, cb) => {
    // 使用时间戳和UUID生成唯一文件名
    const timestamp = Date.now();
    const uuid = uuidv4().substring(0, 8);
    const originalName = file.originalname;
    const extension = path.extname(originalName) || '.wav';
    const fileName = `audio_${timestamp}_${uuid}${extension}`;
    cb(null, fileName);
  }
});

// 图片文件存储配置
const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, imageDir);
  },
  filename: (req, file, cb) => {
    // 使用时间戳和UUID生成唯一文件名
    const timestamp = Date.now();
    const uuid = uuidv4().substring(0, 8);
    const originalName = file.originalname;
    const extension = path.extname(originalName) || '.jpg';
    const fileName = `image_${timestamp}_${uuid}${extension}`;
    cb(null, fileName);
  }
});

// 新增：创建缩略图函数
const createThumbnail = async (originalPath, destinationPath, filename) => {
  try {
    const thumbFilename = `thumb_${filename}`;
    const thumbPath = path.join(destinationPath, thumbFilename);
    await sharp(originalPath)
      .resize(400, 400, {
        fit: 'cover',
        position: 'entropy'
      })
      .toFile(thumbPath);
    console.log(`成功创建缩略图: ${thumbFilename}`);
  } catch (error) {
    console.error(`创建缩略图失败 for ${filename}:`, error);
  }
};

// PDF文件存储配置
const pdfStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, pdfDir);
  },
  filename: (req, file, cb) => {
    try {
      // 从请求URL中提取albumId
      const urlPath = req.originalUrl || '';
      const albumIdMatch = urlPath.match(/\/albums\/(\d+)\/authorization/);
      const albumId = albumIdMatch ? albumIdMatch[1] : '0';
      
      // 生成时间戳和UUID
      const timestamp = Date.now();
      const uuid = uuidv4().substring(0, 8);
      
      // 创建标准格式的文件名
      const fileName = `auth_${albumId}_${timestamp}_${uuid}.pdf`;
      
      console.log('生成授权书文件名:', {
        originalName: file.originalname,
        newFileName: fileName,
        albumId,
        timestamp,
        uuid
      });
      
      cb(null, fileName);
    } catch (error) {
      console.error('生成PDF文件名出错:', error);
      // 使用默认文件名
      const timestamp = Date.now();
      const uuid = uuidv4().substring(0, 8);
      const fileName = `auth_default_${timestamp}_${uuid}.pdf`;
      cb(null, fileName);
    }
  }
});

// 动态封面视频文件存储配置
const dynamicCoverStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    console.log(`设置动态封面目标目录: ${dynamicCoversDir}`);
    ensureDirectoryExists(dynamicCoversDir);
    cb(null, dynamicCoversDir);
  },
  filename: (req, file, cb) => {
    const userId = req.user ? req.user.id : 'unknown';
    const timestamp = Date.now();
    const uuid = uuidv4().substring(0, 8);
    const extension = path.extname(file.originalname) || '.mp4';
    const fileName = `dynamic_cover_${userId}_${timestamp}_${uuid}${extension}`;
    console.log(`生成动态封面文件名: ${fileName}, 原始文件名: ${file.originalname}`);
    cb(null, fileName);
  }
});

// 头像文件存储配置
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, imageDir);
  },
  filename: (req, file, cb) => {
    // 使用用户ID和时间戳生成唯一文件名
    const userId = req.user ? req.user.id : 'unknown';
    const timestamp = Date.now();
    const originalName = file.originalname;
    const extension = path.extname(originalName) || '.jpg';
    const fileName = `avatar_${userId}_${timestamp}${extension}`;
    cb(null, fileName);
  }
});

// 文件过滤器
const fileFilter = (allowedTypes) => {
  return (req, file, cb) => {
    const mimeType = file.mimetype;
    if (allowedTypes.includes(mimeType)) {
      cb(null, true);
    } else {
      cb(new Error(`不支持的文件类型: ${mimeType}，允许的类型: ${allowedTypes.join(', ')}`));
    }
  };
};

// 音频文件过滤器
const audioFilter = (req, file, cb) => {
  // 支持的音频格式
  const allowedTypes = ['audio/wav', 'audio/x-wav', 'audio/wave'];
  
  // 通过扩展名检查
  const extension = path.extname(file.originalname).toLowerCase();
  if (extension === '.wav') {
    return cb(null, true);
  }
  
  // 通过MIME类型检查
  if (allowedTypes.includes(file.mimetype)) {
    return cb(null, true);
  }
  
  cb(new Error('只接受WAV格式的音频文件'));
};

// 图片文件过滤器
const imageFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
  
  // 通过扩展名检查
  const extension = path.extname(file.originalname).toLowerCase();
  if (['.jpg', '.jpeg', '.png'].includes(extension)) {
    return cb(null, true);
  }
  
  // 通过MIME类型检查
  if (allowedTypes.includes(file.mimetype)) {
    return cb(null, true);
  }
  
  cb(new Error('只接受JPG和PNG格式的图片文件'));
};

// PDF文件过滤器
const pdfFilter = (req, file, cb) => {
  const allowedTypes = ['application/pdf'];
  
  // 通过扩展名检查
  const extension = path.extname(file.originalname).toLowerCase();
  if (extension === '.pdf') {
    return cb(null, true);
  }
  
  // 通过MIME类型检查
  if (allowedTypes.includes(file.mimetype)) {
    return cb(null, true);
  }
  
  cb(new Error('只接受PDF格式的文件'));
};

// 动态封面文件过滤器
const dynamicCoverFilter = (req, file, cb) => {
  console.log(`检查动态封面文件类型: ${file.mimetype}, 文件名: ${file.originalname}, 字段名: ${file.fieldname}`);
  
  // 放宽文件类型限制，接受更多视频格式
  const allowedTypes = [
    'video/mp4', 
    'video/quicktime', 
    'video/x-msvideo',
    'video/mpeg',
    'video/webm',
    'application/octet-stream' // 有时文件类型可能不正确
  ];
  
  const extension = path.extname(file.originalname).toLowerCase();
  const allowedExtensions = ['.mp4', '.mov', '.avi', '.mpeg', '.webm'];
  
  if (allowedExtensions.includes(extension) || allowedTypes.includes(file.mimetype)) {
    console.log('文件类型验证通过');
    return cb(null, true);
  }
  
  console.error(`文件类型验证失败: ${file.mimetype}, ${extension}`);
  cb(new Error(`不支持的文件类型: ${file.mimetype}, 允许的类型: MP4, MOV, AVI, MPEG, WEBM`));
};

// 分片文件过滤器 - 不做严格限制，因为已经在前端做了验证
const chunkFilter = (req, file, cb) => {
  cb(null, true);
};

// 头像文件过滤器
const avatarFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
  
  // 通过扩展名检查
  const extension = path.extname(file.originalname).toLowerCase();
  if (['.jpg', '.jpeg', '.png'].includes(extension)) {
    return cb(null, true);
  }
  
  // 通过MIME类型检查
  if (allowedTypes.includes(file.mimetype)) {
    return cb(null, true);
  }
  
  cb(new Error('头像只接受JPG和PNG格式的图片文件'));
};

// 配置上传中间件
const uploadAudio = multer({
  storage: audioStorage,
  fileFilter: audioFilter,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB
    files: 1,
    fieldSize: 200 * 1024 * 1024, // 100MB字段大小限制
    fieldNameSize: 100 // 字段名长度限制
  }
});

const uploadImage = multer({
  storage: imageStorage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB
    files: 1,
    fieldSize: 30 * 1024 * 1024, // 30MB字段大小限制
    fieldNameSize: 100 // 字段名长度限制
  }
});

const uploadPDF = multer({
  storage: pdfStorage,
  fileFilter: pdfFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
    files: 1,
    fieldSize: 60 * 1024 * 1024, // 60MB字段大小限制
    fieldNameSize: 100 // 字段名长度限制
  }
});

// 修改动态封面上传配置
const uploadDynamicCover = multer({
  storage: dynamicCoverStorage,
  fileFilter: dynamicCoverFilter,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB，进一步增加限制
    files: 1,
    fieldSize: 25 * 1024 * 1024, // 增加字段大小限制
    fieldNameSize: 200, // 增加字段名长度限制
  }
});

// 配置头像上传中间件
const uploadAvatar = multer({
  storage: avatarStorage,
  fileFilter: avatarFilter,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB
    files: 1
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

// 添加文件上传错误处理中间件
const handleUploadError = (err, req, res, next) => {
  // 如果没有错误，则处理文件路径并继续
  if (!err) {
    // 如果上传成功且有文件，处理文件路径
    if (req.file) {
      // 获取相对路径
      req.file.path = getRelativePath(req.file.path);
      
      // 如果是音频文件，加密路径
      if (req.file.mimetype && req.file.mimetype.startsWith('audio/')) {
        const originalPath = req.file.path;
        req.file.path = encryptFilePath(originalPath);
        console.log('文件路径已加密:', {
          original: originalPath,
          encrypted: req.file.path
        });
      }
      
      console.log('文件上传成功:', {
        filename: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
        path: req.file.path,
        url: req.originalUrl,
        userId: req.user?.id || '未登录',
        fieldname: req.file.fieldname
      });
    } else {
      console.log('请求中没有文件，检查请求信息:', {
        url: req.originalUrl,
        method: req.method,
        contentType: req.headers['content-type'],
        bodyKeys: Object.keys(req.body || {}),
        hasFiles: !!req.files,
        filesKeys: req.files ? Object.keys(req.files) : []
      });
    }
    
    return next();
  }

  // 处理错误情况
  console.error('文件上传错误:', {
    message: err.message,
    code: err.code,
    name: err.name,
    stack: err.stack?.split('\n')[0],
    url: req.originalUrl,
    method: req.method,
    contentType: req.headers['content-type'],
    bodyKeys: Object.keys(req.body || {}),
    hasFiles: !!req.files,
    filesKeys: req.files ? Object.keys(req.files) : []
  });
  
  // 清理可能产生的临时文件
  if (req.files) {
    try {
      Object.keys(req.files).forEach(key => {
        const file = req.files[key];
        if (file.tempFilePath && fs.existsSync(file.tempFilePath)) {
          fs.unlinkSync(file.tempFilePath);
          console.log(`已清理临时文件: ${file.tempFilePath}`);
        }
      });
    } catch (cleanupError) {
      console.error('清理临时文件失败:', cleanupError);
    }
  }
  
  // 如果有multer产生的临时文件，也尝试清理
  if (req.file && req.file.path) {
    try {
      const fullPath = path.join(__dirname, '../../', req.file.path);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
        console.log(`已清理multer临时文件: ${fullPath}`);
      }
    } catch (cleanupError) {
      console.error('清理multer临时文件失败:', cleanupError);
    }
  }
  
  // 根据错误类型返回不同的错误信息
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      message: '文件大小超过限制',
      detail: '请上传小于规定大小的文件',
      errorCode: 'FILE_TOO_LARGE',
      timestamp: new Date().toISOString()
    });
  }
  
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      message: '未预期的文件字段',
      detail: '请检查表单字段名称是否正确',
      errorCode: 'UNEXPECTED_FILE',
      timestamp: new Date().toISOString()
    });
  }
  
  if (err.message && err.message.includes('Unexpected end of form')) {
    return res.status(400).json({
      message: '表单数据不完整',
      detail: '上传过程中连接可能被中断，请重试。请确保文件大小不超过5MB，并且表单数据完整。',
      errorCode: 'INCOMPLETE_FORM',
      timestamp: new Date().toISOString()
    });
  }
  
  if (err.message && (
      err.message.includes('不支持的文件类型') || 
      err.message.includes('只接受') || 
      err.message.includes('格式的'))) {
    return res.status(415).json({
      message: '文件上传失败',
      detail: err.message,
      errorCode: 'UNSUPPORTED_FILE_TYPE',
      timestamp: new Date().toISOString()
    });
  }
  
  // 默认错误处理
  return res.status(500).json({
    message: '文件上传失败',
    detail: err.message || '未知错误',
    errorCode: 'UPLOAD_ERROR',
    timestamp: new Date().toISOString()
  });
};

// 合并分片函数
const mergeChunks = async (fileId, totalChunks, originalFilename) => {
  return new Promise(async (resolve, reject) => {
    try {
      console.log(`开始合并分片，fileId: ${fileId}, totalChunks: ${totalChunks}, originalFilename: ${originalFilename}`);
      
      // 分片目录
      const chunksDir = path.join(__dirname, '../../uploads/chunks', fileId);
      
      // 检查分片目录是否存在，如果不存在则创建
      if (!fs.existsSync(chunksDir)) {
        console.log(`分片目录不存在，创建目录: ${chunksDir}`);
        fs.mkdirSync(chunksDir, { recursive: true });
      }
      
      // 检查所有分片是否都已上传
      let files = [];
      try {
        files = fs.readdirSync(chunksDir);
        console.log(`找到 ${files.length}/${totalChunks} 个分片文件`);
      } catch (readDirError) {
        return reject(new Error(`读取分片目录失败: ${readDirError.message}`));
      }
      
      if (files.length === 0) {
        return reject(new Error(`分片目录为空，没有找到分片文件`));
      }
      
      if (files.length < totalChunks) {
        console.warn(`分片文件不完整，预期 ${totalChunks} 个，实际 ${files.length} 个，但仍尝试合并可用分片`);
      }
      
      // 创建目标目录
      const uploadsDir = path.join(__dirname, '../../uploads/audio');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      
      // 生成合并后的文件名
      const fileName = originalFilename ? 
        `${Date.now()}-${originalFilename}` : 
        `${Date.now()}-blob.wav`;
      
      const outputPath = path.join(uploadsDir, fileName);
      const outputStream = fs.createWriteStream(outputPath);
      
      console.log(`创建输出文件: ${outputPath}`);
      
      // 使用流式处理合并文件
      let currentChunk = 0;
      
      const processNextChunk = () => {
        if (currentChunk >= totalChunks) {
          // 所有分片处理完毕
          console.log('所有分片合并完成');
          return outputStream.end();
        }
        
        const chunkPath = path.join(chunksDir, currentChunk.toString());
        
        // 检查分片是否存在
        if (!fs.existsSync(chunkPath)) {
          console.warn(`分片 ${currentChunk} 不存在，跳过`);
          currentChunk++;
          return processNextChunk();
        }
        
        console.log(`处理分片 ${currentChunk + 1}/${totalChunks}`);
        
        // 读取分片并写入输出流
        const chunkStream = fs.createReadStream(chunkPath);
        
        chunkStream.once('end', () => {
          currentChunk++;
          processNextChunk();
        });
        
        chunkStream.once('error', (error) => {
          console.error(`读取分片 ${currentChunk} 失败:`, error);
          outputStream.destroy();
          reject(new Error(`读取分片 ${currentChunk} 失败: ${error.message}`));
        });
        
        chunkStream.pipe(outputStream, { end: false });
      };
      
      // 处理输出流事件
      outputStream.on('finish', async () => {
        console.log('文件合并完成，准备清理分片目录');
        
        try {
          // 清理分片目录
          await rimraf(chunksDir);
          console.log(`分片目录已清理: ${chunksDir}`);
        } catch (cleanupError) {
          console.error('清理分片目录失败:', cleanupError);
          // 继续执行，不影响合并结果
        }
        
        // 返回相对路径
        let relativePath = outputPath.replace(/\\/g, '/');
        if (relativePath.includes('uploads/')) {
          relativePath = relativePath.substring(relativePath.indexOf('uploads/'));
        }
        
        // 加密文件路径
        const encryptedPath = encryptFilePath(relativePath);
        console.log('合并后的文件路径已加密:', {
          original: relativePath,
          encrypted: encryptedPath
        });
        
        resolve(encryptedPath);
      });
      
      outputStream.on('error', (error) => {
        console.error('合并文件时出错:', error);
        reject(new Error(`合并文件失败: ${error.message}`));
      });
      
      // 开始处理第一个分片
      processNextChunk();
    } catch (error) {
      console.error('合并分片过程中出错:', error);
      reject(new Error(`合并分片失败: ${error.message}`));
    }
  });
};

// 新增：处理图片上传和缩略图创建的中间件
const handleImageUpload = (req, res, next) => {
  uploadImage.single('image')(req, res, async (err) => {
    if (err) {
      return handleUploadError(err, req, res, next);
    }
    if (req.file) {
      // 文件上传成功，创建缩略图
      const originalPath = req.file.path;
      const destinationPath = path.join(imageDir, 'thumbnails');
      await createThumbnail(originalPath, destinationPath, req.file.filename);
    }
    next();
  });
};

module.exports = {
  uploadAudio,
  uploadImage,
  uploadPDF,
  uploadAvatar,
  uploadDynamicCover,
  handleUploadError,
  getRelativePath,
  mergeChunks
}; 