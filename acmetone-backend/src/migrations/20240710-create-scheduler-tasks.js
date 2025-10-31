'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 创建调度任务表
    await queryInterface.createTable('schedulertasks', {
      id: {
        type: Sequelize.STRING(50),
        primaryKey: true,
        allowNull: false
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      description: {
        type: Sequelize.STRING(500),
        allowNull: true
      },
      expression: {
        type: Sequelize.STRING(50),
        allowNull: false,
        comment: 'Cron表达式'
      },
      timezone: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: 'Asia/Shanghai'
      },
      status: {
        type: Sequelize.ENUM('active', 'paused'),
        allowNull: false,
        defaultValue: 'active'
      },
      lastRunAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      nextRunAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      runCount: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      logDirectory: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: '日志文件目录'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    // 创建任务执行日志表
    await queryInterface.createTable('taskexecutionlogs', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      taskId: {
        type: Sequelize.STRING(50),
        allowNull: false,
        references: {
          model: 'schedulertasks',
          key: 'id'
        }
      },
      startTime: {
        type: Sequelize.DATE,
        allowNull: false
      },
      endTime: {
        type: Sequelize.DATE,
        allowNull: true
      },
      status: {
        type: Sequelize.ENUM('running', 'completed', 'failed'),
        allowNull: false,
        defaultValue: 'running'
      },
      result: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      error: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      logFile: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: '日志文件路径'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    // 删除表时要注意顺序，先删除有外键引用的表
    await queryInterface.dropTable('taskexecutionlogs');
    await queryInterface.dropTable('schedulertasks');
  }
}; 