const { sequelize } = require('../config/db');
const { DataTypes } = require('sequelize');

// MaterialTemplate 模型 - 定义可发送的物料种类
const MaterialTemplate = sequelize.define('MaterialTemplate', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false,
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: '物料名称',
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '物料详细描述',
  },
  imageUrl: {
    type: DataTypes.STRING(2048),
    allowNull: true,
    comment: '物料图片链接',
  },
  tags: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '物料标签 (JSON数组)',
  },
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
  },
}, {
  tableName: 'material_templates',
  timestamps: true,
});

module.exports = MaterialTemplate; 