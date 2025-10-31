const { sequelize } = require('../config/db');
const { DataTypes } = require('sequelize');

const PromotionRequest = sequelize.define('PromotionRequest', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true
  },
  albumId: {
    type: DataTypes.BIGINT,
    allowNull: false,
    references: {
      model: 'albums',
      key: 'id'
    }
  },
  userId: {
    type: DataTypes.BIGINT,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'completed'),
    allowNull: false,
    defaultValue: 'pending',
    comment: '待审核,极音记审核通过,已收到推广资源'
  },
  highlights: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  existingPromotion: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  promotionResources: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  rejectionReason: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'promotion_requests',
  timestamps: true
});

// 定义关联关系
const setupAssociations = (models) => {
  const { Album, User } = models;
  
  PromotionRequest.belongsTo(Album, {
    foreignKey: 'albumId',
    onDelete: 'CASCADE'
  });
  
  PromotionRequest.belongsTo(User, {
    foreignKey: 'userId',
    onDelete: 'CASCADE'
  });
};

// 在模型导入完成后执行关联设置
if (sequelize.models && sequelize.models.Album && sequelize.models.User) {
  setupAssociations(sequelize.models);
}

module.exports = PromotionRequest; 