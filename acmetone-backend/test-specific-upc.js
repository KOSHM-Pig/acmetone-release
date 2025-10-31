const ISRCSearcher = require('./src/services/isrcService');

async function testSpecificUpc() {
  console.log('=== 测试特定ISRC的UPC查询 ===');
  
  const isrcSearcher = new ISRCSearcher();
  const testIsrc = 'HKG732554236'; // 失去你 (Original Acoustic Mix)
  
  console.log(`测试ISRC: ${testIsrc}`);
  console.log('预期UPC: 4894965860115');
  console.log('预期歌曲: 失去你');
  console.log('预期版本: Original Acoustic Mix');
  console.log('');
  
  try {
    console.log('发送查询请求...');
    const result = await isrcSearcher.searchUpcByIsrc(testIsrc);
    
    console.log('--- 查询结果 ---');
    console.log('成功:', result.success);
    
    if (result.success && result.data) {
      console.log('');
      console.log('✅ 查询成功！');
      console.log('返回数据:');
      console.log(`  ISRC: ${result.data.isrc}`);
      console.log(`  UPC: ${result.data.upc}`);
      console.log(`  歌曲标题: ${result.data.recordingTitle}`);
      console.log(`  版本信息: ${result.data.recordingVersion || '无'}`);
      console.log(`  录音艺人: ${result.data.recordingArtistName}`);
      console.log(`  专辑名称: ${result.data.releaseName}`);
      console.log(`  发行厂牌: ${result.data.releaseLabel}`);
      console.log(`  发行日期: ${result.data.releaseDate}`);
      console.log(`  录音年份: ${result.data.recordingYear}`);
      console.log(`  时长: ${result.data.duration}`);
      console.log(`  音乐风格: ${result.data.genre?.join(', ') || '无'}`);
      console.log(`  发行艺人: ${result.data.releaseArtistName}`);
      console.log(`  记录类型: ${result.data.recordingType}`);
      console.log(`  ISRC有效: ${result.data.isValidIsrc}`);
      console.log(`  显式内容: ${result.data.isExplicit || '无'}`);
      console.log(`  记录ID: ${result.data.id}`);
      
      // 验证预期结果
      console.log('');
      console.log('--- 验证结果 ---');
      console.log(`UPC匹配: ${result.data.upc === '4894965860115' ? '✅' : '❌'} (预期: 4894965860115, 实际: ${result.data.upc})`);
      console.log(`歌曲匹配: ${result.data.recordingTitle === '失去你' ? '✅' : '❌'} (预期: 失去你, 实际: ${result.data.recordingTitle})`);
      console.log(`版本匹配: ${result.data.recordingVersion === 'Original Acoustic Mix' ? '✅' : '❌'} (预期: Original Acoustic Mix, 实际: ${result.data.recordingVersion})`);
      
    } else if (result.success && !result.data) {
      console.log('❌ 未找到匹配的记录');
      console.log('消息:', result.message);
    } else {
      console.log('❌ 查询失败');
      console.log('错误:', result.error);
    }
    
  } catch (error) {
    console.error('❌ 测试异常:', error.message);
    console.error('详细错误:', error);
  }
  
  console.log('\n=== 测试完成 ===');
}

// 运行测试
if (require.main === module) {
  testSpecificUpc()
    .then(() => {
      console.log('测试执行完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('测试执行失败:', error);
      process.exit(1);
    });
}

module.exports = { testSpecificUpc };
