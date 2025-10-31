const express = require('express');
const router = express.Router();
const { adminAuth } = require('../middleware/auth');
const {
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
} = require('../controllers/adminWorkbenchController');

/**
 * 管理员审核工作台路由
 * 所有路由都需要管理员权限
 */

/**
 * 获取工作台概览数据
 * GET /api/admin/workbench/overview
 */
router.get('/overview', adminAuth, getWorkbenchOverview);

/**
 * 获取待审核专辑列表（分页）
 * GET /api/admin/workbench/albums
 * 查询参数：
 * - page: 页码 (默认1)
 * - limit: 每页数量 (默认10)
 * - status: 状态筛选 (pending/approved/rejected/draft/all, 默认pending)
 * - search: 搜索关键词
 * - sortBy: 排序字段 (默认createdAt)
 * - sortOrder: 排序方向 (ASC/DESC, 默认DESC)
 */
router.get('/albums', adminAuth, getPendingAlbums);

/**
 * 获取专辑详细信息（用于审核）
 * GET /api/admin/workbench/albums/:albumId
 */
router.get('/albums/:albumId', adminAuth, getAlbumForReview);

/**
 * 批量审核专辑
 * POST /api/admin/workbench/albums/batch-review
 * 请求体：
 * - albumIds: 专辑ID数组
 * - action: 审核操作 (approved/rejected)
 * - comment: 审核意见
 */
router.post('/albums/batch-review', adminAuth, batchReviewAlbums);

/**
 * 更新物料传递状态
 * PATCH /api/admin/workbench/albums/:albumId/material-delivery
 * 请求体：
 * - delivered: 是否已传递 (boolean)
 * - deliveredAt: 传递时间 (可选)
 * - comment: 备注 (可选)
 */
router.patch('/albums/:albumId/material-delivery', adminAuth, updateMaterialDeliveryStatus);

/**
 * 获取发行日历数据（管理员视图）
 * GET /api/admin/workbench/calendar
 * 查询参数：
 * - year: 年份 (默认当前年份)
 * - month: 月份 (可选)
 * - status: 状态筛选 (all/pending/approved/rejected, 默认all)
 */
router.get('/calendar', adminAuth, getAdminCalendarData);

/**
 * 获取物料传递统计
 * GET /api/admin/workbench/material-stats
 * 查询参数：
 * - startDate: 开始日期 (可选)
 * - endDate: 结束日期 (可选)
 * - status: 专辑状态 (默认approved)
 */
router.get('/material-stats', adminAuth, getMaterialDeliveryStats);

/**
 * 获取待递交物料数量
 * GET /api/admin/workbench/material-pending-count
 */
router.get('/material-pending-count', adminAuth, async (req, res) => {
  try {
    const { Album } = require('../models');

    // 统计已通过但未递交物料的专辑数量
    const count = await Album.count({
      where: {
        status: 'approved',
        materialDelivered: false
      }
    });

    res.json({ count });
  } catch (error) {
    console.error('获取待递交物料数量错误:', error);
    res.status(500).json({
      message: error.message || '获取待递交物料数量失败'
    });
  }
});

/**
 * 批量下载专辑物料
 * POST /api/admin/workbench/albums/batch-download
 * 请求体：
 * - albumIds: 专辑ID数组
 */
router.post('/albums/batch-download', adminAuth, batchDownloadMaterials);

/**
 * 批量标记物料已递交
 * POST /api/admin/workbench/albums/batch-delivery
 * 请求体：
 * - albumIds: 专辑ID数组
 * - deliveredAt: 递交时间 (可选)
 * - comment: 备注 (可选)
 */
router.post('/albums/batch-delivery', adminAuth, batchMarkDelivered);

/**
 * 下载单个专辑物料
 * GET /api/admin/workbench/albums/:albumId/download
 */
router.get('/albums/:albumId/download', adminAuth, downloadAlbumMaterials);

module.exports = router;
