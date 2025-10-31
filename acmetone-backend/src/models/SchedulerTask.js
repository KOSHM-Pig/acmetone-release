'use strict';
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class SchedulerTask extends Model {
    static associate(models) {
      // 定义与其他模型的关联
      SchedulerTask.hasMany(models.TaskExecutionLog, {
        foreignKey: 'taskId',
        as: 'executionLogs'
      });
    }
  }
  
  SchedulerTask.init({
    id: {
      type: DataTypes.STRING(50),
      primaryKey: true,
      allowNull: false
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    description: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    expression: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: 'Cron表达式'
    },
    timezone: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'Asia/Shanghai'
    },
    status: {
      type: DataTypes.ENUM('active', 'paused'),
      allowNull: false,
      defaultValue: 'active'
    },
    lastRunAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    nextRunAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    runCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    logDirectory: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: '日志文件目录'
    }
  }, {
    sequelize,
    modelName: 'SchedulerTask',
    tableName: 'schedulertasks'  // 修改为小写，与数据库表名一致
  });
  
  return SchedulerTask;
}; 