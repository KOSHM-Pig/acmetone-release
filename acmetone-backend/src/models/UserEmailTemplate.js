const { sequelize } = require('../config/db');
const { DataTypes } = require('sequelize');

// UserEmailTemplate 模型 - 用于存储用户自定义的邮件模板
const UserEmailTemplate = sequelize.define('UserEmailTemplate', {
  // 用户ID
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  // 模板类型：beat_array_approved, beat_array_rejected
  templateType: {
    type: DataTypes.STRING,
    allowNull: false
  },
  // 是否启用此模板
  enabled: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  // 邮件模板标题
  subject: {
    type: DataTypes.STRING,
    allowNull: false
  },
  // 邮件模板内容
  template: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  // 厂牌ID (节奏阵列平台的厂牌ID)
  labelId: {
    type: DataTypes.INTEGER,
    allowNull: true
  }
}, {
  timestamps: true,
  tableName: 'useremailtemplate',
  underscored: false,
  freezeTableName: true
});

module.exports = UserEmailTemplate; 