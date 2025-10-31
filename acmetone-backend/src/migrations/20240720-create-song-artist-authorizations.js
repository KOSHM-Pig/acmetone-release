'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. 首先在Songs表中添加authorizationFile字段
    await queryInterface.addColumn('Songs', 'authorizationFile', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: '歌曲级别的授权文件路径'
    });

    // 2. 创建歌手-歌曲授权表
    await queryInterface.createTable('song_artist_authorizations', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      songId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Songs',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      artistId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Artists',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      authorizationFile: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: '授权文件路径'
      },
      uploadedBy: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id'
        },
        comment: '上传授权文件的用户ID'
      },
      uploadedAt: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: '上传授权文件的时间'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    // 3. 添加唯一索引，确保每个歌手-歌曲组合只有一条授权记录
    await queryInterface.addIndex('song_artist_authorizations', ['songId', 'artistId'], {
      unique: true,
      name: 'song_artist_auth_unique'
    });
  },

  down: async (queryInterface, Sequelize) => {
    // 1. 删除song_artist_authorizations表
    await queryInterface.dropTable('song_artist_authorizations');
    
    // 2. 删除Songs表中的authorizationFile字段
    await queryInterface.removeColumn('Songs', 'authorizationFile');
  }
}; 