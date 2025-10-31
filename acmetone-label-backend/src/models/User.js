const db = require('../config/database');
const logger = require('../utils/logger');

/**
 * 用户模型
 */
class User {
  constructor(data = {}) {
    this.id = data.id || null;
    this.mainBackendUserId = data.main_backend_user_id || data.mainBackendUserId || null;
    this.email = data.email || '';
    this.userType = data.user_type || data.userType || '';
    this.onboardingCompleted = data.onboarding_completed || data.onboardingCompleted || false;
    this.onboardingStep = data.onboarding_step || data.onboardingStep || 1;
    this.createdAt = data.created_at || data.createdAt || null;
    this.updatedAt = data.updated_at || data.updatedAt || null;
  }

  /**
   * 根据主后端用户ID查找用户
   */
  static async findByMainBackendUserId(mainBackendUserId) {
    try {
      const sql = 'SELECT * FROM users WHERE main_backend_user_id = ?';
      const rows = await db.query(sql, [mainBackendUserId]);
      
      if (rows.length > 0) {
        return new User(rows[0]);
      }
      return null;
    } catch (error) {
      logger.error('查找用户失败', {
        mainBackendUserId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 根据邮箱查找用户
   */
  static async findByEmail(email) {
    try {
      const sql = 'SELECT * FROM users WHERE email = ?';
      const rows = await db.query(sql, [email]);
      
      if (rows.length > 0) {
        return new User(rows[0]);
      }
      return null;
    } catch (error) {
      logger.error('根据邮箱查找用户失败', {
        email,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 根据ID查找用户
   */
  static async findById(id) {
    try {
      const sql = 'SELECT * FROM users WHERE id = ?';
      const rows = await db.query(sql, [id]);
      
      if (rows.length > 0) {
        return new User(rows[0]);
      }
      return null;
    } catch (error) {
      logger.error('根据ID查找用户失败', {
        id,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 创建新用户
   */
  static async create(userData) {
    try {
      const sql = `
        INSERT INTO users (main_backend_user_id, email, user_type, onboarding_completed, onboarding_step)
        VALUES (?, ?, ?, ?, ?)
      `;
      const params = [
        userData.mainBackendUserId,
        userData.email,
        userData.userType,
        userData.onboardingCompleted || false,
        userData.onboardingStep || 1
      ];

      const result = await db.query(sql, params);
      
      logger.info('用户创建成功', {
        userId: result.insertId,
        email: userData.email,
        userType: userData.userType
      });

      return await User.findById(result.insertId);
    } catch (error) {
      logger.error('创建用户失败', {
        userData,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 更新用户信息
   */
  async update(updateData) {
    try {
      const fields = [];
      const params = [];

      // 构建动态更新字段
      if (updateData.userType !== undefined) {
        fields.push('user_type = ?');
        params.push(updateData.userType);
      }
      if (updateData.onboardingCompleted !== undefined) {
        fields.push('onboarding_completed = ?');
        params.push(updateData.onboardingCompleted);
      }
      if (updateData.onboardingStep !== undefined) {
        fields.push('onboarding_step = ?');
        params.push(updateData.onboardingStep);
      }

      if (fields.length === 0) {
        throw new Error('没有要更新的字段');
      }

      fields.push('updated_at = NOW()');
      params.push(this.id);

      const sql = `UPDATE users SET ${fields.join(', ')} WHERE id = ?`;
      await db.query(sql, params);

      // 重新加载用户数据
      const updatedUser = await User.findById(this.id);
      Object.assign(this, updatedUser);

      logger.info('用户更新成功', {
        userId: this.id,
        updateData
      });

      return this;
    } catch (error) {
      logger.error('更新用户失败', {
        userId: this.id,
        updateData,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 获取用户的向导进度
   */
  async getOnboardingProgress() {
    try {
      const sql = `
        SELECT * FROM onboarding_progress 
        WHERE user_id = ? 
        ORDER BY step ASC
      `;
      const rows = await db.query(sql, [this.id]);
      return rows;
    } catch (error) {
      logger.error('获取向导进度失败', {
        userId: this.id,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 更新向导进度
   */
  async updateOnboardingProgress(step, stepName, data, completed = false) {
    try {
      const sql = `
        INSERT INTO onboarding_progress (user_id, step, step_name, data, completed, completed_at)
        VALUES (?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        data = VALUES(data),
        completed = VALUES(completed),
        completed_at = VALUES(completed_at),
        updated_at = NOW()
      `;
      const params = [
        this.id,
        step,
        stepName,
        JSON.stringify(data),
        completed,
        completed ? new Date() : null
      ];

      await db.query(sql, params);

      logger.info('向导进度更新成功', {
        userId: this.id,
        step,
        stepName,
        completed
      });

      return true;
    } catch (error) {
      logger.error('更新向导进度失败', {
        userId: this.id,
        step,
        stepName,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 转换为API响应格式
   */
  toApiResponse() {
    return {
      id: this.id,
      mainBackendUserId: this.mainBackendUserId,
      email: this.email,
      userType: this.userType,
      onboardingCompleted: this.onboardingCompleted,
      onboardingStep: this.onboardingStep,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  /**
   * 验证用户数据
   */
  static validate(userData) {
    const errors = [];

    if (!userData.mainBackendUserId) {
      errors.push('主后端用户ID不能为空');
    }

    if (!userData.email) {
      errors.push('邮箱不能为空');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userData.email)) {
      errors.push('邮箱格式不正确');
    }

    if (!userData.userType) {
      errors.push('用户类型不能为空');
    } else if (!['artist', 'label'].includes(userData.userType)) {
      errors.push('用户类型必须是 artist 或 label');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

module.exports = User;
