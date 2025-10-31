const { sequelize } = require('./config/db');
const path = require('path');
const { Umzug, SequelizeStorage } = require('umzug');

const umzug = new Umzug({
  migrations: { 
    glob: 'src/migrations/*.js',
    resolve: ({ name, path, context }) => {
      const migration = require(path);
      return {
        name,
        up: async () => migration.up(context.queryInterface, context.sequelize),
        down: async () => migration.down(context.queryInterface, context.sequelize),
      };
    },
  },
  context: sequelize.getQueryInterface(),
  storage: new SequelizeStorage({ sequelize }),
  logger: console,
});

// 运行所有等待中的迁移
(async () => {
  try {
    console.log('开始运行数据库迁移...');
    const migrations = await umzug.up();
    console.log('迁移成功完成:', migrations.map(m => m.name));
    process.exit(0);
  } catch (error) {
    console.error('迁移失败:', error);
    process.exit(1);
  }
})(); 