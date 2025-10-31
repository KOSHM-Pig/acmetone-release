'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 添加身份证号码字段到 artists 表
    await queryInterface.addColumn('artists', 'id_number', {
      type: Sequelize.STRING(18),
      allowNull: true,
      comment: '身份证号码'
    });

    // 添加新身份证号码字段到 artisteditrequests 表
    await queryInterface.addColumn('artisteditrequests', 'new_id_number', {
      type: Sequelize.STRING(18),
      allowNull: true,
      comment: '新的身份证号码'
    });
  },

  down: async (queryInterface, Sequelize) => {
    // 回滚操作：删除字段
    await queryInterface.removeColumn('artists', 'id_number');
    await queryInterface.removeColumn('artisteditrequests', 'new_id_number');
  }
}; 