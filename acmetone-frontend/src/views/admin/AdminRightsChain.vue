<template>
  <div class="admin-rights-chain-page">
    <el-card class="page-card">
      <template #header>
        <div class="card-header">
          <h1>权利链条管理</h1>
          <p class="subtitle">查看和管理专辑的权利链条，包括专辑、歌曲和歌手之间的授权关系</p>
        </div>
      </template>
      
      <!-- 专辑选择器 -->
      <div class="album-selector">
        <el-form :inline="true">
          <el-form-item label="选择专辑">
            <el-select 
              v-model="selectedAlbumId" 
              placeholder="请选择专辑" 
              filterable 
              clearable
              @change="handleAlbumChange"
            >
              <el-option
                v-for="album in albums"
                :key="album.id"
                :label="album.title"
                :value="album.id"
              />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="fetchAlbums">刷新专辑列表</el-button>
          </el-form-item>
        </el-form>
      </div>
      
      <!-- 权利链条视图 -->
      <div v-if="selectedAlbumId" class="rights-chain-view">
        <RightsChainViewer :album-id="selectedAlbumId" :can-edit="true" />
      </div>
      
      <div v-else class="no-album-selected">
        <el-empty description="请选择一个专辑查看其权利链条" />
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import RightsChainViewer from '@/components/RightsChainViewer.vue';
import api from '@/services/api';

// 响应式状态
const albums = ref([]);
const selectedAlbumId = ref(null);
const loading = ref(false);

// 获取专辑列表
const fetchAlbums = async () => {
  loading.value = true;
  
  try {
    const response = await api.get('/albums', {
      params: {
        limit: 100,
        offset: 0,
        sort: 'createdAt',
        order: 'DESC'
      }
    });
    
    albums.value = response.data.rows || [];
  } catch (error) {
    console.error('获取专辑列表失败:', error);
    ElMessage.error('获取专辑列表失败');
  } finally {
    loading.value = false;
  }
};

// 处理专辑选择变化
const handleAlbumChange = (albumId) => {
  selectedAlbumId.value = albumId;
};

// 组件挂载时获取专辑列表
onMounted(() => {
  fetchAlbums();
});
</script>

<style scoped>
.admin-rights-chain-page {
  padding: 20px;
}

.page-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  flex-direction: column;
}

.card-header h1 {
  font-size: 24px;
  margin: 0 0 10px 0;
}

.subtitle {
  color: #909399;
  margin: 0;
}

.album-selector {
  margin-bottom: 20px;
}

.rights-chain-view {
  margin-top: 20px;
}

.no-album-selected {
  padding: 40px 0;
}
</style> 