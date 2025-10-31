<template>
  <div class="api-response-viewer">
    <div class="view-toggle">
      <el-radio-group v-model="viewMode" size="large">
        <el-radio-button label="card">卡片视图</el-radio-button>
        <el-radio-button label="raw">原始数据</el-radio-button>
      </el-radio-group>
    </div>

    <!-- 卡片视图 -->
    <div v-if="viewMode === 'card'" class="card-view">
      <!-- 网易云音乐专辑卡片 - 直接对象格式 -->
      <template v-if="isNeteaseAlbumResponse && parsedData && parsedData.hotAlbums">
        <div class="album-cards">
          <el-card v-for="album in parsedData.hotAlbums" :key="album.id" class="album-card">
            <div class="album-header">
              <img :src="album.picUrl" class="album-cover" />
              <div class="album-info">
                <h3 class="album-title">{{ album.name }}</h3>
                <p class="album-artist">{{ album.artist?.name }}</p>
                <p class="album-date">发行时间: {{ formatDate(album.publishTime) }}</p>
                <p class="album-type">类型: {{ album.type }}</p>
              </div>
            </div>
            <div class="album-description" v-if="album.description">
              <p>{{ album.description }}</p>
            </div>
            <div class="album-songs" v-if="album.songs && album.songs.length > 0">
              <h4>歌曲列表</h4>
              <ul>
                <li v-for="song in album.songs" :key="song.id">{{ song.name }}</li>
              </ul>
            </div>
            <div class="album-links">
              <a :href="`https://music.163.com/#/album?id=${album.id}`" target="_blank">
                <el-button type="primary" size="small">在网易云音乐查看</el-button>
              </a>
            </div>
          </el-card>
        </div>
      </template>

      <!-- 网易云音乐专辑卡片 - 数组格式 -->
      <template v-else-if="isNeteaseAlbumArrayResponse">
        <div v-for="(item, index) in parsedData" :key="index">
          <h3 class="artist-name" v-if="item.artist && item.artist.name">
            歌手: {{ item.artist.name }}
            <span v-if="item.artist.alias && item.artist.alias.length > 0" class="artist-alias">
              ({{ item.artist.alias.join(', ') }})
            </span>
          </h3>
          
          <div class="album-cards" v-if="item.hotAlbums && item.hotAlbums.length > 0">
            <el-card v-for="album in item.hotAlbums" :key="album.id" class="album-card">
              <div class="album-header">
                <img :src="album.picUrl" class="album-cover" />
                <div class="album-info">
                  <h3 class="album-title">{{ album.name }}</h3>
                  <p class="album-artist">{{ album.artist?.name }}</p>
                  <p class="album-date">发行时间: {{ formatDate(album.publishTime) }}</p>
                  <p class="album-type">类型: {{ album.type }}</p>
                </div>
              </div>
              <div class="album-description" v-if="album.description">
                <p>{{ album.description }}</p>
              </div>
              <div class="album-artists" v-if="album.artists && album.artists.length > 0">
                <h4>参与艺术家</h4>
                <el-tag 
                  v-for="artist in album.artists" 
                  :key="artist.id" 
                  class="artist-tag"
                  size="small"
                >
                  {{ artist.name }}
                </el-tag>
              </div>
              <div class="album-links">
                <a :href="`https://music.163.com/#/album?id=${album.id}`" target="_blank">
                  <el-button type="primary" size="small">在网易云音乐查看</el-button>
                </a>
              </div>
            </el-card>
          </div>
        </div>
      </template>

      <!-- 网易云音乐搜索结果卡片 -->
      <template v-else-if="isNeteaseSearchResponse && parsedData && parsedData.result && parsedData.result.albums">
        <div class="album-cards">
          <el-card v-for="album in parsedData.result.albums" :key="album.id" class="album-card">
            <div class="album-header">
              <img :src="album.picUrl" class="album-cover" />
              <div class="album-info">
                <h3 class="album-title">{{ album.name }}</h3>
                <p class="album-artist">{{ album.artist?.name }}</p>
                <p class="album-date">发行时间: {{ formatDate(album.publishTime) }}</p>
                <p class="album-type">类型: {{ album.type }}</p>
              </div>
            </div>
            <div class="album-links">
              <a :href="`https://music.163.com/#/album?id=${album.id}`" target="_blank">
                <el-button type="primary" size="small">在网易云音乐查看</el-button>
              </a>
            </div>
          </el-card>
        </div>
      </template>

      <!-- QQ音乐专辑卡片 -->
      <template v-else-if="isQQMusicResponse && parsedData && parsedData.data">
        <div class="album-cards">
          <el-card v-for="album in parsedData.data" :key="album.albumID" class="album-card">
            <div class="album-header">
              <div class="album-cover qq-music-cover">
                <el-icon class="qq-music-icon"><Picture /></el-icon>
              </div>
              <div class="album-info">
                <h3 class="album-title">{{ album.albumName }}</h3>
                <p class="album-artist">{{ album.singerName }}</p>
                <p class="album-date">发行时间: {{ album.publishDate || '未知' }}</p>
                <p class="album-type">类型: {{ album.albumType || '未知' }}</p>
              </div>
            </div>
            <div class="album-meta" v-if="album.albumTranName">
              <p>翻译名称: {{ album.albumTranName }}</p>
            </div>
            <div class="album-links">
              <a :href="`https://y.qq.com/n/ryqq/albumDetail/${album.albumMid}`" target="_blank">
                <el-button type="primary" size="small">在QQ音乐查看</el-button>
              </a>
            </div>
          </el-card>
        </div>
      </template>

      <!-- QQ音乐专辑数组卡片 -->
      <template v-else-if="isQQMusicArrayResponse">
        <div v-for="(item, index) in parsedData" :key="index">
          <div class="album-cards" v-if="item.data && item.data.length > 0">
            <el-card v-for="album in item.data" :key="album.albumID" class="album-card">
              <div class="album-header">
                <div class="album-cover qq-music-cover">
                  <el-icon class="qq-music-icon"><Picture /></el-icon>
                </div>
                <div class="album-info">
                  <h3 class="album-title">{{ album.albumName }}</h3>
                  <p class="album-artist">{{ album.singerName }}</p>
                  <p class="album-date">发行时间: {{ album.publishDate || '未知' }}</p>
                  <p class="album-type">类型: {{ album.albumType || '未知' }}</p>
                </div>
              </div>
              <div class="album-meta" v-if="album.albumTranName">
                <p>翻译名称: {{ album.albumTranName }}</p>
              </div>
              <div class="album-links">
                <a :href="`https://y.qq.com/n/ryqq/albumDetail/${album.albumMid}`" target="_blank">
                  <el-button type="primary" size="small">在QQ音乐查看</el-button>
                </a>
              </div>
            </el-card>
          </div>
        </div>
      </template>

      <!-- 通用卡片视图 -->
      <template v-else>
        <el-empty description="无法识别的数据格式或空数据" />
      </template>
    </div>

    <!-- 原始数据视图 -->
    <div v-else class="raw-view">
      <el-card class="raw-data-card">
        <div class="raw-data-header">
          <h3>原始API响应数据</h3>
          <el-button type="primary" size="small" @click="copyToClipboard">
            <el-icon><DocumentCopy /></el-icon> 复制
          </el-button>
        </div>
        <pre class="raw-data-content">{{ formattedData }}</pre>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { DocumentCopy, Picture } from '@element-plus/icons-vue';

const props = defineProps({
  responseData: {
    type: [Object, Array, String],
    required: true
  }
});

const viewMode = ref('card');
const parsedData = ref(null);

// 解析响应数据
const parseData = () => {
  if (typeof props.responseData === 'string') {
    try {
      parsedData.value = JSON.parse(props.responseData);
    } catch (e) {
      console.error('解析API响应数据失败:', e);
      parsedData.value = null;
    }
  } else {
    parsedData.value = props.responseData;
  }
};

// 监听响应数据变化
watch(() => props.responseData, () => {
  parseData();
}, { immediate: true });

// 判断是否是网易云音乐专辑响应
const isNeteaseAlbumResponse = computed(() => {
  return parsedData.value && 
    !Array.isArray(parsedData.value) &&
    (parsedData.value.hotAlbums || 
     (parsedData.value.artist && parsedData.value.artist.name));
});

// 判断是否是网易云音乐专辑数组响应
const isNeteaseAlbumArrayResponse = computed(() => {
  return Array.isArray(parsedData.value) && 
    parsedData.value.length > 0 && 
    parsedData.value.some(item => item.hotAlbums && Array.isArray(item.hotAlbums));
});

// 判断是否是网易云音乐搜索响应
const isNeteaseSearchResponse = computed(() => {
  return parsedData.value && 
    !Array.isArray(parsedData.value) &&
    parsedData.value.result && 
    parsedData.value.result.albums;
});

// 判断是否是QQ音乐响应
const isQQMusicResponse = computed(() => {
  return parsedData.value && 
    !Array.isArray(parsedData.value) &&
    parsedData.value.data;
});

// 判断是否是QQ音乐数组响应
const isQQMusicArrayResponse = computed(() => {
  return Array.isArray(parsedData.value) && 
    parsedData.value.length > 0 && 
    parsedData.value.some(item => item.data && Array.isArray(item.data));
});

// 格式化日期
const formatDate = (timestamp) => {
  if (!timestamp) return '未知';
  const date = new Date(timestamp);
  return date.toLocaleDateString('zh-CN');
};

// 格式化原始数据
const formattedData = computed(() => {
  try {
    return JSON.stringify(parsedData.value, null, 2);
  } catch (e) {
    return String(props.responseData);
  }
});

// 复制到剪贴板
const copyToClipboard = () => {
  navigator.clipboard.writeText(formattedData.value)
    .then(() => {
      ElMessage.success('已复制到剪贴板');
    })
    .catch(err => {
      console.error('复制失败:', err);
      ElMessage.error('复制失败');
    });
};
</script>

<style scoped>
.api-response-viewer {
  width: 100%;
  margin-bottom: 20px;
}

.view-toggle {
  margin-bottom: 20px;
  text-align: center;
}

.card-view {
  margin-top: 20px;
}

.album-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.album-card {
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.3s ease;
}

.album-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
}

.album-header {
  display: flex;
  margin-bottom: 15px;
}

.album-cover {
  width: 100px;
  height: 100px;
  object-fit: cover;
  border-radius: 4px;
}

.album-info {
  margin-left: 15px;
  flex: 1;
}

.album-title {
  margin: 0 0 5px;
  font-size: 18px;
  font-weight: bold;
}

.album-artist {
  margin: 0 0 5px;
  color: #666;
}

.album-date, .album-type {
  margin: 0 0 5px;
  font-size: 13px;
  color: #888;
}

.album-description {
  margin-top: 10px;
  font-size: 14px;
  color: #666;
  max-height: 100px;
  overflow-y: auto;
}

.album-songs {
  margin-top: 15px;
}

.album-songs h4 {
  margin: 0 0 10px;
  font-size: 16px;
}

.album-songs ul {
  padding-left: 20px;
  margin: 0;
}

.album-songs li {
  margin-bottom: 5px;
  font-size: 14px;
}

.album-links {
  margin-top: 15px;
  text-align: right;
}

.raw-view {
  margin-top: 20px;
}

.raw-data-card {
  border-radius: 8px;
}

.raw-data-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.raw-data-header h3 {
  margin: 0;
}

.raw-data-content {
  background-color: #f5f7fa;
  padding: 15px;
  border-radius: 4px;
  overflow-x: auto;
  white-space: pre-wrap;
  font-family: monospace;
  font-size: 14px;
  color: #333;
  max-height: 500px;
  overflow-y: auto;
}

.artist-name {
  margin: 20px 0 15px;
  font-size: 22px;
  font-weight: bold;
  color: #333;
}

.artist-alias {
  font-size: 16px;
  color: #666;
  font-weight: normal;
}

.artist-tag {
  margin-right: 6px;
  margin-bottom: 6px;
}

.album-artists {
  margin-top: 15px;
}

.album-artists h4 {
  margin: 0 0 10px;
  font-size: 16px;
}

.qq-music-cover {
  width: 100px;
  height: 100px;
  background-color: #f0f0f0;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.qq-music-icon {
  font-size: 24px;
  color: #666;
}

.album-meta {
  margin-top: 10px;
  font-size: 14px;
  color: #666;
}
</style> 