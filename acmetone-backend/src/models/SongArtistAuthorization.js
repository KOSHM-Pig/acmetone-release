const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SongArtistAuthorization = sequelize.define('SongArtistAuthorization', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    songId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Songs',
        key: 'id'
      }
    },
    artistId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Artists',
        key: 'id'
      }
    },
    authorizationFile: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: '授权文件路径'
    },
    uploadedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      },
      comment: '上传授权文件的用户ID'
    },
    uploadedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: '上传授权文件的时间'
    }
  }, {
    tableName: 'song_artist_authorizations',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['songId', 'artistId']
      }
    ]
  });

  SongArtistAuthorization.associate = (models) => {
    SongArtistAuthorization.belongsTo(models.Song, { foreignKey: 'songId' });
    SongArtistAuthorization.belongsTo(models.Artist, { foreignKey: 'artistId' });
    SongArtistAuthorization.belongsTo(models.User, { foreignKey: 'uploadedBy', as: 'uploader' });
  };

  return SongArtistAuthorization;
}; 