const { sequelize } = require('../config/db');
const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');

// 导入单独定义的模型
const User = require('./User');
const ArtistEditRequest = require('./ArtistEditRequest');
const UserVerification = require('./UserVerification');
const EmailSetting = require('./EmailSetting');
const UserEmailTemplate = require('./UserEmailTemplate');
const EmailLog = require('./EmailLog');
const ChatLog = require('./chatLog.js');
const AlbumLink = require('./AlbumLink');
const AlbumLinkSong = require('./AlbumLinkSong');
const ReleaseMonitorSettings = require('./ReleaseMonitorSettings');
const ReleaseMonitorHistory = require('./ReleaseMonitorHistory');
const CoverTemplate = require('./CoverTemplate');
const AIGenerationAsset = require('./AIGenerationAsset');
const DynamicCoverRequest = require('./DynamicCoverRequest');
const SongArtistAuthorization = require('./SongArtistAuthorization')(sequelize);
const Album = require('./Album'); // 导入Album模型
const PromotionRequest = require('./PromotionRequest');
const MaterialTemplate = require('./MaterialTemplate');
const UserShipment = require('./UserShipment');
const SchedulerTask = require('./SchedulerTask'); // 导入SchedulerTask模型
const TaskExecutionLog = require('./TaskExecutionLog'); // 导入TaskExecutionLog模型
const Label = require('./Label'); // 导入Label模型

// SongArtist (through model for Song and Artist)
const SongArtist = sequelize.define('SongArtist', {
  songId: {
    type: DataTypes.INTEGER,
    references: {
      model: 'songs',
      key: 'id'
    }
  },
  artistId: {
    type: DataTypes.INTEGER,
    references: {
      model: 'artists',
      key: 'id'
    }
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'songartists',
  timestamps: true
});

// VerificationToken 模型
const VerificationToken = sequelize.define('VerificationToken', {
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  token: {
    type: DataTypes.STRING,
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM('email_verification', 'password_reset'),
    allowNull: false
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false
  },
  usedAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'verificationtokens'
});

// Artist 模型
const Artist = sequelize.define('Artist', {
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  realName: DataTypes.STRING,
  id_number: {
    type: DataTypes.STRING(18),
    allowNull: true,
    comment: '身份证号码'
  },
  netease: DataTypes.STRING,
  qq: DataTypes.STRING,
  kugou: DataTypes.STRING,
  kuwo: DataTypes.STRING,
  qishui: DataTypes.STRING,
  spotify: DataTypes.STRING,
  youtube: DataTypes.STRING,
  appleMusic: DataTypes.STRING,
  soundCloud: DataTypes.STRING,
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '艺人介绍'
  },
  avatarUrl: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: '头像URL'
  },
  region: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: '所在地区'
  },
  artistType: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: '艺人类型'
  },
  alias: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: '艺人别名',
    get() {
      const aliasValue = this.getDataValue('alias');
      return aliasValue ? JSON.parse(aliasValue) : [];
    },
    set(value) {
      this.setDataValue('alias', value ? JSON.stringify(value) : null);
    }
  },
  isNewArtist: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: '标记是否为用户创建的全新歌手（无平台链接）'
  },
  canonicalArtistId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'artists',
      key: 'id'
    },
    comment: '关联到的主艺人ID，如果为NULL则表示此艺人为主艺人'
  },
  createdById: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  }
}, {
  tableName: 'artists'
});

// Song 模型
const Song = sequelize.define('Song', {
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  wavFile: {
    type: DataTypes.STRING,
    allowNull: true, // 修改为true，允许为null
    comment: '音频文件路径，可以为空'
  },
  genre: {
    type: DataTypes.STRING,
    allowNull: false
  },
  language: {
    type: DataTypes.STRING,
    allowNull: false
  },
  duration: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: null
  },
  trackNumber: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1
  },
  albumId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'albums',
      key: 'id'
    }
  },
  lyricsFile: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: '歌词文件路径'
  },
  translationLyricsFile: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: '翻译歌词文件路径'
  },
  artists: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: null,
    comment: '歌曲关联的艺术家ID列表，有序，JSON格式'
  },
  isrc: {
    type: DataTypes.STRING(12),
    allowNull: true,
    comment: 'ISRC国际标准录音制品代码，12位字符格式，例如：HKG732539030'
  },
  upc: {
    type: DataTypes.STRING(20),
    allowNull: true,
    comment: 'UPC通用产品代码，用于标识专辑/发行，例如：4894965860115'
  },
  md5: {
    type: DataTypes.CHAR(32),
    allowNull: true,
    comment: '音频文件的MD5哈希值，用于文件完整性验证'
  }
}, {
  tableName: 'songs'
});

// 设置关联关系
Album.belongsTo(User, { as: 'submittedBy', foreignKey: 'submittedById' });
User.hasMany(Album, { foreignKey: 'submittedById' });

// 添加Artist与User的关联关系
Artist.belongsTo(User, { as: 'createdBy', foreignKey: 'createdById' });
User.hasMany(Artist, { foreignKey: 'createdById' });

// 添加Artist自关联关系（主艺人和关联艺人）
Artist.belongsTo(Artist, { as: 'canonicalArtist', foreignKey: 'canonicalArtistId' });
Artist.hasMany(Artist, { as: 'relatedArtists', foreignKey: 'canonicalArtistId' });

// 添加验证令牌关联
VerificationToken.belongsTo(User, { foreignKey: 'userId' });
User.hasMany(VerificationToken, { foreignKey: 'userId' });

// 添加用户实名认证关联
UserVerification.belongsTo(User, { foreignKey: 'userId' });
User.hasOne(UserVerification, { foreignKey: 'userId' });

Album.hasMany(Song, { onDelete: 'CASCADE' });
Song.belongsTo(Album);

// 使用更明确的关联名称
Song.belongsToMany(Artist, { 
  through: SongArtist,
  as: 'Artists'  // 这里使用大写的 Artists 作为关联名称
});
Artist.belongsToMany(Song, { 
  through: SongArtist,
  as: 'Songs'
});

// 更新ArtistEditRequest关联
ArtistEditRequest.belongsTo(User, { as: 'requestedBy', foreignKey: 'requestedById' });
ArtistEditRequest.belongsTo(Song, { foreignKey: 'songId' });
ArtistEditRequest.belongsTo(Artist, { foreignKey: 'artistId' });

// 添加用户邮件模板关联
UserEmailTemplate.belongsTo(User, { foreignKey: 'userId' });
User.hasMany(UserEmailTemplate, { foreignKey: 'userId' });

// 添加聊天记录关联
ChatLog.belongsTo(User, { foreignKey: 'userId' });
User.hasMany(ChatLog, { foreignKey: 'userId' });

// 添加AlbumLink关联
AlbumLink.belongsTo(User, { as: 'createdBy', foreignKey: 'createdById' });
User.hasMany(AlbumLink, { foreignKey: 'createdById' });

// AlbumLink可以关联到内部Album
AlbumLink.belongsTo(Album, { as: 'internalAlbum', foreignKey: 'internalAlbumId' });
Album.hasMany(AlbumLink, { foreignKey: 'internalAlbumId' });

// AlbumLink和AlbumLinkSong关联
AlbumLink.hasMany(AlbumLinkSong, { as: 'songs', foreignKey: 'albumLinkId', onDelete: 'CASCADE' });
AlbumLinkSong.belongsTo(AlbumLink, { foreignKey: 'albumLinkId' });

// AlbumLinkSong可以关联到内部Song
AlbumLinkSong.belongsTo(Song, { as: 'internalSong', foreignKey: 'internalSongId' });
Song.hasMany(AlbumLinkSong, { foreignKey: 'internalSongId' });

// 添加DynamicCoverRequest关联
DynamicCoverRequest.belongsTo(User, { foreignKey: 'userId' });
User.hasMany(DynamicCoverRequest, { foreignKey: 'userId' });

DynamicCoverRequest.belongsTo(Album, { foreignKey: 'albumId' });
Album.hasMany(DynamicCoverRequest, { foreignKey: 'albumId' });

// 权利链条授权模型关联
SongArtistAuthorization.belongsTo(Song, { foreignKey: 'songId' });
Song.hasMany(SongArtistAuthorization, { foreignKey: 'songId' });

SongArtistAuthorization.belongsTo(Artist, { foreignKey: 'artistId' });
Artist.hasMany(SongArtistAuthorization, { foreignKey: 'artistId' });

SongArtistAuthorization.belongsTo(User, { as: 'uploader', foreignKey: 'uploadedBy' });
User.hasMany(SongArtistAuthorization, { as: 'uploadedAuthorizations', foreignKey: 'uploadedBy' });

// 添加PromotionRequest关联
PromotionRequest.belongsTo(Album, { foreignKey: 'albumId' });
Album.hasMany(PromotionRequest, { foreignKey: 'albumId' });

PromotionRequest.belongsTo(User, { foreignKey: 'userId' });
User.hasMany(PromotionRequest, { foreignKey: 'userId' });

// 设置 MaterialTemplate 与 User 的关联
MaterialTemplate.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
User.hasMany(MaterialTemplate, { foreignKey: 'createdBy' });

// 设置 UserShipment 的关联
UserShipment.belongsTo(User, { foreignKey: 'userId' });
User.hasMany(UserShipment, { foreignKey: 'userId' });

UserShipment.belongsTo(User, { foreignKey: 'createdBy', as: 'createdByUser' });
User.hasMany(UserShipment, { foreignKey: 'createdBy', as: 'createdShipments' });

UserShipment.belongsTo(MaterialTemplate, { foreignKey: 'materialTemplateId', as: 'materialTemplate' });
MaterialTemplate.hasMany(UserShipment, { foreignKey: 'materialTemplateId' });

// 设置 Label 的关联关系
Label.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasOne(Label, { foreignKey: 'userId' });

Label.belongsTo(User, { foreignKey: 'verifiedBy', as: 'reviewer' });
User.hasMany(Label, { foreignKey: 'verifiedBy', as: 'reviewedLabels' });


// 密码加密中间件
User.beforeCreate(async (user) => {
  if (user.password) {
    user.password = await bcrypt.hash(user.password, 10);
  }
});

// 用户喜欢的艺人
User.belongsToMany(Artist, { 
  through: 'user_favorite_artists',
  as: 'favoriteArtists',
  foreignKey: 'userId',
  otherKey: 'artistId'
});

// 初始化模型
const SchedulerTaskModel = SchedulerTask(sequelize);
const TaskExecutionLogModel = TaskExecutionLog(sequelize);

// 设置关联关系
SchedulerTaskModel.hasMany(TaskExecutionLogModel, {
  foreignKey: 'taskId',
  as: 'executionLogs'
});
TaskExecutionLogModel.belongsTo(SchedulerTaskModel, {
  foreignKey: 'taskId',
  as: 'task'
});

// 数据库同步函数
const syncDatabase = async () => {
  try {
    await sequelize.sync({ alter: true });
    console.log('数据库同步成功');
    return true;
  } catch (error) {
    console.error('数据库同步失败:', error);
    return false;
  }
};

// 导出所有模型
module.exports = {
  sequelize,
  User,
  Artist,
  Album,
  Song,
  ArtistEditRequest,
  UserVerification,
  EmailSetting,
  UserEmailTemplate,
  EmailLog,
  ChatLog,
  AlbumLink,
  AlbumLinkSong,
  ReleaseMonitorSettings,
  ReleaseMonitorHistory,
  CoverTemplate,
  AIGenerationAsset,
  DynamicCoverRequest,
  SongArtistAuthorization,
  PromotionRequest,
  SongArtist,
  MaterialTemplate,
  UserShipment,
  Label,
  SchedulerTask: SchedulerTaskModel,
  TaskExecutionLog: TaskExecutionLogModel,
  VerificationToken,
  syncDatabase
}; 