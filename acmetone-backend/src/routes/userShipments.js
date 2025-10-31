const express = require('express');
const router = express.Router();
const { adminAuth, auth } = require('../middleware/auth');
const {
  createShipment,
  getUserShipments,
  getAllShipments,
  updateShipment,
  deleteShipment,
} = require('../controllers/userShipmentController');

// 普通用户获取自己的物流记录
router.get('/', auth, getUserShipments);

// Admin 创建发货记录
router.post('/', adminAuth, createShipment);

// Admin 获取全部物流记录
router.get('/admin/all', adminAuth, getAllShipments);

// Admin 更新发货记录
router.put('/admin/:id', adminAuth, updateShipment);

// Admin 删除发货记录
router.delete('/admin/:id', adminAuth, deleteShipment);

module.exports = router; 