// 同步数据库表结构和Sequelize模型
const { sequelize } = require('./src/config/db');
const { Album } = require('./src/models');

async function syncDbFields() {
  try {
    console.log('开始同步数据库表结构...');
    
    // 获取数据库表结构
    const [results] = await sequelize.query('DESCRIBE albums');
    console.log('当前数据库表结构:');
    results.forEach(field => {
      console.log(`${field.Field}: ${field.Type} ${field.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${field.Default ? `DEFAULT '${field.Default}'` : ''}`);
    });
    
    // 检查表结构中是否有performer和performerIds字段
    const hasPerformer = results.some(field => field.Field === 'performer');
    const hasPerformerIds = results.some(field => field.Field === 'performerIds');
    
    console.log(`表中是否有performer字段: ${hasPerformer}`);
    console.log(`表中是否有performerIds字段: ${hasPerformerIds}`);
    
    // 输出Sequelize模型定义
    console.log('\nSequelize模型定义:');
    Object.keys(Album.rawAttributes).forEach(attr => {
      const attribute = Album.rawAttributes[attr];
      console.log(`${attr}: ${attribute.type.key} ${attribute.allowNull ? 'NULL' : 'NOT NULL'} ${attribute.defaultValue !== undefined ? `DEFAULT '${attribute.defaultValue}'` : ''}`);
    });
    
    console.log('\n检查完成！');
    process.exit(0);
  } catch (error) {
    console.error('同步过程中出错:', error);
    process.exit(1);
  }
}

// 运行同步程序
syncDbFields(); 