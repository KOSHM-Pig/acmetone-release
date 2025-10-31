const { sequelize } = require('../config/db');
const { DataTypes } = require('sequelize');

async function up() {
  try {
    await sequelize.getQueryInterface().addColumn('albums', 'performer', {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: '未知艺术家',
      comment: '专辑表演者，多个表演者用/分隔'
    });
    console.log('成功添加 performer 字段到 albums 表');
  } catch (error) {
    console.error('添加 performer 字段失败:', error);
    throw error;
  }
}

async function down() {
  try {
    await sequelize.getQueryInterface().removeColumn('albums', 'performer');
    console.log('成功移除 performer 字段');
  } catch (error) {
    console.error('移除 performer 字段失败:', error);
    throw error;
  }
}

module.exports = {
  up,
  down
}; 