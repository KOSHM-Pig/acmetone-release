'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('dynamic_cover_requests', 'portraitCoverPath', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: '苹果音乐专用竖版动态封面文件路径 (3:4比例)'
    });

    await queryInterface.addColumn('dynamic_cover_requests', 'portraitOriginalFilename', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: '竖版原始文件名'
    });

    await queryInterface.addColumn('dynamic_cover_requests', 'portraitFileSize', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: '竖版文件大小（字节）'
    });

    await queryInterface.addColumn('dynamic_cover_requests', 'portraitDuration', {
      type: Sequelize.FLOAT,
      allowNull: true,
      comment: '竖版视频时长（秒）'
    });

    await queryInterface.addColumn('dynamic_cover_requests', 'portraitResolution', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: '竖版视频分辨率，如 720x960'
    });

    // 修改动态封面路径字段的注释
    await queryInterface.changeColumn('dynamic_cover_requests', 'dynamicCoverPath', {
      type: Sequelize.STRING,
      allowNull: false,
      comment: '动态封面文件路径 (1:1方形格式)'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('dynamic_cover_requests', 'portraitCoverPath');
    await queryInterface.removeColumn('dynamic_cover_requests', 'portraitOriginalFilename');
    await queryInterface.removeColumn('dynamic_cover_requests', 'portraitFileSize');
    await queryInterface.removeColumn('dynamic_cover_requests', 'portraitDuration');
    await queryInterface.removeColumn('dynamic_cover_requests', 'portraitResolution');

    // 恢复动态封面路径字段的原始注释
    await queryInterface.changeColumn('dynamic_cover_requests', 'dynamicCoverPath', {
      type: Sequelize.STRING,
      allowNull: false,
      comment: '动态封面文件路径'
    });
  }
}; 