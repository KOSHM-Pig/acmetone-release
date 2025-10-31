const express = require('express');
const router = express.Router();
const { Album, Song, Artist } = require('../models');
const { adminAuth } = require('../middleware/auth');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const unlinkAsync = promisify(fs.unlink);
const { Op } = require('sequelize');

// 管理员搜索专辑API
router.get('/albums/search', adminAuth, async (req, res) => {
  try {
    const { search } = req.query;
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const offset = (page - 1) * pageSize;
    
    if (!search) {
      return res.status(400).json({ message: '请提供搜索关键词' });
    }
    
    const { count, rows } = await Album.findAndCountAll({
      where: {
        [Op.or]: [
          { title: { [Op.like]: `%${search}%` } },
          { upc: { [Op.like]: `%${search}%` } }
        ]
      },
      include: [
        { 
          model: Artist,
          attributes: ['id', 'name', 'englishName']
        }
      ],
      limit: pageSize,
      offset,
      order: [['createdAt', 'DESC']]
    });
    
    res.json({
      albums: rows,
      total: count,
      page,
      pageSize,
      totalPages: Math.ceil(count / pageSize)
    });
  } catch (error) {
    console.error('搜索专辑错误:', error);
    res.status(500).json({ message: error.message || '搜索专辑失败' });
  }
});

// 管理员删除专辑API
router.delete('/albums/:id', adminAuth, async (req, res) => {
  try {
    const albumId = req.params.id;
    
    // 查找专辑
    const album = await Album.findByPk(albumId, {
      include: [{ model: Song }]
    });
    
    if (!album) {
      return res.status(404).json({ 
        success: false, 
        message: '专辑不存在' 
      });
    }
    
    // 保存需要删除的文件路径
    const filesToDelete = [];
    
    // 添加专辑封面
    if (album.coverImage) {
      const coverPath = path.join(__dirname, '../..', album.coverImage);
      filesToDelete.push(coverPath);
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
    console.log(`管理员正在删除专辑: ${albumId} - ${album.title}`);
    
    // 删除专辑关联的所有歌曲
    if (album.Songs && album.Songs.length > 0) {
      await Song.destroy({
        where: { albumId }
      });
      console.log(`已删除专辑 ${albumId} 的 ${album.Songs.length} 首歌曲`);
    }
    
    // 删除专辑
    await album.destroy();
    console.log(`专辑 ${albumId} 已从数据库中删除`);
    
    // 尝试删除文件
    const failedFiles = [];
    for (const filePath of filesToDelete) {
      try {
        if (fs.existsSync(filePath)) {
          await unlinkAsync(filePath);
          console.log(`文件已删除: ${filePath}`);
        }
      } catch (fileError) {
        console.error(`删除文件失败: ${filePath}`, fileError);
        failedFiles.push(filePath);
      }
    }
    
    // 返回结果
    if (failedFiles.length > 0) {
      return res.json({
        success: true,
        message: '专辑已删除，但部分文件删除失败',
        failedFiles
      });
    }
    
    return res.json({
      success: true,
      message: '专辑及其所有相关文件已成功删除'
    });
    
  } catch (error) {
    console.error('删除专辑失败:', error);
    res.status(500).json({
      success: false,
      message: '删除专辑失败',
      error: error.message
    });
  }
});

module.exports = router; 