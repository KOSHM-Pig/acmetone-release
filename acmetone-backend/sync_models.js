// 同步Sequelize模型和数据库表结构
const { sequelize } = require('./src/config/db');
const { Album } = require('./src/models');

async function syncModels() {
  try {
    console.log('开始同步Sequelize模型和数据库表结构...');
    
    // 同步模型（不会删除现有表或数据）
    await sequelize.sync({ alter: true });
    
    console.log('同步完成！');
    process.exit(0);
  } catch (error) {
    console.error('同步过程中出错:', error);
    process.exit(1);
  }
}

// 运行同步程序
syncModels(); 