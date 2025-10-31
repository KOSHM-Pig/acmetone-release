/**
 * 数据库迁移：为albums表添加合同相关字段
 * 创建时间: 2025-08-27
 * 描述: 添加合同生效日期、到期日期、状态、签署时间和已签署合同文件路径字段
 */

'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // 添加合同相关字段
      await queryInterface.addColumn('albums', 'contractEffectiveDate', {
        type: Sequelize.DATE,
        allowNull: true,
        comment: '合同生效日期，默认为专辑发行日期'
      }, { transaction });

      await queryInterface.addColumn('albums', 'contractExpiryDate', {
        type: Sequelize.DATE,
        allowNull: true,
        comment: '合同到期日期，默认为生效日期+5年'
      }, { transaction });

      await queryInterface.addColumn('albums', 'contractStatus', {
        type: Sequelize.ENUM('unsigned', 'signed', 'expired'),
        allowNull: false,
        defaultValue: 'unsigned',
        comment: '合同状态：unsigned-未签署，signed-已签署，expired-已过期'
      }, { transaction });

      await queryInterface.addColumn('albums', 'contractSignedAt', {
        type: Sequelize.DATE,
        allowNull: true,
        comment: '合同签署时间戳'
      }, { transaction });

      await queryInterface.addColumn('albums', 'signedAuthorizationFile', {
        type: Sequelize.STRING(500),
        allowNull: true,
        comment: '管理员上传的已签署合同文件路径'
      }, { transaction });

      await transaction.commit();
      console.log('✅ 合同字段添加成功');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ 合同字段添加失败:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // 删除添加的字段
      await queryInterface.removeColumn('albums', 'signedAuthorizationFile', { transaction });
      await queryInterface.removeColumn('albums', 'contractSignedAt', { transaction });
      await queryInterface.removeColumn('albums', 'contractStatus', { transaction });
      await queryInterface.removeColumn('albums', 'contractExpiryDate', { transaction });
      await queryInterface.removeColumn('albums', 'contractEffectiveDate', { transaction });

      await transaction.commit();
      console.log('✅ 合同字段回滚成功');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ 合同字段回滚失败:', error);
      throw error;
    }
  }
};
