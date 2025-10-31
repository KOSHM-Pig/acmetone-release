const isDev = true;
const { Sequelize } = require('sequelize');


const sequelize = new Sequelize('acmetone', 'acmetone', isDev ? 'acmetone':'7JZL5tm8hRW7SKHR', {
  host: 'localhost',
  port: 3306,
  dialect: 'mysql',
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  dialectOptions: {
    charset: 'utf8mb4'
  },
  define: {
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
    timestamps: true,
    underscored: false,
    freezeTableName: true,
    hooks: {
      beforeDefine: (attributes, options) => {
        if (options.tableName) {
          options.tableName = options.tableName.toLowerCase();
        }
      }
    }
  },
  logging: console.log
});

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('MySQL 数据库连接成功');
    
    // 只在开发环境中使用 alter: true，生产环境应该使用 migrate
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: true });
      console.log('数据库模型已更新');
    } else {
      await sequelize.sync();
      console.log('数据库模型已同步');
    }
  } catch (error) {
    console.error('数据库连接失败:', error);
    process.exit(1);
  }
};

module.exports = {
  sequelize,
  connectDB,
  isDev
}; 