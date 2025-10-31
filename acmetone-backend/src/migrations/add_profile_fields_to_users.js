'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('users', 'nickname', {
      type: Sequelize.STRING,
      allowNull: true
    });
    
    await queryInterface.addColumn('users', 'bio', {
      type: Sequelize.TEXT,
      allowNull: true
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('users', 'nickname');
    await queryInterface.removeColumn('users', 'bio');
  }
}; 