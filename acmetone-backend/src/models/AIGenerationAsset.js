'use strict';
const { sequelize } = require('../config/db');
const { DataTypes } = require('sequelize');

const AIGenerationAsset = sequelize.define('AIGenerationAsset', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
    },
    prompt: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    negative_prompt: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    image_path: {
        type: DataTypes.STRING,
      allowNull: false,
      comment: 'Path to the saved image file relative to the uploads directory.',
    },
    model_name: {
        type: DataTypes.STRING,
        allowNull: true
    },
    seed: {
        type: DataTypes.BIGINT,
        allowNull: true
    },
    num_inference_steps: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    guidance_scale: {
        type: DataTypes.FLOAT,
        allowNull: true
  },
  }, {
  tableName: 'ai_generation_assets',
  timestamps: true,
    modelName: 'AIGenerationAsset',
  underscored: true,
  comment: 'Stores high-quality AI-generated images for training and reference.',
  });

module.exports = AIGenerationAsset; 