const express = require('express');
const router = express.Router();
const { AlbumLink, AlbumLinkSong, Album, Song, User } = require('../models');
const { auth, adminAuth } = require('../middleware/auth');
const { uploadImage, handleUploadError } = require('../middleware/upload');
const { Op } = require('sequelize');
const path = require('path');
const fs = require('fs');
const { getThumbnailPath } = require('../utils/imageProcessor');
const { isDev } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

// 静态文件URL前缀
const STATIC_BASE_URL = isDev ? 'http://localhost:3000' : 'https://www.acmetone.com';

// 获取当前用户的专辑链接
router.get('/user', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const search = req.query.search || '';
    const status = req.query.status || '';
    const albumId = req.query.albumId ? parseInt(req.query.albumId) : null;
    const userId = req.user.id;

    const offset = (page - 1) * pageSize;

    // 查询用户创建的专辑链接或用户拥有的专辑对应的链接
    const userAlbumIds = await Album.findAll({
      where: { submittedById: userId },
      attributes: ['id']
    }).then(albums => albums.map(album => album.id));

    let whereClause = {
      [Op.or]: [
        { createdById: userId },
        { internalAlbumId: { [Op.in]: userAlbumIds } }
      ]
    };
    
    // 如果提供了albumId，添加到查询条件中
    if (albumId) {
      whereClause = { internalAlbumId: albumId };
    }
    
    if (search) {
      whereClause[Op.and] = [
        whereClause,
        {
          [Op.or]: [
        { title: { [Op.like]: `%${search}%` } },
        { albumName: { [Op.like]: `%${search}%` } },
        { artistName: { [Op.like]: `%${search}%` } },
          ]
        }
      ];
    }
    
    if (status) {
      whereClause[Op.and] = whereClause[Op.and] || [];
      whereClause[Op.and].push({ isActive: status === 'active' });
    }

    const { count, rows } = await AlbumLink.findAndCountAll({
      where: whereClause,
      include: [
        { model: User, as: 'createdBy', attributes: ['id', 'username', 'email'] },
        { model: Album, as: 'internalAlbum', attributes: ['id', 'title', 'performer', 'submittedById'] }
      ],
      order: [['createdAt', 'DESC']],
      limit: pageSize,
      offset: offset,
    });

    // 添加一个标志，指示用户是否是该专辑的拥有者
    const links = rows.map(link => {
      const linkData = link.toJSON();
      linkData.isAlbumOwner = link.internalAlbum && link.internalAlbum.submittedById === userId;
      return linkData;
    });

    res.json({
      links,
      total: count,
      page,
      pageSize,
      totalPages: Math.ceil(count / pageSize),
    });
  } catch (error) {
    console.error('获取用户专辑链接列表失败:', error);
    res.status(500).json({ message: error.message });
  }
});

// 用户更新自己的专辑链接
router.put('/user/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    // 查找专辑链接
    const albumLink = await AlbumLink.findOne({
      where: { id },
      include: [
        { model: Album, as: 'internalAlbum', attributes: ['id', 'submittedById'] }
      ]
    });
    
    if (!albumLink) {
      return res.status(404).json({ message: '专辑链接不存在' });
    }
    
    // 检查用户是否有权限更新此链接
    // 允许链接创建者或专辑拥有者进行更新
    const isCreator = albumLink.createdById === userId;
    const isAlbumOwner = albumLink.internalAlbum && albumLink.internalAlbum.submittedById === userId;
    
    if (!isCreator && !isAlbumOwner) {
      return res.status(403).json({ message: '您无权修改此专辑链接' });
    }
    
    // 只允许更新平台链接字段
    const {
      netease,
      qq,
      kugou,
      kuwo,
      qishui,
      spotify,
      youtube,
      appleMusic,
      soundCloud
    } = req.body;
    
    // 更新链接
    await albumLink.update({
      netease: netease || null,
      qq: qq || null,
      kugou: kugou || null,
      kuwo: kuwo || null,
      qishui: qishui || null,
      spotify: spotify || null,
      youtube: youtube || null,
      appleMusic: appleMusic || null,
      soundCloud: soundCloud || null
    });
    
    // 返回更新后的链接
    res.json(albumLink);
  } catch (error) {
    console.error('用户更新专辑链接失败:', error);
    res.status(500).json({ message: error.message || '更新专辑链接失败' });
  }
});

// 管理员获取所有专辑链接（带分页和搜索）
router.get('/', adminAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const search = req.query.search || '';
    
    const offset = (page - 1) * pageSize;
    
    // 构建查询条件
    let whereClause = {};
    if (search) {
      whereClause = {
        [Op.or]: [
          { title: { [Op.like]: `%${search}%` } },
          { albumName: { [Op.like]: `%${search}%` } },
          { artistName: { [Op.like]: `%${search}%` } },
          { slug: { [Op.like]: `%${search}%` } }
        ]
      };
    }
    
    // 查询总数
    const total = await AlbumLink.count({ where: whereClause });
    
    // 查询分页数据
    const links = await AlbumLink.findAll({
      where: whereClause,
      include: [
        {
          model: AlbumLinkSong,
          as: 'songs',
          required: false
        },
        {
          model: User,
          as: 'createdBy',
          attributes: ['id', 'username', 'email']
        },
        {
          model: Album,
          as: 'internalAlbum',
          attributes: ['id', 'title', 'displayInfo'],
          required: false
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: pageSize,
      offset: offset
    });
    
    res.json({
      links,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    });
  } catch (error) {
    console.error('获取专辑链接列表失败:', error);
    res.status(500).json({ message: error.message });
  }
});

// 通过ID获取专辑链接详情（管理员API）
router.get('/id/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const albumLink = await AlbumLink.findByPk(id, {
      include: [
        {
          model: AlbumLinkSong,
          as: 'songs',
          required: false,
          order: [['trackNumber', 'ASC']],
          include: [
            {
              model: Song,
              as: 'internalSong',
              required: false,
              include: [
                {
                  model: require('../models').Artist,
                  as: 'Artists',
                  through: require('../models').SongArtist,
                  attributes: ['id', 'name']
                }
              ]
            }
          ]
        },
        {
          model: Album,
          as: 'internalAlbum',
          attributes: ['id', 'title', 'displayInfo'],
          required: false
        },
        {
          model: User,
          as: 'createdBy',
          attributes: ['id', 'username', 'email']
        }
      ]
    });
    
    if (!albumLink) {
      return res.status(404).json({ message: '专辑链接不存在' });
    }
    
    // 将albumLink转换为普通对象
    const albumLinkData = albumLink.toJSON();
    
    // 处理歌曲的真实歌手信息
    if (albumLinkData.songs && albumLinkData.songs.length > 0) {
      albumLinkData.songs = albumLinkData.songs.map(song => {
        // 如果歌曲有关联的内部歌曲及其歌手
        if (song.internalSong && song.internalSong.Artists && song.internalSong.Artists.length > 0) {
          console.log(`为歌曲 ${song.songName} (ID: ${song.id}) 设置歌手名称，从关联内部歌曲ID: ${song.internalSongId}`);
          // 从内部歌曲中提取歌手信息
          const artistNames = song.internalSong.Artists.map(artist => artist.name);
          song.internalArtistName = artistNames.join(' & ');
          console.log(`设置歌曲 ${song.songName} 的歌手为: ${song.internalArtistName}`);
        }
        return song;
      });
    }
    
    // 处理专辑封面的缩略图
    if (albumLinkData.coverImage && albumLinkData.coverImage.startsWith('/uploads/')) {
      try {
        // 保存原始图片路径
        albumLinkData.originalCoverImage = albumLinkData.coverImage;
        
        // 获取绝对路径
        const absolutePath = path.join(__dirname, '../../', albumLinkData.coverImage);
        
        // 检查原始图片是否存在
        if (!fs.existsSync(absolutePath)) {
          console.error('原始封面图片不存在:', absolutePath);
          albumLinkData.coverImageStatus = 'missing';
          // 如果原图不存在，直接返回，不尝试获取缩略图
        } else {
          // 获取缩略图路径
          const thumbnailPath = await getThumbnailPath(absolutePath);
          // 转换为相对路径
          const relativeThumbnailPath = path.relative(path.join(__dirname, '../../'), thumbnailPath);
          // 添加缩略图专用字段
          albumLinkData.coverImageThumbnail = relativeThumbnailPath.replace(/\\/g, '/');
          // 更新主图片路径为缩略图
          albumLinkData.coverImage = relativeThumbnailPath.replace(/\\/g, '/');
          albumLinkData.coverImageStatus = 'ok';
        }
      } catch (error) {
        console.error('处理专辑链接封面缩略图失败:', error);
        albumLinkData.coverImageStatus = 'error';
        // 如果处理失败，使用原图
      }
    } else if (albumLinkData.coverImage && !albumLinkData.coverImage.startsWith('/uploads/')) {
      // 外部图片链接，标记状态
      albumLinkData.coverImageStatus = 'external';
    }
    
    res.json(albumLinkData);
  } catch (error) {
    console.error('通过ID获取专辑链接详情失败:', error);
    res.status(500).json({ message: error.message });
  }
});

// 获取单个专辑链接详情（公开API，通过slug访问）
router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    
    const albumLink = await AlbumLink.findOne({
      where: {
        slug,
        isActive: true
      },
      include: [
        {
          model: AlbumLinkSong,
          as: 'songs',
          required: false,
          order: [['trackNumber', 'ASC']],
          include: [
            {
              model: Song,
              as: 'internalSong',
              required: false,
              include: [
                {
                  model: require('../models').Artist,
                  as: 'Artists',
                  through: require('../models').SongArtist,
                  attributes: ['id', 'name']
                }
              ]
            }
          ]
        },
        {
          model: Album,
          as: 'internalAlbum',
          attributes: ['id', 'title', 'displayInfo'],
          required: false
        }
      ]
    });
    
    if (!albumLink) {
      return res.status(404).json({ message: '专辑链接不存在或已被禁用' });
    }
    
    // 将albumLink转换为普通对象
    const albumLinkData = albumLink.toJSON();
    
    // 处理歌曲的真实歌手信息
    if (albumLinkData.songs && albumLinkData.songs.length > 0) {
      albumLinkData.songs = albumLinkData.songs.map(song => {
        // 如果歌曲有关联的内部歌曲及其歌手
        if (song.internalSong && song.internalSong.Artists && song.internalSong.Artists.length > 0) {
          console.log(`为歌曲 ${song.songName} (ID: ${song.id}) 设置歌手名称，从关联内部歌曲ID: ${song.internalSongId}`);
          // 从内部歌曲中提取歌手信息
          const artistNames = song.internalSong.Artists.map(artist => artist.name);
          song.internalArtistName = artistNames.join(' & ');
          console.log(`设置歌曲 ${song.songName} 的歌手为: ${song.internalArtistName}`);
        }
        return song;
      });
    }
    
    // 处理专辑封面的缩略图
    if (albumLinkData.coverImage && albumLinkData.coverImage.startsWith('/uploads/')) {
      try {
        // 保存原始图片路径
        albumLinkData.originalCoverImage = albumLinkData.coverImage;
        
        // 获取绝对路径
        const absolutePath = path.join(__dirname, '../../', albumLinkData.coverImage);
        
        // 检查原始图片是否存在
        if (!fs.existsSync(absolutePath)) {
          console.error('原始封面图片不存在:', absolutePath);
          albumLinkData.coverImageStatus = 'missing';
          // 如果原图不存在，直接返回，不尝试获取缩略图
        } else {
          // 获取缩略图路径
          const thumbnailPath = await getThumbnailPath(absolutePath);
          // 转换为相对路径
          const relativeThumbnailPath = path.relative(path.join(__dirname, '../../'), thumbnailPath);
          // 添加缩略图专用字段
          albumLinkData.coverImageThumbnail = relativeThumbnailPath.replace(/\\/g, '/');
          // 更新主图片路径为缩略图
          albumLinkData.coverImage = relativeThumbnailPath.replace(/\\/g, '/');
          albumLinkData.coverImageStatus = 'ok';
        }
      } catch (error) {
        console.error('处理专辑链接封面缩略图失败:', error);
        albumLinkData.coverImageStatus = 'error';
        // 如果处理失败，使用原图
      }
    } else if (albumLinkData.coverImage && !albumLinkData.coverImage.startsWith('/uploads/')) {
      // 外部图片链接，标记状态
      albumLinkData.coverImageStatus = 'external';
    }
    
    res.json(albumLinkData);
  } catch (error) {
    console.error('通过slug获取专辑链接详情失败:', error);
    res.status(500).json({ message: error.message });
  }
});

// 普通用户专辑链接管理API - 获取专辑链接
router.get('/user-album-links/:albumId', auth, async (req, res) => {
  try {
    const { albumId } = req.params;
    const userId = req.user.id;
    
    // 首先检查用户是否有权限访问该专辑
    const album = await Album.findOne({
      where: {
        id: albumId,
        submittedById: userId,
        status: 'approved' // 只允许已审核通过的专辑创建链接
      }
    });
    
    if (!album) {
      return res.status(403).json({ message: '您没有权限管理此专辑的链接或专辑未通过审核' });
    }
    
    // 查找该专辑是否已有链接
    const albumLink = await AlbumLink.findOne({
      where: {
        internalAlbumId: albumId
      }
    });
    
    if (!albumLink) {
      return res.status(404).json({ message: '未找到专辑链接，请创建新的链接' });
    }
    
    // 检查链接是否应该激活（基于发行日期）
    const releaseDate = new Date(album.releaseDate);
    const now = new Date();
    
    // 如果当前时间已经超过发行日期，且链接未激活，则自动激活
    if (now >= releaseDate && !albumLink.isActive) {
      albumLink.isActive = true;
      await albumLink.save();
      console.log(`自动激活专辑链接: ${albumLink.id} (专辑ID: ${albumId})`);
    }
    
    res.json(albumLink);
  } catch (error) {
    console.error('获取用户专辑链接失败:', error);
    res.status(500).json({ message: error.message });
  }
});

// 普通用户专辑链接管理API - 创建专辑链接
router.post('/user-album-links', auth, async (req, res) => {
  try {
    const { albumId, netease, qq, kugou, kuwo, qishui, spotify, youtube, appleMusic, soundCloud } = req.body;
    const userId = req.user.id;
    
    // 首先检查用户是否有权限访问该专辑
    const album = await Album.findOne({
      where: {
        id: albumId,
        submittedById: userId,
        status: 'approved' // 只允许已审核通过的专辑创建链接
      }
    });
    
    if (!album) {
      return res.status(403).json({ message: '您没有权限管理此专辑的链接或专辑未通过审核' });
    }
    
    // 检查是否已存在链接
    const existingLink = await AlbumLink.findOne({
      where: {
        internalAlbumId: albumId
      }
    });
    
    if (existingLink) {
      return res.status(400).json({ message: '该专辑已有链接，请使用更新API' });
    }
    
    // 生成slug
    const slug = `${album.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString(36)}`;
    
    // 检查链接是否应该激活（基于发行日期）
    const releaseDate = new Date(album.releaseDate);
    const now = new Date();
    const isActive = now >= releaseDate;
    
    // 创建新的专辑链接
    const newAlbumLink = await AlbumLink.create({
      title: album.title,
      albumName: album.title,
      artistName: album.performer,
      releaseDate: album.releaseDate,
      description: album.description,
      slug,
      albumType: 'internal',
      internalAlbumId: albumId,
      coverImage: album.coverImage,
      netease,
      qq,
      kugou,
      kuwo,
      qishui,
      spotify,
      youtube,
      appleMusic,
      soundCloud,
      isActive,
      createdById: userId
    });
    
    res.status(201).json(newAlbumLink);
  } catch (error) {
    console.error('创建用户专辑链接失败:', error);
    res.status(500).json({ message: error.message });
  }
});

// 普通用户专辑链接管理API - 更新专辑链接
router.put('/user-album-links/:albumId', auth, async (req, res) => {
  try {
    const { albumId } = req.params;
    const { netease, qq, kugou, kuwo, qishui, spotify, youtube, appleMusic, soundCloud } = req.body;
    const userId = req.user.id;
    
    // 首先检查用户是否有权限访问该专辑
    const album = await Album.findOne({
      where: {
        id: albumId,
        submittedById: userId,
        status: 'approved' // 只允许已审核通过的专辑更新链接
      }
    });
    
    if (!album) {
      return res.status(403).json({ message: '您没有权限管理此专辑的链接或专辑未通过审核' });
    }
    
    // 查找该专辑的链接
    const albumLink = await AlbumLink.findOne({
      where: {
        internalAlbumId: albumId
      }
    });
    
    if (!albumLink) {
      return res.status(404).json({ message: '未找到专辑链接，请先创建链接' });
    }
    
    // 检查链接是否应该激活（基于发行日期）
    const releaseDate = new Date(album.releaseDate);
    const now = new Date();
    
    // 如果当前时间已经超过发行日期，且链接未激活，则自动激活
    if (now >= releaseDate && !albumLink.isActive) {
      albumLink.isActive = true;
    }
    
    // 更新链接信息 - 只允许更新平台链接，不允许修改其他信息
    await albumLink.update({
      netease,
      qq,
      kugou,
      kuwo,
      qishui,
      spotify,
      youtube,
      appleMusic,
      soundCloud
    });
    
    res.json(albumLink);
  } catch (error) {
    console.error('更新用户专辑链接失败:', error);
    res.status(500).json({ message: error.message });
  }
});

// 获取公开的专辑链接列表（用于首页展示）
router.get('/public/list', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    
    const offset = (page - 1) * pageSize;
    
    // 查询总数
    const total = await AlbumLink.count({
      where: {
        isActive: true
      }
    });
    
    // 查询分页数据
    const links = await AlbumLink.findAll({
      where: {
        isActive: true
      },
      include: [
        {
          model: AlbumLinkSong,
          as: 'songs',
          required: false,
          include: [
            {
              model: Song,
              as: 'internalSong',
              required: false,
              include: [
                {
                  model: require('../models').Artist,
                  as: 'Artists',
                  through: require('../models').SongArtist,
                  attributes: ['id', 'name']
                }
              ]
            }
          ]
        }
      ],
      order: [['releaseDate', 'DESC'], ['createdAt', 'DESC']],
      limit: pageSize,
      offset: offset
    });
    
    // 处理封面缩略图
    const processedLinks = await Promise.all(links.map(async (link) => {
      const linkData = link.toJSON();
      
      // 处理歌曲的真实歌手信息
      if (linkData.songs && linkData.songs.length > 0) {
        linkData.songs = linkData.songs.map(song => {
          // 如果歌曲有关联的内部歌曲及其歌手
          if (song.internalSong && song.internalSong.Artists && song.internalSong.Artists.length > 0) {
            console.log(`为歌曲 ${song.songName} (ID: ${song.id}) 设置歌手名称，从关联内部歌曲ID: ${song.internalSongId}`);
            // 从内部歌曲中提取歌手信息
            const artistNames = song.internalSong.Artists.map(artist => artist.name);
            song.internalArtistName = artistNames.join(' & ');
            console.log(`设置歌曲 ${song.songName} 的歌手为: ${song.internalArtistName}`);
          }
          return song;
        });
      }
      
      // 处理专辑封面的缩略图
      if (linkData.coverImage && linkData.coverImage.startsWith('/uploads/')) {
        try {
          // 保存原始图片路径
          linkData.originalCoverImage = linkData.coverImage;
          
          // 获取绝对路径
          const absolutePath = path.join(__dirname, '../../', linkData.coverImage);
          
          // 检查原始图片是否存在
          if (!fs.existsSync(absolutePath)) {
            console.error('原始封面图片不存在:', absolutePath);
            linkData.coverImageStatus = 'missing';
            // 如果原图不存在，直接返回，不尝试获取缩略图
          } else {
            // 获取缩略图路径
            const thumbnailPath = await getThumbnailPath(absolutePath);
            // 转换为相对路径
            const relativeThumbnailPath = path.relative(path.join(__dirname, '../../'), thumbnailPath);
            // 添加缩略图专用字段
            linkData.coverImageThumbnail = relativeThumbnailPath.replace(/\\/g, '/');
            // 更新主图片路径为缩略图
            linkData.coverImage = relativeThumbnailPath.replace(/\\/g, '/');
            linkData.coverImageStatus = 'ok';
          }
        } catch (error) {
          console.error('处理专辑链接封面缩略图失败:', error);
          linkData.coverImageStatus = 'error';
          // 如果处理失败，使用原图
        }
      } else if (linkData.coverImage && !linkData.coverImage.startsWith('/uploads/')) {
        // 外部图片链接，标记状态
        linkData.coverImageStatus = 'external';
      }
      
      return linkData;
    }));
    
    res.json({
      links: processedLinks,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    });
  } catch (error) {
    console.error('获取公开专辑链接列表失败:', error);
    res.status(500).json({ message: error.message });
  }
});

// 添加与/public/list相同功能的路由，用于兼容前端调用
router.get('/public/album-links', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    
    const offset = (page - 1) * pageSize;
    
    // 查询总数
    const total = await AlbumLink.count({
      where: {
        isActive: true
      }
    });
    
    // 查询分页数据
    const links = await AlbumLink.findAll({
      where: {
        isActive: true
      },
      include: [
        {
          model: AlbumLinkSong,
          as: 'songs',
          required: false,
          include: [
            {
              model: Song,
              as: 'internalSong',
              required: false,
              include: [
                {
                  model: require('../models').Artist,
                  as: 'Artists',
                  through: require('../models').SongArtist,
                  attributes: ['id', 'name']
                }
              ]
            }
          ]
        }
      ],
      order: [['releaseDate', 'DESC'], ['createdAt', 'DESC']],
      limit: pageSize,
      offset: offset
    });
    
    // 处理封面缩略图
    const processedLinks = await Promise.all(links.map(async (link) => {
      const linkData = link.toJSON();
      
      // 处理歌曲的真实歌手信息
      if (linkData.songs && linkData.songs.length > 0) {
        linkData.songs = linkData.songs.map(song => {
          // 如果歌曲有关联的内部歌曲及其歌手
          if (song.internalSong && song.internalSong.Artists && song.internalSong.Artists.length > 0) {
            console.log(`为歌曲 ${song.songName} (ID: ${song.id}) 设置歌手名称，从关联内部歌曲ID: ${song.internalSongId}`);
            // 从内部歌曲中提取歌手信息
            const artistNames = song.internalSong.Artists.map(artist => artist.name);
            song.internalArtistName = artistNames.join(' & ');
            console.log(`设置歌曲 ${song.songName} 的歌手为: ${song.internalArtistName}`);
          }
          return song;
        });
      }
      
      // 处理专辑封面的缩略图
      if (linkData.coverImage && linkData.coverImage.startsWith('/uploads/')) {
        try {
          // 保存原始图片路径
          linkData.originalCoverImage = linkData.coverImage;
          
          // 获取绝对路径
          const absolutePath = path.join(__dirname, '../../', linkData.coverImage);
          
          // 检查原始图片是否存在
          if (!fs.existsSync(absolutePath)) {
            console.error('原始封面图片不存在:', absolutePath);
            linkData.coverImageStatus = 'missing';
            // 如果原图不存在，直接返回，不尝试获取缩略图
          } else {
            // 获取缩略图路径
            const thumbnailPath = await getThumbnailPath(absolutePath);
            // 转换为相对路径
            const relativeThumbnailPath = path.relative(path.join(__dirname, '../../'), thumbnailPath);
            // 添加缩略图专用字段
            linkData.coverImageThumbnail = relativeThumbnailPath.replace(/\\/g, '/');
            // 更新主图片路径为缩略图
            linkData.coverImage = relativeThumbnailPath.replace(/\\/g, '/');
            linkData.coverImageStatus = 'ok';
          }
        } catch (error) {
          console.error('处理专辑链接封面缩略图失败:', error);
          linkData.coverImageStatus = 'error';
          // 如果处理失败，使用原图
        }
      } else if (linkData.coverImage && !linkData.coverImage.startsWith('/uploads/')) {
        // 外部图片链接，标记状态
        linkData.coverImageStatus = 'external';
      }
      
      return linkData;
    }));
    
    res.json({
      links: processedLinks,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    });
  } catch (error) {
    console.error('获取公开专辑链接列表失败:', error);
    res.status(500).json({ message: error.message });
  }
});

// Toggle album link status
router.put('/:id/toggle-status', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const albumLink = await AlbumLink.findByPk(id);

    if (!albumLink) {
      return res.status(404).json({ message: '专辑链接不存在' });
    }

    albumLink.isActive = !albumLink.isActive;
    await albumLink.save();

    res.json({ message: '状态切换成功', albumLink });
  } catch (error) {
    console.error('切换专辑链接状态失败:', error);
    res.status(500).json({ message: error.message });
  }
});

// 创建新的专辑链接
router.post('/', adminAuth, uploadImage.single('coverImage'), handleUploadError, async (req, res) => {
  try {
    // 解析请求数据
    const {
      title,
      albumName,
      artistName,
      releaseDate,
      slug,
      description,
      internalAlbumId,
      albumType = 'external',
      uploadType = 'local',
      coverImageUrl,
      autoImportSongs = false, // 默认不自动导入歌曲
      netease,
      qq,
      kugou,
      kuwo,
      qishui,
      spotify,
      youtube,
      appleMusic,
      soundCloud
    } = req.body;
    
    // 验证必填字段
    if (!title || !albumName || !artistName || !releaseDate || !slug) {
      return res.status(400).json({ message: '缺少必填字段' });
    }
    
    // 检查slug是否已存在
    const existingSlug = await AlbumLink.findOne({ where: { slug } });
    if (existingSlug) {
      return res.status(400).json({ message: '页面标识符已存在，请使用其他标识符' });
    }
    
    // 处理封面图片
    let coverImage;
    
    if (uploadType === 'local' && req.file) {
      // 处理本地上传的图片
      const relativePath = req.file.path.replace(/\\/g, '/');
      coverImage = relativePath.includes('uploads/') 
        ? relativePath.substring(relativePath.indexOf('uploads/')) 
        : relativePath;
      
      // 生成封面缩略图
      try {
        const absolutePath = path.join(__dirname, '../../', coverImage);
        await getThumbnailPath(absolutePath);
      } catch (error) {
        console.error('生成专辑链接封面缩略图失败:', error);
        // 继续使用原图
      }
    } else if ((uploadType === 'remote' || uploadType === 'internal') && coverImageUrl) {
      // 使用外部图床链接或内部专辑封面
      console.log('使用图片URL:', uploadType, coverImageUrl);
      coverImage = coverImageUrl;
    } else if (albumType === 'internal' && internalAlbumId) {
      // 如果是内部专辑类型但没有提供封面，尝试从关联的内部专辑获取封面
      try {
        const internalAlbum = await Album.findByPk(internalAlbumId);
        if (internalAlbum && internalAlbum.coverImage) {
          console.log('从内部专辑获取封面:', internalAlbum.coverImage);
          coverImage = internalAlbum.coverImage;
          
          // 如果没有提供歌手名称，使用内部专辑的表演者信息
          if (!artistName && internalAlbum.performer) {
            artistName = internalAlbum.performer;
          }
        } else {
          return res.status(400).json({ message: '未找到关联专辑的封面图片，请手动上传封面' });
        }
      } catch (error) {
        console.error('获取内部专辑封面失败:', error);
        return res.status(400).json({ message: '获取内部专辑封面失败，请手动上传封面' });
      }
    } else {
      return res.status(400).json({ message: '请提供封面图片' });
    }
    
    // 创建专辑链接
    const albumLink = await AlbumLink.create({
      title,
      albumName,
      artistName,
      releaseDate,
      slug,
      description,
      coverImage,
      internalAlbumId: albumType === 'internal' ? internalAlbumId : null,
      albumType,
      isActive: true,
      createdById: req.user.id,
      netease: netease || null,
      qq: qq || null,
      kugou: kugou || null,
      kuwo: kuwo || null,
      qishui: qishui || null,
      spotify: spotify || null,
      youtube: youtube || null,
      appleMusic: appleMusic || null,
      soundCloud: soundCloud || null
    });
    
    // 如果是内部专辑类型并且需要自动导入歌曲
    if (albumType === 'internal' && internalAlbumId && (autoImportSongs === true || autoImportSongs === 'true')) {
      try {
        // 获取内部专辑的所有歌曲
        const songs = await Song.findAll({
          where: { albumId: internalAlbumId },
          order: [['trackNumber', 'ASC']]
        });
        
        console.log(`找到 ${songs.length} 首内部专辑歌曲，准备导入`);
        
        // 导入所有歌曲
        for (const song of songs) {
          await AlbumLinkSong.create({
            songName: song.title,
            trackNumber: song.trackNumber,
            albumLinkId: albumLink.id,
            internalSongId: song.id,
            artistName // 使用专辑的歌手名称
          });
        }
        
        console.log(`成功导入 ${songs.length} 首歌曲到专辑链接`);
      } catch (error) {
        console.error('导入内部专辑歌曲失败:', error);
        // 不影响专辑链接创建，继续执行
      }
    }
    
    res.status(201).json(albumLink);
  } catch (error) {
    console.error('创建专辑链接失败:', error);
    res.status(500).json({ message: error.message });
  }
});

// 创建专辑链接 - 内部专辑类型（不需要文件上传）
router.post('/internal', adminAuth, async (req, res) => {
  try {
    console.log('接收到创建内部专辑链接请求:', req.body);
    
    // 解析请求数据
    const {
      title,
      albumName,
      artistName,
      releaseDate,
      slug,
      description,
      internalAlbumId,
      coverImageUrl,
      autoImportSongs = true, // 默认自动导入歌曲
      netease,
      qq,
      kugou,
      kuwo,
      qishui,
      spotify,
      youtube,
      appleMusic,
      soundCloud
    } = req.body;
    
    // 验证必填字段
    if (!title || !albumName || !releaseDate || !slug || !internalAlbumId) {
      return res.status(400).json({ message: '缺少必填字段' });
    }
    
    // 检查slug是否已存在
    const existingSlug = await AlbumLink.findOne({ where: { slug } });
    if (existingSlug) {
      return res.status(400).json({ message: '页面标识符已存在，请使用其他标识符' });
    }
    
    // 获取内部专辑信息
    const internalAlbum = await Album.findByPk(internalAlbumId);
    if (!internalAlbum) {
      return res.status(400).json({ message: '未找到指定的内部专辑' });
    }
    
    // 优先使用内部专辑的表演者信息
    const finalArtistName = artistName || internalAlbum.performer || internalAlbum.displayInfo;
    if (!finalArtistName) {
      return res.status(400).json({ message: '缺少歌手名称，且内部专辑没有表演者信息' });
    }
    
    // 处理封面图片
    let coverImage;
    
    if (coverImageUrl) {
      // 使用提供的封面URL
      console.log('使用提供的内部专辑封面:', coverImageUrl);
      coverImage = coverImageUrl;
    } else {
      // 尝试从关联的内部专辑获取封面
      if (internalAlbum.coverImage) {
        console.log('从内部专辑获取封面:', internalAlbum.coverImage);
        coverImage = internalAlbum.coverImage;
      } else {
        return res.status(400).json({ message: '未找到关联专辑的封面图片，请提供封面URL' });
      }
    }
    
    // 创建专辑链接
    const albumLink = await AlbumLink.create({
      title,
      albumName,
      artistName: finalArtistName,
      releaseDate,
      slug,
      description,
      coverImage,
      internalAlbumId,
      albumType: 'internal',
      isActive: true,
      createdById: req.user.id,
      netease: netease || null,
      qq: qq || null,
      kugou: kugou || null,
      kuwo: kuwo || null,
      qishui: qishui || null,
      spotify: spotify || null,
      youtube: youtube || null,
      appleMusic: appleMusic || null,
      soundCloud: soundCloud || null
    });
    
    // 如果需要自动导入歌曲
    if (autoImportSongs === true || autoImportSongs === 'true') {
      try {
        // 获取内部专辑的所有歌曲
        const songs = await Song.findAll({
          where: { albumId: internalAlbumId },
          order: [['trackNumber', 'ASC']]
        });
        
        console.log(`找到 ${songs.length} 首内部专辑歌曲，准备导入`);
        
        // 导入所有歌曲
        for (const song of songs) {
          await AlbumLinkSong.create({
            songName: song.title,
            trackNumber: song.trackNumber,
            albumLinkId: albumLink.id,
            internalSongId: song.id,
            artistName: finalArtistName // 使用专辑的歌手名称
          });
        }
        
        console.log(`成功导入 ${songs.length} 首歌曲到专辑链接`);
      } catch (error) {
        console.error('导入内部专辑歌曲失败:', error);
        // 不影响专辑链接创建，继续执行
      }
    }
    
    res.status(201).json(albumLink);
  } catch (error) {
    console.error('创建内部专辑链接失败:', error);
    res.status(500).json({ message: error.message });
  }
});

// 创建专辑链接 - 基于Base64图像
router.post('/with-base64', adminAuth, async (req, res) => {
  try {
    console.log('接收到包含Base64图片的专辑链接创建请求');
    
    // 解析请求数据
    const {
      title,
      albumName,
      artistName,
      releaseDate,
      slug,
      description,
      internalAlbumId,
      albumType = 'external',
      uploadType = 'local',
      coverImageUrl,
      coverImageBase64, // 接收Base64编码的图片数据
      autoImportSongs = false,
      netease,
      qq,
      kugou,
      kuwo,
      qishui,
      spotify,
      youtube,
      appleMusic,
      soundCloud
    } = req.body;
    
    // 验证必填字段
    if (!title || !albumName || !artistName || !releaseDate || !slug) {
      return res.status(400).json({ message: '缺少必填字段' });
    }
    
    // 检查slug是否已存在
    const existingSlug = await AlbumLink.findOne({ where: { slug } });
    if (existingSlug) {
      return res.status(400).json({ message: '页面标识符已存在，请使用其他标识符' });
    }
    
    // 处理封面图片
    let coverImage;
    
    if (coverImageBase64) {
      // 处理Base64图片上传
      console.log('处理Base64图片数据...');
      
      try {
        // 解析Base64数据
        let base64Data = coverImageBase64;
        
        // 检查是否包含Data URL前缀，如果有则移除
        if (base64Data.includes('base64,')) {
          base64Data = base64Data.split('base64,')[1];
        }
        
        // 验证Base64数据有效性
        const imageBuffer = Buffer.from(base64Data, 'base64');
        
        // 验证图片大小
        if (imageBuffer.length > 25 * 1024 * 1024) { // 25MB限制
          return res.status(413).json({ 
            message: '图片大小超过限制',
            detail: '图片不能超过25MB',
            errorCode: 'IMAGE_TOO_LARGE'
          });
        }
        
        // 创建文件名
        const timestamp = Date.now();
        const uuid = uuidv4().substring(0, 8);
        const fileExt = '.jpg'; // 默认使用jpg格式
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
          size: imageBuffer.length
        });
        
        // 确保使用相对路径存储图片路径
        const relativePath = filePath.replace(/\\/g, '/');
        const normalizedPath = relativePath.includes('uploads/') 
          ? '/'+relativePath.substring(relativePath.indexOf('uploads/')) 
          : '/'+relativePath;
        
        coverImage = normalizedPath;
        
        // 生成封面缩略图
        try {
          const absolutePath = path.join(__dirname, '../../', coverImage.substring(1));
          await getThumbnailPath(absolutePath);
        } catch (error) {
          console.error('生成专辑链接封面缩略图失败:', error);
          // 继续使用原图
        }
      } catch (error) {
        console.error('处理Base64图片数据失败:', error);
        return res.status(400).json({ 
          message: '表单数据不完整', 
          detail: '处理图片数据失败，请重试',
          errorCode: 'IMAGE_PROCESSING_ERROR'
        });
      }
    } else if (coverImageUrl) {
      // 使用外部图床链接
      console.log('使用图片URL:', coverImageUrl);
      coverImage = coverImageUrl;
    } else {
      return res.status(400).json({ 
        message: '请提供封面图片', 
        errorCode: 'MISSING_COVER_IMAGE'
      });
    }
    
    // 创建专辑链接
    const albumLink = await AlbumLink.create({
      title,
      albumName,
      artistName,
      releaseDate,
      slug,
      description,
      coverImage,
      internalAlbumId: albumType === 'internal' ? internalAlbumId : null,
      albumType,
      isActive: true,
      createdById: req.user.id,
      netease: netease || null,
      qq: qq || null,
      kugou: kugou || null,
      kuwo: kuwo || null,
      qishui: qishui || null,
      spotify: spotify || null,
      youtube: youtube || null,
      appleMusic: appleMusic || null,
      soundCloud: soundCloud || null
    });
    
    res.status(201).json(albumLink);
  } catch (error) {
    console.error('创建专辑链接失败:', error);
    res.status(500).json({ 
      message: error.message || '创建专辑链接失败', 
      errorCode: 'CREATE_ALBUM_LINK_ERROR' 
    });
  }
});

// 更新专辑链接
router.put('/:id', adminAuth, uploadImage.single('coverImage'), handleUploadError, async (req, res) => {
  try {
    const { id } = req.params;
    
    // 查找专辑链接
    const albumLink = await AlbumLink.findByPk(id);
    if (!albumLink) {
      return res.status(404).json({ message: '专辑链接不存在' });
    }
    
    // 检查是否为JSON格式请求（内部专辑类型）
    const isJsonRequest = req.headers['content-type'] && 
                         req.headers['content-type'].includes('application/json');
    
    console.log('更新专辑链接请求类型:', req.headers['content-type'], '是否JSON格式:', isJsonRequest);
    
    // 检查是否只是更新isActive状态
    const isStatusUpdateOnly = req.body.isActive !== undefined && 
                              Object.keys(req.body).filter(key => key !== 'isActive').length === 0;
    
    // 如果只是更新状态，简化处理逻辑
    if (isStatusUpdateOnly) {
      await albumLink.update({
        isActive: req.body.isActive === 'true' || req.body.isActive === true
      });
      
      return res.json({
        ...albumLink.toJSON(),
        isActive: req.body.isActive === 'true' || req.body.isActive === true
      });
    }
    
    // 解析请求数据
    const {
      title,
      albumName,
      artistName,
      releaseDate,
      slug,
      description,
      internalAlbumId,
      albumType,
      isActive,
      uploadType = 'local',
      coverImageUrl,
      coverImageBase64,
      netease,
      qq,
      kugou,
      kuwo,
      qishui,
      spotify,
      youtube,
      appleMusic,
      soundCloud
    } = req.body;
    
    // 如果更新slug，检查是否已存在
    if (slug && slug !== albumLink.slug) {
      const existingSlug = await AlbumLink.findOne({ where: { slug } });
      if (existingSlug) {
        return res.status(400).json({ message: '页面标识符已存在，请使用其他标识符' });
      }
    }
    
    // 处理封面图片
    let coverImage = albumLink.coverImage;
    
    if (isJsonRequest && coverImageUrl) {
      // JSON格式请求中提供了coverImageUrl
      coverImage = coverImageUrl;
      console.log('JSON请求中提供了封面URL:', coverImageUrl);
    } else if (isJsonRequest && coverImageBase64) {
      // 处理Base64图片上传
      console.log('检测到Base64图片数据，准备处理...');
      
      try {
        // 解析Base64数据
        let base64Data = coverImageBase64;
        
        // 检查是否包含Data URL前缀，如果有则移除
        if (base64Data.includes('base64,')) {
          base64Data = base64Data.split('base64,')[1];
        }
        
        // 验证Base64数据有效性
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
        const fileExt = '.jpg'; // 默认使用jpg格式
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
          size: imageBuffer.length
        });
        
        // 确保使用相对路径存储图片路径
        const relativePath = filePath.replace(/\\/g, '/');
        const normalizedPath = relativePath.includes('uploads/') 
          ? relativePath.substring(relativePath.indexOf('uploads/')) 
          : relativePath;
        
        // 更新封面图片路径
        coverImage = normalizedPath;
        
        // 删除旧图片（如果是本地图片）
        if (albumLink.coverImage && albumLink.coverImage.startsWith('/uploads/')) {
          try {
            const oldImagePath = path.join(__dirname, '../../', albumLink.coverImage);
            if (fs.existsSync(oldImagePath)) {
              fs.unlinkSync(oldImagePath);
            }
            
            // 尝试删除缩略图
            const thumbnailDir = path.dirname(oldImagePath) + '/thumbnails';
            const thumbnailName = path.basename(oldImagePath);
            const thumbnailPath = path.join(thumbnailDir, thumbnailName);
            if (fs.existsSync(thumbnailPath)) {
              fs.unlinkSync(thumbnailPath);
            }
          } catch (error) {
            console.error('删除旧封面图片失败:', error);
            // 继续执行
          }
        }
        
        // 生成封面缩略图
        try {
          const absolutePath = path.join(__dirname, '../../', coverImage);
          await getThumbnailPath(absolutePath);
        } catch (error) {
          console.error('生成专辑链接封面缩略图失败:', error);
          // 继续使用原图
        }
      } catch (base64Error) {
        console.error('处理Base64图片数据失败:', base64Error);
        return res.status(400).json({ 
          message: 'Base64数据无效',
          detail: '无法解析提供的Base64图片数据'
        });
      }
    } else if (uploadType === 'local' && req.file) {
      // 处理本地上传的图片
      const relativePath = req.file.path.replace(/\\/g, '/');
      coverImage = relativePath.includes('uploads/') 
        ? relativePath.substring(relativePath.indexOf('uploads/')) 
        : relativePath;
      
      // 生成封面缩略图
      try {
        const absolutePath = path.join(__dirname, '../../', coverImage);
        await getThumbnailPath(absolutePath);
      } catch (error) {
        console.error('生成专辑链接封面缩略图失败:', error);
        // 继续使用原图
      }
      
      // 删除旧图片（如果是本地图片）
      if (albumLink.coverImage && albumLink.coverImage.startsWith('/uploads/')) {
        try {
          const oldImagePath = path.join(__dirname, '../../', albumLink.coverImage);
          if (fs.existsSync(oldImagePath)) {
            fs.unlinkSync(oldImagePath);
          }
          
          // 尝试删除缩略图
          const thumbnailDir = path.dirname(oldImagePath) + '/thumbnails';
          const thumbnailName = path.basename(oldImagePath);
          const thumbnailPath = path.join(thumbnailDir, thumbnailName);
          if (fs.existsSync(thumbnailPath)) {
            fs.unlinkSync(thumbnailPath);
          }
        } catch (error) {
          console.error('删除旧封面图片失败:', error);
          // 继续执行
        }
      }
    } else if ((uploadType === 'remote' || uploadType === 'internal') && coverImageUrl) {
      // 使用外部图床链接或内部专辑封面
      console.log('更新专辑链接：使用图片URL:', uploadType, coverImageUrl);
      coverImage = coverImageUrl;
    } else if (albumType === 'internal' && internalAlbumId && (!coverImage || albumType !== albumLink.albumType)) {
      // 如果切换到内部专辑类型或更改了关联专辑，尝试从关联的内部专辑获取封面
      try {
        const internalAlbum = await Album.findByPk(internalAlbumId);
        if (internalAlbum && internalAlbum.coverImage) {
          console.log('更新专辑链接：从内部专辑获取封面:', internalAlbum.coverImage);
          coverImage = internalAlbum.coverImage;
        }
      } catch (error) {
        console.error('获取内部专辑封面失败:', error);
        // 不抛出错误，继续使用原有封面
      }
    }
    
    // 更新专辑链接
    const updateData = {
      title: title || albumLink.title,
      albumName: albumName || albumLink.albumName,
      artistName: artistName || albumLink.artistName,
      releaseDate: releaseDate || albumLink.releaseDate,
      description: description !== undefined ? description : albumLink.description,
      internalAlbumId: albumType === 'internal' ? internalAlbumId : null,
      albumType: albumType || albumLink.albumType,
      isActive: isActive === 'true' || isActive === true,
      coverImage: coverImage,
      netease: netease || null,
      qq: qq || null,
      kugou: kugou || null,
      kuwo: kuwo || null,
      qishui: qishui || null,
      spotify: spotify || null,
      youtube: youtube || null,
      appleMusic: appleMusic || null,
      soundCloud: soundCloud || null
    };
    
    // 确保slug字段不为空，如果前端没有传递则使用原值
    updateData.slug = slug || albumLink.slug;
    
    console.log('更新数据:', updateData);
    
    await albumLink.update(updateData);
    
    // 返回更新后的数据
    const updatedAlbumLink = await AlbumLink.findByPk(id, {
      include: [
        {
          model: AlbumLinkSong,
          as: 'songs',
          required: false
        },
        {
          model: User,
          as: 'createdBy',
          attributes: ['id', 'username', 'email']
        },
        {
          model: Album,
          as: 'internalAlbum',
          attributes: ['id', 'title', 'displayInfo'],
          required: false
        }
      ]
    });
    
    res.json(updatedAlbumLink);
  } catch (error) {
    console.error('更新专辑链接失败:', error);
    res.status(500).json({ message: error.message });
  }
});

// 删除专辑链接
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // 查找专辑链接
    const albumLink = await AlbumLink.findByPk(id);
    if (!albumLink) {
      return res.status(404).json({ message: '专辑链接不存在' });
    }
    
    // 删除专辑链接的所有歌曲
    await AlbumLinkSong.destroy({
      where: { albumLinkId: id }
    });
    
    // 删除专辑链接
    await albumLink.destroy();
    
    // 删除封面图片（如果是本地图片）
    if (albumLink.coverImage && albumLink.coverImage.startsWith('/uploads/')) {
      try {
        const imagePath = path.join(__dirname, '../../', albumLink.coverImage);
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
        
        // 尝试删除缩略图
        const thumbnailDir = path.dirname(imagePath) + '/thumbnails';
        const thumbnailName = path.basename(imagePath);
        const thumbnailPath = path.join(thumbnailDir, thumbnailName);
        if (fs.existsSync(thumbnailPath)) {
          fs.unlinkSync(thumbnailPath);
        }
      } catch (error) {
        console.error('删除封面图片失败:', error);
        // 继续执行
      }
    }
    
    res.status(200).json({ message: '专辑链接已成功删除' });
  } catch (error) {
    console.error('删除专辑链接失败:', error);
    res.status(500).json({ message: error.message });
  }
});

// 添加歌曲到专辑链接
router.post('/:id/songs', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      songName,
      trackNumber,
      internalSongId,
      netease,
      qq,
      kugou,
      kuwo,
      qishui,
      spotify,
      youtube,
      appleMusic,
      soundCloud
    } = req.body;
    
    // 验证必填字段
    if (!songName || !trackNumber) {
      return res.status(400).json({ message: '缺少必填字段' });
    }
    
    // 查找专辑链接
    const albumLink = await AlbumLink.findByPk(id);
    if (!albumLink) {
      return res.status(404).json({ message: '专辑链接不存在' });
    }
    
    // 创建歌曲
    const song = await AlbumLinkSong.create({
      songName,
      trackNumber,
      albumLinkId: id,
      internalSongId: internalSongId || null,
      netease: netease || null,
      qq: qq || null,
      kugou: kugou || null,
      kuwo: kuwo || null,
      qishui: qishui || null,
      spotify: spotify || null,
      youtube: youtube || null,
      appleMusic: appleMusic || null,
      soundCloud: soundCloud || null
    });
    
    res.status(201).json(song);
  } catch (error) {
    console.error('添加歌曲失败:', error);
    res.status(500).json({ message: error.message });
  }
});

// 更新专辑链接中的歌曲
router.put('/:id/songs/:songId', adminAuth, async (req, res) => {
  try {
    const { id, songId } = req.params;
    const {
      songName,
      trackNumber,
      internalSongId,
      netease,
      qq,
      kugou,
      kuwo,
      qishui,
      spotify,
      youtube,
      appleMusic,
      soundCloud
    } = req.body;
    
    // 查找歌曲
    const song = await AlbumLinkSong.findOne({
      where: {
        id: songId,
        albumLinkId: id
      }
    });
    
    if (!song) {
      return res.status(404).json({ message: '歌曲不存在' });
    }
    
    // 更新歌曲
    await song.update({
      songName: songName || song.songName,
      trackNumber: trackNumber || song.trackNumber,
      internalSongId: internalSongId || null,
      netease: netease || null,
      qq: qq || null,
      kugou: kugou || null,
      kuwo: kuwo || null,
      qishui: qishui || null,
      spotify: spotify || null,
      youtube: youtube || null,
      appleMusic: appleMusic || null,
      soundCloud: soundCloud || null
    });
    
    res.json(song);
  } catch (error) {
    console.error('更新歌曲失败:', error);
    res.status(500).json({ message: error.message });
  }
});

// 删除专辑链接中的歌曲
router.delete('/:id/songs/:songId', adminAuth, async (req, res) => {
  try {
    const { id, songId } = req.params;
    
    // 查找歌曲
    const song = await AlbumLinkSong.findOne({
      where: {
        id: songId,
        albumLinkId: id
      }
    });
    
    if (!song) {
      return res.status(404).json({ message: '歌曲不存在' });
    }
    
    // 删除歌曲
    await song.destroy();
    
    res.status(200).json({ message: '歌曲已成功删除' });
  } catch (error) {
    console.error('删除歌曲失败:', error);
    res.status(500).json({ message: error.message });
  }
});

// 切换专辑链接状态（启用/禁用）
router.put('/:id/toggle-status', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // 查找专辑链接
    const albumLink = await AlbumLink.findByPk(id);
    if (!albumLink) {
      return res.status(404).json({ message: '专辑链接不存在' });
    }
    
    // 切换状态
    const newStatus = !albumLink.isActive;
    await albumLink.update({ isActive: newStatus });
    
    // 返回更新后的链接
    res.json({ 
      message: `专辑链接已${newStatus ? '启用' : '禁用'}`,
      albumLink: albumLink
    });
  } catch (error) {
    console.error('切换链接状态失败:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router; 