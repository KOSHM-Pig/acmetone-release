const { User } = require('../models');

async function createAdminUser() {
  try {
    // 检查是否已存在管理员用户
    const existingAdmin = await User.findOne({
      where: { username: 'admin' }
    });

    if (existingAdmin) {
      console.log('管理员用户已存在');
      return;
    }

    // 创建管理员用户
    const adminUser = await User.create({
      username: 'admin',
      email: 'admin@acmetone.com',
      password: 'admin123',
      role: 'admin'
    });

    console.log('管理员用户创建成功:', adminUser.username);
  } catch (error) {
    console.error('创建管理员用户失败:', error);
  }
}

// 执行创建管理员用户
createAdminUser(); 