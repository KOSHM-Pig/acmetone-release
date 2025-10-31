const { Album, Song, Artist, User, UserVerification } = require('../models');
const { Op, Sequelize } = require('sequelize');

/**
 * 管理员审核工作台服务层
 * 处理审核相关的业务逻辑
 */

/**
 * 获取工作台概览数据
 */
const getWorkbenchOverview = async () => {
  try {
    // 获取各种状态的专辑数量
    const [
      pendingCount,
      approvedCount,
      rejectedCount,
      draftCount,
      materialDeliveredCount,
      materialPendingCount
    ] = await Promise.all([
      // 待审核专辑数量（排除草稿）
      Album.count({
        where: {
          status: 'pending',
          [Op.or]: [
            { comment: null },
            { comment: { [Op.notLike]: 'DRAFT:%' } }
          ]
        }
      }),
      // 已通过专辑数量
      Album.count({
        where: { status: 'approved' }
      }),
      // 已拒绝专辑数量
      Album.count({
        where: { status: 'rejected' }
      }),
      // 草稿专辑数量
      Album.count({
        where: {
          status: 'pending',
          comment: { [Op.like]: 'DRAFT:%' }
        }
      }),
      // 已传递物料的专辑数量
      Album.count({
        where: {
          status: 'approved',
          materialDelivered: true
        }
      }),
      // 未传递物料的已通过专辑数量
      Album.count({
        where: {
          status: 'approved',
          materialDelivered: false
        }
      })
    ]);

    // 获取今日提交的专辑数量
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todaySubmissions = await Album.count({
      where: {
        createdAt: {
          [Op.between]: [today, tomorrow]
        },
        status: 'pending',
        [Op.or]: [
          { comment: null },
          { comment: { [Op.notLike]: 'DRAFT:%' } }
        ]
      }
    });

    // 获取本周发行的专辑数量
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 7);

    const weeklyReleases = await Album.count({
      where: {
        releaseDate: {
          [Op.between]: [startOfWeek, endOfWeek]
        },
        status: 'approved'
      }
    });

    return {
      albumStats: {
        pending: pendingCount,
        approved: approvedCount,
        rejected: rejectedCount,
        draft: draftCount,
        total: pendingCount + approvedCount + rejectedCount + draftCount
      },
      materialStats: {
        delivered: materialDeliveredCount,
        pending: materialPendingCount,
        deliveryRate: materialPendingCount > 0 ? 
          Math.round((materialDeliveredCount / (materialDeliveredCount + materialPendingCount)) * 100) : 0
      },
      activityStats: {
        todaySubmissions,
        weeklyReleases
      }
    };
  } catch (error) {
    console.error('获取工作台概览数据失败:', error);
    throw error;
  }
};

/**
 * 获取待审核专辑列表
 */
const getPendingAlbums = async (options) => {
  try {
    const { page, limit, status, search, sortBy, sortOrder } = options;
    const offset = (page - 1) * limit;

    // 构建查询条件
    let whereCondition = {};
    
    // 状态筛选
    if (status === 'pending') {
      whereCondition = {
        status: 'pending',
        [Op.or]: [
          { comment: null },
          { comment: { [Op.notLike]: 'DRAFT:%' } }
        ]
      };
    } else if (status === 'draft') {
      whereCondition = {
        status: 'pending',
        comment: { [Op.like]: 'DRAFT:%' }
      };
    } else if (status !== 'all') {
      whereCondition.status = status;
    }

    // 搜索条件 - 需要与状态筛选条件合并，而不是覆盖
    if (search) {
      // 如果已经有状态筛选条件，需要用 Op.and 来组合
      if (Object.keys(whereCondition).length > 0) {
        const existingCondition = { ...whereCondition };
        whereCondition = {
          [Op.and]: [
            existingCondition,
            {
              [Op.or]: [
                { title: { [Op.like]: `%${search}%` } },
                { performer: { [Op.like]: `%${search}%` } },
                { displayInfo: { [Op.like]: `%${search}%` } }
              ]
            }
          ]
        };
      } else {
        // 如果没有状态筛选条件，直接使用搜索条件
        whereCondition[Op.or] = [
          { title: { [Op.like]: `%${search}%` } },
          { performer: { [Op.like]: `%${search}%` } },
          { displayInfo: { [Op.like]: `%${search}%` } }
        ];
      }
    }

    // 排序条件
    const orderCondition = [[sortBy, sortOrder]];

    console.log('查询条件:', JSON.stringify(whereCondition, null, 2));

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
          attributes: ['id', 'title', 'duration'],
          include: [{
            model: Artist,
            as: 'Artists',
            through: { attributes: [] },
            attributes: ['id', 'name']
          }]
        }
      ],
      order: orderCondition,
      limit,
      offset
    });

    // 转换数据格式
    const albums = rows.map(album => ({
      id: album.id,
      title: album.title,
      performer: album.performer,
      displayInfo: album.displayInfo,
      releaseDate: album.releaseDate,
      status: album.status,
      comment: album.comment,
      coverImage: album.coverImage,
      materialDelivered: album.materialDelivered,
      materialDeliveredAt: album.materialDeliveredAt,
      createdAt: album.createdAt,
      updatedAt: album.updatedAt,
      submittedBy: album.submittedBy,
      songCount: album.Songs ? album.Songs.length : 0,
      songs: album.Songs || [],
      isDraft: album.comment && album.comment.startsWith('DRAFT:'),
      virtualStatus: album.comment && album.comment.startsWith('DRAFT:') ? 'draft' : album.status
    }));

    return {
      albums,
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit)
      }
    };
  } catch (error) {
    console.error('获取待审核专辑列表失败:', error);
    throw error;
  }
};

/**
 * 获取专辑详细信息（用于审核）
 */
const getAlbumForReview = async (albumId) => {
  try {
    const album = await Album.findByPk(albumId, {
      include: [
        {
          model: User,
          as: 'submittedBy',
          attributes: ['id', 'username', 'email'],
          include: [{
            model: UserVerification,
            attributes: ['realName', 'idNumber', 'status']
          }]
        },
        {
          model: Song,
          include: [{
            model: Artist,
            as: 'Artists',
            through: { attributes: [] }
          }]
        }
      ]
    });

    if (!album) {
      return null;
    }

    // 转换数据格式
    return {
      id: album.id,
      title: album.title,
      performer: album.performer,
      performerIds: album.performerIds,
      displayInfo: album.displayInfo,
      description: album.description,
      releaseDate: album.releaseDate,
      type: album.type,
      status: album.status,
      comment: album.comment,
      coverImage: album.coverImage,
      authorizationFile: album.authorizationFile,
      materialDelivered: album.materialDelivered,
      materialDeliveredAt: album.materialDeliveredAt,
      materialDeliveredBy: album.materialDeliveredBy,
      createdAt: album.createdAt,
      updatedAt: album.updatedAt,
      submittedBy: album.submittedBy,
      songs: album.Songs || [],
      isDraft: album.comment && album.comment.startsWith('DRAFT:'),
      virtualStatus: album.comment && album.comment.startsWith('DRAFT:') ? 'draft' : album.status
    };
  } catch (error) {
    console.error('获取专辑审核详情失败:', error);
    throw error;
  }
};

/**
 * 批量审核专辑
 */
const batchReviewAlbums = async (options) => {
  try {
    const { albumIds, action, comment, adminId } = options;

    const results = {
      successCount: 0,
      failedCount: 0,
      errors: []
    };

    for (const albumId of albumIds) {
      try {
        const album = await Album.findByPk(albumId);
        if (!album) {
          results.failedCount++;
          results.errors.push(`专辑ID ${albumId} 不存在`);
          continue;
        }

        await album.update({
          status: action,
          comment: comment || (action === 'approved' ? '审核通过' : '审核拒绝'),
          updatedAt: new Date()
        });

        results.successCount++;
      } catch (error) {
        results.failedCount++;
        results.errors.push(`专辑ID ${albumId} 更新失败: ${error.message}`);
      }
    }

    return results;
  } catch (error) {
    console.error('批量审核专辑失败:', error);
    throw error;
  }
};

/**
 * 更新物料传递状态
 */
const updateMaterialDeliveryStatus = async (options) => {
  try {
    const { albumId, delivered, deliveredAt, comment, adminId } = options;

    const album = await Album.findByPk(albumId);
    if (!album) {
      throw new Error('专辑不存在');
    }

    if (album.status !== 'approved') {
      throw new Error('只能为已审核通过的专辑更新物料传递状态');
    }

    const updateData = {
      materialDelivered: delivered,
      updatedAt: new Date()
    };

    await album.update(updateData);

    console.log(`专辑 ${album.title} 的物料递交状态已更新为: ${delivered ? '已递交' : '未递交'}`, {
      albumId: album.id,
      delivered,
      deliveredAt,
      comment,
      adminId
    });

    return {
      albumId: album.id,
      title: album.title,
      materialDelivered: album.materialDelivered,
      updatedAt: album.updatedAt
    };
  } catch (error) {
    console.error('更新物料传递状态失败:', error);
    throw error;
  }
};

/**
 * 获取管理员发行日历数据
 */
const getAdminCalendarData = async (options) => {
  try {
    const { year, month, status } = options;

    // 构建日期范围查询条件
    let dateCondition = {};
    if (month) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      dateCondition = {
        releaseDate: {
          [Op.between]: [startDate, endDate]
        }
      };
    } else {
      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year, 11, 31);
      dateCondition = {
        releaseDate: {
          [Op.between]: [startDate, endDate]
        }
      };
    }

    // 构建状态查询条件 - 发行日历只显示已通过和已拒绝的专辑
    let statusCondition = {};
    if (status !== 'all') {
      statusCondition.status = status;
    } else {
      // 即使是'all'，也只显示已通过和已拒绝的专辑，不显示待审核
      statusCondition.status = {
        [Op.in]: ['approved', 'rejected']
      };
    }

    const albums = await Album.findAll({
      where: {
        ...dateCondition,
        ...statusCondition
      },
      include: [
        {
          model: User,
          as: 'submittedBy',
          attributes: ['id', 'username', 'email']
        }
      ],
      order: [['releaseDate', 'ASC']]
    });

    // 转换数据格式以适配前端日历组件（已通过状态查询过滤）
    const calendarData = albums.map(album => ({
        id: album.id,
        name: album.title,
        cover: album.coverImage || '/images/default-album.png',
        releaseDate: album.releaseDate,
        status: album.status,
        label: album.displayInfo || '未知厂牌',
        performer: album.performer,
        materialDelivered: album.materialDelivered,
        materialDeliveredAt: album.materialDeliveredAt,
        user: album.submittedBy ? {
          id: album.submittedBy.id,
          username: album.submittedBy.username,
          email: album.submittedBy.email
        } : null,
        createdAt: album.createdAt,
        isDraft: false, // 发行日历只显示最终状态，不包含草稿
        virtualStatus: album.status // 发行日历显示实际状态
      }));

    return {
      year,
      month,
      status,
      albums: calendarData,
      total: calendarData.length
    };
  } catch (error) {
    console.error('获取管理员发行日历数据失败:', error);
    throw error;
  }
};

/**
 * 获取发行趋势统计（已投递且过了发行日期的专辑）
 */
const getMaterialDeliveryStats = async (options) => {
  try {
    const { startDate, endDate, status } = options;
    const today = new Date();
    today.setHours(23, 59, 59, 999); // 设置为今天的结束时间

    // 构建日期条件 - 查询指定时间范围内的发行日期
    let dateCondition = {};
    if (startDate && endDate) {
      dateCondition = {
        releaseDate: {
          [Op.between]: [new Date(startDate), new Date(endDate)]
        }
      };
    }

    // 基础条件：已投递且过了发行日期
    const releasedCondition = {
      ...dateCondition,
      status: status || 'approved',
      materialDelivered: true,  // 必须已投递
      releaseDate: {
        ...dateCondition.releaseDate,
        [Op.lte]: today  // 发行日期必须在今天之前（包括今天）
      }
    };

    // 物料投递统计条件（用于兼容现有接口）
    const materialCondition = {
      ...dateCondition,
      status: status || 'approved'
    };

    const [totalAlbums, deliveredAlbums, totalReleased] = await Promise.all([
      Album.count({ where: materialCondition }),
      Album.count({
        where: {
          ...materialCondition,
          materialDelivered: true
        }
      }),
      Album.count({ where: releasedCondition })
    ]);

    // 按日期分组统计发行量（按发行日期分组，只统计已投递且过了发行日期的）
    const dailyStats = await Album.findAll({
      where: releasedCondition,
      attributes: [
        [Sequelize.fn('DATE', Sequelize.col('releaseDate')), 'date'],
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'released']
      ],
      group: [Sequelize.fn('DATE', Sequelize.col('releaseDate'))],
      order: [[Sequelize.fn('DATE', Sequelize.col('releaseDate')), 'ASC']]
    });

    return {
      summary: {
        total: totalAlbums,
        delivered: deliveredAlbums,
        pending: totalAlbums - deliveredAlbums,
        deliveryRate: totalAlbums > 0 ? Math.round((deliveredAlbums / totalAlbums) * 100) : 0,
        totalReleased: totalReleased  // 新增：实际发行数量
      },
      dailyStats: dailyStats.map(stat => ({
        date: stat.getDataValue('date'),
        released: parseInt(stat.getDataValue('released')),
        // 为了兼容现有代码，保留原有字段
        total: parseInt(stat.getDataValue('released')),
        delivered: parseInt(stat.getDataValue('released'))
      }))
    };
  } catch (error) {
    console.error('获取发行趋势统计失败:', error);
    throw error;
  }
};

/**
 * 批量下载专辑物料
 */
const batchDownloadMaterials = async (options) => {
  try {
    const { albumIds, adminId } = options;

    // 获取专辑信息
    const albums = await Album.findAll({
      where: {
        id: albumIds,
        status: 'approved' // 只能下载已通过的专辑物料
      },
      include: [
        {
          model: Song,
          attributes: ['id', 'title', 'duration', 'filePath']
        },
        {
          model: User,
          as: 'submittedBy',
          attributes: ['id', 'username', 'email']
        }
      ]
    });

    if (albums.length === 0) {
      throw new Error('没有找到可下载的专辑');
    }

    // 记录下载操作
    console.log(`管理员 ${adminId} 批量下载了 ${albums.length} 个专辑的物料`);

    // 返回专辑物料信息
    const materialsData = albums.map(album => ({
      id: album.id,
      title: album.title,
      performer: album.performer,
      coverImage: album.coverImage,
      songs: album.Songs || [],
      authorizationFile: album.authorizationFile,
      submittedBy: album.submittedBy
    }));

    return {
      albums: materialsData,
      downloadedAt: new Date().toISOString(),
      downloadedBy: adminId
    };
  } catch (error) {
    console.error('批量下载专辑物料失败:', error);
    throw error;
  }
};

/**
 * 批量标记物料已递交
 */
const batchMarkDelivered = async (options) => {
  try {
    const { albumIds, deliveredAt, comment, adminId } = options;

    // 更新专辑的物料递交状态
    const [updatedCount] = await Album.update({
      materialDelivered: true
    }, {
      where: {
        id: albumIds,
        status: 'approved' // 只能标记已通过的专辑
      }
    });

    if (updatedCount === 0) {
      throw new Error('没有找到可标记的专辑');
    }

    console.log(`管理员 ${adminId} 批量标记了 ${updatedCount} 个专辑的物料为已递交`, {
      albumIds,
      updatedCount,
      deliveredAt,
      comment
    });

    return {
      updatedCount,
      albumIds,
      deliveredAt,
      comment
    };
  } catch (error) {
    console.error('批量标记物料已递交失败:', error);
    throw error;
  }
};

/**
 * 下载单个专辑物料
 */
const downloadAlbumMaterials = async (options) => {
  try {
    const { albumId, adminId } = options;

    const album = await Album.findOne({
      where: {
        id: albumId,
        status: 'approved'
      },
      include: [
        {
          model: Song,
          attributes: ['id', 'title', 'duration', 'filePath']
        },
        {
          model: User,
          as: 'submittedBy',
          attributes: ['id', 'username', 'email']
        }
      ]
    });

    if (!album) {
      throw new Error('专辑不存在或未通过审核');
    }

    console.log(`管理员 ${adminId} 下载了专辑 ${album.title} 的物料`);

    return {
      id: album.id,
      title: album.title,
      performer: album.performer,
      coverImage: album.coverImage,
      songs: album.Songs || [],
      authorizationFile: album.authorizationFile,
      submittedBy: album.submittedBy,
      downloadedAt: new Date().toISOString(),
      downloadedBy: adminId
    };
  } catch (error) {
    console.error('下载单个专辑物料失败:', error);
    throw error;
  }
};

module.exports = {
  getWorkbenchOverview,
  getPendingAlbums,
  getAlbumForReview,
  batchReviewAlbums,
  updateMaterialDeliveryStatus,
  getAdminCalendarData,
  getMaterialDeliveryStats,
  batchDownloadMaterials,
  batchMarkDelivered,
  downloadAlbumMaterials
};
