const db = require('../config/database');
const crypto = require('crypto');

/**
 * 厂牌模型
 */
class Label {
  /**
   * MD5加密密码
   */
  static encryptPassword(password) {
    if (!password) return null;
    return crypto.createHash('md5').update(password).digest('hex');
  }
  constructor(data) {
    this.id = data.id;
    this.mainBackendUserId = data.main_backend_user_id;
    this.chineseName = data.chinese_name;
    this.englishName = data.english_name;
    this.description = data.description;
    this.logoUrl = data.logo_url;
    this.website = data.website;
    this.contactEmail = data.contact_email;
    this.foundedYear = data.founded_year;
    this.location = data.location;
    this.genres = data.genres;
    this.socialMedia = data.social_media;
    this.isInJiYinJi = data.is_in_jiyinji;
    this.jiyinjiId = data.jiyinji_id;
    this.beatArrayAccount = data.beatarray_account;
    this.beatArrayPassword = data.beatarray_password;
    this.status = data.status;
    this.reviewerId = data.reviewer_id;
    this.reviewComment = data.review_comment;
    this.reviewedAt = data.reviewed_at;
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
  }

  /**
   * 创建厂牌（包括成员关系）
   */
  static async create(data, userId, role = 'owner') {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      // 1. 创建厂牌记录
      const [labelResult] = await connection.execute(
        `INSERT INTO labels (
          chinese_name, english_name, description, logo_url, website,
          contact_email, founded_year, location, genres,
          social_media, beatarray_account, beatarray_password, is_in_jiyinji, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          data.chineseName,
          data.englishName || null,
          data.description || null,
          data.logoUrl || null,
          data.website || null,
          data.contactEmail || null,
          data.foundedYear || null,
          data.location || null,
          data.genres || null,
          data.socialMedia ? JSON.stringify(data.socialMedia) : null,
          data.beatArrayAccount || null,
          data.beatArrayPassword ? Label.encryptPassword(data.beatArrayPassword) : null,
          data.isInJiYinJi || false,
          data.status || 'pending'
        ]
      );

      const labelId = labelResult.insertId;

      // 2. 创建成员关系
      await connection.execute(
        `INSERT INTO label_members (
          user_id, label_id, role, is_verified, status, joined_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, NOW(), NOW(), NOW())`,
        [userId, labelId, role, 1, 'active']
      );

      await connection.commit();

      // 3. 查询新创建的记录
      const [rows] = await connection.execute(
        'SELECT * FROM labels WHERE id = ?',
        [labelId]
      );

      return new Label(rows[0]);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * 根据主后端用户ID查找厂牌
   */
  static async findByMainBackendUserId(mainBackendUserId) {
    const connection = await db.getConnection();

    try {
      // 通过 users -> label_members -> labels 关联查找
      const [rows] = await connection.execute(
        `SELECT l.* FROM labels l
         INNER JOIN label_members lm ON l.id = lm.label_id
         INNER JOIN users u ON lm.user_id = u.id
         WHERE u.main_backend_user_id = ?
         ORDER BY lm.joined_at DESC
         LIMIT 1`,
        [mainBackendUserId]
      );

      if (rows.length === 0) {
        return null;
      }

      return new Label(rows[0]);
    } finally {
      connection.release();
    }
  }

  /**
   * 根据用户ID查找厂牌
   */
  static async findByUserId(userId) {
    const connection = await db.getConnection();

    try {
      // 通过 label_members 表关联查找
      const [rows] = await connection.execute(
        `SELECT l.* FROM labels l
         INNER JOIN label_members lm ON l.id = lm.label_id
         WHERE lm.user_id = ?
         ORDER BY lm.joined_at DESC
         LIMIT 1`,
        [userId]
      );

      if (rows.length === 0) {
        return null;
      }

      return new Label(rows[0]);
    } finally {
      connection.release();
    }
  }

  /**
   * 根据ID查找厂牌
   */
  static async findById(id) {
    const connection = await db.getConnection();
    
    try {
      const [rows] = await connection.execute(
        'SELECT * FROM labels WHERE id = ?',
        [id]
      );

      if (rows.length === 0) {
        return null;
      }

      return new Label(rows[0]);
    } finally {
      connection.release();
    }
  }

  /**
   * 更新厂牌信息
   */
  async update(data) {
    const connection = await db.getConnection();
    
    try {
      const fields = [];
      const values = [];

      if (data.chineseName !== undefined) {
        fields.push('chineseName = ?');
        values.push(data.chineseName);
      }
      if (data.englishName !== undefined) {
        fields.push('englishName = ?');
        values.push(data.englishName);
      }
      if (data.description !== undefined) {
        fields.push('description = ?');
        values.push(data.description);
      }
      if (data.website !== undefined) {
        fields.push('website = ?');
        values.push(data.website);
      }
      if (data.role !== undefined) {
        fields.push('role = ?');
        values.push(data.role);
      }
      if (data.isInJiYinJi !== undefined) {
        fields.push('is_in_jiyinji = ?');
        values.push(data.isInJiYinJi);
      }
      if (data.beatArrayAccount !== undefined) {
        fields.push('beatarray_account = ?');
        values.push(data.beatArrayAccount);
      }
      if (data.beatArrayPassword !== undefined) {
        fields.push('beatarray_password = ?');
        values.push(data.beatArrayPassword ? Label.encryptPassword(data.beatArrayPassword) : null);
      }

      if (fields.length === 0) {
        return this;
      }

      fields.push('updatedAt = NOW()');
      values.push(this.id);

      await connection.execute(
        `UPDATE labels SET ${fields.join(', ')} WHERE id = ?`,
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
   * 删除厂牌
   */
  async delete() {
    const connection = await db.getConnection();
    
    try {
      await connection.execute(
        'DELETE FROM labels WHERE id = ?',
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
      chineseName: this.chineseName,
      englishName: this.englishName,
      description: this.description,
      logoUrl: this.logoUrl,
      website: this.website,
      contactEmail: this.contactEmail,
      foundedYear: this.foundedYear,
      location: this.location,
      genres: this.genres,
      socialMedia: this.socialMedia,
      isInJiYinJi: this.isInJiYinJi,
      jiyinjiId: this.jiyinjiId,
      beatArrayAccount: this.beatArrayAccount,
      // beatArrayPassword 不返回给前端，只有账号返回
      status: this.status,
      reviewerId: this.reviewerId,
      reviewComment: this.reviewComment,
      reviewedAt: this.reviewedAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  /**
   * 根据中文名查找厂牌
   */
  static async findByChineseName(chineseName) {
    const connection = await db.getConnection();

    try {
      const [rows] = await connection.execute(
        'SELECT * FROM labels WHERE chinese_name = ?',
        [chineseName]
      );

      if (rows.length === 0) {
        return null;
      }

      return new Label(rows[0]);
    } finally {
      connection.release();
    }
  }

  /**
   * 根据英文名查找厂牌
   */
  static async findByEnglishName(englishName) {
    const connection = await db.getConnection();

    try {
      const [rows] = await connection.execute(
        'SELECT * FROM labels WHERE english_name = ?',
        [englishName]
      );

      if (rows.length === 0) {
        return null;
      }

      return new Label(rows[0]);
    } finally {
      connection.release();
    }
  }

  /**
   * 根据ID更新厂牌信息
   */
  static async updateById(id, data) {
    const connection = await db.getConnection();

    try {
      const fields = [];
      const values = [];

      // 构建更新字段
      if (data.chinese_name !== undefined) {
        fields.push('chinese_name = ?');
        values.push(data.chinese_name);
      }
      if (data.english_name !== undefined) {
        fields.push('english_name = ?');
        values.push(data.english_name);
      }
      if (data.description !== undefined) {
        fields.push('description = ?');
        values.push(data.description);
      }
      if (data.logo_url !== undefined) {
        fields.push('logo_url = ?');
        values.push(data.logo_url);
      }
      if (data.website !== undefined) {
        fields.push('website = ?');
        values.push(data.website);
      }
      if (data.contact_email !== undefined) {
        fields.push('contact_email = ?');
        values.push(data.contact_email);
      }
      if (data.founded_year !== undefined) {
        fields.push('founded_year = ?');
        values.push(data.founded_year);
      }
      if (data.location !== undefined) {
        fields.push('location = ?');
        values.push(data.location);
      }
      if (data.genres !== undefined) {
        fields.push('genres = ?');
        values.push(data.genres);
      }
      if (data.social_media !== undefined) {
        fields.push('social_media = ?');
        values.push(JSON.stringify(data.social_media));
      }
      if (data.is_in_jiyinji !== undefined) {
        fields.push('is_in_jiyinji = ?');
        values.push(data.is_in_jiyinji);
      }
      if (data.jiyinji_id !== undefined) {
        fields.push('jiyinji_id = ?');
        values.push(data.jiyinji_id);
      }
      if (data.beatarray_account !== undefined) {
        fields.push('beatarray_account = ?');
        values.push(data.beatarray_account);
      }
      if (data.beatarray_password !== undefined) {
        fields.push('beatarray_password = ?');
        values.push(data.beatarray_password ? Label.encryptPassword(data.beatarray_password) : null);
      }

      if (fields.length === 0) {
        throw new Error('没有要更新的字段');
      }

      // 添加更新时间
      fields.push('updated_at = NOW()');
      values.push(id);

      const query = `UPDATE labels SET ${fields.join(', ')} WHERE id = ?`;

      await connection.execute(query, values);

      // 返回更新后的数据
      return await Label.findById(id);
    } finally {
      connection.release();
    }
  }

  /**
   * 获取所有厂牌
   */
  static async findAll(options = {}) {
    const connection = await db.getConnection();

    try {
      let query = 'SELECT * FROM labels';
      const values = [];

      if (options.where) {
        const conditions = [];
        for (const [key, value] of Object.entries(options.where)) {
          conditions.push(`${key} = ?`);
          values.push(value);
        }
        if (conditions.length > 0) {
          query += ` WHERE ${conditions.join(' AND ')}`;
        }
      }

      if (options.orderBy) {
        query += ` ORDER BY ${options.orderBy}`;
      }

      if (options.limit) {
        query += ` LIMIT ${options.limit}`;
      }

      const [rows] = await connection.execute(query, values);
      return rows.map(row => new Label(row));
    } finally {
      connection.release();
    }
  }
}

module.exports = Label;
