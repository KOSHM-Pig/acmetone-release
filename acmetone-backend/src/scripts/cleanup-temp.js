/**
 * 清理临时文件的脚本
 * 
 * 使用方法: node src/scripts/cleanup-temp.js
 */

const fs = require('fs');
const path = require('path');

// 清理临时文件
const cleanupTempFiles = () => {
  try {
    console.log('开始清理临时文件...');
    
    // 清理临时文件夹
    const tempDir = path.join(__dirname, '../../temp');
    
    if (fs.existsSync(tempDir)) {
      const files = fs.readdirSync(tempDir);
      console.log(`找到 ${files.length} 个临时文件`);
      
      let deletedCount = 0;
      
      for (const file of files) {
        try {
          const filePath = path.join(tempDir, file);
          fs.unlinkSync(filePath);
          deletedCount++;
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

// 执行清理
cleanupTempFiles(); 