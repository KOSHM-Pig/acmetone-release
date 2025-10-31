const express = require('express');
const router = express.Router();
const { User, UserVerification, Album, Song, Artist, EmailLog, sequelize, ReleaseMonitorSettings, ReleaseMonitorHistory, ArtistEditRequest, AlbumLink } = require('../models');
const { auth, adminAuth } = require('../middleware/auth');
const { Op, fn, col, literal } = require('sequelize');
const { decrypt } = require('../utils/encryption');
const bcrypt = require('bcrypt');
const axios = require('axios');
const { sendBeatArrayApprovedEmail } = require('../utils/emailService');
const scheduler = require('../scheduler');

// 获取所有用户（分页）
router.get('/users', adminAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 20;
    const offset = (page - 1) * pageSize;
    
    const { count, rows } = await User.findAndCountAll({
      attributes: { exclude: ['password'] },
      limit: pageSize,
      offset,
      order: [['createdAt', 'DESC']]
    });
    
    // 获取每个用户的实名认证状态
    const usersWithVerification = await Promise.all(rows.map(async (user) => {
      const verification = await UserVerification.findOne({
        where: { userId: user.id }
      });
      
      return {
        ...user.toJSON(),
        verificationStatus: verification ? verification.status : null
      };
    }));
    
    res.json({
      users: usersWithVerification,
      total: count,
      page,
      pageSize,
      totalPages: Math.ceil(count / pageSize)
    });
  } catch (error) {
    console.error('获取用户列表错误:', error);
    res.status(500).json({ message: error.message || '获取用户列表失败' });
  }
});

// 搜索用户
router.get('/users/search', adminAuth, async (req, res) => {
  try {
    const { keyword } = req.query;
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 20;
    const offset = (page - 1) * pageSize;
    
    if (!keyword) {
      return res.status(400).json({ message: '请提供搜索关键词' });
    }
    
    const whereClause = {
      [Op.or]: [
        { username: { [Op.like]: `%${keyword}%` } },
        { email: { [Op.like]: `%${keyword}%` } }
      ]
    };

    if (!isNaN(keyword)) {
      whereClause[Op.or].push({ id: keyword });
    }
    
    const { count, rows } = await User.findAndCountAll({
      attributes: { exclude: ['password'] },
      where: whereClause,
      limit: pageSize,
      offset,
      order: [['createdAt', 'DESC']]
    });
    
    // 获取每个用户的实名认证状态
    const usersWithVerification = await Promise.all(rows.map(async (user) => {
      const verification = await UserVerification.findOne({
        where: { userId: user.id }
      });
      
      return {
        ...user.toJSON(),
        verificationStatus: verification ? verification.status : null
      };
    }));
    
    res.json({
      users: usersWithVerification,
      total: count,
      page,
      pageSize,
      totalPages: Math.ceil(count / pageSize)
    });
  } catch (error) {
    console.error('搜索用户错误:', error);
    res.status(500).json({ message: error.message || '搜索用户失败' });
  }
});

// 获取用户详情
router.get('/users/:id', adminAuth, async (req, res) => {
  try {
    const userId = req.params.id;
    
    const user = await User.findByPk(userId, {
      attributes: { exclude: ['password'] }
    });
    
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }
    
    // 获取用户的实名认证信息
    const verification = await UserVerification.findOne({
      where: { userId }
    });
    
    // 获取用户的专辑和歌曲数量
    const albumCount = await Album.count({
      where: { submittedById: userId }
    });
    
    const songCount = await Song.count({
      include: [{
        model: Album,
        where: { submittedById: userId }
      }]
    });
    
    // 如果有实名认证信息，解密敏感数据
    let verificationInfo = null;
    if (verification) {
      verificationInfo = {
        ...verification.toJSON(),
        idNumber: verification.idNumber ? decrypt(verification.idNumber) : null,
        bankAccount: verification.bankAccount ? decrypt(verification.bankAccount) : null
      };
    }
    
    res.json({
      ...user.toJSON(),
      verificationStatus: verification ? verification.status : null,
      verificationInfo,
      albumCount,
      songCount,
      lastLoginAt: user.lastLoginAt || null
    });
  } catch (error) {
    console.error('获取用户详情错误:', error);
    res.status(500).json({ message: error.message || '获取用户详情失败' });
  }
});

// 更新用户信息
router.put('/users/:id', adminAuth, async (req, res) => {
  try {
    const userId = req.params.id;
    const { username, email, isActive, resetPassword, newPassword } = req.body;
    
    const user = await User.findByPk(userId);
    
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }
    
    // 检查用户名是否已被其他用户使用
    if (username && username !== user.username) {
      const existingUser = await User.findOne({ where: { username } });
      if (existingUser) {
        return res.status(400).json({ message: '用户名已被使用' });
      }
    }
    
    // 检查邮箱是否已被其他用户使用
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ message: '邮箱已被使用' });
      }
    }
    
    // 更新用户信息
    if (username) user.username = username;
    if (email) user.email = email;
    if (isActive !== undefined) user.isActive = isActive;
    
    // 如果需要重置密码
    if (resetPassword && newPassword) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword, salt);
    }
    
    await user.save();
    
    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      isActive: user.isActive,
      message: '用户信息更新成功'
    });
  } catch (error) {
    console.error('更新用户信息错误:', error);
    res.status(500).json({ message: error.message || '更新用户信息失败' });
  }
});

// 更改用户状态（启用/禁用）
router.patch('/users/:id/status', adminAuth, async (req, res) => {
  try {
    const userId = req.params.id;
    const { isActive } = req.body;
    
    if (isActive === undefined) {
      return res.status(400).json({ message: '请提供用户状态' });
    }
    
    const user = await User.findByPk(userId);
    
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }
    
    // 防止管理员禁用自己的账号
    if (user.id === req.user.id && !isActive) {
      return res.status(400).json({ message: '不能禁用自己的账号' });
    }
    
    // 更新用户状态
    user.isActive = isActive;
    await user.save();
    
    res.json({
      id: user.id,
      isActive: user.isActive,
      message: isActive ? '用户账号已启用' : '用户账号已禁用'
    });
  } catch (error) {
    console.error('更改用户状态错误:', error);
    res.status(500).json({ message: error.message || '更改用户状态失败' });
  }
});

// 获取邮件日志
router.get('/email-logs', auth, adminAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 20;
    const offset = (page - 1) * pageSize;
    
    // 构建查询条件
    let whereClause = '';
    const whereParams = [];
    
    if (req.query.to) {
      whereClause += whereClause ? ' AND ' : ' WHERE ';
      whereClause += '`to` LIKE ?';
      whereParams.push(`%${req.query.to}%`);
    }
    
    if (req.query.subject) {
      whereClause += whereClause ? ' AND ' : ' WHERE ';
      whereClause += 'subject LIKE ?';
      whereParams.push(`%${req.query.subject}%`);
    }
    
    if (req.query.type) {
      whereClause += whereClause ? ' AND ' : ' WHERE ';
      whereClause += 'type = ?';
      whereParams.push(req.query.type);
    }
    
    if (req.query.status) {
      whereClause += whereClause ? ' AND ' : ' WHERE ';
      whereClause += 'status = ?';
      whereParams.push(req.query.status);
    }
    
    // 日期范围查询
    if (req.query.startDate && req.query.endDate) {
      whereClause += whereClause ? ' AND ' : ' WHERE ';
      whereClause += 'createdAt BETWEEN ? AND ?';
      whereParams.push(
        new Date(req.query.startDate), 
        new Date(req.query.endDate + 'T23:59:59.999Z')
      );
    } else if (req.query.startDate) {
      whereClause += whereClause ? ' AND ' : ' WHERE ';
      whereClause += 'createdAt >= ?';
      whereParams.push(new Date(req.query.startDate));
    } else if (req.query.endDate) {
      whereClause += whereClause ? ' AND ' : ' WHERE ';
      whereClause += 'createdAt <= ?';
      whereParams.push(new Date(req.query.endDate + 'T23:59:59.999Z'));
    }
    
    // 获取总数
    const [countResult] = await sequelize.query(
      `SELECT COUNT(*) as count FROM email_logs${whereClause}`,
      { replacements: whereParams }
    );
    const total = countResult[0].count;
    
    // 获取分页数据
    const [logs] = await sequelize.query(
      `SELECT * FROM email_logs${whereClause} ORDER BY createdAt DESC LIMIT ? OFFSET ?`,
      { 
        replacements: [...whereParams, pageSize, offset] 
      }
    );
    
    // 获取统计数据
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const [successCount] = await sequelize.query(
      `SELECT COUNT(*) as count FROM email_logs WHERE status = 'success'`
    );
    
    const [failedCount] = await sequelize.query(
      `SELECT COUNT(*) as count FROM email_logs WHERE status = 'failed'`
    );
    
    const [totalCount] = await sequelize.query(
      `SELECT COUNT(*) as count FROM email_logs`
    );
    
    const [todayCount] = await sequelize.query(
      `SELECT COUNT(*) as count FROM email_logs WHERE DATE(createdAt) = CURDATE()`
    );
    
    res.json({
      logs,
      total,
      stats: {
        success: successCount[0].count,
        failed: failedCount[0].count,
        total: totalCount[0].count,
        today: todayCount[0].count
      }
    });
  } catch (error) {
    console.error('获取邮件日志失败:', error);
    res.status(500).json({ message: '获取邮件日志失败', error: error.message });
  }
});

// 获取邮件日志详情
router.get('/email-logs/:id', auth, adminAuth, async (req, res) => {
  try {
    const id = req.params.id;
    
    // 检查表是否存在
    const [tables] = await sequelize.query(`
      SHOW TABLES LIKE 'email_logs'
    `);
    
    if (tables.length === 0) {
      // 表不存在，返回空结果
      return res.json({
        success: true,
        data: null
      });
    }
    
    const [results] = await sequelize.query(
      'SELECT * FROM email_logs WHERE id = ?',
      { replacements: [id] }
    );
    
    if (results.length === 0) {
      return res.json({
        success: true,
        data: null
      });
    }
    
    res.json({
      success: true,
      data: results[0]
    });
  } catch (error) {
    console.error('获取邮件日志详情失败:', error);
    res.json({
      success: true,
      data: null
    });
  }
});

// 获取邮件类型统计
router.get('/email-logs/stats/types', adminAuth, async (req, res) => {
  try {
    // 检查表是否存在
    const [tables] = await sequelize.query(`
      SHOW TABLES LIKE 'email_logs'
    `);
    
    if (tables.length === 0) {
      // 表不存在，返回空数组
      return res.json({
        success: true,
        data: []
      });
    }
    
    // 直接使用sequelize查询，避免模型映射问题
    const [result] = await sequelize.query(`
      SELECT type, COUNT(id) as count 
      FROM email_logs 
      GROUP BY type 
      ORDER BY count DESC
    `);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('获取邮件类型统计失败:', error);
    // 出错时返回空数组而不是错误
    res.json({
      success: true,
      data: []
    });
  }
});

// 获取所有用户专辑（包括草稿、待审核、已通过、已拒绝）
router.get('/all-albums', adminAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 20;
    const offset = (page - 1) * pageSize;
    const status = req.query.status || null;
    const search = req.query.search || null;
    const userId = req.query.userId || null;
    
    // 构建查询条件
    const whereCondition = {};
    
    if (status) {
      whereCondition.status = status;
    }
    
    if (search) {
      whereCondition[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
      ];
    }
    
    if (userId) {
      whereCondition.submittedById = userId;
    }
    
    const { count, rows } = await Album.findAndCountAll({
      where: whereCondition,
      include: [
        {
          model: User,
          as: 'submittedBy',
          attributes: ['id', 'username', 'email']
        },
        {
          model: Song,
          attributes: ['id', 'title'],
          required: false
        }
      ],
      limit: pageSize,
      offset,
      order: [['updatedAt', 'DESC']]
    });
    
    res.json({
      albums: rows,
      total: count,
      page,
      pageSize,
      totalPages: Math.ceil(count / pageSize)
    });
  } catch (error) {
    console.error('获取所有用户专辑错误:', error);
    res.status(500).json({ message: error.message || '获取所有用户专辑失败' });
  }
});

// 管理员更新专辑
router.put('/all-albums/:id', adminAuth, async (req, res) => {
  try {
    const albumId = req.params.id;
    const { title, type, releaseDate, description, status, comment, performer, performerIds } = req.body;
    
    const album = await Album.findByPk(albumId);
    
    if (!album) {
      return res.status(404).json({ message: '专辑不存在' });
    }
    
    // 更新专辑信息
    if (title) album.title = title;
    if (type) album.type = type;
    if (releaseDate) album.releaseDate = releaseDate;
    if (description) album.description = description;
    if (status) album.status = status;
    if (comment !== undefined) album.comment = comment;
    if (performer) album.performer = performer;
    if (performerIds) album.performerIds = performerIds;
    
    await album.save();
    
    res.json({
      id: album.id,
      title: album.title,
      status: album.status,
      performer: album.performer,
      performerIds: album.performerIds,
      message: '专辑信息更新成功'
    });
  } catch (error) {
    console.error('更新专辑信息错误:', error);
    res.status(500).json({ message: error.message || '更新专辑信息失败' });
  }
});

// 手动检测专辑上架
router.post('/release-monitor/check', adminAuth, async (req, res) => {
  try {
    const { albumId, platform } = req.body;
    
    if (!albumId) {
      return res.status(400).json({ message: '请提供专辑ID' });
    }
    
    // 获取专辑信息
    const album = await Album.findByPk(albumId);
    
    if (!album) {
      return res.status(404).json({ message: '专辑不存在' });
    }
    
    // 检查专辑是否已标记为上架
    if (album.isReleased) {
      return res.json({
        success: true,
        detected: true,
        message: `专辑《${album.title}》已标记为上架，无需重复检测`,
        data: {
          albumId: album.id,
          albumName: album.title,
          artistName: album.performer,
          platform,
          releasedAt: album.releasedAt,
          isReleased: true
        }
      });
    }
    
    // 获取设置
    const settings = await ReleaseMonitorSettings.findOne();
    const matchThreshold = settings ? settings.matchThreshold : 1;
    
    // 支持网易云音乐和QQ音乐
    if (platform === 'netease' || platform === 'qq') {
      try {
        // 从专辑信息中提取歌手ID
        let performerIds = [];
        try {
          performerIds = album.performerIds ? JSON.parse(album.performerIds) : [];
        } catch (e) {
         
        }
        
        // 如果没有歌手ID，尝试从专辑表演者名字查找对应的ID
        if (performerIds.length === 0 && album.performer) {
          
          
          try {
            // 将表演者名字按"/"分割
            const performerNames = album.performer.split('/').map(name => name.trim());
            
            // 在Artists表中查找对应的ID
            for (const name of performerNames) {
              const artist = await Artist.findOne({
                where: {
                  [Op.or]: [
                    { name: { [Op.like]: `%${name}%` } },
                    { realName: { [Op.like]: `%${name}%` } }
                  ]
                }
              });
              
              if (artist) {
                performerIds.push(artist.id);
             
              } else {
               
              }
            }
            
            // 如果找到了歌手ID，更新专辑的performerIds字段
            if (performerIds.length > 0) {
              album.performerIds = JSON.stringify(performerIds);
              await album.save();
             
            }
          } catch (error) {
           
          }
        }
        
        // 如果仍然没有歌手ID，则无法检测
        if (performerIds.length === 0) {
          return res.status(400).json({ 
            success: false,
            message: `专辑 ${album.title} 没有关联歌手ID且无法从表演者名字查找ID，无法检测上架状态`
          });
        }
        
        // 检查每个歌手的专辑列表
        let matchCount = 0;
        let apiResponses = [];
        let matchedPlatforms = [];
        
        for (const artistId of performerIds) {
          try {
            // 从数据库获取歌手信息，特别是平台链接
            const artist = await Artist.findByPk(artistId);
            
            if (!artist) {
              console.log(`歌手ID ${artistId} 在数据库中不存在`);
              continue;
            }
            
            if (platform === 'netease') {
              // 网易云音乐检测
              if (!artist.netease) {
                console.log(`歌手ID ${artistId} 没有网易云音乐链接`);
                continue;
              }
              
              // 从链接中提取网易云音乐平台的歌手ID
              const neteaseUrl = artist.netease;
              console.log(`[调试] 歌手 ${artist.name} 的网易云音乐链接: ${neteaseUrl}`);
              
              // 提取网易云音乐ID
              let neteaseId = null;
              const idMatch = neteaseUrl.match(/id=(\d+)/);
              if (idMatch && idMatch[1]) {
                neteaseId = idMatch[1];
              } else {
                console.log(`[调试] 无法从链接中提取网易云音乐ID: ${neteaseUrl}`);
                continue;
              }
              
              console.log(`[调试] 提取的网易云音乐歌手ID: ${neteaseId}`);
              
              // 构建API请求URL
              const apiUrl = `https://apis.netstart.cn/music/artist/album?id=${neteaseId}&limit=3`;
              console.log(`[调试] 请求网易云音乐API: ${apiUrl}`);
              
              // 调用网易云音乐API
              const response = await axios.get(apiUrl);
              
              console.log(`[调试] API响应状态码: ${response.status}`);
              
              apiResponses.push(response.data);
              
              // 检查是否有匹配的专辑名称
              if (response.data && response.data.hotAlbums && response.data.hotAlbums.length > 0) {
                console.log(`歌手ID ${neteaseId} 返回 ${response.data.hotAlbums.length} 个专辑`);
                console.log(`[调试] 返回的专辑列表: ${response.data.hotAlbums.map(a => a.name).join(', ')}`);
                
                // 将专辑名称转为小写并去除空格以进行更精确的匹配
                const normalizedTitle = album.title.toLowerCase().trim();
                
                // 检查是否有完全匹配的专辑
                const exactMatch = response.data.hotAlbums.find(
                  a => a.name.toLowerCase().trim() === normalizedTitle
                );
                
                if (exactMatch) {
                  matchCount++;
                  console.log(`找到歌手 ${artist.name} (网易云ID: ${neteaseId}) 的完全匹配专辑: ${exactMatch.name}`);
                  matchedPlatforms.push({ platform: 'netease', albumInfo: exactMatch });
                } else {
                  // 检查是否有包含关系的专辑（处理可能的副标题情况）
                  const partialMatch = response.data.hotAlbums.find(
                    a => {
                      const albumName = a.name.toLowerCase().trim();
                      return albumName.includes(normalizedTitle) || normalizedTitle.includes(albumName);
                    }
                  );
                  
                  if (partialMatch) {
                    matchCount++;
                    console.log(`找到歌手 ${artist.name} (网易云ID: ${neteaseId}) 的部分匹配专辑: ${partialMatch.name}`);
                    matchedPlatforms.push({ platform: 'netease', albumInfo: partialMatch });
                  } else {
                    // 输出所有专辑名称以便调试
                    console.log(`歌手 ${artist.name} (网易云ID: ${neteaseId}) 的专辑列表:`, response.data.hotAlbums.map(a => a.name).join(', '));
                  }
                }
              } else {
                console.log(`歌手 ${artist.name} (网易云ID: ${neteaseId}) 没有返回专辑数据或数据格式不正确`);
                console.log(`[调试] API响应详情: ${JSON.stringify(response.data)}`);
              }
            } else if (platform === 'qq') {
              // QQ音乐检测
              if (!artist.qq) {
                console.log(`歌手ID ${artistId} 没有QQ音乐链接`);
                continue;
              }
              
              // 从链接中提取QQ音乐平台的歌手ID
              const qqUrl = artist.qq;
              console.log(`[调试] 歌手 ${artist.name} 的QQ音乐链接: ${qqUrl}`);
              
              // 提取QQ音乐ID - 格式通常是 https://y.qq.com/n/ryqq/singer/003Z9FzE4RGRAA
              let qqId = null;
              const idMatch = qqUrl.match(/singer\/([A-Za-z0-9]+)/);
              if (idMatch && idMatch[1]) {
                qqId = idMatch[1];
              } else {
                console.log(`[调试] 无法从链接中提取QQ音乐ID: ${qqUrl}`);
                continue;
              }
              
              console.log(`[调试] 提取的QQ音乐歌手ID: ${qqId}`);
              
              // 构建API请求URL - 使用提供的API
              const apiUrl = `https://api.vkeys.cn/v2/music/tencent/singer/albumlist?mid=${qqId}`;
              console.log(`[调试] 请求QQ音乐API: ${apiUrl}`);
              
              // 调用QQ音乐API
              const response = await axios.get(apiUrl);
              
              console.log(`[调试] API响应状态码: ${response.status}`);
              console.log(`[调试] API响应数据结构: ${JSON.stringify(Object.keys(response.data))}`);
              
              apiResponses.push(response.data);
              
              // 检查是否有匹配的专辑名称
              if (response.data && response.data.code === 200 && response.data.data && response.data.data.length > 0) {
                console.log(`歌手ID ${qqId} 返回 ${response.data.data.length} 个专辑`);
                console.log(`[调试] 返回的专辑列表: ${response.data.data.map(a => a.albumName).join(', ')}`);
                
                // 将专辑名称转为小写并去除空格以进行更精确的匹配
                const normalizedTitle = album.title.toLowerCase().trim();
                
                // 检查是否有完全匹配的专辑
                const exactMatch = response.data.data.find(
                  a => a.albumName.toLowerCase().trim() === normalizedTitle
                );
                
                if (exactMatch) {
                  matchCount++;
                  console.log(`找到歌手 ${artist.name} (QQ音乐ID: ${qqId}) 的完全匹配专辑: ${exactMatch.albumName}`);
                  matchedPlatforms.push({ platform: 'qq', albumInfo: exactMatch });
                } else {
                  // 检查是否有包含关系的专辑（处理可能的副标题情况）
                  const partialMatch = response.data.data.find(
                    a => {
                      const albumName = a.albumName.toLowerCase().trim();
                      return albumName.includes(normalizedTitle) || normalizedTitle.includes(albumName);
                    }
                  );
                  
                  if (partialMatch) {
                    matchCount++;
                    console.log(`找到歌手 ${artist.name} (QQ音乐ID: ${qqId}) 的部分匹配专辑: ${partialMatch.albumName}`);
                    matchedPlatforms.push({ platform: 'qq', albumInfo: partialMatch });
                  } else {
                    // 输出所有专辑名称以便调试
                    console.log(`歌手 ${artist.name} (QQ音乐ID: ${qqId}) 的专辑列表:`, response.data.data.map(a => a.albumName).join(', '));
                  }
                }
              } else {
                console.log(`歌手 ${artist.name} (QQ音乐ID: ${qqId}) 没有返回专辑数据或数据格式不正确`);
                console.log(`[调试] API响应详情: ${JSON.stringify(response.data)}`);
              }
            }
          } catch (apiError) {
            console.error(`调用音乐平台API失败:`, apiError);
            console.error(`[调试] 错误详情:`, apiError.message);
            if (apiError.response) {
              console.error(`[调试] 错误状态码: ${apiError.response.status}`);
              console.error(`[调试] 错误响应数据: ${JSON.stringify(apiError.response.data)}`);
            }
          }
        }
        
        // 记录检测历史
        const history = await ReleaseMonitorHistory.create({
          albumId: album.id,
          albumName: album.title,
          artistName: album.performer,
          platform,
          detected: matchCount >= matchThreshold,
          matchCount,
          apiResponse: JSON.stringify(apiResponses)
        });
        
        // 如果检测到上架，更新专辑状态
        if (matchCount >= matchThreshold) {
          // 更新专辑状态为已上架
          album.isReleased = true;
          album.releasedAt = new Date();
          await album.save();
          
          console.log(`已将专辑 ${album.id} (${album.title}) 标记为已上架`);

          // 自动更新专辑链接
          console.log(`[AlbumLink Automation] Album ${album.id} detected as released. Attempting to update AlbumLink.`);
          if (matchedPlatforms.length > 0) {
            const albumLink = await AlbumLink.findOne({ where: { internalAlbumId: album.id } });

            if (albumLink) {
                console.log(`[AlbumLink Automation] Found AlbumLink with ID: ${albumLink.id} for internal album ID: ${album.id}`);
                const updateData = {};
                // We'll just use the first match to update the link.
                const firstMatch = matchedPlatforms[0];

                if (firstMatch.platform === 'netease' && firstMatch.albumInfo && firstMatch.albumInfo.id) {
                    const albumUrl = `https://music.163.com/#/album?id=${firstMatch.albumInfo.id}`;
                    updateData.netease = albumUrl;
                    console.log(`[AlbumLink Automation] Prepared NetEase URL: ${albumUrl}`);
                } else if (firstMatch.platform === 'qq' && firstMatch.albumInfo && firstMatch.albumInfo.albumMid) {
                    const albumUrl = `https://y.qq.com/n/ryqq/albumDetail/${firstMatch.albumInfo.albumMid}`;
                    updateData.qq = albumUrl;
                    console.log(`[AlbumLink Automation] Prepared QQ Music URL: ${albumUrl}`);
                }

                if (Object.keys(updateData).length > 0) {
                    try {
                        await albumLink.update(updateData);
                        console.log(`[AlbumLink Automation] Successfully updated AlbumLink ${albumLink.id} with data:`, JSON.stringify(updateData));
                    } catch (updateError) {
                        console.error(`[AlbumLink Automation] Error updating AlbumLink ${albumLink.id}:`, updateError);
                    }
                } else {
                    console.log(`[AlbumLink Automation] No valid album info found to construct URL for AlbumLink ${albumLink.id}. Matched info:`, JSON.stringify(firstMatch));
                }
            } else {
                console.log(`[AlbumLink Automation] No AlbumLink found for internal album ID: ${album.id}. Skipping update.`);
            }
          } else {
              console.log(`[AlbumLink Automation] No matched platform info available, though matchCount was sufficient. This may be a logic error.`);
          }
          
          // 如果检测到上架且尚未通知，发送邮件通知
          // 获取专辑提交者
          const submitter = await User.findByPk(album.submittedById);
          
          if (submitter && submitter.email) {
            // 发送邮件通知
            const { sendAlbumReleasedEmail } = require('../utils/emailService');
            await sendAlbumReleasedEmail(
              submitter.email,
              {
                title: album.title,
                author: submitter.username,
                labelNameZh: '极音记',
                labelNameEn: 'Acmetone',
                userId: submitter.id
              }
            );
            
            // 更新通知状态
            await history.update({ notified: true });
          }
        }
        
        res.json({
          success: true,
          detected: matchCount >= matchThreshold,
          message: matchCount >= matchThreshold 
            ? `检测到专辑《${album.title}》已上架` 
            : `未检测到专辑《${album.title}》上架`,
          data: {
            albumId: album.id,
            albumName: album.title,
            artistName: album.performer,
            platform,
            checkTime: history.checkTime,
            matchCount,
            threshold: matchThreshold,
            searchMethod: '歌手专辑列表',
            isReleased: album.isReleased,
            releasedAt: album.releasedAt
          },
          apiResponse: apiResponses
        });
      } catch (error) {
        console.error(`检测${platform === 'netease' ? '网易云音乐' : 'QQ音乐'}失败:`, error);
        res.status(500).json({ message: `检测${platform === 'netease' ? '网易云音乐' : 'QQ音乐'}失败`, error: error.message });
      }
    } else {
      res.status(400).json({ message: '不支持的平台' });
    }
  } catch (error) {
    console.error('检测专辑上架失败:', error);
    res.status(500).json({ message: '检测专辑上架失败', error: error.message });
  }
});

// 获取上架检测设置
router.get('/release-monitor/settings', adminAuth, async (req, res) => {
  try {
    // 检查表是否存在
    try {
      await sequelize.query('SELECT 1 FROM release_monitor_settings LIMIT 1');
    } catch (error) {
      // 如果表不存在，直接创建一条记录
      // 不使用sequelize.sync，避免修改其他表
      try {
        await sequelize.query(`
          CREATE TABLE IF NOT EXISTS release_monitor_settings (
            id INT AUTO_INCREMENT PRIMARY KEY,
            checkFrequency ENUM('hourly', 'daily', 'weekly') NOT NULL DEFAULT 'daily',
            checkTime VARCHAR(255) NOT NULL DEFAULT '09:00',
            matchThreshold INT NOT NULL DEFAULT 1,
            enabled BOOLEAN NOT NULL DEFAULT true,
            platforms TEXT NOT NULL DEFAULT '["netease"]',
            lastCheckTime DATETIME NULL,
            createdAt DATETIME NOT NULL,
            updatedAt DATETIME NOT NULL
          )
        `);
        
        // 插入默认设置
        await sequelize.query(`
          INSERT INTO release_monitor_settings 
          (checkFrequency, checkTime, matchThreshold, enabled, platforms, createdAt, updatedAt)
          VALUES
          ('daily', '09:00', 1, true, '["netease"]', NOW(), NOW())
        `);
        
        // 返回默认设置
        return res.json({
          success: true,
          settings: {
            id: 1,
            checkFrequency: 'daily',
            checkTime: '09:00',
            matchThreshold: 1,
            enabled: true,
            platforms: ['netease'],
            createdAt: new Date(),
            updatedAt: new Date()
          },
          stats: {
            detected: 0,
            pending: 0,
            today: 0
          }
        });
      } catch (createError) {
        console.error('创建设置表失败:', createError);
      }
    }
    
    // 获取设置
    let settings = await ReleaseMonitorSettings.findOne();
    
    // 如果没有设置，创建默认设置
    if (!settings) {
      settings = await ReleaseMonitorSettings.create({
        checkFrequency: 'daily',
        checkTime: '09:00',
        matchThreshold: 1,
        enabled: true,
        platforms: JSON.stringify(['netease'])
      });
    }
    
    // 获取统计数据
    let detectedCount = 0;
    let pendingCount = 0;
    let todayCount = 0;
    
    // 检查历史记录表是否存在
    try {
      await sequelize.query('SELECT 1 FROM release_monitor_history LIMIT 1');
      
      // 获取检测成功数量
      detectedCount = await ReleaseMonitorHistory.count({ where: { detected: true } });
      
      // 获取今日检测数量
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      todayCount = await ReleaseMonitorHistory.count({
        where: {
          checkTime: {
            [Op.gte]: today
          }
        }
      });
      
      // 获取待检测专辑数量 - 只计算审核通过且发行日期在今天之前且未上架的专辑
      pendingCount = await Album.count({
        where: {
          status: 'approved',
          // 只检查发行日期在今天之前的专辑
          releaseDate: {
            [Op.lte]: today
          },
          // 只检查未标记为上架的专辑
          isReleased: false
        }
      });
    } catch (error) {
      console.log('历史记录表不存在，跳过统计');
      
      // 尝试创建历史记录表
      try {
        await sequelize.query(`
          CREATE TABLE IF NOT EXISTS release_monitor_history (
            id INT AUTO_INCREMENT PRIMARY KEY,
            albumId INT NOT NULL,
            albumName VARCHAR(255) NOT NULL,
            artistName VARCHAR(255) NOT NULL,
            platform VARCHAR(255) NOT NULL,
            detected BOOLEAN NOT NULL DEFAULT false,
            matchCount INT NOT NULL DEFAULT 0,
            checkTime DATETIME NOT NULL DEFAULT NOW(),
            apiResponse TEXT NULL,
            notified BOOLEAN NOT NULL DEFAULT false,
            createdAt DATETIME NOT NULL,
            updatedAt DATETIME NOT NULL,
            INDEX album_platform_idx (albumId, platform),
            INDEX check_time_idx (checkTime),
            INDEX detected_idx (detected)
          )
        `);
      } catch (createError) {
        console.error('创建历史记录表失败:', createError);
      }
    }
    
    // 处理platforms字段，确保它是数组
    if (settings.platforms && typeof settings.platforms === 'string') {
      try {
        settings = settings.toJSON();
        settings.platforms = JSON.parse(settings.platforms);
      } catch (error) {
        console.error('解析platforms失败:', error);
        settings.platforms = ['netease'];
      }
    }
    
    res.json({
      success: true,
      settings,
      stats: {
        detected: detectedCount,
        pending: pendingCount,
        today: todayCount
      }
    });
  } catch (error) {
    console.error('获取上架检测设置失败:', error);
    res.status(500).json({ message: '获取上架检测设置失败', error: error.message });
  }
});

// 保存上架检测设置
router.post('/release-monitor/settings', adminAuth, async (req, res) => {
  try {
    const { checkFrequency, checkTime, matchThreshold, enabled, platforms, minutesInterval } = req.body;
    
    // 验证必要参数
    if (!checkFrequency) {
      return res.status(400).json({ message: '检查频率不能为空' });
    }
    
    // 如果频率为minutes，必须提供分钟间隔
    if (checkFrequency === 'minutes' && (!minutesInterval || minutesInterval < 1)) {
      return res.status(400).json({ message: '分钟间隔必须大于0' });
    }
    
    // 如果频率为daily，必须提供检查时间
    if (checkFrequency === 'daily' && !checkTime) {
      return res.status(400).json({ message: '检查时间不能为空' });
    }
    
    // 检查设置表是否存在，如果不存在则创建
    try {
      await sequelize.query(`
        SELECT * FROM release_monitor_settings LIMIT 1
      `);
    } catch (error) {
      console.log('设置表不存在，尝试创建...');
      try {
        await sequelize.query(`
          CREATE TABLE release_monitor_settings (
            id INTEGER PRIMARY KEY AUTO_INCREMENT,
            checkFrequency ENUM('minutes', 'hourly', '6hours', '12hours', 'daily', 'weekly') NOT NULL DEFAULT 'daily',
            minutesInterval INTEGER NOT NULL DEFAULT 5,
            checkTime VARCHAR(255) NOT NULL DEFAULT '09:00',
            matchThreshold INTEGER NOT NULL DEFAULT 1,
            enabled BOOLEAN NOT NULL DEFAULT TRUE,
            platforms TEXT NOT NULL DEFAULT '["netease"]',
            lastCheckTime DATETIME NULL,
            createdAt DATETIME NOT NULL,
            updatedAt DATETIME NOT NULL
          )
        `);
      } catch (createError) {
        console.error('创建设置表失败:', createError);
        return res.status(500).json({ message: '创建设置表失败', error: createError.message });
      }
    }
    
    // 尝试查找现有设置
    let settings = await ReleaseMonitorSettings.findOne();
    
    // 准备平台数据
    let platformsJson = JSON.stringify(platforms || ['netease']);
    
    if (settings) {
      // 更新设置
      settings.checkFrequency = checkFrequency;
      settings.checkTime = checkTime;
      settings.matchThreshold = matchThreshold;
      settings.enabled = enabled;
      settings.platforms = platformsJson;
      // 保存分钟间隔设置
      if (checkFrequency === 'minutes' && minutesInterval) {
        settings.minutesInterval = minutesInterval;
      }
      await settings.save();
    } else {
      // 创建新设置
      settings = await ReleaseMonitorSettings.create({
        checkFrequency,
        checkTime,
        matchThreshold,
        enabled,
        platforms: platformsJson,
        // 保存分钟间隔设置
        minutesInterval: minutesInterval || 5
      });
    }
    
    // 处理platforms字段，确保它是数组
    const result = settings.toJSON();
    if (result.platforms && typeof result.platforms === 'string') {
      try {
        result.platforms = JSON.parse(result.platforms);
      } catch (error) {
        console.error('解析platforms失败:', error);
        result.platforms = ['netease'];
      }
    }
    
    res.json({
      success: true,
      message: '设置保存成功',
      settings: result
    });
  } catch (error) {
    console.error('保存上架检测设置失败:', error);
    res.status(500).json({ message: '保存上架检测设置失败', error: error.message });
  }
});

// 获取上架检测历史记录
router.get('/release-monitor/history', adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 10, albumId, detected } = req.query;
    
    // 构建查询条件
    const where = {};
    if (albumId) where.albumId = albumId;
    if (detected !== undefined) where.detected = detected === 'true';
    
    // 分页查询
    const { count, rows } = await ReleaseMonitorHistory.findAndCountAll({
      where,
      order: [['checkTime', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    });
    
    res.json({
      total: count,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(count / parseInt(limit)),
      data: rows
    });
  } catch (error) {
    console.error('获取上架检测历史记录失败:', error);
    res.status(500).json({ message: '获取上架检测历史记录失败', error: error.message });
  }
});

// 手动检测专辑上架状态
router.post('/albums/:id/check-release', adminAuth, async (req, res) => {
  try {
    const albumId = req.params.id;
    
    // 获取专辑信息
    const album = await Album.findByPk(albumId);
    if (!album) {
      return res.status(404).json({ message: '专辑不存在' });
    }
    
    // 获取检测设置
    const settings = await ReleaseMonitorSettings.findOne();
    if (!settings) {
      return res.status(400).json({ message: '未配置上架检测设置' });
    }
    
    // 解析平台设置
    let platforms = [];
    try {
      platforms = JSON.parse(settings.platforms);
    } catch (e) {
      platforms = ['netease']; // 默认使用网易云音乐
    }
    
    // 手动检测
    const { manualCheckAlbumRelease } = require('../scheduler');
    const result = await manualCheckAlbumRelease(album, {
      ...settings.toJSON(),
      platforms
    });
    
    res.json(result);
  } catch (error) {
    console.error('手动检测专辑上架状态失败:', error);
    res.status(500).json({ message: '手动检测专辑上架状态失败', error: error.message });
  }
});

// 获取上架检测历史记录详情
router.get('/release-monitor/history/:id', adminAuth, async (req, res) => {
  try {
    const historyId = req.params.id;
    
    // 获取历史记录详情
    const history = await ReleaseMonitorHistory.findByPk(historyId);
    if (!history) {
      return res.status(404).json({ message: '历史记录不存在' });
    }
    
    // 获取关联的专辑信息
    const album = await Album.findByPk(history.albumId);
    
    res.json({
      history,
      album: album ? {
        id: album.id,
        title: album.title,
        performer: album.performer,
        status: album.status,
        isReleased: album.isReleased,
        releasedAt: album.releasedAt
      } : null
    });
  } catch (error) {
    console.error('获取上架检测历史记录详情失败:', error);
    res.status(500).json({ message: '获取上架检测历史记录详情失败', error: error.message });
  }
});

// 删除上架检测历史记录
router.delete('/release-monitor/history/:id', adminAuth, async (req, res) => {
  try {
    const historyId = req.params.id;
    
    // 查找历史记录
    const history = await ReleaseMonitorHistory.findByPk(historyId);
    if (!history) {
      return res.status(404).json({ message: '历史记录不存在' });
    }
    
    // 删除历史记录
    await history.destroy();
    
    res.json({
      success: true,
      message: '历史记录已删除'
    });
  } catch (error) {
    console.error('删除上架检测历史记录失败:', error);
    res.status(500).json({ message: '删除上架检测历史记录失败', error: error.message });
  }
});

// 一键检测所有已通过且未上架的专辑
router.post('/release-monitor/check-all', adminAuth, async (req, res) => {
  try {
    // 获取所有已审核通过且未标记为上架的专辑
    const albums = await Album.findAll({
      where: {
        status: 'approved',
        // 只检查发行日期在今天之前的专辑
        releaseDate: {
          [Op.lte]: new Date()
        },
        // 只检查未标记为上架的专辑
        isReleased: false
      }
    });
    
    if (albums.length === 0) {
      return res.json({
        success: true,
        message: '没有需要检测的专辑',
        count: 0
      });
    }
    
    // 获取检测设置
    const settings = await ReleaseMonitorSettings.findOne();
    if (!settings) {
      return res.status(400).json({ message: '未配置上架检测设置' });
    }
    
    // 解析平台设置
    let platforms = [];
    try {
      platforms = JSON.parse(settings.platforms);
    } catch (e) {
      platforms = ['netease']; // 默认使用网易云音乐
    }
    
    // 在后台执行检测，不阻塞响应
    res.json({
      success: true,
      message: `开始检测 ${albums.length} 个专辑，请稍后查看结果`,
      count: albums.length
    });
    
    // 导入检测函数
    const { runReleaseCheck } = require('../scheduler');
    
    // 执行检测
    setTimeout(async () => {
      try {
        await runReleaseCheck({
          ...settings.toJSON(),
          platforms
        });
        console.log(`批量检测完成，共检测 ${albums.length} 个专辑`);
      } catch (error) {
        console.error('批量检测失败:', error);
      }
    }, 0);
    
  } catch (error) {
    console.error('一键检测所有专辑失败:', error);
    res.status(500).json({ message: '一键检测所有专辑失败', error: error.message });
  }
});

// 搜索专辑
router.get('/albums/search', adminAuth, async (req, res) => {
  try {
    const { search } = req.query;
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const offset = (page - 1) * pageSize;
    
    if (!search) {
      return res.status(400).json({ message: '请提供搜索关键词' });
    }
    
    // 使用Album模型进行搜索，匹配标题、描述或表演者
    const { count, rows } = await Album.findAndCountAll({
      where: {
        [Op.or]: [
          { title: { [Op.like]: `%${search}%` } },
          { description: { [Op.like]: `%${search}%` } },
          { performer: { [Op.like]: `%${search}%` } }
        ]
      },
      include: [
        {
          model: User,
          as: 'submittedBy',
          attributes: ['id', 'username', 'email']
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

// 获取待审核专辑数量
router.get('/albums/pending-count', adminAuth, async (req, res) => {
  try {
    const count = await Album.count({
      where: {
        status: 'pending', // 待审核状态
        comment: '' // 并且没有评论（即未被驳回）
      }
    });
    
    res.json({ count });
  } catch (error) {
    console.error('获取待审核专辑数量错误:', error);
    res.status(500).json({ message: error.message || '获取待审核专辑数量失败' });
  }
});

// 获取待审核歌手修改请求数量
router.get('/artist-requests/pending-count', adminAuth, async (req, res) => {
  try {
    const count = await ArtistEditRequest.count({
      where: {
        status: 'pending' // 待审核状态
      }
    });
    
    res.json({ count });
  } catch (error) {
    console.error('获取待审核歌手修改请求数量错误:', error);
    res.status(500).json({ message: error.message || '获取待审核歌手修改请求数量失败' });
  }
});

// 获取待审核实名认证数量
router.get('/user-verification/pending-count', adminAuth, async (req, res) => {
  try {
    const count = await UserVerification.count({
      where: {
        status: 'pending' // 待审核状态
      }
    });
    
    res.json({ count });
  } catch (error) {
    console.error('获取待审核实名认证数量错误:', error);
    res.status(500).json({ message: error.message || '获取待审核实名认证数量失败' });
  }
});

// 定时任务管理
router.get('/scheduler/tasks', adminAuth, async (req, res) => {
  try {
    const tasks = await scheduler.getTasksStatus();
    res.json({ success: true, tasks });
  } catch (error) {
    console.error('获取定时任务状态失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/scheduler/tasks/:name/run', adminAuth, async (req, res) => {
  try {
    const result = await scheduler.runTask(req.params.name);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/scheduler/tasks', adminAuth, async (req, res) => {
  try {
    const result = await scheduler.createTask(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/scheduler/tasks/:name/pause', adminAuth, async (req, res) => {
  try {
    const result = await scheduler.pauseTask(req.params.name);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/scheduler/tasks/:name/resume', adminAuth, async (req, res) => {
  try {
    const result = await scheduler.resumeTask(req.params.name);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/scheduler/tasks/:name', adminAuth, async (req, res) => {
  try {
    const { expression, timezone } = req.body;
    const result = await scheduler.updateTaskSchedule(req.params.name, expression, timezone);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/scheduler/tasks/:name', adminAuth, async (req, res) => {
  try {
    const result = await scheduler.deleteTask(req.params.name);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/scheduler/tasks/:taskId/logs', adminAuth, async (req, res) => {
  try {
    const { page, pageSize } = req.query;
    const result = await scheduler.getTaskExecutionLogs(req.params.taskId, page, pageSize);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/scheduler/logs/content/:logId', adminAuth, async (req, res) => {
  try {
    const result = await scheduler.getLogFileContent(req.params.logId);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 获取待审核的节拍阵列列表
router.get('/beat-array/pending', auth, adminAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 20;
    const offset = (page - 1) * pageSize;
    const status = req.query.status || null;
    const search = req.query.search || null;
    const userId = req.query.userId || null;
    
    // 构建查询条件
    const whereCondition = {};
    
    if (status) {
      whereCondition.status = status;
    }
    
    if (search) {
      whereCondition[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
      ];
    }
    
    if (userId) {
      whereCondition.submittedById = userId;
    }
    
    const { count, rows } = await BeatArray.findAndCountAll({
      where: whereCondition,
      include: [
        {
          model: User,
          as: 'submittedBy',
          attributes: ['id', 'username', 'email']
        }
      ],
      limit: pageSize,
      offset,
      order: [['updatedAt', 'DESC']]
    });
    
    res.json({
      beatArrays: rows,
      total: count,
      page,
      pageSize,
      totalPages: Math.ceil(count / pageSize)
    });
  } catch (error) {
    console.error('获取待审核节拍阵列错误:', error);
    res.status(500).json({ message: error.message || '获取待审核节拍阵列失败' });
  }
});

// 获取待审核的节拍阵列详情
router.get('/beat-array/pending/:id', auth, adminAuth, async (req, res) => {
  try {
    const beatArrayId = req.params.id;
    
    const beatArray = await BeatArray.findByPk(beatArrayId, {
      include: [
        {
          model: User,
          as: 'submittedBy',
          attributes: ['id', 'username', 'email']
        }
      ]
    });
    
    if (!beatArray) {
      return res.status(404).json({ message: '节拍阵列不存在' });
    }
    
    res.json(beatArray);
  } catch (error) {
    console.error('获取待审核节拍阵列详情错误:', error);
    res.status(500).json({ message: error.message || '获取待审核节拍阵列详情失败' });
  }
});

// 审核节拍阵列
router.patch('/beat-array/pending/:id/approve', auth, adminAuth, async (req, res) => {
  try {
    const beatArrayId = req.params.id;
    const { status, comment } = req.body;
    
    const beatArray = await BeatArray.findByPk(beatArrayId);
    
    if (!beatArray) {
      return res.status(404).json({ message: '节拍阵列不存在' });
    }
    
    if (status === 'approved') {
      beatArray.status = 'approved';
      beatArray.approvedAt = new Date();
      beatArray.approvedBy = req.user.id;
      beatArray.comment = comment || '';
      
      await beatArray.save();
      
      // 发送邮件通知提交者
      const submitter = await User.findByPk(beatArray.submittedById);
      if (submitter && submitter.email) {
        const { sendBeatArrayApprovedEmail } = require('../utils/emailService');
        await sendBeatArrayApprovedEmail(
          submitter.email,
          {
            title: beatArray.title,
            author: submitter.username,
            labelNameZh: '极音记',
            labelNameEn: 'Acmetone',
            userId: submitter.id
          }
        );
      }
      
      res.json({
        success: true,
        message: '节拍阵列已批准',
        data: beatArray
      });
    } else if (status === 'rejected') {
      beatArray.status = 'rejected';
      beatArray.rejectedAt = new Date();
      beatArray.rejectedBy = req.user.id;
      beatArray.comment = comment || '';
      
      await beatArray.save();
      
      res.json({
        success: true,
        message: '节拍阵列已驳回',
        data: beatArray
      });
    } else {
      return res.status(400).json({ message: '无效的状态' });
    }
  } catch (error) {
    console.error('审核节拍阵列错误:', error);
    res.status(500).json({ message: error.message || '审核节拍阵列失败' });
  }
});

// 驳回节拍阵列
router.patch('/beat-array/pending/:id/reject', auth, adminAuth, async (req, res) => {
  try {
    const beatArrayId = req.params.id;
    const { comment } = req.body;
    
    const beatArray = await BeatArray.findByPk(beatArrayId);
    
    if (!beatArray) {
      return res.status(404).json({ message: '节拍阵列不存在' });
    }
    
    if (beatArray.status === 'pending') {
      beatArray.status = 'rejected';
      beatArray.rejectedAt = new Date();
      beatArray.rejectedBy = req.user.id;
      beatArray.comment = comment || '';
      
      await beatArray.save();
      
      res.json({
        success: true,
        message: '节拍阵列已驳回',
        data: beatArray
      });
    } else {
      return res.status(400).json({ message: '节拍阵列状态不是待审核' });
    }
  } catch (error) {
    console.error('驳回节拍阵列错误:', error);
    res.status(500).json({ message: error.message || '驳回节拍阵列失败' });
  }
});

// 获取所有节拍阵列（分页）
router.get('/beat-arrays', auth, adminAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 20;
    const offset = (page - 1) * pageSize;
    const status = req.query.status || null;
    const search = req.query.search || null;
    const userId = req.query.userId || null;
    
    // 构建查询条件
    const whereCondition = {};
    
    if (status) {
      whereCondition.status = status;
    }
    
    if (search) {
      whereCondition[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
      ];
    }
    
    if (userId) {
      whereCondition.submittedById = userId;
    }
    
    const { count, rows } = await BeatArray.findAndCountAll({
      where: whereCondition,
      include: [
        {
          model: User,
          as: 'submittedBy',
          attributes: ['id', 'username', 'email']
        }
      ],
      limit: pageSize,
      offset,
      order: [['updatedAt', 'DESC']]
    });
    
    res.json({
      beatArrays: rows,
      total: count,
      page,
      pageSize,
      totalPages: Math.ceil(count / pageSize)
    });
  } catch (error) {
    console.error('获取所有节拍阵列错误:', error);
    res.status(500).json({ message: error.message || '获取所有节拍阵列失败' });
  }
});

// 获取节拍阵列详情
router.get('/beat-arrays/:id', auth, adminAuth, async (req, res) => {
  try {
    const beatArrayId = req.params.id;
    
    const beatArray = await BeatArray.findByPk(beatArrayId, {
      include: [
        {
          model: User,
          as: 'submittedBy',
          attributes: ['id', 'username', 'email']
        }
      ]
    });
    
    if (!beatArray) {
      return res.status(404).json({ message: '节拍阵列不存在' });
    }
    
    res.json(beatArray);
  } catch (error) {
    console.error('获取节拍阵列详情错误:', error);
    res.status(500).json({ message: error.message || '获取节拍阵列详情失败' });
  }
});

// 更新节拍阵列
router.put('/beat-arrays/:id', auth, adminAuth, async (req, res) => {
  try {
    const beatArrayId = req.params.id;
    const { title, description, beats } = req.body;
    
    const beatArray = await BeatArray.findByPk(beatArrayId);
    
    if (!beatArray) {
      return res.status(404).json({ message: '节拍阵列不存在' });
    }
    
    // 检查用户是否有权限更新
    if (beatArray.submittedById !== req.user.id) {
      return res.status(403).json({ message: '您没有权限更新此节拍阵列' });
    }
    
    // 更新节拍阵列信息
    if (title) beatArray.title = title;
    if (description) beatArray.description = description;
    if (beats) beatArray.beats = JSON.stringify(beats); // 确保beats是JSON字符串
    
    await beatArray.save();
    
    res.json({
      success: true,
      message: '节拍阵列更新成功',
      data: beatArray
    });
  } catch (error) {
    console.error('更新节拍阵列错误:', error);
    res.status(500).json({ message: error.message || '更新节拍阵列失败' });
  }
});

// 删除节拍阵列
router.delete('/beat-arrays/:id', auth, adminAuth, async (req, res) => {
  try {
    const beatArrayId = req.params.id;
    
    const beatArray = await BeatArray.findByPk(beatArrayId);
    
    if (!beatArray) {
      return res.status(404).json({ message: '节拍阵列不存在' });
    }
    
    // 检查用户是否有权限删除
    if (beatArray.submittedById !== req.user.id) {
      return res.status(403).json({ message: '您没有权限删除此节拍阵列' });
    }
    
    await beatArray.destroy();
    
    res.json({
      success: true,
      message: '节拍阵列已删除'
    });
  } catch (error) {
    console.error('删除节拍阵列错误:', error);
    res.status(500).json({ message: error.message || '删除节拍阵列失败' });
  }
});

module.exports = router; 