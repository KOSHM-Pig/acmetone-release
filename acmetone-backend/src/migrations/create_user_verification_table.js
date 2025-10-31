const { sequelize } = require('../config/db');

async function up() {
  try {
    console.log('开始迁移: 创建 userverifications 表');
    
    // 检查表是否已存在
    const [tables] = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'userverifications'
    `);
    
    if (tables.length === 0) {
      // 表不存在，创建它
      await sequelize.query(`
        CREATE TABLE userverifications (
          id SERIAL PRIMARY KEY,
          "realName" VARCHAR(255) NOT NULL,
          "idNumber" VARCHAR(18) NOT NULL,
          "bankAccount" VARCHAR(255) NOT NULL,
          "bankName" VARCHAR(255) NOT NULL,
          status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
          comment VARCHAR(255),
          "userId" INTEGER NOT NULL UNIQUE,
          "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL,
          "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL,
          FOREIGN KEY ("userId") REFERENCES users (id) ON DELETE CASCADE
        )
      `);
      console.log('成功创建 userverifications 表');
    } else {
      console.log('userverifications 表已存在，跳过');
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
    console.log('开始回滚: 删除 userverifications 表');
    
    // 检查表是否存在
    const [tables] = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'userverifications'
    `);
    
    if (tables.length > 0) {
      // 表存在，删除它
      await sequelize.query(`DROP TABLE userverifications`);
      console.log('成功删除 userverifications 表');
    } else {
      console.log('userverifications 表不存在，跳过');
    }
    
    console.log('回滚完成');
    return true;
  } catch (error) {
    console.error('回滚失败:', error);
    throw error;
  }
}

module.exports = { up, down }; 