const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const CoverTemplate = sequelize.define('CoverTemplate', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: {
        msg: '模板名称不能为空'
      }
    }
  },
  definition: {
    type: DataTypes.JSON,
    allowNull: false,
  },
}, {
  tableName: 'covertemplates',
  timestamps: true,
});

module.exports = CoverTemplate; 