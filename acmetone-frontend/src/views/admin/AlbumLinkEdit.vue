<template>
  <div class="album-link-edit">
    <el-card class="main-card box-card">
      <template #header>
        <div class="card-header">
          <h2>编辑专辑链接</h2>
          <el-button @click="$router.push('/admin/album-links')" plain>
            <el-icon><Back /></el-icon> 返回列表
          </el-button>
        </div>
      </template>
      
      <el-skeleton :loading="loading" animated :rows="10">
        <template #default>
          <div v-if="error" class="error-message">
            <el-alert :title="error" type="error" :closable="false" show-icon />
          </div>
          
          <album-link-form
            v-if="albumLink"
            :is-editing="true"
            :initial-data="albumLink"
            @submit="handleSubmit"
            @cancel="$router.push('/admin/album-links')"
          />
        </template>
      </el-skeleton>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { ElMessage } from 'element-plus';
import { Back } from '@element-plus/icons-vue';
import AlbumLinkForm from '@/components/AlbumLinkForm.vue';
import { useAlbumLinkStore } from '@/stores/albumLink';

const router = useRouter();
const route = useRoute();
const albumLinkStore = useAlbumLinkStore();
const error = ref(null);
const loading = ref(true);
const albumLink = ref(null);

const fetchAlbumLink = async () => {
  const id = route.params.id;
  if (!id) {
    error.value = '未指定编辑的专辑链接ID';
    loading.value = false;
    return;
  }
  
  try {
    loading.value = true;
    error.value = null;
    
    
    
    // 使用改进后的fetchLinkById方法获取专辑详情
    const response = await albumLinkStore.fetchLinkById(id);
    
    
    if (response) {
      albumLink.value = response;
    } else {
      error.value = '未找到指定的专辑链接';
      ElMessage.error('未找到指定的专辑链接');
    }
  } catch (err) {
    console.error('获取专辑链接详情失败:', err);
    error.value = err.toString();
    ElMessage.error(err.toString() || '获取专辑链接详情失败');
  } finally {
    loading.value = false;
  }
};

const handleSubmit = async ({ jsonData, selectedAlbum }) => {
  const id = route.params.id;
  try {
    error.value = null;
    loading.value = true;
    
    
    
    // 检查是否是内部专辑类型
    const isInternalType = jsonData.albumType === 'internal';
    
    // 如果是内部专辑类型，确保正确处理关联
    if (isInternalType && selectedAlbum && selectedAlbum.id) {
      
      
      // 确保jsonData包含正确的内部专辑信息
      jsonData.internalAlbumId = selectedAlbum.id;
      jsonData.albumName = selectedAlbum.title;
      jsonData.artistName = selectedAlbum.displayInfo;
      jsonData.releaseDate = selectedAlbum.releaseDate || new Date().toISOString().split('T')[0];
      jsonData.coverImage = selectedAlbum.coverImage;
      jsonData.performers = selectedAlbum.performers || [];
      jsonData.performer = selectedAlbum.performer || '';
      
     
      
      try {
        // 获取当前专辑链接的歌曲
        const currentLink = await albumLinkStore.fetchLinkById(id);
        const currentSongs = currentLink?.songs || [];
        
        // 获取内部专辑的歌曲
        const internalSongs = await albumLinkStore.fetchInternalAlbumSongs(selectedAlbum.id);
        
        if (internalSongs && internalSongs.length > 0) {
          
    
          // 如果当前没有歌曲，或者用户确认替换
          if (currentSongs.length === 0 || confirm('是否用内部专辑的歌曲替换当前歌曲?')) {
            // 先删除当前歌曲
            for (const song of currentSongs) {
              await albumLinkStore.deleteSong(id, song.id);
            }
            
            // 添加内部专辑的歌曲
            for (const song of internalSongs) {
              const songData = {
                songName: song.title,
                trackNumber: song.trackNumber || 1,
                // 构建歌手名称优先级：1.artistName 2.performers 3.performer 4.专辑表演者 5.专辑发行方
                artistName: song.artistName || 
                  (song.performers && song.performers.length > 0 ? song.performers.join(' & ') : 
                    (song.performer || 
                      (selectedAlbum.performers && selectedAlbum.performers.length > 0 ? selectedAlbum.performers.join(' & ') : 
                        selectedAlbum.performer || selectedAlbum.displayInfo))),
                // 双重保存表演者信息，确保后端能正确处理
                performers: song.performers || selectedAlbum.performers || [],
                performer: song.performer || selectedAlbum.performer || ''
              };
              
              
              await albumLinkStore.addSongToAlbum(id, songData);
            }
            
            ElMessage.success(`成功更新 ${internalSongs.length} 首歌曲`);
          }
        }
      } catch (err) {
        console.error('更新歌曲信息失败:', err);
        ElMessage.warning('专辑信息已更新，但歌曲同步可能部分失败');
      }
    }

    // 直接使用updateLink方法，传递从表单组件接收的jsonData
    const result = await albumLinkStore.updateLink(parseInt(id), jsonData);
    
    
    
    ElMessage.success('专辑链接更新成功');
    
    // 返回列表页
    router.push('/admin/album-links');
  } catch (err) {
    console.error('更新专辑链接失败:', err);
    if (err.response) {
      console.error('服务器响应:', err.response.data);
      error.value = `更新失败: ${err.response.data.message || err.response.statusText}`;
    } else {
      error.value = err.message || '更新失败，请检查表单填写是否正确';
    }
    ElMessage.error(error.value);
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  fetchAlbumLink();
});
</script>

<style scoped>
.album-link-edit {
  padding: 20px;
  background-color: #F5F7FA;
  min-height: 100vh;
}

.box-card {
  border: 0.5px solid rgba(0, 0, 0, 0.8);
  border-radius: 0;
  box-shadow: 2px 2px 0px 0px rgba(0, 0, 0, 0.6);
  background-color: #fff;
}

:deep(.el-card__header) {
  border-bottom: 0.5px solid rgba(0, 0, 0, 0.8);
  padding: 20px;
  background-color: #fff;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-header h2 {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  text-transform: uppercase;
}

:deep(.el-button) {
  border-radius: 0;
  border: 0.5px solid rgba(0, 0, 0, 0.8);
  font-weight: bold;
  text-transform: uppercase;
}

:deep(.el-button.is-plain) {
  background-color: #fff;
  color: rgba(0, 0, 0, 0.8);
}
:deep(.el-button.is-plain:hover) {
  background-color: #f5f5f5;
  border-color: rgba(0, 0, 0, 0.9);
  color: rgba(0, 0, 0, 0.9);
}

.error-message {
  margin-bottom: 20px;
}
</style> 