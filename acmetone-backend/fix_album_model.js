// 修复Album模型问题
const { sequelize } = require('./src/config/db');
const { Album } = require('./src/models');

async function fixAlbumModel() {
  try {
    console.log('开始修复Album模型问题...');
    
    // 检查Album模型的属性
    console.log('Album模型属性:');
    Object.keys(Album.rawAttributes).forEach(attr => {
      console.log(`- ${attr}`);
    });
    
    // 检查是否有performerIds字段
    if (Album.rawAttributes.performerIds) {
      console.log('\nperformerIds字段存在于模型定义中');
    } else {
      console.log('\nperformerIds字段不存在于模型定义中');
    }
    
    // 测试创建一个新的专辑记录
    console.log('\n尝试创建一个测试专辑记录...');
    const testAlbum = await Album.create({
      title: 'TEST_ALBUM',
      coverImage: 'test.jpg',
      type: '专辑',
      releaseDate: new Date(),
      displayInfo: 'TEST',
      description: 'This is a test album',
      submittedById: 1,
      performer: 'Test Artist',
      performerIds: '[123]'
    });
    
    console.log('测试专辑创建成功:', {
      id: testAlbum.id,
      title: testAlbum.title,
      performer: testAlbum.performer,
      performerIds: testAlbum.performerIds
    });
    
    // 删除测试记录
    await testAlbum.destroy();
    console.log('测试专辑记录已删除');
    
    console.log('\n修复完成！');
    process.exit(0);
  } catch (error) {
    console.error('修复过程中出错:', error);
    process.exit(1);
  }
}

// 运行修复程序
fixAlbumModel(); 