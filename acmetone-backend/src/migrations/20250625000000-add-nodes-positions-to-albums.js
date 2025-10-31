'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Albums', 'nodesPositions', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: '流程图中节点的位置信息（JSON格式）'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Albums', 'nodesPositions');
  }
}; 