const express = require('express');
const router = express.Router();
const { Song } = require('../models');
const { adminAuth } = require('../middleware/auth');
const { calculateFileMD5, verifyFileMD5 } = require('../utils/md5Utils');
const { updateExistingSongsMD5, verifyExistingSongsMD5 } = require('../../scripts/update-songs-md5');
const path = require('path');
const fs = require('fs');

/**
 * 获取MD5统计信息
 */
router.get('/stats', adminAuth, async (req, res) => {
  try {
    const totalSongs = await Song.count({
      where: {
        wavFile: {
          [require('sequelize').Op.ne]: null
        }
      }
    });

    const songsWithMD5 = await Song.count({
      where: {
        md5: {
          [require('sequelize').Op.ne]: null
        },
        wavFile: {
          [require('sequelize').Op.ne]: null
        }
      }
    });

    const songsWithoutMD5 = totalSongs - songsWithMD5;

    res.json({
      success: true,
      data: {
        totalSongs,
        songsWithMD5,
        songsWithoutMD5,
        coverage: totalSongs > 0 ? ((songsWithMD5 / totalSongs) * 100).toFixed(2) : 0
      }
    });
  } catch (error) {
    console.error('获取MD5统计信息失败:', error);
    res.status(500).json({
      success: false,
      message: '获取统计信息失败',
      error: error.message
    });
  }
});

/**
 * 批量更新歌曲MD5值
 */
router.post('/batch-update', adminAuth, async (req, res) => {
  try {
    console.log('开始批量更新MD5值...');
    const result = await updateExistingSongsMD5();
    
    res.json({
      success: true,
      message: '批量更新完成',
      data: result
    });
  } catch (error) {
    console.error('批量更新MD5失败:', error);
    res.status(500).json({
      success: false,
      message: '批量更新失败',
      error: error.message
    });
  }
});

/**
 * 批量验证歌曲MD5值
 */
router.post('/batch-verify', adminAuth, async (req, res) => {
  try {
    console.log('开始批量验证MD5值...');
    const result = await verifyExistingSongsMD5();
    
    res.json({
      success: true,
      message: '批量验证完成',
      data: result
    });
  } catch (error) {
    console.error('批量验证MD5失败:', error);
    res.status(500).json({
      success: false,
      message: '批量验证失败',
      error: error.message
    });
  }
});

/**
 * 获取需要处理MD5的歌曲列表
 */
router.get('/pending-songs', adminAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 20;
    const offset = (page - 1) * pageSize;

    const { count, rows: songs } = await Song.findAndCountAll({
      where: {
        md5: null,
        wavFile: {
          [require('sequelize').Op.ne]: null
        }
      },
      attributes: ['id', 'title', 'wavFile', 'createdAt', 'albumId'],
      include: [{
        model: require('../models').Album,
        attributes: ['title']
      }],
      limit: pageSize,
      offset: offset,
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        songs,
        pagination: {
          total: count,
          page,
          pageSize,
          totalPages: Math.ceil(count / pageSize)
        }
      }
    });
  } catch (error) {
    console.error('获取待处理歌曲列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取歌曲列表失败',
      error: error.message
    });
  }
});

/**
 * 单个歌曲MD5计算和更新
 */
router.post('/song/:id/update-md5', adminAuth, async (req, res) => {
  try {
    const songId = req.params.id;
    
    const song = await Song.findByPk(songId, {
      attributes: ['id', 'title', 'wavFile', 'md5']
    });

    if (!song) {
      return res.status(404).json({
        success: false,
        message: '歌曲不存在'
      });
    }

    if (!song.wavFile) {
      return res.status(400).json({
        success: false,
        message: '歌曲没有音频文件'
      });
    }

    // 构建文件路径
    const filePath = path.join(__dirname, '../../', song.wavFile);
    
    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: '音频文件不存在'
      });
    }

    // 计算MD5
    const md5Hash = await calculateFileMD5(filePath);
    
    // 更新数据库
    await Song.update(
      { md5: md5Hash },
      { where: { id: songId } }
    );

    res.json({
      success: true,
      message: 'MD5更新成功',
      data: {
        songId,
        title: song.title,
        md5: md5Hash,
        previousMD5: song.md5
      }
    });
  } catch (error) {
    console.error('更新单个歌曲MD5失败:', error);
    res.status(500).json({
      success: false,
      message: '更新MD5失败',
      error: error.message
    });
  }
});

/**
 * 单个歌曲MD5验证
 */
router.post('/song/:id/verify-md5', adminAuth, async (req, res) => {
  try {
    const songId = req.params.id;
    
    const song = await Song.findByPk(songId, {
      attributes: ['id', 'title', 'wavFile', 'md5']
    });

    if (!song) {
      return res.status(404).json({
        success: false,
        message: '歌曲不存在'
      });
    }

    if (!song.md5) {
      return res.status(400).json({
        success: false,
        message: '歌曲没有存储MD5值'
      });
    }

    if (!song.wavFile) {
      return res.status(400).json({
        success: false,
        message: '歌曲没有音频文件'
      });
    }

    // 构建文件路径
    const filePath = path.join(__dirname, '../../', song.wavFile);
    
    // 验证MD5
    const isValid = await verifyFileMD5(filePath, song.md5);

    res.json({
      success: true,
      message: isValid ? 'MD5验证通过' : 'MD5验证失败',
      data: {
        songId,
        title: song.title,
        isValid,
        storedMD5: song.md5
      }
    });
  } catch (error) {
    console.error('验证单个歌曲MD5失败:', error);
    res.status(500).json({
      success: false,
      message: '验证MD5失败',
      error: error.message
    });
  }
});

/**
 * 获取有问题的歌曲列表（文件不存在或MD5不匹配）
 */
router.get('/problematic-songs', adminAuth, async (req, res) => {
  try {
    const songs = await Song.findAll({
      where: {
        wavFile: {
          [require('sequelize').Op.ne]: null
        }
      },
      attributes: ['id', 'title', 'wavFile', 'md5', 'createdAt'],
      include: [{
        model: require('../models').Album,
        attributes: ['title']
      }],
      order: [['createdAt', 'DESC']]
    });

    const problematicSongs = [];

    for (const song of songs) {
      const filePath = path.join(__dirname, '../../', song.wavFile);
      
      // 检查文件是否存在
      if (!fs.existsSync(filePath)) {
        problematicSongs.push({
          ...song.toJSON(),
          issue: 'file_not_found',
          issueDescription: '音频文件不存在'
        });
        continue;
      }

      // 如果有MD5值，验证是否匹配
      if (song.md5) {
        try {
          const isValid = await verifyFileMD5(filePath, song.md5);
          if (!isValid) {
            problematicSongs.push({
              ...song.toJSON(),
              issue: 'md5_mismatch',
              issueDescription: 'MD5值不匹配'
            });
          }
        } catch (error) {
          problematicSongs.push({
            ...song.toJSON(),
            issue: 'verification_error',
            issueDescription: `验证错误: ${error.message}`
          });
        }
      }
    }

    res.json({
      success: true,
      data: {
        total: problematicSongs.length,
        songs: problematicSongs
      }
    });
  } catch (error) {
    console.error('获取有问题的歌曲列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取有问题的歌曲列表失败',
      error: error.message
    });
  }
});

module.exports = router;
