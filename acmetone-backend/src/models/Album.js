const { sequelize } = require('../config/db');
const { DataTypes } = require('sequelize');

// Album 模型定义
const Album = sequelize.define('Album', {
  title: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  coverImage: {
    type: DataTypes.STRING,
    allowNull: false
  },
  type: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isIn: [['专辑', '单曲', 'EP']]
    }
  },
  releaseDate: {
    type: DataTypes.DATE,
    allowNull: false
  },
  displayInfo: { //发行外显
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected'),
    defaultValue: 'pending'
  },
  comment: {
    type: DataTypes.STRING,
    allowNull: true
  },
  submittedById: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  authorizationFile: {
    type: DataTypes.STRING,
    allowNull: true
  },
  performer: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: '未知艺术家',
    comment: '专辑表演者，多个表演者用/分隔'
  },
  performerIds: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: '[]',
    comment: '关联的表演者ID，JSON格式'
  },
  // 添加动态封面相关字段
  dynamicCoverPath: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: '动态封面文件路径'
  },
  hasDynamicCover: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: '是否有动态封面'
  },
  isReleased: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  releasedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  // 添加节点位置字段
  nodesPositions: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '流程图中节点的位置信息（JSON格式）'
  },
  // 物料递交相关字段（只保留数据库中实际存在的字段）
  materialDelivered: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: '物料是否已递交'
  },
  // 合同相关字段
  contractEffectiveDate: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '合同生效日期，默认为专辑发行日期'
  },
  contractExpiryDate: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '合同到期日期，默认生效日期+5年'
  },
  contractStatus: {
    type: DataTypes.ENUM('unsigned', 'signed', 'expired'),
    defaultValue: 'unsigned',
    comment: '合同状态：未签署/已签署/已过期'
  },
  contractSignedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '合同签署时间'
  },
  signedAuthorizationFile: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: '管理员上传的已签署合同文件路径'
  }
}, {
  tableName: 'albums'
});

// 强制刷新模型缓存
Album.refreshAttributes();

// 虚拟属性：是否草稿状态
Album.prototype.isDraft = function() {
  return this.comment && this.comment.startsWith('DRAFT:');
};

// 虚拟属性：用于前端显示的状态
Album.prototype.getVirtualStatus = function() {
  return this.isDraft() ? 'draft' : this.status;
};

// 获取表演者ID数组
Album.prototype.getPerformerIds = function() {
  if (!this.performerIds) return [];
  try {
    return JSON.parse(this.performerIds);
  } catch (e) {
    return [];
  }
};

module.exports = Album; 