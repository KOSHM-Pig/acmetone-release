'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 检查genres字段是否已存在
    const tableDescription = await queryInterface.describeTable('labels');
    
    if (!tableDescription.genres) {
      // 添加genres字段
      await queryInterface.addColumn('labels', 'genres', {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: '音乐风格'
      });
      
      console.log('成功添加genres字段到labels表');
    } else {
      console.log('genres字段已存在，跳过添加');
    }
  },

  down: async (queryInterface, Sequelize) => {
    // 检查genres字段是否存在
    const tableDescription = await queryInterface.describeTable('labels');
    
    if (tableDescription.genres) {
      // 删除genres字段
      await queryInterface.removeColumn('labels', 'genres');
      console.log('成功删除labels表的genres字段');
    } else {
      console.log('genres字段不存在，跳过删除');
    }
  }
};
