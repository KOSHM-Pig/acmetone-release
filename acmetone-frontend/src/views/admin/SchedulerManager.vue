<template>
  <div class="scheduler-manager">
    <div class="page-header">
      <h1>定时任务管理</h1>
      <div class="header-actions">
        <acmetone-btn @click="createTaskDialogVisible = true">
          <el-icon><Plus /></el-icon>
          新建任务
        </acmetone-btn>
        <acmetone-btn @click="refreshTasks" style="margin-left: 10px;">
          <el-icon><Refresh /></el-icon>
          刷新任务
        </acmetone-btn>
      </div>
    </div>
    
    <div class="tasks-container">
      <el-card v-if="Object.keys(tasks).length === 0 && !loading" class="empty-state">
        <el-empty description="暂无定时任务" />
      </el-card>

      <el-card v-for="task in tasks" :key="task.id" class="task-card">
        <template #header>
          <div class="card-header">
            <h3>{{ task.name }}</h3>
            <el-tag :type="getStatusTagType(task.status)" size="small" effect="plain" round>
              {{ getStatusText(task.status) }}
            </el-tag>
          </div>
        </template>
        
        <p class="task-description">{{ task.description || '暂无描述' }}</p>
        
        <div class="task-details">
          <div class="task-info-row">
            <span class="label">调度表达式</span>
            <span class="value"><code>{{ task.expression }}</code></span>
          </div>
          <div class="task-info-row">
            <span class="label">下次执行</span>
            <span class="value">{{ formatDateTime(task.nextRunAt) || 'N/A' }}</span>
          </div>
          <div v-if="task.nextRunAt && task.status === 'scheduled'" class="task-info-row countdown-row">
            <span class="label"></span>
            <span class="value countdown">{{ countdowns[task.id] }}</span>
          </div>
          <div class="task-info-row">
            <span class="label">上次执行</span>
            <span class="value">{{ formatDateTime(task.lastRunAt) || '从未' }}</span>
          </div>
           <div class="task-info-row">
            <span class="label">执行次数</span>
            <span class="value">{{ task.runCount }}</span>
          </div>
        </div>
        
        <div class="manual-run-button">
          <acmetone-btn 
            type="primary" 
            @click="runTaskManually(task.id)" 
            :loading="runningTasks[task.id]"
            :disabled="task.status !== 'scheduled'"
          >
            <el-icon><VideoPlay /></el-icon>
            立即执行
          </acmetone-btn>
          <span v-if="task.status !== 'scheduled'" class="disabled-tip">
            <el-tooltip content="任务已暂停，请先恢复任务" placement="top">
              <el-icon><QuestionFilled /></el-icon>
            </el-tooltip>
          </span>
        </div>
        
        <div class="task-actions">
          <acmetone-btn 
            size="small" 
            :type="task.status === 'scheduled' ? 'secondary' : 'success'"
            @click="toggleTaskStatus(task.id, task.status)"
          >
            <el-icon><component :is="task.status === 'scheduled' ? 'VideoPause' : 'VideoPlay'" /></el-icon>
            {{ task.status === 'scheduled' ? '暂停' : '恢复' }}
          </acmetone-btn>
          
          <acmetone-btn size="small" @click="openScheduleEditor(task)">
            <el-icon><Edit /></el-icon>
            修改
          </acmetone-btn>

          <acmetone-btn size="small" @click="openLogsViewer(task.id)">
            <el-icon><View /></el-icon>
            日志
          </acmetone-btn>

          <acmetone-btn size="small" type="danger" @click="deleteTask(task.id)">
            <el-icon><Delete /></el-icon>
            删除
          </acmetone-btn>
        </div>
      </el-card>
    </div>
    
    <el-dialog v-model="createTaskDialogVisible" title="新建定时任务" :width="isMobileView ? '95%' : '600px'" class="acmetone-dialog" :fullscreen="isMobileView">
      <el-form :model="createForm" ref="createFormRef" label-position="top">
        <el-form-item label="任务ID (唯一标识)" prop="id" required>
          <div class="garrix-input-wrapper">
            <el-input v-model="createForm.id" placeholder="例如: myCustomTask" />
          </div>
        </el-form-item>
        <el-form-item label="任务名称" prop="name" required>
           <div class="garrix-input-wrapper">
            <el-input v-model="createForm.name" placeholder="例如: 我的自定义任务" />
          </div>
        </el-form-item>
        <el-form-item label="任务描述" prop="description">
           <div class="garrix-input-wrapper">
            <el-input type="textarea" v-model="createForm.description" />
          </div>
        </el-form-item>
        <el-form-item label="Cron 表达式" prop="expression" required>
           <div class="garrix-input-wrapper">
            <el-input v-model="createForm.expression" placeholder="例如: 0 1 * * * (每天凌晨1点)" />
          </div>
           <div class="expression-preview">
            <p>表达式预览: {{ getCronDescription(createForm.expression) }}</p>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <acmetone-btn @click="createTaskDialogVisible = false" type="secondary">取消</acmetone-btn>
        <acmetone-btn @click="handleCreateTask" :loading="creating">创建</acmetone-btn>
      </template>
    </el-dialog>

    <el-dialog v-model="scheduleDialogVisible" title="修改定时任务调度" :width="isMobileView ? '95%' : '500px'" class="acmetone-dialog" :fullscreen="isMobileView">
      <div v-if="currentEditTask" class="schedule-editor">
        <h3>{{ currentEditTask.name }}</h3>
        <div class="form-item">
          <label>Cron 表达式:</label>
          <div class="garrix-input-wrapper">
            <el-input v-model="scheduleForm.expression" placeholder="例如: 10 0 * * *" />
          </div>
          <div class="expression-preview">
            <p>表达式预览: {{ getCronDescription(scheduleForm.expression) }}</p>
          </div>
        </div>
      </div>
      <template #footer>
        <acmetone-btn @click="scheduleDialogVisible = false" type="secondary">取消</acmetone-btn>
        <acmetone-btn @click="updateSchedule" :loading="updating">保存</acmetone-btn>
      </template>
    </el-dialog>

    <el-dialog v-model="logsViewerVisible" title="任务执行日志" :width="isMobileView ? '95%' : '80%'" class="acmetone-dialog" :fullscreen="isMobileView">
      <div v-if="currentLogs.length > 0">
        <el-table :data="currentLogs" style="width: 100%" row-key="id">
          <el-table-column prop="startTime" label="开始时间" :formatter="row => formatDateTime(row.startTime)" />
          <el-table-column prop="endTime" label="结束时间" :formatter="row => formatDateTime(row.endTime)" />
          <el-table-column prop="status" label="状态">
             <template #default="scope">
              <span :class="['status-badge', getLogStatusClass(scope.row.status)]">
                {{ scope.row.status }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="操作">
            <template #default="scope">
              <acmetone-btn size="small" @click="viewLogContent(scope.row.id)">查看日志文件</acmetone-btn>
            </template>
          </el-table-column>
        </el-table>
        <el-pagination
          background
          layout="prev, pager, next"
          :total="logPagination.total"
          :page-size="logPagination.pageSize"
          :current-page="logPagination.page"
          @current-change="handleLogPageChange"
          style="margin-top: 20px; text-align: right;"
        />
      </div>
      <el-empty v-else description="暂无执行日志" />
    </el-dialog>

    <el-dialog v-model="logContentVisible" title="日志内容" width="70%" custom-class="log-content-dialog acmetone-dialog">
      <pre class="log-content-pre">{{ logContent }}</pre>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Refresh, VideoPlay, VideoPause, Edit, QuestionFilled, Plus, View, Delete } from '@element-plus/icons-vue';
import adminSchedulerService from '@/services/adminSchedulerService';
import AcmetoneBtn from '@/components/acmetone/AcmetoneBtn.vue';

const tasks = ref({});
const loading = ref(false);
const runningTasks = ref({});

const createTaskDialogVisible = ref(false);
const createForm = ref({ id: '', name: '', description: '', expression: '' });
const creating = ref(false);

const scheduleDialogVisible = ref(false);
const currentEditTask = ref(null);
const scheduleForm = ref({ expression: '' });
const updating = ref(false);

const logsViewerVisible = ref(false);
const currentLogTaskId = ref('');
const currentLogs = ref([]);
const logPagination = ref({ page: 1, pageSize: 10, total: 0 });

const logContentVisible = ref(false);
const logContent = ref('');

const countdowns = ref({});
let countdownInterval = null;

const isMobileView = ref(window.innerWidth < 768);

const handleResize = () => {
  isMobileView.value = window.innerWidth < 768;
};

const getStatusText = (status) => status === 'scheduled' ? '已启用' : '已暂停';
const getStatusTagType = (status) => status === 'scheduled' ? 'success' : 'info';
const formatDateTime = (dateStr) => dateStr ? new Date(dateStr).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }) : '';

const getCronDescription = (expression) => {
  if (!expression) return '...';
  // This is a simplified parser. For full functionality, a library like 'cron-parser' or 'cronstrue' would be needed on the client-side.
  const parts = expression.trim().split(/\s+/);
  if (parts.length < 5) return '无效表达式';
  return `在分钟 '${parts[0]}', 小时 '${parts[1]}', 日 '${parts[2]}', 月 '${parts[3]}', 星期 '${parts[4]}' 执行`;
};

const updateCountdowns = () => {
  const now = new Date();
  for (const taskId in tasks.value) {
    const task = tasks.value[taskId];
    if (task.nextRunAt && task.status === 'scheduled') {
      const nextRun = new Date(task.nextRunAt);
      const diff = nextRun - now;

      if (diff > 0) {
        const minutes = Math.floor((diff / 1000 / 60) % 60);
        const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        
        let countdownString = '剩余 ';
        if (days > 0) countdownString += `${days}天 `;
        if (hours > 0) countdownString += `${hours}小时 `;
        countdownString += `${minutes}分钟`;

        countdowns.value[taskId] = countdownString;
      } else {
        countdowns.value[taskId] = '即将执行...';
      }
    }
  }
};

const loadTasks = async () => {
  loading.value = true;
  try {
    const res = await adminSchedulerService.fetchTasks();
    if (res.success) tasks.value = res.tasks;
    else ElMessage.error(res.message);
  } catch (err) {
    ElMessage.error(err.message || '加载任务失败');
  } finally {
    loading.value = false;
  }
};

const refreshTasks = () => {
  loadTasks();
  ElMessage.success('任务列表已刷新');
};

const handleCreateTask = async () => {
  creating.value = true;
  try {
    const res = await adminSchedulerService.createTask(createForm.value);
    if (res.success) {
      ElMessage.success('任务创建成功');
      createTaskDialogVisible.value = false;
      createForm.value = { id: '', name: '', description: '', expression: '' };
      loadTasks();
    } else {
      ElMessage.error(res.message);
    }
  } catch (err) {
    ElMessage.error(err.message || '创建任务失败');
  } finally {
    creating.value = false;
  }
};

const runTaskManually = async (taskId) => {
  runningTasks.value[taskId] = true;
  try {
    const res = await adminSchedulerService.runTask(taskId);
    if (res.success) {
      ElMessage.success(`任务 ${taskId} 已开始执行`);
      loadTasks();
    } else {
      ElMessage.error(res.message);
    }
  } catch (err) {
    ElMessage.error(err.message || '执行任务失败');
  } finally {
    runningTasks.value[taskId] = false;
  }
};

const toggleTaskStatus = async (taskId, status) => {
  try {
    const action = status === 'scheduled' ? adminSchedulerService.pauseTask : adminSchedulerService.resumeTask;
    const res = await action(taskId);
    if (res.success) {
      ElMessage.success(res.message);
      loadTasks();
    } else {
      ElMessage.error(res.message);
    }
  } catch (err) {
    ElMessage.error(err.message || '切换状态失败');
  }
};

const openScheduleEditor = (task) => {
  currentEditTask.value = task;
  scheduleForm.value.expression = task.expression;
  scheduleDialogVisible.value = true;
};

const updateSchedule = async () => {
  updating.value = true;
  try {
    const res = await adminSchedulerService.updateTaskSchedule(currentEditTask.value.id, scheduleForm.value.expression);
    if (res.success) {
      ElMessage.success('调度更新成功');
      scheduleDialogVisible.value = false;
      loadTasks();
    } else {
      ElMessage.error(res.message);
    }
  } catch (err) {
    ElMessage.error(err.message || '更新调度失败');
  } finally {
    updating.value = false;
  }
};

const deleteTask = async (taskId) => {
  try {
    await ElMessageBox.confirm('确定要删除此任务吗？相关日志也会被删除。', '警告', { type: 'warning' });
    const res = await adminSchedulerService.deleteTask(taskId);
    if (res.success) {
      ElMessage.success('任务删除成功');
      loadTasks();
    } else {
      ElMessage.error(res.message);
    }
  } catch (err) {
    if (err !== 'cancel') ElMessage.error(err.message || '删除任务失败');
  }
};

const openLogsViewer = async (taskId) => {
  currentLogTaskId.value = taskId;
  logPagination.value.page = 1;
  loadExecutionLogs();
  logsViewerVisible.value = true;
};

const loadExecutionLogs = async () => {
  try {
    const res = await adminSchedulerService.getTaskExecutionLogs(currentLogTaskId.value, logPagination.value.page, logPagination.value.pageSize);
    if (res.success) {
      currentLogs.value = res.logs;
      logPagination.value.total = res.total;
    } else {
      ElMessage.error(res.message);
    }
  } catch (err) {
    ElMessage.error(err.message || '加载日志失败');
  }
};

const handleLogPageChange = (page) => {
  logPagination.value.page = page;
  loadExecutionLogs();
};

const viewLogContent = async (logId) => {
  try {
    const res = await adminSchedulerService.getLogFileContent(logId);
    if (res.success) {
      logContent.value = res.content || '日志文件为空或不存在。';
      
      if (res.isFileError) {
        logContent.value = `${res.content}\n\n[系统提示] ${res.fileError}`;
      }
      
      logContentVisible.value = true;
    } else {
      ElMessage.error(res.message);
    }
  } catch (err) {
    ElMessage.error(err.message || '获取日志内容失败');
  }
};

const getLogStatusClass = (status) => {
  const statusMap = {
    running: 'status-pending',
    completed: 'status-approved',
    failed: 'status-rejected',
  };
  return statusMap[status] || 'status-draft';
};


onMounted(() => {
  loadTasks();
  window.addEventListener('resize', handleResize);
  countdownInterval = setInterval(updateCountdowns, 1000 * 30); // Update every 30 seconds
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize);
  if (countdownInterval) {
    clearInterval(countdownInterval);
  }
});

</script>

<style scoped>
:root {
  --garrix-black: #1d1d1f;
  --garrix-white: #ffffff;
  --garrix-grey: #86868b;
  --garrix-light-grey: #f5f7fa;
  --garrix-border-grey: #d2d2d7;
  --garrix-text-primary: #1d1d1f;
  --garrix-text-secondary: #86868b;
  --garrix-danger: #C62828;
}

.scheduler-manager {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
  font-family: sans-serif;
  background-color: var(--garrix-white);
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--garrix-black);
  padding-bottom: 20px;
  margin-bottom: 30px;
}

.page-header h1 {
  font-size: 2rem;
  font-weight: 700;
  margin: 0;
}

.header-actions {
  display: flex;
}

.tasks-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 24px;
}

.task-card {
  background-color: var(--garrix-white);
  border: 1px solid var(--garrix-border-grey);
  border-radius: 0;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  display: flex;
  flex-direction: column;
}

.task-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

:deep(.el-card__header) {
  border-bottom: 1px solid var(--garrix-border-grey);
  padding: 16px 20px;
}

:deep(.el-card__body) {
  padding: 20px;
  flex-grow: 1;
  display: flex;
  flex-direction: column;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-header h3 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--garrix-text-primary);
}

.task-description {
  color: var(--garrix-text-secondary);
  font-size: 14px;
  margin: 0 0 16px;
  line-height: 1.5;
}

.task-details {
  font-size: 14px;
  margin-bottom: 20px;
}

.task-info-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
  line-height: 1.4;
}

.task-info-row .label {
  font-weight: 500;
  color: var(--garrix-text-secondary);
}

.task-info-row .value {
  color: var(--garrix-text-primary);
  text-align: right;
}

.task-info-row .value code {
  background-color: var(--garrix-light-grey);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: monospace;
  border: 1px solid var(--garrix-border-grey);
}

.manual-run-button {
  margin: auto 0 20px 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.task-actions {
  padding-top: 16px;
  border-top: 1px solid var(--garrix-border-grey);
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

/* Garrix Input Style */
.garrix-input-wrapper {
  position: relative;
  border: 2px solid var(--garrix-black);
  background-color: var(--garrix-white);
  box-shadow: 4px 4px 0 rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
  width: 100%;
}
.garrix-input-wrapper:hover {
  transform: translate(-2px, -2px);
  box-shadow: 6px 6px 0 rgba(0, 0, 0, 0.1);
}
:deep(.garrix-input-wrapper .el-input__wrapper),
:deep(.garrix-input-wrapper .el-select__wrapper) {
  border: none !important;
  box-shadow: none !important;
  background-color: transparent !important;
  padding: 0 15px;
  height: 54px;
}
:deep(.garrix-input-wrapper .el-textarea__inner) {
    border: none !important;
    box-shadow: none !important;
    background: transparent !important;
    padding: 15px;
    height: 100px;
}

/* Dialog Styling */
:deep(.acmetone-dialog .el-dialog) {
  display: flex;
  flex-direction: column;
  max-height: 90vh;
  border: 1px solid var(--garrix-border-grey);
  box-shadow: 0 10px 30px rgba(0,0,0,0.1);
  border-radius: 0;
}
:deep(.acmetone-dialog .el-dialog__header) {
  padding: 20px 24px;
  margin-right: 0;
  border-bottom: 1px solid var(--garrix-border-grey);
}
:deep(.acmetone-dialog .el-dialog__body) {
  padding: 24px;
  overflow-y: auto;
}
:deep(.acmetone-dialog .el-dialog__footer) {
  padding: 16px 24px;
  border-top: 1px solid var(--garrix-border-grey);
}

/* Table styling */
:deep(.el-table) {
  border-top: 1px solid var(--garrix-border-grey);
}
:deep(.el-table th),
:deep(.el-table td) {
  border-bottom: 1px solid var(--garrix-border-grey);
}
:deep(.el-table__header-wrapper) {
  border-bottom: 1px solid var(--garrix-black);
}
:deep(.el-table th) {
  color: var(--garrix-black);
  font-weight: 600;
  background-color: var(--garrix-white) !important;
}
:deep(.el-table__row:hover > td) {
    background-color: var(--garrix-light-grey) !important;
}
:deep(.el-table .el-table__empty-block) {
  min-height: 200px;
}


/* Status Badge Styling */
.status-badge {
    padding: 4px 10px;
    border-radius: 0;
    font-size: 12px;
    font-weight: 600;
    border: 1px solid;
    white-space: nowrap;
    display: inline-block;
    min-width: 90px;
    text-align: center;
}
.status-pending {
  color: #c78517;
  border-color: #F9A825;
}
.status-approved {
  color: #2E7D32;
  border-color: #4CAF50;
}
.status-rejected {
  color: #C62828;
  border-color: #E53935;
}
.status-draft {
  color: var(--garrix-text-secondary);
  border-color: var(--garrix-border-grey);
}

.countdown-row .countdown {
  font-size: 0.85rem;
  color: var(--garrix-grey);
  font-style: italic;
}

.schedule-editor h3 {
  font-size: 1.2rem;
  font-weight: 600;
  margin-bottom: 16px;
}
.schedule-editor .form-item {
  margin-bottom: 16px;
}

.schedule-editor .form-item label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: var(--garrix-text-secondary);
}

.expression-preview {
  margin-top: 8px;
  font-size: 14px;
  color: var(--garrix-text-secondary);
}

.log-content-dialog {
  border-radius: 0;
}
.log-content-pre {
  white-space: pre-wrap;
  word-wrap: break-word;
  background-color: var(--garrix-light-grey);
  padding: 15px;
  border: 1px solid var(--garrix-border-grey);
  max-height: 60vh;
  overflow-y: auto;
  color: var(--garrix-text-primary);
}

@media (max-width: 768px) {
  .scheduler-manager {
    padding: 16px;
  }
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
    padding-bottom: 16px;
    margin-bottom: 24px;
  }
  .header-actions {
    width: 100%;
    display: flex;
    justify-content: stretch;
  }
  .header-actions .acmetone-btn {
    flex-grow: 1;
    justify-content: center;
  }
  .tasks-container {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  :deep(.acmetone-dialog .el-dialog__body) {
    padding: 16px;
  }
}
</style> 