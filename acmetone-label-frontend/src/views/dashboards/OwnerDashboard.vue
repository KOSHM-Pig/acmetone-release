<template>
  <div>
    <!-- 顶部Header -->
    <LabelHeader user-role="主理人" />

    <!-- 主要内容区域 -->
    <div class="dashboard-container">
      <!-- 欢迎区域 -->
      <div class="welcome-section">
        <div class="welcome-content">
          <h1 class="dashboard-title">主理人仪表盘</h1>
          <p class="dashboard-subtitle">{{ labelInfo.name || '您的厂牌' }} · 管理中心</p>
        </div>
        <div class="quick-stats">
          <div class="stat-item">
            <div class="stat-number">{{ stats.pendingSubmissions }}</div>
            <div class="stat-label">待审核投稿</div>
          </div>
          <div class="stat-item">
            <div class="stat-number">{{ stats.activeArtists }}</div>
            <div class="stat-label">签约艺人</div>
          </div>
          <div class="stat-item">
            <div class="stat-number">{{ stats.totalReleases }}</div>
            <div class="stat-label">发行专辑</div>
          </div>
        </div>
      </div>

      <!-- 功能模块网格 -->
      <div class="modules-grid">
        <div 
          v-for="module in moduleOptions" 
          :key="module.value"
          class="module-card"
          @click="handleEnterModule(module.value)"
        >
          <div class="module-icon">
            <i :class="getModuleIcon(module.value)"></i>
          </div>
          <h3 class="module-title">{{ module.label }}</h3>
          <p class="module-description">{{ getModuleDescription(module.value) }}</p>
          <div class="module-badge" v-if="getModuleBadge(module.value)">
            {{ getModuleBadge(module.value) }}
          </div>
        </div>
      </div>

      <!-- 最近活动 -->
      <div class="recent-activity">
        <h2 class="section-title">最近活动</h2>
        <div class="activity-list">
          <div 
            v-for="activity in recentActivities" 
            :key="activity.id"
            class="activity-item"
          >
            <div class="activity-icon">
              <i :class="getActivityIcon(activity.type)"></i>
            </div>
            <div class="activity-content">
              <div class="activity-title">{{ activity.title }}</div>
              <div class="activity-time">{{ formatTime(activity.timestamp) }}</div>
            </div>
            <div class="activity-status" :class="activity.status">
              {{ getStatusText(activity.status) }}
            </div>
          </div>
        </div>
      </div>

      <!-- 快捷操作 -->
      <div class="quick-actions">
        <h2 class="section-title">快捷操作</h2>
        <div class="actions-grid">
          <button class="action-btn primary" @click="createAlbum">
            <i class="icon-plus"></i>
            创建专辑
          </button>
          <button class="action-btn secondary" @click="reviewSubmissions">
            <i class="icon-check"></i>
            审核投稿
          </button>
          <button class="action-btn secondary" @click="inviteArtist">
            <i class="icon-user-plus"></i>
            邀请艺人
          </button>
          <button class="action-btn secondary" @click="viewAnalytics">
            <i class="icon-chart"></i>
            查看数据
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import LabelHeader from '../../components/LabelHeader.vue';

const router = useRouter();

// 响应式数据
const labelInfo = ref({
  name: 'STMPD RCRDS',
  id: 1
});

const stats = ref({
  pendingSubmissions: 12,
  activeArtists: 8,
  totalReleases: 25
});

const recentActivities = ref([
  {
    id: 1,
    type: 'submission',
    title: '艺人 Martin Garrix 提交了新作品《Animals》',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
    status: 'pending'
  },
  {
    id: 2,
    type: 'release',
    title: '专辑《Progressive House Vol.1》已发布',
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000),
    status: 'completed'
  },
  {
    id: 3,
    type: 'artist',
    title: '新艺人 David Guetta 加入厂牌',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
    status: 'completed'
  },
  {
    id: 4,
    type: 'review',
    title: '审核通过 5 首投稿作品',
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    status: 'completed'
  }
]);

const moduleOptions = [
  { value: 'label-overview', label: '厂牌概览' },
  { value: 'submissions', label: '投稿管理' },
  { value: 'artists', label: '艺人管理' },
  { value: 'releases', label: '发行管理' },
  { value: 'analytics', label: '数据分析' },
  { value: 'team', label: '团队管理' },
  { value: 'settings', label: '厂牌设置' }
];

// 获取模块图标
const getModuleIcon = (moduleValue) => {
  const iconMap = {
    'label-overview': 'icon-home',
    'submissions': 'icon-inbox',
    'artists': 'icon-users',
    'releases': 'icon-disc',
    'analytics': 'icon-chart',
    'team': 'icon-team',
    'settings': 'icon-settings'
  };
  return iconMap[moduleValue] || 'icon-default';
};

// 获取模块描述
const getModuleDescription = (moduleValue) => {
  const descMap = {
    'label-overview': '查看厂牌整体运营状况',
    'submissions': '审核艺人投稿作品',
    'artists': '管理签约艺人信息',
    'releases': '管理专辑发行流程',
    'analytics': '查看数据统计报表',
    'team': '管理厂牌团队成员',
    'settings': '配置厂牌基本信息'
  };
  return descMap[moduleValue] || '';
};

// 获取模块徽章
const getModuleBadge = (moduleValue) => {
  if (moduleValue === 'submissions') return stats.value.pendingSubmissions;
  return null;
};

// 获取活动图标
const getActivityIcon = (type) => {
  const iconMap = {
    'submission': 'icon-upload',
    'release': 'icon-disc',
    'artist': 'icon-user',
    'review': 'icon-check'
  };
  return iconMap[type] || 'icon-default';
};

// 格式化时间
const formatTime = (timestamp) => {
  const now = new Date();
  const diff = now - timestamp;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}天前`;
  if (hours > 0) return `${hours}小时前`;
  return '刚刚';
};

// 获取状态文本
const getStatusText = (status) => {
  const statusMap = {
    'pending': '待处理',
    'completed': '已完成',
    'in-progress': '进行中'
  };
  return statusMap[status] || status;
};

// 模块导航
const handleEnterModule = (moduleValue) => {
  console.log('主理人进入模块:', moduleValue);
  
  const moduleRoutes = {
    'label-overview': '/owner/overview',
    'submissions': '/owner/submissions',
    'artists': '/owner/artists',
    'releases': '/owner/releases',
    'analytics': '/owner/analytics',
    'team': '/owner/team',
    'settings': '/owner/settings'
  };

  const route = moduleRoutes[moduleValue];
  if (route) {
    console.log('跳转到:', route);
    // 暂时用alert提示，实际开发中启用路由跳转
    alert(`主理人模块 - 即将跳转到: ${route}`);
    // router.push(route);
  }
};

// 快捷操作
const createAlbum = () => {
  console.log('创建专辑');
  alert('跳转到专辑创建页面');
  // router.push('/owner/releases/create');
};

const reviewSubmissions = () => {
  console.log('审核投稿');
  alert('跳转到投稿审核页面');
  // router.push('/owner/submissions');
};

const inviteArtist = () => {
  console.log('邀请艺人');
  alert('打开艺人邀请对话框');
};

const viewAnalytics = () => {
  console.log('查看数据');
  alert('跳转到数据分析页面');
  // router.push('/owner/analytics');
};

// 加载数据
const loadDashboardData = async () => {
  try {
    // 模拟API调用
    // const response = await LabelService.getDashboardStats();
    // stats.value = response.data;
    console.log('加载仪表盘数据');
  } catch (error) {
    console.error('加载仪表盘数据失败:', error);
  }
};

onMounted(() => {
  loadDashboardData();
});
</script>

<style scoped>
/* Martin Garrix风格的主理人仪表盘 */
.dashboard-container {
  margin-top: 90px; /* Header高度 */
  padding: 40px 0;
  background-color: #ffffff;
  color: #000000;
  min-height: calc(100vh - 90px);
  font-family: 'Montserrat', 'Arial', sans-serif;
}

/* 欢迎区域 */
.welcome-section {
  max-width: 1200px;
  margin: 0 auto 60px;
  padding: 0 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #e0e0e0;
  padding-bottom: 40px;
}

.welcome-content {
  flex: 1;
}

.dashboard-title {
  font-size: 4rem;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: -2px;
  margin: 0 0 8px 0;
  line-height: 0.9;
}

.dashboard-subtitle {
  font-size: 1.1rem;
  color: #666;
  margin: 0;
  font-weight: 400;
}

.quick-stats {
  display: flex;
  gap: 40px;
}

.stat-item {
  text-align: center;
}

.stat-number {
  font-size: 2.5rem;
  font-weight: 900;
  color: #000;
  line-height: 1;
}

.stat-label {
  font-size: 0.8rem;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-top: 4px;
}

/* 功能模块网格 */
.modules-grid {
  max-width: 1200px;
  margin: 0 auto 60px;
  padding: 0 20px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 30px;
}

.module-card {
  background: #ffffff;
  border: 1px solid #e0e0e0;
  padding: 30px;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.module-card:hover {
  transform: translateY(-2px);
  border-color: #000;
}

.module-icon {
  width: 50px;
  height: 50px;
  background: #000;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
}

.module-icon i {
  color: #fff;
  font-size: 24px;
}

.module-title {
  font-size: 1.3rem;
  font-weight: 700;
  margin: 0 0 8px 0;
  text-transform: uppercase;
  letter-spacing: -0.5px;
}

.module-description {
  font-size: 0.9rem;
  color: #666;
  margin: 0;
  line-height: 1.4;
}

.module-badge {
  position: absolute;
  top: 15px;
  right: 15px;
  background: #ff4444;
  color: white;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.7rem;
  font-weight: 700;
}

/* 最近活动 */
.recent-activity {
  max-width: 1200px;
  margin: 0 auto 60px;
  padding: 0 20px;
}

.section-title {
  font-size: 1.5rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: -0.5px;
  margin: 0 0 30px 0;
  border-bottom: 2px solid #000;
  padding-bottom: 10px;
  display: inline-block;
}

.activity-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.activity-item {
  display: flex;
  align-items: center;
  padding: 20px;
  border: 1px solid #e0e0e0;
  transition: all 0.3s ease;
}

.activity-item:hover {
  border-color: #000;
}

.activity-icon {
  width: 40px;
  height: 40px;
  background: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 15px;
}

.activity-content {
  flex: 1;
}

.activity-title {
  font-size: 0.9rem;
  font-weight: 500;
  margin-bottom: 4px;
}

.activity-time {
  font-size: 0.8rem;
  color: #666;
}

.activity-status {
  padding: 4px 12px;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.activity-status.pending {
  background: #fff3cd;
  color: #856404;
}

.activity-status.completed {
  background: #d4edda;
  color: #155724;
}

/* 快捷操作 */
.quick-actions {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}

.actions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
}

.action-btn {
  padding: 20px;
  border: none;
  font-size: 0.9rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.action-btn.primary {
  background: #000;
  color: #fff;
}

.action-btn.primary:hover {
  background: #333;
}

.action-btn.secondary {
  background: #fff;
  color: #000;
  border: 1px solid #000;
}

.action-btn.secondary:hover {
  background: #000;
  color: #fff;
}

/* 图标占位符 */
.action-btn i,
.module-icon i,
.activity-icon i {
  display: inline-block;
  width: 1em;
  height: 1em;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .dashboard-title {
    font-size: 2.5rem;
  }

  .welcome-section {
    flex-direction: column;
    align-items: flex-start;
    gap: 30px;
  }

  .quick-stats {
    gap: 20px;
  }

  .modules-grid {
    grid-template-columns: 1fr;
    gap: 20px;
  }

  .actions-grid {
    grid-template-columns: 1fr;
  }

  .activity-item {
    flex-direction: column;
    align-items: flex-start;
    text-align: left;
  }

  .activity-icon {
    margin-right: 0;
    margin-bottom: 10px;
  }
}

@media (max-width: 480px) {
  .dashboard-container {
    padding: 20px 0;
  }

  .dashboard-title {
    font-size: 2rem;
  }

  .quick-stats {
    flex-direction: column;
    gap: 15px;
  }
}
</style>
