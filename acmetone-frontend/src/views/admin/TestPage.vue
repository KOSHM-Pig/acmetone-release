<template>
  <div class="test-page">
    <div class="test-header">
      <h1>路由测试页面</h1>
      <p>当前时间: {{ currentTime }}</p>
      <p>页面加载次数: {{ loadCount }}</p>
    </div>
    
    <div class="test-content">
      <div class="test-section">
        <h2>路由切换测试</h2>
        <div class="test-buttons">
          <button @click="goToWorkbench" class="test-btn">
            前往审核工作台
          </button>
          <button @click="goToLabels" class="test-btn">
            前往厂牌管理
          </button>
          <button @click="goToUsers" class="test-btn">
            前往用户管理
          </button>
        </div>
      </div>
      
      <div class="test-section">
        <h2>组件状态</h2>
        <div class="status-info">
          <p>组件挂载时间: {{ mountTime }}</p>
          <p>定时器状态: {{ timerStatus }}</p>
          <p>内存使用: {{ memoryUsage }}</p>
        </div>
      </div>
      
      <div class="test-section">
        <h2>日志</h2>
        <div class="log-container">
          <div v-for="(log, index) in logs" :key="index" class="log-item">
            {{ log }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();

// 响应式数据
const currentTime = ref('');
const loadCount = ref(0);
const mountTime = ref('');
const timerStatus = ref('未启动');
const memoryUsage = ref('未知');
const logs = ref([]);

// 定时器
let timeTimer = null;
let memoryTimer = null;

// 方法
const addLog = (message) => {
  const timestamp = new Date().toLocaleTimeString();
  logs.value.unshift(`[${timestamp}] ${message}`);
  if (logs.value.length > 10) {
    logs.value.pop();
  }
};

const updateTime = () => {
  currentTime.value = new Date().toLocaleString();
};

const updateMemoryUsage = () => {
  if (performance.memory) {
    const used = Math.round(performance.memory.usedJSHeapSize / 1024 / 1024);
    const total = Math.round(performance.memory.totalJSHeapSize / 1024 / 1024);
    memoryUsage.value = `${used}MB / ${total}MB`;
  }
};

const goToWorkbench = () => {
  addLog('导航到审核工作台');
  router.push('/admin/workbench');
};

const goToLabels = () => {
  addLog('导航到厂牌管理');
  router.push('/admin/labels');
};

const goToUsers = () => {
  addLog('导航到用户管理');
  router.push('/admin/users');
};

// 生命周期
onMounted(() => {
  loadCount.value++;
  mountTime.value = new Date().toLocaleString();
  addLog('测试页面已挂载');
  
  // 启动定时器
  timeTimer = setInterval(updateTime, 1000);
  memoryTimer = setInterval(updateMemoryUsage, 2000);
  timerStatus.value = '运行中';
  
  // 初始更新
  updateTime();
  updateMemoryUsage();
  
  addLog('定时器已启动');
});

onUnmounted(() => {
  addLog('测试页面即将卸载');
  
  // 清理定时器
  if (timeTimer) {
    clearInterval(timeTimer);
    timeTimer = null;
  }
  if (memoryTimer) {
    clearInterval(memoryTimer);
    memoryTimer = null;
  }
  
  timerStatus.value = '已停止';
  console.log('测试页面定时器已清理');
});
</script>

<style scoped>
.test-page {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.test-header {
  text-align: center;
  margin-bottom: 32px;
  padding: 24px;
  background: #f5f5f5;
  border-radius: 8px;
}

.test-header h1 {
  margin: 0 0 16px 0;
  color: #333;
}

.test-header p {
  margin: 8px 0;
  color: #666;
}

.test-content {
  display: grid;
  gap: 24px;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
}

.test-section {
  padding: 24px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
}

.test-section h2 {
  margin: 0 0 16px 0;
  color: #333;
  font-size: 18px;
}

.test-buttons {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.test-btn {
  padding: 12px 24px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s;
}

.test-btn:hover {
  background: #0056b3;
}

.status-info p {
  margin: 8px 0;
  color: #666;
}

.log-container {
  max-height: 200px;
  overflow-y: auto;
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  padding: 12px;
}

.log-item {
  font-family: monospace;
  font-size: 12px;
  color: #495057;
  margin-bottom: 4px;
  padding: 2px 0;
  border-bottom: 1px solid #e9ecef;
}

.log-item:last-child {
  border-bottom: none;
}

@media (max-width: 768px) {
  .test-content {
    grid-template-columns: 1fr;
  }
  
  .test-buttons {
    flex-direction: column;
  }
}
</style>
