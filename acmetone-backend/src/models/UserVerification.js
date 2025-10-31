const { sequelize } = require('../config/db');
const { DataTypes } = require('sequelize');

// UserVerification模型 - 用户实名认证信息
const UserVerification = sequelize.define('UserVerification', {
  // 真实姓名
  realName: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: '用户真实姓名'
  },
  // 身份证号码
  idNumber: {
    type: DataTypes.STRING(500),
    allowNull: false,
    comment: '身份证号码（加密存储）'
  },
  // 银行账号
  bankAccount: {
    type: DataTypes.STRING(500),
    allowNull: false,
    comment: '银行账号（加密存储）'
  },
  // 开户银行
  bankName: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: '开户银行名称'
  },
  // 审核状态
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected'),
    defaultValue: 'pending',
    comment: '审核状态：待审核、已通过、已拒绝'
  },
  // 审核意见（拒绝原因）
  comment: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: '审核意见，拒绝时必填'
  },
  // 用户ID，外键关联到User表
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true,
    comment: '关联的用户ID'
  }
}, {
  tableName: 'userverifications'
});

module.exports = UserVerification; 