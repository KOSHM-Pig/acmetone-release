'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 添加ISRC自动获取定时任务
    await queryInterface.bulkInsert('schedulertasks', [
      {
        id: 'autoFetchISRC',
        name: 'ISRC自动获取',
        description: '自动查询没有ISRC的歌曲，通过ISRC API搜索并保存强匹配的ISRC代码到数据库',
        expression: '0 2 * * *', // 每天凌晨02:00执行
        timezone: 'Asia/Shanghai',
        status: 'active',
        runCount: 0,
        logDirectory: 'logs/scheduler/autoFetchISRC',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ], {});
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('schedulertasks', {
      id: ['autoFetchISRC']
    }, {});
  }
};
