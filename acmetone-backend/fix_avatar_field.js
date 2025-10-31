/**
 * 修复Artist表中的avatar字段
 * 将avatar字段值迁移到avatarUrl字段
 */

const { migrateAvatarField } = require('./src/migrations/fix_avatar_field');

console.log('开始运行avatar字段修复脚本...');

migrateAvatarField()
  .then(() => {
    console.log('avatar字段迁移完成！');
    process.exit(0);
  })
  .catch(error => {
    console.error('avatar字段迁移失败:', error);
    process.exit(1);
  }); 