'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('dynamic_cover_requests', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      albumId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'albums',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      targetPlatforms: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: '目标平台，多个平台用逗号分隔'
      },
      dynamicCoverPath: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: '动态封面文件路径'
      },
      originalFilename: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: '原始文件名'
      },
      fileSize: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: '文件大小（字节）'
      },
      duration: {
        type: Sequelize.FLOAT,
        allowNull: false,
        comment: '视频时长（秒）'
      },
      resolution: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: '视频分辨率，如 1280x720'
      },
      status: {
        type: Sequelize.ENUM('pending', 'approved', 'rejected'),
        allowNull: false,
        defaultValue: 'pending',
        comment: '申请状态'
      },
      rejectionReason: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: '拒绝原因'
      },
      adminComment: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: '管理员备注'
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('dynamic_cover_requests');
  }
}; 