const { Op } = require('sequelize');
const moment = require('moment-timezone');
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');
const { UserShipment, User, MaterialTemplate, TaskExecutionLog } = require('../../models');
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

// 检查物流状态并发送通知
const checkShipmentStatus = async (taskInfo) => {
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
    const baseLogDir = taskInfo.logDirectory || 'logs/scheduler/checkShipmentStatus';
    const logDir = path.join(process.cwd(), baseLogDir, moment().tz('Asia/Shanghai').format('YYYY-MM-DD'));
    logFile = await createLogFile(logDir, 'checkShipmentStatus');
    
    // 创建执行日志记录
    executionLog = await TaskExecutionLog.create({
      taskId: 'checkShipmentStatus',
      startTime: new Date(),
      status: 'running',
      logFile: logFile
    });
    
    await writeLog(logFile, '执行检查物流状态任务开始');
    
    // 获取当前北京时间
    const nowBeijing = moment().tz('Asia/Shanghai');
    await writeLog(logFile, `当前北京时间: ${nowBeijing.format('YYYY-MM-DD HH:mm:ss')}`);
    
    // 查找所有已发货但未送达的物流记录
    const shipments = await UserShipment.findAll({
      where: {
        status: {
          [Op.in]: ['shipped', 'shipping', 'in-transit', 'accepted']
        },
        trackingNumber: {
          [Op.ne]: null
        }
      },
      include: [
        { model: User, attributes: ['id', 'username', 'email'] },
        { model: MaterialTemplate, as: 'materialTemplate', attributes: ['id', 'name', 'description'] }
      ]
    });
    
    await writeLog(logFile, `找到 ${shipments.length} 个需要检查的物流记录`);
    
    // 检查每个物流记录
    const statusChanges = [];
    for (const shipment of shipments) {
      try {
        await writeLog(logFile, `检查物流记录: ID=${shipment.id}, 运单号=${shipment.trackingNumber}`);
        
        // 调用快递查询API
        const oldStatus = shipment.status;
        let newStatus = oldStatus;
        let trackingInfo = null;
        
        try {
          // 第1步：检测快递公司
          const carrierResponse = await axios.get(`https://www.kuaidi.com/index-ajaxselectinfo-${shipment.trackingNumber}.html`);
          const carriers = carrierResponse.data;
          
          if (carriers && carriers.length > 0) {
            const carrier = carriers[0]; // 假设第一个是正确的
            await writeLog(logFile, `识别到快递公司: ${carrier.name} (${carrier.exname})`);
            
            // 第2步：获取物流轨迹
            const trackingResponse = await axios.get(`https://www.kuaidi.com/index-ajaxselectcourierinfo-${shipment.trackingNumber}-${carrier.exname}.html`);
            trackingInfo = trackingResponse.data;
            
            if (trackingInfo.success && trackingInfo.data && trackingInfo.data.length > 0) {
              const latestTrack = trackingInfo.data[0]; // 最新的物流状态
              
              // 根据物流信息更新状态
              if (latestTrack.context.includes('签收')) {
                newStatus = 'delivered';
              } else if (latestTrack.context.includes('派送')) {
                newStatus = 'shipping';
              } else if (latestTrack.context.includes('运输')) {
                newStatus = 'in-transit';
              } else if (latestTrack.context.includes('揽收')) {
                newStatus = 'accepted';
              }
              
              await writeLog(logFile, `物流状态: ${oldStatus} -> ${newStatus}, 最新轨迹: ${latestTrack.context}`);
            } else {
              await writeLog(logFile, `未获取到有效的物流轨迹`);
            }
          } else {
            await writeLog(logFile, `未识别到快递公司`);
          }
        } catch (apiError) {
          await writeLog(logFile, `调用物流API失败: ${apiError.message}`);
        }
        
        // 如果状态有变化，更新数据库并发送邮件通知
        if (newStatus !== oldStatus) {
          await shipment.update({ status: newStatus });
          await writeLog(logFile, `已更新物流状态: ${oldStatus} -> ${newStatus}`);
          
          // 只有送达时才发送邮件通知
          if (newStatus === 'delivered') {
            // 准备邮件内容
            const userEmail = shipment.User.email;
            const materialName = shipment.materialTemplate ? shipment.materialTemplate.name : '物料';
            
            const subject = '极音记 - 物料已送达通知';
            const content = `尊敬的${shipment.User.username}：

您好！

您申请的物料"${materialName}"已经送达，请注意查收。

物流信息：
快递公司: ${shipment.carrier || '未知'}
运单号: ${shipment.trackingNumber}
最新状态: 已送达

如有任何问题，请随时联系我们。

祝好，
极音记团队`;
            
            // 发送邮件
            try {
              const mailResult = await sendMail(userEmail, subject, content, 'shipment_delivered');
              if (mailResult.success) {
                await writeLog(logFile, `已发送送达通知邮件到 ${userEmail}`);
              } else {
                await writeLog(logFile, `发送送达通知邮件失败: ${mailResult.error || '未知错误'}`);
              }
            } catch (mailError) {
              await writeLog(logFile, `发送邮件时出错: ${mailError.message}`);
            }
          }
          
          // 记录状态变化
          statusChanges.push({
            id: shipment.id,
            trackingNumber: shipment.trackingNumber,
            oldStatus,
            newStatus,
            userId: shipment.userId,
            materialTemplateId: shipment.materialTemplateId
          });
        } else {
          await writeLog(logFile, `物流状态未变化: ${oldStatus}`);
        }
      } catch (shipmentError) {
        await writeLog(logFile, `处理物流记录 ID=${shipment.id} 时出错: ${shipmentError.message}`);
      }
    }
    
    // 更新执行日志
    const result = {
      success: true,
      message: `检查了 ${shipments.length} 个物流记录，发现 ${statusChanges.length} 个状态变化`,
      statusChanges
    };
    
    await executionLog.update({
      endTime: new Date(),
      status: 'completed',
      result: JSON.stringify(result)
    });
    
    await writeLog(logFile, '执行检查物流状态任务完成');
    
    return result;
  } catch (error) {
    console.error('检查物流状态任务失败:', error);
    
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

module.exports = checkShipmentStatus; 