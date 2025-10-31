/**
 * 歌曲-歌手关系同步脚本
 * 用于手动同步songs表的artists字段和songartists表之间的数据
 * 
 * 使用方法：
 * 1. 同步所有歌曲: node src/scripts/syncArtists.js
 * 2. 同步指定歌曲: node src/scripts/syncArtists.js 123 (其中123为歌曲ID)
 */

const { sequelize } = require('../models');
const { syncArtistRelations } = require('../utils/syncArtistRelations');

async function main() {
  try {
    console.log('开始同步歌曲-歌手关系...');
    
    // 获取命令行参数
    const args = process.argv.slice(2);
    const songId = args[0] ? parseInt(args[0]) : null;
    
    if (songId) {
      console.log(`将只同步歌曲ID: ${songId}`);
    } else {
      console.log('将同步所有歌曲');
    }
    
    // 执行同步
    const stats = await syncArtistRelations(songId);
    
    console.log('同步完成，结果统计:');
    console.log(`- 处理歌曲数: ${stats.songsProcessed}`);
    console.log(`- 添加到songartists表: ${stats.addedToSongArtists}`);
    console.log(`- 添加到songs.artists字段: ${stats.addedToSongArtistsField}`);
    console.log(`- 错误数: ${stats.errors.length}`);
    
    if (stats.errors.length > 0) {
      console.error('错误详情:');
      stats.errors.forEach((err, index) => {
        console.error(`${index + 1}. ${err}`);
      });
    }
  } catch (error) {
    console.error('同步脚本执行失败:', error);
  } finally {
    // 关闭数据库连接
    await sequelize.close();
  }
}

// 执行主函数
main(); 