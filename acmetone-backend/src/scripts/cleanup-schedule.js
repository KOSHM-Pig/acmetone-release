/**
 * 定期清理临时文件和过期分片的脚本
 * 
 * 使用方法: node src/scripts/cleanup-schedule.js
 * 可以添加到crontab中定期执行，每4小时运行一次
 */

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const rimraf = promisify(require('rimraf'));

// 清理临时文件
const cleanupTempFiles = async () => {
  try {
    console.log(`[${new Date().toISOString()}] 开始清理临时文件...`);
    
    // 清理临时文件夹
    const tempDir = path.join(__dirname, '../../temp');
    
    if (fs.existsSync(tempDir)) {
      const files = fs.readdirSync(tempDir);
      console.log(`找到 ${files.length} 个临时文件`);
      
      let deletedCount = 0;
      
      for (const file of files) {
        try {
          const filePath = path.join(tempDir, file);
          const stats = fs.statSync(filePath);
          
          // 删除所有超过1小时的临时文件
          const fileAge = Date.now() - stats.mtimeMs;
          const oneHour = 60 * 60 * 1000;
          
          if (fileAge > oneHour) {
            fs.unlinkSync(filePath);
            deletedCount++;
          }
        } catch (err) {
          console.error(`删除临时文件 ${file} 失败:`, err);
        }
      }
      
      console.log(`成功删除 ${deletedCount} 个临时文件`);
    } else {
      console.log('临时目录不存在');
    }
  } catch (error) {
    console.error('清理临时文件失败:', error);
  }
};

// 清理过期的分片文件
const cleanupExpiredChunks = async () => {
  try {
    console.log(`[${new Date().toISOString()}] 开始清理过期的分片文件...`);
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
        
        // 如果文件夹创建时间超过24小时，删除它
        if (stats.birthtimeMs < expirationTime || stats.mtimeMs < expirationTime) {
          await rimraf(folderPath);
          console.log(`已删除过期分片目录: ${folder}`);
          deletedCount++;
        }
      } catch (err) {
        console.error(`清理分片目录 ${folder} 失败:`, err);
      }
    }
    
    console.log(`清理完成，共删除 ${deletedCount} 个过期分片目录`);
  } catch (error) {
    console.error('清理过期分片文件失败:', error);
  }
};

// 清理MP3缓存文件
const cleanupMp3Cache = async () => {
  try {
    console.log(`[${new Date().toISOString()}] 开始清理MP3缓存文件...`);
    const mp3CacheDir = path.join(__dirname, '../../uploads/mp3cache');
    
    // 检查目录是否存在
    if (!fs.existsSync(mp3CacheDir)) {
      console.log('MP3缓存目录不存在，跳过清理');
      return;
    }
    
    // 获取目录中的所有文件
    const mp3Files = fs.readdirSync(mp3CacheDir, { withFileTypes: true })
      .filter(dirent => dirent.isFile())
      .map(dirent => dirent.name);
    
    console.log(`找到 ${mp3Files.length} 个MP3缓存文件`);
    
    // 当前时间
    const now = Date.now();
    // 7天前的时间戳（毫秒）
    const expirationTime = now - (7 * 24 * 60 * 60 * 1000);
    
    let deletedCount = 0;
    
    // 检查每个文件
    for (const file of mp3Files) {
      try {
        const filePath = path.join(mp3CacheDir, file);
        const stats = fs.statSync(filePath);
        
        // 如果文件创建时间超过7天，删除它
        if (stats.birthtimeMs < expirationTime || stats.mtimeMs < expirationTime) {
          fs.unlinkSync(filePath);
          console.log(`已删除过期MP3缓存文件: ${file}`);
          deletedCount++;
        }
      } catch (err) {
        console.error(`清理MP3缓存文件 ${file} 失败:`, err);
      }
    }
    
    console.log(`清理完成，共删除 ${deletedCount} 个过期MP3缓存文件`);
  } catch (error) {
    console.error('清理MP3缓存文件失败:', error);
  }
};

// 主函数
const main = async () => {
  console.log(`[${new Date().toISOString()}] 开始执行清理任务...`);
  
  try {
    // 清理临时文件
    await cleanupTempFiles();
    
    // 清理过期的分片文件
    await cleanupExpiredChunks();
    
    // 清理MP3缓存文件
    await cleanupMp3Cache();
    
    console.log(`[${new Date().toISOString()}] 清理任务完成`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] 清理任务失败:`, error);
  }
};

// 执行主函数
main(); 