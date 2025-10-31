const mysql = require('mysql2/promise');
const config = require('./config');
const logger = require('../utils/logger');

/**
 * 数据库连接池
 */
let pool = null;

/**
 * 创建数据库连接池
 */
const createPool = () => {
  try {
    pool = mysql.createPool({
      host: config.database.host,
      port: config.database.port,
      user: config.database.user,
      password: config.database.password,
      database: config.database.database,
      connectionLimit: config.database.connectionLimit,
      acquireTimeout: config.database.acquireTimeout,
      timeout: config.database.timeout,
      reconnect: config.database.reconnect,
      charset: 'utf8mb4',
      timezone: '+08:00'
    });

    logger.success('数据库连接池创建成功');
    return pool;
  } catch (error) {
    logger.error('数据库连接池创建失败', {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
};

/**
 * 获取数据库连接
 */
const getConnection = async () => {
  try {
    if (!pool) {
      createPool();
    }
    return await pool.getConnection();
  } catch (error) {
    logger.error('获取数据库连接失败', {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
};

/**
 * 执行查询
 */
const query = async (sql, params = []) => {
  let connection = null;
  try {
    connection = await getConnection();
    const [rows] = await connection.execute(sql, params);
    return rows;
  } catch (error) {
    logger.error('数据库查询失败', {
      sql: sql,
      params: params,
      error: error.message,
      stack: error.stack
    });
    throw error;
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

/**
 * 执行事务
 */
const transaction = async (callback) => {
  let connection = null;
  try {
    connection = await getConnection();
    await connection.beginTransaction();
    
    const result = await callback(connection);
    
    await connection.commit();
    return result;
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    logger.error('数据库事务失败', {
      error: error.message,
      stack: error.stack
    });
    throw error;
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

/**
 * 测试数据库连接
 */
const testConnection = async () => {
  try {
    const result = await query('SELECT 1 as test');
    logger.success('数据库连接测试成功', { result });
    return true;
  } catch (error) {
    logger.error('数据库连接测试失败', {
      error: error.message,
      stack: error.stack
    });
    return false;
  }
};

/**
 * 关闭数据库连接池
 */
const closePool = async () => {
  try {
    if (pool) {
      await pool.end();
      pool = null;
      logger.info('数据库连接池已关闭');
    }
  } catch (error) {
    logger.error('关闭数据库连接池失败', {
      error: error.message,
      stack: error.stack
    });
  }
};

// 初始化数据库连接池
createPool();

module.exports = {
  query,
  transaction,
  testConnection,
  closePool,
  getConnection
};
