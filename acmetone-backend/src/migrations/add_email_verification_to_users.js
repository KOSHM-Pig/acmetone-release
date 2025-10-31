const { sequelize } = require('../config/db');

async function up() {
  try {
    console.log('开始迁移: 向 users 表添加 isEmailVerified 字段');
    
    // 检查字段是否已存在
    const [results] = await sequelize.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'users' AND COLUMN_NAME = 'isEmailVerified'
    `);
    
    if (results.length === 0) {
      // 字段不存在，添加它
      await sequelize.query(`
        ALTER TABLE users 
        ADD COLUMN isEmailVerified BOOLEAN DEFAULT false
      `);
      console.log('成功添加 isEmailVerified 字段到 users 表');
    } else {
      console.log('isEmailVerified 字段已存在，跳过');
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
    console.log('开始回滚: 从 users 表移除 isEmailVerified 字段');
    
    // 检查字段是否存在
    const [results] = await sequelize.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'users' AND COLUMN_NAME = 'isEmailVerified'
    `);
    
    if (results.length > 0) {
      // 字段存在，移除它
      await sequelize.query(`
        ALTER TABLE users 
        DROP COLUMN isEmailVerified
      `);
      console.log('成功从 users 表移除 isEmailVerified 字段');
    } else {
      console.log('isEmailVerified 字段不存在，跳过');
    }
    
    console.log('回滚完成');
    return true;
  } catch (error) {
    console.error('回滚失败:', error);
    throw error;
  }
}

module.exports = { up, down }; 