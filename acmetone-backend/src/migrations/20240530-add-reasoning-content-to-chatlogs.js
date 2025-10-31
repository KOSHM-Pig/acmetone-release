'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('chatlogs', 'reasoningContent', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'AI 的思考过程'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('chatlogs', 'reasoningContent');
  }
}; 