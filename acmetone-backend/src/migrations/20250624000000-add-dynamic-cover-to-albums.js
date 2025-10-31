'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('albums', 'dynamicCoverPath', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: '动态封面文件路径'
    });

    await queryInterface.addColumn('albums', 'hasDynamicCover', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: '是否有动态封面'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('albums', 'dynamicCoverPath');
    await queryInterface.removeColumn('albums', 'hasDynamicCover');
  }
}; 