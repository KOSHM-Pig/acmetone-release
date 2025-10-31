const ISRCSearcher = require('./src/services/isrcService');

async function testUpcSearch() {
  console.log('=== UPC查询测试 ===');
  
  const isrcSearcher = new ISRCSearcher();
  
  // 测试用的ISRC代码
  const testIsrcs = [
    'HKG732554236', // 失去你 (Original Acoustic Mix) - 应该返回UPC: 4894965860115
    'HKG732553241', // Just Like Miss You
    'INVALID123'    // 无效的ISRC
  ];

  console.log('预期结果:');
  console.log('HKG732554236 应该返回:');
  console.log('  UPC: 4894965860115');
  console.log('  歌曲: 失去你');
  console.log('  版本: Original Acoustic Mix');
  console.log('  艺人: Arantha L. ♦ Aspire Sound ♦ Geist (G.T) ♦ KOSHM ♦ YueHeng');
  console.log('  厂牌: ASPIRE SOUND × 极音记');
  console.log('');
  
  for (const isrc of testIsrcs) {
    console.log(`\n--- 测试ISRC: ${isrc} ---`);
    
    try {
      const result = await isrcSearcher.searchUpcByIsrc(isrc);
      
      console.log('查询结果:', {
        success: result.success,
        hasData: !!result.data,
        error: result.error,
        message: result.message
      });
      
      if (result.success && result.data) {
        console.log('UPC信息:');
        console.log('  ISRC:', result.data.isrc);
        console.log('  UPC:', result.data.upc);
        console.log('  歌曲:', result.data.recordingTitle);
        console.log('  版本:', result.data.recordingVersion || '无');
        console.log('  艺人:', result.data.recordingArtistName);
        console.log('  专辑:', result.data.releaseName);
        console.log('  厂牌:', result.data.releaseLabel);
        console.log('  发行日期:', result.data.releaseDate);
        console.log('  时长:', result.data.duration);
        console.log('  风格:', result.data.genre?.join(', ') || '无');
        console.log('  发行艺人:', result.data.releaseArtistName);
        console.log('  记录ID:', result.data.id);
      }
      
    } catch (error) {
      console.error('测试失败:', error.message);
    }
    
    // 添加延迟避免请求过于频繁
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('\n=== 测试完成 ===');
}

// 运行测试
if (require.main === module) {
  testUpcSearch()
    .then(() => {
      console.log('所有测试完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('测试失败:', error);
      process.exit(1);
    });
}

module.exports = { testUpcSearch };
