const path = require('path');
const fs = require('fs');

// 检查命令行参数
const migrationFile = process.argv[2];

if (!migrationFile) {
  console.error('请指定要执行的迁移文件名');
  console.log('用法: node migrate.js <migration-file-name>');
  process.exit(1);
}

async function runMigration() {
  try {
    const migrationPath = path.join(__dirname, migrationFile);
    
    // 检查文件是否存在
    if (!fs.existsSync(migrationPath)) {
      console.error(`迁移文件不存在: ${migrationPath}`);
      process.exit(1);
    }
    
    console.log(`正在执行迁移: ${migrationFile}`);
    
    // 导入迁移模块
    const migration = require(migrationPath);
    
    // 执行迁移
    await migration.up();
    
    console.log('迁移执行完成');
    process.exit(0);
  } catch (error) {
    console.error('迁移执行失败:', error);
    process.exit(1);
  }
}

runMigration(); 