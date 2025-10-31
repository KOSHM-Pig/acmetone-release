const db = require('../config/database');

/**
 * 厂牌成员模型
 */
class LabelMember {
  constructor(data) {
    this.id = data.id;
    this.userId = data.user_id;
    this.labelId = data.label_id;
    this.role = data.role;
    this.isVerified = data.is_verified;
    this.beatArrayVerified = data.beat_array_verified;
    this.permissions = data.permissions;
    this.joinedAt = data.joined_at;
    this.status = data.status;
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
  }

  /**
   * 创建厂牌成员
   */
  static async create(data) {
    const connection = await db.getConnection();
    
    try {
      const [result] = await connection.execute(
        `INSERT INTO label_members (
          user_id, label_id, role, is_verified, beat_array_verified, 
          permissions, status, joined_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), NOW())`,
        [
          data.userId,
          data.labelId,
          data.role,
          data.isVerified || false,
          data.beatArrayVerified || false,
          data.permissions ? JSON.stringify(data.permissions) : null,
          data.status || 'pending'
        ]
      );

      // 查询新创建的记录
      const [rows] = await connection.execute(
        'SELECT * FROM label_members WHERE id = ?',
        [result.insertId]
      );

      return new LabelMember(rows[0]);
    } finally {
      connection.release();
    }
  }

  /**
   * 根据用户ID和厂牌ID查找成员
   */
  static async findByUserAndLabel(userId, labelId) {
    const connection = await db.getConnection();
    
    try {
      const [rows] = await connection.execute(
        'SELECT * FROM label_members WHERE user_id = ? AND label_id = ?',
        [userId, labelId]
      );

      if (rows.length === 0) {
        return null;
      }

      return new LabelMember(rows[0]);
    } finally {
      connection.release();
    }
  }

  /**
   * 根据用户ID查找成员关系
   */
  static async findByUserId(userId) {
    const connection = await db.getConnection();
    
    try {
      const [rows] = await connection.execute(
        'SELECT * FROM label_members WHERE user_id = ? ORDER BY joined_at DESC LIMIT 1',
        [userId]
      );

      if (rows.length === 0) {
        return null;
      }

      return new LabelMember(rows[0]);
    } finally {
      connection.release();
    }
  }

  /**
   * 更新成员信息
   */
  async update(data) {
    const connection = await db.getConnection();
    
    try {
      const fields = [];
      const values = [];

      if (data.role !== undefined) {
        fields.push('role = ?');
        values.push(data.role);
      }
      if (data.isVerified !== undefined) {
        fields.push('is_verified = ?');
        values.push(data.isVerified);
      }
      if (data.beatArrayVerified !== undefined) {
        fields.push('beat_array_verified = ?');
        values.push(data.beatArrayVerified);
      }
      if (data.permissions !== undefined) {
        fields.push('permissions = ?');
        values.push(data.permissions ? JSON.stringify(data.permissions) : null);
      }
      if (data.status !== undefined) {
        fields.push('status = ?');
        values.push(data.status);
      }

      if (fields.length === 0) {
        return this;
      }

      fields.push('updated_at = NOW()');
      values.push(this.id);

      await connection.execute(
        `UPDATE label_members SET ${fields.join(', ')} WHERE id = ?`,
        values
      );

      // 更新当前实例
      Object.assign(this, data);
      this.updatedAt = new Date();

      return this;
    } finally {
      connection.release();
    }
  }

  /**
   * 删除成员关系
   */
  async delete() {
    const connection = await db.getConnection();
    
    try {
      await connection.execute(
        'DELETE FROM label_members WHERE id = ?',
        [this.id]
      );
      
      return true;
    } finally {
      connection.release();
    }
  }

  /**
   * 转换为API响应格式
   */
  toApiResponse() {
    return {
      id: this.id,
      userId: this.userId,
      labelId: this.labelId,
      role: this.role,
      isVerified: this.isVerified,
      beatArrayVerified: this.beatArrayVerified,
      permissions: this.permissions,
      joinedAt: this.joinedAt,
      status: this.status,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  /**
   * 获取角色标签
   */
  getRoleLabel() {
    const roleMap = {
      'owner': '主理人',
      'reviewer': '审核',
      'designer': '美工',
      'copywriter': '文案'
    };
    return roleMap[this.role] || this.role;
  }
}

module.exports = LabelMember;
