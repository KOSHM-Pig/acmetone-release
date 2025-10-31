const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

// 发布监控设置模型
const ReleaseMonitorSettings = sequelize.define('ReleaseMonitorSettings', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  checkFrequency: {
    type: DataTypes.ENUM('minutes', 'hourly', '6hours', '12hours', 'daily', 'weekly'),
    allowNull: false,
    defaultValue: 'daily',
    comment: '检查频率'
  },
  minutesInterval: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 5,
    comment: '分钟间隔，当checkFrequency为minutes时使用'
  },
  checkTime: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: '09:00',
    comment: '检查时间，格式为HH:MM'
  },
  matchThreshold: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    comment: '匹配阈值，至少需要多少个匹配才认为检测到'
  },
  enabled: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    comment: '是否启用自动检测'
  },
  platforms: {
    type: DataTypes.TEXT,
    allowNull: false,
    defaultValue: '["netease"]',
    comment: '需要检测的平台，JSON数组'
  },
  lastCheckTime: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '上次检测时间'
  }
}, {
  tableName: 'release_monitor_settings',
  timestamps: true
});

module.exports = ReleaseMonitorSettings; 