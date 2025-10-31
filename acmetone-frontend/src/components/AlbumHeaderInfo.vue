<template>
  <div class="album-header-info">
    <div class="album-header-container">
      <!-- 左侧专辑封面 -->
      <div class="album-cover-container">
        <top-bar-album-edit
          :album-id="albumId"
          @album-updated="handleAlbumUpdated"
        />
      </div>
      
      <!-- 右侧专辑信息 -->
      <div class="album-info-container">
        <div class="album-title">{{ albumData.title || '未命名专辑' }}</div>
        <div class="album-meta">
          <span class="album-type">{{ albumData.type || '专辑' }}</span>
          <span class="meta-separator">·</span>
          <span class="album-date">{{ formatDate(albumData.releaseDate) }}</span>
          <span class="meta-separator">·</span>
          <span class="album-performer">{{ albumData.performer || '未知表演者' }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, defineProps } from 'vue';
import TopBarAlbumEdit from './TopBarAlbumEdit.vue';

const props = defineProps({
  albumId: {
    type: [String, Number],
    required: true
  }
});

// 专辑数据
const albumData = ref({
  title: '',
  type: '',
  releaseDate: null,
  performer: '',
  description: '',
  coverUrl: ''
});

// 处理专辑数据更新
const handleAlbumUpdated = (data) => {
  albumData.value = data;
};

// 格式化日期
const formatDate = (date) => {
  if (!date) return '';
  
  if (typeof date === 'string') {
    date = new Date(date);
  }
  
  if (!(date instanceof Date) || isNaN(date)) {
    return '';
  }
  
  return date.toLocaleDateString('zh-CN');
};
</script>

<style scoped>
.album-header-info {
  display: flex;
  align-items: center;
  height: 100%;
  width: 100%;
  padding: 0 10px;
}

.album-header-container {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  height: 100%;
}

.album-cover-container {
  width: 40px;
  height: 40px;
  border-radius: 4px;
  overflow: hidden;
  flex-shrink: 0;
}

.album-info-container {
  display: flex;
  flex-direction: column;
  justify-content: center;
  overflow: hidden;
}

.album-title {
  font-size: 14px;
  font-weight: 500;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.album-meta {
  font-size: 12px;
  color: #666;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.meta-separator {
  margin: 0 4px;
  color: #999;
}
</style> 