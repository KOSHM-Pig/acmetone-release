const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const config = require('./src/config/config');

/**
 * 数据库初始化脚本
 */
async function initDatabase() {
  let connection = null;
  
  try {
    console.log('🚀 开始初始化数据库...');
    
    // 创建数据库连接
    connection = await mysql.createConnection({
      host: config.database.host,
      port: config.database.port,
      user: config.database.user,
      password: config.database.password,
      database: config.database.database,
      charset: 'utf8mb4'
    });

    console.log('✅ 数据库连接成功');

    // 读取SQL文件
    const sqlFile = path.join(__dirname, 'database-schema.sql');
    const sqlContent = fs.readFileSync(sqlFile, 'utf8');

    // 分割SQL语句
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);

    console.log(`📄 找到 ${statements.length} 条SQL语句`);

    // 执行SQL语句
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement) {
        try {
          await connection.execute(statement);
          console.log(`✅ 执行语句 ${i + 1}/${statements.length}`);
        } catch (error) {
          console.error(`❌ 执行语句 ${i + 1} 失败:`, error.message);
          console.error('语句内容:', statement.substring(0, 100) + '...');
        }
      }
    }

    console.log('🎉 数据库初始化完成！');

    // 验证表是否创建成功
    const [tables] = await connection.execute('SHOW TABLES');
    console.log('📋 已创建的表:');
    tables.forEach(table => {
      console.log(`  - ${Object.values(table)[0]}`);
    });

  } catch (error) {
    console.error('❌ 数据库初始化失败:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 数据库连接已关闭');
    }
  }
}

// 运行初始化
if (require.main === module) {
  initDatabase();
}

module.exports = initDatabase;
