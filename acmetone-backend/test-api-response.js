const ISRCSearcher = require('./src/services/isrcService');

async function testAPIResponse() {
  console.log('=== 测试ISRC API返回数据 ===');
  
  const isrcSearcher = new ISRCSearcher();
  
  try {
    // 测试"Trenches"这首歌
    console.log('测试歌曲: Trenches');
    console.log('预期厂牌: Morphlab Recordz × 极音记');
    console.log('');
    
    // 获取TOKEN状态
    const tokenStatus = isrcSearcher.getTokenStatus();
    console.log('TOKEN状态:', {
      hasToken: tokenStatus.hasToken,
      isExpired: tokenStatus.isExpired,
      remainingTime: tokenStatus.remainingTime
    });
    console.log('');
    
    // 调用搜索API
    console.log('调用searchWithFullInfo...');
    const result = await isrcSearcher.searchWithFullInfo(
      'Trenches',           // 歌曲名
      'Trenches',           // 专辑名
      'Morphlab Recordz × 极音记',  // 厂牌
      '2025-07-15'          // 发行日期
    );
    
    console.log('搜索结果:', {
      success: result.success,
      error: result.error,
      resultsLength: result.results ? result.results.length : 0
    });
    
    if (result.results && result.results.length > 0) {
      console.log('\n=== API返回的记录（前10个）===');
      const displayResults = result.results.slice(0, 10);

      displayResults.forEach((record, index) => {
        console.log(`\n记录 ${index + 1}:`);
        console.log(`  ISRC: ${record.isrc}`);
        console.log(`  歌曲标题: "${record.recordingTitle}"`);
        console.log(`  专辑名称: "${record.releaseName}"`);
        console.log(`  厂牌: "${record.releaseLabel}"`);
        console.log(`  发行日期: ${record.releaseDate}`);
        console.log(`  艺人: "${record.recordingArtistName}"`);
        if (record.icpn) {
          console.log(`  UPC: ${record.icpn}`);
        }
      });

      // 查找匹配的记录
      console.log('\n=== 匹配分析（前10个）===');
      const targetLabel = 'Morphlab Recordz × 极音记'.toLowerCase();

      displayResults.forEach((record, index) => {
        const recordLabel = (record.releaseLabel || '').toLowerCase();
        const isLabelMatch = recordLabel.includes('morphlab') || recordLabel.includes('极音记');

        console.log(`记录 ${index + 1}: 厂牌="${record.releaseLabel}" | 匹配: ${isLabelMatch ? '✓' : '❌'}`);
      });
    }
    
    // 测试您的搜索方式
    console.log('\n=== 模拟您的搜索方式 ===');

    // 1. 先只搜索歌曲名"Trenches"（会有很多结果）
    console.log('\n1. 只搜索歌曲名"Trenches":');
    const result1 = await isrcSearcher.search('', 'Trenches');
    console.log(`结果数量: ${result1.results ? result1.results.length : 0}`);
    console.log('（结果太多，需要加上艺术家名称）');

    // 2. 加上艺术家名称"棍圣"来缩小范围
    console.log('\n2. 搜索艺人"棍圣" + 歌曲"Trenches":');
    const result2 = await isrcSearcher.search('棍圣', 'Trenches');
    console.log(`结果数量: ${result2.results ? result2.results.length : 0}`);

    if (result2.results && result2.results.length > 0) {
      console.log('\n找到的记录:');
      result2.results.forEach((record, index) => {
        console.log(`\n记录 ${index + 1}:`);
        console.log(`  原始数据: ${JSON.stringify(record)}`);
        console.log(`  ISRC: ${record.isrc}`);
        console.log(`  歌曲: "${record.recordingTitle || record.title || 'N/A'}"`);
        console.log(`  艺人: "${record.recordingArtistName || record.artist || 'N/A'}"`);
        console.log(`  专辑: "${record.releaseName || record.album || 'N/A'}"`);
        console.log(`  厂牌: "${record.releaseLabel || record.label || 'N/A'}"`);
        console.log(`  发行日期: ${record.releaseDate || 'N/A'}`);
        if (record.icpn || record.upc) {
          console.log(`  UPC: ${record.icpn || record.upc}`);
        }

        // 检查是否匹配目标厂牌
        const recordLabel = (record.releaseLabel || record.label || '').toLowerCase();
        const isTargetLabel = recordLabel.includes('morphlab') || recordLabel.includes('极音记');
        console.log(`  目标厂牌匹配: ${isTargetLabel ? '✓ 是' : '❌ 否'}`);
      });
    } else {
      console.log('❌ 没有找到匹配的记录');
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    console.error('详细错误:', error);
  }
  
  console.log('\n=== 测试完成 ===');
}

// 运行测试
if (require.main === module) {
  testAPIResponse()
    .then(() => {
      console.log('测试执行完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('测试执行失败:', error);
      process.exit(1);
    });
}

module.exports = { testAPIResponse };
