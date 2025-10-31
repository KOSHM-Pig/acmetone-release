const express = require('express');
const router = express.Router();
const { NewSongLink, User } = require('../models');
const { auth, adminAuth } = require('../middleware/auth');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const { Op } = require('sequelize');

// 配置上传中间件
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../../uploads/song_covers');
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
    const uniqueFilename = `${uuidv4()}${ext}`;
    console.log(`保存图片: ${uniqueFilename}, 原始名称: ${file.originalname}, MIME类型: ${file.mimetype}`);
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

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
});

// 上传错误处理中间件
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: '文件大小超过限制 (5MB)' });
    }
    return res.status(400).json({ message: `上传错误: ${err.message}` });
  } else if (err) {
    return res.status(400).json({ message: err.message });
  }
  next();
};

// 获取所有新曲链接列表（分页，管理员可见）
router.get('/', adminAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const offset = (page - 1) * pageSize;
    const search = req.query.search || '';
    
    const where = {};
    if (search) {
      where[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { songName: { [Op.like]: `%${search}%` } },
        { artistName: { [Op.like]: `%${search}%` } }
      ];
    }
    
    const { count, rows } = await NewSongLink.findAndCountAll({
      where,
      limit: pageSize,
      offset,
      order: [['createdAt', 'DESC']],
      include: [{ model: User, as: 'createdBy', attributes: ['id', 'username'] }]
    });
    
    return res.json({
      links: rows,
      total: count,
      page,
      pageSize,
      totalPages: Math.ceil(count / pageSize)
    });
  } catch (error) {
    console.error('获取新曲链接列表失败:', error);
    return res.status(500).json({ message: '获取新曲链接列表失败' });
  }
});

// 获取所有公开的新曲链接列表（分页，公开访问）
router.get('/public/list', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const offset = (page - 1) * pageSize;
    
    const { count, rows } = await NewSongLink.findAndCountAll({
      where: { isActive: true },
      limit: pageSize,
      offset,
      order: [['createdAt', 'DESC']],
      attributes: ['id', 'title', 'songName', 'artistName', 'coverImage', 'releaseDate', 'slug', 'createdAt']
    });
    
    return res.json({
      links: rows,
      total: count,
      page,
      pageSize,
      totalPages: Math.ceil(count / pageSize)
    });
  } catch (error) {
    console.error('获取公开新曲链接列表失败:', error);
    return res.status(500).json({ message: '获取公开新曲链接列表失败' });
  }
});

// 获取单个新曲链接详情（公开）
router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    
    const link = await NewSongLink.findOne({
      where: { slug, isActive: true },
      include: [{ model: User, as: 'createdBy', attributes: ['id', 'username'] }]
    });
    
    if (!link) {
      return res.status(404).json({ message: '链接页面不存在或已被禁用' });
    }
    
    return res.json(link);
  } catch (error) {
    console.error('获取新曲链接详情失败:', error);
    return res.status(500).json({ message: '获取新曲链接详情失败' });
  }
});

// 创建新曲链接（需要管理员权限）
router.post('/', adminAuth, upload.single('coverImage'), handleUploadError, async (req, res) => {
  try {
    const { 
      title, songName, artistName, releaseDate, slug, 
      description, netease, qq, kugou, kuwo, 
      qishui, spotify, youtube, appleMusic, soundCloud,
      uploadType, coverImageUrl
    } = req.body;
    
    // 检查必填字段
    if (!title || !songName || !artistName || !releaseDate || !slug) {
      return res.status(400).json({ message: '标题、歌曲名称、歌手名称、发布日期和页面标识符为必填项' });
    }
    
    // 检查slug唯一性
    const existingLink = await NewSongLink.findOne({ where: { slug } });
    if (existingLink) {
      return res.status(400).json({ message: '页面标识符已存在，请使用其他标识符' });
    }
    
    // 检查封面图片
    let coverImage;
    if (uploadType === 'remote' && coverImageUrl) {
      // 使用外部图床链接
      coverImage = coverImageUrl;
    } else if (req.file) {
      // 使用本地上传
      coverImage = `/uploads/song_covers/${req.file.filename}`;
    } else {
      return res.status(400).json({ message: '封面图片为必填项' });
    }
    
    // 创建新曲链接
    const newLink = await NewSongLink.create({
      title,
      songName,
      artistName,
      releaseDate,
      slug,
      description,
      coverImage,
      netease,
      qq,
      kugou,
      kuwo,
      qishui,
      spotify,
      youtube,
      appleMusic,
      soundCloud,
      createdById: req.user.id
    });
    
    return res.status(201).json(newLink);
  } catch (error) {
    console.error('创建新曲链接失败:', error);
    return res.status(500).json({ message: '创建新曲链接失败' });
  }
});

// 更新新曲链接（需要管理员权限）
router.put('/:id', adminAuth, upload.single('coverImage'), handleUploadError, async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      title, songName, artistName, releaseDate, slug, 
      description, netease, qq, kugou, kuwo, 
      qishui, spotify, youtube, appleMusic, soundCloud,
      isActive, uploadType, coverImageUrl
    } = req.body;
    
    // 查找要更新的链接
    const link = await NewSongLink.findByPk(id);
    if (!link) {
      return res.status(404).json({ message: '新曲链接不存在' });
    }
    
    // 检查slug唯一性（如果有变更）
    if (slug !== link.slug) {
      const existingLink = await NewSongLink.findOne({ where: { slug } });
      if (existingLink) {
        return res.status(400).json({ message: '页面标识符已存在，请使用其他标识符' });
      }
    }
    
    // 更新封面图片
    let coverImage = link.coverImage;
    
    if (uploadType === 'remote' && coverImageUrl) {
      // 如果更新为外部图床链接
      coverImage = coverImageUrl;
      
      // 如果原来是本地图片，删除旧文件
      if (link.coverImage && link.coverImage.startsWith('/uploads/')) {
        const oldFilePath = path.join(__dirname, '../../', link.coverImage);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }
    } else if (uploadType === 'local' && req.file) {
      // 如果更新为本地图片上传
      // 删除旧文件（如果是本地文件）
      if (link.coverImage && link.coverImage.startsWith('/uploads/')) {
        const oldFilePath = path.join(__dirname, '../../', link.coverImage);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }
      coverImage = `/uploads/song_covers/${req.file.filename}`;
    }
    
    // 更新链接信息
    await link.update({
      title: title || link.title,
      songName: songName || link.songName,
      artistName: artistName || link.artistName,
      releaseDate: releaseDate || link.releaseDate,
      slug: slug || link.slug,
      description: description !== undefined ? description : link.description,
      coverImage,
      netease: netease !== undefined ? netease : link.netease,
      qq: qq !== undefined ? qq : link.qq,
      kugou: kugou !== undefined ? kugou : link.kugou,
      kuwo: kuwo !== undefined ? kuwo : link.kuwo,
      qishui: qishui !== undefined ? qishui : link.qishui,
      spotify: spotify !== undefined ? spotify : link.spotify,
      youtube: youtube !== undefined ? youtube : link.youtube,
      appleMusic: appleMusic !== undefined ? appleMusic : link.appleMusic,
      soundCloud: soundCloud !== undefined ? soundCloud : link.soundCloud,
      isActive: isActive !== undefined ? isActive : link.isActive
    });
    
    return res.json(link);
  } catch (error) {
    console.error('更新新曲链接失败:', error);
    return res.status(500).json({ message: '更新新曲链接失败' });
  }
});

// 删除新曲链接（需要管理员权限）
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // 查找要删除的链接
    const link = await NewSongLink.findByPk(id);
    if (!link) {
      return res.status(404).json({ message: '新曲链接不存在' });
    }
    
    // 删除封面图片
    if (link.coverImage) {
      const filePath = path.join(__dirname, '../../', link.coverImage);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    
    // 删除链接记录
    await link.destroy();
    
    return res.json({ message: '新曲链接已成功删除' });
  } catch (error) {
    console.error('删除新曲链接失败:', error);
    return res.status(500).json({ message: '删除新曲链接失败' });
  }
});

module.exports = router; 