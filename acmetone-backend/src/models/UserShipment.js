const { sequelize } = require('../config/db');
const { DataTypes } = require('sequelize');

// UserShipment 模型 - 用户物料发货记录
const UserShipment = sequelize.define('UserShipment', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
    comment: '接收用户的ID',
  },
  materialTemplateId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'material_templates',
      key: 'id',
    },
    comment: '关联的物料模板ID',
  },
  status: {
    type: DataTypes.ENUM('processing', 'shipped', 'delivered'),
    allowNull: false,
    defaultValue: 'processing',
    comment: '物流状态',
  },
  carrier: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: '快递公司名称',
  },
  trackingNumber: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: '快递运单号',
  },
  shippedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '发货时间',
  },
  adminNotes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '管理员备注',
  },
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
    comment: '创建记录的用户ID',
  },
}, {
  tableName: 'user_shipments',
  timestamps: true,
});

module.exports = UserShipment; 