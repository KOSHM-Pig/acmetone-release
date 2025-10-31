'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 先检查avatar字段是否存在
    const tableInfo = await queryInterface.describeTable('users');
    
    // 如果avatar字段存在，则修改它
    if (tableInfo.avatar) {
      await queryInterface.changeColumn('users', 'avatar', {
        type: Sequelize.STRING(1000),
        allowNull: true,
        defaultValue: null
      });
      console.log('已更新avatar字段');
    } else {
      // 如果不存在，则添加它
      await queryInterface.addColumn('users', 'avatar', {
        type: Sequelize.STRING(1000),
        allowNull: true,
        defaultValue: null
      });
      console.log('已添加avatar字段');
    }
  },

  down: async (queryInterface, Sequelize) => {
    // 恢复到原始状态
    const tableInfo = await queryInterface.describeTable('users');
    
    if (tableInfo.avatar) {
      await queryInterface.changeColumn('users', 'avatar', {
        type: Sequelize.STRING,
        allowNull: true
      });
      console.log('已恢复avatar字段');
    }
  }
}; 