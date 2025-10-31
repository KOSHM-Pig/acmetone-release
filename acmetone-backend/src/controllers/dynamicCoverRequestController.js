const { DynamicCoverRequest, Album, User } = require('../models');
const { sequelize } = require('../config/db');
const { getRelativePath } = require('../middleware/upload');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffprobePath = require('@ffprobe-installer/ffprobe').path;
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
// 已经导入了 express-validator，不需要重复导入

ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

// 临时目录，用于存储分片
const tempDir = path.join(__dirname, '../../temp/chunks');
// 确保临时目录存在
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
  console.log(`创建临时目录: ${tempDir}`);
}

// 获取文件大小
const getFileSize = (filePath) => {
  try {
    const stats = fs.statSync(filePath);
    return stats.size;
  } catch (error) {
    console.error('获取文件大小失败:', error);
    return 0;
  }
};

// 确保目录存在
const ensureDirectoryExists = (directory) => {
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
    console.log(`创建目录: ${directory}`);
  }
};

const getVideoMetadata = (filePath) => {
  return new Promise((resolve, reject) => {
    console.log(`开始获取视频元数据，文件路径: ${filePath}`);
    
    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
      console.error(`文件不存在: ${filePath}`);
      return reject(new Error(`文件不存在: ${filePath}`));
    }
    
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        console.error(`ffprobe错误:`, err);
        console.error(`错误堆栈:`, err.stack);
        console.error(`命令:`, err.cmd);
        console.error(`退出码:`, err.exitCode);
        console.error(`信号:`, err.signal);
        console.error(`输出:`, err.stdout);
        console.error(`错误输出:`, err.stderr);
        return reject(err);
      }
      
      console.log(`获取到元数据:`, JSON.stringify(metadata, null, 2).substring(0, 500) + '...');
      
      const videoStream = metadata.streams.find(s => s.codec_type === 'video');
      if (!videoStream) {
        console.error(`未找到视频流:`, metadata.streams.map(s => s.codec_type));
        return reject(new Error('No video stream found'));
      }
      
      const result = {
        duration: videoStream.duration,
        resolution: `${videoStream.width}x${videoStream.height}`
      };
      
      console.log(`提取的视频元数据:`, result);
      resolve(result);
    });
  });
};

const uploadDynamicCoverFile = async (req, res) => {
  try {
    console.log('进入uploadDynamicCoverFile控制器函数');
    
    if (!req.file) {
      return res.status(400).json({ 
        message: '没有接收到文件',
        detail: '请确保已选择文件并正确提交，字段名应为file'
      });
    }

    // 检查是否是竖版文件
    const isPortrait = req.query.isPortrait === 'true';
    
    console.log('文件上传成功:', {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path
    });

    // 获取相对路径
    const filePath = req.file.path.replace(/\\/g, '/').replace(/^.*uploads\//, '/uploads/');
    
    // 简化响应
    return res.status(200).json({
      message: '文件上传成功',
      filePath: filePath,
      isPortrait: isPortrait
    });
  } catch (error) {
    console.error('文件上传失败:', error);
    return res.status(500).json({
      message: '文件上传失败',
      error: error.message
    });
  }
};

const uploadDynamicCoverBase64 = async (req, res) => {
  try {
    const { base64Data, fileName, trackId } = req.body;
    const userId = req.user.id;

    if (!base64Data) {
      return res.status(400).json({ message: '缺少文件数据' });
    }

    if (!fileName) {
      return res.status(400).json({ message: '缺少文件名' });
    }

    console.log('接收到Base64上传请求:', {
      userId,
      fileName,
      base64DataLength: base64Data ? base64Data.length : 0
    });

    try {
      // 从Base64字符串中提取实际数据部分（去掉前缀）
      let fileData;
      if (base64Data.startsWith('data:')) {
        const base64Prefix = 'data:';
        const base64Separator = ';base64,';
        
        if (base64Data.includes(base64Separator)) {
          const prefixIndex = base64Data.indexOf(base64Prefix) + base64Prefix.length;
          const separatorIndex = base64Data.indexOf(base64Separator);
          const mimeType = base64Data.substring(prefixIndex, separatorIndex);
          const base64Content = base64Data.substring(separatorIndex + base64Separator.length);
          
          console.log('解析的MIME类型:', mimeType);
          console.log('Base64内容长度:', base64Content.length);
          
          fileData = Buffer.from(base64Content, 'base64');
        } else {
          return res.status(400).json({ 
            message: '无效的Base64 URL格式', 
            detail: '缺少;base64,分隔符' 
          });
        }
      } else {
        // 尝试直接解码Base64字符串
        fileData = Buffer.from(base64Data, 'base64');
      }

      // 检查解码后的数据是否有效
      if (!fileData || fileData.length === 0) {
        return res.status(400).json({ 
          message: '无效的文件数据', 
          detail: '解码后的文件数据为空' 
        });
      }

      // 确保动态封面目录存在
      const dynamicCoversDir = path.join(__dirname, '../../uploads/dynamic_covers');
      ensureDirectoryExists(dynamicCoversDir);

      // 生成唯一文件名
      const timestamp = Date.now();
      const uuid = uuidv4().substring(0, 8);
      const extension = path.extname(fileName) || '.mp4';
      const newFileName = `dynamic_cover_${userId}_${timestamp}_${uuid}${extension}`;
      const filePath = path.join(dynamicCoversDir, newFileName);
      
      // 写入文件
      fs.writeFileSync(filePath, fileData);
      console.log(`文件已保存: ${filePath}, 大小: ${fileData.length} 字节`);
      
      // 返回相对路径
      const relativePath = `/uploads/dynamic_covers/${newFileName}`;
      res.status(200).json({
        message: '文件上传成功',
        filePath: relativePath
      });
    } catch (error) {
      console.error('保存Base64文件失败:', error);
      return res.status(500).json({ 
        message: '保存文件失败', 
        error: error.message 
      });
    }
  } catch (error) {
    console.error('Base64上传处理失败:', error);
    res.status(500).json({
      message: '服务器错误',
      error: error.message
    });
  }
};

const createDynamicCoverRequest = async (req, res) => {
  try {
    console.log('接收到动态封面请求:', {
      body: {
        trackId: req.body.trackId,
        filePath: req.body.filePath,
        portraitFilePath: req.body.portraitFilePath,
        platform: req.body.platform
      },
      headers: req.headers['content-type'],
      method: req.method,
      url: req.originalUrl
    });

    const { trackId: albumId, filePath, portraitFilePath, platform } = req.body;
    const userId = req.user.id;

    if (!albumId) {
      return res.status(400).json({ message: '缺少专辑ID' });
    }

    // 先检查专辑是否存在及其状态，避免不必要的文件处理
    const album = await Album.findByPk(albumId);
    if (!album) {
      return res.status(404).json({ message: '专辑未找到' });
    }
    
    // 检查专辑状态是否为待审核
    if (album.status !== 'pending') {
      return res.status(400).json({ 
        message: '只有待审核状态的专辑才能申请动态封面',
        detail: `当前专辑状态: ${album.status}`
      });
    }
    
    // 检查是否已经为该专辑和平台提交了申请
    const existingRequest = await DynamicCoverRequest.findOne({
      where: {
        albumId,
        platform,
        status: ['pending', 'approved'] // 只检查待审核和已批准的申请
      }
    });

    if (existingRequest) {
      return res.status(400).json({
        message: '已存在相同平台的动态封面申请',
        detail: `您已经为该专辑在${getPlatformDisplayName(platform)}平台提交了动态封面申请`
      });
    }

    if (!filePath) {
      return res.status(400).json({ message: '缺少文件路径' });
    }

    // 如果是苹果音乐平台，则需要竖版封面
    if (platform === 'applemusic' && !portraitFilePath) {
      return res.status(400).json({ 
        message: '缺少苹果音乐竖版封面文件', 
        detail: '苹果音乐平台需要同时上传1:1和3:4两种格式的动态封面'
      });
    }

    if (!platform || !['netease', 'qqmusic', 'applemusic'].includes(platform)) {
      return res.status(400).json({ 
        message: '无效的平台参数', 
        detail: '平台必须是 netease, qqmusic 或 applemusic 之一'
      });
    }
    
          try {
      // 构建文件的完整路径
      const fullPath = path.join(__dirname, '../../', filePath);
      console.log('开始获取视频元数据...', fullPath);
      
      // 获取视频元数据
      const metadata = await getVideoMetadata(fullPath);
      console.log('视频元数据:', metadata);

      // 获取文件大小
      const fileSize = getFileSize(fullPath);
      
      // 从文件路径中提取文件名
      const fileName = path.basename(filePath);

      // 创建请求数据对象
      const requestData = {
        userId,
        albumId,
        platform,
        dynamicCoverPath: filePath,
        originalFilename: fileName,
        fileSize: fileSize,
        duration: metadata.duration,
        resolution: metadata.resolution,
        status: 'pending'
      };

      // 如果是苹果音乐并且有竖版封面，则处理竖版封面
      if (platform === 'applemusic' && portraitFilePath) {
        const portraitFullPath = path.join(__dirname, '../../', portraitFilePath);
        console.log('开始获取竖版视频元数据...', portraitFullPath);
        
        try {
          const portraitMetadata = await getVideoMetadata(portraitFullPath);
          console.log('竖版视频元数据:', portraitMetadata);
          
          const portraitFileSize = getFileSize(portraitFullPath);
          const portraitFileName = path.basename(portraitFilePath);

          // 将竖版封面信息添加到请求数据
          // 确保路径以斜杠开头
          const normalizedPortraitPath = portraitFilePath.startsWith('/') ? portraitFilePath : `/${portraitFilePath}`;
          requestData.portraitCoverPath = normalizedPortraitPath;
          requestData.portraitOriginalFilename = portraitFileName;
          requestData.portraitFileSize = portraitFileSize;
          requestData.portraitDuration = portraitMetadata.duration;
          requestData.portraitResolution = portraitMetadata.resolution;
        } catch (portraitError) {
          console.error('处理竖版视频元数据失败:', portraitError);
          return res.status(400).json({ 
            message: '竖版视频文件处理失败', 
            detail: portraitError.message 
          });
        }
      }

      const request = await DynamicCoverRequest.create(requestData);

      console.log('动态封面请求创建成功:', request.id);
      res.status(201).json(request);
    } catch (metadataError) {
      console.error('处理视频元数据失败:', metadataError);
      return res.status(400).json({ 
        message: '视频文件处理失败', 
        detail: metadataError.message 
      });
    }
  } catch (error) {
    console.error('创建动态封面申请失败:', error);
    console.error('错误堆栈:', error.stack);
    console.error('请求信息:', {
      method: req.method,
      url: req.originalUrl,
      headers: req.headers,
      body: {
        trackId: req.body.trackId,
        filePath: req.body.filePath,
        portraitFilePath: req.body.portraitFilePath,
        platform: req.body.platform
      },
      user: req.user ? { id: req.user.id } : null
    });
    
    res.status(500).json({ 
      message: '服务器错误', 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// 辅助函数：获取平台的显示名称
const getPlatformDisplayName = (platform) => {
  const platformNames = {
    'netease': '网易云音乐',
    'qqmusic': 'QQ音乐',
    'applemusic': '苹果音乐'
  };
  return platformNames[platform] || platform;
};

const getUserDynamicCoverRequests = async (req, res) => {
  try {
    const userId = req.user.id;
    const requests = await DynamicCoverRequest.findAll({
      where: { userId },
      include: [{
        model: Album,
        attributes: ['title', 'coverImage', 'performer']
      }],
      order: [['createdAt', 'DESC']]
    });

    // 获取所有相关专辑的ID
    const albumIds = requests.map(r => r.albumId);
    
    // 获取所有相关专辑的动态封面信息
    let albumDynamicCoverMap = {};
    if (albumIds.length > 0) {
      const [albumsWithDynamicCover] = await sequelize.query(`
        SELECT id, dynamicCoverPath, hasDynamicCover 
        FROM albums 
        WHERE id IN (:albumIds)
      `, { 
        replacements: { albumIds } 
      });
      
      // 创建专辑ID到动态封面信息的映射
      albumsWithDynamicCover.forEach(album => {
        albumDynamicCoverMap[album.id] = {
          dynamicCoverPath: album.dynamicCoverPath,
          hasDynamicCover: album.hasDynamicCover
        };
      });
    }

    // Manually construct the response to match frontend expectations if needed
    const response = requests.map(r => {
        const plainRequest = r.get({ plain: true });
        const albumDynamicCover = albumDynamicCoverMap[plainRequest.albumId] || {};
        
        return {
            ...plainRequest,
            albumTitle: plainRequest.Album.title,
            albumCover: plainRequest.Album.coverImage.startsWith('http') 
              ? plainRequest.Album.coverImage 
              : `/${plainRequest.Album.coverImage}`,
            artistName: plainRequest.Album.performer,
            dynamicCoverPath: plainRequest.dynamicCoverPath.startsWith('http') 
              ? plainRequest.dynamicCoverPath 
              : `/${plainRequest.dynamicCoverPath}`,
            // 添加专辑动态封面信息
            albumDynamicCoverPath: albumDynamicCover.dynamicCoverPath ? 
              (albumDynamicCover.dynamicCoverPath.startsWith('http') 
                ? albumDynamicCover.dynamicCoverPath 
                : `/${albumDynamicCover.dynamicCoverPath}`) 
              : null,
            albumHasDynamicCover: !!albumDynamicCover.hasDynamicCover
        }
    });

    res.json(response);
  } catch (error) {
    console.error('获取用户动态封面申请列表失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
};

const getDynamicCoverRequestById = async (req, res) => {
  try {
    const { id } = req.params;
    const request = await DynamicCoverRequest.findByPk(id, {
      include: [
        { model: User, attributes: ['username'] },
        { 
          model: Album,
          attributes: ['id', 'title', 'coverImage', 'performer'],
          include: [{ model: User, as: 'submittedBy', attributes: ['username'] }] 
        }
      ]
    });

    if (!request) {
      return res.status(404).json({ message: '申请未找到' });
    }
    
    // Check if user is owner or admin
    if (req.user.id !== request.userId && req.user.role !== 'admin') {
        return res.status(403).json({ message: '无权访问' });
    }
    
    const plainRequest = request.get({ plain: true });
    plainRequest.albumCover = plainRequest.Album.coverImage.startsWith('http') 
      ? plainRequest.Album.coverImage 
      : `/${plainRequest.Album.coverImage}`;
    plainRequest.dynamicCoverPath = plainRequest.dynamicCoverPath.startsWith('http') 
      ? plainRequest.dynamicCoverPath 
      : `/${plainRequest.dynamicCoverPath}`;
      
    // 获取专辑的动态封面信息
    try {
      const [albumResults] = await sequelize.query('SELECT dynamicCoverPath, hasDynamicCover FROM albums WHERE id = :id', { 
        replacements: { id: plainRequest.albumId } 
      });
      
      if (albumResults && albumResults.length > 0) {
        plainRequest.albumDynamicCoverPath = albumResults[0].dynamicCoverPath ? 
          (albumResults[0].dynamicCoverPath.startsWith('http') 
            ? albumResults[0].dynamicCoverPath 
            : `/${albumResults[0].dynamicCoverPath}`) 
          : null;
        plainRequest.albumHasDynamicCover = !!albumResults[0].hasDynamicCover;
      }
    } catch (error) {
      console.error('获取专辑动态封面信息失败:', error);
    }

    res.json(plainRequest);
  } catch (error) {
    console.error('获取动态封面申请详情失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
};

const getAllDynamicCoverRequests = async (req, res) => {
  try {
    const requests = await DynamicCoverRequest.findAll({
      include: [
        { model: User, attributes: ['id', 'username'] },
        { 
          model: Album, 
          attributes: ['title', 'coverImage', 'performer'],
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    // 获取所有相关专辑的ID
    const albumIds = requests.map(r => r.albumId);
    
    // 获取所有相关专辑的动态封面信息
    const [albumsWithDynamicCover] = await sequelize.query(`
      SELECT id, dynamicCoverPath, hasDynamicCover 
      FROM albums 
      WHERE id IN (:albumIds)
    `, { 
      replacements: { albumIds } 
    });
    
    // 创建专辑ID到动态封面信息的映射
    const albumDynamicCoverMap = {};
    albumsWithDynamicCover.forEach(album => {
      albumDynamicCoverMap[album.id] = {
        dynamicCoverPath: album.dynamicCoverPath,
        hasDynamicCover: album.hasDynamicCover
      };
    });

    const response = requests.map(r => {
        const plainRequest = r.get({ plain: true });
        const albumDynamicCover = albumDynamicCoverMap[plainRequest.albumId] || {};
        
        // 检查Album是否存在，如果不存在则提供默认值
        const album = plainRequest.Album || { title: '未知专辑', coverImage: '', performer: '未知艺术家' };
        
        return {
            ...plainRequest,
            albumTitle: album.title,
            albumCover: album.coverImage && album.coverImage.startsWith('http') 
              ? album.coverImage 
              : album.coverImage ? `/${album.coverImage}` : '',
            artistName: album.performer,
            username: plainRequest.User ? plainRequest.User.username : '未知用户',
            dynamicCoverPath: plainRequest.dynamicCoverPath && plainRequest.dynamicCoverPath.startsWith('http') 
              ? plainRequest.dynamicCoverPath 
              : `/${plainRequest.dynamicCoverPath}`,
            // 添加专辑动态封面信息
            albumDynamicCoverPath: albumDynamicCover.dynamicCoverPath ? 
              (albumDynamicCover.dynamicCoverPath.startsWith('http') 
                ? albumDynamicCover.dynamicCoverPath 
                : `/${albumDynamicCover.dynamicCoverPath}`) 
              : null,
            albumHasDynamicCover: !!albumDynamicCover.hasDynamicCover
        }
    });

    res.json(response);
  } catch (error) {
    console.error('获取所有动态封面申请失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

const updateDynamicCoverRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejectionReason, adminComment } = req.body;
    
    console.log(`[DEBUG] 开始处理动态封面请求更新，ID: ${id}, 状态: ${status}`);

    // 获取动态封面请求，但不包含Album关联
    const request = await DynamicCoverRequest.findByPk(id);

    if (!request) {
      console.log(`[ERROR] 找不到ID为 ${id} 的动态封面请求`);
      return res.status(404).json({ message: '申请未找到' });
    }
    
    console.log(`[DEBUG] 找到动态封面请求: ${JSON.stringify({
      id: request.id,
      albumId: request.albumId,
      status: request.status,
      dynamicCoverPath: request.dynamicCoverPath
    })}`);

    // 如果要批准请求，先检查文件是否存在
    if (status === 'approved' && request.dynamicCoverPath) {
      // 检查动态封面文件是否存在
      const pathOptions = [
        path.join(__dirname, '../../', request.dynamicCoverPath),
        path.join(__dirname, '../../', request.dynamicCoverPath.replace(/^\/+/, '')),
        request.dynamicCoverPath,
        path.resolve(process.cwd(), request.dynamicCoverPath)
      ];
      
      let fileExists = false;
      let existingPath = null;
      
      for (const testPath of pathOptions) {
        console.log(`[DEBUG] 检查动态封面文件路径: ${testPath}`);
        if (fs.existsSync(testPath)) {
          fileExists = true;
          existingPath = testPath;
          console.log(`[DEBUG] 动态封面文件存在: ${testPath}`);
          break;
        }
      }
      
      if (!fileExists) {
        console.error(`[ERROR] 动态封面文件不存在，无法批准请求`);
        return res.status(400).json({ 
          message: '动态封面文件不存在，无法批准请求',
          detail: `尝试了以下路径: ${pathOptions.join(', ')}`
        });
      }
      
      console.log(`[DEBUG] 动态封面文件验证通过: ${existingPath}`);
    }

    request.status = status || request.status;
    request.rejectionReason = rejectionReason;
    request.adminComment = adminComment;

    console.log(`[DEBUG] 更新动态封面请求状态为: ${request.status}`);
    await request.save();
    console.log(`[DEBUG] 动态封面请求保存成功`);

    // 如果状态为approved，则直接通过albumId更新专辑的动态封面信息
    if (status === 'approved') {
      console.log(`[DEBUG] 状态为approved，尝试更新专辑ID ${request.albumId} 的动态封面信息`);
      
      let updateSuccess = false;
      
      try {
        // 方法1: 使用原始SQL更新 - 这是最可靠的方法
        console.log(`[DEBUG] 尝试使用SQL直接更新专辑动态封面信息`);
        const [updateResult] = await sequelize.query(`
          UPDATE albums 
          SET dynamicCoverPath = :path, 
              hasDynamicCover = 1,
              updatedAt = NOW()
          WHERE id = :id
        `, {
          replacements: { 
            path: request.dynamicCoverPath, 
            id: request.albumId 
          }
        });
        
        console.log(`[DEBUG] SQL更新结果:`, updateResult);
        
        // 检查是否有行被更新
        if (updateResult && 
            (updateResult.affectedRows > 0 || 
             updateResult.rowCount > 0 || 
             (typeof updateResult === 'object' && updateResult.info && updateResult.info.includes('Changed: 1')))) {
          console.log(`[SUCCESS] SQL成功更新专辑ID ${request.albumId} 的动态封面信息`);
          updateSuccess = true;
        } else {
          console.log(`[WARNING] SQL更新可能未生效，尝试使用模型更新`);
          
          // 方法2: 使用Sequelize模型更新
          const album = await Album.findByPk(request.albumId);
          console.log(`[DEBUG] 查询专辑结果: ${album ? '找到专辑' : '专辑未找到'}`);
          
          if (album) {
            console.log(`[DEBUG] 专辑信息: ${JSON.stringify({
              id: album.id,
              title: album.title,
              currentDynamicCoverPath: album.dynamicCoverPath,
              currentHasDynamicCover: album.hasDynamicCover
            })}`);
            
            console.log(`[DEBUG] 准备更新专辑动态封面，路径: ${request.dynamicCoverPath}`);
            const updateResult = await album.update({
              dynamicCoverPath: request.dynamicCoverPath,
              hasDynamicCover: true
            });
            
            console.log(`[DEBUG] 专辑更新结果: ${JSON.stringify(updateResult)}`);
            console.log(`[SUCCESS] 已更新专辑ID ${request.albumId} 的动态封面信息`);
            updateSuccess = true;
          } else {
            console.error(`[ERROR] 找不到专辑ID ${request.albumId}`);
          }
        }
      } catch (albumError) {
        console.error(`[ERROR] 更新专辑动态封面时出错:`, albumError);
      }
      
      // 验证更新是否成功
      try {
        const [results] = await sequelize.query('SELECT id, title, dynamicCoverPath, hasDynamicCover FROM albums WHERE id = :id', { 
          replacements: { id: request.albumId } 
        });
        console.log(`[DEBUG] 更新后的专辑信息:`, JSON.stringify(results, null, 2));
      } catch (verifyError) {
        console.error(`[ERROR] 验证更新结果时出错:`, verifyError);
      }
    }

    res.json(request);
  } catch (error) {
    console.error('[ERROR] 更新动态封面申请失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
};

const deleteDynamicCoverRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const request = await DynamicCoverRequest.findByPk(id);

    if (!request) {
      return res.status(404).json({ message: '申请未找到' });
    }

    // TODO: Optionally delete the file from storage
    // const filePath = path.join(__dirname, '../../', request.dynamicCoverPath);
    // fs.unlink(filePath, (err) => { ... });

    await request.destroy();

    res.json({ message: '申请已删除' });
  } catch (error) {
    console.error('删除动态封面申请失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
};

// 重新提交被拒绝的动态封面申请
const resubmitDynamicCoverRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // 查找申请
    const request = await DynamicCoverRequest.findByPk(id);

    if (!request) {
      return res.status(404).json({ message: '申请未找到' });
    }

    // 验证是否是申请人本人
    if (request.userId !== userId) {
      return res.status(403).json({ message: '无权重新提交此申请' });
    }

    // 验证申请是否被拒绝
    if (request.status !== 'rejected') {
      return res.status(400).json({ message: '只有被拒绝的申请才能重新提交' });
    }

    // 更新申请状态为待审核
    request.status = 'pending';
    request.rejectionReason = null; // 清除拒绝原因
    
    await request.save();

    res.json({ 
      message: '申请已重新提交审核',
      request
    });
  } catch (error) {
    console.error('重新提交动态封面申请失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
};

// 使用原始SQL更新专辑表
const updateAlbumWithSQL = async (albumId, dynamicCoverPath) => {
  try {
    console.log(`[DEBUG] 尝试使用原始SQL更新专辑ID ${albumId} 的动态封面信息`);
    
    const [results, metadata] = await sequelize.query(`
      UPDATE albums 
      SET dynamicCoverPath = :dynamicCoverPath, 
          hasDynamicCover = 1,
          updatedAt = NOW()
      WHERE id = :albumId
    `, {
      replacements: { 
        dynamicCoverPath, 
        albumId 
      }
    });
    
    console.log(`[DEBUG] SQL更新结果:`, metadata);
    
    // 检查是否有行被更新
    // MySQL返回的metadata格式与PostgreSQL不同
    if (typeof metadata === 'number') {
      // MySQL返回影响的行数
      return metadata > 0;
    } else if (metadata && typeof metadata.rowCount === 'number') {
      // PostgreSQL返回rowCount
      return metadata.rowCount > 0;
    } else if (metadata && typeof metadata.affectedRows === 'number') {
      // 某些MySQL配置返回affectedRows
      return metadata.affectedRows > 0;
    }
    
    // 如果无法确定，则假设更新成功
    return true;
  } catch (error) {
    console.error(`[ERROR] SQL更新专辑失败:`, error);
    return false;
  }
};

// 处理分片上传
const handleChunkedUpload = async (req, res) => {
  try {
    const { 
      fileName, 
      fileType, 
      uploadId, 
      chunkIndex, 
      totalChunks, 
      isLastChunk, 
      base64Data, 
      isPortrait,
      fileSize 
    } = req.body;
    
    const userId = req.user.id;

    if (!base64Data) {
      return res.status(400).json({ message: '缺少文件数据' });
    }

    if (!fileName) {
      return res.status(400).json({ message: '缺少文件名' });
    }

    if (!uploadId) {
      return res.status(400).json({ message: '缺少上传ID' });
    }

    console.log(`接收到分片上传请求: 文件=${fileName}, 分片=${chunkIndex + 1}/${totalChunks}, 上传ID=${uploadId}`);

    // 创建上传ID的临时目录
    const uploadTempDir = path.join(tempDir, uploadId);
    if (!fs.existsSync(uploadTempDir)) {
      fs.mkdirSync(uploadTempDir, { recursive: true });
    }

    try {
      // 从Base64字符串中提取实际数据部分（去掉前缀）
      let fileData;
      if (base64Data.startsWith('data:')) {
        const base64Prefix = 'data:';
        const base64Separator = ';base64,';
        
        if (base64Data.includes(base64Separator)) {
          const prefixIndex = base64Data.indexOf(base64Prefix) + base64Prefix.length;
          const separatorIndex = base64Data.indexOf(base64Separator);
          const mimeType = base64Data.substring(prefixIndex, separatorIndex);
          const base64Content = base64Data.substring(separatorIndex + base64Separator.length);
          
          fileData = Buffer.from(base64Content, 'base64');
        } else {
          return res.status(400).json({ 
            message: '无效的Base64 URL格式', 
            detail: '缺少;base64,分隔符' 
          });
        }
      } else {
        // 尝试直接解码Base64字符串
        fileData = Buffer.from(base64Data, 'base64');
      }

      // 检查解码后的数据是否有效
      if (!fileData || fileData.length === 0) {
        return res.status(400).json({ 
          message: '无效的文件数据', 
          detail: '解码后的文件数据为空' 
        });
      }

      // 保存分片文件
      const chunkFilePath = path.join(uploadTempDir, `chunk_${chunkIndex}`);
      fs.writeFileSync(chunkFilePath, fileData);
      
      // 如果是最后一个分片，合并所有分片
      if (isLastChunk) {
        // 确保动态封面目录存在
        const dynamicCoversDir = path.join(__dirname, '../../uploads/dynamic_covers');
        if (!fs.existsSync(dynamicCoversDir)) {
          fs.mkdirSync(dynamicCoversDir, { recursive: true });
        }

        // 生成唯一文件名
        const timestamp = Date.now();
        const uuid = uuidv4().substring(0, 8);
        const extension = path.extname(fileName) || '.mp4';
        const newFileName = `dynamic_cover_${userId}_${timestamp}_${uuid}${extension}`;
        const outputFilePath = path.join(dynamicCoversDir, newFileName);
        
        // 创建输出文件流
        const outputStream = fs.createWriteStream(outputFilePath);
        
        // 按顺序读取并写入所有分片
        for (let i = 0; i < totalChunks; i++) {
          const chunkPath = path.join(uploadTempDir, `chunk_${i}`);
          if (fs.existsSync(chunkPath)) {
            const chunkData = fs.readFileSync(chunkPath);
            outputStream.write(chunkData);
          } else {
            console.error(`分片文件不存在: ${chunkPath}`);
            return res.status(500).json({ 
              message: '合并文件失败', 
              detail: `分片 ${i + 1} 丢失` 
            });
          }
        }
        
        // 结束写入
        outputStream.end();
        
        // 等待文件写入完成
        await new Promise((resolve, reject) => {
          outputStream.on('finish', resolve);
          outputStream.on('error', reject);
        });
        
        console.log(`文件合并完成: ${outputFilePath}`);
        
        // 检查文件大小
        const finalFileSize = getFileSize(outputFilePath);
        console.log(`合并后文件大小: ${finalFileSize} 字节 (预期: ${fileSize} 字节)`);
        
        // 清理临时文件
        try {
          for (let i = 0; i < totalChunks; i++) {
            const chunkPath = path.join(uploadTempDir, `chunk_${i}`);
            if (fs.existsSync(chunkPath)) {
              fs.unlinkSync(chunkPath);
            }
          }
          fs.rmdirSync(uploadTempDir);
          console.log(`临时目录已清理: ${uploadTempDir}`);
        } catch (cleanupError) {
          console.error('清理临时文件失败:', cleanupError);
          // 继续执行，不影响上传结果
        }
        
        // 返回相对路径
        const relativePath = `/uploads/dynamic_covers/${newFileName}`;
        return res.status(200).json({
          message: '文件上传成功',
          filePath: relativePath,
          isPortrait: isPortrait === true
        });
      } else {
        // 不是最后一个分片，返回成功状态
        return res.status(200).json({
          message: '分片上传成功',
          chunkIndex: chunkIndex,
          received: true
        });
      }
    } catch (error) {
      console.error('处理分片失败:', error);
      return res.status(500).json({ 
        message: '处理分片失败', 
        error: error.message 
      });
    }
  } catch (error) {
    console.error('分片上传处理失败:', error);
    return res.status(500).json({
      message: '服务器错误',
      error: error.message
    });
  }
};

// 更新动态封面文件
const updateDynamicCoverFile = async (req, res) => {
  const { id } = req.params;
  const { replaceType, filePath, portraitFilePath } = req.body;
  const userId = req.user.id;

  try {
    const request = await DynamicCoverRequest.findByPk(id);

    if (!request) {
      return res.status(404).json({ message: '未找到指定的申请' });
    }

    // 验证用户权限
    if (request.userId !== userId) {
      return res.status(403).json({ message: '您无权修改此申请' });
    }
    
    // 必须是已拒绝的申请才能更新
    if (request.status !== 'rejected') {
      return res.status(400).json({ message: '只能更新被拒绝的申请' });
    }

    const updates = {
      status: 'pending', // 重置状态为待审核
      rejectionReason: null, // 清空拒绝理由
      adminComment: null, // 清空管理员评论
    };

    const oldFilePaths = [];

    // 根据 replaceType 更新文件路径
    if (replaceType === 'square') {
      if (!filePath) return res.status(400).json({ message: '未提供新的正方形视频文件' });
      if (request.dynamicCoverPath) oldFilePaths.push(request.dynamicCoverPath);
      updates.dynamicCoverPath = filePath;
    } else if (replaceType === 'portrait') {
      if (!portraitFilePath) return res.status(400).json({ message: '未提供新的竖版视频文件' });
      if (request.portraitCoverPath) oldFilePaths.push(request.portraitCoverPath);
      updates.portraitCoverPath = portraitFilePath;
    } else {
      // 如果没有 replaceType，则表示是整个申请的重新提交
      if (filePath) {
        if (request.dynamicCoverPath) oldFilePaths.push(request.dynamicCoverPath);
        updates.dynamicCoverPath = filePath;
      }
      if (portraitFilePath) {
         if (request.portraitCoverPath) oldFilePaths.push(request.portraitCoverPath);
        updates.portraitCoverPath = portraitFilePath;
      }
    }
    
    // 更新数据库记录
    await request.update(updates);

    // 异步删除旧文件
    oldFilePaths.forEach(oldPath => {
      if (oldPath) {
        const fullPath = path.join(__dirname, '..', '..', oldPath);
        fs.unlink(fullPath, (err) => {
          if (err) {
            console.error(`删除旧文件失败: ${fullPath}`, err);
          } else {
            console.log(`成功删除旧文件: ${fullPath}`);
          }
        });
      }
    });

    res.status(200).json({ message: '申请已成功更新并重新提交审核', request });

  } catch (error) {
    console.error('更新申请文件失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
};

module.exports = {
  createDynamicCoverRequest,
  getUserDynamicCoverRequests,
  getDynamicCoverRequestById,
  getAllDynamicCoverRequests,
  updateDynamicCoverRequest,
  deleteDynamicCoverRequest,
  uploadDynamicCoverBase64,
  uploadDynamicCoverFile,
  handleChunkedUpload,
  resubmitDynamicCoverRequest,
  updateDynamicCoverFile
}; 