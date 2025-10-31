// 同步Labels表结构
const { sequelize, Label } = require('./src/models');

async function syncLabelsTable() {
  try {
    console.log('开始同步Labels表结构...');
    
    // 连接数据库
    await sequelize.authenticate();
    console.log('数据库连接成功');
    
    // 检查表是否存在
    const [results] = await sequelize.query('SHOW TABLES LIKE "labels"');
    if (results.length === 0) {
      console.log('labels表不存在，正在创建...');
      await Label.sync({ force: false });
      console.log('labels表创建成功');
    } else {
      console.log('labels表已存在，正在更新结构...');
      await Label.sync({ alter: true });
      console.log('labels表结构更新成功');
    }
    
    // 显示表结构
    const [fields] = await sequelize.query('DESCRIBE labels');
    console.log('\n当前表结构:');
    fields.forEach(field => {
      console.log(`- ${field.Field}: ${field.Type} ${field.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${field.Default ? `DEFAULT '${field.Default}'` : ''}`);
    });
    
    console.log('\n同步完成！');
    process.exit(0);
  } catch (error) {
    console.error('同步过程中出错:', error);
    process.exit(1);
  }
}

// 运行同步程序
syncLabelsTable();
