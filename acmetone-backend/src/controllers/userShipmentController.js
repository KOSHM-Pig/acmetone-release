const UserShipment = require('../models/UserShipment');
const MaterialTemplate = require('../models/MaterialTemplate');
const { User } = require('../models');
const axios = require('axios');

// 创建发货记录 (Admin)
const createShipment = async (req, res) => {
  try {
    const { userId, materialTemplateId, trackingNumber, shippedAt, adminNotes } = req.body;
    if (!userId || !materialTemplateId) {
      return res.status(400).json({ message: '缺少必填字段' });
    }

    let carrierName = null;
    if (trackingNumber) {
        try {
            const carrierResponse = await axios.get(`https://www.kuaidi.com/index-ajaxselectinfo-${trackingNumber}.html`);
            const carriers = carrierResponse.data;
            if (carriers && carriers.length > 0) {
                carrierName = carriers[0].name;
            }
        } catch (e) {
            console.error("Carrier detection failed:", e.message);
        }
    }

    const shipment = await UserShipment.create({
      userId,
      materialTemplateId,
      carrier: carrierName,
      trackingNumber,
      shippedAt,
      adminNotes,
      status: shippedAt ? 'shipped' : 'processing',
      createdBy: req.user.id,
    });

    res.status(201).json(shipment);
  } catch (error) {
    console.error('创建发货记录失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
};

// 获取登录用户的发货记录 (User)
const getUserShipments = async (req, res) => {
  try {
    const shipments = await UserShipment.findAll({
      where: { userId: req.user.id },
      include: [{ model: MaterialTemplate, as: 'materialTemplate' }],
      order: [['createdAt', 'DESC']],
    });

    res.json(shipments);
  } catch (error) {
    console.error('获取用户发货记录失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
};

// 管理员获取所有发货记录
const getAllShipments = async (req, res) => {
  try {
    const shipments = await UserShipment.findAll({
      include: [
        { model: MaterialTemplate, as: 'materialTemplate' },
        { model: User, as: 'createdByUser', attributes: ['id', 'username'] },
        { model: User, attributes: ['id', 'username'] },
      ],
      order: [['createdAt', 'DESC']],
    });
    res.json(shipments);
  } catch (error) {
    console.error('获取发货记录失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
};

// 更新发货记录 (Admin)
const updateShipment = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, carrier, trackingNumber, shippedAt, adminNotes } = req.body;
    const shipment = await UserShipment.findByPk(id);
    if (!shipment) return res.status(404).json({ message: '未找到发货记录' });

    await shipment.update({ status, carrier, trackingNumber, shippedAt, adminNotes });
    res.json(shipment);
  } catch (error) {
    console.error('更新发货记录失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
};

// 删除发货记录 (Admin)
const deleteShipment = async (req, res) => {
  try {
    const { id } = req.params;
    const shipment = await UserShipment.findByPk(id);
    if (!shipment) {
      return res.status(404).json({ message: '未找到发货记录' });
    }

    await shipment.destroy();
    res.status(200).json({ message: '发货记录已删除' });
  } catch (error) {
    console.error('删除发货记录失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
};


module.exports = {
  createShipment,
  getUserShipments,
  getAllShipments,
  updateShipment,
  deleteShipment,
}; 