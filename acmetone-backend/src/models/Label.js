const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

// Label 模型定义
const Label = sequelize.define('Label', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true,
    field: 'user_id',
    comment: '关联的用户ID'
  },
  chineseName: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    field: 'chinese_name',
    comment: '厂牌中文名'
  },
  englishName: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    field: 'english_name',
    comment: '厂牌英文名'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '厂牌描述'
  },
  logoUrl: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'logo_url',
    comment: '厂牌Logo URL'
  },
  website: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: '官方网站'
  },
  contactEmail: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'contact_email',
    comment: '联系邮箱'
  },
  contactQqgroup: {
    type: DataTypes.STRING(20),
    allowNull: true,
    field: 'contact_qqgroup',
    comment: '联系QQ群'
  },
  genres: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '音乐风格'
  },
  beatArrayAccount: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'beatarray_account',
    comment: '节奏阵列账号'
  },
  beatArrayPassword: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'beatarray_password',
    comment: '节奏阵列密码（MD5加密）'
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'pending'),
    allowNull: false,
    defaultValue: 'pending',
    comment: '状态：激活/停用/待审核'
  },
  verified: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: '是否已验证'
  },
  verifiedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'verified_at',
    comment: '验证时间'
  },
  verifiedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'verified_by',
    comment: '验证者用户ID'
  },
  reviewComment: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'review_comment',
    comment: '审核备注'
  }
}, {
  tableName: 'labels',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// 实例方法：获取安全的厂牌信息（不包含敏感信息）
Label.prototype.getSafeInfo = function() {
  const labelData = this.toJSON();
  // 移除敏感信息
  delete labelData.beatArrayPassword;
  return labelData;
};

// 实例方法：检查是否可以编辑
Label.prototype.canEdit = function() {
  return this.status !== 'inactive';
};

// 静态方法：根据用户ID查找厂牌
Label.findByUserId = async function(userId) {
  return await this.findOne({
    where: { userId }
  });
};

// 静态方法：检查厂牌名称是否已存在
Label.checkNameExists = async function(chineseName, englishName, excludeId = null) {
  const { Op } = require('sequelize');
  const whereClause = {
    [Op.or]: [
      { chineseName },
      { englishName }
    ]
  };

  if (excludeId) {
    whereClause.id = { [Op.ne]: excludeId };
  }

  const existingLabel = await this.findOne({ where: whereClause });
  return existingLabel;
};

module.exports = Label;
