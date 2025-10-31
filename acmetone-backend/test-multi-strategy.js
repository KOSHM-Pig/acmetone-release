const autoFetchISRC = require('./src/scheduler/tasks/autoFetchISRC');

async function testMultiStrategySearch() {
  console.log('=== 测试多层搜索策略的ISRC任务 ===');
  
  try {
    console.log('开始执行ISRC获取任务（使用新的多层搜索策略）...');
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
      
      if (result.foundISRC > 0) {
        console.log('');
        console.log('🎉 成功找到ISRC！新的多层搜索策略生效了！');
        console.log('');
        console.log('搜索策略说明:');
        console.log('  策略1: 完整信息搜索（歌曲+专辑+厂牌+日期）');
        console.log('  策略2: 简化搜索（歌曲+专辑）');
        console.log('  策略3: 艺人搜索（艺人+歌曲）');
      }
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
  testMultiStrategySearch()
    .then(() => {
      console.log('测试执行完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('测试执行失败:', error);
      process.exit(1);
    });
}

module.exports = { testMultiStrategySearch };
