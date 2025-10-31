<template>
  <div>
    <!-- 显示对应角色的Header -->
    <LabelHeader :user-role="getRoleDisplayName(currentRole)" />

    <!-- 主要内容区域 -->
    <div class="test-content">
      <h1>Header测试页面</h1>
      <p>点击左侧菜单图标查看不同角色的菜单，包含迷你图表和日历</p>

      <div class="feature-highlight">
        <h3>✨ 新功能展示</h3>
        <ul>
          <li><strong>角色菜单</strong>：图标和文字在同一行，8px统一字体大小</li>
          <li><strong>迷你图表</strong>：显示过去7天的活动趋势，不同角色有不同数据</li>
          <li><strong>迷你日历</strong>：显示本周日期，高亮今天和有活动的日期</li>
          <li><strong>响应式设计</strong>：1200px以下屏幕自动隐藏菜单</li>
        </ul>
      </div>

      <!-- 内容区域 -->
      <div class="content-section">
        <h3>当前角色: {{ getRoleDisplayName(currentRole) }}</h3>
        <p>这是测试内容区域，用于验证Header菜单功能。</p>

        <!-- 快速链接 -->
        <div class="quick-links">
          <h4>快速链接</h4>
          <div class="link-buttons">
            <router-link to="/owner/settings" class="link-button">
              主理人设置页面 (新acmetone风格)
            </router-link>
          </div>
          <p class="link-description">
            全新设计的主理人信息设置页面，采用acmetone风格的非对称布局，
            包含品牌形象管理、Logo上传、音乐风格选择等功能。
          </p>
        </div>

        <div class="test-section">
          <h4>数据获取测试</h4>
          <div class="button-group">
            <button @click="testUserService" class="test-button">测试用户服务</button>
            <button @click="testLabelService" class="test-button">测试厂牌服务</button>
          </div>

          <div v-if="testResults" class="test-results">
            <pre>{{ JSON.stringify(testResults, null, 2) }}</pre>
          </div>
        </div>
      </div>

      <!-- 角色切换区域 - 移到页面下方 -->
      <div class="role-switcher">
        <h2>角色切换测试</h2>
        <p>切换不同角色查看对应的菜单项</p>
        <div class="role-buttons">
          <button @click="currentRole = 'owner'" :class="{ active: currentRole === 'owner' }" class="role-button">
            主理人
          </button>
          <button @click="currentRole = 'reviewer'" :class="{ active: currentRole === 'reviewer' }" class="role-button">
            审核
          </button>
          <button @click="currentRole = 'designer'" :class="{ active: currentRole === 'designer' }" class="role-button">
            美工
          </button>
          <button @click="currentRole = 'copywriter'" :class="{ active: currentRole === 'copywriter' }" class="role-button">
            文案
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import LabelHeader from '../components/LabelHeader.vue'
import LabelService from '../services/LabelService'
import UserService from '../services/UserService'

const currentRole = ref('owner')
const testResults = ref(null)

const getRoleDisplayName = (role) => {
  const roleNames = {
    'owner': '主理人',
    'reviewer': '审核',
    'designer': '美工',
    'copywriter': '文案'
  }
  return roleNames[role] || '用户'
}

const testUserService = async () => {
  try {
    console.log('测试用户服务...')
    const result = await UserService.getCurrentUser()
    testResults.value = {
      service: 'UserService',
      method: 'getCurrentUser',
      result
    }
  } catch (error) {
    testResults.value = {
      service: 'UserService',
      method: 'getCurrentUser',
      error: error.message
    }
  }
}

const testLabelService = async () => {
  try {
    console.log('测试厂牌服务...')
    const result = await LabelService.getUserLabelRole()
    testResults.value = {
      service: 'LabelService',
      method: 'getUserLabelRole',
      result
    }
  } catch (error) {
    testResults.value = {
      service: 'LabelService',
      method: 'getUserLabelRole',
      error: error.message
    }
  }
}
</script>

<style scoped>
.test-content {
  padding: 40px 20px;
  max-width: 1200px;
  margin: 0 auto;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.test-content h1 {
  font-size: 32px;
  font-weight: 700;
  color: #1a1a1a;
  margin-bottom: 8px;
}

.test-content > p {
  color: #666;
  font-size: 16px;
  margin-bottom: 40px;
}

.content-section {
  background: #f8f9fa;
  padding: 30px;
  border-radius: 8px;
  margin-bottom: 40px;
}

.content-section h3 {
  color: #1a1a1a;
  margin-bottom: 16px;
}

.quick-links {
  margin-top: 24px;
  padding: 20px;
  background: #fff;
  border-radius: 8px;
  border: 1px solid #e1e5e9;
}

.quick-links h4 {
  color: #333;
  margin-bottom: 12px;
}

.link-buttons {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.link-button {
  display: inline-block;
  padding: 8px 16px;
  background: #000;
  color: white;
  text-decoration: none;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
}

.link-button:hover {
  background: #333;
  transform: translateY(-1px);
}

.link-description {
  margin-top: 12px;
  font-size: 14px;
  color: #666;
  line-height: 1.5;
}

.test-section {
  margin-top: 30px;
}

.test-section h4 {
  color: #333;
  margin-bottom: 16px;
}

.button-group {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

.test-button {
  padding: 8px 16px;
  border: 1px solid #ddd;
  background: white;
  cursor: pointer;
  border-radius: 4px;
  font-size: 14px;
  transition: all 0.2s ease;
}

.test-button:hover {
  background: #f8f9fa;
  border-color: #999;
}

.test-results {
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 16px;
  margin-top: 16px;
}

.test-results pre {
  font-size: 12px;
  max-height: 300px;
  overflow-y: auto;
  margin: 0;
  color: #333;
}

/* 角色切换区域 */
.role-switcher {
  background: #fff;
  border: 1px solid #e1e5e9;
  border-radius: 8px;
  padding: 30px;
  text-align: center;
}

.role-switcher h2 {
  color: #1a1a1a;
  margin-bottom: 8px;
  font-size: 24px;
}

.role-switcher > p {
  color: #666;
  margin-bottom: 24px;
}

.role-buttons {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
}

.role-button {
  padding: 12px 24px;
  border: 2px solid #e1e5e9;
  background: white;
  cursor: pointer;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
  color: #333;
}

.role-button:hover {
  border-color: #999;
  background: #f8f9fa;
}

.role-button.active {
  background: #000;
  color: white;
  border-color: #000;
}

.role-button.active:hover {
  background: #333;
  border-color: #333;
}

@media (max-width: 768px) {
  .test-content {
    padding: 20px 16px;
  }

  .button-group {
    flex-direction: column;
  }

  .role-buttons {
    flex-direction: column;
    align-items: center;
  }

  .role-button {
    width: 200px;
  }
}
</style>
