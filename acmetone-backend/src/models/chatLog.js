const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const ChatLog = sequelize.define('ChatLog', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  userMessage: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  aiResponse: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  reasoningContent: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'AI 的思考过程'
  },
  status: {
    type: DataTypes.ENUM('success', 'error'),
    allowNull: false,
    defaultValue: 'success'
  }
}, {
  tableName: 'chatlogs',
  timestamps: true,
  indexes: [
    {
      fields: ['userId']
    },
    {
      fields: ['createdAt']
    }
  ]
});

module.exports = ChatLog; 