const { sequelize } = require('../config/db');
const { DataTypes } = require('sequelize');

// AlbumLinkSong 模型 - 专辑链接中的歌曲
const AlbumLinkSong = sequelize.define('AlbumLinkSong', {
  // 歌曲名称
  songName: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: '歌曲名称'
  },
  // 歌曲排序
  trackNumber: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    comment: '歌曲排序号'
  },
  // 关联到的专辑链接ID
  albumLinkId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '关联到的专辑链接ID',
    references: {
      model: 'album_links',
      key: 'id'
    }
  },
  // 关联到内部歌曲ID（可选）
  internalSongId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '关联到系统内部歌曲ID',
    references: {
      model: 'songs',
      key: 'id'
    }
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
  }
}, {
  tableName: 'album_link_songs',
  timestamps: true
});

module.exports = AlbumLinkSong; 