const { sequelize } = require('../config/db');
const { DataTypes } = require('sequelize');

const DynamicCoverRequest = sequelize.define('DynamicCoverRequest', {
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  albumId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'albums',
      key: 'id'
    }
  },
  platform: {
    type: DataTypes.ENUM('netease', 'qqmusic', 'applemusic'),
    allowNull: false,
    comment: '目标平台: netease(网易云音乐), qqmusic(QQ音乐), applemusic(苹果音乐)'
  },
  dynamicCoverPath: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: '动态封面文件路径 (1:1方形格式)'
  },
  portraitCoverPath: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: '苹果音乐专用竖版动态封面文件路径 (3:4比例)'
  },
  originalFilename: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: '原始文件名'
  },
  portraitOriginalFilename: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: '竖版原始文件名'
  },
  fileSize: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '文件大小（字节）'
  },
  portraitFileSize: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '竖版文件大小（字节）'
  },
  duration: {
    type: DataTypes.FLOAT,
    allowNull: false,
    comment: '视频时长（秒）'
  },
  portraitDuration: {
    type: DataTypes.FLOAT,
    allowNull: true,
    comment: '竖版视频时长（秒）'
  },
  resolution: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: '视频分辨率，如 1280x720'
  },
  portraitResolution: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: '竖版视频分辨率，如 720x960'
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'submitted', 'rejected'),
    allowNull: false,
    defaultValue: 'pending',
    comment: '申请状态: pending(待审核), approved(极音记审核通过), submitted(已递交音乐平台), rejected(被拒绝)'
  },
  rejectionReason: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '拒绝原因'
  },
  adminComment: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '管理员备注'
  }
}, {
  tableName: 'dynamic_cover_requests',
  timestamps: true
});

module.exports = DynamicCoverRequest; 