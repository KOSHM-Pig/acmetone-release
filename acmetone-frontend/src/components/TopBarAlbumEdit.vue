<template>
  <div class="top-bar-album-edit">
    <album-quick-edit
      :album-id="albumId"
      :album-cover="albumData.coverUrl"
      :initial-data="albumData"
      @update:album="handleAlbumUpdate"
      @cover-updated="handleCoverUpdate"
    />
  </div>
</template>

<script setup>
import { ref, defineProps, defineEmits, onMounted, watch } from 'vue';
import { ElMessage } from 'element-plus';
import AlbumQuickEdit from './AlbumQuickEdit.vue';
import api from '@/services/api';
import { STATIC_BASE_URL } from '@/config';

const props = defineProps({
  albumId: {
    type: [String, Number],
    required: true
  }
});

const emit = defineEmits(['album-updated']);

// 专辑数据
const albumData = ref({
  title: '',
  type: '',
  releaseDate: null,
  performer: '',
  description: '',
  coverUrl: '/placeholder-album.png'
});

// 加载状态
const loading = ref(false);

// 获取专辑详情
const fetchAlbumDetail = async () => {
  if (!props.albumId) return;
  
  loading.value = true;
  try {
    const response = await api.get(`/albums/${props.albumId}`);
    const data = response.data;
    
    // 更新专辑数据
    albumData.value = {
      title: data.title || '',
      type: data.type || '专辑',
      releaseDate: data.releaseDate ? new Date(data.releaseDate) : new Date(),
      performer: data.performer || '',
      description: data.description || '',
      coverUrl: data.coverImage ? `${STATIC_BASE_URL}/${data.coverImage}` : '/placeholder-album.png'
    };
    
    // 通知父组件专辑数据已加载
    emit('album-updated', albumData.value);
  } catch (error) {
    console.error('获取专辑详情失败:', error);
    ElMessage.error('获取专辑详情失败');
  } finally {
    loading.value = false;
  }
};

// 处理专辑数据更新
const handleAlbumUpdate = (updatedData) => {
  // 更新本地专辑数据
  albumData.value = {
    ...albumData.value,
    ...updatedData
  };
  
  // 通知父组件专辑数据已更新
  emit('album-updated', albumData.value);
};

// 处理封面更新
const handleCoverUpdate = (coverUrl) => {
  albumData.value.coverUrl = coverUrl;
  
  // 通知父组件专辑数据已更新
  emit('album-updated', albumData.value);
};

// 监听albumId变化，重新获取专辑详情
watch(() => props.albumId, (newId, oldId) => {
  if (newId && newId !== oldId) {
    fetchAlbumDetail();
  }
});

// 组件挂载时获取专辑详情
onMounted(() => {
  if (props.albumId) {
    fetchAlbumDetail();
  }
});
</script>

<style scoped>
.top-bar-album-edit {
  height: 100%;
  width: 100%;
}
</style> 