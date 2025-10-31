<template>
  <div class="dashboard-container">
    <component :is="currentDashboard" />
  </div>
</template>

<script>
import AdminDashboard from './AdminDashboard.vue';
import UserDashboard from './UserDashboard.vue';

export default {
  name: 'DashboardView',
  components: {
    AdminDashboard,
    UserDashboard
  },
  data() {
    return {
      isAdmin: false
    };
  },
  computed: {
    currentDashboard() {
      return this.isAdmin ? 'AdminDashboard' : 'UserDashboard';
    }
  },
  mounted() {
    this.checkUserRole();
  },
  methods: {
    async checkUserRole() {
      try {
        // 从localStorage获取用户信息
        const userInfo = JSON.parse(localStorage.getItem('userInfo'));
        if (userInfo && (userInfo.role === 'admin' || userInfo.role === 'label_manager')) {
          this.isAdmin = true;
        }
      } catch (error) {
        console.error('获取用户角色失败:', error);
      }
    }
  }
};
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
}

.dashboard-container {
  padding: 20px;
  width: 100%;
  background-color: var(--garrix-light-grey, #f5f7fa);
  min-height: calc(100vh - 60px);
}
</style> 