<template>
  <div class="rights-chain-demo">
    <el-card class="demo-card">
      <template #header>
        <div class="demo-header">
          <h1>权利链条可视化 - Apple设计风格</h1>
          <p>参考Apple官网设计风格的权利链条流程图展示</p>
        </div>
      </template>
      
      <!-- 权利链条流程图 -->
      <RightsChainFlow :album-id="albumId" :can-edit="true" />
      
      <!-- 示例控制 -->
      <div class="demo-controls">
        <p class="controls-title">演示控制</p>
        <div class="controls-row">
          <span class="control-label">选择专辑：</span>
          <el-select v-model="albumId" placeholder="请选择专辑" filterable>
            <el-option
              v-for="album in albums"
              :key="album.id"
              :label="album.title"
              :value="album.id"
            />
          </el-select>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import RightsChainFlow from '@/components/RightsChainFlow.vue';
import api from '@/services/api';

// 响应式状态
const albums = ref([]);
const albumId = ref(null);

// 获取专辑列表
const fetchAlbums = async () => {
  try {
    const response = await api.get('/albums', {
      params: {
        limit: 10,
        offset: 0,
        sort: 'createdAt',
        order: 'DESC'
      }
    });
    
    albums.value = response.data.rows || [];
    // 如果有专辑，默认选择第一个
    if (albums.value.length > 0) {
      albumId.value = albums.value[0].id;
    }
  } catch (error) {
    console.error('获取专辑列表失败:', error);
    ElMessage.error('获取专辑列表失败');
  }
};

// 组件挂载时获取专辑列表
onMounted(() => {
  fetchAlbums();
});
</script>

<style scoped>
.rights-chain-demo {
  padding: 20px;
  background-color: #f5f5f7; /* Apple 背景色 */
  min-height: calc(100vh - 100px);
}

.demo-card {
  margin-bottom: 20px;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  border: none;
}

.demo-header {
  display: flex;
  flex-direction: column;
}

.demo-header h1 {
  font-family: "SF Pro Display", "PingFang SC", "Helvetica Neue", "Helvetica", "Arial", sans-serif;
  font-size: 28px;
  font-weight: 600;
  margin: 0 0 8px 0;
  color: #1d1d1f;
}

.demo-header p {
  font-family: "SF Pro Text", "PingFang SC", "Helvetica Neue", "Helvetica", "Arial", sans-serif;
  color: #86868b;
  margin: 0;
  font-size: 16px;
}

.demo-controls {
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid #d2d2d7;
}

.controls-title {
  font-family: "SF Pro Text", "PingFang SC", "Helvetica Neue", "Helvetica", "Arial", sans-serif;
  font-weight: 600;
  font-size: 16px;
  color: #1d1d1f;
  margin-bottom: 16px;
}

.controls-row {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
}

.control-label {
  min-width: 100px;
  color: #86868b;
}
</style> 