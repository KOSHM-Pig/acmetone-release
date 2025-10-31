const { Sequelize } = require('sequelize');
const sequelize = require('../../config/database');

async function up() {
  try {
    console.log('开始迁移: 向 artists 表添加 id_number 字段');
    
    // 检查字段是否已存在
    const [results] = await sequelize.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'Artists' AND COLUMN_NAME = 'id_number'
    `);
    
    if (results.length === 0) {
      // 字段不存在，添加它
      await sequelize.query(`
        ALTER TABLE Artists 
        ADD COLUMN id_number VARCHAR(18) NULL
      `);
      console.log('成功添加 id_number 字段到 artists 表');
    } else {
      console.log('id_number 字段已存在，跳过');
    }
    
    console.log('迁移完成');
    return true;
  } catch (error) {
    console.error('迁移失败:', error);
    throw error;
  }
}

async function down() {
  try {
    console.log('开始回滚: 从 artists 表移除 id_number 字段');
    
    // 检查字段是否存在
    const [results] = await sequelize.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'Artists' AND COLUMN_NAME = 'id_number'
    `);
    
    if (results.length > 0) {
      // 字段存在，移除它
      await sequelize.query(`
        ALTER TABLE Artists 
        DROP COLUMN id_number
      `);
      console.log('成功从 artists 表移除 id_number 字段');
    } else {
      console.log('id_number 字段不存在，跳过');
    }
    
    console.log('回滚完成');
    return true;
  } catch (error) {
    console.error('回滚失败:', error);
    throw error;
  }
}

module.exports = { up, down }; 