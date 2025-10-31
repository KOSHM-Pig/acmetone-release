const ISRCSearcher = require('./src/services/isrcService');

async function testLoseYouSong() {
  console.log('=== 测试"失去你 (Original Acoustic Mix)"ISRC搜索 ===');
  
  const isrcSearcher = new ISRCSearcher();
  
  // 测试数据
  const testData = {
    songTitle: '失去你',
    albumTitle: '失去你 (Original Acoustic Mix)',
    label: 'ASPIRE SOUND × 极音记',
    releaseDate: '2025-07-25',
    artists: ['KOSHM', 'YueHeng', 'Geist_GT', 'Arantha L.']
  };
  
  console.log('测试歌曲信息:');
  console.log(`  歌曲: ${testData.songTitle}`);
  console.log(`  专辑: ${testData.albumTitle}`);
  console.log(`  厂牌: ${testData.label}`);
  console.log(`  发行日期: ${testData.releaseDate}`);
  console.log(`  艺人: ${testData.artists.join(', ')}`);
  console.log('');
  
  try {
    // 获取TOKEN状态
    const tokenStatus = isrcSearcher.getTokenStatus();
    console.log('TOKEN状态:', {
      hasToken: tokenStatus.hasToken,
      isExpired: tokenStatus.isExpired,
      remainingTime: tokenStatus.remainingTime
    });
    console.log('');
    
    // 测试多层搜索策略
    console.log('=== 多层搜索策略测试 ===');
    
    // 策略1: 完整信息搜索
    console.log('\n策略1: 完整信息搜索（歌曲+专辑+厂牌+日期）');
    const result1 = await isrcSearcher.searchWithFullInfo(
      testData.songTitle,
      testData.albumTitle,
      testData.label,
      testData.releaseDate
    );
    console.log(`结果: success=${result1.success}, 数量=${result1.results ? result1.results.length : 0}`);
    
    if (result1.results && result1.results.length > 0) {
      console.log('找到的记录:');
      result1.results.slice(0, 3).forEach((record, index) => {
        console.log(`  ${index + 1}. ISRC: ${record.isrc}`);
        console.log(`     歌曲: "${record.recordingTitle}"`);
        console.log(`     专辑: "${record.releaseName}"`);
        console.log(`     厂牌: "${record.releaseLabel}"`);
        console.log(`     艺人: "${record.recordingArtistName}"`);
        if (record.icpn) console.log(`     UPC: ${record.icpn}`);
      });
    }
    
    // 策略2: 去掉厂牌和日期
    console.log('\n策略2: 去掉厂牌和日期（歌曲+专辑）');
    const result2 = await isrcSearcher.searchWithFullInfo(
      testData.songTitle,
      testData.albumTitle,
      '',
      ''
    );
    console.log(`结果: success=${result2.success}, 数量=${result2.results ? result2.results.length : 0}`);
    
    if (result2.results && result2.results.length > 0) {
      console.log('找到的记录（前5个）:');
      result2.results.slice(0, 5).forEach((record, index) => {
        console.log(`  ${index + 1}. ISRC: ${record.isrc}, 厂牌: "${record.releaseLabel}", 艺人: "${record.recordingArtistName}"`);
      });
      
      // 检查是否有目标厂牌
      const targetLabelNoSpaces = testData.label.toLowerCase().replace(/\s+/g, '');
      const matchingLabels = result2.results.filter(record => {
        const recordLabelNoSpaces = (record.releaseLabel || '').toLowerCase().replace(/\s+/g, '');
        return recordLabelNoSpaces === targetLabelNoSpaces;
      });
      
      if (matchingLabels.length > 0) {
        console.log(`\n✓ 找到 ${matchingLabels.length} 个匹配目标厂牌的记录:`);
        matchingLabels.forEach((record, index) => {
          console.log(`  ${index + 1}. ISRC: ${record.isrc}, 厂牌: "${record.releaseLabel}"`);
        });
      } else {
        console.log('\n❌ 没有找到匹配目标厂牌的记录');
      }
    }
    
    // 策略3: 只用歌曲名
    console.log('\n策略3: 只用歌曲名搜索');
    const result3 = await isrcSearcher.searchWithFullInfo(
      testData.songTitle,
      '',
      '',
      ''
    );
    console.log(`结果: success=${result3.success}, 数量=${result3.results ? result3.results.length : 0}`);
    
    if (result3.results && result3.results.length > 0) {
      console.log('找到的记录（前3个）:');
      result3.results.slice(0, 3).forEach((record, index) => {
        console.log(`  ${index + 1}. ISRC: ${record.isrc}, 专辑: "${record.releaseName}", 厂牌: "${record.releaseLabel}"`);
      });
    }
    
    // 艺人匹配测试和最终决策
    console.log('\n=== 艺人匹配测试和最终决策 ===');
    if (result2.results && result2.results.length > 0) {
      console.log('测试艺人匹配逻辑:');

      let bestMatch = null;
      let bestScore = -1;
      let candidates = [];

      result2.results.forEach((record, index) => {
        const recordArtist = (record.recordingArtistName || '').toLowerCase();
        let matchCount = 0;
        let matchedArtists = [];

        testData.artists.forEach(artist => {
          if (recordArtist.includes(artist.toLowerCase())) {
            matchCount++;
            matchedArtists.push(artist);
          }
        });

        const matchRate = ((matchCount / testData.artists.length) * 100).toFixed(1);
        console.log(`  ${index + 1}. "${record.recordingArtistName}" - 匹配: ${matchCount}/${testData.artists.length} (${matchRate}%)`);
        if (matchedArtists.length > 0) {
          console.log(`     匹配的艺人: ${matchedArtists.join(', ')}`);
        }

        // 计算综合得分
        let score = 0;

        // 艺人匹配得分 (0-100)
        const artistScore = (matchCount / testData.artists.length) * 100;
        score += artistScore * 0.6; // 艺人匹配权重60%

        // 厂牌匹配得分 (0-40)
        const recordLabelNoSpaces = (record.releaseLabel || '').toLowerCase().replace(/\s+/g, '');
        const targetLabelNoSpaces = testData.label.toLowerCase().replace(/\s+/g, '');
        const labelScore = recordLabelNoSpaces === targetLabelNoSpaces ? 40 : 0;
        score += labelScore * 0.4; // 厂牌匹配权重40%

        console.log(`     综合得分: ${score.toFixed(1)} (艺人: ${artistScore.toFixed(1)}, 厂牌: ${labelScore})`);

        candidates.push({
          record,
          score,
          artistScore,
          labelScore,
          matchedArtists
        });

        if (score > bestScore) {
          bestScore = score;
          bestMatch = { record, score, artistScore, labelScore, matchedArtists };
        }
      });

      // 显示最终决策
      console.log('\n=== 最终决策 ===');
      if (bestMatch && bestMatch.score > 0) {
        console.log(`✓ 选择最佳匹配记录:`);
        console.log(`  ISRC: ${bestMatch.record.isrc}`);
        console.log(`  歌曲: "${bestMatch.record.recordingTitle}"`);
        console.log(`  艺人: "${bestMatch.record.recordingArtistName}"`);
        console.log(`  专辑: "${bestMatch.record.releaseName}"`);
        console.log(`  厂牌: "${bestMatch.record.releaseLabel}"`);
        if (bestMatch.record.icpn) {
          console.log(`  UPC: ${bestMatch.record.icpn}`);
        }
        console.log(`  综合得分: ${bestMatch.score.toFixed(1)}/100`);
        console.log(`  匹配的艺人: ${bestMatch.matchedArtists.join(', ') || '无'}`);
      } else {
        console.log(`❌ 没有找到合适的匹配记录`);
        console.log(`所有候选记录的得分都为0，可能需要调整匹配策略`);
      }

      // 显示得分排序
      console.log('\n=== 所有候选记录得分排序 ===');
      candidates.sort((a, b) => b.score - a.score);
      candidates.slice(0, 5).forEach((candidate, index) => {
        console.log(`${index + 1}. ISRC: ${candidate.record.isrc}, 得分: ${candidate.score.toFixed(1)}, 厂牌: "${candidate.record.releaseLabel}"`);
      });
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    console.error('详细错误:', error);
  }
  
  console.log('\n=== 测试完成 ===');
}

// 运行测试
if (require.main === module) {
  testLoseYouSong()
    .then(() => {
      console.log('测试执行完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('测试执行失败:', error);
      process.exit(1);
    });
}

module.exports = { testLoseYouSong };
