'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('user_shipments', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: '接收用户ID',
      },
      materialTemplateId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'material_templates',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: '关联的物料模板ID',
      },
      status: {
        type: Sequelize.ENUM('processing', 'shipped', 'delivered'),
        allowNull: false,
        defaultValue: 'processing',
        comment: '物流状态',
      },
      carrier: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: '快递公司名称',
      },
      trackingNumber: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: '快递运单号',
      },
      shippedAt: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: '发货时间',
      },
      adminNotes: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: '管理员备注',
      },
      createdBy: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: '创建该发货记录的用户ID',
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('user_shipments');
  },
}; 