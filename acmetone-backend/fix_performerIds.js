// 修复数据库中performerIds为NULL的记录
const { Album } = require('./src/models');
const { sequelize } = require('./src/config/db');

async function fixPerformerIds() {
  try {
    console.log('开始修复performerIds字段...');
    
    // 查找所有performerIds为NULL的记录
    const albums = await Album.findAll({
      where: {
        performerIds: null
      }
    });
    
    console.log(`找到 ${albums.length} 条performerIds为NULL的记录`);
    
    // 更新这些记录
    for (const album of albums) {
      console.log(`正在修复专辑ID: ${album.id}, 标题: ${album.title}`);
      await album.update({ performerIds: '[]' });
    }
    
    console.log('修复完成！');
    process.exit(0);
  } catch (error) {
    console.error('修复过程中出错:', error);
    process.exit(1);
  }
}

// 运行修复程序
fixPerformerIds(); 