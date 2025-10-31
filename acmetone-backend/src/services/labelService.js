const Label = require('../models/Label');
const User = require('../models/User');
const CryptoJS = require('crypto-js');
const { Op } = require('sequelize');

/**
 * MD5加密函数
 * @param {string} text - 需要加密的文本
 * @returns {string} - 加密后的字符串
 */
const md5Encrypt = (text) => {
  return CryptoJS.MD5(text).toString();
};

/**
 * 厂牌服务类
 */
class LabelService {
  
  /**
   * 创建厂牌申请
   * @param {Object} labelData - 厂牌数据
   * @param {number} userId - 用户ID
   * @returns {Object} 创建结果
   */
  async createLabel(labelData, userId) {
    try {
      // 检查用户是否已有厂牌
      const existingLabel = await Label.findByUserId(userId);
      if (existingLabel) {
        throw new Error('用户已有厂牌，无法重复创建');
      }

      // 检查厂牌名称是否已存在
      const nameExists = await Label.checkNameExists(
        labelData.chineseName, 
        labelData.englishName
      );
      if (nameExists) {
        throw new Error('厂牌名称已存在');
      }

      // 处理节奏阵列密码加密
      const processedData = { ...labelData };
      if (processedData.rhythmArrayPassword) {
        processedData.rhythmArrayPassword = md5Encrypt(processedData.rhythmArrayPassword);
      }

      // 创建厂牌
      const label = await Label.create({
        ...processedData,
        userId,
        status: 'pending',
        verified: false
      });

      return {
        success: true,
        message: '厂牌申请提交成功，等待管理员审核',
        data: label.getSafeInfo()
      };
    } catch (error) {
      console.error('创建厂牌失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户的厂牌信息
   * @param {number} userId - 用户ID
   * @returns {Object} 厂牌信息
   */
  async getUserLabel(userId) {
    try {
      const label = await Label.findOne({
        where: { userId },
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'username', 'email']
          },
          {
            model: User,
            as: 'verifier',
            attributes: ['id', 'username'],
            required: false
          }
        ]
      });

      if (!label) {
        return {
          success: false,
          message: '未找到厂牌信息',
          data: null
        };
      }

      return {
        success: true,
        data: label.getSafeInfo()
      };
    } catch (error) {
      console.error('获取厂牌信息失败:', error);
      throw error;
    }
  }

  /**
   * 更新厂牌信息
   * @param {number} labelId - 厂牌ID
   * @param {Object} updateData - 更新数据
   * @param {number} userId - 用户ID
   * @returns {Object} 更新结果
   */
  async updateLabel(labelId, updateData, userId) {
    try {
      const label = await Label.findOne({
        where: { id: labelId, userId }
      });

      if (!label) {
        throw new Error('厂牌不存在或无权限编辑');
      }

      if (!label.canEdit()) {
        throw new Error('厂牌状态不允许编辑');
      }

      // 检查名称冲突（排除自己）
      if (updateData.chineseName || updateData.englishName) {
        const nameExists = await Label.checkNameExists(
          updateData.chineseName || label.chineseName,
          updateData.englishName || label.englishName,
          labelId
        );
        if (nameExists) {
          throw new Error('厂牌名称已存在');
        }
      }

      // 处理密码加密
      if (updateData.rhythmArrayPassword) {
        updateData.rhythmArrayPassword = md5Encrypt(updateData.rhythmArrayPassword);
      }

      // 更新厂牌
      await label.update(updateData);

      return {
        success: true,
        message: '厂牌信息更新成功',
        data: label.getSafeInfo()
      };
    } catch (error) {
      console.error('更新厂牌失败:', error);
      throw error;
    }
  }

  /**
   * 管理员获取所有厂牌（分页）
   * @param {Object} options - 查询选项
   * @returns {Object} 厂牌列表
   */
  async getAllLabels(options = {}) {
    try {
      const {
        page = 1,
        pageSize = 20,
        status = null,
        search = '',
        sortBy = 'created_at',
        sortOrder = 'DESC'
      } = options;

      const offset = (page - 1) * pageSize;
      
      // 构建查询条件
      const whereClause = {};
      
      if (status) {
        whereClause.status = status;
      }
      
      if (search) {
        whereClause[Op.or] = [
          { chineseName: { [Op.like]: `%${search}%` } },
          { englishName: { [Op.like]: `%${search}%` } }
        ];
      }

      const { count, rows } = await Label.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'username', 'email']
          },
          {
            model: User,
            as: 'verifier',
            attributes: ['id', 'username'],
            required: false
          }
        ],
        order: [[sortBy, sortOrder]],
        limit: pageSize,
        offset: offset
      });

      return {
        success: true,
        data: {
          labels: rows.map(label => label.getSafeInfo()),
          total: count,
          page,
          pageSize,
          totalPages: Math.ceil(count / pageSize)
        }
      };
    } catch (error) {
      console.error('获取厂牌列表失败:', error);
      throw error;
    }
  }

  /**
   * 管理员审核厂牌
   * @param {number} labelId - 厂牌ID
   * @param {string} status - 新状态
   * @param {number} adminId - 管理员ID
   * @returns {Object} 审核结果
   */
  async reviewLabel(labelId, status, adminId) {
    try {
      const label = await Label.findByPk(labelId);
      if (!label) {
        throw new Error('厂牌不存在');
      }

      const updateData = { status };
      
      if (status === 'active') {
        updateData.verified = true;
        updateData.verifiedAt = new Date();
        updateData.verifiedBy = adminId;
      }

      await label.update(updateData);

      return {
        success: true,
        message: `厂牌已${status === 'active' ? '通过审核' : status === 'inactive' ? '停用' : '设为待审核'}`,
        data: label.getSafeInfo()
      };
    } catch (error) {
      console.error('审核厂牌失败:', error);
      throw error;
    }
  }

  /**
   * 获取厂牌详情（管理员）
   * @param {number} labelId - 厂牌ID
   * @returns {Object} 厂牌详情
   */
  async getLabelDetail(labelId) {
    try {
      const label = await Label.findOne({
        where: { id: labelId },
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'username', 'email', 'created_at']
          },
          {
            model: User,
            as: 'verifier',
            attributes: ['id', 'username'],
            required: false
          }
        ]
      });

      if (!label) {
        throw new Error('厂牌不存在');
      }

      return {
        success: true,
        data: label.getSafeInfo()
      };
    } catch (error) {
      console.error('获取厂牌详情失败:', error);
      throw error;
    }
  }
}

module.exports = new LabelService();
