const express = require('express');
const router = express.Router();
const { Album, Song, Artist, User, UserVerification, AlbumLink, AlbumLinkSong, SongArtist } = require('../models');
const { auth, adminAuth } = require('../middleware/auth');
const { uploadAudio, uploadImage, uploadPDF, uploadChunk, handleUploadError, mergeChunks } = require('../middleware/upload');
const { Op, Sequelize } = require('sequelize');
const db = require('../config/db');
const sequelize = db.sequelize;
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const archiver = require('archiver');
const { v4: uuidv4 } = require('uuid');
const Excel = require('exceljs');
const { promisify } = require('util');
const unlinkAsync = promisify(fs.unlink);
const rimraf = promisify(require('rimraf'));
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffprobePath = require('@ffprobe-installer/ffprobe').path;
const { isDev } = require('../config/db');
const { getThumbnailPath } = require('../utils/imageProcessor'); // 导入图片处理工具
const { encryptFilePath, decryptFilePath, isPathEncrypted } = require('../utils/encryption');
const { calculateFileMD5, verifyFileMD5, updateSongMD5 } = require('../utils/md5Utils');
const fsPromises = require('fs').promises;
const { generateAuthorizationFile, verifyAuthorizationSignature } = require('../utils/authorizationService');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// 导入专辑下载路由
const albumDownloadRoute = require('./albumDownload');

// 设置ffmpeg路径
ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);


// 获取音频文件时长的函数
const getAudioDuration = (filePath) => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        console.error('获取音频时长失败:', err);
        return reject(err);
      }
      
      // 从元数据中提取时长（秒）
      const durationInSeconds = Math.round(metadata.format.duration);
      console.log(`音频文件 ${path.basename(filePath)} 时长: ${durationInSeconds} 秒`);
      resolve(durationInSeconds);
    });
  });
};

// 创建MP3缓存目录
const createMp3CacheDir = () => {
  const mp3CacheDir = path.join(__dirname, '../../uploads/mp3cache');
  if (!fs.existsSync(mp3CacheDir)) {
    fs.mkdirSync(mp3CacheDir, { recursive: true });
  }
  return mp3CacheDir;
};

// 初始化MP3缓存目录
const MP3_CACHE_DIR = createMp3CacheDir();


// 配置静态文件URL
// const STATIC_BASE_URL = isDev ? 'http://localhost:3000' : 'https://api.acmetone.com';
// 静态文件URL已在上方定义

// 获取专辑列表（带分页、搜索和状态过滤）
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 20;
    const search = req.query.search || '';
    const status = req.query.status || null;
    
    const offset = (page - 1) * pageSize;
    
    // 构建查询条件
    let whereClause = {};
    
    // 根据状态过滤
    if (status) {
      whereClause.status = status;
    }
    
    // 搜索条件
    if (search) {
      whereClause = {
        ...whereClause,
        [Op.or]: [
          { title: { [Op.like]: `%${search}%` } },
          { displayInfo: { [Op.like]: `%${search}%` } },
          { description: { [Op.like]: `%${search}%` } }
        ]
      };
    }
    
    // 查询总数
    const total = await Album.count({ 
      where: whereClause 
    });
    
    // 查询分页数据
    const albums = await Album.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'submittedBy',
          attributes: ['id', 'username', 'email']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: pageSize,
      offset: offset,
      attributes: {
        exclude: ['authorizationFile'] // 排除大文件字段
      }
    });
    
    // 处理专辑封面路径，使用缩略图
    const processedAlbums = albums.map(album => {
      const albumJson = album.toJSON();
      
      // 处理封面图片路径
      if (albumJson.coverImage && albumJson.coverImage.startsWith('/uploads/')) {
        const thumbnailPath = albumJson.coverImage.replace('/uploads/', '/uploads/images/thumbnails/');
        albumJson.coverImageThumbnail = thumbnailPath;
      }
      
      return albumJson;
    });
    
    res.json({
      albums: processedAlbums,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    });
  } catch (error) {
    console.error('获取专辑列表失败:', error);
    res.status(500).json({ message: error.message });
  }
});

// 创建新专辑
router.post('/', auth, async (req, res) => {
  try {
    console.log('接收到创建专辑请求:', {
      headers: {
        'content-type': req.headers['content-type'],
        'content-length': req.headers['content-length'],
        'transfer-encoding': req.headers['transfer-encoding']
      },
      userId: req.user.id,
      ip: req.ip
    });
    
    // 使用单独的try-catch块处理文件上传，以便更好地处理上传错误
    let uploadedFile = null;
    
    try {
      // 检查是否包含已上传封面图片URL（来自分片上传）
      if (req.body.coverImageUrl) {
        console.log('使用已上传的封面图片:', req.body.coverImageUrl);
        req.file = null;
      } else {
        // 手动应用上传中间件，使用Promise包装以便更好地处理错误
        await new Promise((resolve, reject) => {
          const upload = uploadImage.single('coverImage');
          
          upload(req, res, (err) => {
            if (err) {
              console.error('文件上传中间件错误:', {
                message: err.message,
                code: err.code,
                name: err.name,
                stack: err.stack?.split('\n')[0]
              });
              reject(err);
            } else {
              resolve();
            }
          });
        });
        
        uploadedFile = req.file;
        
        // 记录文件上传成功
        if (uploadedFile) {
          console.log('文件上传成功:', {
            originalname: uploadedFile.originalname,
            size: uploadedFile.size,
            mimetype: uploadedFile.mimetype,
            path: uploadedFile.path
          });
        } else {
          console.warn('文件上传成功但req.file为空');
        }
      }
    } catch (uploadError) {
      console.error('文件上传失败:', {
        message: uploadError.message,
        code: uploadError.code,
        name: uploadError.name,
        stack: uploadError.stack?.split('\n')[0],
        headers: req.headers,
        bodySize: req.headers['content-length']
      });
      
      return res.status(400).json({
        message: '文件上传失败',
        detail: uploadError.message || 'Unexpected end of form',
        errorCode: 'UPLOAD_ERROR',
        timestamp: new Date().toISOString()
      });
    }
    
    // 记录接收到的完整请求数据
    console.log('创建专辑请求体:', {
      ...req.body,
      performer: req.body.performer,
      performerIds: req.body.performerIds,
      file: uploadedFile ? `文件已上传，大小: ${uploadedFile.size} 字节` : '无文件',
      coverImageUrl: req.body.coverImageUrl || '无URL'
    });
    
    // 检查是否有封面图片（上传的文件或预先上传的URL）
    if (!uploadedFile && !req.body.coverImageUrl) {
      return res.status(400).json({ 
        message: '请上传专辑封面',
        detail: '未检测到上传的图片文件或封面URL，请确保提供了封面图片'
      });
    }

    // 解析发行日期
    let releaseDate;
    try {
      releaseDate = req.body.releaseDate instanceof Date 
        ? req.body.releaseDate 
        : new Date(req.body.releaseDate);
      
      if (isNaN(releaseDate.getTime())) {
        return res.status(400).json({ message: '发行日期格式无效' });
      }
    } catch (error) {
      return res.status(400).json({ message: '发行日期格式无效' });
    }

    // 设置封面图片路径
    let normalizedPath;
    
    // 如果使用预上传的封面图片URL
    if (req.body.coverImageUrl) {
      normalizedPath = req.body.coverImageUrl;
      console.log(`使用预上传的封面图片URL: ${normalizedPath}`);
    } 
    // 如果使用直接上传的文件
    else if (uploadedFile && uploadedFile.path) {
      const relativePath = uploadedFile.path.replace(/\\/g, '/');
      normalizedPath = relativePath.includes('uploads/') 
        ? relativePath.substring(relativePath.indexOf('uploads/')) 
        : relativePath;
      console.log(`使用上传的封面图片文件: ${normalizedPath}`);
    } 
    // 没有有效的封面图片
    else {
      return res.status(400).json({ 
        message: '无效的封面图片', 
        detail: '既没有找到有效的封面图片文件，也没有预上传的封面URL'
      });
    }

    // 处理表演者信息
    let performerIds = [];
    if (req.body.performerIds) {
      try {
        // 处理可能是字符串或数组的情况
        performerIds = typeof req.body.performerIds === 'string' 
          ? JSON.parse(req.body.performerIds) 
          : req.body.performerIds;
      } catch (e) {
        console.error('解析performerIds失败:', e);
        // 尝试作为逗号分隔的字符串处理
        performerIds = req.body.performerIds.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
      }
    }

    // 创建专辑记录
    const album = await Album.create({
      title: req.body.title,
      type: req.body.type,
      releaseDate: releaseDate,
      // 使用预先上传的图片URL或上传的图片路径
      coverImage: req.body.coverImageUrl || normalizedPath,
      displayInfo: req.body.displayInfo,
      description: req.body.description,
      status: req.body.status || 'draft',
      submittedById: req.user.id,
      performer: req.body.performer,
      performerIds: req.body.performerIds, // 确保保存performerIds字段
      comment: 'DRAFT: 尚未提交审核'  // 添加草稿标记
    });

    // 如果有表演者ID，建立关联
    if (performerIds && performerIds.length > 0) {
      try {
        // 验证表演者ID是否存在
        const artists = await Artist.findAll({
          where: {
            id: {
              [Op.in]: performerIds
            }
          }
        });
        
        if (artists.length > 0) {
          await album.addArtists(artists);
          console.log(`已关联 ${artists.length} 个表演者到专辑`);
        }
      } catch (error) {
        console.error('关联表演者失败:', error);
        // 不影响专辑创建，继续执行
      }
    }

    // 创建缩略图
    try {
      // 如果使用的是上传的图片（不是预先上传的URL），则创建缩略图
      if (normalizedPath && !req.body.coverImageUrl) {
        await getThumbnailPath(normalizedPath);
        console.log('专辑封面缩略图已创建');
      } else if (req.body.coverImageUrl) {
        console.log('使用预先上传的封面图片URL，无需创建缩略图');
      }
    } catch (thumbError) {
      console.error('创建缩略图失败:', thumbError);
      // 不影响专辑创建，继续执行
    }

    res.status(201).json(album);
  } catch (error) {
    console.error('创建专辑错误:', error);
    res.status(500).json({ 
      message: '创建专辑失败', 
      detail: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 添加歌曲到专辑
router.post('/:id/songs', auth, uploadAudio.single('wavFile'), handleUploadError, async (req, res) => {
  try {
    console.log('开始处理歌曲上传请求:', {
      body: req.body,
      file: req.file,
      albumId: req.params.id,
      headers: req.headers['content-type']
    });

    // 确保 albumId 是整数
    const albumId = parseInt(req.params.id, 10);
    if (isNaN(albumId)) {
      return res.status(400).json({ message: '专辑ID无效' });
    }

    const album = await Album.findOne({
      where: {
        id: albumId,
        submittedById: req.user.id
      }
    });

    if (!album) {
      return res.status(404).json({ message: '专辑不存在或无权限' });
    }

    // 检查是否是无WAV文件创建模式
    const isNoWavFileMode = req.body.noWavFile === 'true' || req.body.noWavFile === true;
    
    // 检查文件是否成功上传（只在非无WAV文件模式下检查）
    if (!req.file && !isNoWavFileMode) {
      console.error('文件上传失败:', {
        headers: req.headers,
        files: req.files,
        body: req.body
      });
      return res.status(400).json({ 
        message: '请上传WAV格式的音频文件',
        detail: '未检测到上传的文件，请确保：1. 使用正确的字段名"wavFile" 2. 文件格式为WAV 3. 文件大小不超过200MB'
      });
    }

    // 验证必填字段
    const requiredFields = ['title', 'genre', 'language'];
    const missingFields = requiredFields.filter(field => !req.body[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({ 
        message: `缺少必填字段: ${missingFields.join(', ')}` 
      });
    }

    // 歌手信息在无WAV文件模式下是可选的
    let artists = [];
    if (req.body.artists) {
      try {
        artists = typeof req.body.artists === 'string' ? JSON.parse(req.body.artists) : req.body.artists;
        console.log('解析的歌手信息:', artists);
      } catch (error) {
        return res.status(400).json({ message: '歌手信息格式无效' });
      }
    }

    // 获取专辑中已有的歌曲数量，用于设置 trackNumber
    const existingSongs = await Song.count({ where: { albumId: albumId } });
    const trackNumber = existingSongs + 1;

    // 初始化歌曲数据
    const songData = {
      title: req.body.title,
      genre: req.body.genre,
      language: req.body.language,
      albumId: albumId,
      trackNumber: trackNumber,
      duration: 0 // 默认时长为0
    };

    // 处理WAV文件（如果有）
    if (req.file) {
      // 创建歌手名称字符串，用于文件命名
      const artistNames = artists.map(artist => artist.name).join('&');

      // 重命名上传的文件，使用"专辑名-歌曲名-歌手名"格式
      const originalPath = req.file.path;
      const fileExt = path.extname(originalPath);
      const dirName = path.dirname(originalPath);
      const sanitizedAlbumTitle = album.title.replace(/[\\/:*?"<>|]/g, '_').trim();
      const sanitizedSongTitle = req.body.title.replace(/[\\/:*?"<>|]/g, '_').trim();
      const sanitizedArtistNames = artistNames.replace(/[\\/:*?"<>|]/g, '_').trim();
      
      const newFileName = `${sanitizedAlbumTitle}-${sanitizedSongTitle}-${sanitizedArtistNames}${fileExt}`;
      const newPath = path.join(dirName, newFileName);
      
      // 确保使用相对路径
      let finalFilePath = originalPath;
      try {
        // 获取原始文件的完整路径
        const fullOriginalPath = path.join(__dirname, '../../', originalPath);
        const fullNewPath = path.join(__dirname, '../../', dirName, newFileName);
        
        fs.renameSync(fullOriginalPath, fullNewPath);
        console.log(`文件重命名成功: ${originalPath} -> ${newPath}`);
        
        // 更新为相对路径
        finalFilePath = newPath.replace(/\\/g, '/');
        if (finalFilePath.includes('uploads/')) {
          finalFilePath = finalFilePath.substring(finalFilePath.indexOf('uploads/'));
        }
        
        req.file.path = finalFilePath;
      } catch (renameErr) {
        console.error('文件重命名失败:', renameErr);
        // 继续使用原始文件路径
      }

      // 尝试获取音频文件时长
      try {
        // 获取音频文件的完整路径
        const fullWavPath = path.join(__dirname, '../../', req.file.path);
        // 使用ffprobe获取真实的音频时长
        songData.duration = await getAudioDuration(fullWavPath);
        console.log(`获取到音频文件时长: ${songData.duration}秒`);
      } catch (err) {
        console.warn('无法获取音频时长:', err.message);
        // 如果获取失败，设置一个默认值
        songData.duration = 0;
      }

      // 加密WAV文件路径
      const encryptedFilePath = encryptFilePath(req.file.path);
      console.log('WAV文件路径已加密:', {
        original: req.file.path,
        encrypted: encryptedFilePath
      });
      
      // 设置加密后的WAV文件路径
      songData.wavFile = encryptedFilePath;
    } else if (isNoWavFileMode) {
      // 无WAV文件模式，设置wavFile为null
      songData.wavFile = null;
      console.log('无WAV文件模式创建歌曲');
    }

    console.log('准备创建歌曲记录:', songData);

    const song = await Song.create(songData);
    
    try {
      // 创建artistIds数组以保存有序的艺术家ID
      const artistIds = [];
      
      // 创建或查找艺人，并建立关联
      for (const artistData of artists) {
        if (!artistData.name) {
          throw new Error('歌手名称不能为空');
        }
        // 检查是否为全新歌手（无平台链接）
        const platforms = artistData.platforms || {};
        const hasAnyPlatformLink = Object.values(platforms).some(link => link && link.trim() !== '');
        const isNewArtist = !hasAnyPlatformLink;
        
        let [artist] = await Artist.findOrCreate({
          where: { name: artistData.name },
          defaults: {
            realName: artistData.realName,
            id_number: artistData.id_number || null,
            netease: platforms.netease,
            qq: platforms.qq,
            kugou: platforms.kugou,
            kuwo: platforms.kuwo,
            qishui: platforms.qishui,
            spotify: platforms.spotify,
            youtube: platforms.youtube,
            appleMusic: platforms.appleMusic,
            soundCloud: platforms.soundCloud,
            isNewArtist: isNewArtist // 设置是否为全新歌手
          }
        });
        // 保持向后兼容，继续使用多对多关联
        await song.addArtist(artist);
        
        // 同时将艺术家ID添加到有序数组中
        artistIds.push(artist.id);
      }
      
      // 保存有序艺术家ID到artists字段
      await song.update({ artists: artistIds });

      // 检查歌曲是否成功保存并关联到专辑
      const savedSong = await Song.findByPk(song.id);
      console.log('保存的歌曲信息:', {
        id: savedSong.id,
        title: savedSong.title,
        albumId: savedSong.albumId,
        trackNumber: savedSong.trackNumber,
        duration: savedSong.duration
      });

      // 获取包含艺人信息的完整歌曲数据
      const populatedSong = await Song.findByPk(song.id, {
        include: [{
          model: Artist,
          as: 'Artists',
          through: { attributes: [] }
        }]
      });

      // 处理文件路径
      const processedSong = {
        ...populatedSong.toJSON(),
        wavFile: populatedSong.wavFile || null,
        Artists: populatedSong.Artists || []
      };
      
      console.log('歌曲创建成功:', processedSong);
      res.status(201).json(processedSong);
    } catch (error) {
      // 如果处理艺人信息时出错，删除已创建的歌曲
      await song.destroy();
      throw new Error('处理歌手信息时出错: ' + error.message);
    }
  } catch (error) {
    console.error('添加歌曲错误:', error);
    res.status(400).json({ message: error.message });
  }
});

// 处理分片上传
router.post('/:albumId/songs/:songId/chunks', auth, async (req, res) => {
  try {
    console.log('接收到分片上传请求:', {
      albumId: req.params.albumId,
      songId: req.params.songId,
      headers: {
        'x-file-id': req.headers['x-file-id'],
        'x-chunk-index': req.headers['x-chunk-index'],
        'x-total-chunks': req.headers['x-total-chunks'],
        'content-type': req.headers['content-type'],
        'content-length': req.headers['content-length']
      }
    });

    // 检查是否有文件
    if (!req.files || !req.files.file) {
      console.error('未接收到文件数据');
      return res.status(400).json({ 
        message: '未接收到文件数据',
        detail: '请确保正确发送文件'
      });
    }

    // 从请求头获取参数
    const fileId = req.headers['x-file-id'] || req.headers['x-file-id'];
    const chunkIndex = parseInt(req.headers['x-chunk-index'] || req.headers['x-chunk-index'], 10);
    const totalChunks = parseInt(req.headers['x-total-chunks'] || req.headers['x-total-chunks'], 10);
    
    // 检查参数是否存在
    if (!fileId) {
      console.error('缺少fileId参数:', req.headers);
      return res.status(400).json({
        message: '缺少fileId参数',
        detail: '需要提供X-File-ID请求头'
      });
    }
    
    if (isNaN(chunkIndex)) {
      console.error('缺少或无效的chunkIndex参数:', req.headers);
      return res.status(400).json({
        message: '缺少或无效的chunkIndex参数',
        detail: '需要提供X-Chunk-Index请求头，且值必须是数字'
      });
    }
    
    if (isNaN(totalChunks)) {
      console.error('缺少或无效的totalChunks参数:', req.headers);
      return res.status(400).json({
        message: '缺少或无效的totalChunks参数',
        detail: '需要提供X-Total-Chunks请求头，且值必须是数字'
      });
    }

    console.log('分片上传参数验证通过:', {
      fileId,
      chunkIndex,
      totalChunks
    });

    // 验证是否存在该专辑且用户有权限
    const albumId = parseInt(req.params.albumId, 10);
    const songId = parseInt(req.params.songId, 10);
    
    // 检查用户权限
    const isAdmin = req.user.role === 'admin';
    
    // 构建查询条件，管理员可以查询任何专辑，普通用户只能查询自己的专辑
    const whereCondition = {
      id: albumId
    };
    
    if (!isAdmin) {
      whereCondition.submittedById = req.user.id;
    }

    // 检查专辑是否存在且用户有权限
    const album = await Album.findOne({
      where: whereCondition
    });

    if (!album) {
      return res.status(404).json({ message: '专辑不存在或无权限' });
    }

    // 检查歌曲是否存在
    const song = await Song.findOne({
      where: {
        id: songId,
        albumId: albumId
      }
    });

    if (!song) {
      return res.status(404).json({ message: '歌曲不存在' });
    }

    // 确保分片目录存在
    const chunksDir = path.join(__dirname, '../../uploads/chunks', fileId);
    if (!fs.existsSync(chunksDir)) {
      fs.mkdirSync(chunksDir, { recursive: true });
    }

    // 保存分片文件
    const chunkFile = req.files.file;
    const chunkPath = path.join(chunksDir, chunkIndex.toString());
    
    try {
      await chunkFile.mv(chunkPath);
      console.log(`成功保存分片 ${chunkIndex + 1}/${totalChunks}, 大小: ${chunkFile.size}字节, 路径: ${chunkPath}`);
    } catch (moveError) {
      console.error(`保存分片文件失败:`, moveError);
      return res.status(500).json({ 
        message: '保存分片文件失败',
        detail: moveError.message
      });
    }

    // 如果是最后一个分片，执行合并
    if (chunkIndex === totalChunks - 1) {
      console.log('这是最后一个分片，开始合并');
      try {
        const mergedFilePath = await mergeChunks(fileId, totalChunks, chunkFile.name);
        console.log('分片合并成功:', mergedFilePath);

        res.status(200).json({
          message: '所有分片上传并合并成功',
          filePath: mergedFilePath,
          fileId: fileId,
          completed: true
        });
      } catch (mergeError) {
        console.error('合并分片错误:', mergeError);
        res.status(500).json({
          message: '合并分片失败',
          error: mergeError.message
        });
      }
    } else {
      // 不是最后一个分片，简单返回成功
      res.status(200).json({
        message: `分片 ${chunkIndex + 1}/${totalChunks} 上传成功`,
        chunkIndex: chunkIndex,
        fileId: fileId,
        completed: false
      });
    }
  } catch (error) {
    console.error('处理分片上传错误:', error);
    res.status(500).json({
      message: '处理分片上传失败',
      error: error.message
    });
  }
});

// 获取用户的所有专辑
router.get('/my', auth, async (req, res) => {
  try {
    console.log('正在获取用户专辑列表，用户ID:', req.user.id);
    
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: '未登录或用户ID无效' });
    }

    const albums = await Album.findAll({
      where: { submittedById: req.user.id },
      include: [{
        model: Song,
        attributes: ['id', 'title', 'wavFile', 'genre', 'language', 'duration', 'trackNumber', 'isrc', 'createdAt', 'updatedAt', 'AlbumId'],
        include: [{
          model: Artist,
          as: 'Artists',
          through: { attributes: [] },
          attributes: ['id', 'name', 'realName', 'id_number', 'netease', 'qq', 'kugou', 'kuwo', 'qishui', 
                      'spotify', 'youtube', 'appleMusic', 'soundCloud', 'description', 'avatarUrl', 
                      'region', 'artistType', 'alias', 'createdById', 'createdAt', 'updatedAt']
        }]
      }],
      order: [['createdAt', 'DESC']]
    });

    console.log('找到的专辑数量:', albums.length);
    
    // 处理歌曲的文件路径
    const processedAlbums = await Promise.all(albums.map(async album => {
      const albumData = album.toJSON();
      
      // 添加虚拟属性 isDraft，通过评论来标记草稿状态
      const isDraft = albumData.comment && albumData.comment.startsWith('DRAFT:');
      
      // 获取专辑封面的缩略图路径
      let coverImagePath = albumData.coverImage;
      if (coverImagePath) {
        try {
          // 获取绝对路径
          const absolutePath = path.join(__dirname, '../../', coverImagePath);
          // 获取缩略图路径
          const thumbnailPath = await getThumbnailPath(absolutePath);
          // 转换为相对路径
          const relativeThumbnailPath = path.relative(path.join(__dirname, '../../'), thumbnailPath);
          coverImagePath = relativeThumbnailPath.replace(/\\/g, '/');
        } catch (error) {
          console.error('处理专辑封面缩略图失败:', error);
          // 如果处理失败，使用原图
        }
      }
      
      return {
        ...albumData,
        isDraft: isDraft,
        // 如果是草稿状态，则显示为草稿
        virtualStatus: isDraft ? 'draft' : albumData.status,
        // 修复URL构建方式 - 不再添加域名前缀，由前端统一添加
        coverImage: coverImagePath || null,
        songs: (albumData.songs || []).map(song => ({
          ...song,
          // 修复URL构建方式 - 不再添加域名前缀，由前端统一添加
          wavFile: song.wavFile || null,
          Artists: song.Artists || [] // 确保 Artists 始终是数组
        }))
      };
    }));

    res.json(processedAlbums);
  } catch (error) {
    console.error('获取专辑列表错误:', error);
    if (error.name === 'SequelizeConnectionError') {
      res.status(500).json({ 
        message: '数据库连接错误',
        error: error.message 
      });
    } else if (error.name === 'SequelizeValidationError') {
      res.status(400).json({ 
        message: '数据验证错误',
        error: error.message 
      });
    } else {
      res.status(500).json({ 
        message: '获取专辑列表失败',
        error: error.message 
      });
    }
  }
});

// 获取所有待审核的专辑（管理员）
router.get('/pending', adminAuth, async (req, res) => {
  try {
    console.log('获取待审核专辑 - 请求头:', req.headers);
    console.log('管理员ID:', req.user.id);
    
    const albums = await Album.findAll({
      where: { 
        status: 'pending',
        [Op.or]: [
          { comment: null },
          { comment: { [Op.notLike]: 'DRAFT:%' } }
        ]
      },
      include: [
        {
          model: User,
          as: 'submittedBy',
          attributes: ['id', 'username', 'email']
        },
        {
          model: Song,
          include: [{
            model: Artist,
            as: 'Artists',
            through: { attributes: [] }
          }]
        }
      ]
    });
    
    console.log(`找到 ${albums.length} 个待审核专辑`);
    
    // 处理专辑封面，使用缩略图
    const processedAlbums = await Promise.all(albums.map(async album => {
      const albumData = album.toJSON();
      
      // 处理专辑封面的缩略图
      let coverImagePath = albumData.coverImage;
      if (coverImagePath) {
        try {
          // 获取绝对路径
          const absolutePath = path.join(__dirname, '../../', coverImagePath);
          // 获取缩略图路径
          const thumbnailPath = await getThumbnailPath(absolutePath);
          // 转换为相对路径
          const relativeThumbnailPath = path.relative(path.join(__dirname, '../../'), thumbnailPath);
          coverImagePath = relativeThumbnailPath.replace(/\\/g, '/');
        } catch (error) {
          console.error('处理专辑封面缩略图失败:', error);
          // 如果处理失败，使用原图
        }
      }
      
      return {
        ...albumData,
        // 修复URL构建方式 - 不再添加域名前缀，由前端统一添加
        coverImage: coverImagePath || null,
        Songs: albumData.Songs.map(song => ({
          ...song,
          // 修复URL构建方式 - 不再添加域名前缀，由前端统一添加
          wavFile: song.wavFile || null
        }))
      };
    }));
    
    if (albums.length > 0) {
      console.log('第一个专辑示例:', {
        id: processedAlbums[0].id,
        title: processedAlbums[0].title,
        submittedBy: processedAlbums[0].submittedBy ? {
          id: processedAlbums[0].submittedBy.id,
          username: processedAlbums[0].submittedBy.username
        } : null,
        songsCount: processedAlbums[0].Songs?.length || 0
      });
    }
    
    res.json(processedAlbums);
  } catch (error) {
    console.error('获取待审核专辑错误:', error);
    res.status(500).json({ message: '获取待审核专辑失败', error: error.message });
  }
});

// 获取所有已审核通过的专辑（管理员）
router.get('/approved', adminAuth, async (req, res) => {
  try {
    const albums = await Album.findAll({
      where: { status: 'approved' },
      include: [
        {
          model: User,
          as: 'submittedBy',
          attributes: ['id', 'username', 'email']
        },
        {
          model: Song,
          include: [{
            model: Artist,
            as: 'Artists',
            through: { attributes: [] }
          }]
        }
      ],
      order: [['updatedAt', 'DESC']]
    });
    
    // 处理专辑封面，使用缩略图
    const processedAlbums = await Promise.all(albums.map(async album => {
      const albumData = album.toJSON();
      
      // 处理专辑封面的缩略图
      let coverImagePath = albumData.coverImage;
      if (coverImagePath) {
        try {
          // 获取绝对路径
          const absolutePath = path.join(__dirname, '../../', coverImagePath);
          // 获取缩略图路径
          const thumbnailPath = await getThumbnailPath(absolutePath);
          // 转换为相对路径
          const relativeThumbnailPath = path.relative(path.join(__dirname, '../../'), thumbnailPath);
          coverImagePath = relativeThumbnailPath.replace(/\\/g, '/');
        } catch (error) {
          console.error('处理专辑封面缩略图失败:', error);
          // 如果处理失败，使用原图
        }
      }
      
      return {
        ...albumData,
        // 修复URL构建方式 - 不再添加域名前缀，由前端统一添加
        coverImage: coverImagePath || null,
        Songs: albumData.Songs.map(song => ({
          ...song,
          // 修复URL构建方式 - 不再添加域名前缀，由前端统一添加
          wavFile: song.wavFile || null
        }))
      };
    }));
    
    res.json(processedAlbums);
  } catch (error) {
    console.error('获取已通过专辑错误:', error);
    res.status(500).json({ message: '获取已通过专辑失败', error: error.message });
  }
});

// 获取所有被拒绝的专辑（管理员）
router.get('/rejected', adminAuth, async (req, res) => {
  try {
    const albums = await Album.findAll({
      where: { status: 'rejected' },
      include: [
        {
          model: User,
          as: 'submittedBy',
          attributes: ['id', 'username', 'email']
        },
        {
          model: Song,
          include: [{
            model: Artist,
            as: 'Artists',
            through: { attributes: [] }
          }]
        }
      ],
      order: [['updatedAt', 'DESC']]
    });
    
    // 处理专辑封面，使用缩略图
    const processedAlbums = await Promise.all(albums.map(async album => {
      const albumData = album.toJSON();
      
      // 处理专辑封面的缩略图
      let coverImagePath = albumData.coverImage;
      if (coverImagePath) {
        try {
          // 获取绝对路径
          const absolutePath = path.join(__dirname, '../../', coverImagePath);
          // 获取缩略图路径
          const thumbnailPath = await getThumbnailPath(absolutePath);
          // 转换为相对路径
          const relativeThumbnailPath = path.relative(path.join(__dirname, '../../'), thumbnailPath);
          coverImagePath = relativeThumbnailPath.replace(/\\/g, '/');
        } catch (error) {
          console.error('处理专辑封面缩略图失败:', error);
          // 如果处理失败，使用原图
        }
      }
      
      return {
        ...albumData,
        // 修复URL构建方式 - 不再添加域名前缀，由前端统一添加
        coverImage: coverImagePath || null,
        Songs: albumData.Songs.map(song => ({
          ...song,
          // 修复URL构建方式 - 不再添加域名前缀，由前端统一添加
          wavFile: song.wavFile || null
        }))
      };
    }));
    
    res.json(processedAlbums);
  } catch (error) {
    console.error('获取被拒绝专辑错误:', error);
    res.status(500).json({ message: '获取被拒绝专辑失败', error: error.message });
  }
});

// 审核专辑（管理员）
router.patch('/:id/status', adminAuth, async (req, res) => {
  try {
    console.log('更新专辑状态 - 请求数据:', {
      albumId: req.params.id,
      status: req.body.status,
      comment: req.body.comment,
      adminId: req.user.id
    });
    
    const { status, comment } = req.body;
    
    if (!status || !['approved', 'rejected', 'pending'].includes(status)) {
      return res.status(400).json({ message: '无效的状态值' });
    }
    
    // 处理草稿状态的特殊情况
    const isDraft = status === 'pending' && comment === 'DRAFT: 尚未提交审核';
    
    const album = await Album.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'submittedBy',
          attributes: ['id', 'username', 'email']
        }
      ]
    });
    
    if (!album) {
      console.log(`专辑ID ${req.params.id} 不存在`);
      return res.status(404).json({ message: '专辑不存在' });
    }
    
    console.log('找到专辑:', {
      id: album.id,
      title: album.title,
      currentStatus: album.status,
      submittedBy: album.submittedBy ? album.submittedBy.username : '未知'
    });
    
    // 保存之前的状态
    const previousStatus = album.status;
    
    // 更新专辑状态
    album.status = status;
    album.comment = comment;
    await album.save();
    
    console.log(`专辑状态已更新为 ${status}`);
    
    // 如果是审核通过，自动创建专辑链接页面（默认隐藏状态）
    // 只有审核通过的专辑才创建链接页面，草稿和待审核状态不创建
    if (status === 'approved' && previousStatus !== 'approved') {
      try {
        // 检查是否已经存在该专辑的链接页面
        const existingLink = await AlbumLink.findOne({
          where: { internalAlbumId: album.id }
        });
        
        if (!existingLink) {
          console.log(`为审核通过的专辑 ${album.id} 自动创建链接页面`);
          
          // 生成唯一的slug
          const baseSlug = album.title
            .toLowerCase()
            .replace(/[^\w\u4e00-\u9fa5]+/g, '-') // 保留中文字符和字母数字，其他替换为连字符
            .replace(/^-+|-+$/g, ''); // 去除首尾连字符
          
          let slug = baseSlug;
          let counter = 1;
          
          // 确保slug唯一
          while (true) {
            const slugExists = await AlbumLink.findOne({ where: { slug } });
            if (!slugExists) break;
            slug = `${baseSlug}-${counter++}`;
          }
          
          // 创建专辑链接页面
          const albumLink = await AlbumLink.create({
            title: album.title,
            albumName: album.title,
            artistName: album.performer || album.displayInfo || '未知艺术家',
            coverImage: album.coverImage,
            releaseDate: album.releaseDate || new Date(),
            slug,
            description: album.description || '',
            isActive: false, // 默认隐藏状态
            createdById: req.user.id,
            internalAlbumId: album.id,
            albumType: 'internal'
          });
          
          console.log(`已为专辑 ${album.id} 自动创建链接页面，ID: ${albumLink.id}, Slug: ${albumLink.slug}`);
          
          // 自动导入专辑歌曲
          const songs = await Song.findAll({
            where: { albumId: album.id },
            order: [['trackNumber', 'ASC']]
          });
          
          if (songs.length > 0) {
            for (const song of songs) {
              await AlbumLinkSong.create({
                songName: song.title,
                trackNumber: song.trackNumber,
                albumLinkId: albumLink.id,
                internalSongId: song.id,
                artistName: album.performer || album.displayInfo || '未知艺术家'
              });
            }
            
            console.log(`已为专辑链接 ${albumLink.id} 自动导入 ${songs.length} 首歌曲`);
          }
        } else {
          console.log(`专辑 ${album.id} 已存在链接页面，ID: ${existingLink.id}`);
        }
      } catch (linkError) {
        console.error('自动创建专辑链接页面失败:', linkError);
        // 创建链接失败不影响API响应
      }
    }
    
    // 如果状态发生变化，发送邮件通知
    if (previousStatus !== status && album.submittedBy && album.submittedBy.email) {
      // 导入邮件服务
      const { sendAlbumApprovedEmail, sendAlbumRejectedEmail } = require('../utils/emailService');
      
      const userEmail = album.submittedBy.email;
      const albumData = {
        id: album.id,
        title: album.title,
        comment: album.comment
      };
      
      try {
        // 根据状态发送不同的邮件
        if (status === 'approved') {
          await sendAlbumApprovedEmail(userEmail, albumData);
          console.log(`已发送专辑审核通过邮件到 ${userEmail}`);
        } else if (status === 'rejected') {
          await sendAlbumRejectedEmail(userEmail, albumData);
          console.log(`已发送专辑审核拒绝邮件到 ${userEmail}`);
        }
        // 对于pending状态，如果不是草稿状态，可以发送待审核邮件
        // 目前不发送pending状态的邮件，如需添加可在此处实现
      } catch (emailError) {
        console.error('发送邮件通知失败:', emailError);
        // 邮件发送失败不影响API响应
      }
    }
    
    res.json(album);
  } catch (error) {
    console.error('更新专辑状态错误:', error);
    res.status(500).json({ message: '更新专辑状态失败', error: error.message });
  }
});

// 获取单个专辑详情
router.get('/:id', auth, async (req, res) => {
  try {
    const albumId = parseInt(req.params.id, 10);
    console.log('开始获取专辑详情，请求参数:', {
      id: albumId,
      userId: req.user.id,
      userRole: req.user.role
    });

    // 查询专辑信息
    const album = await Album.findByPk(albumId);
    if (!album) {
      console.log('未找到专辑:', albumId);
      return res.status(404).json({ message: '专辑不存在' });
    }

    // 判断用户权限：管理员可以查看任何专辑，普通用户只能查看自己的专辑
    if (req.user.role !== 'admin' && album.submittedById !== req.user.id) {
      console.log('用户无权访问此专辑:', {
        albumId,
        submittedById: album.submittedById, 
        userId: req.user.id
      });
      return res.status(403).json({ message: '无权访问此专辑' });
    }

    // 单独查询关联的歌曲
    const songs = await Song.findAll({
      where: { albumId: albumId },
      include: [{
        model: Artist,
        as: 'Artists',
        through: { attributes: [] }
      }],
      order: [['trackNumber', 'ASC'], ['id', 'ASC']]
    });

    console.log('查询到的歌曲数量:', songs.length);
    if (songs.length > 0) {
      console.log('第一首歌曲信息:', {
        id: songs[0].id,
        title: songs[0].title,
        albumId: songs[0].albumId,
        trackNumber: songs[0].trackNumber,
        duration: songs[0].duration,
        artistCount: songs[0].Artists?.length || 0
      });
    } else {
      console.log('专辑没有关联的歌曲');
    }

    // 获取表演者详细信息
    let performerDetails = [];
    if (album.performerIds) {
      try {
        const performerIds = JSON.parse(album.performerIds);
        if (performerIds.length > 0) {
          const performers = await Artist.findAll({
            where: { id: { [Op.in]: performerIds } },
            attributes: ['id', 'name', 'realName', 'netease', 'qq', 'kugou', 'kuwo', 'qishui', 'spotify', 'youtube', 'appleMusic', 'soundCloud']
          });
          
          performerDetails = performers.map(performer => {
            const platforms = {
              netease: performer.netease || null,
              qq: performer.qq || null,
              kugou: performer.kugou || null,
              kuwo: performer.kuwo || null,
              qishui: performer.qishui || null,
              spotify: performer.spotify || null,
              youtube: performer.youtube || null,
              appleMusic: performer.appleMusic || null,
              soundCloud: performer.soundCloud || null
            };
            
            return {
              id: performer.id,
              name: performer.name,
              realName: performer.realName,
              platforms
            };
          });
        }
      } catch (error) {
        console.error('获取表演者详情失败:', error);
      }
    }

    // 转换为普通对象并处理数据
    const albumData = album.toJSON();
    
    // 添加虚拟属性 isDraft
    const isDraft = albumData.comment && albumData.comment.startsWith('DRAFT:');
    
    // 处理专辑封面的缩略图
    let coverImagePath = albumData.coverImage;
    if (coverImagePath) {
      try {
        // 获取绝对路径
        const absolutePath = path.join(__dirname, '../../', coverImagePath);
        // 获取缩略图路径
        const thumbnailPath = await getThumbnailPath(absolutePath);
        // 转换为相对路径
        const relativeThumbnailPath = path.relative(path.join(__dirname, '../../'), thumbnailPath);
        coverImagePath = relativeThumbnailPath.replace(/\\/g, '/');
      } catch (error) {
        console.error('处理专辑封面缩略图失败:', error);
        // 如果处理失败，使用原图
      }
    }
    
    // 处理歌曲的文件路径，但不进行MP3转换
    const processedSongs = songs.map(song => {
      const songData = song.toJSON();
      
      // 检查文件路径是否已加密，如果已加密则解密用于显示
      let audioUrl = null;
      if (song.wavFile) {
        if (isPathEncrypted(song.wavFile)) {
          // 保存加密的路径，但解密用于显示
          audioUrl = song.wavFile;
          console.log('歌曲文件路径已加密:', {
            encrypted: audioUrl,
            songId: song.id
          });
        } else {
          audioUrl = song.wavFile;
        }
      }
      
      // 确保所有必要的字段都存在
      return {
        ...songData,
        wavFile: audioUrl, // 使用原始文件路径，不添加域名前缀
        trackNumber: song.trackNumber || 1,
        duration: song.duration || null,
        Artists: song.Artists || [] // 确保 Artists 始终是数组
      };
    });

    const processedAlbum = {
      ...albumData,
      isDraft: isDraft,
      virtualStatus: isDraft ? 'draft' : albumData.status,
      // 修复URL构建方式 - 不再添加域名前缀
      coverImage: coverImagePath || null,
      songs: processedSongs,
      // 确保授权书文件路径被正确返回
      authorizationFile: albumData.authorizationFile || null,
      // 添加表演者详细信息
      performerDetails: performerDetails
    };
    
    console.log('返回的专辑数据:', {
      id: processedAlbum.id,
      title: processedAlbum.title,
      isDraft: processedAlbum.isDraft,
      virtualStatus: processedAlbum.virtualStatus,
      songCount: processedAlbum.songs.length,
      authorizationFile: processedAlbum.authorizationFile,
      performerDetailsCount: processedAlbum.performerDetails.length
    });

    res.json(processedAlbum);
  } catch (error) {
    console.error('获取专辑详情错误:', error);
    res.status(500).json({ 
      message: '获取专辑详情失败',
      error: error.message 
    });
  }
});

// 获取单首歌曲的MP3文件
router.get('/:albumId/songs/:songId/audio', auth, async (req, res) => {
  try {
    const albumId = parseInt(req.params.albumId, 10);
    const songId = parseInt(req.params.songId, 10);
    
    console.log('请求获取歌曲MP3文件:', {
      albumId,
      songId,
      userId: req.user.id
    });
    
    // 检查参数有效性
    if (isNaN(albumId) || isNaN(songId)) {
      console.error('无效的参数:', { albumId: req.params.albumId, songId: req.params.songId });
      return res.status(400).json({ 
        message: '无效的专辑ID或歌曲ID',
        detail: '请提供有效的数字ID'
      });
    }
    
    // 查询专辑信息
    const album = await Album.findByPk(albumId);
    if (!album) {
      console.error('专辑不存在:', albumId);
      return res.status(404).json({ message: '专辑不存在' });
    }

    // 判断用户权限：管理员可以查看任何专辑，普通用户只能查看自己的专辑
    if (req.user.role !== 'admin' && album.submittedById !== req.user.id) {
      console.error('用户无权访问此专辑:', {
        albumId,
        submittedById: album.submittedById,
        userId: req.user.id,
        userRole: req.user.role
      });
      return res.status(403).json({ message: '无权访问此专辑' });
    }
    
    // 查询歌曲信息
    let song = await Song.findOne({
      where: {
        id: songId,
        albumId: albumId
      }
    });
    
    // 如果通过ID找不到歌曲，尝试通过文件名查找
    if (!song) {
      console.warn(`通过ID ${songId} 未找到歌曲，尝试查找专辑 ${albumId} 的所有歌曲`);
      
      // 获取专辑的所有歌曲
      const songs = await Song.findAll({
        where: {
          albumId: albumId
        }
      });
      
      console.log(`专辑 ${albumId} 共有 ${songs.length} 首歌曲`);
      
      // 打印所有歌曲的ID和文件路径
      songs.forEach(s => {
        console.log(`歌曲ID: ${s.id}, 文件路径: ${s.wavFile}`);
      });
      
      // 如果songId是一个数字字符串，可能是文件名的一部分
      if (req.params.songId && !isNaN(req.params.songId)) {
        const songIdStr = req.params.songId;
        console.log(`尝试通过文件名中的数字 ${songIdStr} 查找歌曲`);
        
        // 查找文件名包含这个数字的歌曲
        song = songs.find(s => s.wavFile && s.wavFile.includes(songIdStr));
        
        if (song) {
          console.log(`通过文件名中的数字 ${songIdStr} 找到歌曲:`, {
            id: song.id,
            title: song.title,
            wavFile: song.wavFile
          });
        } else {
          console.error(`通过文件名中的数字 ${songIdStr} 未找到歌曲`);
        }
      }
    }
    
    if (!song) {
      console.error('歌曲不存在或不属于指定专辑:', { songId, albumId });
      return res.status(404).json({ 
        message: '歌曲不存在或不属于指定专辑',
        detail: `在专辑 ${albumId} 中未找到ID为 ${songId} 的歌曲`
      });
    }
    
    // 如果没有WAV文件，返回错误
    if (!song.wavFile) {
      console.error('歌曲没有音频文件:', { songId: song.id, title: song.title });
      return res.status(404).json({ message: '歌曲没有音频文件' });
    }
    
    // 直接使用文件路径，不再进行加密解密
    let wavFilePath = song.wavFile;
    console.log('使用文件路径:', wavFilePath);
    
    // 获取WAV文件的绝对路径
    const wavPath = path.join(__dirname, '../../', wavFilePath);
    console.log('WAV文件绝对路径:', wavPath);
    
    // 检查文件是否存在
    if (!fs.existsSync(wavPath)) {
      console.error('WAV文件不存在:', wavPath);
      return res.status(404).json({ 
        message: '音频文件不存在',
        detail: '服务器上找不到对应的音频文件'
      });
    }

    // 验证文件MD5完整性
    if (song.md5) {
      try {
        const isValid = await verifyFileMD5(wavPath, song.md5);
        if (!isValid) {
          console.error('文件MD5验证失败:', {
            songId: song.id,
            title: song.title,
            expectedMD5: song.md5
          });
          return res.status(500).json({
            message: '音频文件完整性验证失败',
            detail: '文件可能已损坏，请联系管理员'
          });
        }
        console.log('文件MD5验证通过');
      } catch (error) {
        console.error('MD5验证过程中出错:', error.message);
        // MD5验证出错不阻止下载，但记录警告
        console.warn('跳过MD5验证，继续提供下载服务');
      }
    } else {
      console.warn('歌曲没有存储MD5值，跳过完整性验证');
    }
    
    // 转换为MP3
    try {
      console.log('开始转换WAV到MP3');
      
      // 确保MP3缓存目录存在
      createMp3CacheDir();
      
      // 获取文件名（不包含路径和扩展名）
      const fileName = path.basename(wavPath, path.extname(wavPath));
      
      // 构建MP3文件路径
      const mp3Dir = path.join(__dirname, '../../uploads/mp3_cache');
      const mp3FileName = `${fileName}.mp3`;
      const mp3Path = path.join(mp3Dir, mp3FileName);
      
      // 检查MP3文件是否已存在（缓存）
      let mp3Exists = fs.existsSync(mp3Path);
      
      if (!mp3Exists) {
        // 如果MP3文件不存在，执行转换
        console.log('MP3文件不存在，执行转换:', {
          wavPath,
          mp3Path
        });
        
        // 设置ffmpeg路径
        ffmpeg.setFfmpegPath(ffmpegPath);
        ffmpeg.setFfprobePath(ffprobePath);
        
        // 执行转换
        await new Promise((resolve, reject) => {
          ffmpeg(wavPath)
            .output(mp3Path)
            .audioCodec('libmp3lame')
            .audioBitrate('192k')
            .on('end', () => {
              console.log('WAV转MP3成功');
              resolve();
            })
            .on('error', (err) => {
              console.error('WAV转MP3失败:', err);
              reject(err);
            })
            .run();
        });
        
        // 再次检查MP3文件是否存在
        mp3Exists = fs.existsSync(mp3Path);
        if (!mp3Exists) {
          throw new Error('MP3文件转换后仍然不存在');
        }
      } else {
        console.log('MP3文件已存在，使用缓存:', mp3Path);
      }
      
      // 检查MP3文件是否存在
      if (!fs.existsSync(mp3Path)) {
        console.error('MP3文件转换失败，文件不存在:', mp3Path);
        return res.status(500).json({ 
          message: '音频文件转换失败',
          detail: '无法将WAV文件转换为MP3格式'
        });
      }
      
      // 获取相对路径用于URL
      const relativeMp3Path = path.relative(path.join(__dirname, '../../'), mp3Path);
      
      // 构建MP3文件URL
      const mp3Url = `${req.protocol}://${req.get('host')}/${relativeMp3Path.replace(/\\/g, '/')}`;
      console.log('MP3文件URL:', mp3Url);
      
      // 返回MP3文件URL和歌曲信息
      res.json({
        id: song.id,
        title: song.title,
        audioUrl: mp3Url,
        songInfo: {
          id: song.id,
          title: song.title,
          originalPath: song.wavFile,
          albumId: song.albumId
        }
      });
    } catch (error) {
      console.error('WAV转MP3失败:', error);
      
      // 不再回退到原始WAV文件，而是返回错误
      return res.status(500).json({ 
        message: '音频文件转换失败',
        error: error.message,
        detail: '无法将WAV文件转换为MP3格式，请检查服务器ffmpeg配置'
      });
    }
  } catch (error) {
    console.error('获取歌曲音频文件错误:', error);
    res.status(500).json({ 
      message: '获取歌曲音频文件失败',
      error: error.message,
      stack: isDev ? error.stack : undefined
    });
  }
});

// 更新歌曲信息
router.put('/:albumId/songs/:songId', auth, async (req, res) => {
  try {
    const albumId = parseInt(req.params.albumId, 10);
    const songIdParam = req.params.songId;
    
    // 正确解析songId，确保是有效数字
    let songId = parseInt(songIdParam, 10);
    
    // 检查songId是否为NaN
    if (isNaN(songId)) {
      console.error(`无效的歌曲ID: "${songIdParam}"`);
      return res.status(400).json({ message: '无效的歌曲ID' });
    }
    
    const { title, genre, language, artists } = req.body;
    
    console.log('更新歌曲信息请求:', {
      albumId,
      songId,
      title,
      genre,
      language,
      artistsCount: artists?.length,
      hasLyricsFile: !!req.body.lyricsFile,
      hasTranslationLyricsFile: !!req.body.translationLyricsFile,
      userRole: req.user.role
    });
    
    // 管理员可以编辑任何专辑的歌曲
    const isAdmin = req.user.role === 'admin';
    
    // 查找专辑，确保用户有权限
    let album;
    if (isAdmin) {
      // 管理员可以编辑任何专辑
      album = await Album.findByPk(albumId);
    } else {
      // 普通用户只能编辑自己的专辑
      album = await Album.findOne({
        where: {
          id: albumId,
          submittedById: req.user.id
        }
      });
    }
    
    if (!album) {
      return res.status(403).json({ message: '无权修改此专辑或专辑不存在' });
    }
    
    // 检查专辑状态，只有草稿状态或已拒绝状态的专辑可以修改
    // 但管理员可以编辑任何状态的专辑
    const isDraft = album.status === 'draft' || (album.comment && album.comment.includes('DRAFT'));
    const isRejected = album.status === 'rejected';
    
    if (!isDraft && !isRejected && !isAdmin) {
      return res.status(400).json({ message: '只能修改草稿状态或已拒绝状态的专辑中的歌曲' });
    }
    
    const song = await Song.findOne({
      where: {
        id: songId,
        albumId: albumId
      }
    });
    
    if (!song) {
      return res.status(404).json({ message: '歌曲不存在或不属于指定专辑' });
    }
    
    // 更新歌曲基本信息
    await song.update({
      title: title !== undefined ? title : song.title,
      genre: genre !== undefined ? genre : song.genre,
      language: language !== undefined ? language : song.language,
      // 如果提供了原始歌词文件路径，则使用它们，否则保留现有值
      lyricsFile: req.body.lyricsFile !== undefined ? req.body.lyricsFile : song.lyricsFile,
      translationLyricsFile: req.body.translationLyricsFile !== undefined ? req.body.translationLyricsFile : song.translationLyricsFile
    });
    
    console.log('歌曲基本信息已更新:', {
      title: title !== undefined ? title : song.title,
      genre: genre !== undefined ? genre : song.genre,
      language: language !== undefined ? language : song.language,
      lyricsFile: req.body.lyricsFile !== undefined ? req.body.lyricsFile : song.lyricsFile,
      translationLyricsFile: req.body.translationLyricsFile !== undefined ? req.body.translationLyricsFile : song.translationLyricsFile
    });
    
    // 如果提供了歌手信息，更新歌手关联
    if (artists && Array.isArray(artists)) {
      // 清除现有的歌手关联
      await song.setArtists([]);
      
      // 创建artistIds数组以保存有序的艺术家ID
      const artistIds = [];
      
      // 处理每个歌手
      for (const artistData of artists) {
        let artist;
        
        if (artistData.id) {
          // 更新现有歌手
          artist = await Artist.findByPk(artistData.id);
          if (artist) {
            // 更新歌手信息
            await artist.update({
              name: artistData.name || artist.name,
              realName: artistData.realName || artist.realName,
              id_number: artistData.id_number || artist.id_number,
              netease: artistData.platforms?.netease || artist.netease,
              qq: artistData.platforms?.qq || artist.qq,
              kugou: artistData.platforms?.kugou || artist.kugou,
              kuwo: artistData.platforms?.kuwo || artist.kuwo,
              qishui: artistData.platforms?.qishui || artist.qishui,
              spotify: artistData.platforms?.spotify || artist.spotify,
              youtube: artistData.platforms?.youtube || artist.youtube,
              appleMusic: artistData.platforms?.appleMusic || artist.appleMusic,
              soundCloud: artistData.platforms?.soundCloud || artist.soundCloud
            });
          }
        } else {
          // 创建新歌手
          artist = await Artist.create({
            name: artistData.name,
            realName: artistData.realName,
            id_number: artistData.id_number,
            netease: artistData.platforms?.netease,
            qq: artistData.platforms?.qq,
            kugou: artistData.platforms?.kugou,
            kuwo: artistData.platforms?.kuwo,
            qishui: artistData.platforms?.qishui,
            spotify: artistData.platforms?.spotify,
            youtube: artistData.platforms?.youtube,
            appleMusic: artistData.platforms?.appleMusic,
            soundCloud: artistData.platforms?.soundCloud
          });
        }
        
        if (artist) {
          await song.addArtist(artist);
          // 同时将艺术家ID添加到有序数组中
          artistIds.push(artist.id);
        }
      }
      
      // 保存有序艺术家ID到artists字段
      await song.update({ artists: artistIds });
    }
    
    // 获取更新后的歌曲信息，包括关联的歌手
    const updatedSong = await Song.findByPk(song.id, {
      include: [{
        model: Artist,
        as: 'Artists',
        through: { attributes: [] }
      }]
    });
    
    // 处理文件路径
    const processedSong = {
      ...updatedSong.toJSON(),
      wavFile: updatedSong.wavFile || null,
      Artists: updatedSong.Artists || []
    };

    res.json(processedSong);
  } catch (error) {
    console.error('更新歌曲信息错误:', error);
    res.status(500).json({ message: '更新歌曲信息失败', error: error.message });
  }
});

// 更新歌曲的歌手关联
router.put('/:albumId/songs/:songId/artists', auth, async (req, res) => {
  try {
    const albumId = parseInt(req.params.albumId, 10);
    const songIdParam = req.params.songId;
    
    // 正确解析songId，确保是有效数字
    let songId = parseInt(songIdParam, 10);
    
    // 检查songId是否为NaN
    if (isNaN(songId)) {
      console.error(`无效的歌曲ID: "${songIdParam}"`);
      return res.status(400).json({ message: '无效的歌曲ID' });
    }
    
    const { artists, title, genre, language, lyricsFile, translationLyricsFile } = req.body;
    
    console.log('更新歌曲信息请求:', {
      albumId,
      songId,
      title,
      genre,
      language,
      artistsCount: artists?.length,
      hasLyricsFile: !!lyricsFile,
      hasTranslationLyricsFile: !!translationLyricsFile,
      userRole: req.user.role
    });
    
    // 管理员可以编辑任何专辑的歌曲
    const isAdmin = req.user.role === 'admin';
    
    // 查找专辑，确保用户有权限
    let album;
    if (isAdmin) {
      // 管理员可以编辑任何专辑
      album = await Album.findByPk(albumId);
    } else {
      // 普通用户只能编辑自己的专辑
      album = await Album.findOne({
        where: {
          id: albumId,
          submittedById: req.user.id
        }
      });
    }
    
    if (!album) {
      return res.status(403).json({ message: '无权修改此专辑或专辑不存在' });
    }
    
    // 检查专辑状态，只有草稿状态或已拒绝状态的专辑可以修改
    // 但管理员可以编辑任何状态的专辑
    const isDraft = album.status === 'draft' || (album.comment && album.comment.includes('DRAFT'));
    const isRejected = album.status === 'rejected';
    
    if (!isDraft && !isRejected && !isAdmin) {
      return res.status(400).json({ message: '只能修改草稿状态或已拒绝状态的专辑中的歌曲' });
    }
    
    const song = await Song.findOne({
      where: {
        id: songId,
        albumId: albumId
      }
    });
    
    if (!song) {
      return res.status(404).json({ message: '歌曲不存在或不属于指定专辑' });
    }
    
    // 更新歌曲基本信息
    await song.update({
      title: title !== undefined ? title : song.title,
      genre: genre !== undefined ? genre : song.genre,
      language: language !== undefined ? language : song.language
    });
    
    console.log('歌曲基本信息已更新:', {
      title: title !== undefined ? title : song.title,
      genre: genre !== undefined ? genre : song.genre,
      language: language !== undefined ? language : song.language
    });
    
    // 验证歌手数组
    if (!artists || !Array.isArray(artists)) {
      return res.status(400).json({ message: '请提供有效的歌手数组' });
    }
    
    // 创建artistIds数组以保存有序的艺术家ID
    const artistIds = [];
    // 创建一个数组来存储歌手对象，用于返回给前端
    const artistObjects = [];
    
    // 添加新的歌手关联
    if (artists.length > 0) {
      // 处理每个歌手
      for (const artistData of artists) {
        let artist;
        
        // 确保artistData.id是有效的整数
        let artistId = null;
        if (artistData.id) {
          // 处理可能的浮点数ID
          if (typeof artistData.id === 'number' && !Number.isInteger(artistData.id)) {
            console.warn(`发现浮点数ID: ${artistData.id}，将转换为整数`);
            artistId = Math.floor(artistData.id);
          } else if (typeof artistData.id === 'string') {
            // 处理字符串ID
            if (artistData.id.startsWith('artist-')) {
              // 处理节点ID格式（如"artist-15"）
              const match = artistData.id.match(/artist-(\d+)/);
              if (match && match[1]) {
                artistId = parseInt(match[1]);
              }
            } else if (!isNaN(parseInt(artistData.id))) {
              // 处理字符串数字
              artistId = parseInt(artistData.id);
            }
          } else {
            // 处理普通数字ID
            artistId = artistData.id;
          }
        }
        
        console.log(`处理歌手 "${artistData.name}"，原始ID: ${artistData.id}，处理后ID: ${artistId}`);
        
        // 标记为新添加的歌手或ID无效
        const isNewArtist = artistData.isNew || !artistId;
        
        if (artistId && !isNewArtist) {
          // 更新现有歌手
          artist = await Artist.findByPk(artistId);
          if (artist) {
            // 更新歌手信息
            await artist.update({
              name: artistData.name || artist.name,
              realName: artistData.realName || artist.realName,
              id_number: artistData.id_number || artist.id_number,
              netease: artistData.platforms?.netease || artist.netease,
              qq: artistData.platforms?.qq || artist.qq,
              kugou: artistData.platforms?.kugou || artist.kugou,
              kuwo: artistData.platforms?.kuwo || artist.kuwo,
              qishui: artistData.platforms?.qishui || artist.qishui,
              spotify: artistData.platforms?.spotify || artist.spotify,
              youtube: artistData.platforms?.youtube || artist.youtube,
              appleMusic: artistData.platforms?.appleMusic || artist.appleMusic,
              soundCloud: artistData.platforms?.soundCloud || artist.soundCloud
            });
          } else {
            console.warn(`未找到ID为${artistId}的歌手，将创建新歌手`);
            // 如果找不到歌手，创建新歌手
            artist = await Artist.create({
              name: artistData.name,
              realName: artistData.realName,
              id_number: artistData.id_number,
              netease: artistData.platforms?.netease,
              qq: artistData.platforms?.qq,
              kugou: artistData.platforms?.kugou,
              kuwo: artistData.platforms?.kuwo,
              qishui: artistData.platforms?.qishui,
              spotify: artistData.platforms?.spotify,
              youtube: artistData.platforms?.youtube,
              appleMusic: artistData.platforms?.appleMusic,
              soundCloud: artistData.platforms?.soundCloud
            });
          }
        } else {
          // 创建新歌手
          artist = await Artist.create({
            name: artistData.name,
            realName: artistData.realName,
            id_number: artistData.id_number,
            netease: artistData.platforms?.netease,
            qq: artistData.platforms?.qq,
            kugou: artistData.platforms?.kugou,
            kuwo: artistData.platforms?.kuwo,
            qishui: artistData.platforms?.qishui,
            spotify: artistData.platforms?.spotify,
            youtube: artistData.platforms?.youtube,
            appleMusic: artistData.platforms?.appleMusic,
            soundCloud: artistData.platforms?.soundCloud
          });
        }
        
        if (artist) {
          // 不再使用关联表，只将ID添加到artists数组中
          artistIds.push(artist.id);
          // 添加歌手对象到返回数组
          artistObjects.push({
            id: artist.id,
            name: artist.name,
            realName: artist.realName,
            id_number: artist.id_number,
            netease: artist.netease,
            qq: artist.qq,
            kugou: artist.kugou,
            kuwo: artist.kuwo,
            qishui: artist.qishui,
            spotify: artist.spotify,
            youtube: artist.youtube,
            appleMusic: artist.appleMusic,
            soundCloud: artist.soundCloud
          });
        }
      }
      
      // 保存有序艺术家ID到artists字段
      await song.update({ artists: artistIds });
    }
    
    // 获取更新后的歌曲信息
    const updatedSong = await Song.findByPk(song.id);
    
    // 处理文件路径
    const processedSong = {
      ...updatedSong.toJSON(),
      wavFile: updatedSong.wavFile || null,
      // 使用我们刚刚收集的歌手对象数组
      Artists: artistObjects
    };

    res.json({
      message: '歌曲信息更新成功',
      song: processedSong
    });
  } catch (error) {
    console.error('更新歌曲信息错误:', error);
    res.status(500).json({ message: '更新歌曲信息失败', error: error.message });
  }
});

// 上传分片替换WAV文件
router.post('/:albumId/songs/:songId/merge-wav', auth, async (req, res) => {
  try {
    // 获取参数
    const albumId = parseInt(req.params.albumId, 10);
    const songIdParam = req.params.songId;
    
    // 正确解析songId，确保是有效数字
    let songId = parseInt(songIdParam, 10);
    
    console.log('接收到合并分片替换WAV文件请求:', {
      albumId,
      songIdParam,
      songId,
      isNaN: isNaN(songId),
      fileId: req.body.fileId,
      totalChunks: req.body.totalChunks,
      filename: req.body.filename
    });

    // 验证请求参数
    if (!req.body.fileId || !req.body.totalChunks) {
      return res.status(400).json({
        message: '缺少必要参数',
        detail: '需要提供fileId和totalChunks'
      });
    }

    // 验证参数是否为有效数字
    if (isNaN(albumId) || isNaN(songId)) {
      console.error(`无效的专辑ID或歌曲ID: albumId=${req.params.albumId}, songId=${songIdParam}`);
      return res.status(400).json({ message: '专辑ID或歌曲ID无效' });
    }

    // 检查用户权限
    const isAdmin = req.user.role === 'admin';
    
    // 构建查询条件，管理员可以查询任何专辑，普通用户只能查询自己的专辑
    const whereCondition = {
      id: albumId
    };
    
    if (!isAdmin) {
      whereCondition.submittedById = req.user.id;
    }

    // 检查专辑是否存在且用户有权限
    const album = await Album.findOne({
      where: whereCondition
    });

    if (!album) {
      return res.status(404).json({ message: '专辑不存在或无权限' });
    }

    // 检查歌曲是否存在
    const song = await Song.findOne({
      where: {
        id: songId,
        albumId: albumId
      },
      include: [{
        model: Artist,
        as: 'Artists',
        through: { attributes: [] }
      }]
    });

    if (!song) {
      return res.status(404).json({ message: '歌曲不存在' });
    }

    // 保存旧的WAV文件路径，稍后用于删除
    const oldWavFilePath = song.wavFile;
    console.log('旧的WAV文件路径:', oldWavFilePath);

    // 检查分片目录是否存在
    const chunksDir = path.join(__dirname, '../../uploads/chunks', req.body.fileId);
    if (!fs.existsSync(chunksDir)) {
      console.error(`分片目录不存在: ${chunksDir}`);
      
      // 尝试创建目录
      try {
        fs.mkdirSync(chunksDir, { recursive: true });
        console.log(`创建分片目录: ${chunksDir}`);
      } catch (mkdirError) {
        console.error('创建分片目录失败:', mkdirError);
        return res.status(500).json({ 
          message: '合并分片替换WAV文件失败', 
          error: `无法创建分片目录: ${mkdirError.message}` 
        });
      }
      
      // 如果目录是空的，则无法合并
      const files = fs.readdirSync(chunksDir);
      if (files.length === 0) {
        return res.status(400).json({ 
          message: '合并分片替换WAV文件失败', 
          error: '没有找到分片文件，请重新上传' 
        });
      }
    }

    // 解析歌手信息
    let artists;
    try {
      artists = typeof req.body.artists === 'string' ? JSON.parse(req.body.artists) : req.body.artists;
      console.log('解析的歌手信息:', artists);
    } catch (error) {
      console.error('解析歌手信息失败:', error);
      return res.status(400).json({ message: '歌手信息格式无效' });
    }

    // 创建歌手名称字符串，用于文件命名
    const artistNames = artists.map(artist => artist.name).join('&');

    // 准备合并文件
    const fileExt = path.extname(req.body.filename) || '.wav';
    const audioDir = path.join(__dirname, '../../uploads/audio');
    if (!fs.existsSync(audioDir)) {
      fs.mkdirSync(audioDir, { recursive: true });
    }

    // 使用"专辑名-歌曲名-歌手名"格式
    const timestamp = Date.now();
    const uuid = require('uuid').v4().substring(0, 8);
    const sanitizedAlbumTitle = album.title.replace(/[\\/:*?"<>|]/g, '_').trim();
    const sanitizedSongTitle = req.body.title.replace(/[\\/:*?"<>|]/g, '_').trim();
    const sanitizedArtistNames = artistNames.replace(/[\\/:*?"<>|]/g, '_').trim();
    
    const fileName = `${sanitizedAlbumTitle}-${sanitizedSongTitle}-${sanitizedArtistNames}-${timestamp}-${uuid}${fileExt}`;
    const filePath = path.join(audioDir, fileName);
    
    // 合并分片
    try {
      // 创建写入流
      const writeStream = fs.createWriteStream(filePath);
      
      // 依次读取并写入每个分片
      for (let i = 0; i < req.body.totalChunks; i++) {
        const chunkPath = path.join(chunksDir, i.toString());
        if (fs.existsSync(chunkPath)) {
          const chunkData = fs.readFileSync(chunkPath);
          writeStream.write(chunkData);
        } else {
          console.error(`分片文件不存在: ${chunkPath}`);
        }
      }
      
      // 关闭写入流
      writeStream.end();
      
      // 等待写入完成
      await new Promise((resolve, reject) => {
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
      });
      
      console.log('分片合并成功:', filePath);
      
      // 获取相对路径用于存储到数据库
      let wavFilePath = filePath.replace(/\\/g, '/');
      if (wavFilePath.includes('uploads/audio/')) {
        wavFilePath = wavFilePath.substring(wavFilePath.indexOf('uploads/audio/'));
      } else {
        wavFilePath = `uploads/audio/${fileName}`;
      }
      
      // 清理分片文件
      try {
        for (let i = 0; i < req.body.totalChunks; i++) {
          const chunkPath = path.join(chunksDir, i.toString());
          if (fs.existsSync(chunkPath)) {
            fs.unlinkSync(chunkPath);
          }
        }
        if (fs.existsSync(chunksDir)) {
          fs.rmdirSync(chunksDir);
        }
        console.log('分片文件清理完成');
      } catch (cleanupError) {
        console.warn('清理分片文件失败:', cleanupError);
        // 继续执行，不影响主流程
    }

      // 尝试获取音频文件时长
    let duration = null;
    try {
        duration = await getAudioDuration(filePath);
      console.log(`获取到音频文件时长: ${duration}秒`);
    } catch (err) {
      console.warn('无法获取音频时长:', err.message);
        // 如果获取失败，设置一个默认值或保留原来的值
      duration = song.duration || 0;
    }

    // 计算新WAV文件的MD5值
    let md5Hash = null;
    try {
      md5Hash = await calculateFileMD5(filePath);
      console.log('新WAV文件MD5计算完成:', md5Hash);
    } catch (error) {
      console.error('计算新WAV文件MD5失败:', error.message);
      // MD5计算失败时，设置为null，但不阻止文件替换
    }

      // 更新歌曲信息
      const updateData = {
        title: req.body.title || song.title,
        genre: req.body.genre || song.genre,
        language: req.body.language || song.language,
        wavFile: wavFilePath,
        duration: duration,
        md5: md5Hash
      };
      
      await song.update(updateData);
      console.log('歌曲WAV文件已更新:', updateData);

    // 删除旧的WAV文件
      if (oldWavFilePath) {
      try {
          const oldWavPath = path.join(__dirname, '../../', oldWavFilePath);
        if (fs.existsSync(oldWavPath)) {
            fs.unlinkSync(oldWavPath);
            console.log(`已删除旧的WAV文件: ${oldWavFilePath}`);
          } else {
            console.log(`旧的WAV文件不存在，无需删除: ${oldWavFilePath}`);
        }
      } catch (deleteErr) {
        console.error('删除旧的WAV文件失败:', deleteErr);
          // 继续执行，不影响更新
        }
      }

    // 更新歌手信息
    if (artists && artists.length > 0) {
      // 移除所有现有关联
      await song.setArtists([]);
      
      // 创建artistIds数组以保存有序的艺术家ID
      const artistIds = [];
      
      // 添加新的歌手关联
      for (const artistData of artists) {
        if (!artistData.name) {
          continue; // 跳过没有名称的歌手
        }
        
        let [artist] = await Artist.findOrCreate({
          where: { name: artistData.name },
          defaults: {
            realName: artistData.realName,
            id_number: artistData.id_number || null,
            netease: artistData.platforms?.netease,
            qq: artistData.platforms?.qq,
            kugou: artistData.platforms?.kugou,
            kuwo: artistData.platforms?.kuwo,
            qishui: artistData.platforms?.qishui,
            spotify: artistData.platforms?.spotify,
            youtube: artistData.platforms?.youtube,
            appleMusic: artistData.platforms?.appleMusic,
            soundCloud: artistData.platforms?.soundCloud
          }
        });
        
        await song.addArtist(artist);
        
        // 同时将艺术家ID添加到有序数组中
        artistIds.push(artist.id);
      }
      
      // 保存有序艺术家ID到artists字段
      await song.update({ artists: artistIds });
    }

    // 获取更新后的歌曲信息
    const updatedSong = await Song.findByPk(song.id, {
      include: [{
        model: Artist,
        as: 'Artists',
        through: { attributes: [] }
      }]
    });

    // 处理文件路径
    const processedSong = {
      ...updatedSong.toJSON(),
      wavFile: updatedSong.wavFile || null,
      Artists: updatedSong.Artists || []
    };

    res.json({
      message: 'WAV文件替换成功',
      song: processedSong
    });
    } catch (mergeError) {
      console.error('合并分片错误:', mergeError);
      return res.status(500).json({ 
        message: '合并分片替换WAV文件失败', 
        error: mergeError.message 
      });
    }
  } catch (error) {
    console.error('合并分片替换WAV文件错误:', error);
    res.status(500).json({ message: '合并分片替换WAV文件失败', error: error.message });
  }
});

// 删除授权书文件
router.delete('/:id/authorization', auth, async (req, res) => {
  try {
    const albumId = parseInt(req.params.id, 10);
    console.log('开始处理授权书删除请求，专辑ID:', albumId);
    
    if (isNaN(albumId)) {
      return res.status(400).json({ message: '专辑ID无效' });
    }

    // 管理员可以删除任何专辑的授权书
    const isAdmin = req.user.role === 'admin';
    
    // 构建查询条件，管理员可以查询任何专辑，普通用户只能查询自己的专辑
    const whereCondition = {
      id: albumId
    };
    
    if (!isAdmin) {
      whereCondition.submittedById = req.user.id;
    }

    const album = await Album.findOne({
      where: whereCondition
    });

    console.log('查询到的专辑信息:', album ? {
      id: album.id,
      title: album.title,
      submittedById: album.submittedById,
      authorizationFile: album.authorizationFile,
      status: album.status,
      comment: album.comment
    } : '未找到专辑');

    if (!album) {
      return res.status(404).json({ message: '专辑不存在或无权限' });
    }

    if (!album.authorizationFile) {
      return res.status(404).json({ message: '该专辑没有授权书文件' });
    }

    // 检查专辑状态 - 对于普通用户，只有草稿或已拒绝状态才能删除授权书
    if (!isAdmin && album.comment !== 'DRAFT: 尚未提交审核' && album.status !== 'rejected') {
      return res.status(400).json({ message: '只能删除草稿状态或已拒绝状态的专辑的授权书' });
    }

    // 删除文件
    try {
      const filePath = path.join(__dirname, '../../', album.authorizationFile);
      console.log('尝试删除文件:', filePath);
      
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log('授权书文件已成功删除');
      } else {
        console.log('授权书文件不存在，只清除数据库记录');
      }
    } catch (fileError) {
      console.error('删除授权书文件错误:', fileError);
      // 即使文件删除失败，也继续更新数据库记录
    }

    // 更新数据库记录
    await album.update({ authorizationFile: null });

    res.json({ message: '授权书已成功删除' });
  } catch (error) {
    console.error('删除授权书错误:', error);
    res.status(500).json({ message: '删除授权书失败', error: error.message });
  }
});

// 上传授权书文件
router.post('/:id/authorization', auth, uploadPDF.single('authorizationFile'), handleUploadError, async (req, res) => {
  try {
    const albumId = parseInt(req.params.id, 10);
    console.log('开始处理授权书上传请求，专辑ID:', albumId);
    console.log('请求头信息:', {
      contentType: req.headers['content-type'],
      contentLength: req.headers['content-length'],
      authorization: req.headers['authorization'] ? '已提供' : '未提供'
    });
    
    if (isNaN(albumId)) {
      return res.status(400).json({ message: '专辑ID无效' });
    }

    // 检查文件是否成功上传
    if (!req.file) {
      console.error('授权书文件上传失败:', {
        headers: req.headers,
        files: req.files ? Object.keys(req.files) : '无文件',
        body: Object.keys(req.body || {}),
        bodyValues: req.body,
        hasMulterFile: !!req.file,
        hasFiles: !!req.files,
        url: req.originalUrl,
        method: req.method
      });
      
      // 检查请求体是否包含文件数据
      let fileFieldFound = false;
      if (req.body && typeof req.body === 'object') {
        for (const key in req.body) {
          if (key === 'authorizationFile' || (typeof req.body[key] === 'object' && req.body[key] !== null)) {
            fileFieldFound = true;
            console.log(`找到可能的文件字段: ${key}, 类型: ${typeof req.body[key]}`);
          }
        }
      }
      
      if (fileFieldFound) {
        console.log('请求体中可能包含文件数据，但multer未正确解析');
      }
      
      return res.status(400).json({ 
        message: '请上传PDF格式的授权书文件',
        detail: '未检测到上传的文件，请确保：1. 使用正确的字段名"authorizationFile" 2. 文件格式为PDF 3. 文件大小不超过10MB'
      });
    }

    console.log('文件上传成功，文件信息:', {
      fieldname: req.file.fieldname,
      originalname: req.file.originalname,
      encoding: req.file.encoding,
      mimetype: req.file.mimetype,
      size: req.file.size,
      destination: req.file.destination,
      filename: req.file.filename,
      path: req.file.path
    });

    // 管理员可以为任何专辑上传授权书
    const isAdmin = req.user.role === 'admin';
    
    // 构建查询条件，管理员可以查询任何专辑，普通用户只能查询自己的专辑
    const whereCondition = {
      id: albumId
    };
    
    if (!isAdmin) {
      whereCondition.submittedById = req.user.id;
    }

    // 检查专辑是否存在且用户有权限
    const album = await Album.findOne({
      where: whereCondition
    });

    if (!album) {
      // 如果上传了文件但专辑不存在或无权限，删除已上传的文件
      if (req.file && req.file.path) {
        try {
          const filePath = path.join(__dirname, '../../', req.file.path);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log('已删除无效上传的授权书文件:', filePath);
          }
        } catch (deleteError) {
          console.error('删除无效上传文件失败:', deleteError);
        }
      }
      
      return res.status(404).json({ message: '专辑不存在或无权限' });
    }

    // 检查专辑状态，只有草稿状态或已拒绝状态的专辑可以上传授权书
    // 但管理员可以为任何状态的专辑上传授权书
    const isDraft = album.status === 'draft' || album.comment && album.comment.startsWith('DRAFT:');
    const isRejected = album.status === 'rejected';
    
    if (!isDraft && !isRejected && !isAdmin) {
      // 如果状态不允许上传，删除已上传的文件
      if (req.file && req.file.path) {
        try {
          const filePath = path.join(__dirname, '../../', req.file.path);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log('已删除不允许状态下上传的授权书文件:', filePath);
          }
        } catch (deleteError) {
          console.error('删除不允许状态下上传文件失败:', deleteError);
        }
      }
      
      return res.status(400).json({ message: '只能为草稿状态或已拒绝状态的专辑上传授权书' });
    }

    // 如果已有授权书，先删除
    if (album.authorizationFile) {
      try {
        const oldFilePath = path.join(__dirname, '../../', album.authorizationFile);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
          console.log('已删除旧的授权书文件:', oldFilePath);
        }
      } catch (deleteError) {
        console.error('删除旧的授权书文件失败:', deleteError);
      }
    }

    // 确保使用正确的相对路径格式
    let finalFilePath = req.file.path;
    
    // 标准化路径分隔符，确保使用正斜杠
    finalFilePath = finalFilePath.replace(/\\/g, '/');
    
    // 确保路径以 'uploads/pdf/' 开头
    if (finalFilePath.includes('uploads/pdf/')) {
      finalFilePath = finalFilePath.substring(finalFilePath.indexOf('uploads/pdf/'));
    } else if (finalFilePath.includes('uploads\\pdf\\')) {
      finalFilePath = finalFilePath.substring(finalFilePath.indexOf('uploads\\pdf\\')).replace(/\\/g, '/');
    } else {
      // 如果路径格式不对，构造一个标准格式的路径
      const fileName = path.basename(finalFilePath);
      finalFilePath = `uploads/pdf/${fileName}`;
    }
    
    console.log('授权书文件最终路径:', finalFilePath);
    
    // 更新专辑的授权书文件路径
    await album.update({ authorizationFile: finalFilePath });

    // 获取更新后的专辑信息
    const updatedAlbum = await Album.findByPk(album.id);
    
    // 生成文件的数字签名
    try {
      const absoluteFilePath = path.join(__dirname, '../../', finalFilePath);
      const fileHash = await require('../utils/authorizationService').generateFileHash(absoluteFilePath);
      const signature = require('../utils/authorizationService').signFile(fileHash);
      
      // 保存签名到单独的文件
      const signatureFilePath = `${absoluteFilePath}.sig`;
      await promisify(fs.writeFile)(signatureFilePath, signature);
      console.log('授权书数字签名生成成功，文件路径:', `${finalFilePath}.sig`);
      
      // 确保签名文件可访问
      const signatureExists = fs.existsSync(signatureFilePath);
      console.log('签名文件是否存在:', signatureExists);
      
      // 验证签名
      const verificationResult = await verifyAuthorizationSignature(albumId);
      console.log('授权书签名验证结果:', verificationResult);
      
      // 返回更新后的授权书信息和验证结果
      res.status(200).json({
        message: '授权书上传成功',
        authorizationFile: updatedAlbum.authorizationFile,
        originalFileName: path.basename(req.file.originalname),
        signatureVerification: verificationResult
      });
    } catch (signError) {
      console.error('生成授权书数字签名失败:', signError);
      // 即使签名失败，仍然返回上传成功
      res.status(200).json({
        message: '授权书上传成功，但数字签名生成失败',
        authorizationFile: updatedAlbum.authorizationFile,
        originalFileName: path.basename(req.file.originalname),
        signatureError: signError.message
      });
    }
  } catch (error) {
    console.error('上传授权书错误:', error);
    res.status(500).json({ message: '上传授权书失败', error: error.message });
  }
});

// 获取授权书文件
router.get('/:id/authorization', auth, async (req, res) => {
  try {
    const albumId = parseInt(req.params.id, 10);
    console.log('开始处理授权书下载请求，专辑ID:', albumId);
    
    if (isNaN(albumId)) {
      return res.status(400).json({ message: '专辑ID无效' });
    }

    // 管理员可以下载任何专辑的授权书
    const isAdmin = req.user.role === 'admin';
    
    // 构建查询条件，管理员可以查询任何专辑，普通用户只能查询自己的专辑
    const whereCondition = {
      id: albumId
    };
    
    if (!isAdmin) {
      whereCondition.submittedById = req.user.id;
    }

    const album = await Album.findOne({
      where: whereCondition
    });

    if (!album) {
      return res.status(404).json({ message: '专辑不存在或无权限' });
    }

    if (!album.authorizationFile) {
      return res.status(404).json({ message: '该专辑没有授权书文件' });
    }

    // 获取授权书文件的完整路径
    const filePath = path.join(__dirname, '../../', album.authorizationFile);
    
    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: '授权书文件不存在' });
    }

    // 获取文件名
    const fileName = path.basename(album.authorizationFile);
    
    // 设置响应头，指示浏览器下载文件
    res.setHeader('Content-Disposition', `attachment; filename=${encodeURIComponent(fileName)}`);
    res.setHeader('Content-Type', 'application/pdf');
    
    // 发送文件
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('下载授权书错误:', error);
    res.status(500).json({ message: '下载授权书失败', error: error.message });
  }
});

// 生成临时授权书文件（不保存到数据库，仅供下载）
router.post('/:id/generate-temp-authorization', auth, async (req, res) => {
  try {
    const albumId = parseInt(req.params.id, 10);
    console.log('开始验证临时授权书身份信息，专辑ID:', albumId);
    
    if (isNaN(albumId)) {
      return res.status(400).json({ message: '专辑ID无效' });
    }

    // 检查用户是否为管理员
    const isAdmin = req.user.role === 'admin';
    console.log('用户角色:', req.user.role, '是否管理员:', isAdmin);

    // 验证身份证号码
    const { idNumber, realName: inputRealName } = req.body;
    console.log('请求体中的字段:', {
      hasIdNumber: !!idNumber,
      hasRealName: !!inputRealName,
      idNumberLength: idNumber ? idNumber.length : 0
    });
    
    if (!idNumber) {
      return res.status(400).json({ message: '请提供身份证号码' });
    }

    // 验证身份证号码格式（简单验证）
    const idNumberRegex = /(^\d{15}$)|(^\d{18}$)|(^\d{17}(\d|X|x)$)/;
    if (!idNumberRegex.test(idNumber)) {
      return res.status(400).json({ message: '身份证号码格式无效' });
    }

    // 验证专辑是否存在
    // 管理员可以为任何专辑生成授权书，普通用户只能为自己的专辑生成
    const whereCondition = { id: albumId };
    if (!isAdmin) {
      whereCondition.submittedById = req.user.id;
    }

    const album = await Album.findOne({
      where: whereCondition,
      include: [
        {
          model: User,
          as: 'submittedBy',
          attributes: ['id', 'username', 'email']
        }
      ]
    });

    if (!album) {
      return res.status(404).json({ message: '专辑不存在或无权限' });
    }

    // 如果是管理员，则不需要验证身份证号码与自己的实名认证匹配
    // 管理员直接使用提供的身份证号码作为授权书内容
    if (isAdmin) {
      console.log('管理员正在生成授权书，跳过身份证匹配验证');
      
      // 获取管理员在表单中输入的授权人信息
      if (!inputRealName) {
        return res.status(400).json({ message: '请提供授权人姓名' });
      }
      
      // 直接使用管理员在表单中输入的授权人姓名和身份证号码
      const userInfo = {
        realName: inputRealName,
        idNumber: idNumber
      };
      
      console.log('管理员生成授权书使用的信息:', {
        realName: inputRealName,
        idNumberLength: idNumber ? idNumber.length : 0
      });

      return res.status(200).json({
        success: true,
        message: '管理员身份已验证，可以生成授权书',
        userInfo,
        albumInfo: {
          id: album.id,
          title: album.title
        },
        isAdminGenerated: true
      });
    }

    // 对于普通用户，验证用户是否已实名认证
    const userVerification = await UserVerification.findOne({
      where: { userId: req.user.id }
    });

    if (!userVerification) {
      console.log('用户未完成实名认证，用户ID:', req.user.id);
      return res.status(400).json({ 
        message: '您需要先完成实名认证才能生成授权书',
        needVerification: true
      });
    }

    // 记录实名认证信息
    console.log('找到用户实名认证记录:', {
      id: userVerification.id,
      status: userVerification.status,
      hasRealName: !!userVerification.realName,
      realName: userVerification.realName
    });

    // 检查实名认证状态
    if (userVerification.status !== 'approved') {
      console.log('用户实名认证未通过，状态:', userVerification.status);
      return res.status(400).json({ 
        message: '您的实名认证尚未通过审核，请等待审核通过后再生成授权书',
        needVerification: true
      });
    }

    // 引入解密工具
    const { decrypt } = require('../utils/encryption');
    
    // 解密存储的身份证号码
    let decryptedIdNumber;
    try {
      decryptedIdNumber = decrypt(userVerification.idNumber);
      console.log('成功解密身份证号码，长度:', decryptedIdNumber.length);
    } catch (decryptError) {
      console.error('解密身份证号码失败:', decryptError);
      return res.status(500).json({ message: '验证身份证号码失败，请联系客服' });
    }

    // 验证用户输入的身份证号码是否与实名认证的一致
    if (idNumber !== decryptedIdNumber) {
      console.log('身份证号码不匹配:', {
        inputLength: idNumber.length,
        storedLength: decryptedIdNumber.length,
        firstCharsInput: idNumber.substring(0, 4),
        firstCharsStored: decryptedIdNumber.substring(0, 4),
        lastCharsInput: idNumber.substring(idNumber.length - 4),
        lastCharsStored: decryptedIdNumber.substring(decryptedIdNumber.length - 4)
      });
      return res.status(400).json({ message: '身份证号码与实名认证信息不匹配，请输入您实名认证时使用的身份证号码' });
    }

    // 确保实名认证记录中有真实姓名
    if (!userVerification.realName) {
      console.error('实名认证记录中没有真实姓名，用户ID:', req.user.id);
      return res.status(500).json({ message: '无法获取您的实名信息，请联系客服处理' });
    }

    // 身份证号码验证通过，返回成功响应和用户实名信息
    console.log('身份证号码验证通过，返回用户实名信息:', {
      hasRealName: !!userVerification.realName,
      realNameLength: userVerification.realName ? userVerification.realName.length : 0
    });
    
    res.status(200).json({
      success: true,
      message: '身份证号码验证通过，可以生成授权书',
      userInfo: {
        realName: userVerification.realName,
        idNumber: idNumber
      },
      albumInfo: {
        id: album.id,
        title: album.title
      }
    });
  } catch (error) {
    console.error('验证临时授权书身份信息错误:', error);
    res.status(500).json({ message: error.message || '验证身份信息失败' });
  }
});

// 更新专辑封面
router.put('/:id/cover', auth, uploadImage.single('coverImage'), handleUploadError, async (req, res) => {
  try {
    const albumId = parseInt(req.params.id, 10);
    console.log('开始处理更新专辑封面请求，专辑ID:', albumId);
    
    if (isNaN(albumId)) {
      return res.status(400).json({ message: '专辑ID无效' });
    }

    // 检查文件是否成功上传
    if (!req.file) {
      console.error('封面图片上传失败:', {
        headers: req.headers,
        files: req.files,
        body: req.body
      });
      return res.status(400).json({ 
        message: '请上传JPG或PNG格式的图片',
        detail: '未检测到上传的文件，请确保：1. 使用正确的字段名"coverImage" 2. 文件格式为JPG或PNG 3. 文件大小不超过10MB'
      });
    }

    // 管理员可以更新任何专辑的封面
    const isAdmin = req.user.role === 'admin';
    
    // 构建查询条件，管理员可以查询任何专辑，普通用户只能查询自己的专辑
    const whereCondition = {
      id: albumId
    };
    
    if (!isAdmin) {
      whereCondition.submittedById = req.user.id;
    }

    // 检查专辑是否存在且用户有权限
    const album = await Album.findOne({
      where: whereCondition
    });

    if (!album) {
      // 如果上传了文件但专辑不存在或无权限，删除已上传的文件
      if (req.file && req.file.path) {
        try {
          const filePath = path.join(__dirname, '../../', req.file.path);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log('已删除无效上传的封面文件:', filePath);
          }
        } catch (deleteError) {
          console.error('删除无效上传文件失败:', deleteError);
        }
      }
      
      return res.status(404).json({ message: '专辑不存在或无权限' });
    }

    // 如果已有封面，先删除旧封面
    if (album.coverImage) {
      try {
        const oldFilePath = path.join(__dirname, '../../', album.coverImage);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
          console.log('已删除旧的封面文件:', oldFilePath);
          
          // 尝试删除缩略图
          const oldThumbPath = oldFilePath.replace('/images/', '/images/thumbnails/');
          if (fs.existsSync(oldThumbPath)) {
            fs.unlinkSync(oldThumbPath);
            console.log('已删除旧的封面缩略图:', oldThumbPath);
          }
        }
      } catch (deleteError) {
        console.error('删除旧的封面文件失败:', deleteError);
        // 继续更新，即使旧文件删除失败
      }
    }

    // 确保使用相对路径
    let finalFilePath = req.file.path;
    
    // 格式化上传的文件路径，确保以uploads/开头
    if (finalFilePath.includes('uploads/')) {
      finalFilePath = finalFilePath.substring(finalFilePath.indexOf('uploads/'));
    } else if (finalFilePath.includes('uploads\\')) {
      finalFilePath = finalFilePath.substring(finalFilePath.indexOf('uploads\\')).replace(/\\/g, '/');
    }
    
    // 生成封面缩略图
    try {
      // 获取绝对路径
      const absolutePath = path.join(__dirname, '../../', finalFilePath);
      // 生成缩略图
      const { getThumbnailPath } = require('../utils/imageProcessor');
      await getThumbnailPath(absolutePath);
      console.log('专辑封面缩略图生成成功');
    } catch (error) {
      console.error('生成专辑封面缩略图失败:', error);
      // 继续使用原图
    }
    
    // 更新专辑的封面图片路径
    await album.update({ coverImage: finalFilePath });

    // 获取更新后的专辑信息
    const updatedAlbum = await Album.findByPk(album.id);

    // 返回更新后的封面信息
    res.status(200).json({
      message: '专辑封面更新成功',
      coverImage: updatedAlbum.coverImage
    });
  } catch (error) {
    console.error('更新专辑封面错误:', error);
    res.status(500).json({ message: '更新专辑封面失败', error: error.message });
  }
});

// 获取指定专辑的歌曲列表
router.get('/:id/songs', async (req, res) => {
  try {
    const albumId = parseInt(req.params.id);
    
    if (isNaN(albumId)) {
      return res.status(400).json({ message: '无效的专辑ID' });
    }
    
    // 查找专辑
    const album = await Album.findByPk(albumId);
    
    if (!album) {
      return res.status(404).json({ message: '专辑不存在' });
    }
    
    // 获取专辑的歌曲
    const songs = await Song.findAll({
      where: { albumId },
      order: [['trackNumber', 'ASC']],
      include: [
        {
          model: Artist,
          as: 'Artists',
          through: { attributes: [] } // 不包含中间表字段
        }
      ]
    });
    
    res.json(songs);
  } catch (error) {
    console.error('获取专辑歌曲列表失败:', error);
    res.status(500).json({ message: error.message });
  }
});

// 添加一个缓存对象，用于存储已处理的分片合并请求
const mergedFilesCache = new Map();

// 合并分片并添加歌曲
router.post('/:id/merge-chunks', auth, async (req, res) => {
  try {
    console.log('接收到合并分片请求:', {
      albumId: req.params.id,
      body: req.body,
    });

    // 验证必要参数
    const { fileId, totalChunks, filename, title, genre, language, artists } = req.body;
    
    if (!fileId || !totalChunks || !filename || !title || !genre || !language || !artists) {
      return res.status(400).json({ 
        message: '参数无效',
        detail: '缺少必要的分片合并参数',
        received: req.body
      });
    }

    // 验证是否存在该专辑且用户有权限
    const albumId = parseInt(req.params.id, 10);
    const album = await Album.findOne({
      where: {
        id: albumId,
        submittedById: req.user.id
      }
    });

    if (!album) {
      return res.status(404).json({ message: '专辑不存在或无权限' });
    }

    // 检查是否已经处理过该合并请求
    const cacheKey = `${fileId}_${albumId}`;
    if (mergedFilesCache.has(cacheKey)) {
      console.log('检测到重复的合并请求，使用缓存结果:', cacheKey);
      const cachedResult = mergedFilesCache.get(cacheKey);
      
      // 删除缓存以防止内存泄漏
      setTimeout(() => {
        mergedFilesCache.delete(cacheKey);
        console.log('已删除合并缓存:', cacheKey);
      }, 60000); // 1分钟后删除缓存
      
      return res.status(200).json({ 
        message: '分片已经合并成功（缓存结果）',
        song: cachedResult
      });
    }

    // 合并分片
    try {
      console.log(`开始合并分片, fileId: ${fileId}, totalChunks: ${totalChunks}`);
      const mergedFilePath = await mergeChunks(fileId, totalChunks, filename);
      console.log('分片合并完成，文件路径:', mergedFilePath);

      // 获取专辑中已有的歌曲数量，用于设置 trackNumber
      const existingSongs = await Song.count({ where: { albumId: albumId } });
      const trackNumber = existingSongs + 1;

      // 尝试获取音频文件时长
      let duration = null;
      try {
        // 获取音频文件的完整路径
        const fullWavPath = path.join(__dirname, '../../', mergedFilePath);
        // 使用ffprobe获取真实的音频时长
        duration = await getAudioDuration(fullWavPath);
        console.log(`获取到音频文件时长: ${duration}秒`);
      } catch (err) {
        console.warn('无法获取音频时长:', err.message);
        // 如果获取失败，设置一个默认值
        duration = 0;
      }

      // 解析歌手信息
      let artistsData;
      try {
        artistsData = typeof artists === 'string' ? JSON.parse(artists) : artists;
      } catch (error) {
        return res.status(400).json({ message: '歌手信息格式无效' });
      }

      // 重命名上传的文件，使用更友好的命名方式
      const artistNames = artistsData.map(artist => artist.name).join('&');
      const originalPath = mergedFilePath;
      const fileExt = path.extname(originalPath);
      const dirName = path.dirname(originalPath);
      const sanitizedAlbumTitle = album.title.replace(/[\\/:*?"<>|]/g, '_').trim();
      const sanitizedSongTitle = title.replace(/[\\/:*?"<>|]/g, '_').trim();
      const sanitizedArtistNames = artistNames.replace(/[\\/:*?"<>|]/g, '_').trim();
      
      const newFileName = `${sanitizedAlbumTitle}-${sanitizedSongTitle}-${sanitizedArtistNames}${fileExt}`;
      const newPath = path.join(dirName, newFileName);
      
      // 确保使用相对路径
      let finalFilePath = originalPath;
      try {
        // 获取原始文件的完整路径
        const fullOriginalPath = path.join(__dirname, '../../', originalPath);
        const fullNewPath = path.join(__dirname, '../../', dirName, newFileName);
        
        fs.renameSync(fullOriginalPath, fullNewPath);
        console.log(`文件重命名成功: ${originalPath} -> ${newPath}`);
        
        // 更新为相对路径
        finalFilePath = newPath.replace(/\\/g, '/');
        if (finalFilePath.includes('uploads/')) {
          finalFilePath = finalFilePath.substring(finalFilePath.indexOf('uploads/'));
        }
      } catch (renameErr) {
        console.error('文件重命名失败:', renameErr);
        // 继续使用原始文件路径
      }

      // 创建歌曲记录
      const songData = {
        title: title,
        genre: genre,
        language: language,
        wavFile: finalFilePath,
        albumId: albumId,
        trackNumber: trackNumber,
        duration: duration
      };

      console.log('创建歌曲记录:', songData);

      const song = await Song.create(songData);
      
      // 创建artistIds数组以保存有序的艺术家ID
      const artistIds = [];
      
      // 创建或查找艺人，并建立关联
      for (const artistData of artistsData) {
        if (!artistData.name) {
          throw new Error('歌手名称不能为空');
        }
        let [artist] = await Artist.findOrCreate({
          where: { name: artistData.name },
          defaults: {
            realName: artistData.realName,
            id_number: artistData.id_number || null,
            netease: artistData.platforms?.netease,
            qq: artistData.platforms?.qq,
            kugou: artistData.platforms?.kugou,
            kuwo: artistData.platforms?.kuwo,
            qishui: artistData.platforms?.qishui,
            spotify: artistData.platforms?.spotify,
            youtube: artistData.platforms?.youtube,
            appleMusic: artistData.platforms?.appleMusic,
            soundCloud: artistData.platforms?.soundCloud
          }
        });
        // 保持向后兼容，继续使用多对多关联
        await song.addArtist(artist);
        
        // 同时将艺术家ID添加到有序数组中
        artistIds.push(artist.id);
      }
      
      // 保存有序艺术家ID到artists字段
      await song.update({ artists: artistIds });

      // 获取包含艺人信息的完整歌曲数据
      const populatedSong = await Song.findByPk(song.id, {
        include: [{
          model: Artist,
          as: 'Artists',
          through: { attributes: [] }
        }]
      });

      // 处理文件路径
      const processedSong = {
        ...populatedSong.toJSON(),
        wavFile: populatedSong.wavFile || null,
        Artists: populatedSong.Artists || []
      };
      
      console.log('歌曲创建成功:', {
        id: processedSong.id,
        title: processedSong.title,
        fileName: path.basename(processedSong.wavFile || '')
      });
      
      // 将结果添加到缓存中
      mergedFilesCache.set(cacheKey, processedSong);
      
      res.status(201).json({ 
        message: '分片合并并添加歌曲成功',
        song: processedSong
      });
    } catch (mergeError) {
      console.error('合并分片或创建歌曲失败:', mergeError);
      res.status(500).json({
        message: '合并分片或创建歌曲失败',
        error: mergeError.message
      });
    }
  } catch (error) {
    console.error('处理合并分片请求失败:', error);
    res.status(500).json({
      message: '处理合并分片请求失败',
      error: error.message
    });
  }
});

// 删除专辑中的歌曲
router.delete('/:id/songs/:songId', auth, async (req, res) => {
  try {
    const albumId = parseInt(req.params.id, 10);
    const songId = parseInt(req.params.songId, 10);
    
    console.log('接收到删除歌曲请求:', {
      albumId,
      songId,
      userId: req.user.id,
      userRole: req.user.role
    });
    
    if (isNaN(albumId) || isNaN(songId)) {
      return res.status(400).json({ message: '无效的专辑ID或歌曲ID' });
    }
    
    // 管理员可以删除任何专辑的歌曲
    const isAdmin = req.user.role === 'admin';
    
    // 检查专辑是否存在且用户有权限
    const whereCondition = { id: albumId };
    
    if (!isAdmin) {
      whereCondition.submittedById = req.user.id;
    }
    
    const album = await Album.findOne({
      where: whereCondition
    });
    
    if (!album) {
      return res.status(404).json({ message: '专辑不存在或无权限' });
    }
    
    // 检查专辑状态，只有草稿状态或已拒绝状态的专辑可以修改
    // 但管理员可以编辑任何状态的专辑
    const isDraft = album.comment && album.comment.startsWith('DRAFT:');
    const isRejected = album.status === 'rejected';
    
    if (!isDraft && !isRejected && !isAdmin) {
      return res.status(400).json({ message: '只能修改草稿状态或已拒绝状态的专辑' });
    }
    
    // 查找歌曲
    const song = await Song.findOne({
      where: {
        id: songId,
        albumId: albumId
      }
    });
    
    if (!song) {
      return res.status(404).json({ message: '歌曲不存在或不属于指定专辑' });
    }
    
    // 删除歌曲文件
    if (song.wavFile) {
      try {
        const filePath = path.join(__dirname, '../../', song.wavFile);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`已删除歌曲文件: ${filePath}`);
        }
      } catch (error) {
        console.error('删除歌曲文件失败:', error);
        // 继续执行，不影响数据库操作
      }
    }
    
    // 删除歌曲记录
    await song.destroy();
    
    // 重新排序剩余歌曲的trackNumber
    const remainingSongs = await Song.findAll({
      where: { albumId },
      order: [['trackNumber', 'ASC']]
    });
    
    for (let i = 0; i < remainingSongs.length; i++) {
      await remainingSongs[i].update({ trackNumber: i + 1 });
    }
    
    res.status(200).json({ 
      message: '歌曲已成功删除',
      songId,
      albumId
    });
  } catch (error) {
    console.error('删除歌曲失败:', error);
    res.status(500).json({ message: '删除歌曲失败', error: error.message });
  }
});

// 更新专辑信息
router.put('/:id', auth, async (req, res) => {
  try {
    const albumId = req.params.id;
    const { title, type, releaseDate, displayInfo, description, performer, performerIds } = req.body;
    
    console.log('更新专辑信息请求:', {
      albumId,
      title,
      performer,
      performerIds,
      userRole: req.user.role
    });
    
    // 管理员可以编辑任何专辑
    const isAdmin = req.user.role === 'admin';
    
    // 查找专辑，确保用户有权限修改
    let album;
    if (isAdmin) {
      // 管理员可以编辑任何专辑
      album = await Album.findByPk(albumId);
    } else {
      // 普通用户只能编辑自己的专辑
      album = await Album.findOne({
        where: {
          id: albumId,
          submittedById: req.user.id
        }
      });
    }
    
    if (!album) {
      return res.status(403).json({ message: '无权修改此专辑或专辑不存在' });
    }
    
    // 检查专辑状态，只有草稿状态或已拒绝状态的专辑可以修改
    // 但管理员可以编辑任何状态的专辑
    const isDraft = album.status === 'draft' || (album.comment && album.comment.includes('DRAFT'));
    const isRejected = album.status === 'rejected';
    
    console.log('更新专辑信息 - 状态检查:', {
      albumId: album.id,
      status: album.status,
      comment: album.comment,
      isDraft: isDraft,
      isRejected: isRejected,
      isAdmin: isAdmin
    });
    
    if (!isDraft && !isRejected && !isAdmin) {
      return res.status(400).json({ message: '只能修改草稿状态或已拒绝状态的专辑' });
    }
    
    // 处理performer字段
    let updatedPerformer = album.performer;
    if (performer !== undefined) {
      updatedPerformer = performer || '未知艺术家';
    }
    
    // 处理performerIds字段
    let updatedPerformerIds = album.performerIds;
    if (performerIds !== undefined) {
      try {
        // 验证是否为有效的JSON数组
        const ids = JSON.parse(performerIds);
        if (Array.isArray(ids)) {
          updatedPerformerIds = performerIds;
        } else {
          updatedPerformerIds = '[]';
        }
      } catch (e) {
        console.error('解析performerIds失败:', e);
        updatedPerformerIds = '[]';
      }
    }
    
    // 更新专辑信息
    await album.update({
      title: title || album.title,
      type: type || album.type,
      releaseDate: releaseDate || album.releaseDate,
      displayInfo: displayInfo || album.displayInfo,
      description: description || album.description,
      performer: updatedPerformer,
      performerIds: updatedPerformerIds
    });
    
    console.log('专辑更新成功:', {
      id: album.id,
      title: album.title,
      performer: album.performer,
      performerIds: album.performerIds
    });
    
    res.json({
      message: '专辑信息更新成功',
      album: {
        id: album.id,
        title: album.title,
        type: album.type,
        releaseDate: album.releaseDate,
        displayInfo: album.displayInfo,
        description: album.description,
        performer: album.performer,
        performerIds: album.performerIds
      }
    });
  } catch (error) {
    console.error('更新专辑信息错误:', error);
    res.status(500).json({ message: '更新专辑信息失败' });
  }
});

// 添加歌词文件上传API端点
router.post('/:albumId/songs/:songId/lyrics', auth, async (req, res) => {
  try {
    const { albumId, songId } = req.params;
    const userId = req.user.id;

    console.log('接收到歌词文件上传请求:', {
      albumId,
      songId,
      userId,
      contentType: req.headers['content-type'],
      hasFiles: !!req.files,
      filesKeys: req.files ? Object.keys(req.files) : []
    });

    // 检查是否有文件上传
    if (!req.files || Object.keys(req.files).length === 0) {
      console.error('未接收到任何文件');
      return res.status(400).json({ message: '未接收到任何文件' });
    }

    // 检查专辑是否存在
    const album = await Album.findByPk(albumId);
    if (!album) {
      return res.status(404).json({ message: '专辑不存在' });
    }

    // 检查用户是否有权限修改此专辑
    if (album.submittedById !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: '无权访问此专辑' });
    }

    // 检查歌曲是否存在
    const song = await Song.findByPk(songId);
    if (!song) {
      return res.status(404).json({ message: '歌曲不存在' });
    }

    // 检查歌曲是否属于该专辑
    if (song.albumId !== parseInt(albumId)) {
      return res.status(400).json({ message: '歌曲不属于该专辑' });
    }

    // 处理歌词文件上传
    const lyricsFile = req.files?.lyricsFile;
    const translationLyricsFile = req.files?.translationLyricsFile;
    let lyricsFilePath = null;
    let translationLyricsFilePath = null;

    console.log('上传文件信息:', {
      lyricsFile: lyricsFile ? {
        name: lyricsFile.name,
        size: lyricsFile.size,
        mimetype: lyricsFile.mimetype
      } : null,
      translationLyricsFile: translationLyricsFile ? {
        name: translationLyricsFile.name,
        size: translationLyricsFile.size,
        mimetype: translationLyricsFile.mimetype
      } : null
    });

    // 确保歌词目录存在
    const lyricsDir = path.join(__dirname, '..', '..', 'uploads', 'lyrics');
    if (!fs.existsSync(lyricsDir)) {
      console.log('创建歌词目录:', lyricsDir);
      fs.mkdirSync(lyricsDir, { recursive: true });
    }

    // 上传歌词文件
    if (lyricsFile) {
      console.log('处理歌词文件上传:', lyricsFile.name);
      
      // 验证文件格式 - 移除LRC格式限制
      /* 
      if (!lyricsFile.name.toLowerCase().endsWith('.lrc')) {
        return res.status(400).json({ message: '歌词文件必须是LRC格式' });
      }
      */
      
      // 生成文件名和路径
      const lyricsFileName = `lyrics_${Date.now()}_${lyricsFile.name}`;
      lyricsFilePath = path.join('uploads', 'lyrics', lyricsFileName);
      const fullLyricsPath = path.join(__dirname, '..', '..', lyricsFilePath);
      
      try {
        // 保存文件
        await lyricsFile.mv(fullLyricsPath);
        console.log('歌词文件已保存:', fullLyricsPath);
        
        // 更新歌曲记录
        song.lyricsFile = lyricsFilePath.replace(/\\/g, '/');
        console.log('更新歌曲记录的歌词文件路径:', song.lyricsFile);
      } catch (mvError) {
        console.error('保存歌词文件失败:', mvError);
        return res.status(500).json({ message: '保存歌词文件失败', error: mvError.message });
      }
    }
    
    // 上传翻译歌词文件
    if (translationLyricsFile) {
      console.log('处理翻译歌词文件上传:', translationLyricsFile.name);
      
      // 验证文件格式 - 移除LRC格式限制
      /*
      if (!translationLyricsFile.name.toLowerCase().endsWith('.lrc')) {
        return res.status(400).json({ message: '翻译歌词文件必须是LRC格式' });
      }
      */
      
      // 生成文件名和路径
      const translationLyricsFileName = `translation_lyrics_${Date.now()}_${translationLyricsFile.name}`;
      translationLyricsFilePath = path.join('uploads', 'lyrics', translationLyricsFileName);
      const fullTranslationPath = path.join(__dirname, '..', '..', translationLyricsFilePath);
      
      try {
        // 保存文件
        await translationLyricsFile.mv(fullTranslationPath);
        console.log('翻译歌词文件已保存:', fullTranslationPath);
        
        // 更新歌曲记录
        song.translationLyricsFile = translationLyricsFilePath.replace(/\\/g, '/');
        console.log('更新歌曲记录的翻译歌词文件路径:', song.translationLyricsFile);
      } catch (mvError) {
        console.error('保存翻译歌词文件失败:', mvError);
        return res.status(500).json({ message: '保存翻译歌词文件失败', error: mvError.message });
      }
    }
    
    // 保存歌曲记录
    try {
      await song.save();
      console.log('歌曲记录已更新:', {
        id: song.id,
        title: song.title,
        lyricsFile: song.lyricsFile,
        translationLyricsFile: song.translationLyricsFile
      });
    } catch (saveError) {
      console.error('保存歌曲记录失败:', saveError);
      return res.status(500).json({ message: '保存歌曲记录失败', error: saveError.message });
    }
    
    // 返回成功响应
    return res.status(200).json({
      message: '歌词文件上传成功',
      song: {
        id: song.id,
        title: song.title,
        lyricsFile: song.lyricsFile,
        translationLyricsFile: song.translationLyricsFile
      }
    });
  } catch (error) {
    console.error('歌词文件上传错误:', error);
    return res.status(500).json({ message: '歌词文件上传失败', error: error.message });
  }
});

// 更新歌曲的WAV文件
router.put('/:albumId/songs/:songId/wav', auth, uploadAudio.single('wavFile'), handleUploadError, async (req, res) => {
  try {
    const albumId = parseInt(req.params.albumId, 10);
    const songIdParam = req.params.songId;
    
    // 正确解析songId，确保是有效数字
    let songId = parseInt(songIdParam, 10);
    
    // 详细记录请求信息，帮助调试
    console.log('接收到更新WAV文件请求:', {
      albumId,
      songIdParam,
      songId,
      isNaN: isNaN(songId),
      body: req.body,
      file: req.file ? {
        originalname: req.file.originalname,
        size: req.file.size,
        path: req.file.path
      } : '无文件'
    });
    
    // 验证参数
    if (isNaN(albumId) || isNaN(songId)) {
      console.error(`无效的专辑ID或歌曲ID: albumId=${req.params.albumId}, songId=${songIdParam}`);
      return res.status(400).json({ message: '无效的专辑ID或歌曲ID' });
    }
    
    // 检查专辑是否存在且用户有权限
    const album = await Album.findOne({
      where: {
        id: albumId,
        submittedById: req.user.id
      }
    });
    
    if (!album) {
      return res.status(404).json({ message: '专辑不存在或无权限' });
    }
    
    // 检查歌曲是否存在
    const song = await Song.findOne({
      where: {
        id: songId,
        albumId: albumId
      }
    });
    
    if (!song) {
      return res.status(404).json({ message: '歌曲不存在' });
    }
    
    // 提取请求中的数据
    const { title, genre, language, artists } = req.body;
    
    // 更新歌曲基本信息
    const updateData = {
      title: title || song.title,
      genre: genre || song.genre,
      language: language || song.language
    };
    
    // 如果上传了WAV文件，处理文件更新
    if (req.file) {
      console.log('处理WAV文件更新:', req.file.originalname);
      
      // 删除旧的WAV文件
      if (song.wavFile) {
        try {
          const oldWavPath = path.join(__dirname, '../../', song.wavFile);
          if (fs.existsSync(oldWavPath)) {
            fs.unlinkSync(oldWavPath);
            console.log(`已删除旧的WAV文件: ${song.wavFile}`);
          }
        } catch (deleteErr) {
          console.error('删除旧的WAV文件失败:', deleteErr);
          // 继续执行，不影响更新
        }
      }
      
      // 重命名上传的文件，使用"专辑名-歌曲名-歌手名"格式
      const originalPath = req.file.path;
      const fileExt = path.extname(originalPath);
      const dirName = path.dirname(originalPath);
      
      // 解析歌手信息
      let artistNames = '未知艺术家';
      try {
        const artistsData = JSON.parse(artists);
        if (Array.isArray(artistsData) && artistsData.length > 0) {
          artistNames = artistsData.map(a => a.name).join('&');
        }
      } catch (e) {
        console.error('解析歌手信息失败:', e);
      }
      
      const sanitizedAlbumTitle = album.title.replace(/[\\/:*?"<>|]/g, '_').trim();
      const sanitizedSongTitle = updateData.title.replace(/[\\/:*?"<>|]/g, '_').trim();
      const sanitizedArtistNames = artistNames.replace(/[\\/:*?"<>|]/g, '_').trim();
      
      const newFileName = `${sanitizedAlbumTitle}-${sanitizedSongTitle}-${sanitizedArtistNames}${fileExt}`;
      const newPath = path.join(dirName, newFileName);
      
      // 确保使用相对路径
      let finalFilePath = originalPath;
      try {
        // 获取原始文件的完整路径
        const fullOriginalPath = path.join(__dirname, '../../', originalPath);
        const fullNewPath = path.join(__dirname, '../../', dirName, newFileName);
        
        fs.renameSync(fullOriginalPath, fullNewPath);
        console.log(`文件重命名成功: ${originalPath} -> ${newPath}`);
        
        // 更新为相对路径
        finalFilePath = newPath.replace(/\\/g, '/');
        if (finalFilePath.includes('uploads/')) {
          finalFilePath = finalFilePath.substring(finalFilePath.indexOf('uploads/'));
        }
      } catch (renameErr) {
        console.error('文件重命名失败:', renameErr);
        // 继续使用原始文件路径
      }
      
      // 尝试获取音频文件时长
      let duration = null;
      try {
        duration = await getAudioDuration(finalFilePath);
        console.log(`获取到音频文件时长: ${duration}秒`);
      } catch (err) {
        console.warn('无法获取音频时长:', err.message);
        // 如果获取失败，保留原有时长
        duration = song.duration || 0;
      }
      
      // 计算新WAV文件的MD5值
      let md5Hash = null;
      try {
        md5Hash = await calculateFileMD5(finalFilePath);
        console.log('新WAV文件MD5计算完成:', md5Hash);
      } catch (error) {
        console.error('计算新WAV文件MD5失败:', error.message);
        // MD5计算失败时，设置为null，但不阻止文件更新
      }
      
      // 更新WAV文件路径、时长和MD5
      updateData.wavFile = finalFilePath;
      updateData.duration = duration;
      updateData.md5 = md5Hash;
      
      console.log('WAV文件信息已更新:', {
        path: finalFilePath,
        duration: duration,
        md5: md5Hash
      });
    }
    
    // 更新歌曲信息
    await song.update(updateData);
    
    // 如果提供了歌手信息，更新歌手关联
    if (artists) {
      try {
        const artistsData = JSON.parse(artists);
        if (Array.isArray(artistsData)) {
          // 清除现有的歌手关联
          await song.setArtists([]);
          
          // 添加新的歌手关联
          for (const artistData of artistsData) {
            if (!artistData.name) {
              continue; // 跳过没有名称的歌手
            }
            
            let [artist] = await Artist.findOrCreate({
              where: { name: artistData.name },
              defaults: {
                realName: artistData.realName,
                id_number: artistData.id_number || null,
                netease: artistData.platforms?.netease,
                qq: artistData.platforms?.qq,
                kugou: artistData.platforms?.kugou,
                kuwo: artistData.platforms?.kuwo,
                qishui: artistData.platforms?.qishui,
                spotify: artistData.platforms?.spotify,
                youtube: artistData.platforms?.youtube,
                appleMusic: artistData.platforms?.appleMusic,
                soundCloud: artistData.platforms?.soundCloud
              }
            });
            
            await song.addArtist(artist);
          }
        }
      } catch (e) {
        console.error('处理歌手信息失败:', e);
        // 继续执行，不影响歌曲基本信息的更新
      }
    }
    
    // 获取更新后的歌曲信息
    const updatedSong = await Song.findByPk(song.id, {
      include: [{
        model: Artist,
        as: 'Artists',
        through: { attributes: [] }
      }]
    });
    
    // 处理文件路径
    const processedSong = {
      ...updatedSong.toJSON(),
      wavFile: updatedSong.wavFile || null,
      Artists: updatedSong.Artists || []
    };
    
    res.json({
      message: '歌曲信息和WAV文件更新成功',
      song: processedSong
    });
  } catch (error) {
    console.error('更新WAV文件错误:', error);
    res.status(500).json({ message: '更新WAV文件失败', error: error.message });
  }
});

// 添加歌词文件上传API端点
router.post('/:albumId/lyrics-upload', auth, async (req, res) => {
  try {
    const { albumId } = req.params;
    const userId = req.user.id;

    console.log('接收到歌词文件上传请求:', {
      albumId,
      userId,
      contentType: req.headers['content-type'],
      hasFiles: !!req.files,
      filesKeys: req.files ? Object.keys(req.files) : []
    });

    // 检查是否有文件上传
    if (!req.files || !req.files.lyricsFile) {
      console.error('未接收到歌词文件');
      return res.status(400).json({ message: '未接收到歌词文件' });
    }

    // 检查专辑是否存在
    const album = await Album.findByPk(albumId);
    if (!album) {
      return res.status(404).json({ message: '专辑不存在' });
    }

    // 检查用户是否有权限修改此专辑
    if (album.submittedById !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: '无权访问此专辑' });
    }

    // 处理歌词文件上传
    const lyricsFile = req.files.lyricsFile;
    console.log('上传文件信息:', {
      name: lyricsFile.name,
      size: lyricsFile.size,
      mimetype: lyricsFile.mimetype
    });

    // 确保歌词目录存在
    const lyricsDir = path.join(__dirname, '..', '..', 'uploads', 'lyrics');
    if (!fs.existsSync(lyricsDir)) {
      console.log('创建歌词目录:', lyricsDir);
      fs.mkdirSync(lyricsDir, { recursive: true });
    }

    // 生成文件名和路径
    const lyricsFileName = `lyrics_${Date.now()}_${lyricsFile.name}`;
    const lyricsFilePath = path.join('uploads', 'lyrics', lyricsFileName);
    const fullLyricsPath = path.join(__dirname, '..', '..', lyricsFilePath);
    
    try {
      // 保存文件
      await lyricsFile.mv(fullLyricsPath);
      console.log('歌词文件已保存:', fullLyricsPath);
      
      // 返回成功响应
      return res.status(200).json({
        message: '歌词文件上传成功',
        path: lyricsFilePath.replace(/\\/g, '/')
      });
    } catch (mvError) {
      console.error('保存歌词文件失败:', mvError);
      return res.status(500).json({ message: '保存歌词文件失败', error: mvError.message });
    }
  } catch (error) {
    console.error('歌词文件上传错误:', error);
    return res.status(500).json({ message: '歌词文件上传失败', error: error.message });
  }
});

// 添加翻译歌词文件上传API端点
router.post('/:albumId/translation-lyrics-upload', auth, async (req, res) => {
  try {
    const { albumId } = req.params;
    const userId = req.user.id;

    console.log('接收到翻译歌词文件上传请求:', {
      albumId,
      userId,
      contentType: req.headers['content-type'],
      hasFiles: !!req.files,
      filesKeys: req.files ? Object.keys(req.files) : []
    });

    // 检查是否有文件上传
    if (!req.files || !req.files.translationLyricsFile) {
      console.error('未接收到翻译歌词文件');
      return res.status(400).json({ message: '未接收到翻译歌词文件' });
    }

    // 检查专辑是否存在
    const album = await Album.findByPk(albumId);
    if (!album) {
      return res.status(404).json({ message: '专辑不存在' });
    }

    // 检查用户是否有权限修改此专辑
    if (album.submittedById !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: '无权访问此专辑' });
    }

    // 处理翻译歌词文件上传
    const translationLyricsFile = req.files.translationLyricsFile;
    console.log('上传文件信息:', {
      name: translationLyricsFile.name,
      size: translationLyricsFile.size,
      mimetype: translationLyricsFile.mimetype
    });

    // 确保歌词目录存在
    const lyricsDir = path.join(__dirname, '..', '..', 'uploads', 'lyrics');
    if (!fs.existsSync(lyricsDir)) {
      console.log('创建歌词目录:', lyricsDir);
      fs.mkdirSync(lyricsDir, { recursive: true });
    }

    // 生成文件名和路径
    const translationLyricsFileName = `translation_lyrics_${Date.now()}_${translationLyricsFile.name}`;
    const translationLyricsFilePath = path.join('uploads', 'lyrics', translationLyricsFileName);
    const fullTranslationPath = path.join(__dirname, '..', '..', translationLyricsFilePath);
    
    try {
      // 保存文件
      await translationLyricsFile.mv(fullTranslationPath);
      console.log('翻译歌词文件已保存:', fullTranslationPath);
      
      // 返回成功响应
      return res.status(200).json({
        message: '翻译歌词文件上传成功',
        path: translationLyricsFilePath.replace(/\\/g, '/')
      });
    } catch (mvError) {
      console.error('保存翻译歌词文件失败:', mvError);
      return res.status(500).json({ message: '保存翻译歌词文件失败', error: mvError.message });
    }
  } catch (error) {
    console.error('翻译歌词文件上传错误:', error);
    return res.status(500).json({ message: '翻译歌词文件上传失败', error: error.message });
  }
});

// 处理分片上传 - 添加一个别名路由，匹配前端使用的路径
router.post('/:albumId/upload-chunk', auth, async (req, res) => {
  // 记录当前处理的文件ID，用于错误处理时清理
  let currentFileId = null;
  
  try {
    console.log('接收到分片上传请求 (别名路由):', {
      albumId: req.params.albumId,
      headers: {
        'x-file-id': req.headers['x-file-id'],
        'x-chunk-index': req.headers['x-chunk-index'],
        'x-total-chunks': req.headers['x-total-chunks'],
        'content-type': req.headers['content-type'],
        'content-length': req.headers['content-length']
      }
    });

    // 检查是否有文件
    if (!req.files || !req.files.file) {
      console.error('未接收到文件数据');
      return res.status(400).json({ 
        message: '未接收到文件数据',
        detail: '请确保正确发送文件'
      });
    }

    // 从请求头获取参数
    const fileId = req.headers['x-file-id'];
    currentFileId = fileId; // 保存fileId用于错误处理
    const chunkIndex = parseInt(req.headers['x-chunk-index'], 10);
    const totalChunks = parseInt(req.headers['x-total-chunks'], 10);
    
    // 检查参数是否存在
    if (!fileId) {
      console.error('缺少fileId参数:', req.headers);
      return res.status(400).json({
        message: '缺少fileId参数',
        detail: '需要提供x-file-id请求头'
      });
    }
    
    if (isNaN(chunkIndex)) {
      console.error('缺少或无效的chunkIndex参数:', req.headers);
      return res.status(400).json({
        message: '缺少或无效的chunkIndex参数',
        detail: '需要提供x-chunk-index请求头，且值必须是数字'
      });
    }
    
    if (isNaN(totalChunks)) {
      console.error('缺少或无效的totalChunks参数:', req.headers);
      return res.status(400).json({
        message: '缺少或无效的totalChunks参数',
        detail: '需要提供x-total-chunks请求头，且值必须是数字'
      });
    }

    console.log('分片上传参数验证通过:', {
      fileId,
      chunkIndex,
      totalChunks
    });

    // 验证是否存在该专辑且用户有权限
    const albumId = parseInt(req.params.albumId, 10);
    
    // 检查用户权限
    const isAdmin = req.user.role === 'admin';
    
    // 构建查询条件，管理员可以查询任何专辑，普通用户只能查询自己的专辑
    const whereCondition = {
      id: albumId
    };
    
    if (!isAdmin) {
      whereCondition.submittedById = req.user.id;
    }

    // 检查专辑是否存在且用户有权限
    const album = await Album.findOne({
      where: whereCondition
    });

    if (!album) {
      return res.status(404).json({ message: '专辑不存在或无权限' });
    }

    // 确保分片目录存在
    const chunksDir = path.join(__dirname, '../../uploads/chunks', fileId);
    if (!fs.existsSync(chunksDir)) {
      fs.mkdirSync(chunksDir, { recursive: true });
    }

    // 保存分片文件
    const chunkFile = req.files.file;
    const chunkPath = path.join(chunksDir, chunkIndex.toString());
    
    try {
      await chunkFile.mv(chunkPath);
      console.log(`成功保存分片 ${chunkIndex + 1}/${totalChunks}, 大小: ${chunkFile.size}字节, 路径: ${chunkPath}`);
    } catch (moveError) {
      console.error(`保存分片文件失败:`, moveError);
      return res.status(500).json({ 
        message: '保存分片文件失败',
        detail: moveError.message
      });
    }

    // 如果是最后一个分片，执行合并
    if (chunkIndex === totalChunks - 1) {
      console.log('这是最后一个分片，开始合并');
      try {
        const mergedFilePath = await mergeChunks(fileId, totalChunks, chunkFile.name);
        console.log('分片合并成功:', mergedFilePath);

        res.status(200).json({
          message: '所有分片上传并合并成功',
          filePath: mergedFilePath,
          fileId: fileId,
          completed: true
        });
      } catch (mergeError) {
        console.error('合并分片错误:', mergeError);
        
        // 尝试清理分片目录
        try {
          await rimraf(chunksDir);
          console.log(`合并失败后清理分片目录: ${chunksDir}`);
        } catch (cleanupError) {
          console.error('清理分片目录失败:', cleanupError);
        }
        
        res.status(500).json({
          message: '合并分片失败',
          error: mergeError.message
        });
      }
    } else {
      // 不是最后一个分片，简单返回成功
      res.status(200).json({
        message: `分片 ${chunkIndex + 1}/${totalChunks} 上传成功`,
        chunkIndex: chunkIndex,
        fileId: fileId,
        completed: false
      });
    }
  } catch (error) {
    console.error('处理分片上传错误:', error);
    
    // 如果有fileId，尝试清理分片目录
    if (currentFileId) {
      try {
        const chunksDir = path.join(__dirname, '../../uploads/chunks', currentFileId);
        await rimraf(chunksDir);
        console.log(`错误处理中清理分片目录: ${chunksDir}`);
      } catch (cleanupError) {
        console.error('清理分片目录失败:', cleanupError);
      }
    }
    
    res.status(500).json({
      message: '处理分片上传失败',
      error: error.message
    });
  }
});

// 使用Base64编码创建新专辑
router.post('/base64-upload', auth, async (req, res) => {
  try {
    console.log('接收到Base64创建专辑请求:', {
      userId: req.user.id,
      ip: req.ip,
      hasImage: !!req.body.coverImageBase64,
      imageSize: req.body.coverImageBase64 ? `约${Math.round(req.body.coverImageBase64.length / 1.37 / 1024)}KB` : '无'
    });
    
    // 验证必要的字段
    if (!req.body.coverImageBase64 || !req.body.coverImageType || !req.body.coverImageName) {
      return res.status(400).json({ 
        message: '缺少必要的图片数据',
        detail: '请提供coverImageBase64, coverImageType和coverImageName字段'
      });
    }

    // 验证图片类型
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(req.body.coverImageType)) {
      return res.status(415).json({ 
        message: '不支持的图片类型',
        detail: '仅支持JPG和PNG格式的图片'
      });
    }

    // 解析Base64数据并保存为文件
    let base64Data = req.body.coverImageBase64;
    
    // 检查是否包含Data URL前缀，如果有则移除
    if (base64Data.includes('base64,')) {
      base64Data = base64Data.split('base64,')[1];
    }
    
    // 验证Base64数据有效性
    try {
      const imageBuffer = Buffer.from(base64Data, 'base64');
      
      // 验证图片大小
      if (imageBuffer.length > 25 * 1024 * 1024) { // 25MB限制
        return res.status(413).json({ 
          message: '图片大小超过限制',
          detail: '图片不能超过25MB'
        });
      }
      
      // 创建文件名
      const timestamp = Date.now();
      const uuid = uuidv4().substring(0, 8);
      const fileExt = path.extname(req.body.coverImageName) || '.jpg';
      const fileName = `image_${timestamp}_${uuid}${fileExt}`;
      
      // 保存路径
      const uploadDir = path.join(__dirname, '../../uploads/images');
      const filePath = path.join(uploadDir, fileName);
      
      // 确保目录存在
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      
      // 写入文件
      fs.writeFileSync(filePath, imageBuffer);
      
      console.log('Base64图片已保存:', {
        fileName,
        size: imageBuffer.length,
        type: req.body.coverImageType
      });
      
      // 解析发行日期
      let releaseDate;
      try {
        releaseDate = req.body.releaseDate instanceof Date 
          ? req.body.releaseDate 
          : new Date(req.body.releaseDate);
        
        if (isNaN(releaseDate.getTime())) {
          return res.status(400).json({ message: '发行日期格式无效' });
        }
      } catch (error) {
        return res.status(400).json({ message: '发行日期格式无效' });
      }

      // 确保使用相对路径存储图片路径
      const relativePath = filePath.replace(/\\/g, '/');
      const normalizedPath = relativePath.includes('uploads/') 
        ? relativePath.substring(relativePath.indexOf('uploads/')) 
        : relativePath;

      // 处理表演者信息
      let performerIds = [];
      if (req.body.performerIds) {
        try {
          // 处理可能是字符串或数组的情况
          performerIds = typeof req.body.performerIds === 'string' 
            ? JSON.parse(req.body.performerIds) 
            : req.body.performerIds;
        } catch (e) {
          console.error('解析performerIds失败:', e);
          // 尝试作为逗号分隔的字符串处理
          performerIds = req.body.performerIds.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
        }
      }

      // 创建专辑记录
      const album = await Album.create({
        title: req.body.title,
        type: req.body.type,
        releaseDate: releaseDate,
        coverImage: normalizedPath,
        displayInfo: req.body.displayInfo,
        description: req.body.description,
        status: req.body.status || 'draft',
        submittedById: req.user.id,
        performer: req.body.performer,
        performerIds: req.body.performerIds, // 确保保存performerIds字段
        comment: 'DRAFT: 尚未提交审核'  // 添加草稿标记
      });

      // 如果有表演者ID，建立关联
      if (performerIds && performerIds.length > 0) {
        try {
          // 验证表演者ID是否存在
          const artists = await Artist.findAll({
            where: {
              id: {
                [Op.in]: performerIds
              }
            }
          });
          
          if (artists.length > 0) {
            await album.addArtists(artists);
            console.log(`已关联 ${artists.length} 个表演者到专辑`);
          }
        } catch (error) {
          console.error('关联表演者失败:', error);
          // 不影响专辑创建，继续执行
        }
      }

      // 创建缩略图
      try {
        await getThumbnailPath(normalizedPath);
        console.log('专辑封面缩略图已创建');
      } catch (thumbError) {
        console.error('创建缩略图失败:', thumbError);
        // 不影响专辑创建，继续执行
      }

      res.status(201).json(album);
    } catch (base64Error) {
      console.error('处理Base64数据失败:', base64Error);
      return res.status(400).json({ 
        message: 'Base64数据无效',
        detail: '无法解析提供的Base64图片数据'
      });
    }
  } catch (error) {
    console.error('Base64创建专辑错误:', error);
    res.status(500).json({ 
      message: '创建专辑失败', 
      detail: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 手动清理临时文件
router.post('/cleanup-temp', adminAuth, async (req, res) => {
  try {
    console.log('开始手动清理临时文件...');
    
    // 清理临时文件夹
    const tempDir = path.join(__dirname, '../../temp');
    
    if (fs.existsSync(tempDir)) {
      const files = fs.readdirSync(tempDir);
      console.log(`找到 ${files.length} 个临时文件`);
      
      let deletedCount = 0;
      
      for (const file of files) {
        try {
          const filePath = path.join(tempDir, file);
          fs.unlinkSync(filePath);
          deletedCount++;
        } catch (err) {
          console.error(`删除临时文件 ${file} 失败:`, err);
        }
      }
      
      console.log(`成功删除 ${deletedCount} 个临时文件`);
    } else {
      console.log('临时目录不存在');
    }
    
    res.status(200).json({ 
      message: '临时文件清理完成',
      deletedCount: deletedCount || 0
    });
  } catch (error) {
    console.error('清理临时文件失败:', error);
    res.status(500).json({ message: '清理临时文件失败', error: error.message });
  }
});

// 上传授权书文件 - Base64版本
router.post('/:id/authorization-base64', auth, async (req, res) => {
  try {
    const albumId = parseInt(req.params.id, 10);
    const { base64Data, fileName } = req.body;
    
    console.log('收到Base64授权书上传请求，请求体:', {
      hasBase64Data: !!base64Data,
      base64DataLength: base64Data ? base64Data.length : 0,
      fileName: fileName || '未提供'
    });
    
    if (isNaN(albumId) || !base64Data || !fileName) {
      return res.status(400).json({ 
        success: false,
        message: '请求参数不完整', 
        detail: '需要提供有效的专辑ID、文件名和base64编码的文件数据'
      });
    }
    
    console.log(`处理Base64授权书上传请求，专辑ID: ${albumId}, 文件名: ${fileName}`);
    
    // 检查用户权限
    const isAdmin = req.user.role === 'admin';
    const whereCondition = { id: albumId };
    if (!isAdmin) {
      whereCondition.submittedById = req.user.id;
    }
    
    const album = await Album.findOne({ where: whereCondition });
    if (!album) {
      return res.status(404).json({
        success: false,
        message: '专辑不存在或无权限'
      });
    }
    
    // 创建目录
    const authDir = path.join(__dirname, '../../uploads/authorizations');
    if (!fs.existsSync(authDir)) {
      fs.mkdirSync(authDir, { recursive: true });
    }
    
    // 生成文件名和路径
    const timestamp = Date.now();
    const sanitizedTitle = album.title.replace(/[^a-zA-Z0-9]/g, '_');
    const fileExt = path.extname(fileName) || '.pdf';
    const newFileName = `authorization_${sanitizedTitle}_${timestamp}${fileExt}`;
    const filePath = path.join(authDir, newFileName);
    
    // 解码Base64并写入文件
    const fileBuffer = Buffer.from(base64Data, 'base64');
    await promisify(fs.writeFile)(filePath, fileBuffer);
    console.log('授权书文件已保存:', filePath);
    
    // 如果已有授权书，删除旧文件
    if (album.authorizationFile) {
      try {
        const oldFilePath = path.join(__dirname, '../../', album.authorizationFile);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
          console.log('已删除旧的授权书文件:', oldFilePath);
          
          // 同时删除旧的签名文件
          const oldSignatureFilePath = `${oldFilePath}.sig`;
          if (fs.existsSync(oldSignatureFilePath)) {
            fs.unlinkSync(oldSignatureFilePath);
            console.log('已删除旧的授权书签名文件:', oldSignatureFilePath);
          }
        }
      } catch (error) {
        console.error('删除旧授权书文件失败:', error);
      }
    }
    
    // 构建相对路径
    let authFilePath = filePath;
    if (authFilePath.includes('uploads/authorizations/')) {
      authFilePath = authFilePath.substring(authFilePath.indexOf('uploads/authorizations/'));
    } else {
      authFilePath = `uploads/authorizations/${newFileName}`;
    }
    
    // 更新专辑
    await album.update({ authorizationFile: authFilePath });
    console.log('专辑授权书路径已更新:', authFilePath);
    
    // 生成数字签名
    try {
      const fileHash = await require('../utils/authorizationService').generateFileHash(filePath);
      const signature = require('../utils/authorizationService').signFile(fileHash);
      
      // 保存签名到单独的文件
      const signatureFilePath = `${filePath}.sig`;
      await promisify(fs.writeFile)(signatureFilePath, signature);
      console.log('授权书数字签名生成成功，文件路径:', `${signatureFilePath}`);
      
      // 确保签名文件可访问
      const signatureExists = fs.existsSync(signatureFilePath);
      console.log('签名文件是否存在:', signatureExists);
      
      // 验证签名
      const verificationResult = await verifyAuthorizationSignature(albumId);
      console.log('授权书签名验证结果:', verificationResult);
      
      return res.status(200).json({
        success: true,
        message: '授权书上传成功',
        authorizationFile: authFilePath,
        fileName: newFileName,
        signatureVerification: verificationResult
      });
    } catch (signError) {
      console.error('生成授权书数字签名失败:', signError);
      
      return res.status(200).json({
        success: true,
        message: '授权书上传成功，但数字签名生成失败',
        authorizationFile: authFilePath,
        fileName: newFileName,
        signatureError: signError.message
      });
    }
  } catch (error) {
    console.error('Base64授权书上传失败:', error);
    return res.status(500).json({
      success: false,
      message: `上传授权书失败: ${error.message}`
    });
  }
});

// 使用Base64添加歌曲到专辑
router.post('/:id/songs-base64', auth, async (req, res) => {
  try {
    console.log('开始处理Base64歌曲上传请求:', {
      albumId: req.params.id,
      hasTitle: !!req.body.title,
      hasGenre: !!req.body.genre,
      hasLanguage: !!req.body.language,
      hasFileName: !!req.body.fileName,
      hasFileData: !!req.body.fileData,
      fileDataLength: req.body.fileData ? req.body.fileData.length : 0
    });

    // 确保 albumId 是整数
    const albumId = parseInt(req.params.id, 10);
    if (isNaN(albumId)) {
      return res.status(400).json({ message: '专辑ID无效' });
    }

    const album = await Album.findOne({
      where: {
        id: albumId,
        submittedById: req.user.id
      }
    });

    if (!album) {
      return res.status(404).json({ message: '专辑不存在或无权限' });
    }

    // 验证必填字段
    const requiredFields = ['title', 'genre', 'language', 'fileName', 'fileType', 'fileData'];
    const missingFields = requiredFields.filter(field => !req.body[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({ 
        message: `缺少必填字段: ${missingFields.join(', ')}` 
      });
    }

    if (!req.body.artists) {
      return res.status(400).json({ message: '请提供歌手信息' });
    }

    // 解析歌手信息
    let artists;
    try {
      artists = typeof req.body.artists === 'string' ? JSON.parse(req.body.artists) : req.body.artists;
      console.log('解析的歌手信息:', artists);
    } catch (error) {
      return res.status(400).json({ message: '歌手信息格式无效' });
    }

    // 确保音频目录存在
    const audioDir = path.join(__dirname, '../../uploads/audio');
    if (!fs.existsSync(audioDir)) {
      fs.mkdirSync(audioDir, { recursive: true });
    }

    // 创建歌手名称字符串，用于文件命名
    const artistNames = artists.map(artist => artist.name).join('&');

    // 生成文件名和路径
    const originalFileName = req.body.fileName;
    const fileExt = path.extname(originalFileName) || '.wav';
    const timestamp = Date.now();
    const uuid = require('uuid').v4().substring(0, 8);
    
    // 使用"专辑名-歌曲名-歌手名"格式
    const sanitizedAlbumTitle = album.title.replace(/[\\/:*?"<>|]/g, '_').trim();
    const sanitizedSongTitle = req.body.title.replace(/[\\/:*?"<>|]/g, '_').trim();
    const sanitizedArtistNames = artistNames.replace(/[\\/:*?"<>|]/g, '_').trim();
    
    const fileName = `${sanitizedAlbumTitle}-${sanitizedSongTitle}-${sanitizedArtistNames}-${timestamp}-${uuid}${fileExt}`;
    const filePath = path.join(audioDir, fileName);
    
    console.log('准备保存Base64音频文件:', {
      path: filePath,
      size: Math.round(req.body.fileData.length * 0.75) // Base64编码大约比原始数据大1/3
    });
    
    // 将Base64数据写入文件
    try {
      const buffer = Buffer.from(req.body.fileData, 'base64');
      fs.writeFileSync(filePath, buffer);
      console.log('Base64音频文件已保存');
    } catch (writeError) {
      console.error('保存Base64音频文件失败:', writeError);
      return res.status(500).json({ 
        message: '保存音频文件失败',
        detail: writeError.message
      });
    }
    
    // 获取相对路径用于存储到数据库
    let wavFilePath = filePath.replace(/\\/g, '/');
    if (wavFilePath.includes('uploads/audio/')) {
      wavFilePath = wavFilePath.substring(wavFilePath.indexOf('uploads/audio/'));
    } else {
      wavFilePath = `uploads/audio/${fileName}`;
    }
    
    // 处理歌词文件（如果有）
    let lyricsFilePath = null;
    if (req.body.lyricsFileData) {
      try {
        const lyricsDir = path.join(__dirname, '../../uploads/lyrics');
        if (!fs.existsSync(lyricsDir)) {
          fs.mkdirSync(lyricsDir, { recursive: true });
        }
        
        const lyricsFileName = `lyrics_${timestamp}_${uuid}.lrc`;
        const lyricsPath = path.join(lyricsDir, lyricsFileName);
        
        // 保存歌词文件
        const lyricsBuffer = Buffer.from(req.body.lyricsFileData, 'base64');
        fs.writeFileSync(lyricsPath, lyricsBuffer);
        
        // 获取相对路径
        lyricsFilePath = lyricsPath.replace(/\\/g, '/');
        if (lyricsFilePath.includes('uploads/lyrics/')) {
          lyricsFilePath = lyricsFilePath.substring(lyricsFilePath.indexOf('uploads/lyrics/'));
        } else {
          lyricsFilePath = `uploads/lyrics/${lyricsFileName}`;
        }
        
        console.log('歌词文件已保存:', lyricsFilePath);
      } catch (lyricsError) {
        console.error('保存歌词文件失败:', lyricsError);
        // 继续执行，不影响主流程
      }
    }
    
    // 处理翻译歌词文件（如果有）
    let translationLyricsFilePath = null;
    if (req.body.translationLyricsFileData) {
      try {
        const lyricsDir = path.join(__dirname, '../../uploads/lyrics');
        if (!fs.existsSync(lyricsDir)) {
          fs.mkdirSync(lyricsDir, { recursive: true });
        }
        
        const translationLyricsFileName = `translation_lyrics_${timestamp}_${uuid}.lrc`;
        const translationLyricsPath = path.join(lyricsDir, translationLyricsFileName);
        
        // 保存翻译歌词文件
        const translationLyricsBuffer = Buffer.from(req.body.translationLyricsFileData, 'base64');
        fs.writeFileSync(translationLyricsPath, translationLyricsBuffer);
        
        // 获取相对路径
        translationLyricsFilePath = translationLyricsPath.replace(/\\/g, '/');
        if (translationLyricsFilePath.includes('uploads/lyrics/')) {
          translationLyricsFilePath = translationLyricsFilePath.substring(translationLyricsFilePath.indexOf('uploads/lyrics/'));
        } else {
          translationLyricsFilePath = `uploads/lyrics/${translationLyricsFileName}`;
        }
        
        console.log('翻译歌词文件已保存:', translationLyricsFilePath);
      } catch (translationLyricsError) {
        console.error('保存翻译歌词文件失败:', translationLyricsError);
        // 继续执行，不影响主流程
      }
    }

    // 获取专辑中已有的歌曲数量，用于设置 trackNumber
    const existingSongs = await Song.count({ where: { albumId: albumId } });
    const trackNumber = existingSongs + 1;

    // 尝试获取音频文件时长
    let duration = null;
    try {
      // 获取音频文件的完整路径
      const fullWavPath = path.join(__dirname, '../../', wavFilePath);
      // 使用ffprobe获取真实的音频时长
      duration = await getAudioDuration(fullWavPath);
      console.log(`获取到音频文件时长: ${duration}秒`);
    } catch (err) {
      console.warn('无法获取音频时长:', err.message);
      // 如果获取失败，设置一个默认值
      duration = 0;
    }

    // 直接使用WAV文件路径，不再加密
    console.log('保存WAV文件路径:', wavFilePath);

    // 计算WAV文件的MD5值
    let md5Hash = null;
    if (wavFilePath) {
      try {
        const fullWavPath = path.join(__dirname, '../../', wavFilePath);
        md5Hash = await calculateFileMD5(fullWavPath);
        console.log('WAV文件MD5计算完成:', md5Hash);
      } catch (error) {
        console.error('计算WAV文件MD5失败:', error.message);
        // MD5计算失败不影响歌曲创建，继续执行
      }
    }

    const songData = {
      title: req.body.title,
      genre: req.body.genre,
      language: req.body.language,
      wavFile: wavFilePath,
      albumId: albumId,
      trackNumber: trackNumber,
      duration: duration,
      lyricsFile: lyricsFilePath,
      translationLyricsFile: translationLyricsFilePath,
      md5: md5Hash
    };

    console.log('准备创建歌曲记录:', songData);

    const song = await Song.create(songData);
    
    try {
      // 创建artistIds数组以保存有序的艺术家ID
      const artistIds = [];
      
      // 创建或查找艺人，并建立关联
      for (const artistData of artists) {
        if (!artistData.name) {
          throw new Error('歌手名称不能为空');
        }
        let [artist] = await Artist.findOrCreate({
          where: { name: artistData.name },
          defaults: {
            realName: artistData.realName,
            id_number: artistData.id_number || null,
            netease: artistData.platforms?.netease,
            qq: artistData.platforms?.qq,
            kugou: artistData.platforms?.kugou,
            kuwo: artistData.platforms?.kuwo,
            qishui: artistData.platforms?.qishui,
            spotify: artistData.platforms?.spotify,
            youtube: artistData.platforms?.youtube,
            appleMusic: artistData.platforms?.appleMusic,
            soundCloud: artistData.platforms?.soundCloud
          }
        });
        // 保持向后兼容，继续使用多对多关联
        await song.addArtist(artist);
        
        // 同时将艺术家ID添加到有序数组中
        artistIds.push(artist.id);
      }
      
      // 保存有序艺术家ID到artists字段
      await song.update({ artists: artistIds });

      // 检查歌曲是否成功保存并关联到专辑
      const savedSong = await Song.findByPk(song.id);
      console.log('保存的歌曲信息:', {
        id: savedSong.id,
        title: savedSong.title,
        albumId: savedSong.albumId,
        trackNumber: savedSong.trackNumber,
        duration: savedSong.duration
      });

      // 获取包含艺人信息的完整歌曲数据
      const populatedSong = await Song.findByPk(song.id, {
        include: [{
          model: Artist,
          as: 'Artists',
          through: { attributes: [] }
        }]
      });

      // 处理文件路径
      const processedSong = {
        ...populatedSong.toJSON(),
        wavFile: populatedSong.wavFile || null,
        Artists: populatedSong.Artists || []
      };
      
      console.log('歌曲创建成功:', processedSong);
      res.status(201).json(processedSong);
    } catch (error) {
      // 如果处理艺人信息时出错，删除已创建的歌曲
      await song.destroy();
      throw new Error('处理歌手信息时出错: ' + error.message);
    }
  } catch (error) {
    console.error('添加Base64歌曲错误:', error);
    res.status(400).json({ message: error.message });
  }
});

// 处理Base64分片上传
router.post('/:albumId/upload-chunk', auth, async (req, res) => {
  try {
    console.log('接收到分片上传请求:', {
      albumId: req.params.albumId,
      headers: {
        'x-file-id': req.headers['x-file-id'],
        'x-chunk-index': req.headers['x-chunk-index'],
        'x-total-chunks': req.headers['x-total-chunks'],
        'x-original-filename': req.headers['x-original-filename'],
        'content-type': req.headers['content-type'],
        'content-length': req.headers['content-length']
      }
    });

    // 检查是否有文件
    if (!req.files || !req.files.file) {
      console.error('未接收到文件数据');
      return res.status(400).json({ 
        message: '未接收到文件数据',
        detail: '请确保正确发送文件'
      });
    }

    // 从请求头获取参数
    const fileId = req.headers['x-file-id'];
    const chunkIndex = parseInt(req.headers['x-chunk-index'], 10);
    const totalChunks = parseInt(req.headers['x-total-chunks'], 10);
    const originalFileName = decodeURIComponent(req.headers['x-original-filename'] || '');
    
    // 检查参数是否存在
    if (!fileId) {
      console.error('缺少fileId参数:', req.headers);
      return res.status(400).json({
        message: '缺少fileId参数',
        detail: '需要提供x-file-id请求头'
      });
    }
    
    if (isNaN(chunkIndex)) {
      console.error('缺少或无效的chunkIndex参数:', req.headers);
      return res.status(400).json({
        message: '缺少或无效的chunkIndex参数',
        detail: '需要提供x-chunk-index请求头，且值必须是数字'
      });
    }
    
    if (isNaN(totalChunks)) {
      console.error('缺少或无效的totalChunks参数:', req.headers);
      return res.status(400).json({
        message: '缺少或无效的totalChunks参数',
        detail: '需要提供x-total-chunks请求头，且值必须是数字'
      });
    }

    console.log('分片上传参数验证通过:', {
      fileId,
      chunkIndex,
      totalChunks,
      originalFileName
    });

    // 验证是否存在该专辑且用户有权限
    const albumId = parseInt(req.params.albumId, 10);
    
    // 检查用户权限
    const isAdmin = req.user.role === 'admin';
    
    // 构建查询条件，管理员可以查询任何专辑，普通用户只能查询自己的专辑
    const whereCondition = {
      id: albumId
    };
    
    if (!isAdmin) {
      whereCondition.submittedById = req.user.id;
    }

    // 检查专辑是否存在且用户有权限
    const album = await Album.findOne({
      where: whereCondition
    });

    if (!album) {
      return res.status(404).json({ message: '专辑不存在或无权限' });
    }

    // 确保分片目录存在
    const chunksDir = path.join(__dirname, '../../uploads/chunks', fileId);
    if (!fs.existsSync(chunksDir)) {
      fs.mkdirSync(chunksDir, { recursive: true });
    }

    // 保存分片文件
    const chunkFile = req.files.file;
    const chunkPath = path.join(chunksDir, chunkIndex.toString());
    
    try {
      await chunkFile.mv(chunkPath);
      console.log(`成功保存分片 ${chunkIndex + 1}/${totalChunks}, 大小: ${chunkFile.size}字节, 路径: ${chunkPath}`);
    } catch (moveError) {
      console.error(`保存分片文件失败:`, moveError);
      return res.status(500).json({ 
        message: '保存分片文件失败',
        detail: moveError.message
      });
    }

    // 返回成功响应
    res.status(200).json({
      message: `分片 ${chunkIndex + 1}/${totalChunks} 上传成功`,
      chunkIndex: chunkIndex,
      fileId: fileId,
      completed: false
    });
  } catch (error) {
    console.error('处理分片上传错误:', error);
    res.status(500).json({
      message: '处理分片上传失败',
      error: error.message
    });
  }
});

// 合并上传的分片
router.post('/:albumId/merge-chunks', auth, async (req, res) => {
  try {
    console.log('接收到合并分片请求:', {
      albumId: req.params.albumId,
      fileId: req.body.fileId,
      totalChunks: req.body.totalChunks,
      filename: req.body.filename
    });

    // 验证必填字段
    const requiredFields = ['fileId', 'totalChunks', 'filename', 'title', 'genre', 'language', 'artists'];
    const missingFields = requiredFields.filter(field => !req.body[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({ 
        message: `缺少必填字段: ${missingFields.join(', ')}` 
      });
    }

    // 解析参数
    const fileId = req.body.fileId;
    const totalChunks = parseInt(req.body.totalChunks, 10);
    const originalFileName = req.body.filename;
    const albumId = parseInt(req.params.albumId, 10);
    
    // 解析歌手信息
    let artists;
    try {
      artists = typeof req.body.artists === 'string' ? JSON.parse(req.body.artists) : req.body.artists;
      console.log('解析的歌手信息:', artists);
    } catch (error) {
      return res.status(400).json({ message: '歌手信息格式无效' });
    }

    // 检查专辑是否存在且用户有权限
    const album = await Album.findOne({
      where: {
        id: albumId,
        submittedById: req.user.id
      }
    });

    if (!album) {
      return res.status(404).json({ message: '专辑不存在或无权限' });
    }

    // 检查所有分片是否存在
    const chunksDir = path.join(__dirname, '../../uploads/chunks', fileId);
    for (let i = 0; i < totalChunks; i++) {
      const chunkPath = path.join(chunksDir, i.toString());
      if (!fs.existsSync(chunkPath)) {
        return res.status(400).json({ 
          message: `分片 ${i + 1}/${totalChunks} 不存在，请重新上传` 
        });
      }
    }

    // 创建歌手名称字符串，用于文件命名
    const artistNames = artists.map(artist => artist.name).join('&');

    // 准备合并文件
    const fileExt = path.extname(originalFileName) || '.wav';
    const audioDir = path.join(__dirname, '../../uploads/audio');
    if (!fs.existsSync(audioDir)) {
      fs.mkdirSync(audioDir, { recursive: true });
    }

    // 使用"专辑名-歌曲名-歌手名"格式
    const timestamp = Date.now();
    const uuid = require('uuid').v4().substring(0, 8);
    const sanitizedAlbumTitle = album.title.replace(/[\\/:*?"<>|]/g, '_').trim();
    const sanitizedSongTitle = req.body.title.replace(/[\\/:*?"<>|]/g, '_').trim();
    const sanitizedArtistNames = artistNames.replace(/[\\/:*?"<>|]/g, '_').trim();
    
    const fileName = `${sanitizedAlbumTitle}-${sanitizedSongTitle}-${sanitizedArtistNames}-${timestamp}-${uuid}${fileExt}`;
    const filePath = path.join(audioDir, fileName);
    
    // 合并分片
    try {
      console.log('开始合并分片到文件:', filePath);
      
      // 创建写入流
      const writeStream = fs.createWriteStream(filePath);
      
      // 依次读取并写入每个分片
      for (let i = 0; i < totalChunks; i++) {
        const chunkPath = path.join(chunksDir, i.toString());
        try {
        const chunkData = fs.readFileSync(chunkPath);
        writeStream.write(chunkData);
          console.log(`成功写入分片 ${i + 1}/${totalChunks}`);
        } catch (readError) {
          console.error(`读取分片 ${i} 失败:`, readError);
          writeStream.end();
          return res.status(500).json({ 
            message: `读取分片 ${i + 1}/${totalChunks} 失败`,
            error: readError.message
          });
        }
      }
      
      // 关闭写入流
      writeStream.end();
      
      // 等待写入完成
      await new Promise((resolve, reject) => {
        writeStream.on('finish', resolve);
        writeStream.on('error', (err) => {
          console.error('写入流错误:', err);
          reject(err);
        });
      });
      
      console.log('Base64分片合并成功:', filePath);
      
      // 获取相对路径用于存储到数据库
      let wavFilePath = filePath.replace(/\\/g, '/');
      if (wavFilePath.includes('uploads/audio/')) {
        wavFilePath = wavFilePath.substring(wavFilePath.indexOf('uploads/audio/'));
      } else {
        wavFilePath = `uploads/audio/${fileName}`;
      }
      
      // 清理分片文件
      try {
        for (let i = 0; i < totalChunks; i++) {
          const chunkPath = path.join(chunksDir, i.toString());
          if (fs.existsSync(chunkPath)) {
          fs.unlinkSync(chunkPath);
          }
        }
        fs.rmdirSync(chunksDir);
        console.log('分片文件清理完成');
      } catch (cleanupError) {
        console.warn('清理分片文件失败:', cleanupError);
        // 继续执行，不影响主流程
      }
      
      // 获取专辑中已有的歌曲数量，用于设置 trackNumber
      const existingSongs = await Song.count({ where: { albumId: albumId } });
      const trackNumber = existingSongs + 1;

      // 尝试获取音频文件时长
      let duration = null;
      try {
        // 获取音频文件的完整路径
        const fullWavPath = path.join(__dirname, '../../', wavFilePath);
        // 使用ffprobe获取真实的音频时长
        duration = await getAudioDuration(fullWavPath);
        console.log(`获取到音频文件时长: ${duration}秒`);
      } catch (err) {
        console.warn('无法获取音频时长:', err.message);
        // 如果获取失败，设置一个默认值
        duration = 0;
      }

      // 加密WAV文件路径
      const encryptedFilePath = encryptFilePath(wavFilePath);
      console.log('WAV文件路径已加密:', {
        original: wavFilePath,
        encrypted: encryptedFilePath
      });

      // 处理歌词文件路径（如果有）
      let lyricsFilePath = null;
      if (req.body.lyricsFilePath) {
        lyricsFilePath = req.body.lyricsFilePath;
      }
      
      // 处理翻译歌词文件路径（如果有）
      let translationLyricsFilePath = null;
      if (req.body.translationLyricsFilePath) {
        translationLyricsFilePath = req.body.translationLyricsFilePath;
      }

      // 计算WAV文件的MD5值
      let md5Hash = null;
      if (wavFilePath) {
        try {
          const fullWavPath = path.join(__dirname, '../../', wavFilePath);
          md5Hash = await calculateFileMD5(fullWavPath);
          console.log('WAV文件MD5计算完成:', md5Hash);
        } catch (error) {
          console.error('计算WAV文件MD5失败:', error.message);
          // MD5计算失败不影响歌曲创建，继续执行
        }
      }

      const songData = {
        title: req.body.title,
        genre: req.body.genre,
        language: req.body.language,
        wavFile: wavFilePath,
        albumId: albumId,
        trackNumber: trackNumber,
        duration: duration,
        lyricsFile: lyricsFilePath,
        translationLyricsFile: translationLyricsFilePath,
        md5: md5Hash
      };

      console.log('准备创建歌曲记录:', songData);

      const song = await Song.create(songData);
      
      try {
        // 创建artistIds数组以保存有序的艺术家ID
        const artistIds = [];
        
        // 创建或查找艺人，并建立关联
        for (const artistData of artists) {
          if (!artistData.name) {
            throw new Error('歌手名称不能为空');
          }
          let [artist] = await Artist.findOrCreate({
            where: { name: artistData.name },
            defaults: {
              realName: artistData.realName,
              id_number: artistData.id_number || null,
              netease: artistData.platforms?.netease,
              qq: artistData.platforms?.qq,
              kugou: artistData.platforms?.kugou,
              kuwo: artistData.platforms?.kuwo,
              qishui: artistData.platforms?.qishui,
              spotify: artistData.platforms?.spotify,
              youtube: artistData.platforms?.youtube,
              appleMusic: artistData.platforms?.appleMusic,
              soundCloud: artistData.platforms?.soundCloud
            }
          });
          // 保持向后兼容，继续使用多对多关联
          await song.addArtist(artist);
          
          // 同时将艺术家ID添加到有序数组中
          artistIds.push(artist.id);
        }
        
        // 保存有序艺术家ID到artists字段
        await song.update({ artists: artistIds });

        // 检查歌曲是否成功保存并关联到专辑
        const savedSong = await Song.findByPk(song.id);
        console.log('保存的歌曲信息:', {
          id: savedSong.id,
          title: savedSong.title,
          albumId: savedSong.albumId,
          trackNumber: savedSong.trackNumber,
          duration: savedSong.duration
        });

        // 获取包含艺人信息的完整歌曲数据
        const populatedSong = await Song.findByPk(song.id, {
          include: [{
            model: Artist,
            as: 'Artists',
            through: { attributes: [] }
          }]
        });

        // 处理文件路径
        const processedSong = {
          ...populatedSong.toJSON(),
          wavFile: populatedSong.wavFile || null,
          Artists: populatedSong.Artists || []
        };
        
        console.log('歌曲创建成功:', processedSong);
        res.status(201).json(processedSong);
      } catch (error) {
        // 如果处理艺人信息时出错，删除已创建的歌曲
        await song.destroy();
        throw new Error('处理歌手信息时出错: ' + error.message);
      }
    } catch (mergeError) {
      console.error('合并分片错误:', mergeError);
      return res.status(500).json({ 
        message: '合并分片失败',
        detail: mergeError.message
      });
    }
  } catch (error) {
    console.error('处理合并分片请求错误:', error);
    res.status(500).json({
      message: '处理合并分片请求失败',
      error: error.message
    });
  }
});

// 处理Base64编码的歌词文件上传
router.post('/:albumId/lyrics-upload-base64', auth, async (req, res) => {
  try {
    console.log('开始处理Base64歌词文件上传请求:', {
      albumId: req.params.albumId,
      hasFileName: !!req.body.fileName,
      hasFileData: !!req.body.fileData,
      fileDataLength: req.body.fileData ? req.body.fileData.length : 0
    });

    // 验证必填字段
    const requiredFields = ['fileName', 'fileData'];
    const missingFields = requiredFields.filter(field => !req.body[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({ 
        message: `缺少必填字段: ${missingFields.join(', ')}` 
      });
    }

    // 确保目录存在
    const lyricsDir = path.join(__dirname, '../../uploads/lyrics');
    if (!fs.existsSync(lyricsDir)) {
      fs.mkdirSync(lyricsDir, { recursive: true });
    }

    // 生成文件名和路径
    const originalFileName = decodeURIComponent(req.body.fileName);
    const fileExt = path.extname(originalFileName) || '.lrc';
    const timestamp = Date.now();
    const uuid = require('uuid').v4().substring(0, 8);
    const fileName = `lyrics_${timestamp}_${uuid}${fileExt}`;
    const filePath = path.join(lyricsDir, fileName);
    
    console.log('准备保存Base64歌词文件:', {
      path: filePath,
      size: Math.round(req.body.fileData.length * 0.75) // Base64编码大约比原始数据大1/3
    });
    
    // 将Base64数据写入文件
    try {
      const buffer = Buffer.from(req.body.fileData, 'base64');
      fs.writeFileSync(filePath, buffer);
      console.log('Base64歌词文件已保存');
    } catch (writeError) {
      console.error('保存Base64歌词文件失败:', writeError);
      return res.status(500).json({ 
        message: '保存歌词文件失败',
        detail: writeError.message
      });
    }
    
    // 获取相对路径用于存储到数据库
    let lyricsFilePath = filePath.replace(/\\/g, '/');
    if (lyricsFilePath.includes('uploads/lyrics/')) {
      lyricsFilePath = lyricsFilePath.substring(lyricsFilePath.indexOf('uploads/lyrics/'));
    } else {
      lyricsFilePath = `uploads/lyrics/${fileName}`;
    }
    
    res.status(200).json({
      message: '歌词文件上传成功',
      path: lyricsFilePath
    });
  } catch (error) {
    console.error('处理Base64歌词文件上传错误:', error);
    res.status(500).json({
      message: '处理Base64歌词文件上传失败',
      error: error.message
    });
  }
});

// 处理Base64编码的翻译歌词文件上传
router.post('/:albumId/translation-lyrics-upload-base64', auth, async (req, res) => {
  try {
    console.log('开始处理Base64翻译歌词文件上传请求:', {
      albumId: req.params.albumId,
      hasFileName: !!req.body.fileName,
      hasFileData: !!req.body.fileData,
      fileDataLength: req.body.fileData ? req.body.fileData.length : 0
    });

    // 验证必填字段
    const requiredFields = ['fileName', 'fileData'];
    const missingFields = requiredFields.filter(field => !req.body[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({ 
        message: `缺少必填字段: ${missingFields.join(', ')}` 
      });
    }

    // 确保目录存在
    const lyricsDir = path.join(__dirname, '../../uploads/lyrics');
    if (!fs.existsSync(lyricsDir)) {
      fs.mkdirSync(lyricsDir, { recursive: true });
    }

    // 生成文件名和路径
    const originalFileName = decodeURIComponent(req.body.fileName);
    const fileExt = path.extname(originalFileName) || '.lrc';
    const timestamp = Date.now();
    const uuid = require('uuid').v4().substring(0, 8);
    const fileName = `translation_lyrics_${timestamp}_${uuid}${fileExt}`;
    const filePath = path.join(lyricsDir, fileName);
    
    console.log('准备保存Base64翻译歌词文件:', {
      path: filePath,
      size: Math.round(req.body.fileData.length * 0.75) // Base64编码大约比原始数据大1/3
    });
    
    // 将Base64数据写入文件
    try {
      const buffer = Buffer.from(req.body.fileData, 'base64');
      fs.writeFileSync(filePath, buffer);
      console.log('Base64翻译歌词文件已保存');
    } catch (writeError) {
      console.error('保存Base64翻译歌词文件失败:', writeError);
      return res.status(500).json({ 
        message: '保存翻译歌词文件失败',
        detail: writeError.message
      });
    }
    
    // 获取相对路径用于存储到数据库
    let translationLyricsFilePath = filePath.replace(/\\/g, '/');
    if (translationLyricsFilePath.includes('uploads/lyrics/')) {
      translationLyricsFilePath = translationLyricsFilePath.substring(translationLyricsFilePath.indexOf('uploads/lyrics/'));
    } else {
      translationLyricsFilePath = `uploads/lyrics/${fileName}`;
    }
    
    res.status(200).json({
      message: '翻译歌词文件上传成功',
      path: translationLyricsFilePath
    });
  } catch (error) {
    console.error('处理Base64翻译歌词文件上传错误:', error);
    res.status(500).json({
      message: '处理Base64翻译歌词文件上传失败',
      error: error.message
    });
  }
});

// 使用Base64上传授权书
router.post('/:id/authorization-base64', auth, async (req, res) => {
  try {
    console.log('开始处理Base64授权书上传请求:', {
      albumId: req.params.id,
      hasFileName: !!req.body.fileName,
      hasFileData: !!req.body.fileData,
      fileDataLength: req.body.fileData ? req.body.fileData.length : 0
    });

    // 验证必填字段
    const requiredFields = ['fileName', 'fileType', 'fileData'];
    const missingFields = requiredFields.filter(field => !req.body[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({ 
        message: `缺少必填字段: ${missingFields.join(', ')}` 
      });
    }

    // 确保 albumId 是整数
    const albumId = parseInt(req.params.id, 10);
    if (isNaN(albumId)) {
      return res.status(400).json({ message: '专辑ID无效' });
    }

    // 检查专辑是否存在且用户有权限
    const album = await Album.findOne({
      where: {
        id: albumId,
        submittedById: req.user.id
      }
    });

    if (!album) {
      return res.status(404).json({ message: '专辑不存在或无权限' });
    }

    // 确保目录存在
    const authDir = path.join(__dirname, '../../uploads/authorizations');
    if (!fs.existsSync(authDir)) {
      fs.mkdirSync(authDir, { recursive: true });
    }

    // 生成文件名和路径
    const originalFileName = req.body.fileName;
    const fileExt = path.extname(originalFileName) || '.pdf';
    const timestamp = Date.now();
    const uuid = require('uuid').v4().substring(0, 8);
    const fileName = `auth_${timestamp}_${uuid}${fileExt}`;
    const filePath = path.join(authDir, fileName);
    
    console.log('准备保存Base64授权书文件:', {
      path: filePath,
      size: Math.round(req.body.fileData.length * 0.75) // Base64编码大约比原始数据大1/3
    });
    
    // 将Base64数据写入文件
    try {
      const buffer = Buffer.from(req.body.fileData, 'base64');
      fs.writeFileSync(filePath, buffer);
      console.log('Base64授权书文件已保存');
    } catch (writeError) {
      console.error('保存Base64授权书文件失败:', writeError);
      return res.status(500).json({ 
        message: '保存授权书文件失败',
        detail: writeError.message
      });
    }
    
    // 获取相对路径用于存储到数据库
    let authFilePath = filePath.replace(/\\/g, '/');
    if (authFilePath.includes('uploads/authorizations/')) {
      authFilePath = authFilePath.substring(authFilePath.indexOf('uploads/authorizations/'));
    } else {
      authFilePath = `uploads/authorizations/${fileName}`;
    }
    
    // 更新专辑的授权书文件路径
    try {
      await album.update({ authorizationFile: authFilePath });
      console.log('专辑授权书路径已更新:', authFilePath);
    } catch (updateError) {
      console.error('更新专辑授权书路径失败:', updateError);
      return res.status(500).json({ 
        message: '更新专辑授权书路径失败',
        detail: updateError.message
      });
    }
    
    res.status(200).json({
      message: '授权书上传成功',
      path: authFilePath
    });
  } catch (error) {
    console.error('处理Base64授权书上传错误:', error);
    res.status(500).json({
      message: '处理Base64授权书上传失败',
      error: error.message
    });
  }
});

// 处理Base64分片上传
router.post('/:albumId/upload-chunk-base64', auth, express.json({limit: '50mb'}), async (req, res) => {
  try {
    // 打印完整的请求体，用于调试
    console.log('接收到Base64分片上传请求，完整请求体:', {
      albumId: req.params.albumId,
      bodyKeys: Object.keys(req.body),
      fileId: req.body.fileId,
      chunkIndex: req.body.chunkIndex,
      totalChunks: req.body.totalChunks,
      fileName: req.body.fileName,
      chunkDataExists: !!req.body.chunkData,
      chunkDataLength: req.body.chunkData ? req.body.chunkData.length : 0,
      contentType: req.headers['content-type']
    });

    console.log('接收到Base64分片上传请求:', {
      albumId: req.params.albumId,
      fileId: req.body.fileId,
      chunkIndex: req.body.chunkIndex,
      totalChunks: req.body.totalChunks,
      fileName: req.body.fileName,
      chunkDataLength: req.body.chunkData ? req.body.chunkData.length : 0
    });

    // 验证必填字段
    const requiredFields = ['fileId', 'chunkIndex', 'totalChunks', 'fileName', 'chunkData'];
    const missingFields = requiredFields.filter(field => {
      const exists = req.body[field] !== undefined;
      console.log(`检查字段 ${field}: ${exists ? '存在' : '不存在'}`);
      return !exists;
    });
    
    if (missingFields.length > 0) {
      console.error('缺少必填字段:', {
        missingFields,
        receivedFields: Object.keys(req.body)
      });
      return res.status(400).json({ 
        message: `缺少必填字段: ${missingFields.join(', ')}` 
      });
    }

    // 解析参数
    const fileId = req.body.fileId;
    const chunkIndex = parseInt(req.body.chunkIndex, 10);
    const totalChunks = parseInt(req.body.totalChunks, 10);
    const fileName = req.body.fileName;
    const albumId = parseInt(req.params.albumId, 10);
    
    // 检查参数是否有效
    if (isNaN(chunkIndex) || chunkIndex < 0) {
      return res.status(400).json({
        message: '无效的chunkIndex参数',
        detail: 'chunkIndex必须是非负整数'
      });
    }
    
    if (isNaN(totalChunks) || totalChunks <= 0) {
      return res.status(400).json({
        message: '无效的totalChunks参数',
        detail: 'totalChunks必须是正整数'
      });
    }
    
    if (isNaN(albumId)) {
      return res.status(400).json({
        message: '无效的albumId参数',
        detail: 'albumId必须是整数'
      });
    }

    // 检查用户权限
    const isAdmin = req.user.role === 'admin';
    
    // 构建查询条件，管理员可以查询任何专辑，普通用户只能查询自己的专辑
    const whereCondition = {
      id: albumId
    };
    
    if (!isAdmin) {
      whereCondition.submittedById = req.user.id;
    }

    // 检查专辑是否存在且用户有权限
    const album = await Album.findOne({
      where: whereCondition
    });

    if (!album) {
      return res.status(404).json({ message: '专辑不存在或无权限' });
    }

    // 确保分片目录存在
    const chunksDir = path.join(__dirname, '../../uploads/chunks', fileId);
    if (!fs.existsSync(chunksDir)) {
      fs.mkdirSync(chunksDir, { recursive: true });
    }

    // 将Base64数据保存为文件
    const chunkPath = path.join(chunksDir, chunkIndex.toString());
    
    try {
      const buffer = Buffer.from(req.body.chunkData, 'base64');
      fs.writeFileSync(chunkPath, buffer);
      console.log(`成功保存Base64分片 ${chunkIndex + 1}/${totalChunks}, 大小: ${buffer.length}字节, 路径: ${chunkPath}`);
    } catch (writeError) {
      console.error(`保存Base64分片文件失败:`, writeError);
      return res.status(500).json({ 
        message: '保存分片文件失败',
        detail: writeError.message
      });
    }

    // 返回成功响应
    res.status(200).json({
      message: `分片 ${chunkIndex + 1}/${totalChunks} 上传成功`,
      chunkIndex: chunkIndex,
      fileId: fileId,
      completed: false
    });
  } catch (error) {
    console.error('处理Base64分片上传错误:', error);
    res.status(500).json({
      message: '处理Base64分片上传失败',
      error: error.message
    });
  }
});

// 合并Base64上传的分片
router.post('/:albumId/merge-chunks-base64', auth, async (req, res) => {
  try {
    console.log('接收到合并Base64分片请求:', {
      albumId: req.params.albumId,
      fileId: req.body.fileId,
      totalChunks: req.body.totalChunks,
      filename: req.body.filename
    });

    // 验证必填字段
    const requiredFields = ['fileId', 'totalChunks', 'filename', 'title', 'genre', 'language', 'artists'];
    const missingFields = requiredFields.filter(field => !req.body[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({ 
        message: `缺少必填字段: ${missingFields.join(', ')}` 
      });
    }

    // 解析参数
    const fileId = req.body.fileId;
    const totalChunks = parseInt(req.body.totalChunks, 10);
    const originalFileName = req.body.filename;
    const albumId = parseInt(req.params.albumId, 10);
    
    // 解析歌手信息
    let artists;
    try {
      if (typeof req.body.artists === 'string') {
        artists = JSON.parse(req.body.artists);
      } else if (Array.isArray(req.body.artists)) {
        artists = req.body.artists;
      } else {
        throw new Error('歌手信息必须是数组或JSON字符串');
      }
      
      // 验证歌手数组格式
      if (!Array.isArray(artists) || artists.length === 0) {
        throw new Error('歌手信息必须是非空数组');
      }
      
      // 确保每个歌手对象至少有id和name字段
      artists = artists.map(artist => {
        // 如果artist是数字，转换为对象
        if (typeof artist === 'number') {
          return { id: artist, name: `歌手#${artist}` };
        }
        
        // 如果artist是字符串，尝试解析为数字ID
        if (typeof artist === 'string') {
          const artistId = parseInt(artist, 10);
          if (!isNaN(artistId)) {
            return { id: artistId, name: `歌手#${artistId}` };
          }
          // 如果不是数字，可能是直接传入的名字
          return { name: artist };
        }
        
        // 确保artist对象有name字段
        if (!artist.name) {
          artist.name = artist.id ? `歌手#${artist.id}` : '未知歌手';
        }
        
        return artist;
      });
      
      console.log('解析的歌手信息:', JSON.stringify(artists));
    } catch (error) {
      console.error('解析歌手信息失败:', error);
      return res.status(400).json({ 
        message: '歌手信息格式无效', 
        error: error.message 
      });
    }

    // 检查专辑是否存在且用户有权限
    let whereCondition = { id: albumId };
    
    // 如果不是管理员，则添加提交者ID限制
    if (req.user.role !== 'admin') {
      whereCondition.submittedById = req.user.id;
    }
    
    const album = await Album.findOne({
      where: whereCondition
    });

    if (!album) {
      return res.status(404).json({ message: '专辑不存在或无权限' });
    }

    // 检查所有分片是否存在
    const chunksDir = path.join(__dirname, '../../uploads/chunks', fileId);
    if (!fs.existsSync(chunksDir)) {
      return res.status(400).json({ message: '分片目录不存在，请重新上传' });
    }
    
    // 确保分片目录存在
    try {
      fs.mkdirSync(chunksDir, { recursive: true });
    } catch (err) {
      // 如果目录已存在，忽略错误
      if (err.code !== 'EEXIST') {
        console.error('创建分片目录失败:', err);
      }
    }
    
    // 检查所有分片
    const missingChunks = [];
    for (let i = 0; i < totalChunks; i++) {
      const chunkPath = path.join(chunksDir, i.toString());
      if (!fs.existsSync(chunkPath)) {
        missingChunks.push(i);
      }
    }
    
    if (missingChunks.length > 0) {
        return res.status(400).json({ 
        message: `缺少分片: ${missingChunks.join(', ')}，请重新上传` 
        });
    }

    // 创建歌手名称字符串，用于文件命名
    const artistNames = artists.map(artist => artist.name || `歌手#${artist.id || '未知'}`).join('&');

    // 准备合并文件
    const fileExt = path.extname(originalFileName) || '.wav';
    const audioDir = path.join(__dirname, '../../uploads/audio');
    if (!fs.existsSync(audioDir)) {
      fs.mkdirSync(audioDir, { recursive: true });
    }

    // 使用"专辑名-歌曲名-歌手名"格式
    const timestamp = Date.now();
    const uuid = require('uuid').v4().substring(0, 8);
    const sanitizedAlbumTitle = album.title.replace(/[\\/:*?"<>|]/g, '_').trim();
    const sanitizedSongTitle = req.body.title.replace(/[\\/:*?"<>|]/g, '_').trim();
    const sanitizedArtistNames = artistNames.replace(/[\\/:*?"<>|]/g, '_').trim();
    
    const fileName = `${sanitizedAlbumTitle}-${sanitizedSongTitle}-${sanitizedArtistNames}-${timestamp}-${uuid}${fileExt}`;
    const filePath = path.join(audioDir, fileName);
    
    // 合并分片
    try {
      console.log('开始合并分片到文件:', filePath);
      
      // 创建写入流
      const writeStream = fs.createWriteStream(filePath);
      
      // 依次读取并写入每个分片
      for (let i = 0; i < totalChunks; i++) {
        const chunkPath = path.join(chunksDir, i.toString());
        try {
        const chunkData = fs.readFileSync(chunkPath);
        writeStream.write(chunkData);
          console.log(`成功写入分片 ${i + 1}/${totalChunks}`);
        } catch (readError) {
          console.error(`读取分片 ${i} 失败:`, readError);
          writeStream.end();
          return res.status(500).json({ 
            message: `读取分片 ${i + 1}/${totalChunks} 失败`,
            error: readError.message
          });
        }
      }
      
      // 关闭写入流
      writeStream.end();
      
      // 等待写入完成
      await new Promise((resolve, reject) => {
        writeStream.on('finish', resolve);
        writeStream.on('error', (err) => {
          console.error('写入流错误:', err);
          reject(err);
        });
      });
      
      console.log('Base64分片合并成功:', filePath);
      
      // 获取相对路径用于存储到数据库
      let wavFilePath = filePath.replace(/\\/g, '/');
      if (wavFilePath.includes('uploads/audio/')) {
        wavFilePath = wavFilePath.substring(wavFilePath.indexOf('uploads/audio/'));
      } else {
        wavFilePath = `uploads/audio/${fileName}`;
      }
      
      // 清理分片文件
      try {
        for (let i = 0; i < totalChunks; i++) {
          const chunkPath = path.join(chunksDir, i.toString());
          if (fs.existsSync(chunkPath)) {
          fs.unlinkSync(chunkPath);
        }
        }
        if (fs.existsSync(chunksDir)) {
        fs.rmdirSync(chunksDir);
        }
        console.log('分片文件清理完成');
      } catch (cleanupError) {
        console.warn('清理分片文件失败:', cleanupError);
        // 继续执行，不影响主流程
      }
      
      // 获取专辑中已有的歌曲数量，用于设置 trackNumber
      const existingSongs = await Song.count({ where: { albumId: albumId } });
      const trackNumber = existingSongs + 1;

      // 尝试获取音频文件时长
      let duration = null;
      try {
        // 获取音频文件的完整路径
        const fullWavPath = path.join(__dirname, '../../', wavFilePath);
        // 使用ffprobe获取真实的音频时长
        duration = await getAudioDuration(fullWavPath);
        console.log(`获取到音频文件时长: ${duration}秒`);
      } catch (err) {
        console.warn('无法获取音频时长:', err.message);
        // 如果获取失败，设置一个默认值
        duration = 0;
      }

      // 加密WAV文件路径
      const encryptedFilePath = encryptFilePath(wavFilePath);
      console.log('WAV文件路径已加密:', {
        original: wavFilePath,
        encrypted: encryptedFilePath
      });

      // 处理歌词文件路径（如果有）
      let lyricsFilePath = null;
      if (req.body.lyricsFilePath) {
        lyricsFilePath = req.body.lyricsFilePath;
      }
      
      // 处理翻译歌词文件路径（如果有）
      let translationLyricsFilePath = null;
      if (req.body.translationLyricsFilePath) {
        translationLyricsFilePath = req.body.translationLyricsFilePath;
      }

      // 计算WAV文件的MD5值
      let md5Hash = null;
      if (wavFilePath) {
        try {
          const fullWavPath = path.join(__dirname, '../../', wavFilePath);
          md5Hash = await calculateFileMD5(fullWavPath);
          console.log('WAV文件MD5计算完成:', md5Hash);
        } catch (error) {
          console.error('计算WAV文件MD5失败:', error.message);
          // MD5计算失败不影响歌曲创建，继续执行
        }
      }

      const songData = {
        title: req.body.title,
        genre: req.body.genre,
        language: req.body.language,
        wavFile: wavFilePath,
        albumId: albumId,
        trackNumber: trackNumber,
        duration: duration,
        lyricsFile: lyricsFilePath,
        translationLyricsFile: translationLyricsFilePath,
        md5: md5Hash
      };

      console.log('准备创建歌曲记录:', songData);

      // 使用事务确保数据一致性
      let song, artistIds = [];
      
      try {
        // 开始事务
        await sequelize.transaction(async (t) => {
          // 创建歌曲记录
          song = await Song.create(songData, { transaction: t });
          console.log('歌曲记录创建成功，ID:', song.id);
      
        // 创建artistIds数组以保存有序的艺术家ID
          artistIds = [];
        
        // 创建或查找艺人，并建立关联
        for (const artistData of artists) {
            try {
          if (!artistData.name) {
                console.warn('歌手名称为空，跳过:', artistData);
                continue;
              }
              
              let artist;
              // 如果提供了ID，尝试查找现有歌手
              if (artistData.id) {
                artist = await Artist.findByPk(artistData.id, { transaction: t });
              }
              
              // 如果未找到或未提供ID，则按名称查找或创建
              if (!artist) {
                [artist] = await Artist.findOrCreate({
            where: { name: artistData.name },
            defaults: {
                    realName: artistData.realName || '',
                    id_number: artistData.id_number || null
                  },
                  transaction: t
                });
              }
              
              // 将歌手ID添加到有序数组
          artistIds.push(artist.id);
              
              // 创建歌曲-歌手关联
              await song.addArtist(artist, { transaction: t });
              
              console.log(`已关联歌手 "${artist.name}" (ID: ${artist.id}) 到歌曲 "${song.title}" (ID: ${song.id})`);
            } catch (artistError) {
              console.error('处理歌手关联时出错:', artistError);
              throw new Error(`处理歌手 "${artistData.name}" 时出错: ${artistError.message}`);
            }
          }
          
          // 保存歌手顺序
          if (artistIds.length > 0) {
            try {
              // 将artistIds数组保存为JSON字符串
              await song.update({
                artists: JSON.stringify(artistIds)
              }, { transaction: t });
        
              console.log('已保存歌手顺序:', artistIds);
            } catch (updateError) {
              console.error('保存歌手顺序失败:', updateError);
              // 继续执行，不中断事务
            }
          }
        });
        
        // 返回成功响应
        res.status(200).json({
          message: '文件上传成功',
          song: song,
          artistIds: artistIds
        });
      } catch (error) {
        console.error('事务执行失败:', error);
        throw error;
      }
    } catch (error) {
      console.error('合并分片失败:', error);
      
      // 尝试清理可能创建的不完整文件
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log('已删除不完整的合并文件');
      }
      } catch (cleanupError) {
        console.error('清理不完整文件失败:', cleanupError);
      }
      
      res.status(500).json({
        message: '合并分片失败',
        error: error.message
      });
    }
  } catch (error) {
    console.error('处理合并请求失败:', error);
    res.status(500).json({
      message: '处理合并请求失败',
      error: error.message
    });
  }
});

// 处理歌词文件Base64上传
router.post('/:albumId/lyrics-upload-base64', auth, async (req, res) => {
  try {
    console.log('接收到歌词文件Base64上传请求:', {
      albumId: req.params.albumId,
      fileName: req.body.fileName,
      fileSize: req.body.fileSize
    });

    // 验证必填字段
    const requiredFields = ['fileName', 'fileType', 'fileData'];
    const missingFields = requiredFields.filter(field => !req.body[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({ 
        message: `缺少必填字段: ${missingFields.join(', ')}` 
      });
    }

    // 解析参数
    const fileName = req.body.fileName;
    const fileType = req.body.fileType;
    const fileData = req.body.fileData;
    const albumId = parseInt(req.params.albumId, 10);
    
    // 检查专辑是否存在且用户有权限
    const album = await Album.findOne({
      where: {
        id: albumId,
        submittedById: req.user.id
      }
    });

    if (!album) {
      return res.status(404).json({ message: '专辑不存在或无权限' });
    }

    // 确保目录存在
    const lyricsDir = path.join(__dirname, '../../uploads/lyrics');
    if (!fs.existsSync(lyricsDir)) {
      fs.mkdirSync(lyricsDir, { recursive: true });
    }

    // 生成安全的文件名
    const timestamp = Date.now();
    const uuid = require('uuid').v4().substring(0, 8);
    const fileExt = path.extname(fileName) || '.lrc';
    const sanitizedFileName = `lyrics_${timestamp}_${uuid}${fileExt}`;
    const filePath = path.join(lyricsDir, sanitizedFileName);
    
    // 将Base64数据保存为文件
    try {
      const buffer = Buffer.from(fileData, 'base64');
      fs.writeFileSync(filePath, buffer);
      console.log(`成功保存歌词文件, 大小: ${buffer.length}字节, 路径: ${filePath}`);
    } catch (writeError) {
      console.error(`保存歌词文件失败:`, writeError);
      return res.status(500).json({ 
        message: '保存歌词文件失败',
        detail: writeError.message
      });
    }

    // 获取相对路径用于存储到数据库
    let lyricsFilePath = filePath.replace(/\\/g, '/');
    if (lyricsFilePath.includes('uploads/lyrics/')) {
      lyricsFilePath = lyricsFilePath.substring(lyricsFilePath.indexOf('uploads/lyrics/'));
    } else {
      lyricsFilePath = `uploads/lyrics/${sanitizedFileName}`;
    }

    // 返回成功响应
    res.status(200).json({
      message: '歌词文件上传成功',
      path: lyricsFilePath,
      fileName: sanitizedFileName
    });
  } catch (error) {
    console.error('处理歌词文件Base64上传错误:', error);
    res.status(500).json({
      message: '处理歌词文件Base64上传失败',
      error: error.message
    });
  }
});

// 处理翻译歌词文件Base64上传
router.post('/:albumId/translation-lyrics-upload-base64', auth, async (req, res) => {
  try {
    console.log('接收到翻译歌词文件Base64上传请求:', {
      albumId: req.params.albumId,
      fileName: req.body.fileName,
      fileSize: req.body.fileSize
    });

    // 验证必填字段
    const requiredFields = ['fileName', 'fileType', 'fileData'];
    const missingFields = requiredFields.filter(field => !req.body[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({ 
        message: `缺少必填字段: ${missingFields.join(', ')}` 
      });
    }

    // 解析参数
    const fileName = req.body.fileName;
    const fileType = req.body.fileType;
    const fileData = req.body.fileData;
    const albumId = parseInt(req.params.albumId, 10);
    
    // 检查专辑是否存在且用户有权限
    const album = await Album.findOne({
      where: {
        id: albumId,
        submittedById: req.user.id
      }
    });

    if (!album) {
      return res.status(404).json({ message: '专辑不存在或无权限' });
    }

    // 确保目录存在
    const lyricsDir = path.join(__dirname, '../../uploads/lyrics');
    if (!fs.existsSync(lyricsDir)) {
      fs.mkdirSync(lyricsDir, { recursive: true });
    }

    // 生成安全的文件名
    const timestamp = Date.now();
    const uuid = require('uuid').v4().substring(0, 8);
    const fileExt = path.extname(fileName) || '.lrc';
    const sanitizedFileName = `translation_lyrics_${timestamp}_${uuid}${fileExt}`;
    const filePath = path.join(lyricsDir, sanitizedFileName);
    
    // 将Base64数据保存为文件
    try {
      const buffer = Buffer.from(fileData, 'base64');
      fs.writeFileSync(filePath, buffer);
      console.log(`成功保存翻译歌词文件, 大小: ${buffer.length}字节, 路径: ${filePath}`);
    } catch (writeError) {
      console.error(`保存翻译歌词文件失败:`, writeError);
      return res.status(500).json({ 
        message: '保存翻译歌词文件失败',
        detail: writeError.message
      });
    }

    // 获取相对路径用于存储到数据库
    let translationLyricsFilePath = filePath.replace(/\\/g, '/');
    if (translationLyricsFilePath.includes('uploads/lyrics/')) {
      translationLyricsFilePath = translationLyricsFilePath.substring(translationLyricsFilePath.indexOf('uploads/lyrics/'));
    } else {
      translationLyricsFilePath = `uploads/lyrics/${sanitizedFileName}`;
    }

    // 返回成功响应
    res.status(200).json({
      message: '翻译歌词文件上传成功',
      path: translationLyricsFilePath,
      fileName: sanitizedFileName
    });
  } catch (error) {
    console.error('处理翻译歌词文件Base64上传错误:', error);
    res.status(500).json({
      message: '处理翻译歌词文件Base64上传失败',
      error: error.message
    });
  }
});

// 测试路由，用于验证请求体解析
router.post('/:albumId/test-json-body', auth, async (req, res) => {
  try {
    console.log('接收到测试请求:', {
      method: req.method,
      url: req.originalUrl,
      headers: req.headers,
      contentType: req.headers['content-type'],
      bodyKeys: Object.keys(req.body),
      body: req.body
    });
    
    res.status(200).json({
      message: '测试成功',
      receivedBody: {
        keys: Object.keys(req.body),
        values: Object.entries(req.body).map(([key, value]) => {
          if (key === 'chunkData' && typeof value === 'string') {
            return { key, type: typeof value, length: value.length };
          }
          return { key, value, type: typeof value };
        })
      }
    });
  } catch (error) {
    console.error('测试路由错误:', error);
    res.status(500).json({
      message: '测试失败',
      error: error.message
    });
  }
});

// 获取歌词文件内容 - 独立路由，不依赖专辑ID
router.get('/lyrics', async (req, res) => {
  try {
    const { path: lyricsPath } = req.query;
    
    if (!lyricsPath) {
      return res.status(400).json({
        message: '缺少必要参数',
        detail: '需要提供歌词文件路径'
      });
    }
    
    console.log('获取歌词文件内容，路径:', lyricsPath);
    
    // 检查文件是否存在
    let fullPath, filePath;
    
    try {
      // 尝试多种可能的路径格式
      const possiblePaths = [
        // 1. 直接使用提供的路径
        lyricsPath,
        // 2. 如果路径以uploads开头
        path.join(__dirname, '../../', lyricsPath),
        // 3. 如果路径不以uploads开头，添加uploads前缀
        path.join(__dirname, '../../uploads', lyricsPath),
        // 4. 尝试acmetone-backend/uploads/lyrics目录
        path.join(__dirname, '../../uploads/lyrics', path.basename(lyricsPath)),
        // 5. 尝试直接使用文件名
        path.join(__dirname, '../../acmetone-backend/uploads/lyrics', path.basename(lyricsPath))
      ];
      
      console.log('尝试以下可能的文件路径:', possiblePaths);
      
      // 尝试所有可能的路径
      let fileFound = false;
      for (const tryPath of possiblePaths) {
        if (fs.existsSync(tryPath)) {
          console.log('找到文件，路径:', tryPath);
          filePath = tryPath;
          fullPath = tryPath.includes('uploads/') ? 
            tryPath.substring(tryPath.indexOf('uploads/')) : 
            `uploads/lyrics/${path.basename(tryPath)}`;
          fileFound = true;
          break;
        }
      }
      
      // 如果所有路径都不存在
      if (!fileFound) {
        console.error('歌词文件不存在，尝试的路径:', possiblePaths);
        return res.status(404).json({
          message: '歌词文件不存在',
          detail: `文件路径: ${lyricsPath}`,
          triedPaths: possiblePaths
        });
      }
      
      // 读取文件内容
      console.log('准备读取文件:', filePath);
      const content = fs.readFileSync(filePath, 'utf-8');
      console.log('成功读取歌词文件，内容长度:', content.length);
      
      // 返回文件内容
      return res.json({
        success: true,
        content,
        path: fullPath
      });
    } catch (fsError) {
      console.error('文件系统操作失败:', fsError);
      return res.status(500).json({
        message: '文件系统操作失败',
        detail: fsError.message,
        stack: fsError.stack
      });
    }
  } catch (error) {
    console.error('获取歌词文件内容失败:', error);
    return res.status(500).json({
      message: '获取歌词文件内容失败',
      detail: error.message,
      stack: error.stack
    });
  }
});

// 提交专辑审核
router.post('/:id/submit', auth, async (req, res) => {
  try {
    const albumId = req.params.id;
    const userId = req.user.id;
    
    // 获取专辑信息
    const album = await Album.findByPk(albumId);
    
    // 检查专辑是否存在
    if (!album) {
      return res.status(404).json({ message: '专辑不存在' });
    }
    
    // 检查专辑是否属于当前用户
    if (album.submittedById !== userId) {
      return res.status(403).json({ message: '您没有权限提交此专辑' });
    }
    
    // 检查专辑当前状态
    // 如果状态是pending且不是草稿，则已经在审核中
    if (album.status === 'pending' && !album.comment?.includes('DRAFT')) {
      return res.status(400).json({ message: '专辑已经处于审核中状态' });
    }
    
    if (album.status === 'approved') {
      return res.status(400).json({ message: '专辑已经审核通过，无需重复提交' });
    }
    
    // 更新专辑状态为审核中
    await album.update({
      status: 'pending',
      comment: '已提交审核'
    });
    
    res.json({
      message: '专辑已成功提交审核',
      album: {
        id: album.id,
        title: album.title,
        status: album.status,
        comment: album.comment
      }
    });
  } catch (error) {
    console.error('提交专辑审核失败:', error);
    res.status(500).json({ message: '提交专辑审核失败', error: error.message });
  }
});

// 重新提交已拒绝的专辑
router.post('/:id/resubmit', auth, async (req, res) => {
  try {
    const albumId = req.params.id;
    const userId = req.user.id;
    
    // 获取专辑信息
    const album = await Album.findByPk(albumId);
    
    // 检查专辑是否存在
    if (!album) {
      return res.status(404).json({ message: '专辑不存在' });
    }
    
    // 检查专辑是否属于当前用户
    if (album.submittedById !== userId) {
      return res.status(403).json({ message: '您没有权限重新提交此专辑' });
    }
    
    // 检查专辑当前状态
    if (album.status !== 'rejected') {
      return res.status(400).json({ message: '只有被拒绝的专辑才能重新提交审核' });
    }
    
    // 更新专辑状态为审核中
    await album.update({
      status: 'pending',
      comment: '已重新提交审核'
    });
    
    res.json({
      message: '专辑已成功重新提交审核',
      album: {
        id: album.id,
        title: album.title,
        status: album.status,
        comment: album.comment
      }
    });
  } catch (error) {
    console.error('重新提交专辑审核失败:', error);
    res.status(500).json({ message: '重新提交专辑审核失败', error: error.message });
  }
});



// 验证授权书数字签名
router.get('/:id/verify-signature', auth, async (req, res) => {
  try {
    const albumId = req.params.id;
    const isAdmin = req.user && req.user.role === 'admin';
    
    console.log(`收到验证授权书数字签名请求，专辑ID: ${albumId}, 管理员: ${isAdmin}`);
    
    // 验证授权书数字签名，如果是管理员，传入isAdmin=true以获取更多信息
    const result = await verifyAuthorizationSignature(albumId, isAdmin);
    
    // 返回验证结果，包括详细信息
    return res.status(200).json({
      success: true,
      verified: result.verified,
      message: result.message,
      details: result.details // 包含签名详细信息
    });
  } catch (error) {
    console.error('验证授权书数字签名失败:', error);
    return res.status(500).json({
      success: false,
      message: `验证授权书数字签名失败: ${error.message}`
    });
  }
});

// 使用下载路由
router.use('/:id/download', albumDownloadRoute);

/**
 * @swagger
 * /api/albums/{albumId}/nodes-positions:
 *   put:
 *     summary: 保存专辑流程图中节点的位置信息
 *     tags: [Albums]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: albumId
 *         required: true
 *         schema:
 *           type: integer
 *         description: 专辑ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               positions:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     position:
 *                       type: object
 *                       properties:
 *                         x:
 *                           type: number
 *                         y:
 *                           type: number
 *     responses:
 *       200:
 *         description: 节点位置保存成功
 *       404:
 *         description: 专辑不存在
 *       500:
 *         description: 服务器错误
 */
router.put('/:albumId/nodes-positions', auth, async (req, res) => {
  try {
    const { albumId } = req.params;
    const { positions } = req.body;

    console.log('收到保存节点位置请求:');
    console.log('专辑ID:', albumId);
    console.log('位置数据:', JSON.stringify(positions));

    if (!positions || !Array.isArray(positions)) {
      console.log('无效的节点位置数据');
      return res.status(400).json({ message: '无效的节点位置数据' });
    }

    // 查找专辑
    const album = await Album.findByPk(albumId);
    if (!album) {
      console.log('专辑不存在:', albumId);
      return res.status(404).json({ message: '专辑不存在' });
    }

    console.log('找到专辑:', album.id, album.title);

    // 检查权限
    const isAdmin = req.user.role === 'admin';
    const isOwner = album.submittedById === req.user.id;
    
    console.log('用户权限检查:');
    console.log('- 用户ID:', req.user.id);
    console.log('- 专辑提交者ID:', album.submittedById);
    console.log('- 是管理员:', isAdmin);
    console.log('- 是所有者:', isOwner);
    
    if (!isAdmin && !isOwner) {
      console.log('无权操作此专辑');
      return res.status(403).json({ message: '无权操作此专辑' });
    }

    // 更新节点位置信息
    console.log('当前nodesPositions值:', album.nodesPositions);
    
    // 如果没有nodesPositions字段，添加一个
    if (!album.nodesPositions) {
      console.log('创建新的nodesPositions');
      const stringifiedPositions = JSON.stringify(positions);
      console.log('准备保存的数据:', stringifiedPositions);
      
      try {
        await album.update({ nodesPositions: stringifiedPositions });
        console.log('保存成功');
      } catch (updateError) {
        console.error('保存失败:', updateError);
        throw updateError;
      }
    } else {
      // 如果已有nodesPositions字段，合并新的位置信息
      console.log('更新现有nodesPositions');
      let existingPositions;
      try {
        existingPositions = JSON.parse(album.nodesPositions || '[]');
        // 确保existingPositions是数组
        if (!Array.isArray(existingPositions)) {
          console.warn('现有位置数据不是数组，将重置为空数组');
          existingPositions = [];
        }
      } catch (parseError) {
        console.error('解析现有位置数据失败:', parseError);
        existingPositions = [];
      }
      console.log('现有位置数据:', existingPositions);
      
      // 创建一个映射以便快速查找和更新
      const positionsMap = {};
      
      // 安全地遍历现有位置
      if (Array.isArray(existingPositions)) {
      existingPositions.forEach(pos => {
          if (pos && pos.id) {
        positionsMap[pos.id] = pos;
          }
      });
      }
      
      // 更新或添加新的位置
      positions.forEach(pos => {
        if (pos && pos.id) {
        positionsMap[pos.id] = pos;
        }
      });
      
      // 转换回数组
      const updatedPositions = Object.values(positionsMap);
      console.log('更新后的位置数据:', updatedPositions);
      
      // 保存更新后的位置信息
      const stringifiedPositions = JSON.stringify(updatedPositions);
      console.log('准备保存的数据:', stringifiedPositions);
      
      try {
        await album.update({ nodesPositions: stringifiedPositions });
        console.log('保存成功');
      } catch (updateError) {
        console.error('保存失败:', updateError);
        throw updateError;
      }
    }

    // 验证保存是否成功
    const updatedAlbum = await Album.findByPk(albumId);
    console.log('保存后的nodesPositions值:', updatedAlbum.nodesPositions);

    res.json({ 
      success: true, 
      message: '节点位置保存成功',
      positions: JSON.parse(updatedAlbum.nodesPositions || '[]')
    });
  } catch (error) {
    console.error('保存节点位置失败:', error);
    res.status(500).json({ message: '保存节点位置失败', error: error.message });
  }
});

// 使用特殊路径更新歌曲顺序，避免与/:albumId/songs/:songId路由冲突
router.put('/:albumId/update-songs-order', auth, async (req, res) => {
  try {
    const albumId = parseInt(req.params.albumId, 10);
    const { songIds } = req.body;
    
    console.log('更新歌曲顺序请求:', {
      albumId,
      songIds,
      songIdsType: Array.isArray(songIds) ? songIds.map(id => typeof id) : typeof songIds,
      userRole: req.user.role
    });
    
    // 验证songIds是否为有效数组
    if (!songIds || !Array.isArray(songIds) || songIds.length === 0) {
      console.error('无效的歌曲ID列表:', songIds);
      return res.status(400).json({ message: '无效的歌曲ID列表' });
    }
    
    // 确保所有songIds都是数字类型
    const numericSongIds = songIds.map(id => {
      // 对于字符串类型，尝试转换为数字
      if (typeof id === 'string') {
        // 检查是否可以转换为有效数字
        const parsedId = parseInt(id, 10);
        if (!isNaN(parsedId)) {
          return parsedId;
        } else {
          // 如果无法转换为数字，保留原始字符串ID
          console.warn(`无法将歌曲ID "${id}" 转换为数字，将保留原始值`);
          return id;
        }
      }
      return id;
    });
    
    console.log('转换后的歌曲ID:', numericSongIds, '原始ID类型:', songIds.map(id => typeof id));
    
    // 管理员可以编辑任何专辑的歌曲
    const isAdmin = req.user.role === 'admin';
    
    // 查找专辑，确保用户有权限
    let album;
    try {
    if (isAdmin) {
      // 管理员可以编辑任何专辑
      album = await Album.findByPk(albumId);
    } else {
      // 普通用户只能编辑自己的专辑
      album = await Album.findOne({
        where: {
          id: albumId,
          submittedById: req.user.id
        }
      });
    }
    
    if (!album) {
        console.error('专辑不存在或用户无权限:', { albumId, userId: req.user.id });
      return res.status(403).json({ message: '无权修改此专辑或专辑不存在' });
      }
    } catch (error) {
      console.error('查询专辑失败:', error);
      return res.status(500).json({ message: '查询专辑失败', error: error.message });
    }
    
    // 检查专辑状态，只有草稿状态或已拒绝状态的专辑可以修改
    // 但管理员可以编辑任何状态的专辑
    const isDraft = album.status === 'draft' || (album.comment && album.comment.includes('DRAFT'));
    const isRejected = album.status === 'rejected';
    
    if (!isDraft && !isRejected && !isAdmin) {
      console.error('专辑状态不允许修改:', { status: album.status, comment: album.comment });
      return res.status(400).json({ message: '只能修改草稿状态或已拒绝状态的专辑中的歌曲顺序' });
    }
    
    // 获取专辑中的所有歌曲
    let songs;
    try {
      songs = await Song.findAll({
      where: { albumId },
      attributes: ['id', 'trackNumber', 'title']
    });
    
    console.log('专辑歌曲:', songs.map(song => ({ id: song.id, title: song.title })));
      
      if (songs.length === 0) {
        console.warn('专辑没有关联的歌曲:', albumId);
        return res.status(400).json({ message: '专辑没有关联的歌曲' });
      }
    } catch (error) {
      console.error('查询专辑歌曲失败:', error);
      return res.status(500).json({ message: '查询专辑歌曲失败', error: error.message });
    }
    
    // 验证所有的songIds是否都属于这个专辑
    // 创建歌曲ID映射表，同时支持数字ID和字符串标题匹配
    const albumSongMap = {};
    const albumSongTitles = [];
    
    songs.forEach(song => {
      albumSongMap[song.id] = song;
      if (song.title) {
        albumSongTitles.push(song.title);
      }
    });
    
    // 检查每个传入的ID是否存在于专辑中
    const invalidSongIds = [];
    const validSongIds = [];
    
    for (const id of numericSongIds) {
      // 尝试按ID匹配
      if (albumSongMap[id]) {
        validSongIds.push(id);
      } 
      // 尝试按标题匹配
      else if (typeof id === 'string' && albumSongTitles.includes(id)) {
        // 找到对应标题的歌曲ID
        const matchedSong = songs.find(song => song.title === id);
        if (matchedSong) {
          validSongIds.push(matchedSong.id);
        }
      } 
      else {
        invalidSongIds.push(id);
      }
    }
    
    if (invalidSongIds.length > 0) {
      console.error('存在不属于此专辑的歌曲ID:', { 
        invalidSongIds, 
        validSongIds,
        albumSongs: songs.map(s => s.id)
      });
      return res.status(400).json({ 
        message: '存在不属于此专辑的歌曲ID或标题', 
        invalidSongIds 
      });
    }
    
    if (validSongIds.length === 0) {
      console.error('没有有效的歌曲ID用于更新');
      return res.status(400).json({ message: '没有有效的歌曲ID用于更新' });
    }
    
    // 使用有效的歌曲ID替换原始ID列表
    numericSongIds.length = 0;
    numericSongIds.push(...validSongIds);
    
    console.log('最终使用的歌曲ID:', numericSongIds);
    
    // 更新每首歌曲的trackNumber
    const updatePromises = [];
    const updateResults = [];
    
    for (let i = 0; i < numericSongIds.length; i++) {
      const songId = numericSongIds[i];
      try {
        console.log(`准备更新歌曲ID ${songId} 的顺序为 ${i + 1}`);
        
        const updatePromise = Song.update(
          { trackNumber: i + 1 },
          { where: { id: songId, albumId } }
        ).then(result => {
          console.log(`更新歌曲ID ${songId} 的顺序为 ${i + 1}, 结果:`, result);
          updateResults.push({ songId, trackNumber: i + 1, success: result[0] > 0 });
          return result;
        }).catch(error => {
          console.error(`更新歌曲ID ${songId} 的顺序失败:`, error);
          updateResults.push({ songId, trackNumber: i + 1, success: false, error: error.message });
          throw error;
        });
        
        updatePromises.push(updatePromise);
      } catch (error) {
        console.error(`创建更新歌曲ID ${songId} 的顺序的Promise失败:`, error);
        updateResults.push({ songId, trackNumber: i + 1, success: false, error: error.message });
      }
    }
    
    try {
      await Promise.all(updatePromises);
    
    console.log('歌曲顺序更新成功:', {
      albumId,
      songIds: numericSongIds,
        updatedCount: numericSongIds.length,
        updateResults
    });
    
    res.status(200).json({ 
      message: '歌曲顺序更新成功',
        songIds: numericSongIds,
        updateResults
      });
    } catch (updateError) {
      console.error('部分或全部歌曲顺序更新失败:', updateError);
      
      // 尽管有错误，我们仍然发送成功状态，但附带更详细的信息
      res.status(200).json({ 
        message: '部分或全部歌曲顺序更新失败',
        songIds: numericSongIds,
        updateResults
    });
    }
  } catch (error) {
    console.error('更新歌曲顺序错误:', error);
    res.status(500).json({ 
      message: '更新歌曲顺序失败', 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// 专辑下载路由已移至albumDownload.js，并通过app.js直接注册到/api/albums路径下

// 用户删除专辑（仅限草稿状态）
router.delete('/:id', auth, async (req, res) => {
  try {
    const albumId = req.params.id;
    const userId = req.user.id;
    
    console.log(`[DELETE ALBUM] 开始处理专辑删除请求: albumId=${albumId}, userId=${userId}, userRole=${req.user.role || 'unknown'}`);
    
    // 查找专辑
    const album = await Album.findByPk(albumId, {
      include: [{ model: Song }]
    });
    
    if (!album) {
      console.log(`[DELETE ALBUM] 未找到专辑: albumId=${albumId}`);
      return res.status(404).json({ 
        success: false, 
        message: '专辑不存在' 
      });
    }
    
    console.log(`[DELETE ALBUM] 找到专辑: albumId=${albumId}, title=${album.title}, status=${album.status}, submittedById=${album.submittedById}`);
    
    
    // 验证是否属于当前用户
    console.log(`[DELETE ALBUM DEBUG] 专辑所有者ID: ${album.submittedById}, 当前用户ID: ${userId}, 用户角色: ${req.user.role}`);
    if (album.submittedById !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '您无权删除此专辑'
      });
    }
    
    // 检查专辑状态
    console.log(`[DELETE ALBUM] 用户尝试删除专辑 ${albumId}，状态: ${album.status}, comment: ${album.comment || '无备注'}`);
    
    // 判断是否为草稿状态 (可能是draft状态或pending状态带特定注释)
    const isDraft = album.status === 'draft' || 
                   (album.status === 'pending' && album.comment === 'DRAFT: 尚未提交审核');
    const isRejected = album.status === 'rejected';
    
    // 严格检查权限: 非管理员用户只能删除自己的草稿或被拒绝的专辑
    if (req.user.role !== 'admin') {
      if (!isDraft && !isRejected) {
        console.log(`[DELETE ALBUM] 拒绝删除: 用户角色=${req.user.role}, 专辑状态=${album.status}，非草稿或被拒绝状态`);
        return res.status(403).json({
          success: false,
          message: '只能删除草稿或被拒绝的专辑'
        });
      }
    } else {
      console.log(`[DELETE ALBUM] 管理员删除专辑: userId=${userId}, 专辑状态=${album.status}`);
    }
    
    // 保存需要删除的文件路径
    const filesToDelete = [];
    
    // 添加专辑封面
    if (album.coverImage) {
      const coverPath = path.join(__dirname, '../..', album.coverImage);
      filesToDelete.push(coverPath);
      
      // 如果有缩略图也删除
      try {
        // 检查getThumbnailPath是否返回Promise
        const thumbnailResult = getThumbnailPath(album.coverImage);
        
        // 如果是Promise，不处理缩略图（异步操作可能导致错误）
        if (thumbnailResult instanceof Promise) {
          console.log(`[DELETE ALBUM] getThumbnailPath返回Promise，跳过缩略图处理`);
        } 
        // 如果是字符串，则添加到删除列表
        else if (typeof thumbnailResult === 'string' && thumbnailResult) {
          filesToDelete.push(path.join(__dirname, '../..', thumbnailResult));
          console.log(`[DELETE ALBUM] 添加封面缩略图到删除列表: ${thumbnailResult}`);
        }
      } catch (thumbError) {
        // 缩略图可能不存在，这不应该影响删除流程
        console.log(`[DELETE ALBUM] 获取缩略图路径失败，继续执行: ${thumbError.message}`);
      }
    }
    
    // 添加授权文件
    if (album.authorizationFile) {
      const authPath = path.join(__dirname, '../..', album.authorizationFile);
      filesToDelete.push(authPath);
    }
    
    // 添加歌曲文件
    if (album.Songs && album.Songs.length > 0) {
      album.Songs.forEach(song => {
        if (song.wavFile) {
          const wavPath = path.join(__dirname, '../..', song.wavFile);
          filesToDelete.push(wavPath);
        }
        if (song.lyricsFile) {
          const lyricsPath = path.join(__dirname, '../..', song.lyricsFile);
          filesToDelete.push(lyricsPath);
        }
        if (song.translationLyricsFile) {
          const transLyricsPath = path.join(__dirname, '../..', song.translationLyricsFile);
          filesToDelete.push(transLyricsPath);
        }
      });
    }
    
    // 先删除数据库中的记录
    console.log(`用户(ID: ${userId})正在删除专辑: ${albumId} - ${album.title}`);
    
    // 删除专辑关联的所有歌曲
    if (album.Songs && album.Songs.length > 0) {
      try {
        console.log(`[DELETE ALBUM] 开始删除专辑关联的歌曲: albumId=${albumId}, songCount=${album.Songs.length}`);
        const deletedCount = await Song.destroy({
          where: { albumId }
        });
        console.log(`[DELETE ALBUM] 已删除专辑 ${albumId} 的 ${deletedCount} 首歌曲 (原有 ${album.Songs.length} 首)`);
      } catch (songDeleteError) {
        console.error(`[DELETE ALBUM] 删除专辑关联的歌曲失败:`, songDeleteError);
        throw songDeleteError; // 继续向上抛出错误
      }
    }
    
    // 删除专辑
    try {
      console.log(`[DELETE ALBUM] 开始删除专辑记录: albumId=${albumId}, title=${album.title}`);
      await album.destroy();
      console.log(`[DELETE ALBUM] 专辑 ${albumId} 已从数据库中删除`);
    } catch (albumDeleteError) {
      console.error(`[DELETE ALBUM] 删除专辑记录失败:`, albumDeleteError);
      throw albumDeleteError; // 继续向上抛出错误
    }
    
    // 尝试删除文件
    console.log(`[DELETE ALBUM] 开始删除专辑相关文件: albumId=${albumId}, fileCount=${filesToDelete.length}`);
    const failedFiles = [];
    for (const filePath of filesToDelete) {
      try {
        if (fs.existsSync(filePath)) {
          console.log(`[DELETE ALBUM] 正在删除文件: ${filePath}`);
          await unlinkAsync(filePath);
          console.log(`[DELETE ALBUM] 文件已成功删除: ${filePath}`);
        } else {
          console.log(`[DELETE ALBUM] 文件不存在，跳过删除: ${filePath}`);
        }
      } catch (fileError) {
        console.error(`[DELETE ALBUM] 删除文件失败: ${filePath}`, fileError);
        failedFiles.push(filePath);
      }
    }
    
    console.log(`[DELETE ALBUM] 文件删除完成: 总文件数=${filesToDelete.length}, 删除失败数=${failedFiles.length}`);
    
    
    // 返回结果
    if (failedFiles.length > 0) {
      console.log(`[DELETE ALBUM] 返回部分成功响应: albumId=${albumId}, failedFileCount=${failedFiles.length}`);
      return res.json({
        success: true,
        message: '专辑已删除，但部分文件删除失败',
        failedFiles
      });
    }
    
    console.log(`[DELETE ALBUM] 返回成功响应: albumId=${albumId}, title=${album.title}`);
    return res.json({
      success: true,
      message: '专辑及其所有相关文件已成功删除'
    });
    
  } catch (error) {
    // 确保albumId有值，即使在出错时
    const errorAlbumId = req.params.id || 'unknown';
    console.error(`[DELETE ALBUM] 删除专辑失败: albumId=${errorAlbumId}`, error);
    console.error(`[DELETE ALBUM] 错误详情:`, {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code
    });
    
    res.status(500).json({
      success: false,
      message: '删除专辑失败',
      error: error.message,
      errorDetails: process.env.NODE_ENV === 'production' ? undefined : {
        name: error.name,
        code: error.code,
        stack: error.stack
      }
    });
  }
});

module.exports = router; 