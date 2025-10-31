const { sequelize } = require('../config/db');
const { DataTypes } = require('sequelize');

// NewSongLink 模型 - 新曲链接展示页面
const NewSongLink = sequelize.define('NewSongLink', {
  // 页面标题
  title: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: '新曲链接页面标题'
  },
  // 歌曲名称
  songName: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: '歌曲名称'
  },
  // 歌手名称
  artistName: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: '歌手名称'
  },
  // 封面图片URL
  coverImage: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: '封面图片URL'
  },
  // 发布日期
  releaseDate: {
    type: DataTypes.DATE,
    allowNull: false,
    comment: '发布日期'
  },
  // 页面标识符 (用于URL)
  slug: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    comment: '页面标识符，用于URL'
  },
  // 页面描述
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '页面描述'
  },
  // 网易云音乐链接
  netease: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: '网易云音乐链接'
  },
  // QQ音乐链接
  qq: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'QQ音乐链接'
  },
  // 酷狗音乐链接
  kugou: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: '酷狗音乐链接'
  },
  // 酷我音乐链接
  kuwo: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: '酷我音乐链接'
  },
  // 汽水音乐链接
  qishui: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: '汽水音乐链接'
  },
  // Spotify链接
  spotify: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Spotify链接'
  },
  // YouTube链接
  youtube: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'YouTube链接'
  },
  // Apple Music链接
  appleMusic: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Apple Music链接'
  },
  // SoundCloud链接
  soundCloud: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'SoundCloud链接'
  },
  // 是否显示
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    comment: '是否显示'
  },
  // 创建者ID
  createdById: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '创建者ID',
    references: {
      model: 'users',
      key: 'id'
    }
  }
}, {
  tableName: 'new_song_links',
  timestamps: true
});

module.exports = NewSongLink; 