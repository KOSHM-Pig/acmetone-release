/**
 * 运行艺术家Wiki字段迁移
 * 此脚本用于向艺术家表添加Wiki相关字段
 */

const path = require('path');
const { Sequelize } = require('sequelize');
const { execSync } = require('child_process');

// 获取命令行参数
const args = process.argv.slice(2);
const force = args.includes('--force');

console.log('正在准备运行艺术家Wiki字段迁移...');

try {
  // 运行迁移脚本
  console.log('执行迁移...');
  
  // 确定迁移脚本路径
  const migrationPath = path.join(__dirname, 'src', 'migrations', '20250720-add-artist-wiki-fields.js');
  
  // 使用Sequelize CLI执行迁移
  const command = force 
    ? `npx sequelize-cli db:migrate --to ${migrationPath} --force` 
    : `npx sequelize-cli db:migrate --to ${migrationPath}`;
  
  execSync(command, { stdio: 'inherit' });
  
  console.log('✅ 艺术家Wiki字段迁移完成!');
  console.log('现在可以使用艺术家Wiki功能了。');
  console.log('API路径: /api/artist-wiki');
} catch (error) {
  console.error('❌ 迁移失败:', error.message);
  console.error('请确保数据库连接正常，并且有足够的权限执行表结构修改。');
  
  // 如果有详细的错误信息，显示出来
  if (error.stack) {
    console.error('错误详情:', error.stack);
  }
  
  process.exit(1);
} 