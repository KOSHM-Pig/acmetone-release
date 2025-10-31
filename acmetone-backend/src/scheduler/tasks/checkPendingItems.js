const { Op } = require('sequelize');
const moment = require('moment-timezone');
const fs = require('fs').promises;
const path = require('path');
const { 
  Album, 
  PromotionRequest, 
  DynamicCoverRequest, 
  ArtistEditRequest, 
  MaterialTemplate,
  User,
  TaskExecutionLog 
} = require('../../models');
const { sendMail } = require('../../utils/emailService');

// 确保日志目录存在
const ensureLogDirectory = async (directory) => {
  try {
    await fs.mkdir(directory, { recursive: true });
    return directory;
  } catch (error) {
    console.error(`创建日志目录失败: ${directory}`, error);
    throw error;
  }
};

// 创建日志文件
const createLogFile = async (directory, taskId) => {
  const now = moment().tz('Asia/Shanghai');
  const dateStr = now.format('YYYY-MM-DD');
  const timeStr = now.format('HH-mm-ss');
  
  // 确保目录存在
  await ensureLogDirectory(directory);
  
  // 创建日志文件名
  const logFileName = `${taskId}_${dateStr}_${timeStr}.log`;
  const logFilePath = path.join(directory, logFileName);
  
  // 创建空日志文件
  await fs.writeFile(logFilePath, '', 'utf8');
  
  return logFilePath;
};

// 写入日志
const writeLog = async (logFile, message) => {
  try {
    const timestamp = moment().tz('Asia/Shanghai').format('YYYY-MM-DD HH:mm:ss');
    const logMessage = `[${timestamp}] ${message}\n`;
    await fs.appendFile(logFile, logMessage, 'utf8');
  } catch (error) {
    console.error(`写入日志失败: ${logFile}`, error);
  }
};

// 检查未审核内容并通知管理员
const checkPendingItems = async (taskInfo) => {
  let logFile = null;
  let executionLog = null;
  
  try {
    // 如果任务被暂停，则不执行
    if (taskInfo.status === 'paused') {
      console.log('任务已暂停，跳过执行');
      return {
        success: false,
        message: '任务已暂停'
      };
    }
    
    // 创建日志目录和文件
    const baseLogDir = taskInfo.logDirectory || 'logs/scheduler/checkPendingItems';
    const logDir = path.join(process.cwd(), baseLogDir, moment().tz('Asia/Shanghai').format('YYYY-MM-DD'));
    logFile = await createLogFile(logDir, 'checkPendingItems');
    
    // 创建执行日志记录
    executionLog = await TaskExecutionLog.create({
      taskId: 'checkPendingItems',
      startTime: new Date(),
      status: 'running',
      logFile: logFile
    });
    
    await writeLog(logFile, '执行检查未审核内容任务开始');
    
    // 获取当前北京时间
    const nowBeijing = moment().tz('Asia/Shanghai');
    await writeLog(logFile, `当前北京时间: ${nowBeijing.format('YYYY-MM-DD HH:mm:ss')}`);
    
    // 检查5种未审核内容
    const pendingItems = {};
    
    // 1. 未审核的专辑
    const pendingAlbums = await Album.findAll({
      where: { 
        status: 'pending',
        [Op.or]: [
          { comment: null },
          { comment: '' },
          {
            comment: {
              [Op.notLike]: 'DRAFT: 尚未提交审核%'
            }
          }
        ]
      },
      order: [['createdAt', 'ASC']]
    });
    pendingItems.albums = pendingAlbums.map(album => ({
      id: album.id,
      title: album.title,
      submittedAt: album.createdAt,
      waitingDays: moment().diff(moment(album.createdAt), 'days')
    }));
    await writeLog(logFile, `找到 ${pendingAlbums.length} 个未审核的专辑（排除了草稿状态）`);
    
    // 2. 未审核的推广申请
    const pendingPromotions = await PromotionRequest.findAll({
      where: { status: 'pending' },
      include: [
        { model: Album, attributes: ['id', 'title'] }
      ],
      order: [['createdAt', 'ASC']]
    });
    pendingItems.promotions = pendingPromotions.map(promo => ({
      id: promo.id,
      albumId: promo.albumId,
      albumTitle: promo.Album ? promo.Album.title : '未知专辑',
      submittedAt: promo.createdAt,
      waitingDays: moment().diff(moment(promo.createdAt), 'days')
    }));
    await writeLog(logFile, `找到 ${pendingPromotions.length} 个未审核的推广申请`);
    
    // 3. 未审核的动态封面申请
    const pendingDynamicCovers = await DynamicCoverRequest.findAll({
      where: { status: 'pending' },
      include: [
        { model: Album, attributes: ['id', 'title'] }
      ],
      order: [['createdAt', 'ASC']]
    });
    pendingItems.dynamicCovers = pendingDynamicCovers.map(cover => ({
      id: cover.id,
      albumId: cover.albumId,
      albumTitle: cover.Album ? cover.Album.title : '未知专辑',
      platform: cover.platform,
      submittedAt: cover.createdAt,
      waitingDays: moment().diff(moment(cover.createdAt), 'days')
    }));
    await writeLog(logFile, `找到 ${pendingDynamicCovers.length} 个未审核的动态封面申请`);
    
    // 4. 未审核的艺人编辑请求
    const pendingArtistEdits = await ArtistEditRequest.findAll({
      where: { status: 'pending' },
      order: [['createdAt', 'ASC']]
    });
    pendingItems.artistEdits = pendingArtistEdits.map(edit => ({
      id: edit.id,
      artistId: edit.artistId,
      submittedAt: edit.createdAt,
      waitingDays: moment().diff(moment(edit.createdAt), 'days')
    }));
    await writeLog(logFile, `找到 ${pendingArtistEdits.length} 个未审核的艺人编辑请求`);
    
    // 5. 未审核的物料模板
    const pendingMaterials = await MaterialTemplate.findAll({
      where: { 
        createdAt: {
          [Op.gt]: moment().subtract(7, 'days').toDate() // 只检查最近7天创建的
        }
      },
      order: [['createdAt', 'ASC']]
    });
    pendingItems.materials = pendingMaterials.map(material => ({
      id: material.id,
      name: material.name,
      submittedAt: material.createdAt,
      waitingDays: moment().diff(moment(material.createdAt), 'days')
    }));
    await writeLog(logFile, `找到 ${pendingMaterials.length} 个最近创建的物料模板`);
    
    // 计算总数
    const totalPendingCount = 
      pendingItems.albums.length + 
      pendingItems.promotions.length + 
      pendingItems.dynamicCovers.length + 
      pendingItems.artistEdits.length;
    
    await writeLog(logFile, `总共找到 ${totalPendingCount} 个未审核内容`);
    
    // 如果有未审核内容，发送邮件通知所有管理员
    if (totalPendingCount > 0) {
      // 获取所有管理员用户
      const adminUsers = await User.findAll({
        where: { role: 'admin' },
        attributes: ['id', 'username', 'email']
      });
      
      await writeLog(logFile, `找到 ${adminUsers.length} 个管理员用户`);
      
      // 准备邮件内容
      const subject = `极音记 - 有${totalPendingCount}个待审核内容需要处理`;
      
      // 构建邮件正文
      let content = `尊敬的管理员：

您好！

系统检测到以下待处理的内容需要您的审核：

`;

      // 添加专辑信息
      if (pendingItems.albums.length > 0) {
        content += `【待审核专辑】共 ${pendingItems.albums.length} 个\n`;
        pendingItems.albums.forEach((album, index) => {
          if (index < 10) { // 只显示前10个
            content += `- ${album.title} (ID: ${album.id}, 等待时间: ${album.waitingDays}天)\n`;
          }
        });
        if (pendingItems.albums.length > 10) {
          content += `- ... 等共${pendingItems.albums.length}个专辑\n`;
        }
        content += '\n';
      }
      
      // 添加推广申请信息
      if (pendingItems.promotions.length > 0) {
        content += `【待审核推广申请】共 ${pendingItems.promotions.length} 个\n`;
        pendingItems.promotions.forEach((promo, index) => {
          if (index < 10) { // 只显示前10个
            content += `- ${promo.albumTitle} (ID: ${promo.id}, 等待时间: ${promo.waitingDays}天)\n`;
          }
        });
        if (pendingItems.promotions.length > 10) {
          content += `- ... 等共${pendingItems.promotions.length}个推广申请\n`;
        }
        content += '\n';
      }
      
      // 添加动态封面申请信息
      if (pendingItems.dynamicCovers.length > 0) {
        content += `【待审核动态封面】共 ${pendingItems.dynamicCovers.length} 个\n`;
        pendingItems.dynamicCovers.forEach((cover, index) => {
          if (index < 10) { // 只显示前10个
            content += `- ${cover.albumTitle} (平台: ${cover.platform}, ID: ${cover.id}, 等待时间: ${cover.waitingDays}天)\n`;
          }
        });
        if (pendingItems.dynamicCovers.length > 10) {
          content += `- ... 等共${pendingItems.dynamicCovers.length}个动态封面申请\n`;
        }
        content += '\n';
      }
      
      // 添加艺人编辑请求信息
      if (pendingItems.artistEdits.length > 0) {
        content += `【待审核艺人编辑】共 ${pendingItems.artistEdits.length} 个\n`;
        pendingItems.artistEdits.forEach((edit, index) => {
          if (index < 10) { // 只显示前10个
            content += `- 艺人ID: ${edit.artistId} (请求ID: ${edit.id}, 等待时间: ${edit.waitingDays}天)\n`;
          }
        });
        if (pendingItems.artistEdits.length > 10) {
          content += `- ... 等共${pendingItems.artistEdits.length}个艺人编辑请求\n`;
        }
        content += '\n';
      }
      
      // 添加最近创建的物料模板信息
      if (pendingItems.materials.length > 0) {
        content += `【最近创建的物料模板】共 ${pendingItems.materials.length} 个\n`;
        pendingItems.materials.forEach((material, index) => {
          if (index < 10) { // 只显示前10个
            content += `- ${material.name} (ID: ${material.id}, 创建时间: ${material.waitingDays}天前)\n`;
          }
        });
        if (pendingItems.materials.length > 10) {
          content += `- ... 等共${pendingItems.materials.length}个物料模板\n`;
        }
      }
      
      content += `
请登录管理后台处理这些待审核内容。

祝好，
极音记系统`;
      
      // 发送邮件给每个管理员
      for (const admin of adminUsers) {
        try {
          const mailResult = await sendMail(admin.email, subject, content, 'pending_items_notification');
          if (mailResult.success) {
            await writeLog(logFile, `已发送未审核内容通知邮件到管理员 ${admin.username} (${admin.email})`);
          } else {
            await writeLog(logFile, `发送未审核内容通知邮件到管理员 ${admin.username} 失败: ${mailResult.error || '未知错误'}`);
          }
        } catch (mailError) {
          await writeLog(logFile, `发送邮件到管理员 ${admin.username} 时出错: ${mailError.message}`);
        }
      }
    } else {
      await writeLog(logFile, '没有未审核内容，无需发送通知');
    }
    
    // 更新执行日志
    const result = {
      success: true,
      message: `检查完成，找到 ${totalPendingCount} 个未审核内容`,
      pendingItems
    };
    
    await executionLog.update({
      endTime: new Date(),
      status: 'completed',
      result: JSON.stringify(result)
    });
    
    await writeLog(logFile, '执行检查未审核内容任务完成');
    
    return result;
  } catch (error) {
    console.error('检查未审核内容任务失败:', error);
    
    if (logFile) {
      await writeLog(logFile, `执行失败: ${error.message}`);
      await writeLog(logFile, error.stack);
    }
    
    if (executionLog) {
      await executionLog.update({
        endTime: new Date(),
        status: 'failed',
        error: JSON.stringify({
          message: error.message,
          stack: error.stack
        })
      });
    }
    
    return {
      success: false,
      message: error.message,
      error: error.message
    };
  }
};

module.exports = checkPendingItems; 