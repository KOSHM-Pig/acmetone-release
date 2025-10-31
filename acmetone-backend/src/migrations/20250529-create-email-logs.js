'use strict';
const { sequelize } = require('../config/db');

async function up() {
  try {
    console.log('开始创建email_logs表');
    
    // 检查表是否已存在
    const [tables] = await sequelize.query(`
      SHOW TABLES LIKE 'email_logs'
    `);
    
    if (tables.length > 0) {
      console.log('email_logs表已存在，跳过创建');
      return;
    }
    
    // 创建表
    await sequelize.query(`
      CREATE TABLE email_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        \`to\` VARCHAR(255) NOT NULL COMMENT '收件人邮箱',
        subject VARCHAR(255) NOT NULL COMMENT '邮件主题',
        content TEXT NOT NULL COMMENT '邮件内容',
        htmlContent TEXT COMMENT 'HTML格式的邮件内容',
        type VARCHAR(50) COMMENT '邮件类型，如验证码、密码重置、专辑审核等',
        status VARCHAR(20) NOT NULL DEFAULT 'success' COMMENT '发送状态：success-成功，failed-失败',
        messageId VARCHAR(255) COMMENT '邮件ID',
        error TEXT COMMENT '错误信息',
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    
    console.log('email_logs表创建成功');
    return true;
  } catch (error) {
    console.error('创建email_logs表失败:', error);
    throw error;
  }
}

async function down() {
  try {
    console.log('开始删除email_logs表');
    
    await sequelize.query(`
      DROP TABLE IF EXISTS email_logs
    `);
    
    console.log('email_logs表删除成功');
    return true;
  } catch (error) {
    console.error('删除email_logs表失败:', error);
    throw error;
  }
}

module.exports = { up, down }; 