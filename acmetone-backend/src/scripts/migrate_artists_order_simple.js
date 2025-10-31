'use strict';

/**
 * 歌手排序功能迁移脚本
 * 
 * 这个脚本会：
 * 1. 添加songs表的artists字段
 * 2. 将songartists表中的数据迁移到songs.artists字段
 */

const fs = require('fs');
const path = require('path');
const { sequelize } = require('../config/db');
const { QueryTypes } = require('sequelize');

// 确保在正确的目录下执行
process.chdir(path.join(__dirname, '../..'));

console.log('开始执行歌手排序迁移...');

(async () => {
  try {
    // 1. 添加字段
    console.log('\n1. 添加songs表的artists字段...');
    
    const addFieldSql = fs.readFileSync(
      path.join(__dirname, '../migrations/add_artists_json_to_songs.sql'),
      'utf8'
    );
    
    try {
      await sequelize.query(addFieldSql);
      console.log('字段添加成功！');
    } catch (error) {
      // 如果字段已存在，忽略错误
      if (error.message.includes('Duplicate column') || 
          error.message.includes('already exists')) {
        console.log('字段已经存在，继续执行数据迁移...');
      } else {
        throw error;
      }
    }
    
    // 2. 迁移数据
    console.log('\n2. 将现有数据从songartists表迁移到songs.artists字段...');
    
    // 获取所有歌曲
    const songs = await sequelize.query(
      `SELECT id FROM songs`,
      { type: QueryTypes.SELECT }
    );
    
    console.log(`找到 ${songs.length} 首歌曲需要处理`);
    
    // 对每首歌曲，获取关联的艺术家并更新artists字段
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    
    for (const song of songs) {
      try {
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
          successCount++;
          if (successCount % 10 === 0) {
            console.log(`已处理 ${successCount} 首歌曲...`);
          }
        } else {
          skipCount++;
        }
      } catch (error) {
        console.error(`歌曲 #${song.id} 处理失败:`, error.message);
        errorCount++;
      }
    }
    
    console.log(`\n迁移完成：`);
    console.log(`- 成功更新: ${successCount} 首歌曲`);
    console.log(`- 跳过处理: ${skipCount} 首歌曲（无关联歌手）`);
    console.log(`- 处理失败: ${errorCount} 首歌曲`);
    
    if (errorCount > 0) {
      console.log('\n警告：部分歌曲处理失败，请检查日志。');
    } else {
      console.log('\n迁移成功完成。现在系统支持歌手顺序功能，并保持向后兼容。');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('\n迁移出错:', error);
    console.error('\n请修复错误后重新运行迁移脚本。');
    process.exit(1);
  }
})(); 