'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('email_logs', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      to: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: '收件人邮箱'
      },
      subject: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: '邮件主题'
      },
      content: {
        type: Sequelize.TEXT,
        allowNull: false,
        comment: '邮件内容'
      },
      htmlContent: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'HTML格式的邮件内容'
      },
      type: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: '邮件类型，如验证码、密码重置、专辑审核等'
      },
      status: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'success',
        comment: '发送状态：success-成功，failed-失败'
      },
      messageId: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: '邮件ID'
      },
      error: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: '错误信息'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        comment: '创建时间'
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        comment: '更新时间'
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('email_logs');
  }
}; 