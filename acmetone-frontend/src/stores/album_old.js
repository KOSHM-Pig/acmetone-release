const express = require('express');
const router = express.Router();
const { Album, Song, Artist, User, UserVerification } = require('../models');
const { auth, adminAuth } = require('../middleware/auth');
const { uploadAudio, uploadImage, uploadPDF, uploadChunk, mergeChunks, handleUploadError } = require('../middleware/upload');
const { Op } = require('sequelize');
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

// 设置ffmpeg路径
ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

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

// 将WAV转换为MP3
const convertWavToMp3 = async (wavPath) => {
  try {
    // 检查WAV文件是否存在
    if (!fs.existsSync(wavPath)) {
      console.error(`WAV文件不存在: ${wavPath}`);
      return wavPath; // 直接返回原始路径
    }
    
    // 生成MP3文件路径
    const fileName = path.basename(wavPath, path.extname(wavPath));
    const mp3Path = path.join(MP3_CACHE_DIR, `${fileName}.mp3`);
    
    // 检查MP3缓存是否已存在
    if (fs.existsSync(mp3Path)) {
      
      return mp3Path;
    }
    
    
    
    try {
      return new Promise((resolve, reject) => {
        // 设置超时，避免长时间阻塞
        const timeout = setTimeout(() => {
          
          resolve(wavPath);
        }, 30000); // 增加到30秒超时
        
        // 检查ffmpeg路径是否有效
        if (!fs.existsSync(ffmpegPath)) {
          
          clearTimeout(timeout);
          resolve(wavPath);
          return;
        }
        
        // 尝试使用ffmpeg转换
        ffmpeg(wavPath)
          .audioBitrate('128k')
          .audioCodec('libmp3lame')  // 明确指定编码器
          .format('mp3')
          .on('error', (err) => {
            clearTimeout(timeout);
            
            // 转换失败时返回原始WAV文件
            resolve(wavPath);
          })
          .on('end', () => {
            clearTimeout(timeout);
            
            // 验证生成的MP3文件
            if (fs.existsSync(mp3Path) && fs.statSync(mp3Path).size > 0) {
              resolve(mp3Path);
            } else {
              
              resolve(wavPath);
            }
          })
          .on('progress', (progress) => {
            
          })
          .save(mp3Path);
      });
    } catch (conversionError) {
      
      return wavPath; // 直接返回原始路径
    }
  } catch (error) {
    
    // 出错时返回原始WAV文件路径
    return wavPath;
  }
};

// 配置静态文件URL
const STATIC_BASE_URL = isDev ? 'http://localhost:3000' : 'http://47.121.194.8';

// 创建新专辑
router.post('/', auth, uploadImage.single('coverImage'), handleUploadError, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: '请上传专辑封面' });
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

    // 确保使用相对路径存储图片路径
    const relativePath = req.file.path.replace(/\\/g, '/');
    const normalizedPath = relativePath.includes('uploads/') 
      ? relativePath.substring(relativePath.indexOf('uploads/')) 
      : relativePath;

    const albumData = {
      title: req.body.title,
      type: req.body.type,
      releaseDate: releaseDate,
      coverImage: normalizedPath,
      displayInfo: req.body.displayInfo,
      description: req.body.description,
      submittedById: req.user.id,
      status: 'pending',
      comment: 'DRAFT: 尚未提交审核'
    };

    // 验证必填字段
    const requiredFields = ['title', 'type', 'releaseDate', 'displayInfo', 'description'];
    const missingFields = requiredFields.filter(field => !albumData[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({ 
        message: `缺少必填字段: ${missingFields.join(', ')}` 
      });
    }

    

    const album = await Album.create(albumData);
    res.status(201).json(album);
  } catch (error) {
    console.error('创建专辑错误:', error);
    res.status(400).json({ message: error.message });
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

    // 检查文件是否成功上传
    if (!req.file) {
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

    if (!req.body.artists) {
      return res.status(400).json({ message: '请提供歌手信息' });
    }

    // 解析歌手信息
    let artists;
    try {
      artists = JSON.parse(req.body.artists);
      console.log('解析的歌手信息:', artists);
    } catch (error) {
      return res.status(400).json({ message: '歌手信息格式无效' });
    }

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
      const fullNewPath = path.join(dirName, newFileName);
      
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

    // 获取专辑中已有的歌曲数量，用于设置 trackNumber
    const existingSongs = await Song.count({ where: { albumId: albumId } });
    const trackNumber = existingSongs + 1;

    // 尝试获取音频文件时长（示例）
    let duration = null;
    try {
      // 这里可以添加获取音频时长的代码，暂时使用随机时长
      duration = Math.floor(Math.random() * 180) + 120; // 随机 2-5 分钟
    } catch (err) {
      console.warn('无法获取音频时长:', err.message);
    }

    const songData = {
      title: req.body.title,
      genre: req.body.genre,
      language: req.body.language,
      wavFile: req.file.path,
      albumId: albumId,
      trackNumber: trackNumber,
      duration: duration
    };

    console.log('准备创建歌曲记录:', songData);

    const song = await Song.create(songData);
    
    try {
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
        await song.addArtist(artist);
      }

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
        wavFile: populatedSong.wavFile ? `${STATIC_BASE_URL}/${populatedSong.wavFile}` : null,
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
        attributes: ['id', 'title', 'wavFile', 'genre', 'language', 'duration', 'trackNumber', 'createdAt', 'updatedAt', 'AlbumId'],
        include: [{
          model: Artist,
          as: 'Artists',
          through: { attributes: [] }
        }]
      }],
      order: [['createdAt', 'DESC']]
    });

    console.log('找到的专辑数量:', albums.length);
    
    // 处理歌曲的文件路径
    const processedAlbums = albums.map(album => {
      const albumData = album.toJSON();
      
      // 添加虚拟属性 isDraft，通过评论来标记草稿状态
      const isDraft = albumData.comment && albumData.comment.startsWith('DRAFT:');
      
      return {
        ...albumData,
        isDraft: isDraft,
        // 如果是草稿状态，则显示为草稿
        virtualStatus: isDraft ? 'draft' : albumData.status,
        songs: (albumData.songs || []).map(song => ({
          ...song,
          wavFile: song.wavFile ? `${STATIC_BASE_URL}/${song.wavFile}` : null,
          Artists: song.Artists || [] // 确保 Artists 始终是数组
        }))
      };
    });

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
    
    if (albums.length > 0) {
      console.log('第一个专辑示例:', {
        id: albums[0].id,
        title: albums[0].title,
        submittedBy: albums[0].submittedBy ? {
          id: albums[0].submittedBy.id,
          username: albums[0].submittedBy.username
        } : null,
        songsCount: albums[0].Songs?.length || 0
      });
    }
    
    res.json(albums);
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
    
    res.json(albums);
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
    
    res.json(albums);
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
    
    if (!status || !['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: '无效的状态值' });
    }
    
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

    // 转换为普通对象并处理数据
    const albumData = album.toJSON();
    
    // 添加虚拟属性 isDraft
    const isDraft = albumData.comment && albumData.comment.startsWith('DRAFT:');
    
    // 处理歌曲的文件路径，但不进行MP3转换
    const processedSongs = songs.map(song => {
      const songData = song.toJSON();
      
      // 只返回原始文件路径，不进行转换
      let audioUrl = null;
      if (song.wavFile) {
        audioUrl = `${STATIC_BASE_URL}/${song.wavFile}`;
      }
      
      // 确保所有必要的字段都存在
      return {
        ...songData,
        wavFile: audioUrl, // 使用原始文件URL
        trackNumber: song.trackNumber || 1,
        duration: song.duration || null,
        Artists: song.Artists || [] // 确保 Artists 始终是数组
      };
    });

    const processedAlbum = {
      ...albumData,
      isDraft: isDraft,
      virtualStatus: isDraft ? 'draft' : albumData.status,
      songs: processedSongs,
      // 确保授权书文件路径被正确返回
      authorizationFile: albumData.authorizationFile || null
    };
    
    console.log('返回的专辑数据:', {
      id: processedAlbum.id,
      title: processedAlbum.title,
      isDraft: processedAlbum.isDraft,
      virtualStatus: processedAlbum.virtualStatus,
      songCount: processedAlbum.songs.length,
      authorizationFile: processedAlbum.authorizationFile, // 记录日志
      songs: processedAlbum.songs.map(song => ({
        id: song.id,
        title: song.title,
        trackNumber: song.trackNumber,
        duration: song.duration,
        artistCount: song.Artists.length,
        artists: song.Artists.map(artist => artist.name)
      }))
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
    
    // 查询专辑信息
    const album = await Album.findByPk(albumId);
    if (!album) {
      return res.status(404).json({ message: '专辑不存在' });
    }

    // 判断用户权限：管理员可以查看任何专辑，普通用户只能查看自己的专辑
    if (req.user.role !== 'admin' && album.submittedById !== req.user.id) {
      return res.status(403).json({ message: '无权访问此专辑' });
    }
    
    // 查询歌曲信息
    const song = await Song.findOne({
      where: {
        id: songId,
        albumId: albumId
      }
    });
    
    if (!song) {
      return res.status(404).json({ message: '歌曲不存在或不属于指定专辑' });
    }
    
    // 如果没有WAV文件，返回错误
    if (!song.wavFile) {
      return res.status(404).json({ message: '歌曲没有音频文件' });
    }
    
    // 获取WAV文件的绝对路径
    const wavPath = path.join(__dirname, '../../', song.wavFile);
    
    // 转换为MP3
    try {
      console.log('开始转换WAV到MP3');
      const mp3Path = await convertWavToMp3(wavPath);
      
      // 获取相对路径用于URL
      const relativeMp3Path = path.relative(path.join(__dirname, '../../'), mp3Path);
      
      // 构建MP3文件URL
      const mp3Url = `${STATIC_BASE_URL}/${relativeMp3Path.replace(/\\/g, '/')}`;
      console.log('MP3文件URL:', mp3Url);
      
      // 返回MP3文件URL
      res.json({
        id: song.id,
        title: song.title,
        audioUrl: mp3Url
      });
    } catch (error) {
      console.error('WAV转MP3失败，将使用原始WAV文件:', error);
      
      // 返回原始WAV文件URL
      const wavUrl = `${STATIC_BASE_URL}/${song.wavFile}`;
      res.json({
        id: song.id,
        title: song.title,
        audioUrl: wavUrl
      });
    }
  } catch (error) {
    console.error('获取歌曲音频文件错误:', error);
    res.status(500).json({ 
      message: '获取歌曲音频文件失败',
      error: error.message 
    });
  }
});

// 更新歌曲的歌手信息
router.put('/:albumId/songs/:songId/artists', auth, async (req, res) => {
  try {
    const albumId = parseInt(req.params.albumId, 10);
    const songId = parseInt(req.params.songId, 10);
    const { artists } = req.body;

    console.log('更新歌手信息请求:', {
      albumId,
      songId,
      artistsCount: artists.length
    });

    if (!artists || !Array.isArray(artists)) {
      return res.status(400).json({ message: '请提供有效的歌手信息数组' });
    }

    // 查找专辑和歌曲，确保用户有权限
    const album = await Album.findOne({
      where: {
        id: albumId,
        submittedById: req.user.id
      }
    });

    if (!album && req.user.role !== 'admin') {
      return res.status(403).json({ message: '无权修改此专辑' });
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

    // 清除现有的歌手关联
    await song.setArtists([]);

    // 为每个歌手创建或更新记录，并建立关联
    for (const artistData of artists) {
      if (!artistData.name) {
        return res.status(400).json({ message: '歌手名称不能为空' });
      }

      // 查找或创建艺人
      let [artist] = await Artist.findOrCreate({
        where: { name: artistData.name },
        defaults: {
          realName: artistData.realName || '',
          id_number: artistData.id_number || null,
          netease: artistData.platforms?.netease || '',
          qq: artistData.platforms?.qq || '',
          kugou: artistData.platforms?.kugou || '',
          kuwo: artistData.platforms?.kuwo || '',
          qishui: artistData.platforms?.qishui || '',
          spotify: artistData.platforms?.spotify || '',
          youtube: artistData.platforms?.youtube || '',
          appleMusic: artistData.platforms?.appleMusic || '',
          soundCloud: artistData.platforms?.soundCloud || ''
        }
      });

      // 如果艺人已存在，更新信息
      if (artistData.id && artist.id == artistData.id) {
        artist.realName = artistData.realName || artist.realName;
        artist.id_number = artistData.id_number || artist.id_number;
        artist.netease = artistData.platforms?.netease || artist.netease;
        artist.qq = artistData.platforms?.qq || artist.qq;
        artist.kugou = artistData.platforms?.kugou || artist.kugou;
        artist.kuwo = artistData.platforms?.kuwo || artist.kuwo;
        artist.qishui = artistData.platforms?.qishui || artist.qishui;
        artist.spotify = artistData.platforms?.spotify || artist.spotify;
        artist.youtube = artistData.platforms?.youtube || artist.youtube;
        artist.appleMusic = artistData.platforms?.appleMusic || artist.appleMusic;
        artist.soundCloud = artistData.platforms?.soundCloud || artist.soundCloud;
        await artist.save();
      }

      // 关联歌曲和艺人
      await song.addArtist(artist);
    }

    // 获取更新后的歌曲信息
    const updatedSong = await Song.findByPk(songId, {
      include: [{
        model: Artist,
        as: 'Artists',
        through: { attributes: [] }
      }]
    });

    // 处理文件路径
    const processedSong = {
      ...updatedSong.toJSON(),
      wavFile: updatedSong.wavFile ? `${STATIC_BASE_URL}/${updatedSong.wavFile}` : null,
      Artists: updatedSong.Artists || []
    };

    res.json(processedSong);
  } catch (error) {
    console.error('更新歌手信息错误:', error);
    res.status(400).json({ message: error.message || '更新歌手信息失败' });
  }
});

// 删除歌曲
router.delete('/:albumId/songs/:songId', auth, async (req, res) => {
  try {
    const { albumId, songId } = req.params;

    // 检查专辑是否存在且属于当前用户
    const album = await Album.findOne({
      where: {
        id: albumId,
        submittedById: req.user.id
      }
    });

    if (!album) {
      return res.status(404).json({ message: '专辑不存在或无权限' });
    }
    
    // 检查专辑状态，只有草稿状态或已拒绝状态的专辑可以修改
    const isDraft = album.status === 'draft' || (album.comment && album.comment.includes('DRAFT'));
    const isRejected = album.status === 'rejected';
    
    if (!isDraft && !isRejected) {
      return res.status(400).json({ message: '只能修改草稿状态或已拒绝状态的专辑中的歌曲' });
    }

    // 查找歌曲
    const song = await Song.findOne({
      where: {
        id: songId,
        albumId: albumId
      }
    });

    if (!song) {
      return res.status(404).json({ message: '歌曲不存在' });
    }

    // 删除歌曲文件
    try {
      if (fs.existsSync(song.wavFile)) {
        fs.unlinkSync(song.wavFile);
      }
    } catch (error) {
      console.error('删除歌曲文件失败:', error);
    }

    // 删除歌曲记录
    await song.destroy();

    res.status(200).json({ message: '歌曲删除成功' });
  } catch (error) {
    console.error('删除歌曲错误:', error);
    res.status(400).json({ message: error.message });
  }
});

// 提交草稿专辑进入审核流程
router.post('/:id/submit', auth, async (req, res) => {
  try {
    const albumId = parseInt(req.params.id, 10);
    const album = await Album.findByPk(albumId);
    
    if (!album) {
      return res.status(404).json({ message: '专辑不存在' });
    }
    
    // 验证用户权限
    if (album.submittedById !== req.user.id) {
      return res.status(403).json({ message: '您无权提交此专辑' });
    }
    
    // 检查专辑状态，只有处于草稿状态的专辑才能提交
    const isDraft = album.comment && album.comment.startsWith('DRAFT:');
    if (!isDraft && album.status !== 'pending') {
      return res.status(400).json({ message: '只有草稿状态的专辑可以提交审核' });
    }
    
    // 检查专辑是否有歌曲
    const songCount = await Song.count({ where: { albumId } });
    if (songCount === 0) {
      return res.status(400).json({ message: '专辑必须至少包含一首歌曲才能提交审核' });
    }
    
    // 检查用户是否已通过实名认证
    const userVerification = await UserVerification.findOne({
      where: { 
        userId: req.user.id,
        status: 'approved'
      }
    });
    
    if (!userVerification) {
      return res.status(403).json({ 
        message: '您需要先完成实名认证才能提交专辑审核',
        needVerification: true
      });
    }
    
    // 更新状态 - 移除草稿标记，设置为正式待审核
    album.comment = null; // 移除草稿标记
    await album.save();
    
    // 获取完整的专辑信息，包括歌曲
    const updatedAlbum = await Album.findByPk(albumId, {
      include: [{
        model: Song,
        include: [{
          model: Artist,
          as: 'Artists',
          through: { attributes: [] }
        }]
      }]
    });
    
    // 处理返回数据
    const albumData = updatedAlbum.toJSON();
    const processedAlbum = {
      ...albumData,
      isDraft: false,
      virtualStatus: 'pending',
      songs: albumData.Songs.map(song => ({
        ...song,
        wavFile: song.wavFile ? `${STATIC_BASE_URL}/${song.wavFile}` : null
      }))
    };
    
    res.json({ 
      message: '专辑已成功提交审核',
      album: processedAlbum
    });
  } catch (error) {
    console.error('提交专辑审核错误:', error);
    res.status(400).json({ message: error.message });
  }
});

// 重新提交已拒绝的专辑
router.post('/:id/resubmit', auth, async (req, res) => {
  try {
    const albumId = parseInt(req.params.id, 10);
    const album = await Album.findByPk(albumId);
    
    if (!album) {
      return res.status(404).json({ message: '专辑不存在' });
    }
    
    // 验证用户权限
    if (album.submittedById !== req.user.id) {
      return res.status(403).json({ message: '您无权提交此专辑' });
    }
    
    // 检查专辑状态，只有被拒绝的专辑才能重新提交
    if (album.status !== 'rejected') {
      return res.status(400).json({ message: '只有被拒绝的专辑可以重新提交审核' });
    }
    
    // 检查专辑是否有歌曲
    const songCount = await Song.count({ where: { albumId } });
    if (songCount === 0) {
      return res.status(400).json({ message: '专辑必须至少包含一首歌曲才能提交审核' });
    }
    
    // 检查用户是否已通过实名认证
    const userVerification = await UserVerification.findOne({
      where: { 
        userId: req.user.id,
        status: 'approved'
      }
    });
    
    if (!userVerification) {
      return res.status(403).json({ 
        message: '您需要先完成实名认证才能提交专辑审核',
        needVerification: true
      });
    }
    
    // 更新状态 - 将状态改为待审核，保留之前的拒绝理由但添加重新提交标记
    album.status = 'pending';
    if (album.comment) {
      album.comment = `[重新提交] 原拒绝理由: ${album.comment}`;
    } else {
      album.comment = '[重新提交]';
    }
    await album.save();
    
    // 获取完整的专辑信息，包括歌曲
    const updatedAlbum = await Album.findByPk(albumId, {
      include: [{
        model: Song,
        include: [{
          model: Artist,
          as: 'Artists',
          through: { attributes: [] }
        }]
      }]
    });
    
    // 处理返回数据
    const albumData = updatedAlbum.toJSON();
    const processedAlbum = {
      ...albumData,
      isDraft: false,
      virtualStatus: 'pending',
      songs: albumData.Songs.map(song => ({
        ...song,
        wavFile: song.wavFile ? `${STATIC_BASE_URL}/${song.wavFile}` : null
      }))
    };
    
    res.json({ 
      message: '专辑已成功重新提交审核',
      album: processedAlbum
    });
  } catch (error) {
    console.error('重新提交专辑审核错误:', error);
    res.status(400).json({ message: error.message });
  }
});

// 生成并下载专辑发行文件
router.get('/:id/download', adminAuth, async (req, res) => {
  let tempDir = null;
  let zipFilePath = null;
  
  try {
    const albumId = parseInt(req.params.id, 10);
    console.log('开始生成专辑发行文件，专辑ID:', albumId);
    console.log('请求头:', req.headers);

    // 查询专辑信息，包含所有歌曲和歌手
    const album = await Album.findByPk(albumId, {
      include: [
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

    if (!album) {
      return res.status(404).json({ message: '专辑不存在' });
    }

    // 检查专辑是否已审核通过
    if (album.status !== 'approved') {
      return res.status(400).json({ message: '只能下载已审核通过的专辑' });
    }

    const { v4: uuidv4 } = require('uuid');
    
    // 创建临时目录
    tempDir = path.join(__dirname, '../../temp', uuidv4());
    fs.mkdirSync(tempDir, { recursive: true });
    
    // 创建专辑目录结构
    const releaseDate = new Date(album.releaseDate);
    const formattedDate = `${releaseDate.getFullYear()}.${String(releaseDate.getMonth() + 1).padStart(2, '0')}.${String(releaseDate.getDate()).padStart(2, '0')}`;
    const albumDirName = `${formattedDate} - ${album.title}`;
    const albumDir = path.join(tempDir, albumDirName);
    fs.mkdirSync(albumDir);
    
    // 创建授权文件目录
    const authDir = path.join(albumDir, '授权文件');
    fs.mkdirSync(authDir);
    
    // 复制专辑封面
    const coverImagePath = path.join(__dirname, '../../', album.coverImage);
    const coverImageDest = path.join(albumDir, '专辑封面.jpg');
    if (fs.existsSync(coverImagePath)) {
      fs.copyFileSync(coverImagePath, coverImageDest);
    }
    
    // 创建发行外显文件
    fs.writeFileSync(path.join(albumDir, '发行外显.txt'), album.displayInfo);
    
    // 创建专辑简介文件
    fs.writeFileSync(path.join(albumDir, '专辑简介.txt'), album.description);
    
    // 创建Excel工作簿和工作表
    const workbook = new Excel.Workbook();
    const worksheet = workbook.addWorksheet('专辑信息');

    // 设置列
    worksheet.columns = [
      { header: '序号', width: 5 },
      { header: '专辑类型', width: 10 },
      { header: '专辑中文名称', width: 20 },
      { header: '歌曲中文名称', width: 20 },
      { header: '语种', width: 10 },
      { header: '风格', width: 10 },
      { header: '歌曲表演者', width: 20 },
      { header: '词作者', width: 15 },
      { header: '曲作者', width: 15 },
      { header: '词著作权比例', width: 15 },
      { header: '曲著作权比例', width: 15 },
      { header: '表演者权比例', width: 15 },
      { header: '录音制作者权比例', width: 20 },
      { header: '词曲权持有人', width: 25 },
      { header: '录音权持有人', width: 25 },
      { header: '发行区域', width: 10 },
      { header: '商用区域', width: 10 }
    ];

    // 添加数据行
    for (let i = 0; i < album.Songs.length; i++) {
      const song = album.Songs[i];
      const artistNames = song.Artists.map(artist => artist.name).join('/');
      
      worksheet.addRow([
        i + 1,
        album.type === 'album' ? '专辑' : '单曲',
        album.title,
        song.title,
        song.language || '中文',
        song.genre || '电子',
        artistNames,
        artistNames,
        artistNames,
        '100%',
        '100%',
        '100%',
        '100%',
        '上海极音记文化科技有限公司',
        '上海极音记文化科技有限公司',
        '全球',
        '全球'
      ]);
    }

    // 设置表头样式
    worksheet.getRow(1).height = 60; // 增加表头行高
    worksheet.getRow(1).font = { bold: true, size: 15, name: '宋体' };
    worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    
    // 设置表头背景色
    worksheet.getRow(1).eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }  // 浅灰色背景
      };
    });

    // 设置所有单元格的样式
    worksheet.eachRow((row, rowNumber) => {
      row.eachCell((cell) => {
        // 设置单元格边框
        cell.border = {
          top: { style: 'medium' },
          left: { style: 'medium' },
          bottom: { style: 'medium' },
          right: { style: 'medium' }
        };
        
        // 设置对齐方式
        cell.alignment = {
          vertical: 'middle',
          horizontal: 'center',
          wrapText: true
        };
        
        // 设置字体
        if (rowNumber > 1) { // 数据行
          cell.font = {
            name: '宋体',
            size: 11
          };
        }
      });
    });

    // 保存Excel文件
    const excelFilePath = path.join(albumDir, `极音记 专辑信息表 ${album.title}.xlsx`);
    await workbook.xlsx.writeFile(excelFilePath);
    
    // 处理每首歌曲
    for (let i = 0; i < album.Songs.length; i++) {
      const song = album.Songs[i];
      const trackNumber = String(song.trackNumber || (i + 1)).padStart(2, '0');
      
      // 创建歌手名称字符串
      const artistNames = song.Artists.map(artist => artist.name).join('&');
      
      // 创建歌曲目录
      const songDirName = `${trackNumber} - ${artistNames} - ${song.title}`;
      const songDir = path.join(albumDir, songDirName);
      fs.mkdirSync(songDir);
      
      // 复制WAV文件
      const wavFilePath = path.join(__dirname, '../../', song.wavFile);
      const wavFileDest = path.join(songDir, `${song.title}.wav`);
      if (fs.existsSync(wavFilePath)) {
        try {
          // 使用Buffer复制，避免文件系统权限问题
          const buffer = fs.readFileSync(wavFilePath);
          fs.writeFileSync(wavFileDest, buffer);
          console.log(`歌曲 ${song.title} 文件复制成功`);
        } catch (error) {
          console.error(`复制歌曲 ${song.title} 文件失败:`, error);
          // 不要中断整个过程，继续处理其他文件
        }
      } else {
        console.warn(`歌曲 ${song.title} 源文件不存在: ${wavFilePath}`);
      }
      
      // 创建歌手信息文件
      let artistInfoContent = `艺人歌曲及艺人主页信息填写\n歌曲名称：${song.title}\n歌曲副标题/各种文翻译（选填）： \n\n`;
      artistInfoContent += `艺人名（两个及以上的制作人中间加/）：${artistNames}\n\n`;
      
      // 为每位歌手添加详细信息
      for (const artist of song.Artists) {
        artistInfoContent += `${artist.name}：\n`;
        artistInfoContent += `艺人真实姓名（发行公司需要，以确保艺人隐私，可填写英文名/拼音并确认）：${artist.realName || ''}\n`;
        artistInfoContent += `主页链接（两人及以上分开填写）\n`;
        
        // 国内平台
        if (artist.netease) artistInfoContent += `网易云音乐：${artist.netease}\n`;
        if (artist.qq) artistInfoContent += `QQ音乐：${artist.qq}\n`;
        if (artist.kugou) artistInfoContent += `酷狗：${artist.kugou}\n`;
        if (artist.kuwo) artistInfoContent += `酷我：${artist.kuwo}\n`;
        if (artist.qishui) artistInfoContent += `汽水音乐：${artist.qishui}\n`;
        
        // 国外平台
        artistInfoContent += `外网（选填）\n`;
        if (artist.spotify) artistInfoContent += `Spotify：${artist.spotify}\n`;
        if (artist.youtube) artistInfoContent += `Youtube：${artist.youtube}\n`;
        if (artist.appleMusic) artistInfoContent += `Apple Music：${artist.appleMusic}\n`;
        if (artist.soundCloud) artistInfoContent += `SoundCloud：${artist.soundCloud}\n`;
        
        artistInfoContent += `\n`;
        
        // 创建授权文件占位
        try {
          fs.writeFileSync(path.join(authDir, `${song.title} - ${artist.name}（${artist.realName || '实名'}）- 2极音记.pdf`), '授权文件占位');
        } catch (error) {
          console.error(`创建授权文件占位失败 ${song.title} - ${artist.name}:`, error);
        }
      }
      
      // 写入歌手信息文件
      try {
        fs.writeFileSync(path.join(songDir, '歌手信息.txt'), artistInfoContent);
      } catch (error) {
        console.error(`写入歌手信息文件失败 ${song.title}:`, error);
      }
      
      // 创建歌词文件占位
      try {
        fs.writeFileSync(path.join(songDir, 'lyrics_cn.lrc'), '');
        fs.writeFileSync(path.join(songDir, 'lyrics_en.lrc'), '');
      } catch (error) {
        console.error(`创建歌词文件占位失败 ${song.title}:`, error);
      }
    }
    
    // 创建ZIP文件
    try {
      // 使用uuid作为唯一标识符，避免文件名问题
      const uniqueId = uuidv4();
      const zipFileName = `album_${album.id}_${uniqueId}.zip`;
      const tempFolderPath = path.join(__dirname, '../../temp');
      zipFilePath = path.join(tempFolderPath, zipFileName);
      
      // 确保临时目录存在且有写入权限
      if (!fs.existsSync(tempFolderPath)) {
        fs.mkdirSync(tempFolderPath, { recursive: true });
        console.log('创建临时目录:', tempFolderPath);
      }
      
      console.log('开始创建ZIP文件:', zipFilePath);
      
      // 处理Windows上可能的文件权限问题
      if (process.platform === 'win32') {
        // 检查文件是否存在并尝试删除
        if (fs.existsSync(zipFilePath)) {
          try {
            fs.unlinkSync(zipFilePath);
            console.log('删除已存在的ZIP文件:', zipFilePath);
          } catch (error) {
            if (error.code === 'EPERM' || error.code === 'EACCES') {
              // 文件可能被锁定，尝试使用不同的文件名
              const newUniqueId = uuidv4();
              zipFilePath = path.join(tempFolderPath, `album_${album.id}_${newUniqueId}.zip`);
              console.log('无法删除已存在的文件，使用新文件名:', zipFilePath);
            } else {
              throw error;
            }
          }
        }
      }
      
      // 创建输出流和归档器
      const output = fs.createWriteStream(zipFilePath, {
        flags: 'w',        // 写入模式，覆盖已存在的文件
        encoding: 'binary' // 二进制编码
      });
      
      // 处理输出流错误
      output.on('error', (err) => {
        console.error('创建ZIP输出流错误:', err);
        throw err;
      });
      
      const archive = archiver('zip', {
        zlib: { level: 5 } // 使用较低压缩级别，提高性能和兼容性
      });
      
      // 处理输出完成
      const outputClosePromise = new Promise((resolve, reject) => {
        output.on('close', () => {
          console.log(`ZIP文件生成完成，大小: ${archive.pointer()} 字节`);
          resolve();
        });
        
        output.on('error', (err) => {
          console.error('ZIP文件写入错误:', err);
          reject(err);
        });
      });
      
      // 处理归档错误
      archive.on('error', (err) => {
        console.error('创建归档过程中发生错误:', err);
        throw err;
      });
      
      // 添加警告日志
      archive.on('warning', (err) => {
        if (err.code === 'ENOENT') {
          console.warn('归档警告 - 文件不存在:', err);
        } else {
          console.warn('归档警告:', err);
        }
      });
      
      // 添加进度日志
      archive.on('progress', (progress) => {
        if (progress.entries && progress.entries.total % 50 === 0) {
          console.log(`归档进度: ${progress.entries.processed}/${progress.entries.total} 文件`);
        }
      });
      
      // 将归档器和输出流连接
      archive.pipe(output);
      
      // 添加专辑目录到归档
      archive.directory(albumDir, albumDirName);
      
      // 完成归档并等待输出流关闭
      console.log('开始最终归档操作...');
      await archive.finalize();
      console.log('归档finalize完成，等待输出流关闭...');
      await outputClosePromise;
      console.log('输出流已关闭，归档完成');
      
      // 准备文件名（用于下载）
      const downloadFileName = `${albumDirName}.zip`;
      
      // 确认ZIP文件生成成功且可读
      try {
        const stats = fs.statSync(zipFilePath);
        console.log(`ZIP文件状态检查: 大小=${stats.size}字节, 路径=${zipFilePath}`);
        
        if (stats.size === 0) {
          throw new Error('生成的ZIP文件大小为0');
        }
        
        // 测试文件是否可读
        const testRead = fs.openSync(zipFilePath, 'r');
        fs.closeSync(testRead);
      } catch (error) {
        console.error('ZIP文件验证失败:', error);
        throw new Error(`ZIP文件验证失败: ${error.message}`);
      }
      
      // 设置适当的头信息
      res.set({
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(downloadFileName)}"`,
        'Content-Length': fs.statSync(zipFilePath).size,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-Acme-Album-Id': album.id
      });
      
      // 优化Windows系统下的文件处理
      if (process.platform === 'win32') {
        // Windows系统下，等待一段时间确保文件写入完成并释放
        console.log('Windows环境检测到，等待文件系统同步...');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // 使用流式传输文件，提高性能和可靠性
      console.log('准备传输ZIP文件到客户端');
      
      const fileStream = fs.createReadStream(zipFilePath, {
        highWaterMark: 1024 * 1024, // 使用1MB的缓冲区
        flags: 'r'                  // 只读模式
      });
      
      // 设置文件流错误处理
      fileStream.on('error', (err) => {
        console.error('文件读取流错误:', err);
        if (!res.headersSent) {
          res.status(500).json({ message: '读取ZIP文件时出错: ' + err.message });
        } else {
          res.end();
        }
        cleanupTempFiles(tempDir, zipFilePath);
      });
      
      // 处理客户端断开连接
      req.on('close', () => {
        console.log('客户端连接关闭');
        fileStream.destroy(); // 立即停止读取流
        
        // 延迟清理，确保连接完全释放
        setTimeout(() => {
          cleanupTempFiles(tempDir, zipFilePath);
        }, 5000);
      });
      
      // 设置请求超时为60分钟
      req.socket.setTimeout(60 * 60 * 1000);
      
      // 监听响应结束事件，清理临时文件
      res.on('finish', () => {
        console.log('响应结束，开始清理临时文件');
        setTimeout(() => {
          cleanupTempFiles(tempDir, zipFilePath);
        }, 5000);
      });
      
      // 防止在流传输过程中出现错误后资源泄露
      fileStream.pipe(res).on('error', (err) => {
        console.error('流传输过程中出错:', err);
        if (!res.finished) {
          res.end();
        }
        cleanupTempFiles(tempDir, zipFilePath);
      });
      
    } catch (error) {
      console.error('创建或传输ZIP文件时发生错误:', error);
      
      // 确保没有发送过头信息再发送错误响应
      if (!res.headersSent) {
        res.status(500).json({ 
          message: '下载文件生成失败', 
          error: error.message 
        });
      } else {
        res.end();
      }
      
      // 清理临时文件
      cleanupTempFiles(tempDir, zipFilePath);
    }
  } catch (error) {
    console.error('生成专辑发行文件错误:', error);
    
    // 确保没有发送过头信息再发送错误响应
    if (!res.headersSent) {
      let statusCode = 500;
      let errorMessage = '生成专辑发行文件失败';
      
      // 更详细的错误处理
      if (error.code === 'ENOENT') {
        statusCode = 404;
        errorMessage = '文件不存在: ' + error.path;
      } else if (error.code === 'EPERM' || error.code === 'EACCES') {
        errorMessage = '文件访问权限错误: ' + error.message;
      } else if (error.code === 'EMFILE' || error.code === 'ENFILE') {
        errorMessage = '系统打开的文件数达到上限，请稍后再试';
      }
      
      res.status(statusCode).json({
        message: errorMessage,
        error: error.message,
        code: error.code
      });
    } else {
      res.end();
    }
    
    // 清理临时文件
    cleanupTempFiles(tempDir, zipFilePath);
  }
});

// 辅助函数：清理临时文件
function cleanupTempFiles(tempDir, zipFilePath) {
  try {
    if (!tempDir && !zipFilePath) return;
    
    // 使用异步操作，避免阻塞主线程
    setTimeout(() => {
      try {
        if (tempDir && fs.existsSync(tempDir)) {
          fs.rmSync(tempDir, { recursive: true, force: true });
          console.log('临时目录已删除:', tempDir);
        }
        
        if (zipFilePath && fs.existsSync(zipFilePath)) {
          // 在Windows上，可能需要多次尝试删除文件
          let maxAttempts = 3;
          let attempt = 1;
          
          const tryDelete = () => {
            try {
              fs.unlinkSync(zipFilePath);
              console.log('ZIP文件已删除:', zipFilePath);
            } catch (err) {
              if (err.code === 'EPERM' && attempt < maxAttempts) {
                console.log(`删除文件失败(尝试${attempt}/${maxAttempts})，将在1秒后重试`);
                attempt++;
                setTimeout(tryDelete, 1000);
              } else {
                console.error('无法删除ZIP文件:', err);
              }
            }
          };
          
          tryDelete();
        }
      } catch (err) {
        console.error('清理临时文件失败:', err);
      }
    }, 5000); // 延迟清理，确保文件不再被使用
  } catch (err) {
    console.error('设置清理任务失败:', err);
  }
}

// 上传授权书文件
router.post('/:id/authorization', auth, uploadPDF.single('authorizationFile'), handleUploadError, async (req, res) => {
  try {
    const albumId = parseInt(req.params.id, 10);
    console.log('开始处理授权书上传请求，专辑ID:', albumId);
    
    if (isNaN(albumId)) {
      return res.status(400).json({ message: '专辑ID无效' });
    }

    // 记录请求信息
    console.log('授权书上传请求信息:', {
      albumId,
      userId: req.user.id,
      file: req.file ? {
        filename: req.file.filename,
        path: req.file.path,
        mimetype: req.file.mimetype,
        size: req.file.size,
        originalname: req.file.originalname
      } : 'No file uploaded'
    });

    const album = await Album.findOne({
      where: {
        id: albumId,
        submittedById: req.user.id
      }
    });

    console.log('查询到的专辑信息:', album ? {
      id: album.id,
      title: album.title,
      submittedById: album.submittedById,
      authorizationFile: album.authorizationFile
    } : 'No album found');

    if (!album) {
      return res.status(404).json({ message: '专辑不存在或无权限' });
    }

    if (!req.file) {
      return res.status(400).json({ 
        message: '请上传PDF格式的授权书文件'
      });
    }
    
    // 获取用户实名信息，用于重命名文件
    let userName = '';
    try {
      const userVerification = await UserVerification.findOne({
        where: { userId: req.user.id, status: 'approved' }
      });
      
      if (userVerification && userVerification.realName) {
        userName = userVerification.realName;
      } else {
        // 如果没有实名认证信息，使用用户名
        const user = await User.findByPk(req.user.id);
        userName = user ? user.username : '未知用户';
      }
      
      console.log('获取到的用户实名:', userName);
    } catch (err) {
      console.warn('获取用户实名信息失败:', err);
      userName = '未知用户';
    }

    // 重命名上传文件，使用指定格式
    const albumTitle = album.title || '未命名专辑';
    const customFileName = `授权书-${albumTitle}-${userName}2极音记.pdf`;
    console.log('自定义文件名:', customFileName);
    
    // 重命名文件
    const oldPath = req.file.path;
    const fileDir = path.dirname(oldPath);
    const newPath = path.join(fileDir, customFileName);
    
    try {
      fs.renameSync(oldPath, newPath);
      console.log(`文件重命名成功: ${oldPath} -> ${newPath}`);
      
      // 更新文件路径
      req.file.path = newPath;
      req.file.filename = customFileName;
    } catch (renameErr) {
      console.error('文件重命名失败:', renameErr);
      // 继续使用原始文件路径
    }

    // 更新专辑的授权书文件路径
    console.log('准备更新专辑授权书文件路径:', req.file.path);
    
    try {
      await album.update({
        authorizationFile: req.file.path
      });
      
      // 验证更新是否成功
      const updatedAlbum = await Album.findByPk(albumId);
      
      // 处理文件名，移除时间戳前缀
      let fileName = path.basename(updatedAlbum.authorizationFile);
      const timestampMatch = fileName.match(/^\d+-(.+)$/);
      if (timestampMatch && timestampMatch[1]) {
        fileName = timestampMatch[1];
      }
      
      console.log('更新后的专辑信息:', {
        id: updatedAlbum.id,
        authorizationFile: updatedAlbum.authorizationFile,
        updateSuccessful: updatedAlbum.authorizationFile === req.file.path,
        fileName: fileName,
        originalFileName: path.basename(updatedAlbum.authorizationFile)
      });
      
      if (updatedAlbum.authorizationFile !== req.file.path) {
        console.error('授权书文件路径更新失败，数据库中的值与预期不符');
      }
    } catch (updateError) {
      console.error('更新专辑授权书文件路径时出错:', updateError);
      throw updateError;
    }

    // 处理返回的文件名，移除时间戳前缀
    let fileName = path.basename(req.file.path);
    const timestampMatch = fileName.match(/^\d+-(.+)$/);
    if (timestampMatch && timestampMatch[1]) {
      fileName = timestampMatch[1];
    }
    
    res.status(200).json({
      message: '授权书上传成功',
      authorizationFile: req.file.path,
      fileName: fileName,
      originalFileName: path.basename(req.file.path)
    });
  } catch (error) {
    console.error('上传授权书错误:', error);
    res.status(400).json({ message: error.message });
  }
});

// 下载授权书文件
router.get('/:id/authorization', auth, async (req, res) => {
  try {
    const albumId = parseInt(req.params.id, 10);
    if (isNaN(albumId)) {
      return res.status(400).json({ message: '专辑ID无效' });
    }

    const album = await Album.findOne({
      where: {
        id: albumId,
        [Op.or]: [
          { submittedById: req.user.id },
          { '$User.role$': 'admin' }
        ]
      },
      include: [{ model: User }]
    });

    if (!album) {
      return res.status(404).json({ message: '专辑不存在或无权限' });
    }

    if (!album.authorizationFile) {
      return res.status(404).json({ message: '该专辑尚未上传授权书' });
    }

    // 检查文件是否存在
    if (!fs.existsSync(album.authorizationFile)) {
      return res.status(404).json({ message: '授权书文件不存在' });
    }

    // 获取文件名，处理可能的时间戳前缀
    let fileName = path.basename(album.authorizationFile);
    console.log('原始下载授权书文件名:', fileName);
    
    // 如果文件名包含时间戳前缀（格式：timestamp-filename.pdf），则移除前缀
    const timestampMatch = fileName.match(/^\d+-(.+)$/);
    if (timestampMatch && timestampMatch[1]) {
      fileName = timestampMatch[1];
      console.log('移除时间戳后的文件名:', fileName);
    }

    // 设置响应头
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${encodeURIComponent(fileName)}`);

    // 创建文件读取流并发送给客户端
    const fileStream = fs.createReadStream(album.authorizationFile);
    fileStream.pipe(res);
  } catch (error) {
    console.error('下载授权书错误:', error);
    res.status(400).json({ message: error.message });
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

    const album = await Album.findOne({
      where: {
        id: albumId,
        submittedById: req.user.id
      }
    });

    console.log('查询到的专辑信息:', album ? {
      id: album.id,
      title: album.title,
      submittedById: album.submittedById,
      authorizationFile: album.authorizationFile
    } : 'No album found');

    if (!album) {
      return res.status(404).json({ message: '专辑不存在或无权限' });
    }

    if (!album.authorizationFile) {
      return res.status(404).json({ message: '该专辑尚未上传授权书' });
    }

    // 删除文件
    try {
      if (fs.existsSync(album.authorizationFile)) {
        fs.unlinkSync(album.authorizationFile);
        console.log('授权书文件已从文件系统中删除:', album.authorizationFile);
      } else {
        console.log('授权书文件不存在于文件系统中:', album.authorizationFile);
      }
    } catch (fileError) {
      console.error('删除授权书文件时出错:', fileError);
      // 继续执行，即使文件删除失败也更新数据库
    }

    // 更新专辑记录，清除授权书文件路径
    await album.update({
      authorizationFile: null
    });
    
    console.log('专辑授权书文件路径已清除');

    res.status(200).json({
      message: '授权书删除成功'
    });
  } catch (error) {
    console.error('删除授权书错误:', error);
    res.status(400).json({ message: error.message });
  }
});

// 更新专辑信息
router.put('/:id', auth, async (req, res) => {
  try {
    const albumId = req.params.id;
    const { title, type, releaseDate, displayInfo, description } = req.body;
    
    // 查找专辑，确保用户有权限修改
    const album = await Album.findOne({
      where: {
        id: albumId,
        submittedById: req.user.id
      }
    });
    
    if (!album) {
      return res.status(403).json({ message: '无权修改此专辑或专辑不存在' });
    }
    
    // 检查专辑状态，只有草稿状态或已拒绝状态的专辑可以修改
    const isDraft = album.status === 'draft' || (album.comment && album.comment.includes('DRAFT'));
    const isRejected = album.status === 'rejected';
    
    console.log('更新专辑信息 - 状态检查:', {
      albumId: album.id,
      status: album.status,
      comment: album.comment,
      isDraft: isDraft,
      isRejected: isRejected
    });
    
    if (!isDraft && !isRejected) {
      return res.status(400).json({ message: '只能修改草稿状态或已拒绝状态的专辑' });
    }
    
    // 更新专辑信息
    await album.update({
      title: title || album.title,
      type: type || album.type,
      releaseDate: releaseDate || album.releaseDate,
      displayInfo: displayInfo || album.displayInfo,
      description: description || album.description
    });
    
    res.json({
      message: '专辑信息更新成功',
      album: {
        id: album.id,
        title: album.title,
        type: album.type,
        releaseDate: album.releaseDate,
        displayInfo: album.displayInfo,
        description: album.description
      }
    });
  } catch (error) {
    console.error('更新专辑信息错误:', error);
    res.status(500).json({ message: '更新专辑信息失败' });
  }
});

// 更新歌曲信息
router.put('/:albumId/songs/:songId', auth, async (req, res) => {
  try {
    const albumId = parseInt(req.params.albumId, 10);
    const songId = parseInt(req.params.songId, 10);
    const { title, genre, language, artists } = req.body;
    
    console.log('更新歌曲信息请求:', {
      albumId,
      songId,
      title,
      genre,
      language,
      artistsCount: artists?.length
    });
    
    // 查找专辑，确保用户有权限
    const album = await Album.findOne({
      where: {
        id: albumId,
        submittedById: req.user.id
      }
    });
    
    if (!album && req.user.role !== 'admin') {
      return res.status(403).json({ message: '无权修改此专辑' });
    }
    
    // 检查专辑状态，只有草稿状态或已拒绝状态的专辑可以修改
    // 草稿状态可以通过以下方式判断：
    // 1. album.status === 'draft'
    // 2. album.comment 包含 'DRAFT'
    const isDraft = album.status === 'draft' || (album.comment && album.comment.includes('DRAFT'));
    const isRejected = album.status === 'rejected';
    
    console.log('专辑状态检查:', {
      albumId: album.id,
      status: album.status,
      comment: album.comment,
      isDraft: isDraft,
      isRejected: isRejected
    });
    
    if (!isDraft && !isRejected) {
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
      title: title || song.title,
      genre: genre || song.genre,
      language: language || song.language
    });
    
    // 如果提供了歌手信息，更新歌手关联
    if (artists && Array.isArray(artists)) {
      // 清除现有的歌手关联
      await song.setArtists([]);
      
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
        }
      }
    }
    
    // 获取更新后的歌曲信息，包括关联的歌手
    const updatedSong = await Song.findByPk(songId, {
      include: [{
        model: Artist,
        as: 'Artists',
        through: { attributes: [] }
      }]
    });
    
    res.json({
      message: '歌曲信息更新成功',
      song: updatedSong
    });
  } catch (error) {
    console.error('更新歌曲信息错误:', error);
    res.status(500).json({ message: '更新歌曲信息失败' });
  }
});

// 添加新的路由 - 处理分片上传
router.post('/:id/upload-chunk', auth, uploadChunk.single('file'), async (req, res) => {
  try {
    console.log('接收到分片上传请求:', {
      albumId: req.params.id,
      fileId: req.body.fileId,
      chunkIndex: req.body.chunkIndex,
      totalChunks: req.body.totalChunks
    });

    // 验证请求参数
    if (!req.body.fileId || req.body.chunkIndex === undefined || !req.body.totalChunks) {
      return res.status(400).json({
        message: '缺少必要参数',
        detail: '需要提供fileId, chunkIndex和totalChunks'
      });
    }

    const albumId = parseInt(req.params.id, 10);
    if (isNaN(albumId)) {
      return res.status(400).json({ message: '专辑ID无效' });
    }

    // 检查专辑是否存在且属于当前用户
    const album = await Album.findOne({
      where: {
        id: albumId,
        submittedById: req.user.id
      }
    });

    if (!album) {
      return res.status(404).json({ message: '专辑不存在或无权限' });
    }

    // 分片存储成功，返回成功响应
    res.status(200).json({
      message: '分片上传成功',
      chunkIndex: req.body.chunkIndex,
      received: true
    });
  } catch (error) {
    console.error('上传分片错误:', error);
    res.status(500).json({ message: '上传分片失败', error: error.message });
  }
});

// 添加新的路由 - 合并分片
router.post('/:id/merge-chunks', auth, async (req, res) => {
  try {
    console.log('接收到合并分片请求:', {
      albumId: req.params.id,
      fileId: req.body.fileId,
      totalChunks: req.body.totalChunks,
      filename: req.body.filename
    });

    // 验证请求参数
    if (!req.body.fileId || !req.body.totalChunks || !req.body.filename) {
      return res.status(400).json({
        message: '缺少必要参数',
        detail: '需要提供fileId, totalChunks和filename'
      });
    }

    const albumId = parseInt(req.params.id, 10);
    if (isNaN(albumId)) {
      return res.status(400).json({ message: '专辑ID无效' });
    }

    // 检查专辑是否存在且属于当前用户
    const album = await Album.findOne({
      where: {
        id: albumId,
        submittedById: req.user.id
      }
    });

    if (!album) {
      return res.status(404).json({ message: '专辑不存在或无权限' });
    }

    // 合并分片
    const filePath = await mergeChunks(
      req.body.fileId,
      parseInt(req.body.totalChunks, 10),
      req.body.filename
    );

    // 验证歌曲信息参数
    if (!req.body.title || !req.body.genre || !req.body.language) {
      return res.status(400).json({ 
        message: '缺少必填字段: title, genre, language' 
      });
    }

    // 解析歌手信息
    let artists;
    try {
      artists = JSON.parse(req.body.artists);
      console.log('解析的歌手信息:', artists);
    } catch (error) {
      return res.status(400).json({ message: '歌手信息格式无效' });
    }

    // 创建歌手名称字符串，用于文件命名
    const artistNames = artists.map(artist => artist.name).join('&');

    // 重命名合并后的文件，使用"专辑名-歌曲名-歌手名"格式
    const originalPath = filePath;
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
      const fullNewPath = path.join(dirName, newFileName);
      
      fs.renameSync(fullOriginalPath, fullNewPath);
      console.log(`文件重命名成功: ${originalPath} -> ${newPath}`);
      
      // 更新为相对路径
      finalFilePath = newPath.replace(/\\/g, '/');
      if (finalFilePath.includes('uploads/')) {
        finalFilePath = finalFilePath.substring(finalFilePath.indexOf('uploads/'));
      }
    } catch (renameErr) {
      console.error('文件重命名失败:', renameErr);
      
      // 确保原始路径也是相对路径
      finalFilePath = originalPath.replace(/\\/g, '/');
      if (finalFilePath.includes('uploads/')) {
        finalFilePath = finalFilePath.substring(finalFilePath.indexOf('uploads/'));
      }
    }

    // 创建新的歌曲记录
    const existingSongs = await Song.count({ where: { albumId: albumId } });
    const trackNumber = existingSongs + 1;

    // 音频时长可以在这里提取（示例）
    let duration = null;
    try {
      // 音频分析可以在这里添加
      duration = Math.floor(Math.random() * 180) + 120;
    } catch (err) {
      console.warn('无法获取音频时长:', err.message);
    }

    const songData = {
      title: req.body.title,
      genre: req.body.genre,
      language: req.body.language,
      wavFile: finalFilePath, // 使用重命名后的文件路径
      albumId: albumId,
      trackNumber: trackNumber,
      duration: duration
    };

    const song = await Song.create(songData);

    // 处理歌手信息（如果提供）
    if (req.body.artists) {
      try {
        // 关联歌手
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
          
          await song.addArtist(artist);
        }
      } catch (error) {
        console.error('处理歌手信息出错:', error);
        // 即使歌手信息处理失败，我们仍然返回歌曲
      }
    }

    // 获取完整的歌曲信息
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
      wavFile: populatedSong.wavFile ? `${STATIC_BASE_URL}/${populatedSong.wavFile}` : null,
      Artists: populatedSong.Artists || []
    };

    res.status(201).json({
      message: '文件上传成功并创建歌曲',
      song: processedSong
    });
  } catch (error) {
    console.error('合并分片错误:', error);
    res.status(500).json({ message: '合并分片失败', error: error.message });
  }
});

module.exports = router; 