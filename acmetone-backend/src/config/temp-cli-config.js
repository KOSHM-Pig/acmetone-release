const { isDev } = require('./db');

// sequelize-cli 需要一个包含环境配置的对象
module.exports = {
  development: {
    username: 'acmetone',
    password: isDev ? 'acmetone' : '7JZL5tm8hRW7SKHR',
    database: 'acmetone',
    host: 'localhost',
    port: 3306,
    dialect: 'mysql'
  },
  production: {
    username: 'acmetone',
    password: isDev ? 'acmetone' : '7JZL5tm8hRW7SKHR',
    database: 'acmetone',
    host: 'localhost',
    port: 3306,
    dialect: 'mysql'
  }
}; 