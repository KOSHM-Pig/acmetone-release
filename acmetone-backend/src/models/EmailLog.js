const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

// 定义MySQL版本的EmailLog模型
const EmailLog = sequelize.define('email_logs', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  to: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'to' // 使用反引号是为了避免与MySQL关键字冲突
  },
  subject: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  htmlContent: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  type: {
    type: DataTypes.STRING(50),
    allowNull: true,
    validate: {
      isIn: [
        [
          'verification_code',
          'password_reset',
          'album_approved',
          'album_rejected',
          'beat_array_approved',
          'beat_array_rejected',
          'verification_status',
          'album_released',
          'other'
        ]
      ]
    }
  },
  status: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'success',
    validate: {
      isIn: [['success', 'failed']]
    }
  },
  messageId: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  error: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'email_logs',
  timestamps: true
});

module.exports = EmailLog; 