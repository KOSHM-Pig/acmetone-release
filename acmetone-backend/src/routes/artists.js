const express = require('express');
const router = express.Router();
const { Artist, User, Album, Song, sequelize } = require('../models');
const { auth } = require('../middleware/auth');
const { Op } = require('sequelize');

// 辅助函数：查询艺人的主歌手信息
async function getCanonicalArtistsInfo(artistIds) {
  console.log(`[调试] 开始查询艺人的主歌手信息，艺人IDs: ${artistIds}`);
  
  // 查询所有有canonicalArtistId的艺人
  const artistsWithCanonical = await Artist.findAll({
    where: {
      id: { [Op.in]: artistIds },
      canonicalArtistId: { [Op.not]: null }
    },
    attributes: ['id', 'name', 'canonicalArtistId']
  });
  
  console.log(`[调试] 找到 ${artistsWithCanonical.length} 个有关联主歌手的艺人`);
  
  if (artistsWithCanonical.length === 0) {
    return {};
  }
  
  // 获取所有关联的主歌手ID
  const canonicalArtistIds = [...new Set(artistsWithCanonical.map(a => a.canonicalArtistId))];
  console.log(`[调试] 需要查询 ${canonicalArtistIds.length} 个不同的主歌手: ${canonicalArtistIds.join(', ')}`);
  
  // 查询所有主歌手信息（不包含身份证号码和实名）
  const canonicalArtists = await Artist.findAll({
    where: { id: { [Op.in]: canonicalArtistIds } },
    attributes: [
      'id', 'name', 'avatarUrl', 'region', 'artistType', 'description', 
      'netease', 'qq', 'kugou', 'kuwo', 'qishui', 'spotify', 'youtube', 
      'appleMusic', 'soundCloud', 'isNewArtist', 'createdById', 'createdAt', 'updatedAt'
      // 明确不包含 'realName' 和 'id_number' 字段
    ],
    include: [{
      model: User,
      as: 'createdBy',
      attributes: ['id', 'username']
    }]
  });
  
  console.log(`[调试] 成功查询到 ${canonicalArtists.length} 个主歌手的信息`);
  
  // 创建主歌手ID到主歌手对象的映射
  const canonicalArtistsMap = {};
  canonicalArtists.forEach(artist => {
    const artistData = artist.toJSON();
    
    // 构建平台链接对象
    artistData.platforms = {
      netease: artistData.netease || "",
      qq: artistData.qq || "",
      kugou: artistData.kugou || "",
      kuwo: artistData.kuwo || "",
      qishui: artistData.qishui || "",
      spotify: artistData.spotify || "",
      youtube: artistData.youtube || "",
      appleMusic: artistData.appleMusic || "",
      soundCloud: artistData.soundCloud || ""
    };
    
    canonicalArtistsMap[artist.id] = artistData;
  });
  
  // 创建艺人ID到其主歌手的映射
  const result = {};
  artistsWithCanonical.forEach(artist => {
    if (canonicalArtistsMap[artist.canonicalArtistId]) {
      // 使用艺人ID作为键，主歌手信息作为值
      result[artist.id] = canonicalArtistsMap[artist.canonicalArtistId];
      
      console.log(`[调试] 艺人 ${artist.id} (${artist.name}) 关联到主歌手 ${artist.canonicalArtistId} (${canonicalArtistsMap[artist.canonicalArtistId].name})`);
    }
  });
  
  // 记录详细的映射信息
  const mappingDetails = Object.keys(result).map(artistId => ({
    artistId,
    canonicalArtistId: result[artistId].id,
    canonicalArtistName: result[artistId].name
  }));
  
  console.log(`[调试] 成功为 ${Object.keys(result).length} 个艺人找到主歌手信息`);
  console.log(`[调试] 详细映射信息:`, mappingDetails);
  
  return result;
}

// 获取用户可见的歌手列表
router.get('/', auth, async (req, res) => {
  try {
    console.log('获取用户可见歌手列表请求');
    console.log('用户信息:', { id: req.user.id, role: req.user.role });
    
      // 检查是否需要排除avatarUrl字段
  const excludeAvatar = req.query.excludeAvatar === 'true';
  console.log('是否排除avatarUrl字段:', excludeAvatar);
    
    // 构建查询属性列表
    let attributes = undefined; // 默认查询所有字段
    
      // 如果请求中指定了excludeAvatar=true，则定义要查询的字段，排除avatarUrl
  if (excludeAvatar) {
      attributes = [
        'id', 'name', 'realName', 'id_number', 'createdById', 
        'netease', 'qq', 'kugou', 'kuwo', 'qishui',
        'spotify', 'youtube', 'appleMusic', 'soundCloud',
        'description', 'alias', 'artistType', 'region',
        'createdAt', 'updatedAt', 'canonicalArtistId'
      ];
      // 注意：这里排除了avatarUrl字段
    } else {
      attributes = [
        'id', 'name', 'realName', 'id_number', 'createdById', 
        'netease', 'qq', 'kugou', 'kuwo', 'qishui',
        'spotify', 'youtube', 'appleMusic', 'soundCloud',
        'description', 'alias', 'artistType', 'region',
        'avatarUrl', 'createdAt', 'updatedAt', 'isNewArtist', 'canonicalArtistId'
      ];
    }
    
    // 管理员可以查看所有歌手
    if (req.user.role === 'admin') {
      console.log('管理员用户，返回所有歌手');
      const artists = await Artist.findAll({
        attributes,
        include: [{
          model: User,
          as: 'createdBy',
          attributes: ['id', 'username']
        }],
        order: [['name', 'ASC']]
      });
      
      // 处理返回数据
      const formattedArtists = artists.map(artist => {
        const artistData = artist.toJSON();
        
        // 标记是否为当前用户创建
        artistData.isCreatedByCurrentUser = (artist.createdById === req.user.id);
        
        // 构建平台链接对象
        artistData.platforms = {
          netease: artistData.netease || "",
          qq: artistData.qq || "",
          kugou: artistData.kugou || "",
          kuwo: artistData.kuwo || "",
          qishui: artistData.qishui || "",
          spotify: artistData.spotify || "",
          youtube: artistData.youtube || "",
          appleMusic: artistData.appleMusic || "",
          soundCloud: artistData.soundCloud || ""
        };
        
        return artistData;
      });
      
      // 查询主歌手信息
      const includeCanonical = req.query.includeCanonical !== 'false'; // 默认为true
      if (includeCanonical) {
        console.log('[调试] 管理员查询所有艺人的主歌手信息');
        
        try {
          // 获取所有艺人ID
          const artistIds = formattedArtists.map(artist => artist.id);
          
          // 查询主歌手信息
          const canonicalArtistsMap = await getCanonicalArtistsInfo(artistIds);
          
          // 将主歌手信息添加到返回数据中
          formattedArtists.forEach(artist => {
            // 直接使用艺人ID查找其主歌手信息
            if (canonicalArtistsMap[artist.id]) {
              artist.canonicalArtist = canonicalArtistsMap[artist.id];
              console.log(`[调试] 为艺人 ${artist.id} (${artist.name}) 添加主歌手信息: ${artist.canonicalArtist.id} (${artist.canonicalArtist.name})`);
            } else if (artist.canonicalArtistId) {
              console.log(`[警告] 艺人 ${artist.id} (${artist.name}) 有canonicalArtistId=${artist.canonicalArtistId}，但未找到对应的主歌手信息`);
            }
          });
          
          console.log(`[调试] 为 ${Object.keys(canonicalArtistsMap).length} 个艺人添加了主歌手信息`);
        } catch (error) {
          console.error('[调试] 查询主歌手信息失败:', error);
        }
      }
      
      return res.json(formattedArtists);
    }
    
    // 普通用户只能看到自己创建的歌手
    console.log('普通用户，只返回用户创建的歌手');
    const userCreatedArtists = await Artist.findAll({
      where: { createdById: req.user.id },
      attributes,
      include: [{
        model: User,
        as: 'createdBy',
        attributes: ['id', 'username']
      }],
      order: [['name', 'ASC']]
    });
    
    console.log(`用户创建的歌手数量: ${userCreatedArtists.length}`);
    
    // 处理返回数据
    const formattedArtists = userCreatedArtists.map(artist => {
      const artistData = artist.toJSON();
      
      // 标记是否为当前用户创建
      artistData.isCreatedByCurrentUser = true; // 这里一定是true，因为只返回用户创建的歌手
      
      // 构建平台链接对象
      artistData.platforms = {
        netease: artistData.netease || "",
        qq: artistData.qq || "",
        kugou: artistData.kugou || "",
        kuwo: artistData.kuwo || "",
        qishui: artistData.qishui || "",
        spotify: artistData.spotify || "",
        youtube: artistData.youtube || "",
        appleMusic: artistData.appleMusic || "",
        soundCloud: artistData.soundCloud || ""
      };
      
      return artistData;
    });
    
    // 查询主歌手信息
    const includeCanonical = req.query.includeCanonical !== 'false'; // 默认为true
    if (includeCanonical && formattedArtists.length > 0) {
      console.log('[调试] 查询主歌手信息');
      
      try {
        // 获取所有艺人ID
        const artistIds = formattedArtists.map(artist => artist.id);
        
        // 查询主歌手信息
        const canonicalArtistsMap = await getCanonicalArtistsInfo(artistIds);
        
        // 将主歌手信息添加到返回数据中
        formattedArtists.forEach(artist => {
          // 直接使用艺人ID查找其主歌手信息
          if (canonicalArtistsMap[artist.id]) {
            artist.canonicalArtist = canonicalArtistsMap[artist.id];
            console.log(`[调试] 为艺人 ${artist.id} (${artist.name}) 添加主歌手信息: ${artist.canonicalArtist.id} (${artist.canonicalArtist.name})`);
          } else if (artist.canonicalArtistId) {
            console.log(`[警告] 艺人 ${artist.id} (${artist.name}) 有canonicalArtistId=${artist.canonicalArtistId}，但未找到对应的主歌手信息`);
          }
        });
        
        console.log(`[调试] 为 ${Object.keys(canonicalArtistsMap).length} 个艺人添加了主歌手信息`);
      } catch (error) {
        console.error('[调试] 查询主歌手信息失败:', error);
      }
    }
    
    // 详细记录每个返回的歌手信息
    console.log(`[调试] 返回 ${formattedArtists.length} 个歌手的详细信息:`);
    formattedArtists.forEach((artist, index) => {
      console.log(`[调试] 歌手 #${index + 1}:`, {
        id: artist.id,
        name: artist.name,
        realName: artist.realName ? '已设置' : '未设置',
        canonicalArtistId: artist.canonicalArtistId,
        hasCanonicalArtistId: artist.canonicalArtistId ? true : false,
        hasCanonicalArtist: !!artist.canonicalArtist,
        canonicalArtistInfo: artist.canonicalArtist ? {
          id: artist.canonicalArtist.id,
          name: artist.canonicalArtist.name,
          description: artist.canonicalArtist.description ? '已设置' : '未设置',
          platforms: artist.canonicalArtist.platforms ? Object.keys(artist.canonicalArtist.platforms).filter(key => artist.canonicalArtist.platforms[key]) : []
        } : null,
        isNewArtist: artist.isNewArtist,
        platforms: Object.keys(artist.platforms).filter(key => artist.platforms[key])
      });
    });
    
    console.log(`返回 ${formattedArtists.length} 个歌手`);
    res.json(formattedArtists);
  } catch (error) {
    console.error('获取用户可见歌手列表错误:', error);
    res.status(500).json({ message: '获取歌手列表失败', error: error.message });
  }
});

// 搜索艺人信息
router.get('/search', auth, async (req, res) => {
  try {
    const { name } = req.query;
    
    if (!name || name.trim().length < 1) {
      return res.status(400).json({ message: '请提供艺人名称进行搜索' });
    }
    
    console.log('搜索艺人:', name);
    console.log('用户信息:', {
      id: req.user.id, 
      role: req.user.role
    });
    
    // 构建基础查询条件
    const whereCondition = {
      [Op.or]: [
        { name: { [Op.like]: `%${name}%` } },
        { realName: { [Op.like]: `%${name}%` } }
      ]
    };
    
    // 管理员可以搜索所有歌手
    if (req.user.role === 'admin') {
      console.log('管理员用户，搜索所有歌手');
      const artists = await Artist.findAll({
        where: whereCondition,
        include: [{
          model: User,
          as: 'createdBy',
          attributes: ['id', 'username']
        }],
        limit: 10, // 限制返回结果数量
        order: [['name', 'ASC']]
      });
      
      console.log(`搜索结果: 找到 ${artists.length} 个歌手`);
      return res.json(artists);
    }
    
    // 普通用户只能搜索自己创建的歌手
    const userCondition = {
      createdById: req.user.id // 只能搜索自己创建的歌手
    };
    
    // 合并搜索条件
    const finalCondition = {
      [Op.and]: [
        whereCondition,
        userCondition
      ]
    };
    
    console.log('普通用户搜索条件:', JSON.stringify(finalCondition));
    
    // 搜索艺人信息
    const artists = await Artist.findAll({
      where: finalCondition,
      include: [{
        model: User,
        as: 'createdBy',
        attributes: ['id', 'username']
      }],
      limit: 10, // 限制返回结果数量
      order: [['name', 'ASC']]
    });
    
    console.log(`找到 ${artists.length} 个匹配的艺人`);
    
    res.json(artists);
  } catch (error) {
    console.error('搜索艺人错误:', error);
    res.status(500).json({ message: '搜索艺人失败', error: error.message });
  }
});

// 根据ID获取艺人详细信息
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { albumId, songId } = req.query; // 获取查询参数
    
    // 查询艺人信息，确保包含canonicalArtistId字段
    const artist = await Artist.findByPk(id, {
      attributes: {
        include: ['id', 'name', 'realName', 'id_number', 'netease', 'qq', 'kugou', 'kuwo', 'qishui',
                 'spotify', 'youtube', 'appleMusic', 'soundCloud', 'description',
                 'avatarUrl', 'region', 'artistType', 'isNewArtist', 'canonicalArtistId',
                 'createdById', 'createdAt', 'updatedAt']
      },
      include: [{
        model: User,
        as: 'createdBy',
        attributes: ['id', 'username']
      }]
    });
    
    console.log(`[调试] 查询艺人 ${id} 信息，canonicalArtistId=${artist?.canonicalArtistId || 'NULL'}`);
    
    if (!artist) {
      return res.status(404).json({ message: '艺人不存在' });
    }
    
    // 权限控制：
    // 1. 管理员可以查看所有艺人
    // 2. 普通用户可以查看自己创建的艺人
    // 3. 如果提供了albumId和songId，检查该歌手是否与用户的专辑-歌曲关联
    let hasAccess = false;
    
    if (req.user.role === 'admin' || artist.createdById === req.user.id) {
      // 管理员或创建者可以访问
      hasAccess = true;
      console.log(`用户有权访问歌手 ${id}，因为是管理员或创建者`);
    } else if (albumId && songId) {
      // 如果提供了albumId和songId，验证用户是否有权访问该专辑，以及歌手是否与该歌曲关联
        console.log(`检查用户是否有权访问专辑(${albumId})的歌曲(${songId})的歌手(${id})`);
        
      try {
        // 检查专辑是否属于该用户
        const album = await Album.findOne({
          where: {
            id: albumId,
            submittedById: req.user.id
          }
        });
        
        if (!album) {
          console.log(`用户无权访问专辑 ${albumId}`);
          return res.status(403).json({ message: '无权访问此艺人信息' });
        }
        
        // 检查歌曲是否属于该专辑
        const song = await Song.findOne({
          where: {
            id: songId,
            albumId: albumId
          }
        });
        
        if (!song) {
          console.log(`歌曲 ${songId} 不属于专辑 ${albumId}`);
          return res.status(403).json({ message: '无权访问此艺人信息' });
        }
        
        // 检查歌手是否与该歌曲关联
        // 首先检查Song.artists JSON字段
        let isArtistRelated = false;
        
        if (song.artists && Array.isArray(song.artists)) {
          isArtistRelated = song.artists.some(artistId => 
            artistId === parseInt(id) || artistId === id
          );
          
          if (isArtistRelated) {
            console.log(`歌手 ${id} 在歌曲 ${songId} 的artists字段中找到`);
          }
        }
        
        // 如果在JSON字段中没找到，检查关联表
        if (!isArtistRelated) {
          const songArtistRelation = await sequelize.query(
            'SELECT * FROM `songartists` WHERE `SongId` = :songId AND `ArtistId` = :artistId',
            {
              replacements: { songId, artistId: id },
              type: sequelize.QueryTypes.SELECT
            }
          );
          
          isArtistRelated = songArtistRelation.length > 0;
          
          if (isArtistRelated) {
            console.log(`歌手 ${id} 在songartists关联表中与歌曲 ${songId} 关联`);
          }
        }
        
        if (isArtistRelated) {
          hasAccess = true;
          console.log(`允许用户访问歌手 ${id}，因为它与用户的专辑-歌曲相关联`);
        }
      } catch (error) {
        console.error(`检查专辑-歌曲关联失败:`, error);
        return res.status(500).json({ message: '检查访问权限时出错', error: error.message });
        }
      }
      
    // 如果没有访问权限，返回403
    if (!hasAccess) {
      console.log(`用户无权访问歌手 ${id}`);
      return res.status(403).json({ message: '无权访问此艺人信息' });
    }
    
    // 处理返回数据
    const artistData = artist.toJSON();
    
    // 构建平台链接对象
    artistData.platforms = {
      netease: artistData.netease || "",
      qq: artistData.qq || "",
      kugou: artistData.kugou || "",
      kuwo: artistData.kuwo || "",
      qishui: artistData.qishui || "",
      spotify: artistData.spotify || "",
      youtube: artistData.youtube || "",
      appleMusic: artistData.appleMusic || "",
      soundCloud: artistData.soundCloud || ""
    };
    
        // 查询主歌手信息
    const includeCanonical = req.query.includeCanonical !== 'false'; // 默认为true
    console.log(`[调试] includeCanonical=${includeCanonical}, artistData.canonicalArtistId=${artistData.canonicalArtistId}`);
    console.log(`[调试] 艺人数据:`, {
      id: artistData.id,
      name: artistData.name,
      canonicalArtistId: artistData.canonicalArtistId,
      hasCanonicalArtistId: !!artistData.canonicalArtistId
    });
    
    if (includeCanonical && artistData.canonicalArtistId) {
      console.log(`[调试] 查询艺人 ${id} 的主歌手信息: ${artistData.canonicalArtistId}`);
      
      try {
        // 查询主歌手信息，明确排除实名和身份证号
        const canonicalArtist = await Artist.findByPk(artistData.canonicalArtistId, {
          attributes: [
            'id', 'name', 'avatarUrl', 'region', 'artistType', 'description', 
            'netease', 'qq', 'kugou', 'kuwo', 'qishui', 'spotify', 'youtube', 
            'appleMusic', 'soundCloud', 'isNewArtist', 'createdById', 'createdAt', 'updatedAt'
            // 明确不包含 'realName' 和 'id_number' 字段
          ],
          include: [{
            model: User,
            as: 'createdBy',
            attributes: ['id', 'username']
          }]
        });
        
        if (canonicalArtist) {
          const canonicalArtistData = canonicalArtist.toJSON();
          
          // 构建主歌手的平台链接对象
          canonicalArtistData.platforms = {
            netease: canonicalArtistData.netease || "",
            qq: canonicalArtistData.qq || "",
            kugou: canonicalArtistData.kugou || "",
            kuwo: canonicalArtistData.kuwo || "",
            qishui: canonicalArtistData.qishui || "",
            spotify: canonicalArtistData.spotify || "",
            youtube: canonicalArtistData.youtube || "",
            appleMusic: canonicalArtistData.appleMusic || "",
            soundCloud: canonicalArtistData.soundCloud || ""
          };
          
          // 将主歌手信息添加到返回数据中
          artistData.canonicalArtist = canonicalArtistData;
          
          console.log(`[调试] 成功查询到艺人 ${id} 的主歌手信息: ${canonicalArtistData.id} (${canonicalArtistData.name})`);
          console.log(`[调试] 主歌手详细信息:`, {
            id: canonicalArtistData.id,
            name: canonicalArtistData.name,
            description: canonicalArtistData.description ? '已设置' : '未设置',
            platforms: Object.keys(canonicalArtistData.platforms).filter(key => canonicalArtistData.platforms[key])
          });
        } else {
          console.log(`[调试] 警告: 未找到ID为 ${artistData.canonicalArtistId} 的主歌手`);
        }
      } catch (error) {
        console.error('[调试] 查询主歌手信息失败:', error);
      }
    }
    
    // 详细记录返回的艺人信息
    console.log(`[调试] 返回单个艺人 ${id} 的详细信息:`, {
      id: artistData.id,
      name: artistData.name,
      realName: artistData.realName ? '已设置' : '未设置',
      canonicalArtistId: artistData.canonicalArtistId,
      hasCanonicalArtist: !!artistData.canonicalArtist,
      canonicalArtistInfo: artistData.canonicalArtist ? {
        id: artistData.canonicalArtist.id,
        name: artistData.canonicalArtist.name,
        platforms: Object.keys(artistData.canonicalArtist.platforms).filter(key => artistData.canonicalArtist.platforms[key])
      } : null,
      isNewArtist: artistData.isNewArtist,
      platforms: Object.keys(artistData.platforms).filter(key => artistData.platforms[key])
    });
    
    res.json(artistData);
  } catch (error) {
    console.error('获取艺人信息错误:', error);
    res.status(500).json({ message: '获取艺人信息失败', error: error.message });
  }
});

// 添加新艺人
router.post('/', auth, async (req, res) => {
  try {
    const { name, realName, id_number, platforms } = req.body;
    
    if (!name) {
      return res.status(400).json({ message: '歌手名称不能为空' });
    }
    
    console.log('创建新艺人:', {
      name,
      realName,
      platforms
    });
    
    // 检查是否为全新歌手（无平台链接）
    const hasAnyPlatformLink = platforms && Object.values(platforms).some(link => link && link.trim() !== '');
    const isNewArtist = !hasAnyPlatformLink;
    
    console.log(`歌手类型: ${isNewArtist ? '全新歌手（无平台链接）' : '已有平台链接的歌手'}`);
    
    // 创建新艺人，记录创建者
    const artist = await Artist.create({
      name,
      realName,
      id_number,
      netease: platforms?.netease || null,
      qq: platforms?.qq || null,
      kugou: platforms?.kugou || null,
      kuwo: platforms?.kuwo || null,
      qishui: platforms?.qishui || null,
      spotify: platforms?.spotify || null,
      youtube: platforms?.youtube || null,
      appleMusic: platforms?.appleMusic || null,
      soundCloud: platforms?.soundCloud || null,
      isNewArtist: isNewArtist, // 设置是否为全新歌手
      createdById: req.user.id
    });
    
    console.log(`用户 ${req.user.id} 创建了新艺人: ${name}, ID: ${artist.id}`);
    
    res.status(201).json(artist);
  } catch (error) {
    console.error('创建艺人错误:', error);
    res.status(500).json({ message: '创建艺人失败', error: error.message });
  }
});

// 批量更新歌手信息
router.post('/batch-update', auth, async (req, res) => {
  try {
    // 仅管理员可以批量更新
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: '只有管理员可以批量更新歌手信息' });
    }
    
    const { artists } = req.body;
    
    if (!artists || !Array.isArray(artists) || artists.length === 0) {
      return res.status(400).json({ message: '无效的请求数据' });
    }
    
    console.log(`收到批量更新请求，共 ${artists.length} 个歌手`);
    
    // 准备批量更新
    const updatePromises = artists.map(async (artistData) => {
      if (!artistData.id) return null;
      
      try {
        const artist = await Artist.findByPk(artistData.id);
        if (!artist) {
          console.log(`歌手ID ${artistData.id} 不存在`);
          return { id: artistData.id, success: false, error: '歌手不存在' };
        }
        
        console.log(`更新歌手: ${artist.name} (ID: ${artist.id})`);
        
        // 更新字段
        await artist.update({
          name: artistData.name || artist.name,
          realName: artistData.realName || artist.realName,
          description: artistData.description || artist.description,
          avatarUrl: artistData.avatarUrl || artist.avatarUrl
        });
        
        console.log(`歌手 ${artist.name} 更新成功`);
        return { id: artist.id, success: true };
      } catch (error) {
        console.error(`更新歌手 ID:${artistData.id} 信息失败:`, error);
        return { id: artistData.id, success: false, error: error.message };
      }
    });
    
    const results = await Promise.all(updatePromises);
    const validResults = results.filter(result => result !== null);
    
    // 统计成功和失败的数量
    const successCount = validResults.filter(result => result.success).length;
    const failCount = validResults.filter(result => !result.success).length;
    
    console.log(`批量更新完成: 成功 ${successCount} 个, 失败 ${failCount} 个`);
    
    res.json({ 
      message: `更新完成: 成功 ${successCount} 个, 失败 ${failCount} 个`,
      results: validResults
    });
  } catch (error) {
    console.error('批量更新歌手信息失败:', error);
    res.status(500).json({ message: '批量更新歌手信息失败', error: error.message });
  }
});

module.exports = router; 