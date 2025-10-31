const cron = require('node-cron');
const parser = require('cron-parser');
const moment = require('moment-timezone');
const { SchedulerTask, TaskExecutionLog, sequelize } = require('../models');
const autoEnableAlbumLinks = require('./tasks/autoEnableAlbumLinks');
const checkShipmentStatus = require('./tasks/checkShipmentStatus');
const checkPendingItems = require('./tasks/checkPendingItems');
const autoFetchISRC = require('./tasks/autoFetchISRC');
const fs = require('fs').promises;
const path = require('path');

// 任务列表
const tasks = {};

// 获取下次执行时间
const getNextExecutionTime = (expression, timezone = 'Asia/Shanghai') => {
  try {
    const options = {
      currentDate: new Date(),
      tz: timezone,
    };
    const interval = parser.parseExpression(expression, options);
    return interval.next().toDate();
  } catch (error) {
    console.error(`获取下次执行时间失败 for expression "${expression}":`, error);
    return null;
  }
};

// 从数据库加载任务
const loadTasksFromDatabase = async () => {
  try {
    const dbTasks = await SchedulerTask.findAll();
    console.log(`从数据库加载了 ${dbTasks.length} 个任务`);
    
    // 停止所有现有任务
    Object.values(tasks).forEach(task => {
      if (task && typeof task.stop === 'function') {
        task.stop();
      }
    });
    
    // 清空任务列表
    Object.keys(tasks).forEach(key => {
      delete tasks[key];
    });
    
    // 初始化任务
    for (const task of dbTasks) {
      if (task.status === 'active') {
        scheduleTask(task);
      }
    }
    
    return dbTasks;
  } catch (error) {
    console.error('从数据库加载任务失败:', error);
    throw error;
  }
};

// 调度任务
const scheduleTask = (task) => {
  try {
    let taskFunction;
    
    switch (task.id) {
      case 'autoEnableAlbumLinks':
        taskFunction = () => autoEnableAlbumLinks(task);
        break;
      case 'checkShipmentStatus':
        taskFunction = () => checkShipmentStatus(task);
        break;
      case 'checkPendingItems':
        taskFunction = () => checkPendingItems(task);
        break;
      case 'autoFetchISRC':
        taskFunction = () => autoFetchISRC(task);
        break;
      default:
        console.warn(`未知的任务类型: ${task.id}`);
        return false;
    }
    
    // 创建定时任务
    tasks[task.id] = cron.schedule(task.expression, taskFunction, {
      scheduled: true,
      timezone: task.timezone
    });
    
    console.log(`已调度任务: ${task.id}, 表达式: ${task.expression}, 时区: ${task.timezone}`);
    
    // 更新下次执行时间
    task.update({
      nextRunAt: getNextExecutionTime(task.expression, task.timezone)
    }).catch(err => console.error(`更新任务下次执行时间失败: ${task.id}`, err));
    
    return true;
  } catch (error) {
    console.error(`调度任务失败: ${task.id}`, error);
    return false;
  }
};

// 初始化调度器
function initScheduler() {
  console.log('初始化调度器...');
  
  // 确保日志目录存在
  const baseLogDir = path.join(process.cwd(), 'logs/scheduler');
  fs.mkdir(baseLogDir, { recursive: true })
    .then(() => console.log(`已创建调度器日志目录: ${baseLogDir}`))
    .catch(err => console.error(`创建调度器日志目录失败: ${baseLogDir}`, err));
  
  // 加载任务
  loadTasksFromDatabase().catch(error => {
    console.error('初始化调度器失败:', error);
  });
}

// 初始化定时任务
const initSchedulerTasks = async () => {
  try {
    // 从数据库加载任务
    await loadTasksFromDatabase();
    console.log('定时任务调度器已初始化');
    return tasks;
  } catch (error) {
    console.error('初始化定时任务失败:', error);
    throw error;
  }
};

// 手动执行任务
const runTask = async (taskName) => {
  try {
    // 检查任务是否存在
    const task = await SchedulerTask.findByPk(taskName);
    if (!task) {
      throw new Error(`任务不存在: ${taskName}`);
    }
    
    // 如果任务被暂停，则不执行
    if (task.status === 'paused') {
      return { 
        success: false, 
        message: `任务 ${taskName} 当前已暂停，请先恢复任务再执行` 
      };
    }
    
    // 执行对应的任务函数
    let result;
    switch (taskName) {
      case 'autoEnableAlbumLinks':
        result = await autoEnableAlbumLinks(task);
        break;
      case 'checkShipmentStatus':
        result = await checkShipmentStatus(task);
        break;
      case 'checkPendingItems':
        result = await checkPendingItems(task);
        break;
      case 'autoFetchISRC':
        result = await autoFetchISRC(task);
        break;
      default:
        throw new Error(`未知的任务: ${taskName}`);
    }
    
    // 更新任务的执行信息
    await task.update({
      lastRunAt: new Date(),
      runCount: task.runCount + 1,
      nextRunAt: getNextExecutionTime(task.expression, task.timezone)
    });
    
    return {
      success: true,
      message: `任务 ${taskName} 已成功执行`,
      result
    };
  } catch (error) {
    console.error(`手动执行任务失败: ${taskName}`, error);
    return {
      success: false,
      message: `执行失败: ${error.message}`
    };
  }
};

// 获取所有任务状态
const getTasksStatus = async () => {
  try {
    const dbTasks = await SchedulerTask.findAll({
      include: [
        {
          model: TaskExecutionLog,
          as: 'executionLogs',
          limit: 1,
          order: [['startTime', 'DESC']]
        }
      ]
    });
    
    const result = {};
    
    for (const task of dbTasks) {
      result[task.id] = {
        id: task.id,
        name: task.name,
        description: task.description,
        status: task.status === 'active' ? 'scheduled' : 'not-scheduled',
        expression: task.expression,
        timezone: task.timezone,
        lastRunAt: task.lastRunAt,
        nextRunAt: task.nextRunAt,
        runCount: task.runCount,
        logDirectory: task.logDirectory,
        lastExecution: task.executionLogs && task.executionLogs.length > 0 ? {
          id: task.executionLogs[0].id,
          startTime: task.executionLogs[0].startTime,
          endTime: task.executionLogs[0].endTime,
          status: task.executionLogs[0].status,
          logFile: task.executionLogs[0].logFile
        } : null
      };
    }
    
    return result;
  } catch (error) {
    console.error('获取任务状态失败:', error);
    throw error;
  }
};

// 暂停任务
const pauseTask = async (taskName) => {
  try {
    // 检查任务是否存在
    const task = await SchedulerTask.findByPk(taskName);
    if (!task) {
      return { success: false, message: `任务不存在: ${taskName}` };
    }
    
    // 更新数据库状态
    await task.update({ status: 'paused' });
    
    // 如果任务正在运行，停止它
    if (tasks[taskName]) {
      tasks[taskName].stop();
    }
    
    return { success: true, message: `任务 ${taskName} 已暂停` };
  } catch (error) {
    console.error(`暂停任务失败: ${taskName}`, error);
    return { success: false, message: error.message };
  }
};

// 恢复任务
const resumeTask = async (taskName) => {
  try {
    // 检查任务是否存在
    const task = await SchedulerTask.findByPk(taskName);
    if (!task) {
      return { success: false, message: `任务不存在: ${taskName}` };
    }
    
    // 更新数据库状态
    await task.update({ status: 'active' });
    
    // 重新调度任务
    scheduleTask(task);
    
    return { success: true, message: `任务 ${taskName} 已恢复` };
  } catch (error) {
    console.error(`恢复任务失败: ${taskName}`, error);
    return { success: false, message: error.message };
  }
};

// 更新任务调度
const updateTaskSchedule = async (taskName, expression, timezone = 'Asia/Shanghai') => {
  try {
    // 检查任务是否存在
    const task = await SchedulerTask.findByPk(taskName);
    if (!task) {
      return { success: false, message: `任务不存在: ${taskName}` };
    }
    
    // 验证表达式
    try {
      cron.validate(expression);
    } catch (error) {
      return { success: false, message: `无效的Cron表达式: ${error.message}` };
    }
    
    // 如果任务正在运行，停止它
    if (tasks[taskName]) {
      tasks[taskName].stop();
    }
    
    // 更新数据库
    await task.update({
      expression,
      timezone,
      nextRunAt: getNextExecutionTime(expression, timezone)
    });
    
    // 如果任务是活动的，重新调度它
    if (task.status === 'active') {
      scheduleTask(task);
    }
    
    return {
      success: true,
      message: `任务 ${taskName} 调度已更新`,
      nextExecution: getNextExecutionTime(expression, timezone)
    };
  } catch (error) {
    console.error(`更新任务调度失败: ${taskName}`, error);
    return { success: false, message: error.message };
  }
};

// 获取任务执行日志
const getTaskExecutionLogs = async (taskId, page = 1, pageSize = 10) => {
  try {
    const pageNum = parseInt(page, 10) || 1;
    const pageSizeNum = parseInt(pageSize, 10) || 10;
    const offset = (pageNum - 1) * pageSizeNum;
    
    const { count, rows } = await TaskExecutionLog.findAndCountAll({
      where: { taskId },
      order: [['startTime', 'DESC']],
      limit: pageSizeNum,
      offset
    });
    
    return {
      logs: rows,
      total: count,
      page: pageNum,
      pageSize: pageSizeNum
    };
  } catch (error) {
    console.error(`获取任务执行日志失败: ${taskId}`, error);
    throw error;
  }
};

// 获取日志文件内容
const getLogFileContent = async (logId) => {
  try {
    const logRecord = await TaskExecutionLog.findByPk(logId);

    if (!logRecord) {
      return { 
        content: `[系统提示] 数据库中未找到ID为 ${logId} 的日志记录。`,
        isFileError: true,
        fileError: 'Log record not found in database.'
      };
    }

    if (!logRecord.logFile) {
      let fallbackContent = '[系统提示] 数据库中没有记录日志文件路径。';
      if (logRecord.result) fallbackContent += `\n\n任务结果: ${logRecord.result}`;
      if (logRecord.error) fallbackContent += `\n\n任务错误: ${logRecord.error}`;
      return {
        content: fallbackContent,
        isFileError: true,
        fileError: 'No log file path in database record.'
      };
    }

    const fullPath = path.resolve(logRecord.logFile);
    const fileExists = await fs.access(fullPath).then(() => true).catch(() => false);

    if (!fileExists) {
      let fallbackContent = `[系统提示] 日志文件在路径 ${logRecord.logFile} 不存在。`;
      if (logRecord.result) {
         try {
           fallbackContent += `\n\n任务结果 (从数据库读取):\n${JSON.stringify(JSON.parse(logRecord.result), null, 2)}`;
         } catch {
           fallbackContent += `\n\n任务结果 (从数据库读取): ${logRecord.result}`;
         }
      }
      if (logRecord.error) {
         try {
           fallbackContent += `\n\n任务错误 (从数据库读取):\n${JSON.stringify(JSON.parse(logRecord.error), null, 2)}`;
         } catch {
            fallbackContent += `\n\n任务错误 (从数据库读取): ${logRecord.error}`;
         }
      }
      return {
        content: fallbackContent,
        isFileError: true,
        fileError: `File not found at path: ${logRecord.logFile}`
      };
    }

    const content = await fs.readFile(fullPath, 'utf8');
    return { content };

  } catch (error) {
    console.error(`获取日志内容失败: ${logId}`, error);
    throw error;
  }
};

// 创建新任务
const createTask = async (taskData) => {
  const transaction = await sequelize.transaction();
  
  try {
    // 检查任务ID是否已存在
    const existingTask = await SchedulerTask.findByPk(taskData.id, { transaction });
    if (existingTask) {
      await transaction.rollback();
      return { success: false, message: `任务ID已存在: ${taskData.id}` };
    }
    
    // 验证表达式
    try {
      cron.validate(taskData.expression);
    } catch (error) {
      await transaction.rollback();
      return { success: false, message: `无效的Cron表达式: ${error.message}` };
    }
    
    // 创建任务
    const task = await SchedulerTask.create({
      id: taskData.id,
      name: taskData.name,
      description: taskData.description,
      expression: taskData.expression,
      timezone: taskData.timezone || 'Asia/Shanghai',
      status: taskData.status || 'active',
      logDirectory: taskData.logDirectory || `logs/scheduler/${taskData.id}`,
      nextRunAt: getNextExecutionTime(taskData.expression, taskData.timezone || 'Asia/Shanghai')
    }, { transaction });
    
    await transaction.commit();
    
    // 如果任务是活动的，调度它
    if (task.status === 'active') {
      scheduleTask(task);
    }
    
    return { success: true, message: '任务创建成功', task };
  } catch (error) {
    await transaction.rollback();
    console.error('创建任务失败:', error);
    return { success: false, message: error.message };
  }
};

// 删除任务
const deleteTask = async (taskId) => {
  const transaction = await sequelize.transaction();
  
  try {
    // 检查任务是否存在
    const task = await SchedulerTask.findByPk(taskId, { transaction });
    if (!task) {
      await transaction.rollback();
      return { success: false, message: `任务不存在: ${taskId}` };
    }
    
    // 如果任务正在运行，停止它
    if (tasks[taskId]) {
      tasks[taskId].stop();
      delete tasks[taskId];
    }
    
    // 删除任务及相关日志
    await TaskExecutionLog.destroy({
      where: { taskId },
      transaction
    });
    
    await task.destroy({ transaction });
    
    await transaction.commit();
    
    return { success: true, message: `任务 ${taskId} 已删除` };
  } catch (error) {
    await transaction.rollback();
    console.error(`删除任务失败: ${taskId}`, error);
    return { success: false, message: error.message };
  }
};

module.exports = {
  initScheduler,
  scheduleTask,
  loadTasksFromDatabase,
  getTasksStatus,
  createTask,
  runTask,
  pauseTask,
  resumeTask,
  updateTaskSchedule,
  deleteTask,
  getTaskExecutionLogs,
  getLogFileContent
}; 