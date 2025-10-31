'use strict';
const { sequelize } = require('../config/db');
const { QueryTypes } = require('sequelize');

// 这个脚本用于将songartists表中的多对多关联转换为songs表中的artists JSON字段
// 同时保持向后兼容，songartists表仍然会被更新

module.exports = {
  up: async () => {
    try {
      console.log('开始迁移songartists数据到songs.artists字段...');
      
      // 1. 获取所有歌曲
      const songs = await sequelize.query(`SELECT id FROM songs`, { type: QueryTypes.SELECT });
      console.log(`找到 ${songs.length} 首歌曲需要处理`);
      
      // 2. 对每首歌曲，获取相关的艺术家并更新artists字段
      for (const song of songs) {
        // 查询该歌曲关联的所有艺术家ID，按照关联表的创建时间排序
        const artists = await sequelize.query(
          `SELECT ArtistId FROM songartists WHERE SongId = :songId ORDER BY createdAt ASC`,
          {
            replacements: { songId: song.id },
            type: QueryTypes.SELECT
          }
        );
        
        if (artists.length > 0) {
          // 提取艺术家ID数组
          const artistIds = artists.map(a => a.ArtistId);
          
          // 更新song的artists字段
          await sequelize.query(
            `UPDATE songs SET artists = :artistIds WHERE id = :songId`,
            {
              replacements: {
                songId: song.id,
                artistIds: JSON.stringify(artistIds)
              },
              type: QueryTypes.UPDATE
            }
          );
          console.log(`歌曲 #${song.id} 更新了 ${artistIds.length} 个艺术家ID`);
        } else {
          console.log(`歌曲 #${song.id} 没有关联的艺术家，跳过`);
        }
      }
      
      console.log('迁移完成');
      return Promise.resolve();
    } catch (error) {
      console.error('迁移出错:', error);
      return Promise.reject(error);
    }
  },

  down: async () => {
    try {
      // 清空所有songs表中的artists字段
      await sequelize.query(`UPDATE songs SET artists = NULL`, {
        type: QueryTypes.UPDATE
      });
      
      console.log('已回滚：清空了songs表中的artists字段');
      return Promise.resolve();
    } catch (error) {
      console.error('回滚出错:', error);
      return Promise.reject(error);
    }
  }
}; 