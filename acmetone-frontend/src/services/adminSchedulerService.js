import axios from 'axios';
import { API_BASE_URL } from '../config';

// 获取所有定时任务状态
export const fetchTasks = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/admin/scheduler/tasks`);
    return response.data;
  } catch (error) {
    console.error('获取定时任务状态失败:', error);
    throw error.response?.data || error.message;
  }
};

// 手动执行定时任务
export const runTask = async (taskName) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/admin/scheduler/tasks/${taskName}/run`);
    return response.data;
  } catch (error) {
    console.error(`执行任务 ${taskName} 失败:`, error);
    throw error.response?.data || error.message;
  }
};

// 暂停定时任务
export const pauseTask = async (taskName) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/admin/scheduler/tasks/${taskName}/pause`);
    return response.data;
  } catch (error) {
    console.error(`暂停任务 ${taskName} 失败:`, error);
    throw error.response?.data || error.message;
  }
};

// 恢复定时任务
export const resumeTask = async (taskName) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/admin/scheduler/tasks/${taskName}/resume`);
    return response.data;
  } catch (error) {
    console.error(`恢复任务 ${taskName} 失败:`, error);
    throw error.response?.data || error.message;
  }
};

// 更新定时任务调度
export const updateTaskSchedule = async (taskName, expression, timezone = 'Asia/Shanghai') => {
  try {
    const response = await axios.put(`${API_BASE_URL}/admin/scheduler/tasks/${taskName}`, {
      expression,
      timezone
    });
    return response.data;
  } catch (error) {
    console.error(`更新任务 ${taskName} 调度失败:`, error);
    throw error.response?.data || error.message;
  }
};

// 获取任务执行日志
export const getTaskExecutionLogs = async (taskName, page = 1, pageSize = 10) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/admin/scheduler/tasks/${taskName}/logs`, {
      params: { page, pageSize }
    });
    return response.data;
  } catch (error) {
    console.error(`获取任务 ${taskName} 执行日志失败:`, error);
    throw error.response?.data || error.message;
  }
};

// 获取日志文件内容
export const getLogFileContent = async (logId) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/admin/scheduler/logs/content/${logId}`);
    return response.data;
  } catch (error) {
    console.error(`获取日志文件内容失败:`, error);
    throw error.response?.data || error.message;
  }
};

// 创建新任务
export const createTask = async (taskData) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/admin/scheduler/tasks`, taskData);
    return response.data;
  } catch (error) {
    console.error('创建任务失败:', error);
    throw error.response?.data || error.message;
  }
};

// 删除任务
export const deleteTask = async (taskName) => {
  try {
    const response = await axios.delete(`${API_BASE_URL}/admin/scheduler/tasks/${taskName}`);
    return response.data;
  } catch (error) {
    console.error(`删除任务 ${taskName} 失败:`, error);
    throw error.response?.data || error.message;
  }
};

export default {
  fetchTasks,
  runTask,
  pauseTask,
  resumeTask,
  updateTaskSchedule,
  getTaskExecutionLogs,
  getLogFileContent,
  createTask,
  deleteTask
}; 