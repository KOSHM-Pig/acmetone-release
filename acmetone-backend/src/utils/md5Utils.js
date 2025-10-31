const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffprobePath = require('@ffprobe-installer/ffprobe').path;

// 设置ffmpeg路径
ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

/**
 * 计算文件的MD5哈希值
 * @param {string} filePath - 文件路径
 * @returns {Promise<string>} - MD5哈希值（32位小写字符串）
 */
function calculateFileMD5(filePath) {
  return new Promise((resolve, reject) => {
    try {
      // 检查文件是否存在
      if (!fs.existsSync(filePath)) {
        return reject(new Error(`文件不存在: ${filePath}`));
      }

      const hash = crypto.createHash('md5');
      const stream = fs.createReadStream(filePath);

      stream.on('error', (err) => {
        reject(new Error(`读取文件失败: ${err.message}`));
      });

      stream.on('data', (data) => {
        hash.update(data);
      });

      stream.on('end', () => {
        const md5Hash = hash.digest('hex').toLowerCase();
        console.log(`文件 ${path.basename(filePath)} 的MD5值: ${md5Hash}`);
        resolve(md5Hash);
      });
    } catch (error) {
      reject(new Error(`计算MD5失败: ${error.message}`));
    }
  });
}

/**
 * 验证文件的MD5哈希值
 * @param {string} filePath - 文件路径
 * @param {string} expectedMD5 - 期望的MD5值
 * @returns {Promise<boolean>} - 验证结果
 */
async function verifyFileMD5(filePath, expectedMD5) {
  try {
    if (!expectedMD5) {
      console.warn(`文件 ${path.basename(filePath)} 没有存储的MD5值，跳过验证`);
      return true; // 如果没有存储的MD5值，认为验证通过
    }

    const actualMD5 = await calculateFileMD5(filePath);
    const isValid = actualMD5.toLowerCase() === expectedMD5.toLowerCase();
    
    if (isValid) {
      console.log(`文件 ${path.basename(filePath)} MD5验证通过`);
    } else {
      console.error(`文件 ${path.basename(filePath)} MD5验证失败:`, {
        expected: expectedMD5,
        actual: actualMD5
      });
    }
    
    return isValid;
  } catch (error) {
    console.error(`MD5验证过程中出错:`, error.message);
    return false;
  }
}

/**
 * 批量计算多个文件的MD5值
 * @param {Array<string>} filePaths - 文件路径数组
 * @returns {Promise<Object>} - 文件路径到MD5值的映射
 */
async function calculateMultipleFilesMD5(filePaths) {
  const results = {};
  
  for (const filePath of filePaths) {
    try {
      results[filePath] = await calculateFileMD5(filePath);
    } catch (error) {
      console.error(`计算文件 ${filePath} 的MD5失败:`, error.message);
      results[filePath] = null;
    }
  }
  
  return results;
}

/**
 * 更新歌曲记录的MD5值
 * @param {Object} Song - Song模型
 * @param {number} songId - 歌曲ID
 * @param {string} md5Hash - MD5哈希值
 * @returns {Promise<boolean>} - 更新结果
 */
async function updateSongMD5(Song, songId, md5Hash) {
  try {
    const [affectedRows] = await Song.update(
      { md5: md5Hash },
      { where: { id: songId } }
    );
    
    if (affectedRows > 0) {
      console.log(`歌曲ID ${songId} 的MD5值已更新: ${md5Hash}`);
      return true;
    } else {
      console.warn(`歌曲ID ${songId} 未找到，MD5值更新失败`);
      return false;
    }
  } catch (error) {
    console.error(`更新歌曲ID ${songId} 的MD5值失败:`, error.message);
    return false;
  }
}

/**
 * 获取音频文件时长
 * @param {string} filePath - 音频文件路径
 * @returns {Promise<number>} - 音频时长（秒）
 */
function getAudioDuration(filePath) {
  return new Promise((resolve, reject) => {
    try {
      // 检查文件是否存在
      if (!fs.existsSync(filePath)) {
        return reject(new Error(`文件不存在: ${filePath}`));
      }

      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) {
          console.error('获取音频时长失败:', err);
          return reject(new Error(`获取音频时长失败: ${err.message}`));
        }
        
        // 从元数据中提取时长（秒）
        const durationInSeconds = Math.round(metadata.format.duration);
        console.log(`音频文件 ${path.basename(filePath)} 时长: ${durationInSeconds} 秒`);
        resolve(durationInSeconds);
      });
    } catch (error) {
      reject(new Error(`获取音频时长过程中出错: ${error.message}`));
    }
  });
}

/**
 * 验证音频文件时长
 * @param {string} filePath - 音频文件路径
 * @param {number} expectedDuration - 期望的时长（秒）
 * @param {number} tolerance - 允许的误差范围（秒），默认为2秒
 * @returns {Promise<boolean>} - 验证结果
 */
async function verifyAudioDuration(filePath, expectedDuration, tolerance = 2) {
  try {
    if (!expectedDuration || expectedDuration <= 0) {
      console.warn(`文件 ${path.basename(filePath)} 没有存储的时长值，跳过验证`);
      return true; // 如果没有存储的时长值，认为验证通过
    }

    const actualDuration = await getAudioDuration(filePath);
    const difference = Math.abs(actualDuration - expectedDuration);
    const isValid = difference <= tolerance;
    
    if (isValid) {
      console.log(`文件 ${path.basename(filePath)} 时长验证通过 (期望: ${expectedDuration}s, 实际: ${actualDuration}s, 误差: ${difference}s)`);
    } else {
      console.error(`文件 ${path.basename(filePath)} 时长验证失败:`, {
        expected: expectedDuration,
        actual: actualDuration,
        difference: difference,
        tolerance: tolerance
      });
    }
    
    return isValid;
  } catch (error) {
    console.error(`时长验证过程中出错:`, error.message);
    return false;
  }
}

/**
 * 综合验证音频文件（MD5 + 时长）
 * @param {string} filePath - 音频文件路径
 * @param {string} expectedMD5 - 期望的MD5值
 * @param {number} expectedDuration - 期望的时长（秒）
 * @param {number} tolerance - 时长允许的误差范围（秒），默认为2秒
 * @returns {Promise<Object>} - 验证结果对象
 */
async function verifyAudioFile(filePath, expectedMD5, expectedDuration, tolerance = 2) {
  const result = {
    filePath: filePath,
    fileName: path.basename(filePath),
    md5Valid: false,
    durationValid: false,
    overallValid: false,
    errors: []
  };

  try {
    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
      result.errors.push('文件不存在');
      return result;
    }

    // 验证MD5
    if (expectedMD5) {
      try {
        result.md5Valid = await verifyFileMD5(filePath, expectedMD5);
        if (!result.md5Valid) {
          result.errors.push('MD5验证失败');
        }
      } catch (error) {
        result.errors.push(`MD5验证出错: ${error.message}`);
      }
    } else {
      result.errors.push('缺少MD5值');
    }

    // 验证时长
    if (expectedDuration && expectedDuration > 0) {
      try {
        result.durationValid = await verifyAudioDuration(filePath, expectedDuration, tolerance);
        if (!result.durationValid) {
          result.errors.push('时长验证失败');
        }
      } catch (error) {
        result.errors.push(`时长验证出错: ${error.message}`);
      }
    } else {
      result.errors.push('缺少时长值');
    }

    // 只有MD5和时长都验证通过才认为文件有效
    result.overallValid = result.md5Valid && result.durationValid;

    if (result.overallValid) {
      console.log(`✅ 文件 ${result.fileName} 综合验证通过`);
    } else {
      console.error(`❌ 文件 ${result.fileName} 综合验证失败:`, result.errors);
    }

  } catch (error) {
    result.errors.push(`验证过程中出错: ${error.message}`);
    console.error(`文件 ${result.fileName} 验证过程中出错:`, error.message);
  }

  return result;
}

module.exports = {
  calculateFileMD5,
  verifyFileMD5,
  calculateMultipleFilesMD5,
  updateSongMD5,
  getAudioDuration,
  verifyAudioDuration,
  verifyAudioFile
};
