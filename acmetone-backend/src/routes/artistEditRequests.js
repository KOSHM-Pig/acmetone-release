const express = require('express');
const router = express.Router();
const { ArtistEditRequest, Album, Song, Artist, User, sequelize } = require('../models');
const { auth, adminAuth } = require('../middleware/auth');
const { Op } = require('sequelize');

// 创建歌手信息编辑请求
router.post('/', auth, async (req, res) => {
  try {
    console.log('收到请求数据:', JSON.stringify(req.body, null, 2));
    
    const { artistId, changes, reason, songId } = req.body;
    if (!artistId || !changes || !reason) {
      return res.status(400).json({ message: '缺少必要参数' });
    }
    
    // 验证歌手是否存在
    const artist = await Artist.findByPk(artistId, {
      attributes: ['id', 'name', 'realName', 'canonicalArtistId']
    });
    
    if (!artist) {
      console.log(`艺术家ID ${artistId} 不存在`);
      return res.status(404).json({ message: '歌手不存在' });
    }

    console.log('找到艺术家:', artist.name);
    
    // 如果是关联歌手，则将申请转发到主歌手
    let targetArtistId = artistId;
    let originalArtistId = null;
    let updatedReason = reason;
    
    if (artist.canonicalArtistId) {
      console.log(`歌手 ${artist.id} (${artist.name}) 是关联歌手，将申请转发到主歌手 ${artist.canonicalArtistId}`);
      targetArtistId = artist.canonicalArtistId;
      originalArtistId = artistId;
      
      // 在申请理由中添加关联歌手信息
      updatedReason = `[来自关联歌手 ${artist.name}(ID:${artist.id}) 的申请] ${reason}`;
      
      // 获取主歌手信息用于日志
      const canonicalArtist = await Artist.findByPk(targetArtistId, {
        attributes: ['id', 'name']
      });
      
      if (canonicalArtist) {
        console.log(`主歌手信息: ID=${canonicalArtist.id}, 名称=${canonicalArtist.name}`);
      } else {
        console.log(`警告: 未找到主歌手信息 ID=${targetArtistId}`);
      }
    }
    
    // 检查用户是否已经对这个主歌手提交过申请
    const existingRequest = await ArtistEditRequest.findOne({
      where: {
        artistId: targetArtistId,
        requestedById: req.user.id,
        status: 'pending'
      }
    });
    
    if (existingRequest) {
      console.log(`用户 ${req.user.id} 已经对歌手 ${targetArtistId} 提交过申请，ID: ${existingRequest.id}`);
      return res.status(409).json({ 
        message: '您已经对该歌手提交过修改申请，请等待管理员审核或撤销之前的申请',
        existingRequestId: existingRequest.id
      });
    }
    
    // 创建编辑请求
    try {
      const request = await ArtistEditRequest.create({
        artistId: targetArtistId, // 使用目标歌手ID（可能是主歌手ID）
        requestedById: req.user.id,
        reason: updatedReason,
        newName: changes.newName,
        newRealName: changes.newRealName,
        new_id_number: changes.new_id_number,
        newNetease: changes.newNetease || null,
        newQq: changes.newQq || null,
        newKugou: changes.newKugou || null,
        newKuwo: changes.newKuwo || null,
        newQishui: changes.newQishui || null,
        newSpotify: changes.newSpotify || null,
        newYoutube: changes.newYoutube || null,
        newAppleMusic: changes.newAppleMusic || null,
        newSoundCloud: changes.newSoundCloud || null,
        songId: songId || null,
        metadata: originalArtistId ? JSON.stringify({ originalArtistId }) : null // 记录原始歌手ID
      });
      
      console.log('创建申请成功, ID:', request.id);
      if (originalArtistId) {
        console.log(`申请已从关联歌手(ID:${originalArtistId})转发到主歌手(ID:${targetArtistId})`);
      }
      
      return res.status(201).json(request);
    } catch (error) {
      console.error('创建申请失败:', error);
      if (error.name === 'SequelizeValidationError') {
        const messages = error.errors.map(e => `${e.path}: ${e.message}`);
        return res.status(400).json({ message: '验证错误', errors: messages });
      }
      return res.status(500).json({ message: '创建申请失败', error: error.message });
    }
  } catch (error) {
    console.error('未知错误:', error);
    return res.status(500).json({ message: '服务器内部错误', error: error.message });
  }
});

// 获取用户的所有编辑请求
router.get('/my', auth, async (req, res) => {
  try {
    // 使用更简单的查询方式
    const requests = await ArtistEditRequest.findAll({ 
      where: { requestedById: req.user.id },
      include: [
        {
          model: Artist
        },
        {
          model: User,
          as: 'requestedBy',
          attributes: ['id', 'username', 'email']
        }
      ]
    });

    // 手动关联Song和Album信息
    const formattedRequests = await Promise.all(requests.map(async (request) => {
      const requestData = request.toJSON();
      
      // 如果需要Song和Album信息，可以额外查询
      if (request.songId) {
        const song = await Song.findByPk(request.songId, {
          attributes: ['id', 'title', 'albumId']
        });
        
        if (song && song.albumId) {
          const album = await Album.findByPk(song.albumId, {
            attributes: ['id', 'title']
          });
          
          requestData.song = song;
          if (album) {
            requestData.song.album = album;
          }
        }
      }
      
      // 移除敏感信息，除非是管理员
      if (req.user.role !== 'admin') {
        // 移除歌手的身份证号码
        if (requestData.Artist) {
          delete requestData.Artist.id_number;
        }
        // 移除请求中的身份证号码
        delete requestData.new_id_number;
      }
      
      return requestData;
    }));
    
    res.json(formattedRequests);
  } catch (error) {
    console.error('获取我的编辑请求失败:', error);
    res.status(400).json({ message: error.message });
  }
});

// 获取所有待处理的编辑请求（管理员）
router.get('/pending', adminAuth, async (req, res) => {
  try {
    console.log('获取待处理的编辑请求 - 请求头:', req.headers);
    console.log('管理员ID:', req.user.id);
    
    // 直接使用include查询所有关联数据
    const requests = await ArtistEditRequest.findAll({ 
      where: { status: 'pending' },
      include: [
        {
          model: Artist,
          attributes: ['id', 'name', 'realName', 'id_number', 'netease', 'qq', 'kugou', 'kuwo', 'qishui', 'spotify', 'youtube', 'appleMusic', 'soundCloud']
        },
        {
          model: User,
          as: 'requestedBy',
          attributes: ['id', 'username', 'email']
        },
        {
          model: Song,
          attributes: ['id', 'title', 'albumId'],
          include: [
            {
              model: Album,
              attributes: ['id', 'title']
            }
          ]
        }
      ]
    });
    
    console.log(`找到 ${requests.length} 个待处理请求`);
    
    if (requests.length > 0) {
      console.log('第一个请求示例:', {
        id: requests[0].id,
        artistId: requests[0].artistId,
        songId: requests[0].songId,
        Artist: requests[0].Artist ? {
          id: requests[0].Artist.id,
          name: requests[0].Artist.name
        } : null,
        Song: requests[0].Song ? {
          id: requests[0].Song.id,
          title: requests[0].Song.title,
          Album: requests[0].Song.Album ? {
            id: requests[0].Song.Album.id,
            title: requests[0].Song.Album.title
          } : null
        } : null
      });
    }
    
    res.json(requests);
  } catch (error) {
    console.error('获取待处理请求失败:', error);
    res.status(500).json({ message: '获取待处理请求失败', error: error.message });
  }
});

// 获取所有编辑请求（管理员）
router.get('/', adminAuth, async (req, res) => {
  try {
    console.log('获取所有编辑请求');
    
    // 直接使用include查询所有关联数据，不限制状态
    const requests = await ArtistEditRequest.findAll({ 
      include: [
        {
          model: Artist,
          attributes: ['id', 'name', 'realName', 'id_number', 'netease', 'qq', 'kugou', 'kuwo', 'qishui', 'spotify', 'youtube', 'appleMusic', 'soundCloud']
        },
        {
          model: User,
          as: 'requestedBy',
          attributes: ['id', 'username', 'email']
        },
        {
          model: Song,
          attributes: ['id', 'title', 'albumId'],
          include: [
            {
              model: Album,
              attributes: ['id', 'title']
            }
          ]
        }
      ],
      order: [['createdAt', 'DESC']] // 按创建时间降序排序
    });
    
    console.log(`找到 ${requests.length} 个编辑请求`);
    
    // 处理返回数据，添加艺术家名称和申请人名称
    const formattedRequests = requests.map(request => {
      const requestData = request.toJSON();
      
      // 确保字段名称正确
      if (requestData.new_id_number !== undefined) {
        console.log(`请求 ID ${requestData.id} 包含 new_id_number 字段: ${requestData.new_id_number}`);
      } else {
        console.log(`请求 ID ${requestData.id} 不包含 new_id_number 字段`);
      }
      
      requestData.artistName = request.Artist ? request.Artist.name : '未知歌手';
      requestData.artistRealName = request.Artist ? request.Artist.realName : '';
      requestData.requesterName = request.requestedBy ? request.requestedBy.username : '未知用户';
      return requestData;
    });
    
    res.json(formattedRequests);
  } catch (error) {
    console.error('获取编辑请求失败:', error);
    res.status(500).json({ message: '获取编辑请求失败', error: error.message });
  }
});

// 处理编辑请求（管理员）
router.patch('/:id/status', adminAuth, async (req, res) => {
  try {
    const { status, comment } = req.body;
    const request = await ArtistEditRequest.findByPk(req.params.id);

    if (!request) {
      return res.status(404).json({ message: '编辑请求不存在' });
    }

    if (status === 'approved') {
      const artist = await Artist.findByPk(request.artistId);
      if (!artist) {
        return res.status(404).json({ message: '歌手不存在' });
      }

      // 更新歌手信息
      artist.name = request.newName || artist.name;
      artist.realName = request.newRealName || artist.realName;
      artist.id_number = request.new_id_number || artist.id_number;
      artist.netease = request.newNetease || artist.netease;
      artist.qq = request.newQq || artist.qq;
      artist.kugou = request.newKugou || artist.kugou;
      artist.kuwo = request.newKuwo || artist.kuwo;
      artist.qishui = request.newQishui || artist.qishui;
      artist.spotify = request.newSpotify || artist.spotify;
      artist.youtube = request.newYoutube || artist.youtube;
      artist.appleMusic = request.newAppleMusic || artist.appleMusic;
      artist.soundCloud = request.newSoundCloud || artist.soundCloud;
      await artist.save();
    }

    request.status = status;
    request.comment = comment;
    await request.save();
    res.json(request);
  } catch (error) {
    console.error('处理编辑请求失败:', error);
    res.status(400).json({ message: error.message });
  }
});

// 获取所有歌手信息（作为Wiki）
router.get('/artists', auth, async (req, res) => {
  try {
    let artistsToReturn = [];
    
    // 管理员可以查看所有歌手
    if (req.user.role === 'admin') {
      // 查询所有歌手
      const allArtists = await Artist.findAll({
        include: [{
          model: Song,
          as: 'Songs',
          attributes: ['id', 'albumId'],
          through: { attributes: [] }
        }]
      });
      
      artistsToReturn = allArtists;
    } else {
      // 普通用户只能查看与自己上传的专辑关联的歌手
      // 首先获取用户创建的所有专辑
      const userAlbums = await Album.findAll({
        where: { submittedById: req.user.id },
        attributes: ['id']
      });
      
      const userAlbumIds = userAlbums.map(album => album.id);
      
      if (userAlbumIds.length === 0) {
        // 用户没有上传任何专辑，返回空数组
        return res.json([]);
      }
      
      // 获取这些专辑中的所有歌曲
      const userSongs = await Song.findAll({
        where: {
          albumId: {
            [Op.in]: userAlbumIds
          }
        },
        attributes: ['id']
      });
      
      const userSongIds = userSongs.map(song => song.id);
      
      if (userSongIds.length === 0) {
        // 用户的专辑中没有任何歌曲，返回空数组
        return res.json([]);
      }
      
      // 从songartists关联表中查找与这些歌曲关联的歌手ID
      const songArtistRelations = await sequelize.query(
        'SELECT DISTINCT `ArtistId` FROM `songartists` WHERE `SongId` IN (:songIds)',
        {
          replacements: { songIds: userSongIds },
          type: sequelize.QueryTypes.SELECT
        }
      );
      
      const artistIds = songArtistRelations.map(relation => relation.ArtistId);
      
      if (artistIds.length === 0) {
        // 没有找到关联的歌手，返回空数组
        return res.json([]);
      }
      
      // 查询这些歌手
      const userArtists = await Artist.findAll({
        where: {
          id: {
            [Op.in]: artistIds
          }
        },
        include: [{
          model: Song,
          as: 'Songs',
          attributes: ['id', 'albumId'],
          through: { attributes: [] }
        }]
      });
      
      artistsToReturn = userArtists;
    }

    // 处理返回数据，添加歌曲和专辑计数
    const formattedArtists = await Promise.all(artistsToReturn.map(async artist => {
      // 获取关联歌曲数量
      const songCount = artist.Songs ? artist.Songs.length : 0;
      
      // 从关联歌曲中获取专辑ID并去重
      const albumIds = [...new Set(artist.Songs.map(song => song.albumId))];
      const albumCount = albumIds.length;
      
      // 转换为普通对象，并构建平台链接对象
      const artistData = artist.toJSON();
      
      const platforms = {
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
      
      // 创建返回对象
      const returnData = {
        id: artist.id,
        name: artist.name,
        realName: artist.realName,
        platforms,
        songCount,
        albumCount,
        createdAt: artist.createdAt,
        updatedAt: artist.updatedAt
      };
      
      // 只有管理员可以看到身份证号码
      if (req.user.role === 'admin') {
        returnData.id_number = artist.id_number;
      }
      
      return returnData;
    }));

    res.json(formattedArtists);
  } catch (error) {
    console.error('获取歌手信息错误:', error);
    res.status(400).json({ message: error.message });
  }
});

// 管理员直接编辑歌手信息
router.put('/artists/:id', adminAuth, async (req, res) => {
  try {
    const { name, realName, id_number, platforms } = req.body;
    const artist = await Artist.findByPk(req.params.id);
    
    if (!artist) {
      return res.status(404).json({ message: '歌手不存在' });
    }
    
    // 更新歌手基本信息
    artist.name = name || artist.name;
    artist.realName = realName || artist.realName;
    artist.id_number = id_number || artist.id_number;
    
    // 更新平台链接
    if (platforms) {
      artist.netease = platforms.netease !== undefined ? platforms.netease : artist.netease;
      artist.qq = platforms.qq !== undefined ? platforms.qq : artist.qq;
      artist.kugou = platforms.kugou !== undefined ? platforms.kugou : artist.kugou;
      artist.kuwo = platforms.kuwo !== undefined ? platforms.kuwo : artist.kuwo;
      artist.qishui = platforms.qishui !== undefined ? platforms.qishui : artist.qishui;
      artist.spotify = platforms.spotify !== undefined ? platforms.spotify : artist.spotify;
      artist.youtube = platforms.youtube !== undefined ? platforms.youtube : artist.youtube;
      artist.appleMusic = platforms.appleMusic !== undefined ? platforms.appleMusic : artist.appleMusic;
      artist.soundCloud = platforms.soundCloud !== undefined ? platforms.soundCloud : artist.soundCloud;
    }
    
    await artist.save();
    
    // 返回更新后的歌手信息
    const platformData = {
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

    res.json({
      id: artist.id,
      name: artist.name,
      realName: artist.realName,
      id_number: artist.id_number,
      platforms: platformData
    });
  } catch (error) {
    console.error('更新歌手信息失败:', error);
    res.status(500).json({ message: '更新歌手信息失败', error: error.message });
  }
});

// 管理员将全新歌手转换为已有链接歌手
router.put('/artists/:id/convert', adminAuth, async (req, res) => {
  try {
    const { platforms } = req.body;
    const artist = await Artist.findByPk(req.params.id);
    
    if (!artist) {
      return res.status(404).json({ message: '歌手不存在' });
    }
    
    // 检查是否为全新歌手
    if (!artist.isNewArtist) {
      return res.status(400).json({ message: '只能转换全新歌手' });
    }
    
    // 检查是否提供了平台链接
    if (!platforms || !Object.values(platforms).some(link => link && link.trim() !== '')) {
      return res.status(400).json({ message: '请提供至少一个平台链接' });
    }
    
    // 更新平台链接
    artist.netease = platforms.netease || artist.netease;
    artist.qq = platforms.qq || artist.qq;
    artist.kugou = platforms.kugou || artist.kugou;
    artist.kuwo = platforms.kuwo || artist.kuwo;
    artist.qishui = platforms.qishui || artist.qishui;
    artist.spotify = platforms.spotify || artist.spotify;
    artist.youtube = platforms.youtube || artist.youtube;
    artist.appleMusic = platforms.appleMusic || artist.appleMusic;
    artist.soundCloud = platforms.soundCloud || artist.soundCloud;
    
    // 更新isNewArtist标志为false
    artist.isNewArtist = false;
    
    await artist.save();
    
    // 返回更新后的歌手信息
    const platformData = {
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
    
    res.json({
      id: artist.id,
      name: artist.name,
      realName: artist.realName,
      id_number: artist.id_number,
      platforms: platformData,
      isNewArtist: artist.isNewArtist
    });
  } catch (error) {
    console.error('转换歌手类型失败:', error);
    res.status(500).json({ message: '转换歌手类型失败', error: error.message });
  }
});

// 管理员删除歌手
router.delete('/artists/:id', adminAuth, async (req, res) => {
  try {
    console.log(`尝试删除艺人 ID: ${req.params.id}`);
    
    const artist = await Artist.findByPk(req.params.id);
    if (!artist) {
      return res.status(404).json({ message: '歌手不存在' });
    }
    
    // 检查是否有关联的已审核通过专辑中的歌曲
    // 1. 获取所有已审核通过的专辑
    const approvedAlbums = await Album.findAll({
      where: { status: 'approved' },
      attributes: ['id']
    });
    
    if (approvedAlbums.length === 0) {
      // 没有已审核通过的专辑，可以安全删除
      console.log('没有已审核通过的专辑，可以安全删除歌手');
    } else {
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
              artistId: req.params.id,
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
    const requestCount = await ArtistEditRequest.count({
      where: { artistId: req.params.id }
    });
    
    if (requestCount > 0) {
      // 删除关联的修改申请
      await ArtistEditRequest.destroy({
        where: { artistId: req.params.id }
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
        replacements: { artistId: req.params.id },
        type: sequelize.QueryTypes.DELETE
      }
    );
    console.log('已删除与非审核通过专辑歌曲的关联');
    
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

router.post('/:id/approve', adminAuth, async (req, res) => {
  try {
    const request = await ArtistEditRequest.findByPk(req.params.id);
    
    if (!request) {
      return res.status(404).json({ message: '编辑请求不存在' });
    }
    
    if (request.status !== 'pending') {
      return res.status(400).json({ message: '该请求已处理' });
    }
    
    const artist = await Artist.findByPk(request.artistId);
    if (!artist) {
      return res.status(404).json({ message: '歌手不存在' });
    }
    
    // 更新歌手信息
    if (request.newName) artist.name = request.newName;
    if (request.newRealName) artist.realName = request.newRealName;
    if (request.new_id_number) artist.id_number = request.new_id_number;
    if (request.newNetease) artist.netease = request.newNetease;
    if (request.newQq) artist.qq = request.newQq;
    if (request.newKugou) artist.kugou = request.newKugou;
    if (request.newKuwo) artist.kuwo = request.newKuwo;
    if (request.newQishui) artist.qishui = request.newQishui;
    if (request.newSpotify) artist.spotify = request.newSpotify;
    if (request.newYoutube) artist.youtube = request.newYoutube;
    if (request.newAppleMusic) artist.appleMusic = request.newAppleMusic;
    if (request.newSoundCloud) artist.soundCloud = request.newSoundCloud;
    
    await artist.save();
    
    // 检查是否有来自关联歌手的申请
    if (request.metadata) {
      try {
        const metadata = JSON.parse(request.metadata);
        if (metadata.originalArtistId) {
          console.log(`检测到来自关联歌手 ${metadata.originalArtistId} 的申请，同步更新关联歌手信息`);
          
          // 获取原始关联歌手
          const originalArtist = await Artist.findByPk(metadata.originalArtistId);
          if (originalArtist) {
            console.log(`找到原始关联歌手: ${originalArtist.name} (ID: ${originalArtist.id})`);
            
            // 同步更新关联歌手信息（不包括敏感信息如身份证号码）
            if (request.newName) originalArtist.name = request.newName;
            if (request.newRealName) originalArtist.realName = request.newRealName;
            // 不同步身份证号码
            if (request.newNetease) originalArtist.netease = request.newNetease;
            if (request.newQq) originalArtist.qq = request.newQq;
            if (request.newKugou) originalArtist.kugou = request.newKugou;
            if (request.newKuwo) originalArtist.kuwo = request.newKuwo;
            if (request.newQishui) originalArtist.qishui = request.newQishui;
            if (request.newSpotify) originalArtist.spotify = request.newSpotify;
            if (request.newYoutube) originalArtist.youtube = request.newYoutube;
            if (request.newAppleMusic) originalArtist.appleMusic = request.newAppleMusic;
            if (request.newSoundCloud) originalArtist.soundCloud = request.newSoundCloud;
            
            await originalArtist.save();
            console.log(`已同步更新关联歌手 ${originalArtist.name} (ID: ${originalArtist.id}) 的信息`);
          } else {
            console.log(`未找到原始关联歌手 ID: ${metadata.originalArtistId}`);
          }
          
          // 查找所有关联到这个主歌手的歌手
          const relatedArtists = await Artist.findAll({
            where: { canonicalArtistId: request.artistId }
          });
          
          console.log(`找到 ${relatedArtists.length} 个关联歌手需要同步更新`);
          
          // 对每个关联歌手，更新共享字段（不包括敏感信息如身份证号码）
          for (const relatedArtist of relatedArtists) {
            // 跳过原始关联歌手，因为已经更新过了
            if (relatedArtist.id.toString() === metadata.originalArtistId.toString()) {
              console.log(`跳过已更新的原始关联歌手 ${relatedArtist.id}`);
              continue;
            }
            
            console.log(`更新关联歌手 ${relatedArtist.id} (${relatedArtist.name})`);
            
            if (request.newName) relatedArtist.name = request.newName;
            if (request.newRealName) relatedArtist.realName = request.newRealName;
            // 不同步身份证号码
            if (request.newNetease) relatedArtist.netease = request.newNetease;
            if (request.newQq) relatedArtist.qq = request.newQq;
            if (request.newKugou) relatedArtist.kugou = request.newKugou;
            if (request.newKuwo) relatedArtist.kuwo = request.newKuwo;
            if (request.newQishui) relatedArtist.qishui = request.newQishui;
            if (request.newSpotify) relatedArtist.spotify = request.newSpotify;
            if (request.newYoutube) relatedArtist.youtube = request.newYoutube;
            if (request.newAppleMusic) relatedArtist.appleMusic = request.newAppleMusic;
            if (request.newSoundCloud) relatedArtist.soundCloud = request.newSoundCloud;
            
            await relatedArtist.save();
          }
        }
      } catch (metadataError) {
        console.error('解析或处理metadata时出错:', metadataError);
        // 继续处理，不中断流程
      }
    }
    
    // 更新请求状态
    request.status = 'approved';
    await request.save();
    
    res.json({
      message: '申请已通过',
      request: request
    });
  } catch (error) {
    console.error('通过申请失败:', error);
    res.status(500).json({ message: '通过申请失败', error: error.message });
  }
});

router.post('/:id/reject', adminAuth, async (req, res) => {
  try {
    const { reason } = req.body;
    
    if (!reason) {
      return res.status(400).json({ message: '请提供拒绝原因' });
    }
    
    const request = await ArtistEditRequest.findByPk(req.params.id);
    
    if (!request) {
      return res.status(404).json({ message: '编辑请求不存在' });
    }
    
    if (request.status !== 'pending') {
      return res.status(400).json({ message: '该请求已处理' });
    }
    
    // 更新请求状态
    request.status = 'rejected';
    request.comment = reason;
    await request.save();
    
    res.json({
      message: '申请已拒绝',
      request: request
    });
  } catch (error) {
    console.error('拒绝申请失败:', error);
    res.status(500).json({ message: '拒绝申请失败', error: error.message });
  }
});

// 搜索歌手API
router.get('/search', auth, async (req, res) => {
  try {
    const keyword = req.query.name || req.query.keyword;
    
    console.log('收到搜索歌手请求，关键词:', keyword);
    console.log('用户信息:', { id: req.user.id, role: req.user.role });
    
    if (!keyword || keyword.trim() === '') {
      console.log('关键词为空，返回空数组');
      return res.json([]);
    }
    
    // 构建基础查询条件
    const whereCondition = {
      [Op.or]: [
        { name: { [Op.like]: `%${keyword}%` } },
        { realName: { [Op.like]: `%${keyword}%` } }
      ]
    };
    
    // 管理员可以搜索所有歌手
    if (req.user.role === 'admin') {
      console.log('管理员用户，搜索所有歌手');
      const artists = await Artist.findAll({
        where: whereCondition,
        limit: 10, // 限制返回结果数量
      });
      
      console.log(`搜索结果: 找到 ${artists.length} 个歌手`);
      
      // 处理返回数据
      const formattedArtists = artists.map(artist => formatArtistForResponse(artist, req.user));
      
      return res.json(formattedArtists);
    }
    
    // 普通用户只能搜索自己创建的歌手
    // 修改搜索条件，只允许搜索自己创建的歌手
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
    
    // 执行搜索
    const artists = await Artist.findAll({
      where: finalCondition,
      limit: 10, // 限制返回结果数量
    });
    
    console.log(`搜索结果: 找到 ${artists.length} 个歌手`);
    if (artists.length > 0) {
      console.log('第一个结果:', { id: artists[0].id, name: artists[0].name });
    }
    
    // 处理返回数据
    const formattedArtists = artists.map(artist => formatArtistForResponse(artist, req.user));
    
    console.log('返回格式化后的歌手数据');
    res.json(formattedArtists);
  } catch (error) {
    console.error('搜索歌手失败:', error);
    res.status(500).json({ message: '搜索歌手失败', error: error.message });
  }
});

// 获取所有歌手列表
router.get('/artists', auth, async (req, res) => {
  try {
    console.log('获取艺术家列表请求');
    console.log('用户信息:', { id: req.user.id, role: req.user.role });
    
    // 检查是否需要排除avatar字段
    const excludeAvatar = req.query.excludeAvatar === 'true';
    console.log('是否排除avatar字段:', excludeAvatar);
    
    // 构建查询属性列表
    let attributes = undefined; // 默认查询所有字段
    
    // 如果请求中指定了excludeAvatar=true，则定义要查询的字段，排除avatar
    if (excludeAvatar) {
      attributes = [
        'id', 'name', 'realName', 'id_number', 'createdById',
        'netease', 'qq', 'kugou', 'kuwo', 'qishui',
        'spotify', 'youtube', 'appleMusic', 'soundCloud',
        'description', 'alias', 'artistType', 'region',
        'createdAt', 'updatedAt'
      ];
      // 注意：这里排除了avatarUrl字段
    } else {
      attributes = [
        'id', 'name', 'realName', 'id_number', 'createdById',
        'netease', 'qq', 'kugou', 'kuwo', 'qishui',
        'spotify', 'youtube', 'appleMusic', 'soundCloud',
        'description', 'alias', 'artistType', 'region',
        'avatarUrl', 'createdAt', 'updatedAt'
      ];
    }
    
    const artists = await Artist.findAll({
      attributes,
      include: [{
        model: User,
        as: 'createdBy',
        attributes: ['id', 'username']
      }]
    });
    
    const formattedArtists = artists.map(artist => {
      const artistData = artist.toJSON();
      
      // 为前端格式化平台链接
      artistData.platforms = {
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
      
      // 标记是否为当前用户创建
      artistData.isCreatedByCurrentUser = (artist.createdById === req.user.id);
      
      return artistData;
    });
    
    console.log(`返回 ${formattedArtists.length} 个歌手`);
    res.json(formattedArtists);
  } catch (error) {
    console.error('获取歌手列表错误:', error);
    res.status(500).json({ message: '获取歌手列表失败', error: error.message });
  }
});

// 获取用户提交的修改申请
router.get('/user/requests', auth, async (req, res) => {
  try {
    const requests = await ArtistEditRequest.findAll({
      where: { requestedById: req.user.id },
      include: [
        {
          model: Artist,
          attributes: ['id', 'name', 'realName', 'id_number', 'netease', 'qq', 'kugou', 'kuwo', 'qishui', 'spotify', 'youtube', 'appleMusic', 'soundCloud']
        }
      ],
      order: [['createdAt', 'DESC']]
    });
    
    res.json(requests);
  } catch (error) {
    console.error('获取用户修改申请失败:', error);
    res.status(500).json({ message: '获取用户修改申请失败', error: error.message });
  }
});

// 检查歌手是否有待审核的修改申请
router.get('/check/:artistId', auth, async (req, res) => {
  try {
    const { artistId } = req.params;
    
    // 验证歌手是否存在
    const artist = await Artist.findByPk(artistId, {
      attributes: ['id', 'name', 'realName', 'canonicalArtistId']
    });
    
    if (!artist) {
      return res.status(404).json({ message: '歌手不存在' });
    }
    
    // 确定要查询的艺人ID（如果是关联歌手，则查询主歌手）
    let targetArtistId = artistId;
    
    if (artist.canonicalArtistId) {
      console.log(`歌手 ${artist.id} (${artist.name}) 是关联歌手，检查主歌手 ${artist.canonicalArtistId} 的待审核申请`);
      targetArtistId = artist.canonicalArtistId;
    }
    
    // 查找该歌手是否有待审核的申请
    const pendingRequest = await ArtistEditRequest.findOne({
      where: { 
        artistId: targetArtistId,
        status: 'pending',
        requestedById: req.user.id
      },
      include: [
        {
          model: Artist,
          attributes: ['id', 'name', 'realName', 'id_number', 'netease', 'qq', 'kugou', 'kuwo', 'qishui', 'spotify', 'youtube', 'appleMusic', 'soundCloud']
        },
        {
          model: User,
          as: 'requestedBy',
          attributes: ['id', 'username', 'email']
        }
      ]
    });
    
    if (pendingRequest) {
      // 处理申请数据，确保敏感字段不返回
      const formattedRequest = {
        id: pendingRequest.id,
        artistId: pendingRequest.artistId,
        originalArtistId: artist.canonicalArtistId ? artistId : null, // 如果是关联歌手，返回原始艺人ID
        requestedById: pendingRequest.requestedById,
        reason: pendingRequest.reason,
        status: pendingRequest.status,
        createdAt: pendingRequest.createdAt,
        updatedAt: pendingRequest.updatedAt,
        // 添加其他字段
        newName: pendingRequest.newName,
        newRealName: pendingRequest.newRealName,
        newNetease: pendingRequest.newNetease,
        newQq: pendingRequest.newQq,
        newKugou: pendingRequest.newKugou,
        newKuwo: pendingRequest.newKuwo,
        newQishui: pendingRequest.newQishui,
        newSpotify: pendingRequest.newSpotify,
        newYoutube: pendingRequest.newYoutube,
        newAppleMusic: pendingRequest.newAppleMusic,
        newSoundCloud: pendingRequest.newSoundCloud,
        Artist: {
          id: pendingRequest.Artist.id,
          name: pendingRequest.Artist.name,
          realName: pendingRequest.Artist.realName,
          platforms: {
            netease: pendingRequest.Artist.netease || '',
            qq: pendingRequest.Artist.qq || '',
            kugou: pendingRequest.Artist.kugou || '',
            kuwo: pendingRequest.Artist.kuwo || '',
            qishui: pendingRequest.Artist.qishui || '',
            spotify: pendingRequest.Artist.spotify || '',
            youtube: pendingRequest.Artist.youtube || '',
            appleMusic: pendingRequest.Artist.appleMusic || '',
            soundCloud: pendingRequest.Artist.soundCloud || ''
          }
        }
      };
      
      // 只有管理员可以看到身份证号码
      if (req.user.role === 'admin') {
        formattedRequest.new_id_number = pendingRequest.new_id_number;
        formattedRequest.Artist.id_number = pendingRequest.Artist.id_number;
      }
      
      // 返回待审核的申请信息
      res.json({
        hasPendingRequest: true,
        request: formattedRequest,
        canCancel: pendingRequest.requestedById === req.user.id // 只有申请人自己可以撤销
      });
    } else {
      // 没有待审核的申请
      res.json({
        hasPendingRequest: false
      });
    }
  } catch (error) {
    console.error('检查歌手修改申请状态失败:', error);
    res.status(500).json({ message: '检查歌手修改申请状态失败', error: error.message });
  }
});

// 撤销修改申请
router.delete('/cancel/:requestId', auth, async (req, res) => {
  try {
    const { requestId } = req.params;
    
    // 查找该申请
    const request = await ArtistEditRequest.findByPk(requestId);
    
    if (!request) {
      return res.status(404).json({ message: '修改申请不存在' });
    }
    
    // 检查是否为待审核状态
    if (request.status !== 'pending') {
      return res.status(400).json({ message: '只能撤销待审核的申请' });
    }
    
    // 检查是否为申请人本人
    if (request.requestedById !== req.user.id) {
      return res.status(403).json({ message: '只有申请人本人可以撤销申请' });
    }
    
    // 删除申请
    await request.destroy();
    
    res.json({ message: '修改申请已成功撤销' });
  } catch (error) {
    console.error('撤销修改申请失败:', error);
    res.status(500).json({ message: '撤销修改申请失败', error: error.message });
  }
});

// 辅助函数：格式化歌手数据用于API响应
function formatArtistForResponse(artist, user) {
  const platforms = {
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
  
  // 返回对象
  const returnData = {
    id: artist.id,
    name: artist.name,
    realName: artist.realName,
    platforms
  };
  
  // 只有管理员可以看到身份证号码
  if (user.role === 'admin') {
    returnData.id_number = artist.id_number;
  }
  
  // 标记是否为当前用户创建的歌手
  returnData.isCreatedByCurrentUser = (artist.createdById === user.id);
  
  return returnData;
}

module.exports = router;