/**
 * 歌曲-歌手关系同步中间件
 * 用于在请求处理前自动同步歌曲-歌手关系
 */
const { syncArtistRelations } = require('../utils/syncArtistRelations');

/**
 * 同步歌曲-歌手关系中间件
 * 如果请求包含songId参数，则自动同步该歌曲的歌手关系
 */
const syncArtistRelationsMiddleware = async (req, res, next) => {
  try {
    // 检查请求是否包含songId参数
    const songId = req.params.songId;
    
    if (songId && !isNaN(parseInt(songId))) {
      console.log(`[同步中间件] 同步歌曲 ${songId} 的歌手关系...`);
      await syncArtistRelations(parseInt(songId));
      console.log(`[同步中间件] 歌曲 ${songId} 的歌手关系同步完成`);
    }
    
    next();
  } catch (error) {
    console.error('[同步中间件] 同步歌曲-歌手关系失败:', error);
    // 即使同步失败，也继续处理请求
    next();
  }
};

module.exports = syncArtistRelationsMiddleware; 