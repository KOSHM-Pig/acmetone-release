const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

// 发布监控历史记录模型
const ReleaseMonitorHistory = sequelize.define('ReleaseMonitorHistory', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  albumId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '专辑ID'
  },
  albumName: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: '专辑名称'
  },
  artistName: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: '艺术家名称'
  },
  platform: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: '检测平台'
  },
  checkTime: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    comment: '检测时间'
  },
  detected: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: '是否检测到上架'
  },
  matchCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: '匹配数量'
  },
  apiResponse: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'API响应内容，JSON格式'
  },
  notified: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: '是否已通知'
  }
}, {
  tableName: 'release_monitor_history',
  timestamps: true,
  indexes: [
    {
      name: 'album_platform_idx',
      fields: ['albumId', 'platform']
    },
    {
      name: 'check_time_idx',
      fields: ['checkTime']
    },
    {
      name: 'detected_idx',
      fields: ['detected']
    }
  ]
});

module.exports = ReleaseMonitorHistory; 