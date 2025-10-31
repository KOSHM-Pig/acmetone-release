'use strict';
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class TaskExecutionLog extends Model {
    static associate(models) {
      // 定义与其他模型的关联
      TaskExecutionLog.belongsTo(models.SchedulerTask, {
        foreignKey: 'taskId',
        as: 'task'
      });
    }
  }
  
  TaskExecutionLog.init({
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false
    },
    taskId: {
      type: DataTypes.STRING(50),
      allowNull: false,
      references: {
        model: 'schedulertasks',  // 修改为小写，与数据库表名一致
        key: 'id'
      }
    },
    startTime: {
      type: DataTypes.DATE,
      allowNull: false
    },
    endTime: {
      type: DataTypes.DATE,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('running', 'completed', 'failed'),
      allowNull: false,
      defaultValue: 'running'
    },
    result: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    error: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    logFile: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: '日志文件路径'
    }
  }, {
    sequelize,
    modelName: 'TaskExecutionLog',
    tableName: 'taskexecutionlogs'  // 修改为小写，与数据库表名一致
  });
  
  return TaskExecutionLog;
}; 