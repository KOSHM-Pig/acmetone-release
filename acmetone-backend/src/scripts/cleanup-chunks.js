/**
 * 清理过期的分片文件和临时文件的脚本
 * 
 * 使用方法: node src/scripts/cleanup-chunks.js [--force]
 * 参数:
 *   --force: 强制清理所有分片和临时文件，不考虑时间
 */

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const rimraf = promisify(require('rimraf'));

// 检查是否使用--force参数
const forceCleanup = process.argv.includes('--force');

// 清理过期的分片文件
const cleanupExpiredChunks = async () => {
  try {
    console.log('开始清理分片文件...');
    const chunksDir = path.join(__dirname, '../../uploads/chunks');
    
    // 检查目录是否存在
    if (!fs.existsSync(chunksDir)) {
      console.log('分片目录不存在，跳过清理');
      return;
    }
    
    // 获取目录中的所有文件夹
    const chunkFolders = fs.readdirSync(chunksDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);
    
    console.log(`找到 ${chunkFolders.length} 个分片目录`);
    
    // 当前时间
    const now = Date.now();
    // 24小时前的时间戳（毫秒）
    const expirationTime = now - (24 * 60 * 60 * 1000);
    
    let deletedCount = 0;
    
    // 检查每个文件夹
    for (const folder of chunkFolders) {
      try {
        const folderPath = path.join(chunksDir, folder);
        const stats = fs.statSync(folderPath);
        
        // 如果使用--force参数或文件夹创建时间超过24小时，删除它
        if (forceCleanup || stats.birthtimeMs < expirationTime || stats.mtimeMs < expirationTime) {
          await rimraf(folderPath);
          console.log(`已删除分片目录: ${folder}`);
          deletedCount++;
        }
      } catch (err) {
        console.error(`清理分片目录 ${folder} 失败:`, err);
      }
    }
    
    console.log(`分片清理完成，共删除 ${deletedCount} 个分片目录`);
  } catch (error) {
    console.error('清理分片文件失败:', error);
  }
};

// 清理临时文件夹
const cleanupTempFiles = async () => {
  try {
    console.log('开始清理临时文件...');
    const tempDir = path.join(__dirname, '../../temp');
    
    // 检查目录是否存在
    if (!fs.existsSync(tempDir)) {
      console.log('临时目录不存在，跳过清理');
      return;
    }
    
    // 获取目录中的所有文件
    const tempFiles = fs.readdirSync(tempDir, { withFileTypes: true })
      .filter(dirent => dirent.isFile())
      .map(dirent => dirent.name);
    
    console.log(`找到 ${tempFiles.length} 个临时文件`);
    
    // 当前时间
    const now = Date.now();
    // 24小时前的时间戳（毫秒）
    const expirationTime = now - (24 * 60 * 60 * 1000);
    
    let deletedCount = 0;
    
    // 检查每个文件
    for (const file of tempFiles) {
      try {
        const filePath = path.join(tempDir, file);
        const stats = fs.statSync(filePath);
        
        // 如果使用--force参数或文件创建时间超过24小时，删除它
        if (forceCleanup || stats.birthtimeMs < expirationTime || stats.mtimeMs < expirationTime) {
          fs.unlinkSync(filePath);
          console.log(`已删除临时文件: ${file}`);
          deletedCount++;
        }
      } catch (err) {
        console.error(`清理临时文件 ${file} 失败:`, err);
      }
    }
    
    console.log(`临时文件清理完成，共删除 ${deletedCount} 个临时文件`);
  } catch (error) {
    console.error('清理临时文件失败:', error);
  }
};

// 执行清理
const runCleanup = async () => {
  console.log(`开始执行清理任务${forceCleanup ? ' (强制模式)' : ''}`);
  await cleanupExpiredChunks();
  await cleanupTempFiles();
  console.log('清理任务完成');
};

// 运行清理
runCleanup(); 