const { sequelize } = require('../config/db');

async function up() {
  try {
    console.log('开始迁移: 创建 verificationtokens 表');
    
    // 检查表是否已存在
    const [tables] = await sequelize.query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME = 'verificationtokens'
    `);
    
    if (tables.length === 0) {
      // 表不存在，创建它
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS verificationtokens (
          id INTEGER PRIMARY KEY AUTO_INCREMENT,
          userId INTEGER NOT NULL,
          token VARCHAR(255) NOT NULL,
          type ENUM('email_verification', 'password_reset') NOT NULL,
          expiresAt DATETIME NOT NULL,
          usedAt DATETIME,
          createdAt DATETIME NOT NULL,
          updatedAt DATETIME NOT NULL,
          FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
        )
      `);
      console.log('成功创建 verificationtokens 表');
    } else {
      console.log('verificationtokens 表已存在，跳过');
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
    console.log('开始回滚: 删除 verificationtokens 表');
    
    // 检查表是否存在
    const [tables] = await sequelize.query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME = 'verificationtokens'
    `);
    
    if (tables.length > 0) {
      // 表存在，删除它
      await sequelize.query(`
        DROP TABLE verificationtokens
      `);
      console.log('成功删除 verificationtokens 表');
    } else {
      console.log('verificationtokens 表不存在，跳过');
    }
    
    console.log('回滚完成');
    return true;
  } catch (error) {
    console.error('回滚失败:', error);
    throw error;
  }
}

module.exports = { up, down }; 