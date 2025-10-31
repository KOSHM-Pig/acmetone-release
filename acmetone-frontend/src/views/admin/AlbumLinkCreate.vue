<template>
  <div class="album-link-create">
    <el-card class="main-card box-card">
      <template #header>
        <div class="card-header">
          <h2>创建专辑链接</h2>
          <el-button @click="$router.push('/admin/album-links')" plain>
            <el-icon><Back /></el-icon> 返回列表
          </el-button>
        </div>
      </template>
      
      <div v-if="error" class="error-message">
        <el-alert :title="error" type="error" :closable="false" show-icon />
      </div>
      
      <album-link-form
        :is-editing="false"
        @submit="handleSubmit"
        @cancel="$router.push('/admin/album-links')"
      />
    </el-card>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { Back } from '@element-plus/icons-vue';
import AlbumLinkForm from '@/components/AlbumLinkForm.vue';
import { useAlbumLinkStore } from '@/stores/albumLink';

const router = useRouter();
const albumLinkStore = useAlbumLinkStore();
const error = ref(null);

const handleSubmit = async ({ formData, jsonData, isInternalType, selectedAlbum }) => {
  try {
    error.value = null;
    let result;
    
    if (isInternalType) {
      // 使用JSON格式创建内部专辑链接
      
      result = await albumLinkStore.createInternalLink(jsonData);
      
      // 如果有关联的内部专辑和歌曲，为每首歌曲添加正确的歌手信息
      if (selectedAlbum && selectedAlbum.id && result.id) {
        try {
          
          
          // 获取内部专辑的歌曲列表
          const internalSongs = await albumLinkStore.fetchInternalAlbumSongs(selectedAlbum.id);
          
          if (internalSongs && internalSongs.length > 0) {
            
            
            // 为每首歌曲添加到专辑链接
            for (const song of internalSongs) {
              // 确保优先使用歌曲自己的歌手信息
              const songData = {
                songName: song.title,
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
              
              
              await albumLinkStore.addSongToAlbum(result.id, songData);
            }
            
            ElMessage.success(`成功添加 ${internalSongs.length} 首歌曲到专辑链接`);
          }
        } catch (err) {
          console.error('获取或添加内部歌曲时出错:', err);
          ElMessage.warning('部分歌曲可能未成功添加，请检查并手动调整');
        }
      }
    } else {
      // 使用FormData创建外部专辑链接
      
      result = await albumLinkStore.createLink(formData);
    }
    
    ElMessage.success('专辑链接创建成功');
    
    // 跳转到歌曲管理页面
    router.push(`/admin/album-links/${result.id}/songs`);
  } catch (err) {
    console.error('创建专辑链接失败:', err);
    error.value = err.response?.data?.message || err.message || '创建失败，请检查表单填写是否正确';
    ElMessage.error(error.value);
  }
};
</script>

<style scoped>
.album-link-create {
  padding: 20px;
  background-color: #F5F7FA;
  min-height: 100vh;
}

.box-card {
  border: 2px solid #000;
  border-radius: 0;
  box-shadow: 5px 5px 0px 0px #000;
  background-color: #fff;
}

:deep(.el-card__header) {
  border-bottom: 2px solid #000;
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
  border: 2px solid #000;
  font-weight: bold;
  text-transform: uppercase;
}

:deep(.el-button.is-plain) {
  background-color: #fff;
  color: #000;
}
:deep(.el-button.is-plain:hover) {
  background-color: #f0f0f0;
}

.error-message {
  margin-bottom: 20px;
}
</style> 