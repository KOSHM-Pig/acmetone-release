'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // 添加歌词文件字段
    await queryInterface.addColumn('songs', 'lyricsFile', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: '歌词文件路径'
    });
    
    // 添加翻译歌词文件字段
    await queryInterface.addColumn('songs', 'translationLyricsFile', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: '翻译歌词文件路径'
    });
  },

  async down (queryInterface, Sequelize) {
    // 删除歌词文件字段
    await queryInterface.removeColumn('songs', 'lyricsFile');
    
    // 删除翻译歌词文件字段
    await queryInterface.removeColumn('songs', 'translationLyricsFile');
  }
};
