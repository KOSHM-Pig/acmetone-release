/**
 * 同步歌曲-歌手关系工具
 * 用于同步songs表的artists字段和songartists表之间的数据
 */
const models = require('../models');
const { Op } = require('sequelize');

/**
 * 同步歌曲-歌手关系
 * @param {number} songId - 如果提供，则只同步指定歌曲的关系；否则同步所有歌曲
 * @returns {Promise<Object>} - 同步结果统计
 */
async function syncArtistRelations(songId = null) {
  const stats = {
    songsProcessed: 0,
    addedToSongArtists: 0,
    addedToSongArtistsField: 0,
    errors: []
  };

  try {
    console.log('开始同步歌曲-歌手关系...');
    
    // 构建查询条件
    const whereCondition = songId ? { id: songId } : {};
    
    // 获取所有歌曲（或指定ID的歌曲）
    const songs = await models.Song.findAll({
      where: whereCondition,
      attributes: ['id', 'title', 'artists']
    });
    
    stats.songsProcessed = songs.length;
    console.log(`找到 ${songs.length} 首歌曲需要处理`);
    
    // 遍历每首歌曲
    for (const song of songs) {
      try {
        // 获取当前歌曲在songartists表中的关联
        const existingSongArtists = await models.SongArtist.findAll({
          where: { songId: song.id },
          attributes: ['artistId']
        });
        
        const existingArtistIds = existingSongArtists.map(sa => sa.artistId);
        
        // 解析songs表中的artists字段（如果存在）
        let artistsInField = [];
        if (song.artists) {
          try {
            // 如果是字符串，尝试解析JSON
            if (typeof song.artists === 'string') {
              artistsInField = JSON.parse(song.artists);
            } 
            // 如果已经是数组，直接使用
            else if (Array.isArray(song.artists)) {
              artistsInField = song.artists;
            }
            // 如果是对象，尝试提取ID
            else if (typeof song.artists === 'object') {
              artistsInField = song.artists.map(a => a.id || a.artistId || a);
            }
          } catch (error) {
            console.error(`解析歌曲 ${song.id} 的artists字段失败:`, error);
            stats.errors.push(`解析歌曲 ${song.id} 的artists字段失败: ${error.message}`);
            // 如果解析失败，使用空数组
            artistsInField = [];
          }
        }
        
        // 确保artistsInField是数字数组
        artistsInField = artistsInField
          .map(id => typeof id === 'object' ? (id.id || id.artistId) : id)
          .filter(id => id && !isNaN(parseInt(id)))
          .map(id => parseInt(id));
        
        console.log(`歌曲 ${song.id} (${song.title}): songartists表中有 ${existingArtistIds.length} 个歌手, artists字段中有 ${artistsInField.length} 个歌手`);
        
        // 1. 将songartists表中有但artists字段中没有的歌手添加到artists字段
        const artistsToAddToField = existingArtistIds.filter(id => !artistsInField.includes(id));
        if (artistsToAddToField.length > 0) {
          const newArtistsField = [...artistsInField, ...artistsToAddToField];
          await song.update({ artists: JSON.stringify(newArtistsField) });
          stats.addedToSongArtistsField += artistsToAddToField.length;
          console.log(`  - 添加了 ${artistsToAddToField.length} 个歌手到歌曲 ${song.id} 的artists字段`);
        }
        
        // 2. 将artists字段中有但songartists表中没有的歌手添加到songartists表
        const artistsToAddToTable = artistsInField.filter(id => !existingArtistIds.includes(id));
        if (artistsToAddToTable.length > 0) {
          // 验证这些歌手是否存在
          const existingArtists = await models.Artist.findAll({
            where: { id: { [Op.in]: artistsToAddToTable } },
            attributes: ['id']
          });
          
          const validArtistIds = existingArtists.map(a => a.id);
          
          // 创建新的关联
          for (const artistId of validArtistIds) {
            try {
              // 使用原始SQL查询而不是findOrCreate，避免列名大小写问题
              await models.sequelize.query(
                'INSERT IGNORE INTO songartists (songId, artistId) VALUES (:songId, :artistId)',
                {
                  replacements: { songId: song.id, artistId },
                  type: models.sequelize.QueryTypes.INSERT
                }
              );
            } catch (error) {
              console.error(`创建歌曲 ${song.id} 和歌手 ${artistId} 的关联失败:`, error);
              stats.errors.push(`创建歌曲 ${song.id} 和歌手 ${artistId} 的关联失败: ${error.message}`);
            }
          }
          
          stats.addedToSongArtists += validArtistIds.length;
          console.log(`  - 添加了 ${validArtistIds.length} 个歌手到歌曲 ${song.id} 的songartists表`);
          
          // 记录无效的歌手ID
          const invalidArtistIds = artistsToAddToTable.filter(id => !validArtistIds.includes(id));
          if (invalidArtistIds.length > 0) {
            console.warn(`  - 警告: 歌曲 ${song.id} 的artists字段中有 ${invalidArtistIds.length} 个无效的歌手ID: ${invalidArtistIds.join(', ')}`);
            stats.errors.push(`歌曲 ${song.id} 的artists字段中有无效的歌手ID: ${invalidArtistIds.join(', ')}`);
          }
        }
      } catch (error) {
        console.error(`处理歌曲 ${song.id} 时出错:`, error);
        stats.errors.push(`处理歌曲 ${song.id} 时出错: ${error.message}`);
      }
    }
    
    console.log('歌曲-歌手关系同步完成');
    console.log(`处理了 ${stats.songsProcessed} 首歌曲`);
    console.log(`添加了 ${stats.addedToSongArtists} 个歌手到songartists表`);
    console.log(`添加了 ${stats.addedToSongArtistsField} 个歌手到songs表的artists字段`);
    
    if (stats.errors.length > 0) {
      console.error(`同步过程中发生了 ${stats.errors.length} 个错误`);
    }
    
    return stats;
  } catch (error) {
    console.error('同步歌曲-歌手关系失败:', error);
    stats.errors.push(`同步失败: ${error.message}`);
    return stats;
  }
}

module.exports = {
  syncArtistRelations
}; 