'use strict';

const path = require('path');
const { Sequelize } = require('sequelize');
const { Umzug, SequelizeStorage } = require('umzug');
const { sequelize } = require('../config/db');

// 初始化 Umzug
const umzug = new Umzug({
  migrations: {
    // 指定迁移文件路径
    path: path.join(__dirname, '../migrations'),
    // 指定迁移文件的模式
    pattern: /\.js$/,
    // 参数传递给迁移文件
    params: [sequelize.getQueryInterface(), Sequelize]
  },
  // 使用 Sequelize 存储迁移记录
  storage: new SequelizeStorage({ sequelize }),
  // 日志
  logger: console
});

// 运行迁移
async function runMigrations() {
  try {
    console.log('开始运行数据库迁移...');
    const migrations = await umzug.up();
    console.log(`成功运行 ${migrations.length} 个迁移:`);
    migrations.forEach(migration => {
      console.log(`- ${migration.name}`);
    });
    console.log('数据库迁移完成');
    process.exit(0);
  } catch (error) {
    console.error('数据库迁移失败:', error);
    process.exit(1);
  }
}

// 回滚最后一次迁移
async function rollbackLastMigration() {
  try {
    console.log('开始回滚最后一次数据库迁移...');
    const migration = await umzug.down();
    if (migration.length > 0) {
      console.log(`成功回滚迁移: ${migration[0].name}`);
    } else {
      console.log('没有可回滚的迁移');
    }
    process.exit(0);
  } catch (error) {
    console.error('迁移回滚失败:', error);
    process.exit(1);
  }
}

// 检查命令行参数
const args = process.argv.slice(2);
if (args.includes('--rollback')) {
  rollbackLastMigration();
} else {
  runMigrations();
} 