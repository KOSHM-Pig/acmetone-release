const db = require('../config/database');
const logger = require('../utils/logger');

/**
 * 艺人模型
 */
class Artist {
  constructor(data = {}) {
    this.id = data.id || null;
    this.userId = data.user_id || data.userId || null;
    this.stageName = data.stage_name || data.stageName || '';
    this.realName = data.real_name || data.realName || '';
    this.bio = data.bio || '';
    this.avatarUrl = data.avatar_url || data.avatarUrl || '';
    this.musicLinks = data.music_links || data.musicLinks || [];
    this.genres = data.genres || [];
    this.location = data.location || '';
    this.website = data.website || '';
    this.socialMedia = data.social_media || data.socialMedia || {};
    this.createdAt = data.created_at || data.createdAt || null;
    this.updatedAt = data.updated_at || data.updatedAt || null;
  }

  /**
   * 根据用户ID查找艺人
   */
  static async findByUserId(userId) {
    try {
      const sql = 'SELECT * FROM artists WHERE user_id = ?';
      const rows = await db.query(sql, [userId]);
      
      if (rows.length > 0) {
        const artist = new Artist(rows[0]);
        // 解析JSON字段
        if (typeof artist.musicLinks === 'string') {
          artist.musicLinks = JSON.parse(artist.musicLinks);
        }
        if (typeof artist.genres === 'string') {
          artist.genres = JSON.parse(artist.genres);
        }
        if (typeof artist.socialMedia === 'string') {
          artist.socialMedia = JSON.parse(artist.socialMedia);
        }
        return artist;
      }
      return null;
    } catch (error) {
      logger.error('根据用户ID查找艺人失败', {
        userId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 根据ID查找艺人
   */
  static async findById(id) {
    try {
      const sql = 'SELECT * FROM artists WHERE id = ?';
      const rows = await db.query(sql, [id]);
      
      if (rows.length > 0) {
        const artist = new Artist(rows[0]);
        // 解析JSON字段
        if (typeof artist.musicLinks === 'string') {
          artist.musicLinks = JSON.parse(artist.musicLinks);
        }
        if (typeof artist.genres === 'string') {
          artist.genres = JSON.parse(artist.genres);
        }
        if (typeof artist.socialMedia === 'string') {
          artist.socialMedia = JSON.parse(artist.socialMedia);
        }
        return artist;
      }
      return null;
    } catch (error) {
      logger.error('根据ID查找艺人失败', {
        id,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 根据艺名查找艺人
   */
  static async findByStageName(stageName) {
    try {
      const sql = 'SELECT * FROM artists WHERE stage_name = ?';
      const rows = await db.query(sql, [stageName]);
      
      if (rows.length > 0) {
        return new Artist(rows[0]);
      }
      return null;
    } catch (error) {
      logger.error('根据艺名查找艺人失败', {
        stageName,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 创建新艺人
   */
  static async create(artistData) {
    try {
      const sql = `
        INSERT INTO artists (
          user_id, stage_name, real_name, bio, avatar_url, 
          music_links, genres, location, website, social_media
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      const params = [
        artistData.userId,
        artistData.stageName,
        artistData.realName || null,
        artistData.bio || null,
        artistData.avatarUrl || null,
        JSON.stringify(artistData.musicLinks || []),
        JSON.stringify(artistData.genres || []),
        artistData.location || null,
        artistData.website || null,
        JSON.stringify(artistData.socialMedia || {})
      ];

      const result = await db.query(sql, params);
      
      logger.info('艺人创建成功', {
        artistId: result.insertId,
        userId: artistData.userId,
        stageName: artistData.stageName
      });

      return await Artist.findById(result.insertId);
    } catch (error) {
      logger.error('创建艺人失败', {
        artistData,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 更新艺人信息
   */
  async update(updateData) {
    try {
      const fields = [];
      const params = [];

      // 构建动态更新字段
      if (updateData.stageName !== undefined) {
        fields.push('stage_name = ?');
        params.push(updateData.stageName);
      }
      if (updateData.realName !== undefined) {
        fields.push('real_name = ?');
        params.push(updateData.realName);
      }
      if (updateData.bio !== undefined) {
        fields.push('bio = ?');
        params.push(updateData.bio);
      }
      if (updateData.avatarUrl !== undefined) {
        fields.push('avatar_url = ?');
        params.push(updateData.avatarUrl);
      }
      if (updateData.musicLinks !== undefined) {
        fields.push('music_links = ?');
        params.push(JSON.stringify(updateData.musicLinks));
      }
      if (updateData.genres !== undefined) {
        fields.push('genres = ?');
        params.push(JSON.stringify(updateData.genres));
      }
      if (updateData.location !== undefined) {
        fields.push('location = ?');
        params.push(updateData.location);
      }
      if (updateData.website !== undefined) {
        fields.push('website = ?');
        params.push(updateData.website);
      }
      if (updateData.socialMedia !== undefined) {
        fields.push('social_media = ?');
        params.push(JSON.stringify(updateData.socialMedia));
      }

      if (fields.length === 0) {
        throw new Error('没有要更新的字段');
      }

      fields.push('updated_at = NOW()');
      params.push(this.id);

      const sql = `UPDATE artists SET ${fields.join(', ')} WHERE id = ?`;
      await db.query(sql, params);

      // 重新加载艺人数据
      const updatedArtist = await Artist.findById(this.id);
      Object.assign(this, updatedArtist);

      logger.info('艺人更新成功', {
        artistId: this.id,
        updateData
      });

      return this;
    } catch (error) {
      logger.error('更新艺人失败', {
        artistId: this.id,
        updateData,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 删除艺人
   */
  async delete() {
    try {
      const sql = 'DELETE FROM artists WHERE id = ?';
      await db.query(sql, [this.id]);

      logger.info('艺人删除成功', {
        artistId: this.id,
        stageName: this.stageName
      });

      return true;
    } catch (error) {
      logger.error('删除艺人失败', {
        artistId: this.id,
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
      userId: this.userId,
      stageName: this.stageName,
      realName: this.realName,
      bio: this.bio,
      avatarUrl: this.avatarUrl,
      musicLinks: this.musicLinks,
      genres: this.genres,
      location: this.location,
      website: this.website,
      socialMedia: this.socialMedia,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  /**
   * 验证艺人数据
   */
  static validate(artistData) {
    const errors = [];

    if (!artistData.userId) {
      errors.push('用户ID不能为空');
    }

    if (!artistData.stageName) {
      errors.push('艺名不能为空');
    } else if (artistData.stageName.length < 2) {
      errors.push('艺名至少需要2个字符');
    } else if (artistData.stageName.length > 50) {
      errors.push('艺名不能超过50个字符');
    }

    if (artistData.website && !/^https?:\/\/.+/.test(artistData.website)) {
      errors.push('网站URL格式不正确');
    }

    if (artistData.musicLinks && Array.isArray(artistData.musicLinks)) {
      artistData.musicLinks.forEach((link, index) => {
        if (!link.platform || !link.url) {
          errors.push(`音乐链接${index + 1}缺少平台或URL`);
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

module.exports = Artist;
