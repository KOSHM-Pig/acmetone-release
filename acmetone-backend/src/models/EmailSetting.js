const { sequelize } = require('../config/db');
const { DataTypes } = require('sequelize');

// EmailSetting 模型 - 用于存储邮件通知设置
const EmailSetting = sequelize.define('EmailSetting', {
  // 设置类型，例如：album_approved, album_rejected, verification_status_change等
  settingType: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    primaryKey: true,
    field: 'settingType'  // 确保与数据库列名完全匹配
  },
  // 是否启用此类型的邮件通知
  enabled: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'enabled'
  },
  // 邮件模板标题
  subject: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'subject'
  },
  // 邮件模板描述
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'description'
  },
  // 上次修改者ID
  lastModifiedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'lastModifiedBy'
  }
}, {
  timestamps: true,
  tableName: 'emailsettings',  // 表名小写
  underscored: false,  // 不使用下划线命名
  freezeTableName: true  // 冻结表名，防止 Sequelize 自动修改
});

module.exports = EmailSetting; 