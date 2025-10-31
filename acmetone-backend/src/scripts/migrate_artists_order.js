'use strict';

// 这个脚本用于执行歌手排序相关的迁移
// 1. 添加songs表的artists字段
// 2. 将songartists表中的数据迁移到songs.artists字段

const path = require('path');
const { execSync } = require('child_process');

// 确保在正确的目录下执行
process.chdir(path.join(__dirname, '../..'));

console.log('开始执行歌手排序迁移...');

try {
  // 执行添加字段的迁移
  console.log('\n1. 添加songs表的artists字段...');
  execSync('npx sequelize-cli db:migrate --name add_artists_json_to_songs.js', { 
    stdio: 'inherit' 
  });
  
  console.log('\n添加字段成功!');
  
  // 执行数据迁移
  console.log('\n2. 将现有数据从songartists表迁移到songs.artists字段...');
  
  // 直接运行迁移脚本
  const migrationScript = require('../migrations/migrate_songartists_to_json');
  
  // 执行迁移
  migrationScript.up()
    .then(() => {
      console.log('\n数据迁移成功!');
      console.log('\n迁移完成。现在系统支持歌手顺序功能，并保持向后兼容。');
    })
    .catch((error) => {
      console.error('\n数据迁移失败:', error);
      console.error('\n请手动检查问题并重新运行迁移脚本。');
      process.exit(1);
    });
} catch (error) {
  console.error('\n迁移失败:', error);
  console.error('\n请修复错误后重新运行迁移脚本。');
  process.exit(1);
} 