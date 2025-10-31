const { sequelize } = require('../config/db');
const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const bcryptNative = require('bcrypt');

// User 模型定义
const User = sequelize.define('User', {
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      len: [3, 30]
    }
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
    set(value) {
      // 直接在setter中处理密码哈希，避免使用hooks
      if (value) {
        console.log('密码setter被调用，原始密码:', value);
        // 使用同步方法，避免异步问题
        const hash = bcrypt.hashSync(value, 10);
        console.log('生成的哈希:', hash);
        this.setDataValue('password', hash);
      }
    }
  },
  role: {
    type: DataTypes.ENUM('user', 'admin'),
    defaultValue: 'user'
  },
  isEmailVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'isEmailVerified'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  lastLoginAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  lastLoginIp: {
    type: DataTypes.STRING(45),
    allowNull: true
  },
  lastLoginLocation: {
    type: DataTypes.STRING,
    allowNull: true
  },
  avatar: {
    type: DataTypes.STRING(1000),
    allowNull: true,
    defaultValue: null,
    get() {
      const rawValue = this.getDataValue('avatar');
      return rawValue || null;
    }
  },
  nickname: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: null
  },
  bio: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: null
  }
}, {
  tableName: 'users',
  timestamps: true,
  underscored: false,
  freezeTableName: true,
  hooks: {
    afterCreate: (user) => {
      console.log('用户创建后钩子触发，密码哈希:', user.password);
    }
  }
});

// 为了向后兼容，保留comparePassword实例方法
User.prototype.comparePassword = async function(candidatePassword) {
  console.log('comparePassword被调用');
  console.log('- 候选密码:', candidatePassword);
  console.log('- 存储的哈希:', this.password);
  const result = await bcrypt.compare(candidatePassword, this.password);
  console.log('- 比对结果:', result);
  return result;
};

module.exports = User; 