const { sequelize } = require('../src/models');

async function addUpcField() {
  try {
    console.log('开始添加UPC字段到songs表...');
    
    // 检查字段是否已存在
    const [results] = await sequelize.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'acmetone_db' 
      AND TABLE_NAME = 'songs' 
      AND COLUMN_NAME = 'upc'
    `);
    
    if (results.length > 0) {
      console.log('UPC字段已存在，跳过迁移');
      return;
    }
    
    // 添加UPC字段
    await sequelize.query(`
      ALTER TABLE \`songs\` 
      ADD COLUMN \`upc\` varchar(20) DEFAULT NULL COMMENT 'UPC通用产品代码，用于标识专辑/发行' 
      AFTER \`isrc\`
    `);
    
    console.log('✅ UPC字段添加成功');
    
    // 验证字段
    const [description] = await sequelize.query('DESCRIBE `songs`');
    const upcField = description.find(field => field.Field === 'upc');
    
    if (upcField) {
      console.log('✅ 字段验证成功:', upcField);
    } else {
      console.log('❌ 字段验证失败');
    }
    
  } catch (error) {
    console.error('❌ 迁移失败:', error);
    throw error;
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  addUpcField()
    .then(() => {
      console.log('迁移完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('迁移失败:', error);
      process.exit(1);
    });
}

module.exports = { addUpcField };
