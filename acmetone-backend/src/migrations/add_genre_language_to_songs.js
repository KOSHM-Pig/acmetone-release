'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('songs', 'genre', {
      type: Sequelize.STRING,
      allowNull: true // 设置为 true 以避免现有记录报错
    });

    await queryInterface.addColumn('songs', 'language', {
      type: Sequelize.STRING,
      allowNull: true // 设置为 true 以避免现有记录报错
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('songs', 'genre');
    await queryInterface.removeColumn('songs', 'language');
  }
}; 