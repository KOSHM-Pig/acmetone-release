const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const beatarrayemailsetting = sequelize.define('beatarrayemailsetting', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userid: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  settingkey: {
    type: DataTypes.STRING,
    allowNull: false
  },
  settingvalue: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  settingtype: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'string'
  },
  description: {
    type: DataTypes.STRING,
    allowNull: true
  },
  lastmodifiedby: {
    type: DataTypes.INTEGER,
    allowNull: true
  }
}, {
  tableName: 'beatarrayemailsettings',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['userid', 'settingkey']
    }
  ],
  underscored: true,
  freezeTableName: true
});

// 设置与 User 模型的关联
beatarrayemailsetting.associate = (models) => {
  beatarrayemailsetting.belongsTo(models.User, { 
    foreignKey: 'userid',
    as: 'user'
  });
};

module.exports = beatarrayemailsetting; 