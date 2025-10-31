const express = require('express');
const router = express.Router();
const { sequelize } = require('../config/db');
const { auth, adminAuth } = require('../middleware/auth');
const { formatDate } = require('../utils/dateUtils');

/**
 * @route GET /api/statistics/admin
 * @desc 获取管理员统计数据
 * @access 仅限管理员
 */
router.get('/admin', adminAuth, async (req, res) => {
  try {
    // 获取全站专辑总数
    const [albumsResult] = await sequelize.query('SELECT COUNT(id) AS totalAlbums FROM albums');
    const totalAlbums = albumsResult[0].totalAlbums;

    // 获取各类待审核申请数量
    const [pendingAlbums] = await sequelize.query('SELECT COUNT(id) AS count FROM albums WHERE status = :status', {
      replacements: { status: 'pending' }
    });
    const [pendingArtistEditRequests] = await sequelize.query('SELECT COUNT(id) AS count FROM artisteditrequests WHERE status = :status', {
      replacements: { status: 'pending' }
    });
    const [pendingUserVerifications] = await sequelize.query('SELECT COUNT(id) AS count FROM userverifications WHERE status = :status', {
      replacements: { status: 'pending' }
    });
    const [pendingPromotionRequests] = await sequelize.query('SELECT COUNT(id) AS count FROM promotion_requests WHERE status = :status', {
      replacements: { status: 'pending' }
    });
    const [pendingDynamicCoverRequests] = await sequelize.query('SELECT COUNT(id) AS count FROM dynamic_cover_requests WHERE status = :status', {
      replacements: { status: 'pending' }
    });

    // 计算待审核总数
    const pendingRequestsTotal = 
      pendingAlbums[0].count + 
      pendingArtistEditRequests[0].count + 
      pendingUserVerifications[0].count + 
      pendingPromotionRequests[0].count + 
      pendingDynamicCoverRequests[0].count;

    // 返回统计数据
    res.json({
      totalAlbums,
      pendingRequests: {
        total: pendingRequestsTotal,
        details: {
          albums: pendingAlbums[0].count,
          artistEditRequests: pendingArtistEditRequests[0].count,
          userVerification: pendingUserVerifications[0].count,
          promotionRequests: pendingPromotionRequests[0].count,
          dynamicCoverRequests: pendingDynamicCoverRequests[0].count
        }
      }
    });
  } catch (error) {
    console.error('获取管理员统计数据失败:', error);
    res.status(500).json({ message: '获取统计数据失败', error: error.message });
  }
});

/**
 * @route GET /api/statistics/admin/calendar
 * @desc 获取管理员发行日历数据
 * @access 仅限管理员
 */
router.get('/admin/calendar', adminAuth, async (req, res) => {
  try {
    const { year, month } = req.query;
    
    // 验证年月参数
    if (!year || !month) {
      return res.status(400).json({ message: '缺少必要的年份或月份参数' });
    }
    
    // 构建日期范围
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0); // 当月最后一天
    
    // 格式化日期为MySQL格式
    const formattedStartDate = formatDate(startDate);
    const formattedEndDate = formatDate(endDate);
    
    // 查询该月份有发行的专辑
    const [releasesResult] = await sequelize.query(
      `SELECT id, title, coverImage, performer, releaseDate 
       FROM albums 
       WHERE releaseDate BETWEEN :startDate AND :endDate 
       AND status = 'approved'
       ORDER BY releaseDate`,
      {
        replacements: {
          startDate: formattedStartDate,
          endDate: formattedEndDate
        }
      }
    );
    
    // 按日期分组
    const releasesByDate = {};
    releasesResult.forEach(album => {
      const dateStr = formatDate(album.releaseDate).split(' ')[0]; // 只保留日期部分，去掉时间
      
      if (!releasesByDate[dateStr]) {
        releasesByDate[dateStr] = {
          date: dateStr,
          count: 0,
          albums: []
        };
      }
      
      releasesByDate[dateStr].albums.push({
        id: album.id,
        title: album.title,
        coverImage: album.coverImage,
        performer: album.performer
      });
      
      releasesByDate[dateStr].count++;
    });
    
    // 转换为数组格式
    const releaseCalendar = Object.values(releasesByDate);
    
    res.json({ releaseCalendar });
  } catch (error) {
    console.error('获取发行日历数据失败:', error);
    res.status(500).json({ message: '获取发行日历数据失败', error: error.message });
  }
});

/**
 * @route GET /api/statistics/user
 * @desc 获取用户个人统计数据
 * @access 已登录用户
 */
router.get('/user', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // 获取用户专辑数量
    const [albumsResult] = await sequelize.query(
      'SELECT COUNT(id) AS totalCount FROM albums WHERE submittedById = :userId',
      {
        replacements: { userId }
      }
    );
    const myAlbumCount = albumsResult[0].totalCount;
    
    // 获取用户专辑状态分布
    const [albumStatusResult] = await sequelize.query(
      `SELECT 
        SUM(CASE WHEN status = 'approved' AND isReleased = 1 THEN 1 ELSE 0 END) AS releasedAlbums,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pendingAlbums,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) AS rejectedAlbums
       FROM albums 
       WHERE submittedById = :userId`,
      {
        replacements: { userId }
      }
    );
    
    // 获取用户待审核申请数量
    const [pendingAlbums] = await sequelize.query(
      'SELECT COUNT(id) AS count FROM albums WHERE submittedById = :userId AND status = :status',
      {
        replacements: { userId, status: 'pending' }
      }
    );
    
    const [pendingArtistEditRequests] = await sequelize.query(
      'SELECT COUNT(id) AS count FROM artisteditrequests WHERE requestedById = :userId AND status = :status',
      {
        replacements: { userId, status: 'pending' }
      }
    );
    
    const [pendingPromotionRequests] = await sequelize.query(
      'SELECT COUNT(id) AS count FROM promotion_requests WHERE userId = :userId AND status = :status',
      {
        replacements: { userId, status: 'pending' }
      }
    );
    
    const [pendingDynamicCoverRequests] = await sequelize.query(
      'SELECT COUNT(id) AS count FROM dynamic_cover_requests WHERE userId = :userId AND status = :status',
      {
        replacements: { userId, status: 'pending' }
      }
    );
    
    // 计算待审核总数
    const myPendingRequests = 
      pendingAlbums[0].count + 
      pendingArtistEditRequests[0].count + 
      pendingPromotionRequests[0].count + 
      pendingDynamicCoverRequests[0].count;
    
    // 获取用户最近发行的专辑
    const [recentAlbums] = await sequelize.query(
      `SELECT id, title, coverImage, performer, releaseDate 
       FROM albums 
       WHERE submittedById = :userId AND status = 'approved' AND isReleased = 1
       ORDER BY releaseDate DESC
       LIMIT 6`,
      {
        replacements: { userId }
      }
    );
    
    // 返回统计数据
    res.json({
      myEarnings: 0, // 收益暂时设为0
      myAlbumCount,
      myPendingRequests,
      pendingRequestsDetails: {
        albums: pendingAlbums[0].count,
        artistEditRequests: pendingArtistEditRequests[0].count,
        promotionRequests: pendingPromotionRequests[0].count,
        dynamicCoverRequests: pendingDynamicCoverRequests[0].count
      },
      releasedAlbums: albumStatusResult[0].releasedAlbums || 0,
      pendingAlbums: albumStatusResult[0].pendingAlbums || 0,
      rejectedAlbums: albumStatusResult[0].rejectedAlbums || 0,
      recentAlbums
    });
  } catch (error) {
    console.error('获取用户统计数据失败:', error);
    res.status(500).json({ message: '获取统计数据失败', error: error.message });
  }
});

module.exports = router;
