const express = require('express');
const router = express.Router();
const { auth, adminAuth } = require('../middleware/auth');
const { User, Album, PromotionRequest } = require('../models');
const { Op } = require('sequelize');

// 获取用户的推广申请列表
router.get('/user', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    console.log('获取用户推广申请列表，用户ID:', userId);
    
    const requests = await PromotionRequest.findAll({
      include: [{
        model: Album,
        attributes: ['id', 'title', 'coverImage', 'releaseDate']
      }],
      where: { userId },
      order: [['createdAt', 'DESC']]
    });
    
    // 处理数据，确保前端需要的字段存在
    const processedRequests = requests.map(request => {
      const requestData = request.toJSON();
      
      // 确保album对象包含coverUrl字段
      if (requestData.Album) {
        requestData.Album.coverUrl = requestData.Album.coverImage;
      }
      
      return requestData;
    });
    
    console.log(`找到${processedRequests.length}条推广申请记录`);
    res.json(processedRequests);
  } catch (error) {
    console.error('获取推广申请列表失败:', error);
    // 返回更详细的错误信息
    res.status(500).json({ 
      message: '获取推广申请列表失败',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// 获取用户的专辑列表（用于推广申请）
router.get('/albums/user', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    if (!userId) {
      return res.status(401).json({ message: '未登录或用户ID无效' });
    }
    
    const albums = await Album.findAll({
      where: { submittedById: userId },
      attributes: ['id', 'title', 'coverImage', 'releaseDate'],
      order: [['createdAt', 'DESC']]
    });
    
    // 处理专辑数据，确保coverImage字段正确
    const processedAlbums = albums.map(album => {
      const albumData = album.toJSON();
      return {
        ...albumData,
        coverUrl: albumData.coverImage // 确保与前端期望的字段名匹配
      };
    });
    
    res.json(processedAlbums);
  } catch (error) {
    console.error('获取用户专辑列表失败:', error);
    res.status(500).json({ message: '获取用户专辑列表失败' });
  }
});

// 创建推广申请
router.post('/', auth, async (req, res) => {
  try {
    const { albumId, highlights, existingPromotion } = req.body;
    const userId = req.user.id;

    // 检查专辑是否存在且属于该用户
    const album = await Album.findOne({
      where: { 
        id: albumId,
        submittedById: userId
      }
    });

    if (!album) {
      return res.status(404).json({ message: '专辑不存在或无权访问' });
    }

    // 检查发行日期是否符合要求（至少14天后）
    const releaseDate = new Date(album.releaseDate);
    const today = new Date();
    const daysDiff = Math.ceil((releaseDate - today) / (1000 * 60 * 60 * 24));
    if (daysDiff < 14) {
      return res.status(400).json({ message: '推广申请需要提前至少14天提交' });
    }

    // 创建申请
    const request = await PromotionRequest.create({
      albumId,
      userId,
      highlights,
      existingPromotion
    });

    res.status(201).json({
      id: request.id,
      message: '推广申请已提交'
    });
  } catch (error) {
    console.error('创建推广申请失败:', error);
    res.status(500).json({ message: '创建推广申请失败' });
  }
});

// 管理员获取推广申请列表
router.get('/admin', adminAuth, async (req, res) => {
  try {
    const { status, search } = req.query;
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const offset = (page - 1) * pageSize;
    
    console.log('管理员获取推广申请列表，参数:', { status, search, page, pageSize });

    const where = {};
    if (status && status !== 'all') {
      where.status = status;
    }

    const include = [{
      model: Album,
      attributes: ['id', 'title', 'coverImage', 'releaseDate']
    }, {
      model: User,
      attributes: ['id', 'username', 'email']
    }];

    if (search) {
      include[0].where = {
        [Op.or]: [
          { title: { [Op.like]: `%${search}%` } }
        ]
      };
    }

    const { count, rows } = await PromotionRequest.findAndCountAll({
      include,
      where,
      order: [['createdAt', 'DESC']],
      limit: pageSize,
      offset
    });

    // 处理数据，确保前端需要的字段存在
    const processedRequests = rows.map(request => {
      const requestData = request.toJSON();
      
      // 确保album对象包含coverUrl字段
      if (requestData.Album) {
        requestData.Album.coverUrl = requestData.Album.coverImage;
      }
      
      return requestData;
    });

    console.log(`找到${processedRequests.length}条推广申请记录`);
    
    res.json({
      items: processedRequests,
      total: count,
      page,
      pageSize
    });
  } catch (error) {
    console.error('获取推广申请列表失败:', error);
    // 返回更详细的错误信息
    res.status(500).json({ 
      message: '获取推广申请列表失败',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// 管理员审核推广申请
router.put('/admin/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, promotionResources } = req.body;

    if (!['approved', 'completed'].includes(status)) {
      return res.status(400).json({ message: '状态值无效' });
    }

    // 检查申请是否存在
    const request = await PromotionRequest.findByPk(id);
    if (!request) {
      return res.status(404).json({ message: '推广申请不存在' });
    }

    // 状态验证逻辑
    if (status === 'completed') {
      // 标记为已收到推广资源时，必须提供推广资源内容
      if (!promotionResources || promotionResources.trim() === '') {
        return res.status(400).json({ message: '标记为已收到推广资源时，必须填写推广资源内容' });
      }
    }

    // 构建更新数据
    const updateData = { status };
    
    // 如果提供了推广资源内容，则更新
    if (promotionResources !== undefined) {
      updateData.promotionResources = promotionResources;
    } else if (status === 'completed') {
      // 如果没有提供推广资源内容但状态是已完成，则使用现有的推广资源内容
      updateData.promotionResources = request.promotionResources;
    }

    // 更新申请状态
    await request.update(updateData);

    res.json({ 
      message: '审核结果已更新',
      status: updateData.status,
      hasPromotionResources: !!updateData.promotionResources
    });
  } catch (error) {
    console.error('更新推广申请失败:', error);
    res.status(500).json({ 
      message: '更新推广申请失败',
      error: error.message 
    });
  }
});

// 搜索专辑
router.get('/admin/search', adminAuth, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.json([]);
    }

    const albums = await Album.findAll({
      where: {
        title: { [Op.like]: `%${q}%` }
      },
      attributes: ['id', 'title', 'coverUrl', 'releaseDate'],
      limit: 10
    });

    res.json(albums);
  } catch (error) {
    console.error('搜索失败:', error);
    res.status(500).json({ message: '搜索失败' });
  }
});

module.exports = router; 