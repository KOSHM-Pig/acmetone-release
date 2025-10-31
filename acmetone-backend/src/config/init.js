const { User } = require('../models');
const bcrypt = require('bcryptjs');

const initAdminUser = async () => {
  try {
    const adminExists = await User.findOne({
      where: { username: 'admin' }
    });

    if (!adminExists) {
      // 手动加密密码
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      await User.create({
        username: 'admin',
        email: 'admin@acmetone.com',
        password: hashedPassword,
        role: 'admin'
      });
      console.log('管理员账号已创建');
    } else {
      console.log('管理员账号已存在');
    }
  } catch (error) {
    console.error('创建管理员账号失败:', error);
    throw error;
  }
};

module.exports = {
  initAdminUser
}; 