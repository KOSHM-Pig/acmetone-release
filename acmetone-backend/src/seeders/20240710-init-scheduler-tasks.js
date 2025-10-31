'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 创建初始定时任务
    await queryInterface.bulkInsert('schedulertasks', [
      {
        id: 'autoEnableAlbumLinks',
        name: '自动启用专辑链接',
        description: '检查专辑发行日期，自动启用已到发行日期的专辑链接',
        expression: '10 0 * * *', // 每天凌晨00:10执行
        timezone: 'Asia/Shanghai',
        status: 'active',
        runCount: 0,
        logDirectory: 'logs/scheduler/autoEnableAlbumLinks',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ], {});
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('schedulertasks', {
      id: ['autoEnableAlbumLinks']
    }, {});
  }
}; 