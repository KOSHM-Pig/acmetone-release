const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const readFileAsync = promisify(fs.readFile);
const { sequelize } = require('../models');

/**
 * 执行指定的SQL迁移脚本
 * @param {string} scriptName 脚本名称，不含路径
 */
async function runMigration(scriptName) {
  try {
    console.log(`开始执行迁移脚本: ${scriptName}`);
    
    // 读取SQL文件内容
    const scriptPath = path.join(__dirname, scriptName);
    const sqlContent = await readFileAsync(scriptPath, 'utf8');
    
    // 分割SQL语句
    const sqlStatements = sqlContent.split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);
    
    console.log(`找到 ${sqlStatements.length} 条SQL语句`);
    
    // 创建事务
    const transaction = await sequelize.transaction();
    
    try {
      // 逐条执行SQL语句
      for (let i = 0; i < sqlStatements.length; i++) {
        const sql = sqlStatements[i];
        console.log(`执行SQL语句 ${i + 1}/${sqlStatements.length}:`);
        console.log(sql);
        
        try {
          await sequelize.query(sql, { transaction });
          console.log(`SQL语句 ${i + 1} 执行成功`);
        } catch (sqlError) {
          // 如果是"表已存在"或"字段已存在"错误，则忽略
          if (sqlError.message.includes('already exists')) {
            console.log(`SQL语句 ${i + 1} 执行跳过: ${sqlError.message}`);
          } else {
            throw sqlError;
          }
        }
      }
      
      // 提交事务
      await transaction.commit();
      console.log(`迁移脚本 ${scriptName} 执行成功`);
    } catch (error) {
      // 回滚事务
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error(`执行迁移脚本 ${scriptName} 失败:`, error);
    throw error;
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  const scriptName = process.argv[2];
  
  if (!scriptName) {
    console.error('请提供迁移脚本名称作为参数');
    process.exit(1);
  }
  
  runMigration(scriptName)
    .then(() => {
      console.log('迁移完成');
      process.exit(0);
    })
    .catch(error => {
      console.error('迁移失败:', error);
      process.exit(1);
    });
} else {
  // 作为模块导出
  module.exports = { runMigration };
} 