const { sequelize } = require('../config/db');
const { DataTypes } = require('sequelize');

// ArtistEditRequest 模型定义
const ArtistEditRequest = sequelize.define('ArtistEditRequest', {
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected'),
    defaultValue: 'pending'
  },
  comment: {
    type: DataTypes.STRING,
    allowNull: true
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '用户提交修改申请的理由'
  },
  // 新的艺人信息
  newName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  newRealName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  new_id_number: {
    type: DataTypes.STRING(18),
    allowNull: true,
    comment: '新的身份证号码'
  },
  // 平台链接
  newNetease: {
    type: DataTypes.STRING,
    allowNull: true
  },
  newQq: {
    type: DataTypes.STRING,
    allowNull: true
  },
  newKugou: {
    type: DataTypes.STRING,
    allowNull: true
  },
  newKuwo: {
    type: DataTypes.STRING,
    allowNull: true
  },
  newQishui: {
    type: DataTypes.STRING,
    allowNull: true
  },
  newSpotify: {
    type: DataTypes.STRING,
    allowNull: true
  },
  newYoutube: {
    type: DataTypes.STRING,
    allowNull: true
  },
  newAppleMusic: {
    type: DataTypes.STRING,
    allowNull: true
  },
  newSoundCloud: {
    type: DataTypes.STRING,
    allowNull: true
  },
  // 外键
  artistId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'artists',
      key: 'id'
    }
  },
  songId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: null,
    references: {
      model: 'songs',
      key: 'id'
    }
  },
  requestedById: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  }
}, {
  tableName: 'artisteditrequests'
});

module.exports = ArtistEditRequest; 