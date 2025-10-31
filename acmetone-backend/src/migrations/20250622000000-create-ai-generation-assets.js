'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('ai_generation_assets', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      prompt: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      negative_prompt: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      image_path: {
        type: Sequelize.STRING,
        allowNull: false
      },
      seed: {
        type: Sequelize.BIGINT,
        allowNull: true
      },
      num_inference_steps: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      guidance_scale: {
        type: Sequelize.FLOAT,
        allowNull: true
      },
      model_name: {
        type: Sequelize.STRING,
        allowNull: true
      },
      style: {
        type: Sequelize.STRING,
        allowNull: true
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('ai_generation_assets');
  }
}; 