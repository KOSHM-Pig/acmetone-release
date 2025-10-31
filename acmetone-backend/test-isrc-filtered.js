const autoFetchISRC = require('./src/scheduler/tasks/autoFetchISRC');
const { Song, Album, sequelize } = require('./src/models');
const { Op } = require('sequelize');

async function testFilteredISRCTask() {
  console.log('=== 测试过滤后的ISRC获取任务 ===');
  
  try {
    // 先查看数据库中的专辑状态分布
    console.log('--- 专辑状态分布 ---');
    const albumStats = await Album.findAll({
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['status']
    });
    
    albumStats.forEach(stat => {
      console.log(`${stat.status}: ${stat.dataValues.count} 个专辑`);
    });
    
    // 查看日期分布
    console.log('\n--- 专辑发行日期分布 ---');
    const currentDate = new Date();
    console.log(`当前时间: ${currentDate.toISOString().split('T')[0]}`);

    const releasedAlbums = await Album.count({
      where: {
        releaseDate: { [Op.lte]: currentDate }
      }
    });

    const futureAlbums = await Album.count({
      where: {
        releaseDate: { [Op.gt]: currentDate }
      }
    });

    console.log(`已发行专辑（发行日期 <= 今天）: ${releasedAlbums} 个`);
    console.log(`未来发行专辑（发行日期 > 今天）: ${futureAlbums} 个`);
    
    // 查看符合条件的专辑
    console.log('\n--- 符合条件的专辑（已通过且已发行） ---');
    const eligibleAlbums = await Album.findAll({
      where: {
        status: 'approved',
        releaseDate: { [Op.lte]: currentDate }
      },
      attributes: ['id', 'title', 'status', 'releaseDate'],
      limit: 10
    });

    console.log(`符合条件的专辑数量: ${eligibleAlbums.length}`);
    eligibleAlbums.forEach(album => {
      const daysDiff = Math.floor((currentDate - album.releaseDate) / (1000 * 60 * 60 * 24));
      console.log(`  ID: ${album.id}, 标题: ${album.title}, 状态: ${album.status}, 发行日期: ${album.releaseDate.toISOString().split('T')[0]} (${daysDiff}天前)`);
    });
    
    // 查看符合条件但没有ISRC的歌曲
    console.log('\n--- 符合条件但没有ISRC的歌曲 ---');
    const songsNeedISRC = await Song.findAll({
      where: {
        isrc: null
      },
      attributes: ['id', 'title', 'albumId'],
      include: [{
        model: Album,
        attributes: ['title', 'status', 'releaseDate'],
        required: true,
        where: {
          status: 'approved',
          releaseDate: { [Op.lte]: currentDate }
        }
      }],
      limit: 10
    });
    
    console.log(`需要获取ISRC的歌曲数量: ${songsNeedISRC.length}`);
    songsNeedISRC.forEach(song => {
      console.log(`  歌曲: ${song.title}, 专辑: ${song.Album.title}, 发行日期: ${song.Album.releaseDate.toISOString().split('T')[0]}`);
    });
    
    // 查看有ISRC但没有UPC的歌曲
    console.log('\n--- 有ISRC但没有UPC的歌曲 ---');
    const songsNeedUPC = await Song.findAll({
      where: {
        isrc: { [Op.ne]: null },
        upc: null
      },
      attributes: ['id', 'title', 'isrc', 'albumId'],
      include: [{
        model: Album,
        attributes: ['title', 'status', 'releaseDate'],
        required: true,
        where: {
          status: 'approved',
          releaseDate: { [Op.gte]: cutoffDate }
        }
      }],
      limit: 10
    });
    
    console.log(`需要获取UPC的歌曲数量: ${songsNeedUPC.length}`);
    songsNeedUPC.forEach(song => {
      console.log(`  歌曲: ${song.title}, ISRC: ${song.isrc}, 专辑: ${song.Album.title}`);
    });
    
    // 运行实际的任务
    console.log('\n=== 运行ISRC获取任务 ===');
    const result = await autoFetchISRC();
    
    console.log('--- 任务结果 ---');
    console.log('成功:', result.success);
    console.log('消息:', result.message);
    
    if (result.success) {
      console.log('');
      console.log('详细统计:');
      console.log(`  处理歌曲数: ${result.processedSongs || 0}`);
      console.log(`  获取ISRC: ${result.foundISRC || 0}`);
      console.log(`  获取UPC: ${result.foundUPC || 0}`);
      console.log(`  处理错误: ${result.errors || 0}`);
      console.log(`  ISRC成功率: ${result.isrcSuccessRate || 0}%`);
      console.log(`  UPC成功率: ${result.upcSuccessRate || 0}%`);
    } else {
      console.log('错误:', result.error);
    }
    
  } catch (error) {
    console.error('❌ 测试执行失败:', error.message);
    console.error('详细错误:', error);
  }
  
  console.log('\n=== 测试完成 ===');
}

// 运行测试
if (require.main === module) {
  testFilteredISRCTask()
    .then(() => {
      console.log('测试执行完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('测试执行失败:', error);
      process.exit(1);
    });
}

module.exports = { testFilteredISRCTask };
