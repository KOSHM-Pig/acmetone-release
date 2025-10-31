<template>
  <div>
    <!-- 顶部Header -->
    <LabelHeader user-role="文案" />

    <!-- 主要内容区域 -->
    <div class="page-container">
      <div class="background-text">COPYWRITER</div>
      <div class="grid-container">
        <div class="left-panel">
          <h1 class="page-title">文案仪表盘</h1>
          <p class="page-subtitle">撰写推广文案，策划营销活动，传播厂牌文化。</p>
        </div>
        <div class="right-panel">
          <div class="content-form">
            <div class="form-group">
              <AcmetoneSelect
                v-model="selectedModule"
                :options="moduleOptions"
                label="功能模块"
                placeholder="选择功能模块"
              />
            </div>

            <div class="form-group">
              <AcmetoneBtn
                type="primary"
                size="large"
                class="action-button"
                :disabled="!selectedModule"
                @click="handleEnterModule"
              >
                进入模块
              </AcmetoneBtn>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import AcmetoneBtn from '../../components/acmetone/AcmetoneBtn.vue';
import AcmetoneSelect from '../../components/acmetone/AcmetoneSelect.vue';
import LabelHeader from '../../components/LabelHeader.vue';

const router = useRouter();
const selectedModule = ref('');

const moduleOptions = [
  { value: 'writing-tasks', label: '文案任务' },
  { value: 'content-library', label: '内容库' },
  { value: 'style-guide', label: '风格指南' },
  { value: 'campaigns', label: '推广活动' },
  { value: 'settings', label: '设置' }
];

const handleEnterModule = () => {
  console.log('文案进入模块:', selectedModule.value);
  
  const moduleRoutes = {
    'writing-tasks': '/copywriter/tasks',
    'content-library': '/copywriter/library',
    'style-guide': '/copywriter/guide',
    'campaigns': '/copywriter/campaigns',
    'settings': '/settings'
  };

  const route = moduleRoutes[selectedModule.value];
  if (route) {
    console.log('跳转到:', route);
    alert(`文案模块 - 即将跳转到: ${route}`);
    // router.push(route);
  }
};
</script>

<style scoped>
.page-container {
  padding: 140px 5% 60px; /* 顶部增加padding为header留空间 */
  background-color: #fff;
  color: #1a1a1a;
  min-height: calc(100vh - 80px); /* 减去header高度 */
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
}

.background-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) rotate(90deg);
  font-size: 18vw;
  font-weight: 900;
  color: rgba(0, 0, 0, 0.04);
  z-index: 1;
  pointer-events: none;
  white-space: nowrap;
}

.grid-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10%;
  align-items: center;
  position: relative;
  z-index: 2;
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
}

.left-panel {
  max-width: 450px;
}

.page-title {
  font-size: 64px;
  font-weight: 900;
  line-height: 1.1;
  margin-bottom: 24px;
}

.page-subtitle {
  font-size: 16px;
  color: #555;
  line-height: 1.6;
}

.content-form {
  max-width: 400px;
}

.form-group {
  margin-bottom: 28px;
}

.action-button {
  width: 100%;
  padding: 24px;
  font-size: 16px;
  font-weight: 700;
  margin-top: 10px;
}

@media (max-width: 992px) {
  .grid-container {
    grid-template-columns: 1fr;
    gap: 60px;
    text-align: center;
  }
  
  .left-panel, .content-form {
    margin: 0 auto;
  }
  
  .background-text {
    font-size: 25vw;
    top: 30%;
  }
  
  .page-title {
    font-size: 48px;
  }
}
</style>
