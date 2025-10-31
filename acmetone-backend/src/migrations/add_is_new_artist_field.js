'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('artists', 'isNewArtist', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false,
      comment: '标记是否为用户创建的全新歌手（无平台链接）'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('artists', 'isNewArtist');
  }
}; 