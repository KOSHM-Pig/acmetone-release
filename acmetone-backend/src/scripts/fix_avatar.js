const { sequelize } = require('../config/db');
const { User } = require('../models');

async function fixAvatarField() {
  try {
    console.log('开始修复avatar字段...');
    
    // 获取所有用户
    const users = await User.findAll();
    console.log(`找到 ${users.length} 个用户`);
    
    // 检查每个用户的avatar字段
    for (const user of users) {
      console.log(`检查用户 ${user.id} (${user.username})...`);
      console.log('当前头像值:', user.avatar);
      
      // 如果头像字段为undefined，但有上传的头像文件
      if (!user.avatar) {
        // 查找可能的头像文件
        const fs = require('fs');
        const path = require('path');
        const imagesDir = path.resolve(__dirname, '../../uploads/images');
        
        if (fs.existsSync(imagesDir)) {
          const files = fs.readdirSync(imagesDir);
          const avatarFiles = files.filter(file => 
            file.startsWith(`avatar_${user.id}_`) && 
            (file.endsWith('.jpg') || file.endsWith('.png'))
          );
          
          if (avatarFiles.length > 0) {
            // 使用最新的头像文件
            avatarFiles.sort((a, b) => {
              // 提取时间戳
              const timestampA = parseInt(a.split('_')[2].split('.')[0]);
              const timestampB = parseInt(b.split('_')[2].split('.')[0]);
              return timestampB - timestampA; // 降序排列
            });
            
            const newestAvatar = avatarFiles[0];
            const avatarUrl = `/uploads/images/${newestAvatar}`;
            
            console.log(`找到头像文件: ${newestAvatar}`);
            console.log(`设置头像URL: ${avatarUrl}`);
            
            // 更新用户头像
            user.avatar = avatarUrl;
            await user.save();
            console.log('头像已更新');
          } else {
            console.log('没有找到头像文件');
          }
        } else {
          console.log('图片目录不存在');
        }
      } else {
        console.log('头像字段已存在，无需修复');
      }
    }
    
    console.log('修复完成');
    process.exit(0);
  } catch (error) {
    console.error('修复过程中出错:', error);
    process.exit(1);
  }
}

// 运行修复脚本
fixAvatarField(); 