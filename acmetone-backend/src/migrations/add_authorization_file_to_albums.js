const { sequelize } = require('../config/db');
const { DataTypes } = require('sequelize');

async function up() {
  try {
    // 添加 authorizationFile 字段到 albums 表
    await sequelize.getQueryInterface().addColumn('albums', 'authorizationFile', {
      type: DataTypes.STRING,
      allowNull: true
    });
    
    console.log('成功添加 authorizationFile 字段到 albums 表');
  } catch (error) {
    console.error('迁移失败:', error);
    throw error;
  }
}

async function down() {
  try {
    // 删除 authorizationFile 字段
    await sequelize.getQueryInterface().removeColumn('albums', 'authorizationFile');
    
    console.log('成功删除 authorizationFile 字段');
  } catch (error) {
    console.error('回滚失败:', error);
    throw error;
  }
}

module.exports = {
  up,
  down
}; 