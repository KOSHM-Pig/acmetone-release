/**
 * ffmpeg测试脚本
 * 用于验证ffmpeg安装和配置是否正确
 */

const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffprobePath = require('@ffprobe-installer/ffprobe').path;

// 设置ffmpeg路径
ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

console.log('=== ffmpeg配置信息 ===');
console.log('ffmpeg路径:', ffmpegPath);
console.log('ffprobe路径:', ffprobePath);

// 检查ffmpeg可执行文件是否存在
console.log('\n=== 检查ffmpeg可执行文件 ===');
if (fs.existsSync(ffmpegPath)) {
  console.log('✅ ffmpeg可执行文件存在');
} else {
  console.error('❌ ffmpeg可执行文件不存在!');
}

if (fs.existsSync(ffprobePath)) {
  console.log('✅ ffprobe可执行文件存在');
} else {
  console.error('❌ ffprobe可执行文件不存在!');
}

// 创建测试目录
const testDir = path.join(__dirname, '../test-ffmpeg');
if (!fs.existsSync(testDir)) {
  fs.mkdirSync(testDir, { recursive: true });
}

// 创建测试音频文件
const testWavPath = path.join(testDir, 'test.wav');
const testMp3Path = path.join(testDir, 'test.mp3');

// 尝试获取ffmpeg版本信息
console.log('\n=== 获取ffmpeg版本信息 ===');
try {
  ffmpeg.getAvailableFormats(function(err, formats) {
    if (err) {
      console.error('❌ 获取格式失败:', err);
    } else {
      console.log('✅ 可用格式列表:', Object.keys(formats).length, '个格式');
    }
    
    // 创建简单的测试WAV文件
    console.log('\n=== 创建测试WAV文件 ===');
    // 创建一个简单的1KB二进制文件作为测试用途
    if (!fs.existsSync(testWavPath)) {
      try {
        const buffer = Buffer.alloc(1024);
        // 写入简单的WAV文件头
        buffer.write('RIFF', 0);
        buffer.writeUInt32LE(1024 - 8, 4);
        buffer.write('WAVE', 8);
        buffer.write('fmt ', 12);
        fs.writeFileSync(testWavPath, buffer);
        console.log('✅ 测试文件创建成功');
      } catch (err) {
        console.error('❌ 创建测试文件失败:', err);
      }
    } else {
      console.log('✅ 测试文件已存在');
    }

    // 尝试转换测试
    console.log('\n=== 尝试转换测试 ===');
    testConversion();
  });
} catch (err) {
  console.error('❌ 获取ffmpeg版本信息失败:', err);
}

// 测试WAV到MP3的转换
function testConversion() {
  console.log('开始测试WAV到MP3的转换...');
  
  // 如果已存在测试MP3文件，先删除
  if (fs.existsSync(testMp3Path)) {
    fs.unlinkSync(testMp3Path);
  }
  
  try {
    ffmpeg(testWavPath)
      .audioBitrate('128k')
      .audioCodec('libmp3lame')
      .format('mp3')
      .on('error', function(err) {
        console.error('❌ 转换失败:', err);
      })
      .on('progress', function(progress) {
        console.log('处理进度:', progress.percent ? progress.percent.toFixed(1) : 0, '%');
      })
      .on('end', function() {
        console.log('✅ 转换完成!');
        
        // 验证生成的MP3文件
        if (fs.existsSync(testMp3Path)) {
          const stats = fs.statSync(testMp3Path);
          console.log('生成的MP3文件大小:', stats.size, '字节');
          if (stats.size > 0) {
            console.log('✅ 转换测试成功!');
          } else {
            console.error('❌ 生成的MP3文件大小为0!');
          }
        } else {
          console.error('❌ 未找到生成的MP3文件!');
        }
      })
      .save(testMp3Path);
  } catch (err) {
    console.error('❌ 启动转换过程失败:', err);
  }
} 