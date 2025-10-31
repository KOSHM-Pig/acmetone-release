const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { auth: verifyToken } = require('../middleware/auth');
const models = require('../models');
const { Op } = require('sequelize');
const { syncArtistRelations } = require('../utils/syncArtistRelations');

// 获取专辑的权利链条信息（包括专辑级、歌曲级和歌手级授权）
router.get('/albums/:albumId/rights-chain', verifyToken, async (req, res) => {
  try {
    const { albumId } = req.params;
    
    // 验证专辑存在
    const album = await models.Album.findByPk(albumId);
    if (!album) {
      return res.status(404).json({ message: '专辑不存在' });
    }
    
    // 验证用户权限
    const isOwner = album.submittedById === req.user.id;
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: '没有权限查看此专辑的权利链条' });
    }
    
    // 获取专辑的所有歌曲
    const songs = await models.Song.findAll({
      where: { albumId },
      include: [
        {
          model: models.Artist,
          as: 'Artists',
          through: { attributes: [] }
        }
      ]
    });
    
    // 获取所有歌曲-歌手授权记录
    const songArtistAuthorizations = await models.SongArtistAuthorization.findAll({
      where: {
        songId: {
          [Op.in]: songs.map(song => song.id)
        }
      },
      include: [
        {
          model: models.Artist,
          attributes: ['id', 'name', 'realName']
        },
        {
          model: models.User,
          as: 'uploader',
          attributes: ['id', 'username', 'email']
        }
      ]
    });
    
    // 构建权利链条数据结构
    const rightsChain = {
      album: {
        id: album.id,
        title: album.title,
        authorizationFile: album.authorizationFile
      },
      songs: songs.map(song => {
        // 获取当前歌曲的所有歌手授权
        const songAuthorizations = songArtistAuthorizations.filter(auth => auth.songId === song.id);
        
        return {
          id: song.id,
          title: song.title,
          authorizationFile: song.authorizationFile,
          artists: song.Artists.map(artist => {
            // 查找当前歌手的授权记录
            const artistAuth = songAuthorizations.find(auth => auth.artistId === artist.id);
            
            return {
              id: artist.id,
              name: artist.name,
              realName: artist.realName,
              authorization: artistAuth ? {
                id: artistAuth.id,
                authorizationFile: artistAuth.authorizationFile,
                uploadedAt: artistAuth.uploadedAt,
                uploader: artistAuth.uploader ? {
                  id: artistAuth.uploader.id,
                  username: artistAuth.uploader.username
                } : null
              } : null
            };
          })
        };
      })
    };
    
    res.json(rightsChain);
  } catch (error) {
    console.error('获取权利链条失败:', error);
    res.status(500).json({ message: '获取权利链条失败', error: error.message });
  }
});

// 上传专辑级授权文件 (FormData方式)
router.post('/albums/:albumId/authorization-file', verifyToken, async (req, res) => {
  try {
    const { albumId } = req.params;
    
    // 验证专辑存在
    const album = await models.Album.findByPk(albumId);
    if (!album) {
      return res.status(404).json({ message: '专辑不存在' });
    }
    
    // 验证用户权限
    const isOwner = album.submittedById === req.user.id;
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: '没有权限上传授权文件' });
    }

    // 确保文件已上传
    if (!req.files || !req.files.file) {
      return res.status(400).json({ message: '未接收到文件' });
    }
    
    const file = req.files.file;
    
    // 验证文件类型
    if (file.mimetype !== 'application/pdf') {
      return res.status(400).json({ message: '只能上传PDF文件' });
    }
    
    // 创建上传目录
    const uploadDir = path.join(__dirname, '../../uploads/authorizations');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    // 生成唯一文件名
    const uniqueSuffix = Date.now();
    const ext = path.extname(file.name);
    const newFileName = `album_auth_${uniqueSuffix}${ext}`;
    const filePath = path.join(uploadDir, newFileName);
    
    // 如果存在旧文件，先删除
    if (album.authorizationFile) {
      const oldFilePath = path.join(__dirname, '../../', album.authorizationFile);
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
      }
    }
    
    // 移动上传的文件
    await file.mv(filePath);
    
    // 保存相对路径
    const relativePath = `uploads/authorizations/${newFileName}`;
    
    // 更新专辑授权文件
    await album.update({
      authorizationFile: relativePath
    });
    
    res.json({
      message: '专辑授权文件上传成功',
      album: {
        id: album.id,
        title: album.title,
        authorizationFile: relativePath
      },
      filePath: relativePath
    });
  } catch (error) {
    console.error('上传专辑授权文件失败:', error);
    res.status(500).json({ message: '上传专辑授权文件失败', error: error.message });
  }
});

// 上传歌曲级授权文件 (FormData方式)
router.post('/albums/:albumId/songs/:songId/authorization-file', verifyToken, async (req, res) => {
  try {
    const { albumId, songId } = req.params;
    
    // 验证专辑和歌曲存在
    const album = await models.Album.findByPk(albumId);
    if (!album) {
      return res.status(404).json({ message: '专辑不存在' });
    }
    
    const song = await models.Song.findOne({
      where: { id: songId, albumId }
    });
    if (!song) {
      return res.status(404).json({ message: '歌曲不存在或不属于指定专辑' });
    }
    
    // 验证用户权限
    const isOwner = album.submittedById === req.user.id;
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: '没有权限上传授权文件' });
    }

    // 确保文件已上传
    if (!req.files || !req.files.file) {
      return res.status(400).json({ message: '未接收到文件' });
    }
    
    const file = req.files.file;
    
    // 验证文件类型
    if (file.mimetype !== 'application/pdf') {
      return res.status(400).json({ message: '只能上传PDF文件' });
    }
    
    // 创建上传目录
    const uploadDir = path.join(__dirname, '../../uploads/authorizations');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    // 生成唯一文件名
    const uniqueSuffix = Date.now();
    const ext = path.extname(file.name);
    const newFileName = `song_auth_${uniqueSuffix}${ext}`;
    const filePath = path.join(uploadDir, newFileName);
    
    // 如果存在旧文件，先删除
    if (song.authorizationFile) {
      const oldFilePath = path.join(__dirname, '../../', song.authorizationFile);
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
      }
    }
    
    // 移动上传的文件
    await file.mv(filePath);
    
    // 保存相对路径
    const relativePath = `uploads/authorizations/${newFileName}`;
    
    // 更新歌曲授权文件
    await song.update({
      authorizationFile: relativePath
    });
    
    res.json({
      message: '歌曲授权文件上传成功',
      song: {
        id: song.id,
        title: song.title,
        authorizationFile: relativePath
      },
      filePath: relativePath
    });
  } catch (error) {
    console.error('上传歌曲授权文件失败:', error);
    res.status(500).json({ message: '上传歌曲授权文件失败', error: error.message });
  }
});

// 上传歌手-歌曲授权文件 (FormData方式)
router.post('/albums/:albumId/songs/:songId/artists/:artistId/authorization-file', verifyToken, async (req, res) => {
  try {
    const { albumId, songId, artistId } = req.params;
    
    // 验证专辑、歌曲和歌手存在
    const album = await models.Album.findByPk(albumId);
    if (!album) {
      return res.status(404).json({ message: '专辑不存在' });
    }
    
    const song = await models.Song.findOne({
      where: { id: songId, albumId }
    });
    if (!song) {
      return res.status(404).json({ message: '歌曲不存在或不属于指定专辑' });
    }
    
    // 验证用户权限
    const isOwner = album.submittedById === req.user.id;
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: '没有权限上传授权文件' });
    }

    // 在验证歌手关联前，先同步歌曲-歌手关系
    console.log(`同步歌曲 ${songId} 的歌手关系...`);
    await syncArtistRelations(songId);
    
    // 验证歌手是否与歌曲关联
    const songArtist = await models.SongArtist.findOne({
      where: { songId, artistId }
    });
    
    if (!songArtist) {
      // 检查song.artists字段中是否包含该歌手
      let artistsInField = [];
      if (song.artists) {
        try {
          if (typeof song.artists === 'string') {
            artistsInField = JSON.parse(song.artists);
          } else if (Array.isArray(song.artists)) {
            artistsInField = song.artists;
          } else if (typeof song.artists === 'object') {
            artistsInField = Object.values(song.artists);
          }
          
          // 确保artistsInField是数字数组
          artistsInField = artistsInField
            .map(id => typeof id === 'object' ? (id.id || id.artistId) : id)
            .filter(id => id && !isNaN(parseInt(id)))
            .map(id => parseInt(id));
        } catch (error) {
          console.error(`解析歌曲 ${songId} 的artists字段失败:`, error);
        }
      }
      
      // 如果artists字段中包含该歌手，则自动创建关联
      if (artistsInField.includes(parseInt(artistId))) {
        console.log(`歌曲 ${songId} 的artists字段中包含歌手 ${artistId}，自动创建关联`);
        try {
          // 使用原始SQL查询而不是create，避免列名大小写问题
          await models.sequelize.query(
            'INSERT IGNORE INTO songartists (songId, artistId) VALUES (:songId, :artistId)',
            {
              replacements: { songId, artistId },
              type: models.sequelize.QueryTypes.INSERT
            }
          );
        } catch (error) {
          console.error(`创建歌曲 ${songId} 和歌手 ${artistId} 的关联失败:`, error);
          return res.status(500).json({ message: '创建歌手-歌曲关联失败', error: error.message });
        }
      } else {
        return res.status(404).json({ message: '歌手不属于该歌曲' });
      }
    }

    // 确保文件已上传
    if (!req.files || !req.files.file) {
      return res.status(400).json({ message: '未接收到文件' });
    }
    
    const file = req.files.file;
    
    // 验证文件类型
    if (file.mimetype !== 'application/pdf') {
      return res.status(400).json({ message: '只能上传PDF文件' });
    }
    
    // 创建上传目录
    const uploadDir = path.join(__dirname, '../../uploads/authorizations');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    // 生成唯一文件名
    const uniqueSuffix = Date.now();
    const ext = path.extname(file.name);
    const newFileName = `song_artist_auth_${uniqueSuffix}${ext}`;
    const filePath = path.join(uploadDir, newFileName);
    
    // 查找或创建歌手-歌曲授权记录
    const [authorization, created] = await models.SongArtistAuthorization.findOrCreate({
      where: { songId, artistId },
      defaults: {
        authorizationFile: null,
        uploadedBy: req.user.id,
        uploadedAt: new Date()
      }
    });
    
    // 如果存在旧文件，先删除
    if (authorization.authorizationFile) {
      const oldFilePath = path.join(__dirname, '../../', authorization.authorizationFile);
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
      }
    }
    
    // 移动上传的文件
    await file.mv(filePath);
    
    // 保存相对路径
    const relativePath = `uploads/authorizations/${newFileName}`;
    
    // 更新授权记录
      await authorization.update({
        authorizationFile: relativePath,
        uploadedBy: req.user.id,
        uploadedAt: new Date()
      });
    
    // 获取歌手信息
    const artist = await models.Artist.findByPk(artistId);
    
    res.json({
      message: '歌手-歌曲授权文件上传成功',
      authorization: {
        id: authorization.id,
        songId,
        artistId,
        artistName: artist.name,
        authorizationFile: relativePath,
        uploadedAt: authorization.uploadedAt
      },
      filePath: relativePath
    });
  } catch (error) {
    console.error('上传歌手-歌曲授权文件失败:', error);
    res.status(500).json({ message: '上传歌手-歌曲授权文件失败', error: error.message });
  }
});

// 删除歌曲级授权文件
router.delete('/albums/:albumId/songs/:songId/authorization', verifyToken, async (req, res) => {
  try {
    const { albumId, songId } = req.params;
    
    // 验证专辑和歌曲存在
    const album = await models.Album.findByPk(albumId);
    if (!album) {
      return res.status(404).json({ message: '专辑不存在' });
    }
    
    const song = await models.Song.findOne({
      where: { id: songId, albumId }
    });
    if (!song) {
      return res.status(404).json({ message: '歌曲不存在或不属于指定专辑' });
    }
    
    // 验证用户权限
    const isOwner = album.submittedById === req.user.id;
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: '没有权限删除授权文件' });
    }
    
    // 检查歌曲是否有授权文件
    if (!song.authorizationFile) {
      return res.status(404).json({ message: '歌曲没有授权文件' });
    }
    
    // 删除文件
    const filePath = path.join(__dirname, '../../', song.authorizationFile);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    // 更新数据库
    await song.update({
      authorizationFile: null
    });
    
    res.json({
      message: '歌曲授权文件删除成功',
      songId: song.id
    });
  } catch (error) {
    console.error('删除歌曲授权文件失败:', error);
    res.status(500).json({ message: '删除歌曲授权文件失败', error: error.message });
  }
});

// 删除歌手-歌曲授权文件
router.delete('/albums/:albumId/songs/:songId/artists/:artistId/authorization', verifyToken, async (req, res) => {
  try {
    const { albumId, songId, artistId } = req.params;
    
    // 验证专辑和歌曲存在
    const album = await models.Album.findByPk(albumId);
    if (!album) {
      return res.status(404).json({ message: '专辑不存在' });
    }
    
    const song = await models.Song.findOne({
      where: { id: songId, albumId }
    });
    if (!song) {
      return res.status(404).json({ message: '歌曲不存在或不属于指定专辑' });
    }
    
    // 验证用户权限
    const isOwner = album.submittedById === req.user.id;
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: '没有权限删除授权文件' });
    }
    
    // 查找授权记录
    const authorization = await models.SongArtistAuthorization.findOne({
      where: { songId, artistId }
    });
    
    if (!authorization || !authorization.authorizationFile) {
      return res.status(404).json({ message: '未找到歌手-歌曲授权文件' });
    }
    
    // 删除文件
    const filePath = path.join(__dirname, '../../', authorization.authorizationFile);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    // 更新数据库
    await authorization.update({
      authorizationFile: null,
      uploadedAt: null
    });
    
    res.json({
      message: '歌手-歌曲授权文件删除成功',
      songId,
      artistId
    });
  } catch (error) {
    console.error('删除歌手-歌曲授权文件失败:', error);
    res.status(500).json({ message: '删除歌手-歌曲授权文件失败', error: error.message });
  }
});

module.exports = router;