'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('album_links', 'netease', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: '网易云音乐链接'
    });
    
    await queryInterface.addColumn('album_links', 'qq', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'QQ音乐链接'
    });
    
    await queryInterface.addColumn('album_links', 'kugou', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: '酷狗音乐链接'
    });
    
    await queryInterface.addColumn('album_links', 'kuwo', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: '酷我音乐链接'
    });
    
    await queryInterface.addColumn('album_links', 'qishui', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: '汽水音乐链接'
    });
    
    await queryInterface.addColumn('album_links', 'spotify', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'Spotify链接'
    });
    
    await queryInterface.addColumn('album_links', 'youtube', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'YouTube链接'
    });
    
    await queryInterface.addColumn('album_links', 'appleMusic', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'Apple Music链接'
    });
    
    await queryInterface.addColumn('album_links', 'soundCloud', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'SoundCloud链接'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('album_links', 'netease');
    await queryInterface.removeColumn('album_links', 'qq');
    await queryInterface.removeColumn('album_links', 'kugou');
    await queryInterface.removeColumn('album_links', 'kuwo');
    await queryInterface.removeColumn('album_links', 'qishui');
    await queryInterface.removeColumn('album_links', 'spotify');
    await queryInterface.removeColumn('album_links', 'youtube');
    await queryInterface.removeColumn('album_links', 'appleMusic');
    await queryInterface.removeColumn('album_links', 'soundCloud');
  }
}; 