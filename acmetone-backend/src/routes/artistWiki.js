const express = require('express');
const router = express.Router();
const { Artist, User, Album, Song, sequelize } = require('../models');
const { auth, adminAuth } = require('../middleware/auth');
const { Op } = require('sequelize');
const axios = require('axios');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');

// 配置存储
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../../uploads/images');
    // 确保目录存在
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    // 确保缩略图目录存在
    const thumbDir = path.join(uploadDir, 'thumbnails');
    if (!fs.existsSync(thumbDir)) {
      fs.mkdirSync(thumbDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // 生成文件名: avatar_userId_timestamp.ext
    const userId = req.user ? req.user.id : 'unknown';
    const timestamp = Date.now();
    const fileId = uuidv4().substring(0, 8);
    const ext = path.extname(file.originalname);
    
    cb(null, `image_${timestamp}_${fileId}${ext}`);
  }
});

// 文件过滤器
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('不支持的文件类型。只允许JPG和PNG格式。'), false);
  }
};

// 创建multer实例
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

// 创建缩略图的辅助函数
async function createThumbnail(originalPath, filename) {
  try {
    const thumbDir = path.join(path.dirname(originalPath), 'thumbnails');
    const thumbPath = path.join(thumbDir, `thumb_${path.basename(filename)}`);
    
    // 确保目录存在
    if (!fs.existsSync(thumbDir)) {
      fs.mkdirSync(thumbDir, { recursive: true });
    }
    
    // 生成缩略图
    await sharp(originalPath)
      .resize(300, 300, { fit: 'inside' })
      .toFile(thumbPath);
    
    return path.basename(thumbPath);
  } catch (error) {
    console.error('创建缩略图失败:', error);
    throw error;
  }
}

// 获取艺术家Wiki列表（所有可见艺术家，包括已有描述和头像等信息）
router.get('/list', auth, async (req, res) => {
  try {
    const query = req.query.query || '';
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;
    const sortBy = req.query.sortBy || 'name'; // 默认按名称排序
    const sortOrder = req.query.sortOrder === 'desc' ? 'DESC' : 'ASC'; // 默认升序
    const region = req.query.region || '';
    const artistType = req.query.artistType || '';
    const hasAvatar = req.query.hasAvatar === 'true';
    const hasDescription = req.query.hasDescription === 'true';
    
    // 构建搜索条件
    let whereCondition = {};
    
    // 关键词搜索
    if (query) {
      whereCondition = {
        [Op.or]: [
          { name: { [Op.like]: `%${query}%` } },
          { realName: { [Op.like]: `%${query}%` } },
          { description: { [Op.like]: `%${query}%` } }
        ]
      };
    }
    
    // 地区过滤
    if (region) {
      whereCondition.region = { [Op.like]: `%${region}%` };
    }
    
    // 艺术家类型过滤
    if (artistType) {
      whereCondition.artistType = { [Op.like]: `%${artistType}%` };
    }
    
    // 头像过滤
    if (hasAvatar) {
      whereCondition.avatarUrl = { [Op.not]: null };
    }
    
    // 描述过滤
    if (hasDescription) {
      whereCondition.description = { [Op.and]: [
        { [Op.not]: null },
        { [Op.ne]: '' }
      ]};
    }
    
    // 构建排序选项
    const orderOptions = [];
    
    // 验证排序字段是否有效
    const validSortFields = ['name', 'createdAt', 'updatedAt', 'region', 'artistType'];
    if (validSortFields.includes(sortBy)) {
      orderOptions.push([sortBy, sortOrder]);
    } else {
      // 默认按名称排序
      orderOptions.push(['name', 'ASC']);
    }
    
    // 查询艺术家列表
    const artists = await Artist.findAndCountAll({
      where: whereCondition,
      attributes: {
        include: ['id', 'name', 'realName', 'netease', 'qq', 'kugou', 'kuwo', 'qishui',
                 'spotify', 'youtube', 'appleMusic', 'soundCloud', 'description',
                 'avatarUrl', 'region', 'artistType', 'createdById', 'isNewArtist',
                 'createdAt', 'updatedAt']
      },
      include: [
        {
        model: User,
        as: 'createdBy',
        attributes: ['id', 'username']
        }
      ],
      order: orderOptions,
      limit: limit,
      offset: offset,
      distinct: true
    });
    
    // 获取可用的地区和艺术家类型列表（用于前端筛选）
    const regions = await Artist.findAll({
      attributes: [[sequelize.fn('DISTINCT', sequelize.col('region')), 'region']],
      where: {
        region: { [Op.not]: null, [Op.ne]: '' }
      },
      raw: true
    }).then(results => results.map(item => item.region).filter(Boolean));
    
    const artistTypes = await Artist.findAll({
      attributes: [[sequelize.fn('DISTINCT', sequelize.col('artistType')), 'artistType']],
      where: {
        artistType: { [Op.not]: null, [Op.ne]: '' }
      },
      raw: true
    }).then(results => results.map(item => item.artistType).filter(Boolean));
    
    // 处理结果，为每个艺人添加平台链接对象
    const processedResults = artists.rows.map(artist => {
      const artistJson = artist.toJSON();
      
      // 构建平台链接对象
      artistJson.platforms = {
        netease: artistJson.netease || null,
        qq: artistJson.qq || null,
        kugou: artistJson.kugou || null,
        kuwo: artistJson.kuwo || null,
        qishui: artistJson.qishui || null,
        spotify: artistJson.spotify || null,
        youtube: artistJson.youtube || null,
        appleMusic: artistJson.appleMusic || null,
        soundCloud: artistJson.soundCloud || null
      };
      
      return artistJson;
    });
    
    // 查找所有需要关联主艺人的ID
    const artistIdsWithCanonical = artists.rows
      .filter(artist => artist.canonicalArtistId)
      .map(artist => ({ 
        artistId: artist.id, 
        artistName: artist.name,
        canonicalArtistId: artist.canonicalArtistId 
      }));
    
    console.log(`[调试] 艺人列表中有 ${artistIdsWithCanonical.length}/${artists.rows.length} 个艺人需要关联主艺人信息`);
    if (artistIdsWithCanonical.length > 0) {
      console.log(`[调试] 需要关联的艺人:`, artistIdsWithCanonical.map(a => `${a.artistId}(${a.artistName}) -> ${a.canonicalArtistId}`));
    }
    
    // 如果有需要关联的艺人
    if (artistIdsWithCanonical.length > 0) {
      // 获取所有关联的主艺人ID
      const canonicalArtistIds = [...new Set(artistIdsWithCanonical.map(item => item.canonicalArtistId))];
      console.log(`[调试] 需要查询 ${canonicalArtistIds.length} 个不同的主艺人: ${canonicalArtistIds.join(', ')}`);
      
      // 一次性查询所有主艺人信息
      const canonicalArtists = await Artist.findAll({
        where: { id: { [Op.in]: canonicalArtistIds } },
        attributes: ['id', 'name', 'avatarUrl', 'region', 'artistType', 'description', 'netease', 'qq', 'kugou', 'kuwo', 'qishui', 'spotify', 'youtube', 'appleMusic', 'soundCloud', 'isNewArtist', 'createdById', 'createdAt', 'updatedAt']
        // 注意：这里明确排除了realName和id_number字段，以保护隐私
      });
      
      console.log(`[调试] 成功查询到 ${canonicalArtists.length}/${canonicalArtistIds.length} 个主艺人`);
      if (canonicalArtists.length < canonicalArtistIds.length) {
        const foundIds = canonicalArtists.map(a => a.id);
        const missingIds = canonicalArtistIds.filter(id => !foundIds.includes(id));
        console.log(`[调试] 警告: 未找到以下主艺人: ${missingIds.join(', ')}`);
      }
      
      // 创建主艺人ID到主艺人对象的映射
      const canonicalArtistsMap = canonicalArtists.reduce((map, artist) => {
        const artistJson = artist.toJSON();
        
        // 构建平台链接对象
        artistJson.platforms = {
          netease: artistJson.netease || null,
          qq: artistJson.qq || null,
          kugou: artistJson.kugou || null,
          kuwo: artistJson.kuwo || null,
          qishui: artistJson.qishui || null,
          spotify: artistJson.spotify || null,
          youtube: artistJson.youtube || null,
          appleMusic: artistJson.appleMusic || null,
          soundCloud: artistJson.soundCloud || null
        };
        
        map[artist.id] = artistJson;
        return map;
      }, {});
      
      // 为每个艺人添加其关联的主艺人信息
      let matchCount = 0;
      let missingCount = 0;
      
      processedResults.forEach(artist => {
        if (artist.canonicalArtistId) {
          if (canonicalArtistsMap[artist.canonicalArtistId]) {
            artist.canonicalArtist = canonicalArtistsMap[artist.canonicalArtistId];
            matchCount++;
            
            // 记录前5个匹配的详细信息
            if (matchCount <= 5) {
              console.log(`[调试] 艺人 ${artist.id}(${artist.name}) 关联到主艺人 ${artist.canonicalArtist.id}(${artist.canonicalArtist.name})`);
            }
          } else {
            missingCount++;
            console.log(`[调试] 警告: 艺人 ${artist.id}(${artist.name}) 的主艺人ID ${artist.canonicalArtistId} 未找到`);
          }
        }
      });
      
      console.log(`[调试] 为 ${matchCount}/${artistIdsWithCanonical.length} 个艺人添加了关联主艺人信息，${missingCount} 个未找到对应主艺人`);
    }
    
    res.json({
      total: artists.count,
      results: processedResults,
      offset: offset,
      limit: limit,
      filters: {
        regions,
        artistTypes
      }
    });
  } catch (error) {
    console.error('获取艺术家Wiki列表失败:', error);
    res.status(500).json({ message: '获取艺术家列表失败', error: error.message });
  }
});

// 获取艺术家Wiki筛选选项
router.get('/filter-options', auth, async (req, res) => {
  try {
    // 获取所有不同的地区
    const regions = await Artist.findAll({
      attributes: [[sequelize.fn('DISTINCT', sequelize.col('region')), 'region']],
      where: {
        region: { [Op.not]: null, [Op.ne]: '' }
      },
      raw: true
    }).then(results => results.map(item => item.region).filter(Boolean));
    
    // 获取所有不同的艺术家类型
    const artistTypes = await Artist.findAll({
      attributes: [[sequelize.fn('DISTINCT', sequelize.col('artistType')), 'artistType']],
      where: {
        artistType: { [Op.not]: null, [Op.ne]: '' }
      },
      raw: true
    }).then(results => results.map(item => item.artistType).filter(Boolean));
    
    // 返回筛选选项
    res.json({
      regions,
      artistTypes,
      sortOptions: [
        { value: 'name', label: '按名称' },
        { value: 'createdAt', label: '按创建时间' },
        { value: 'updatedAt', label: '按更新时间' },
        { value: 'region', label: '按地区' },
        { value: 'artistType', label: '按艺术家类型' }
      ]
    });
  } catch (error) {
    console.error('获取艺术家Wiki筛选选项失败:', error);
    res.status(500).json({ message: '获取筛选选项失败', error: error.message });
  }
});

// 创建新艺术家（需要管理员或特定权限）
router.post('/', auth, upload.single('avatar'), async (req, res) => {
  try {
    console.log('接收到创建艺术家请求:', {
      body: Object.keys(req.body),
      file: req.file ? {
        fieldname: req.file.fieldname,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size
      } : '无文件',
      headers: {
        contentType: req.headers['content-type']
      }
    });
    
    const { name, realName, region, artistType, description, links } = req.body;
    
    // 验证必填字段
    if (!name) {
      return res.status(400).json({ message: '艺名不能为空' });
    }
    
    // 解析平台链接
    let platformLinks = {};
    try {
      platformLinks = links ? JSON.parse(links) : {};
    } catch (error) {
      console.error('解析平台链接失败:', error);
      return res.status(400).json({ message: '平台链接格式不正确' });
    }
    
    // 处理头像上传
    let avatarPath = null;
    
    if (req.file) {
      const originalPath = req.file.path;
      const filename = req.file.filename;
      
      console.log('头像文件已上传:', {
        originalPath,
        filename
      });
      
      // 不再创建缩略图
      avatarPath = filename;
    } else {
      console.log('未检测到头像文件上传');
    }
    
    // 检查是否为全新歌手（无平台链接）
    const hasAnyPlatformLink = Object.values(platformLinks).some(link => link && link.trim() !== '');
    const isNewArtist = !hasAnyPlatformLink;
    
    console.log(`歌手类型: ${isNewArtist ? '全新歌手（无平台链接）' : '已有平台链接的歌手'}`);
    
    // 创建新艺术家
    const newArtist = await Artist.create({
      name,
      realName: realName || '',
      region: region || '',
      artistType: artistType || '',
      description: description || '',
      avatarUrl: avatarPath, // 使用avatarUrl字段替代
      netease: platformLinks.netease || '',
      qq: platformLinks.qq || '',
      kugou: platformLinks.kugou || '',
      kuwo: platformLinks.kuwo || '',
      qishui: platformLinks.qishui || '',
      spotify: platformLinks.spotify || '',
      youtube: platformLinks.youtube || '',
      appleMusic: platformLinks.appleMusic || '',
      soundCloud: platformLinks.soundCloud || '',
      isNewArtist: isNewArtist, // 设置是否为全新歌手
      createdById: req.user.id
    });
    
    res.status(201).json({
      message: '艺术家创建成功',
      artist: newArtist
    });
  } catch (error) {
    console.error('创建艺术家失败:', error);
    res.status(500).json({ message: '创建艺术家失败', error: error.message });
  }
});

// 创建新艺术家，使用Base64编码的头像
router.post('/create-with-base64', auth, async (req, res) => {
  try {
    console.log('接收到Base64创建艺术家请求:', {
      body: Object.keys(req.body),
      hasAvatar: !!req.body.avatarBase64,
      avatarSize: req.body.avatarBase64 ? req.body.avatarBase64.length : 0
    });
    
    const { 
      name, 
      realName, 
      region, 
      artistType, 
      description, 
      platforms,
      id_number,
      avatarBase64,
      avatarFileName,
      avatarFileType,
      skipMatchCheck, // 新增参数，用于跳过匹配检查
      canonicalArtistId // 如果是创建关联艺人，会提供这个参数
    } = req.body;
    
    // 验证必填字段
    if (!name) {
      return res.status(400).json({ message: '艺名不能为空' });
    }
    
    // 如果指定了主歌手ID，检查是否已经存在关联
    if (canonicalArtistId) {
      // 检查主歌手是否存在
      const canonicalArtist = await Artist.findByPk(canonicalArtistId);
      if (!canonicalArtist) {
        console.log(`[调试] 错误: 主艺人ID=${canonicalArtistId} 不存在`);
        return res.status(404).json({ message: '主艺人不存在' });
      }
      
      // 确保主艺人本身不是关联艺人
      if (canonicalArtist.canonicalArtistId) {
        console.log(`[调试] 错误: 所选艺人ID=${canonicalArtistId} 不是主艺人，它关联到ID=${canonicalArtist.canonicalArtistId}`);
        return res.status(400).json({ message: '所选艺人不是主艺人，无法关联' });
      }
      
      // 检查用户是否已经创建了关联到该主歌手的艺人
      if (req.user.role !== 'admin') { // 管理员不受此限制
        const existingAssociations = await Artist.findAll({
          where: {
            canonicalArtistId: canonicalArtistId,
            createdById: req.user.id
          }
        });
        
        if (existingAssociations.length > 0) {
          console.log(`[调试] 错误: 用户ID=${req.user.id} 已经创建了关联到主艺人ID=${canonicalArtistId} 的艺人`);
          console.log(`[调试] 已存在的关联艺人: ${existingAssociations.map(a => `${a.id}(${a.name})`).join(', ')}`);
          
          return res.status(409).json({ 
            message: `您已经创建了关联到"${canonicalArtist.name}"的艺人"${existingAssociations[0].name}"，不能重复关联`,
            existingArtist: {
              id: existingAssociations[0].id,
              name: existingAssociations[0].name
            }
          });
        }
      }
      
      // 如果是关联歌手，则跳过实名匹配检查
      skipMatchCheck = true;
      console.log(`[调试] 创建关联歌手，跳过实名匹配检查`);
    }
    
    // 如果未指定跳过匹配检查，则进行艺人匹配检查
    if (!skipMatchCheck) {
      console.log('进行艺人匹配检查...');
      
      // 必须同时提供艺名和实名才进行匹配检查
      if (name && realName) {
      // 构建搜索条件
      const whereCondition = {
          canonicalArtistId: null, // 只搜索主艺人
          createdById: { [Op.ne]: req.user.id } // 排除用户自己创建的主歌手
      };
      
        // 添加艺名搜索条件 - 使用模糊匹配
        whereCondition.name = {
          [Op.like]: `%${name}%` // 模糊匹配艺名
        };
      
        // 添加实名搜索条件 - 使用精确匹配
        whereCondition.realName = realName; // 精确匹配实名
      
      // 查询潜在匹配的艺人
      const potentialMatches = await Artist.findAll({
        where: whereCondition,
        attributes: [
          'id', 'name', 'realName', 'avatarUrl', 'description', 'region', 
          'artistType', 'netease', 'qq', 'kugou', 'kuwo', 'qishui',
            'spotify', 'youtube', 'appleMusic', 'soundCloud', 'isNewArtist',
            'createdById'
            // 明确不返回id_number字段
        ],
        limit: 10 // 限制返回数量
      });
      
      // 计算每个匹配项的分数
      const scoredMatches = potentialMatches.map(artist => {
        let score = 0;
        const artistData = artist.toJSON();
        
        // 艺名完全匹配得2分，部分匹配得1分
          let nameMatch = false;
        if (name && artistData.name) {
          if (artistData.name.toLowerCase() === name.toLowerCase()) {
            score += 2;
              nameMatch = true;
            } else if (artistData.name.toLowerCase().includes(name.toLowerCase()) || 
                      name.toLowerCase().includes(artistData.name.toLowerCase())) {
            score += 1;
          }
        }
        
          // 实名必须完全匹配
          let realNameMatch = false;
          if (artistData.realName && artistData.realName.toLowerCase() === realName.toLowerCase()) {
            score += 2;
            realNameMatch = true;
          }
          
          // 如果艺名和实名都完全匹配，额外加1分，确保这是最高优先级的匹配
          if (nameMatch && realNameMatch) {
            score += 1;
          }
          
          // 隐私保护：只有当实名完全匹配时，才返回完整信息
          if (!realNameMatch) {
            return null;
        }
          
          // 确保不返回身份证信息
          delete artistData.id_number;
        
        return {
          ...artistData,
            matchScore: score,
            exactNameMatch: nameMatch,
            exactRealNameMatch: realNameMatch
        };
        }).filter(Boolean); // 过滤掉null值
      
      // 按分数降序排序
      scoredMatches.sort((a, b) => b.matchScore - a.matchScore);
      
        // 找到强匹配项（分数>=3 或 艺名和实名都完全匹配）
        const strongMatches = scoredMatches.filter(match => 
          match.matchScore >= 3 || (match.exactNameMatch && match.exactRealNameMatch)
        );
      
      // 如果有强匹配项，返回409冲突状态码和匹配信息
      if (strongMatches.length > 0) {
        console.log('找到强匹配项，返回409状态码');
        
          // 从结果中移除realName字段，保护隐私
          const processResults = (results) => {
            return results.map(item => {
              const processed = {...item};
              delete processed.realName; // 删除实名字段
              return processed;
        });
          };
        
        return res.status(409).json({
          message: '发现潜在匹配的艺人',
          hasStrongMatch: true,
            strongMatches: processResults(strongMatches),
            allMatches: processResults(scoredMatches)
        });
        }
      }
    }
    
    // 处理平台链接
    let platformLinks = platforms || {};
    
    // 处理头像上传
    let avatarPath = null;
    
    if (avatarBase64) {
      try {
        // 确保上传目录存在
        const uploadDir = path.join(__dirname, '../../uploads/images');
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        
        // 确保缩略图目录存在
        const thumbDir = path.join(uploadDir, 'thumbnails');
        if (!fs.existsSync(thumbDir)) {
          fs.mkdirSync(thumbDir, { recursive: true });
        }
        
        // 生成文件名
        const timestamp = Date.now();
        const fileId = uuidv4().substring(0, 8);
        const ext = avatarFileType === 'image/png' ? '.png' : '.jpg';
        const filename = `image_${timestamp}_${fileId}${ext}`;
        const filePath = path.join(uploadDir, filename);
        
        // 将Base64转换为Buffer并写入文件
        const buffer = Buffer.from(avatarBase64, 'base64');
        fs.writeFileSync(filePath, buffer);
        
        console.log('Base64头像文件已保存:', {
          path: filePath,
          size: buffer.length
        });
        
        // 保存文件名
        avatarPath = filename;
      } catch (error) {
        console.error('处理Base64头像文件失败:', error);
        return res.status(500).json({ message: '处理头像文件失败', error: error.message });
      }
    }
    
    // 检查是否为全新歌手（无平台链接）
    // 如果前端明确指定了isNewArtist，则使用前端传来的值
    let isNewArtist;
    if (req.body.isNewArtist !== undefined) {
      isNewArtist = req.body.isNewArtist;
    } else {
      // 否则根据平台链接自动判断
    const hasAnyPlatformLink = Object.values(platformLinks).some(link => link && link.trim() !== '');
      isNewArtist = !hasAnyPlatformLink;
    }
    
    console.log(`歌手类型: ${isNewArtist ? '全新歌手（无平台链接）' : '已有平台链接的歌手'}`);
    console.log('平台链接检查:', {
      hasAnyPlatformLink: Object.values(platformLinks).some(link => link && link.trim() !== ''),
      isNewArtist,
      platformLinks: JSON.stringify(platformLinks)
    });
    
    // 创建新艺术家 - 如果是关联歌手，不需要实名和身份证号
    const newArtist = await Artist.create({
      name,
      realName: canonicalArtistId ? '' : (realName || ''), // 关联歌手不保存实名
      region: region || '',
      artistType: artistType || '',
      description: description || '',
      avatarUrl: avatarPath,
      id_number: canonicalArtistId ? null : (id_number || null), // 关联歌手不保存身份证号
      netease: platformLinks.netease || '',
      qq: platformLinks.qq || '',
      kugou: platformLinks.kugou || '',
      kuwo: platformLinks.kuwo || '',
      qishui: platformLinks.qishui || '',
      spotify: platformLinks.spotify || '',
      youtube: platformLinks.youtube || '',
      appleMusic: platformLinks.appleMusic || '',
      soundCloud: platformLinks.soundCloud || '',
      isNewArtist: canonicalArtistId ? false : isNewArtist, // 关联歌手不是全新歌手
      canonicalArtistId: canonicalArtistId || null, // 使用传入的主艺人ID或默认为null
      createdById: req.user.id
    });
    
    console.log('创建的歌手对象:', {
      id: newArtist.id,
      name: newArtist.name,
      isNewArtist: newArtist.isNewArtist,
      createdById: newArtist.createdById,
      canonicalArtistId: newArtist.canonicalArtistId,
      hasRealName: !!newArtist.realName,
      hasIdNumber: !!newArtist.id_number
    });
    
    // 如果是关联歌手，同时返回主歌手信息
    let responseData = newArtist.toJSON();
    
    if (canonicalArtistId) {
      // 获取主歌手信息（不包含敏感字段）
      const canonicalArtist = await Artist.findByPk(canonicalArtistId, {
        attributes: [
          'id', 'name', 'avatarUrl', 'region', 'artistType', 'description', 
          'netease', 'qq', 'kugou', 'kuwo', 'qishui', 'spotify', 'youtube', 
          'appleMusic', 'soundCloud', 'isNewArtist', 'createdById'
        ]
      });
      
      if (canonicalArtist) {
        // 构建主歌手的平台链接对象
        const canonicalArtistData = {
          ...canonicalArtist.toJSON(),
          platforms: {
            netease: canonicalArtist.netease || null,
            qq: canonicalArtist.qq || null,
            kugou: canonicalArtist.kugou || null,
            kuwo: canonicalArtist.kuwo || null,
            qishui: canonicalArtist.qishui || null,
            spotify: canonicalArtist.spotify || null,
            youtube: canonicalArtist.youtube || null,
            appleMusic: canonicalArtist.appleMusic || null,
            soundCloud: canonicalArtist.soundCloud || null
          }
        };
        
        responseData.canonicalArtist = canonicalArtistData;
      }
    }
    
    // 直接返回创建的艺术家对象，而不是嵌套在artist字段中
    res.status(201).json(responseData);
  } catch (error) {
    console.error('创建艺术家失败:', error);
    res.status(500).json({ message: '创建艺术家失败', error: error.message });
  }
});

// 更新艺术家信息
router.put('/:id', auth, upload.single('avatar'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, realName, region, artistType, description, links, removeAvatar } = req.body;
    
    // 查找艺术家
    const artist = await Artist.findByPk(id);
    
    if (!artist) {
      return res.status(404).json({ message: '艺术家不存在' });
    }
    
    // 权限检查：只有管理员或创建者可以更新
    if (req.user.role !== 'admin' && artist.createdById !== req.user.id) {
      return res.status(403).json({ message: '无权修改此艺术家信息' });
    }
    
    // 解析平台链接
    let platformLinks = {};
    try {
      platformLinks = links ? JSON.parse(links) : {};
    } catch (error) {
      console.error('解析平台链接失败:', error);
      return res.status(400).json({ message: '平台链接格式不正确' });
    }
    
    // 处理头像更新
    let avatarPath = artist.avatarUrl; // 使用avatarUrl字段
    
    // 如果请求移除头像
    if (removeAvatar === 'true') {
      // 删除旧头像文件
      if (artist.avatarUrl) {
        const oldAvatarPath = path.join(__dirname, '../../uploads/images', artist.avatarUrl);
        if (fs.existsSync(oldAvatarPath)) {
          fs.unlinkSync(oldAvatarPath);
        }
        
        // 不再处理缩略图
      }
      
      avatarPath = null;
      // 移除avatarThumbnail设置
    }
    // 如果上传了新头像
    else if (req.file) {
      // 删除旧头像文件
      if (artist.avatarUrl) {
        const oldAvatarPath = path.join(__dirname, '../../uploads/images', artist.avatarUrl);
        if (fs.existsSync(oldAvatarPath)) {
          fs.unlinkSync(oldAvatarPath);
        }
        
        // 不再处理缩略图
      }
      
      const originalPath = req.file.path;
      const filename = req.file.filename;
      
      // 不再创建缩略图
      avatarPath = filename;
    }
    
    // 更新艺术家信息
    await artist.update({
      name: name || artist.name,
      realName: realName !== undefined ? realName : artist.realName,
      region: region !== undefined ? region : artist.region,
      artistType: artistType !== undefined ? artistType : artist.artistType,
      description: description !== undefined ? description : artist.description,
      avatarUrl: avatarPath, // 使用avatarUrl字段
      netease: platformLinks.netease !== undefined ? platformLinks.netease : artist.netease,
      qq: platformLinks.qq !== undefined ? platformLinks.qq : artist.qq,
      kugou: platformLinks.kugou !== undefined ? platformLinks.kugou : artist.kugou,
      kuwo: platformLinks.kuwo !== undefined ? platformLinks.kuwo : artist.kuwo,
      qishui: platformLinks.qishui !== undefined ? platformLinks.qishui : artist.qishui,
      spotify: platformLinks.spotify !== undefined ? platformLinks.spotify : artist.spotify,
      youtube: platformLinks.youtube !== undefined ? platformLinks.youtube : artist.youtube,
      appleMusic: platformLinks.appleMusic !== undefined ? platformLinks.appleMusic : artist.appleMusic,
      soundCloud: platformLinks.soundCloud !== undefined ? platformLinks.soundCloud : artist.soundCloud,
    });
    
    res.json({
      message: '艺术家信息更新成功',
      artist: await Artist.findByPk(id, {
        include: [{
          model: User,
          as: 'createdBy',
          attributes: ['id', 'username']
        }]
      })
    });
  } catch (error) {
    console.error('更新艺术家信息失败:', error);
    res.status(500).json({ message: '更新艺术家信息失败', error: error.message });
  }
});

// 获取网易云音乐艺术家信息（代理请求，解决前端CORS问题）
router.get('/fetch-netease-info', auth, async (req, res) => {
  try {
    const { url } = req.query;
    
    if (!url) {
      return res.status(400).json({ message: '网易云链接不能为空' });
    }
    
    // 引入网易云服务
    const neteaseService = require('../utils/neteaseService');
    
    try {
      // 从URL中提取艺术家ID
      const artistId = neteaseService.extractArtistId(url);
      
      if (!artistId) {
        return res.status(400).json({ message: '无法从URL中提取有效的网易云艺术家ID' });
      }
      
      // 获取艺术家信息
      const artistInfo = await neteaseService.getArtistInfoFromProxy(url);
      
      // 返回艺术家信息
      res.json(artistInfo);
    } catch (error) {
      console.error('获取网易云艺术家信息失败:', error);
      res.status(500).json({ 
        message: '获取网易云艺术家信息失败', 
        error: error.response?.data || error.message 
      });
    }
  } catch (error) {
    console.error('获取网易云艺术家信息失败:', error);
    res.status(500).json({ message: '获取网易云艺术家信息失败', error: error.message });
  }
});

// 管理员一键获取艺术家信息
router.post('/fetch-artist-info', adminAuth, async (req, res) => {
  try {
    const { artistId, platform, url } = req.body;
    
    if (!artistId || !platform || !url) {
      return res.status(400).json({ message: '缺少必要参数' });
    }
    
    // 查找艺术家
    const artist = await Artist.findByPk(artistId);
    
    if (!artist) {
      return res.status(404).json({ message: '艺术家不存在' });
    }
    
    // 根据不同平台获取信息
    let artistInfo = null;
    
    if (platform === 'netease') {
      // 引入网易云服务
      const neteaseService = require('../utils/neteaseService');
      
      try {
        // 获取艺术家信息
        artistInfo = await neteaseService.getArtistInfoFromProxy(url);
        
        // 更新艺术家信息
        const updateData = {
          netease: url
        };
        
        // 如果有详细信息，补充其他字段
        if (artistInfo && artistInfo.data && artistInfo.data.artist) {
          const neteaseArtist = artistInfo.data.artist;
          
          // 保存头像链接
          if (neteaseArtist.picUrl || neteaseArtist.avatar || neteaseArtist.cover) {
            // 优先使用picUrl，其次是avatar，最后是cover
            updateData.avatarUrl = neteaseArtist.picUrl || neteaseArtist.avatar || neteaseArtist.cover;
          }
          
          // 保存地区信息
          if (neteaseArtist.province) {
            // 网易云的province是数字编码
            const provinceCode = parseInt(neteaseArtist.province);
            if (provinceCode === 1000000) {
              updateData.region = '国外';
            } else if (provinceCode > 100000) {
              // 中国省份编码通常是6位数字
              updateData.region = '中国大陆';
            }
          } else {
            // 默认设置为中国大陆
            updateData.region = '中国大陆';
          }
          
          // 如果没有描述，使用网易云的简介
          if ((!artist.description || artist.description.trim() === '') && 
              artistInfo.artistDesc && artistInfo.artistDesc.briefDesc) {
            updateData.description = artistInfo.artistDesc.briefDesc.substring(0, 20); // 限制为20个字符
          }
          
          // 如果没有真实姓名，使用网易云的别名
          if ((!artist.realName || artist.realName.trim() === '') && 
              neteaseArtist.alias && neteaseArtist.alias.length > 0) {
            updateData.realName = neteaseArtist.alias[0];
          }
          
          // 如果有别名数组，保存为JSON
          if (neteaseArtist.alias && neteaseArtist.alias.length > 0) {
            updateData.alias = JSON.stringify(neteaseArtist.alias);
          }
          
          // 如果没有艺术家类型，设置为默认值
          if (!artist.artistType || artist.artistType.trim() === '') {
            updateData.artistType = '独立音乐人';
          }
          
          console.log('更新艺术家数据:', updateData);
        }
        
        // 更新艺术家信息
        await artist.update(updateData);
        
        res.json({
          message: '艺术家信息更新成功',
          artist: await Artist.findByPk(artistId)
        });
      } catch (error) {
        console.error('获取网易云艺术家信息失败:', error);
        res.status(500).json({ 
          message: '获取网易云艺术家信息失败', 
          error: error.response?.data || error.message 
        });
      }
    } else {
      return res.status(400).json({ message: '不支持的平台类型' });
    }
  } catch (error) {
    console.error('获取艺术家信息失败:', error);
    res.status(500).json({ message: '获取艺术家信息失败', error: error.message });
  }
});

// 批量获取网易云艺术家信息
router.post('/batch-fetch-netease', adminAuth, async (req, res) => {
  try {
    const { artistIds } = req.body;
    
    if (!artistIds || !Array.isArray(artistIds) || artistIds.length === 0) {
      return res.status(400).json({ message: '请提供有效的艺术家ID列表' });
    }
    
    const neteaseService = require('../utils/neteaseService');
    const results = [];
    const errors = [];
    
    // 并行处理多个艺术家信息获取请求
    await Promise.all(artistIds.map(async (item) => {
      try {
        const { artistId, url } = item;
        
        // 查找艺术家
        const artist = await Artist.findByPk(artistId);
        
        if (!artist) {
          errors.push({ artistId, error: '艺术家不存在' });
          return;
        }
        
        // 获取艺术家信息
        const artistInfo = await neteaseService.getArtistInfoFromProxy(url);
        
        // 更新艺术家信息
        const updateData = {
          netease: url
        };
        
        // 如果有详细信息，补充其他字段
        if (artistInfo && artistInfo.data && artistInfo.data.artist) {
          const neteaseArtist = artistInfo.data.artist;
          
          // 保存头像链接
          if (neteaseArtist.picUrl || neteaseArtist.avatar || neteaseArtist.cover) {
            // 优先使用picUrl，其次是avatar，最后是cover
            updateData.avatarUrl = neteaseArtist.picUrl || neteaseArtist.avatar || neteaseArtist.cover;
          }
          
          // 保存地区信息
          if (neteaseArtist.province) {
            // 网易云的province是数字编码
            const provinceCode = parseInt(neteaseArtist.province);
            if (provinceCode === 1000000) {
              updateData.region = '国外';
            } else if (provinceCode > 100000) {
              // 中国省份编码通常是6位数字
              updateData.region = '中国大陆';
            }
          } else {
            // 默认设置为中国大陆
            updateData.region = '中国大陆';
          }
          
          // 如果没有描述，使用网易云的简介
          if ((!artist.description || artist.description.trim() === '') && 
              artistInfo.artistDesc && artistInfo.artistDesc.briefDesc) {
            updateData.description = artistInfo.artistDesc.briefDesc.substring(0, 20); // 限制为20个字符
          }
          
          // 如果没有真实姓名，使用网易云的别名
          if ((!artist.realName || artist.realName.trim() === '') && 
              neteaseArtist.alias && neteaseArtist.alias.length > 0) {
            updateData.realName = neteaseArtist.alias[0];
          }
          
          // 如果有别名数组，保存为JSON
          if (neteaseArtist.alias && neteaseArtist.alias.length > 0) {
            updateData.alias = JSON.stringify(neteaseArtist.alias);
          }
          
          // 如果没有艺术家类型，设置为默认值
          if (!artist.artistType || artist.artistType.trim() === '') {
            updateData.artistType = '独立音乐人';
          }
        }
        
        // 更新艺术家信息
        await artist.update(updateData);
        
        results.push({
          artistId,
          name: artist.name,
          success: true,
          updatedData: updateData
        });
      } catch (error) {
        console.error(`获取艺术家 ${item.artistId} 的网易云信息失败:`, error);
        errors.push({
          artistId: item.artistId,
          error: error.message || '未知错误'
        });
      }
    }));
    
    res.json({
      message: `批量获取网易云艺术家信息完成，成功: ${results.length}，失败: ${errors.length}`,
      results,
      errors
    });
  } catch (error) {
    console.error('批量获取网易云艺术家信息失败:', error);
    res.status(500).json({ message: '批量获取网易云艺术家信息失败', error: error.message });
  }
});

// 搜索潜在匹配的艺人
router.post('/search-potential-matches', auth, async (req, res) => {
  try {
    const { name, realName } = req.body;
    
    // 必须同时提供艺名和实名
    if (!name || !realName) {
      return res.status(400).json({ 
        message: '艺名和实名必须同时提供',
        hasStrongMatch: false,
        strongMatches: [],
        allMatches: []
      });
    }
    
    // 查找用户已经关联的主歌手ID列表
    const userAssociatedCanonicalIds = await Artist.findAll({
      where: {
        createdById: req.user.id,
        canonicalArtistId: { [Op.not]: null }
      },
      attributes: ['canonicalArtistId'],
      raw: true
    }).then(results => results.map(item => item.canonicalArtistId));
    
    console.log(`[调试] 用户ID=${req.user.id} 已关联的主歌手IDs: ${userAssociatedCanonicalIds.join(', ') || '无'}`);
    
    // 构建搜索条件
    const whereCondition = {
      canonicalArtistId: null, // 只搜索主艺人
      createdById: { [Op.ne]: req.user.id } // 排除用户自己创建的主歌手
    };
    
    // 排除用户已经关联过的主歌手
    if (userAssociatedCanonicalIds.length > 0) {
      whereCondition.id = {
        [Op.notIn]: userAssociatedCanonicalIds
      };
    }
    
    // 添加艺名搜索条件 - 使用模糊匹配
    if (name) {
      whereCondition.name = {
        [Op.like]: `%${name}%` // 模糊匹配艺名
      };
    }
    
    // 添加实名搜索条件 - 使用精确匹配
    if (realName) {
      whereCondition.realName = realName; // 精确匹配实名
    }
    
    console.log(`[调试] 搜索潜在匹配的艺人，条件:`, whereCondition);
    
    // 查询潜在匹配的艺人
    const potentialMatches = await Artist.findAll({
      where: whereCondition,
      attributes: [
        'id', 'name', 'realName', 'avatarUrl', 'description', 'region', 
        'artistType', 'netease', 'qq', 'kugou', 'kuwo', 'qishui',
        'spotify', 'youtube', 'appleMusic', 'soundCloud', 'isNewArtist',
        'createdById'
        // 明确不返回id_number字段
      ],
      limit: 10 // 限制返回数量
    });
    
    console.log(`[调试] 搜索潜在匹配的艺人，条件: name=${name}, realName=${realName}, 找到: ${potentialMatches.length}个结果`);
    
    // 计算每个匹配项的分数
    const scoredMatches = potentialMatches.map(artist => {
      let score = 0;
      const artistData = artist.toJSON();
      
      // 艺名完全匹配得2分，部分匹配得1分
      let nameMatch = false;
      if (name && artistData.name) {
        if (artistData.name.toLowerCase() === name.toLowerCase()) {
          score += 2;
          nameMatch = true;
        } else if (artistData.name.toLowerCase().includes(name.toLowerCase()) || 
                  name.toLowerCase().includes(artistData.name.toLowerCase())) {
          score += 1;
        }
      }
      
      // 实名必须完全匹配
      let realNameMatch = false;
      if (artistData.realName && artistData.realName.toLowerCase() === realName.toLowerCase()) {
          score += 2;
        realNameMatch = true;
      }
      
      // 如果艺名和实名都完全匹配，额外加1分，确保这是最高优先级的匹配
      if (nameMatch && realNameMatch) {
          score += 1;
        }
      
      // 隐私保护：只有当实名完全匹配时，才返回完整信息
      if (!realNameMatch) {
        return null;
      }
      
      // 确保不返回身份证信息
      delete artistData.id_number;
      
      return {
        ...artistData,
        matchScore: score,
        exactNameMatch: nameMatch,
        exactRealNameMatch: realNameMatch
      };
    }).filter(Boolean); // 过滤掉null值
    
    // 按分数降序排序
    scoredMatches.sort((a, b) => b.matchScore - a.matchScore);
    
    // 找到强匹配项（分数>=3 或 艺名和实名都完全匹配）
    const strongMatches = scoredMatches.filter(match => 
      match.matchScore >= 3 || (match.exactNameMatch && match.exactRealNameMatch)
    );
    
    console.log(`[调试] 匹配结果: 强匹配=${strongMatches.length}个, 总匹配=${scoredMatches.length}个`);
    
    // 从结果中移除realName字段，保护隐私
    const processResults = (results) => {
      return results.map(item => {
        const processed = {...item};
        delete processed.realName; // 删除实名字段
        return processed;
      });
    };
    
    // 返回匹配结果，但不包含实名字段
    res.json({
      hasStrongMatch: strongMatches.length > 0,
      strongMatches: processResults(strongMatches),
      allMatches: processResults(scoredMatches)
    });
  } catch (error) {
    console.error('搜索潜在匹配艺人失败:', error);
    res.status(500).json({ 
      message: '搜索潜在匹配艺人失败', 
      error: error.message,
      hasStrongMatch: false,
      strongMatches: [],
      allMatches: []
    });
  }
});

// 关联到现有艺人
router.post('/associate-with-artist', auth, async (req, res) => {
  try {
    const { artistId, canonicalArtistId } = req.body;
    
    console.log(`[调试] 关联艺人请求: 艺人ID=${artistId}, 主艺人ID=${canonicalArtistId}, 用户ID=${req.user.id}`);
    
    if (!artistId || !canonicalArtistId) {
      console.log(`[调试] 错误: 缺少必要参数 artistId=${artistId}, canonicalArtistId=${canonicalArtistId}`);
      return res.status(400).json({ message: '缺少必要参数' });
    }
    
    // 查找要关联的艺人
    const artist = await Artist.findByPk(artistId);
    if (!artist) {
      console.log(`[调试] 错误: 艺人ID=${artistId} 不存在`);
      return res.status(404).json({ message: '艺人不存在' });
    }
    console.log(`[调试] 找到艺人: ID=${artist.id}, 名称=${artist.name}, 创建者ID=${artist.createdById}, 当前canonicalArtistId=${artist.canonicalArtistId || 'NULL'}`);
    
    // 查找主艺人
    const canonicalArtist = await Artist.findByPk(canonicalArtistId);
    if (!canonicalArtist) {
      console.log(`[调试] 错误: 主艺人ID=${canonicalArtistId} 不存在`);
      return res.status(404).json({ message: '主艺人不存在' });
    }
    console.log(`[调试] 找到主艺人: ID=${canonicalArtist.id}, 名称=${canonicalArtist.name}, 创建者ID=${canonicalArtist.createdById}, canonicalArtistId=${canonicalArtist.canonicalArtistId || 'NULL'}`);
    
    // 确保主艺人本身不是关联艺人
    if (canonicalArtist.canonicalArtistId) {
      console.log(`[调试] 错误: 所选艺人ID=${canonicalArtistId} 不是主艺人，它关联到ID=${canonicalArtist.canonicalArtistId}`);
      return res.status(400).json({ message: '所选艺人不是主艺人，无法关联' });
    }
    
    // 权限检查：只有管理员或创建者可以关联艺人
    if (req.user.role !== 'admin' && artist.createdById !== req.user.id) {
      console.log(`[调试] 错误: 用户无权关联此艺人，用户角色=${req.user.role}, 用户ID=${req.user.id}, 艺人创建者ID=${artist.createdById}`);
      return res.status(403).json({ message: '无权关联此艺人' });
    }
    console.log(`[调试] 权限检查通过: 用户角色=${req.user.role}, 用户ID=${req.user.id}`);
    
    // 检查用户是否已经创建了关联到该主歌手的艺人
    if (req.user.role !== 'admin') { // 管理员不受此限制
      const existingAssociations = await Artist.findAll({
        where: {
          canonicalArtistId: canonicalArtistId,
          createdById: req.user.id,
          id: { [Op.ne]: artistId } // 排除当前要关联的艺人
        }
      });
      
      if (existingAssociations.length > 0) {
        console.log(`[调试] 错误: 用户ID=${req.user.id} 已经创建了关联到主艺人ID=${canonicalArtistId} 的艺人`);
        console.log(`[调试] 已存在的关联艺人: ${existingAssociations.map(a => `${a.id}(${a.name})`).join(', ')}`);
        
        return res.status(409).json({ 
          message: `您已经创建了关联到"${canonicalArtist.name}"的艺人"${existingAssociations[0].name}"，不能重复关联`,
          existingArtist: {
            id: existingAssociations[0].id,
            name: existingAssociations[0].name
          }
        });
      }
    }
    
    // 更新艺人的canonicalArtistId和isNewArtist
    console.log(`[调试] 开始更新艺人: ID=${artist.id}, 名称=${artist.name}`);
    console.log(`[调试] 更新前状态: canonicalArtistId=${artist.canonicalArtistId || 'NULL'}, isNewArtist=${artist.isNewArtist}`);
    
    await artist.update({ 
      canonicalArtistId,
      isNewArtist: false // 关联后的艺人不是全新歌手
    });
    
    // 重新获取艺人信息，确认更新成功
    const updatedArtist = await Artist.findByPk(artistId);
    console.log(`[调试] 更新后状态: canonicalArtistId=${updatedArtist.canonicalArtistId || 'NULL'}, isNewArtist=${updatedArtist.isNewArtist}`);
    
    console.log(`[调试] 艺人 ${artistId}(${artist.name}) 已关联到主艺人 ${canonicalArtistId}(${canonicalArtist.name})，并设置为非全新歌手`);
    
    // 构建主艺人的平台链接对象（不包含敏感信息）
    const canonicalArtistData = {
      id: canonicalArtist.id,
      name: canonicalArtist.name,
      avatarUrl: canonicalArtist.avatarUrl,
      region: canonicalArtist.region,
      artistType: canonicalArtist.artistType,
      description: canonicalArtist.description,
      platforms: {
        netease: canonicalArtist.netease || null,
        qq: canonicalArtist.qq || null,
        kugou: canonicalArtist.kugou || null,
        kuwo: canonicalArtist.kuwo || null,
        qishui: canonicalArtist.qishui || null,
        spotify: canonicalArtist.spotify || null,
        youtube: canonicalArtist.youtube || null,
        appleMusic: canonicalArtist.appleMusic || null,
        soundCloud: canonicalArtist.soundCloud || null
      },
      isNewArtist: canonicalArtist.isNewArtist
    };
    
    console.log(`[调试] 返回响应，包含主艺人信息: ID=${canonicalArtistData.id}, 名称=${canonicalArtistData.name}`);
    
    res.json({
      message: '艺人关联成功',
      artist: {
        id: artist.id,
        name: artist.name,
        canonicalArtistId: artist.canonicalArtistId,
        isNewArtist: updatedArtist.isNewArtist
      },
      canonicalArtist: canonicalArtistData
    });
  } catch (error) {
    console.error('[调试] 关联艺人失败:', error);
    console.error('[调试] 错误详情:', {
      message: error.message,
      stack: error.stack?.split('\n').slice(0, 3)
    });
    res.status(500).json({ message: '关联艺人失败', error: error.message });
  }
});

// 获取艺术家详情
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // 查询艺术家信息，包括创建者信息
    const artist = await Artist.findByPk(id, {
      include: [
        {
        model: User,
        as: 'createdBy',
        attributes: ['id', 'username']
        }
      ]
    });
    
    if (!artist) {
      return res.status(404).json({ message: '艺术家不存在' });
    }
    
    // 如果有canonicalArtistId，单独查询主艺人信息
    let canonicalArtist = null;
    if (artist.canonicalArtistId) {
      console.log(`[调试] 艺人 ${id} (${artist.name}) 有关联的主艺人ID: ${artist.canonicalArtistId}`);
      
      canonicalArtist = await Artist.findByPk(artist.canonicalArtistId, {
        attributes: ['id', 'name', 'avatarUrl', 'region', 'artistType', 'description', 'netease', 'qq', 'kugou', 'kuwo', 'qishui', 'spotify', 'youtube', 'appleMusic', 'soundCloud', 'isNewArtist', 'createdById', 'createdAt', 'updatedAt']
        // 注意：这里明确排除了realName和id_number字段，以保护隐私
      });
      
      if (canonicalArtist) {
        console.log(`[调试] 成功查询到主艺人: ${canonicalArtist.id} (${canonicalArtist.name})`);
      } else {
        console.log(`[调试] 警告: 未找到ID为 ${artist.canonicalArtistId} 的主艺人`);
      }
    } else {
      console.log(`[调试] 艺人 ${id} (${artist.name}) 没有关联的主艺人`);
    }
    
    // 查询艺术家相关的歌曲数量
    const songCount = await sequelize.query(
      'SELECT COUNT(DISTINCT `SongId`) as count FROM `songartists` WHERE `ArtistId` = :artistId',
      {
        replacements: { artistId: id },
        type: sequelize.QueryTypes.SELECT
      }
    );
    
    // 查询艺术家参与的专辑数量
    const albumCount = await sequelize.query(
      'SELECT COUNT(DISTINCT `albums`.`id`) as count FROM `albums` ' +
      'JOIN `songs` ON `songs`.`albumId` = `albums`.`id` ' +
      'JOIN `songartists` ON `songartists`.`songId` = `songs`.`id` ' +
      'WHERE `songartists`.`artistId` = :artistId',
      {
        replacements: { artistId: id },
        type: sequelize.QueryTypes.SELECT
      }
    );
    
    // 构建平台链接对象
    const platformLinks = {
      netease: artist.netease || null,
      qq: artist.qq || null,
      kugou: artist.kugou || null,
      kuwo: artist.kuwo || null,
      qishui: artist.qishui || null,
      spotify: artist.spotify || null,
      youtube: artist.youtube || null,
      appleMusic: artist.appleMusic || null,
      soundCloud: artist.soundCloud || null
    };
    
    // 构建返回数据
    const artistData = {
      ...artist.toJSON(),
      platforms: platformLinks,
      statistics: {
        songCount: songCount[0]?.count || 0,
        albumCount: albumCount[0]?.count || 0
      }
    };
    
    // 如果有关联的主艺人，添加到返回数据中
    if (canonicalArtist) {
      // 构建主艺人的平台链接
      const canonicalArtistPlatforms = {
        netease: canonicalArtist.netease || null,
        qq: canonicalArtist.qq || null,
        kugou: canonicalArtist.kugou || null,
        kuwo: canonicalArtist.kuwo || null,
        qishui: canonicalArtist.qishui || null,
        spotify: canonicalArtist.spotify || null,
        youtube: canonicalArtist.youtube || null,
        appleMusic: canonicalArtist.appleMusic || null,
        soundCloud: canonicalArtist.soundCloud || null
      };
      
      // 将主艺人添加到返回数据中
      artistData.canonicalArtist = {
        ...canonicalArtist.toJSON(),
        platforms: canonicalArtistPlatforms
      };
      
      console.log(`[调试] 返回艺人 ${id} (${artist.name}) 的关联主艺人信息: ${artistData.canonicalArtist.id} (${artistData.canonicalArtist.name})`);
      console.log(`[调试] 主艺人平台链接:`, Object.entries(canonicalArtistPlatforms)
        .filter(([_, value]) => value)
        .map(([key, value]) => `${key}: ${value.substring(0, 30)}...`)
      );
    } else if (artist.canonicalArtistId) {
      console.log(`[调试] 警告: 艺人 ${id} 有canonicalArtistId=${artist.canonicalArtistId}，但未能查询到对应的主艺人`);
    }
    
    res.json(artistData);
  } catch (error) {
    console.error('获取艺术家详情失败:', error);
    res.status(500).json({ message: '获取艺术家详情失败', error: error.message });
  }
});

// 删除艺术家（普通用户只能删除自己创建的艺人）
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`用户 ${req.user.id} 尝试删除艺人 ID: ${id}`);
    
    // 查找艺术家
    const artist = await Artist.findByPk(id);
    
    if (!artist) {
      return res.status(404).json({ message: '艺术家不存在' });
    }
    
    // 权限检查：只有管理员或创建者可以删除
    if (req.user.role !== 'admin' && artist.createdById !== req.user.id) {
      return res.status(403).json({ message: '无权删除此艺术家' });
    }
    
    // 检查是否有关联的已审核通过专辑中的歌曲
    // 1. 获取所有已审核通过的专辑
    const approvedAlbums = await Album.findAll({
      where: { status: 'approved' },
      attributes: ['id']
    });
    
    if (approvedAlbums.length > 0) {
      // 2. 获取这些已审核通过专辑中的所有歌曲
      const approvedAlbumIds = approvedAlbums.map(album => album.id);
      
      const approvedSongs = await Song.findAll({
        where: { 
          albumId: { [Op.in]: approvedAlbumIds }
        },
        attributes: ['id']
      });
      
      if (approvedSongs.length > 0) {
        // 3. 检查这些歌曲是否与当前歌手关联
        const approvedSongIds = approvedSongs.map(song => song.id);
        
        const relationCount = await sequelize.query(
          'SELECT COUNT(*) as count FROM songartists WHERE ArtistId = :artistId AND SongId IN (:songIds)',
          {
            replacements: { 
              artistId: id,
              songIds: approvedSongIds
            },
            type: sequelize.QueryTypes.SELECT
          }
        );
        
        if (relationCount[0].count > 0) {
          return res.status(400).json({ 
            message: '无法删除该歌手，该歌手在已审核通过的专辑中有关联的歌曲',
            relationCount: relationCount[0].count 
          });
        }
      }
    }
    
    // 检查是否有关联的修改申请
    const ArtistEditRequest = require('../models/ArtistEditRequest');
    const requestCount = await ArtistEditRequest.count({
      where: { artistId: id }
    });
    
    if (requestCount > 0) {
      // 删除关联的修改申请
      await ArtistEditRequest.destroy({
        where: { artistId: id }
      });
      console.log(`已删除 ${requestCount} 个关联的修改申请`);
    }
    
    // 删除与未审核专辑中歌曲的关联
    await sequelize.query(
      `DELETE FROM songartists 
       WHERE ArtistId = :artistId 
       AND SongId NOT IN (
         SELECT s.id FROM songs s
         INNER JOIN albums a ON s.albumId = a.id
         WHERE a.status = 'approved'
       )`,
      {
        replacements: { artistId: id },
        type: sequelize.QueryTypes.DELETE
      }
    );
    console.log('已删除与非审核通过专辑歌曲的关联');
    
    // 删除艺人头像文件
    if (artist.avatarUrl) {
      const avatarPath = path.join(__dirname, '../../uploads/images', artist.avatarUrl);
      if (fs.existsSync(avatarPath)) {
        fs.unlinkSync(avatarPath);
        console.log(`已删除艺人头像文件: ${artist.avatarUrl}`);
      }
      
      // 检查并删除缩略图
      const thumbDir = path.join(__dirname, '../../uploads/images/thumbnails');
      const thumbPath = path.join(thumbDir, `thumb_${artist.avatarUrl}`);
      if (fs.existsSync(thumbPath)) {
        fs.unlinkSync(thumbPath);
        console.log(`已删除艺人头像缩略图`);
      }
    }
    
    // 删除歌手
    await artist.destroy();
    console.log(`成功删除艺人: ${artist.name}`);
    
    res.json({ 
      message: '歌手删除成功',
      deletedArtist: {
        id: artist.id,
        name: artist.name
      }
    });
  } catch (error) {
    console.error('删除歌手失败:', error);
    res.status(500).json({ message: '删除歌手失败', error: error.message });
  }
});

module.exports = router; 