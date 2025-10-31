const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 为 artists 表添加身份证号码字段
    await queryInterface.addColumn('artists', 'id_number', {
      type: DataTypes.STRING(18),
      allowNull: true,
      comment: '身份证号码'
    });

    // 为 artist_edit_requests 表添加原始身份证号码字段
    await queryInterface.addColumn('artist_edit_requests', 'original_id_number', {
      type: DataTypes.STRING(18),
      allowNull: true,
      comment: '原始身份证号码'
    });

    // 为 artist_edit_requests 表添加新的身份证号码字段
    await queryInterface.addColumn('artist_edit_requests', 'new_id_number', {
      type: DataTypes.STRING(18),
      allowNull: true,
      comment: '新的身份证号码'
    });
  },

  down: async (queryInterface, Sequelize) => {
    // 回滚：删除添加的字段
    await queryInterface.removeColumn('artists', 'id_number');
    await queryInterface.removeColumn('artist_edit_requests', 'original_id_number');
    await queryInterface.removeColumn('artist_edit_requests', 'new_id_number');
  }
}; 