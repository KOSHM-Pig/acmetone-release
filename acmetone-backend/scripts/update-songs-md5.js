const path = require('path');
const fs = require('fs');

// 设置项目根目录
const projectRoot = path.join(__dirname, '..');
process.chdir(projectRoot);

const { Song } = require('./src/models');
const { calculateFileMD5 } = require('./src/utils/md5Utils');

/**
 * 批量更新现有歌曲的MD5值
 */
async function updateExistingSongsMD5() {
  console.log('开始批量更新现有歌曲的MD5值...');
  
  try {
    // 获取所有没有MD5值的歌曲
    const songs = await Song.findAll({
      where: {
        md5: null,
        wavFile: {
          [require('sequelize').Op.ne]: null
        }
      },
      attributes: ['id', 'title', 'wavFile']
    });

    console.log(`找到 ${songs.length} 首需要计算MD5的歌曲`);

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    for (let i = 0; i < songs.length; i++) {
      const song = songs[i];
      console.log(`\n[${i + 1}/${songs.length}] 处理歌曲: ${song.title} (ID: ${song.id})`);
      
      try {
        // 构建文件绝对路径
        const filePath = path.join(__dirname, '..', song.wavFile);
        console.log(`文件路径: ${filePath}`);
        
        // 检查文件是否存在
        if (!fs.existsSync(filePath)) {
          console.warn(`文件不存在，跳过: ${filePath}`);
          errorCount++;
          errors.push({
            songId: song.id,
            title: song.title,
            error: '文件不存在'
          });
          continue;
        }

        // 计算MD5
        const md5Hash = await calculateFileMD5(filePath);
        
        // 更新数据库
        await Song.update(
          { md5: md5Hash },
          { where: { id: song.id } }
        );
        
        console.log(`✅ 成功更新 MD5: ${md5Hash}`);
        successCount++;
        
        // 每处理10首歌曲暂停一下，避免过度占用资源
        if ((i + 1) % 10 === 0) {
          console.log(`已处理 ${i + 1} 首歌曲，暂停1秒...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
      } catch (error) {
        console.error(`❌ 处理失败: ${error.message}`);
        errorCount++;
        errors.push({
          songId: song.id,
          title: song.title,
          error: error.message
        });
      }
    }

    // 输出统计结果
    console.log('\n' + '='.repeat(50));
    console.log('批量更新完成！');
    console.log(`总计歌曲: ${songs.length}`);
    console.log(`成功更新: ${successCount}`);
    console.log(`失败数量: ${errorCount}`);
    
    if (errors.length > 0) {
      console.log('\n失败详情:');
      errors.forEach((error, index) => {
        console.log(`${index + 1}. 歌曲ID ${error.songId} (${error.title}): ${error.error}`);
      });
    }

    return {
      total: songs.length,
      success: successCount,
      error: errorCount,
      errors: errors
    };

  } catch (error) {
    console.error('批量更新过程中发生错误:', error);
    throw error;
  }
}

/**
 * 验证现有歌曲的MD5值
 */
async function verifyExistingSongsMD5() {
  console.log('开始验证现有歌曲的MD5值...');
  
  try {
    // 获取所有有MD5值的歌曲
    const songs = await Song.findAll({
      where: {
        md5: {
          [require('sequelize').Op.ne]: null
        },
        wavFile: {
          [require('sequelize').Op.ne]: null
        }
      },
      attributes: ['id', 'title', 'wavFile', 'md5']
    });

    console.log(`找到 ${songs.length} 首需要验证MD5的歌曲`);

    let validCount = 0;
    let invalidCount = 0;
    let errorCount = 0;
    const issues = [];

    for (let i = 0; i < songs.length; i++) {
      const song = songs[i];
      console.log(`\n[${i + 1}/${songs.length}] 验证歌曲: ${song.title} (ID: ${song.id})`);
      
      try {
        // 构建文件绝对路径
        const filePath = path.join(__dirname, '..', song.wavFile);
        
        // 检查文件是否存在
        if (!fs.existsSync(filePath)) {
          console.warn(`文件不存在: ${filePath}`);
          errorCount++;
          issues.push({
            songId: song.id,
            title: song.title,
            issue: '文件不存在',
            storedMD5: song.md5
          });
          continue;
        }

        // 计算当前文件的MD5
        const currentMD5 = await calculateFileMD5(filePath);
        
        if (currentMD5.toLowerCase() === song.md5.toLowerCase()) {
          console.log(`✅ MD5验证通过`);
          validCount++;
        } else {
          console.error(`❌ MD5验证失败! 存储值: ${song.md5}, 实际值: ${currentMD5}`);
          invalidCount++;
          issues.push({
            songId: song.id,
            title: song.title,
            issue: 'MD5不匹配',
            storedMD5: song.md5,
            actualMD5: currentMD5
          });
        }
        
      } catch (error) {
        console.error(`验证失败: ${error.message}`);
        errorCount++;
        issues.push({
          songId: song.id,
          title: song.title,
          issue: `验证错误: ${error.message}`,
          storedMD5: song.md5
        });
      }
    }

    // 输出验证结果
    console.log('\n' + '='.repeat(50));
    console.log('MD5验证完成！');
    console.log(`总计歌曲: ${songs.length}`);
    console.log(`验证通过: ${validCount}`);
    console.log(`验证失败: ${invalidCount}`);
    console.log(`错误数量: ${errorCount}`);
    
    if (issues.length > 0) {
      console.log('\n问题详情:');
      issues.forEach((issue, index) => {
        console.log(`${index + 1}. 歌曲ID ${issue.songId} (${issue.title}):`);
        console.log(`   问题: ${issue.issue}`);
        if (issue.storedMD5) console.log(`   存储MD5: ${issue.storedMD5}`);
        if (issue.actualMD5) console.log(`   实际MD5: ${issue.actualMD5}`);
      });
    }

    return {
      total: songs.length,
      valid: validCount,
      invalid: invalidCount,
      error: errorCount,
      issues: issues
    };

  } catch (error) {
    console.error('MD5验证过程中发生错误:', error);
    throw error;
  }
}

// 主函数
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'update';

  try {
    if (command === 'update') {
      await updateExistingSongsMD5();
    } else if (command === 'verify') {
      await verifyExistingSongsMD5();
    } else {
      console.log('用法:');
      console.log('  node scripts/update-songs-md5.js update   # 更新现有歌曲的MD5值');
      console.log('  node scripts/update-songs-md5.js verify   # 验证现有歌曲的MD5值');
      process.exit(1);
    }
  } catch (error) {
    console.error('执行失败:', error);
    process.exit(1);
  }

  process.exit(0);
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = {
  updateExistingSongsMD5,
  verifyExistingSongsMD5
};
