const { Album, Song, Artist, User, UserVerification } = require('../models');
const { Op, Sequelize } = require('sequelize');
const adminWorkbenchService = require('../services/adminWorkbenchService');

/**
 * 管理员审核工作台控制器
 * 提供集成的发行审核功能
 */

/**
 * 获取工作台概览数据
 */
const getWorkbenchOverview = async (req, res) => {
  try {
    console.log('获取管理员工作台概览数据');
    
    const overview = await adminWorkbenchService.getWorkbenchOverview();
    
    res.json({
      success: true,
      data: overview
    });
  } catch (error) {
    console.error('获取工作台概览数据失败:', error);
    res.status(500).json({
      success: false,
      message: '获取工作台概览数据失败',
      error: error.message
    });
  }
};

/**
 * 获取待审核专辑列表（分页）
 */
const getPendingAlbums = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status = 'pending',
      search = '',
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = req.query;

    console.log('获取待审核专辑列表:', { page, limit, status, search, sortBy, sortOrder });

    const result = await adminWorkbenchService.getPendingAlbums({
      page: parseInt(page),
      limit: parseInt(limit),
      status,
      search,
      sortBy,
      sortOrder
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('获取待审核专辑列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取待审核专辑列表失败',
      error: error.message
    });
  }
};

/**
 * 获取专辑详细信息（用于审核）
 */
const getAlbumForReview = async (req, res) => {
  try {
    const { albumId } = req.params;
    console.log('获取专辑审核详情:', albumId);

    const album = await adminWorkbenchService.getAlbumForReview(albumId);

    if (!album) {
      return res.status(404).json({
        success: false,
        message: '专辑不存在'
      });
    }

    res.json({
      success: true,
      data: album
    });
  } catch (error) {
    console.error('获取专辑审核详情失败:', error);
    res.status(500).json({
      success: false,
      message: '获取专辑审核详情失败',
      error: error.message
    });
  }
};

/**
 * 批量审核专辑
 */
const batchReviewAlbums = async (req, res) => {
  try {
    const { albumIds, action, comment } = req.body;
    const adminId = req.user.id;

    console.log('批量审核专辑:', { albumIds, action, comment, adminId });

    if (!albumIds || !Array.isArray(albumIds) || albumIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请选择要审核的专辑'
      });
    }

    if (!['approved', 'rejected'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: '无效的审核操作'
      });
    }

    const result = await adminWorkbenchService.batchReviewAlbums({
      albumIds,
      action,
      comment,
      adminId
    });

    res.json({
      success: true,
      data: result,
      message: `成功${action === 'approved' ? '通过' : '拒绝'}${result.successCount}个专辑`
    });
  } catch (error) {
    console.error('批量审核专辑失败:', error);
    res.status(500).json({
      success: false,
      message: '批量审核专辑失败',
      error: error.message
    });
  }
};

/**
 * 更新物料传递状态
 */
const updateMaterialDeliveryStatus = async (req, res) => {
  try {
    const { albumId } = req.params;
    const { delivered, deliveredAt, comment } = req.body;
    const adminId = req.user.id;

    console.log('更新物料传递状态:', { albumId, delivered, deliveredAt, comment, adminId });

    const result = await adminWorkbenchService.updateMaterialDeliveryStatus({
      albumId,
      delivered,
      deliveredAt,
      comment,
      adminId
    });

    res.json({
      success: true,
      data: result,
      message: delivered ? '物料传递状态已标记为已传递' : '物料传递状态已标记为未传递'
    });
  } catch (error) {
    console.error('更新物料传递状态失败:', error);
    res.status(500).json({
      success: false,
      message: '更新物料传递状态失败',
      error: error.message
    });
  }
};

/**
 * 获取发行日历数据（管理员视图）
 */
const getAdminCalendarData = async (req, res) => {
  try {
    const { 
      year = new Date().getFullYear(), 
      month,
      status = 'all'
    } = req.query;

    console.log('获取管理员发行日历数据:', { year, month, status });

    const result = await adminWorkbenchService.getAdminCalendarData({
      year: parseInt(year),
      month: month ? parseInt(month) : null,
      status
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('获取管理员发行日历数据失败:', error);
    res.status(500).json({
      success: false,
      message: '获取管理员发行日历数据失败',
      error: error.message
    });
  }
};

/**
 * 获取物料传递统计
 */
const getMaterialDeliveryStats = async (req, res) => {
  try {
    const { 
      startDate,
      endDate,
      status = 'approved'
    } = req.query;

    console.log('获取物料传递统计:', { startDate, endDate, status });

    const result = await adminWorkbenchService.getMaterialDeliveryStats({
      startDate,
      endDate,
      status
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('获取物料传递统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取物料传递统计失败',
      error: error.message
    });
  }
};

/**
 * 批量下载专辑物料
 */
const batchDownloadMaterials = async (req, res) => {
  try {
    const { albumIds } = req.body;
    const adminId = req.user.id;

    console.log('批量下载专辑物料:', { albumIds, adminId });

    const result = await adminWorkbenchService.batchDownloadMaterials({
      albumIds,
      adminId
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('批量下载专辑物料失败:', error);
    res.status(500).json({
      success: false,
      message: '批量下载专辑物料失败',
      error: error.message
    });
  }
};

/**
 * 批量标记物料已递交
 */
const batchMarkDelivered = async (req, res) => {
  try {
    const { albumIds, deliveredAt, comment } = req.body;
    const adminId = req.user.id;

    console.log('批量标记物料已递交:', { albumIds, deliveredAt, comment, adminId });

    const result = await adminWorkbenchService.batchMarkDelivered({
      albumIds,
      deliveredAt: deliveredAt || new Date().toISOString(),
      comment: comment || '批量标记为已递交',
      adminId
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('批量标记物料已递交失败:', error);
    res.status(500).json({
      success: false,
      message: '批量标记物料已递交失败',
      error: error.message
    });
  }
};

/**
 * 下载单个专辑物料
 */
const downloadAlbumMaterials = async (req, res) => {
  try {
    const { albumId } = req.params;
    const adminId = req.user.id;

    console.log('下载单个专辑物料:', { albumId, adminId });

    const result = await adminWorkbenchService.downloadAlbumMaterials({
      albumId,
      adminId
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('下载单个专辑物料失败:', error);
    res.status(500).json({
      success: false,
      message: '下载单个专辑物料失败',
      error: error.message
    });
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
