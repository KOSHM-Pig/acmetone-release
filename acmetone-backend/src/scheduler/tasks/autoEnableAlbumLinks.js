const { Op } = require('sequelize');
const moment = require('moment-timezone');
const fs = require('fs').promises;
const path = require('path');
const { AlbumLink, TaskExecutionLog, sequelize } = require('../../models');

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

// 自动启用专辑链接任务
const autoEnableAlbumLinks = async (taskInfo) => {
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
    const baseLogDir = taskInfo.logDirectory || 'logs/scheduler/autoEnableAlbumLinks';
    const logDir = path.join(process.cwd(), baseLogDir, moment().tz('Asia/Shanghai').format('YYYY-MM-DD'));
    logFile = await createLogFile(logDir, 'autoEnableAlbumLinks');
    
    // 创建执行日志记录
    executionLog = await TaskExecutionLog.create({
      taskId: 'autoEnableAlbumLinks',
      startTime: new Date(),
      status: 'running',
      logFile: logFile
    });
    
    await writeLog(logFile, '执行自动启用专辑链接任务开始');
    
    // 获取当前北京时间
    const nowBeijing = moment().tz('Asia/Shanghai');
    await writeLog(logFile, `当前北京时间: ${nowBeijing.format('YYYY-MM-DD HH:mm:ss')}`);
    
    // 查找所有发行日期已到但尚未启用的专辑链接
    const links = await AlbumLink.findAll({
      where: {
        isActive: false,
        releaseDate: {
          [Op.lte]: nowBeijing.format('YYYY-MM-DD')
        }
      }
    });
    
    await writeLog(logFile, `找到 ${links.length} 个需要启用的专辑链接`);
    
    // 批量启用这些链接
    const enabledLinks = [];
    for (const link of links) {
      await link.update({ isActive: true });
      await writeLog(logFile, `已启用专辑链接: ${link.id} - ${link.albumName}`);
      enabledLinks.push({
        id: link.id,
        albumName: link.albumName,
        releaseDate: link.releaseDate
      });
    }
    
    // 更新执行日志
    const result = {
      success: true,
      message: `成功启用 ${links.length} 个专辑链接`,
      enabledLinks: enabledLinks
    };
    
    await executionLog.update({
      endTime: new Date(),
      status: 'completed',
      result: JSON.stringify(result)
    });
    
    await writeLog(logFile, '执行自动启用专辑链接任务完成');
    
    return result;
  } catch (error) {
    console.error('自动启用专辑链接任务失败:', error);
    
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

module.exports = autoEnableAlbumLinks; 