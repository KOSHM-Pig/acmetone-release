'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('albums', 'materialDelivered', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: '物料是否已递交'
    });

    await queryInterface.addColumn('albums', 'materialDeliveredAt', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: '物料递交时间'
    });

    await queryInterface.addColumn('albums', 'materialDeliveryComment', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: '物料递交备注'
    });

    await queryInterface.addColumn('albums', 'materialDeliveredBy', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      comment: '物料递交操作人ID'
    });

    // 添加索引以提高查询性能
    await queryInterface.addIndex('albums', ['materialDelivered']);
    await queryInterface.addIndex('albums', ['materialDeliveredAt']);
    await queryInterface.addIndex('albums', ['materialDeliveredBy']);
  },

  down: async (queryInterface, Sequelize) => {
    // 删除索引
    await queryInterface.removeIndex('albums', ['materialDeliveredBy']);
    await queryInterface.removeIndex('albums', ['materialDeliveredAt']);
    await queryInterface.removeIndex('albums', ['materialDelivered']);

    // 删除字段
    await queryInterface.removeColumn('albums', 'materialDeliveredBy');
    await queryInterface.removeColumn('albums', 'materialDeliveryComment');
    await queryInterface.removeColumn('albums', 'materialDeliveredAt');
    await queryInterface.removeColumn('albums', 'materialDelivered');
  }
};
