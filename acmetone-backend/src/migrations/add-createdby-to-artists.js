'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 添加createdById字段
    await queryInterface.addColumn('artists', 'createdById', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    // 为已有记录添加索引
    await queryInterface.addIndex('artists', ['createdById']);
  },

  down: async (queryInterface, Sequelize) => {
    // 删除createdById字段
    await queryInterface.removeColumn('artists', 'createdById');
  }
}; 