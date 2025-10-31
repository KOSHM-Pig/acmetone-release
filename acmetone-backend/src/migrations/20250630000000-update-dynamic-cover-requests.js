'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. 添加新的platform字段
    await queryInterface.addColumn('dynamic_cover_requests', 'platform', {
      type: Sequelize.ENUM('netease', 'qqmusic', 'applemusic'),
      allowNull: true, // 先设为允许为空，以便迁移数据
      comment: '目标平台: netease(网易云音乐), qqmusic(QQ音乐), applemusic(苹果音乐)'
    });

    // 2. 迁移数据 - 将targetPlatforms的值转换为platform
    // 默认将所有现有记录设置为qqmusic，因为之前的实现只支持QQ音乐和苹果音乐
    await queryInterface.sequelize.query(`
      UPDATE dynamic_cover_requests 
      SET platform = 'qqmusic' 
      WHERE targetPlatforms LIKE '%QQ音乐%'
    `);

    await queryInterface.sequelize.query(`
      UPDATE dynamic_cover_requests 
      SET platform = 'applemusic' 
      WHERE platform IS NULL AND targetPlatforms LIKE '%苹果音乐%'
    `);

    // 3. 将platform字段设为不可为空
    await queryInterface.changeColumn('dynamic_cover_requests', 'platform', {
      type: Sequelize.ENUM('netease', 'qqmusic', 'applemusic'),
      allowNull: false,
      comment: '目标平台: netease(网易云音乐), qqmusic(QQ音乐), applemusic(苹果音乐)'
    });

    // 4. 删除旧的targetPlatforms字段
    await queryInterface.removeColumn('dynamic_cover_requests', 'targetPlatforms');
  },

  down: async (queryInterface, Sequelize) => {
    // 1. 添加回旧的targetPlatforms字段
    await queryInterface.addColumn('dynamic_cover_requests', 'targetPlatforms', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: '目标平台，多个平台用逗号分隔'
    });

    // 2. 迁移数据回去
    await queryInterface.sequelize.query(`
      UPDATE dynamic_cover_requests 
      SET targetPlatforms = 'QQ音乐' 
      WHERE platform = 'qqmusic'
    `);

    await queryInterface.sequelize.query(`
      UPDATE dynamic_cover_requests 
      SET targetPlatforms = '苹果音乐' 
      WHERE platform = 'applemusic'
    `);

    await queryInterface.sequelize.query(`
      UPDATE dynamic_cover_requests 
      SET targetPlatforms = '网易云音乐' 
      WHERE platform = 'netease'
    `);

    // 3. 将targetPlatforms字段设为不可为空
    await queryInterface.changeColumn('dynamic_cover_requests', 'targetPlatforms', {
      type: Sequelize.STRING,
      allowNull: false,
      comment: '目标平台，多个平台用逗号分隔'
    });

    // 4. 删除新的platform字段
    await queryInterface.removeColumn('dynamic_cover_requests', 'platform');

    // 5. 删除ENUM类型
    await queryInterface.sequelize.query(`DROP TYPE enum_dynamic_cover_requests_platform`);
  }
}; 