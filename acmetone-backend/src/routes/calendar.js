const express = require('express');
const router = express.Router();
const { Album, Artist, User } = require('../models');
const { Op } = require('sequelize');
const { auth } = require('../middleware/auth');

/**
 * 获取发行日历数据
 * GET /api/calendar/releases
 * 查询参数：
 * - year: 年份 (默认当前年份)
 * - month: 月份 (可选，1-12)
 * - status: 专辑状态 (可选，默认approved)
 */
router.get('/releases', auth, async (req, res) => {
  try {
    const { year = new Date().getFullYear(), month, status = 'approved' } = req.query;
    
    // 构建日期范围查询条件
    let dateCondition = {};
    
    // 查询整年的数据，让前端自己处理月份筛选
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);
    dateCondition = {
      releaseDate: {
        [Op.between]: [startDate, endDate]
      }
    };

    console.log(`日历查询范围: ${startDate.toISOString().split('T')[0]} 到 ${endDate.toISOString().split('T')[0]}`);

    // 构建查询条件
    const whereCondition = {
      ...dateCondition,
      status: status
    };

    // 权限控制：普通用户只能看到自己的专辑，管理员可以看到所有专辑
    if (req.user.role !== 'admin') {
      whereCondition.submittedById = req.user.id;
    }

    // 查询专辑数据
    const albums = await Album.findAll({
      where: whereCondition,
      include: [
        {
          model: User,
          as: 'submittedBy',
          attributes: ['id', 'username', 'email']
        }
      ],
      attributes: [
        'id',
        'title',
        'coverImage',
        'releaseDate',
        'status',
        'displayInfo',
        'performer',
        'performerIds',
        'createdAt'
      ],
      order: [['releaseDate', 'ASC']]
    });

    // 获取所有专辑的艺人信息
    const albumsWithArtists = await Promise.all(albums.map(async (album) => {
      let artists = [];

      // 从performerIds字段获取艺人ID
      if (album.performerIds) {
        try {
          const performerIds = JSON.parse(album.performerIds);
          if (performerIds && performerIds.length > 0) {
            const artistRecords = await Artist.findAll({
              where: {
                id: {
                  [Op.in]: performerIds
                }
              },
              attributes: ['id', 'name']
            });
            artists = artistRecords.map(artist => ({
              id: artist.id,
              name: artist.name
            }));
          }
        } catch (error) {
          console.error('解析performerIds失败:', error);
        }
      }

      // 如果没有找到艺人，使用performer字段
      if (artists.length === 0 && album.performer) {
        artists = [{
          id: null,
          name: album.performer
        }];
      }

      return {
        ...album.toJSON(),
        artists
      };
    }));

    // 转换数据格式以适配前端日历组件
    const calendarData = albumsWithArtists.map(album => ({
      id: album.id,
      name: album.title,
      cover: album.coverImage || '/images/default-album.png',
      releaseDate: album.releaseDate,
      status: album.status,
      label: album.displayInfo || '未知厂牌',
      slug: album.slug,
      artists: album.artists || [],
      user: album.submittedBy ? {
        id: album.submittedBy.id,
        username: album.submittedBy.username,
        email: album.submittedBy.email
      } : null,
      createdAt: album.createdAt
    }));

    res.json({
      success: true,
      data: {
        year: parseInt(year),
        month: month ? parseInt(month) : null,
        status: status,
        albums: calendarData,
        total: calendarData.length
      }
    });

  } catch (error) {
    console.error('获取发行日历数据失败:', error);
    res.status(500).json({
      success: false,
      message: '获取发行日历数据失败',
      error: error.message
    });
  }
});

/**
 * 获取指定日期的专辑发行
 * GET /api/calendar/releases/:date
 * 参数：
 * - date: 日期 (YYYY-MM-DD格式)
 */
router.get('/releases/:date', auth, async (req, res) => {
  try {
    const { date } = req.params;
    const { status = 'approved' } = req.query;

    // 验证日期格式
    const targetDate = new Date(date);
    if (isNaN(targetDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: '无效的日期格式，请使用 YYYY-MM-DD 格式'
      });
    }

    // 构建查询条件
    const whereCondition = {
      releaseDate: {
        [Op.eq]: targetDate
      },
      status: status
    };

    // 权限控制：普通用户只能看到自己的专辑，管理员可以看到所有专辑
    if (req.user.role !== 'admin') {
      whereCondition.submittedById = req.user.id;
    }

    // 查询指定日期的专辑
    const albums = await Album.findAll({
      where: whereCondition,
      include: [
        {
          model: User,
          as: 'submittedBy',
          attributes: ['id', 'username', 'email']
        }
      ],
      attributes: [
        'id',
        'title',
        'coverImage',
        'releaseDate',
        'status',
        'displayInfo',
        'performer',
        'performerIds',
        'createdAt'
      ],
      order: [['createdAt', 'ASC']]
    });

    // 获取专辑的艺人信息
    const albumsWithArtists = await Promise.all(albums.map(async (album) => {
      let artists = [];

      // 从performerIds字段获取艺人ID
      if (album.performerIds) {
        try {
          const performerIds = JSON.parse(album.performerIds);
          if (performerIds && performerIds.length > 0) {
            const artistRecords = await Artist.findAll({
              where: {
                id: {
                  [Op.in]: performerIds
                }
              },
              attributes: ['id', 'name']
            });
            artists = artistRecords.map(artist => ({
              id: artist.id,
              name: artist.name
            }));
          }
        } catch (error) {
          console.error('解析performerIds失败:', error);
        }
      }

      // 如果没有找到艺人，使用performer字段
      if (artists.length === 0 && album.performer) {
        artists = [{
          id: null,
          name: album.performer
        }];
      }

      return {
        ...album.toJSON(),
        artists
      };
    }));

    // 转换数据格式
    const albumData = albumsWithArtists.map(album => ({
      id: album.id,
      name: album.title,
      cover: album.coverImage || '/images/default-album.png',
      releaseDate: album.releaseDate,
      status: album.status,
      label: album.displayInfo || '未知厂牌',
      artists: album.artists || [],
      user: album.submittedBy ? {
        id: album.submittedBy.id,
        username: album.submittedBy.username,
        email: album.submittedBy.email
      } : null,
      createdAt: album.createdAt
    }));

    res.json({
      success: true,
      data: {
        date: date,
        status: status,
        albums: albumData,
        total: albumData.length
      }
    });

  } catch (error) {
    console.error('获取指定日期专辑数据失败:', error);
    res.status(500).json({
      success: false,
      message: '获取指定日期专辑数据失败',
      error: error.message
    });
  }
});

/**
 * 获取发行统计数据
 * GET /api/calendar/stats
 * 查询参数：
 * - year: 年份 (默认当前年份)
 * - status: 专辑状态 (可选，默认approved)
 */
router.get('/stats', auth, async (req, res) => {
  try {
    const { year = new Date().getFullYear(), status = 'approved' } = req.query;
    
    // 查询年度统计
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);

    // 构建查询条件
    const whereCondition = {
      releaseDate: {
        [Op.between]: [startDate, endDate]
      },
      status: status
    };

    // 权限控制：普通用户只能看到自己的专辑统计，管理员可以看到所有专辑统计
    if (req.user.role !== 'admin') {
      whereCondition.submittedById = req.user.id;
    }

    const totalAlbums = await Album.count({
      where: whereCondition
    });

    // 按月统计
    const monthlyStats = [];
    for (let month = 0; month < 12; month++) {
      const monthStart = new Date(year, month, 1);
      const monthEnd = new Date(year, month + 1, 0);
      
      const count = await Album.count({
        where: {
          releaseDate: {
            [Op.between]: [monthStart, monthEnd]
          },
          status: status
        }
      });

      monthlyStats.push({
        month: month + 1,
        count: count
      });
    }

    res.json({
      success: true,
      data: {
        year: parseInt(year),
        status: status,
        totalAlbums: totalAlbums,
        monthlyStats: monthlyStats
      }
    });

  } catch (error) {
    console.error('获取发行统计数据失败:', error);
    res.status(500).json({
      success: false,
      message: '获取发行统计数据失败',
      error: error.message
    });
  }
});

module.exports = router;
