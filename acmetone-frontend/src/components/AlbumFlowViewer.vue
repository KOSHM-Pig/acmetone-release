<template>
  <div class="album-flow-container">
    <div class="flow-wrapper" ref="flowWrapper">
      <vue-flow
        v-model="elements"
        :default-viewport="{ zoom: 0.8 }"
        :min-zoom="0.2"
        :max-zoom="2"
        :fit-view-on-init="true"
        class="flow-canvas"
        @node-click="handleNodeClick"
      >
        <template #node-song="songProps">
          <div class="song-node">
            <div class="node-title">{{ songProps.data.label }}</div>
            <div class="node-content">
              <div class="file-info">
                <el-icon><Headset /></el-icon>
                <span>{{ songProps.data.wavFile ? '已上传' : '未上传' }}</span>
              </div>
              <div class="file-info" v-if="songProps.data.language !== '纯音乐'">
                <el-icon><Document /></el-icon>
                <span>{{ songProps.data.lyricsFile ? '已上传' : '未上传' }}</span>
              </div>
            </div>
          </div>
        </template>
        
        <template #node-artist="artistProps">
          <div class="artist-node">
            <div class="node-title">{{ artistProps.data.label }}</div>
            <div class="node-content">
              <div class="file-info">
                <el-icon><Document /></el-icon>
                <span>{{ artistProps.data.authFile ? '已授权' : '未授权' }}</span>
              </div>
            </div>
          </div>
        </template>
        
        <template #node-album="albumProps">
          <div class="album-node">
            <div class="node-title">{{ albumProps.data.label }}</div>
          </div>
        </template>

        <!-- 这里已经移除了Background、Controls和MiniMap组件 -->
      </vue-flow>
    </div>
    
    <!-- 侧边信息抽屉 -->
    <el-drawer
      v-model="drawerVisible"
      title="节点详情"
      direction="rtl"
      size="30%"
    >
      <div v-if="selectedNode" class="node-details">
        <h3>{{ selectedNode.data.label }}</h3>
        
        <div v-if="selectedNode.type === 'song'" class="details-section">
          <h4>歌曲信息</h4>
          <p>歌曲ID: {{ selectedNode.id }}</p>
          <p>语言: {{ selectedNode.data.language || '未设置' }}</p>
          <p>时长: {{ selectedNode.data.duration || '未知' }}</p>
          
          <div v-if="selectedNode.data.wavFile" class="file-preview">
            <h4>音频文件</h4>
            <audio controls :src="selectedNode.data.wavUrl" style="width: 100%"></audio>
          </div>
          
          <div v-if="selectedNode.data.lyricsFile" class="file-preview">
            <h4>歌词文件</h4>
            <pre class="lyrics-preview">{{ selectedNode.data.lyricsContent || '加载中...' }}</pre>
          </div>
        </div>
        
        <div v-if="selectedNode.type === 'artist'" class="details-section">
          <h4>歌手信息</h4>
          <p>歌手ID: {{ selectedNode.id }}</p>
          <p>类型: {{ selectedNode.data.type || '未设置' }}</p>
          
          <div v-if="selectedNode.data.authFile" class="file-preview">
            <h4>授权文件</h4>
            <a :href="selectedNode.data.authFileUrl" target="_blank" class="view-auth">查看授权书</a>
          </div>
        </div>
        
        <div v-if="selectedNode.type === 'album'" class="details-section">
          <h4>专辑信息</h4>
          <p>专辑ID: {{ selectedNode.id }}</p>
          <p>发行日期: {{ selectedNode.data.releaseDate || '未设置' }}</p>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { VueFlow, useVueFlow } from '@vue-flow/core';
// 移除有问题的导入
// import '@vue-flow/core/dist/style.css';
// import '@vue-flow/core/dist/theme-default.css';
import { Document, Headset } from '@element-plus/icons-vue';
import resourceLoader from '@/utils/resourceLoader';

const props = defineProps({
  albumId: {
    type: String,
    required: true
  },
  album: {
    type: Object,
    required: true
  }
});

// 流程图状态
const elements = ref([]);
const flowWrapper = ref(null);
const { fitView } = useVueFlow();

// 侧边栏状态
const drawerVisible = ref(false);
const selectedNode = ref(null);

// 初始化图形
const initializeGraph = () => {
  if (!props.album || !props.album.songs) return;
  
  const nodes = [];
  const edges = [];
  
  // 添加专辑节点
  const albumNode = {
    id: `album-${props.albumId}`,
    type: 'album',
    position: { x: 0, y: 0 },
    data: {
      label: props.album.title || '未命名专辑',
      releaseDate: props.album.releaseDate,
      authorizationFile: props.album.authorizationFile
    }
  };
  nodes.push(albumNode);
  
  // 添加歌曲节点
  const songs = props.album.songs || [];
  songs.forEach((song, index) => {
    const songNode = {
      id: `song-${song.id}`,
      type: 'song',
      position: { x: -400 + index * 200, y: 250 },
      data: {
        label: song.title || `歌曲 ${index + 1}`,
        language: song.language,
        genre: song.genre,
        duration: song.duration,
        wavFile: song.wavFile,
        lyricsFile: song.lyricsFile,
        wavUrl: song.wavFile ? `${import.meta.env.VITE_API_BASE_URL}/uploads/audio/${song.wavFile}` : null,
        lyricsContent: '',
        artistIds: song.artists ? song.artists.map(a => a.id || a.artistId) : []
      }
    };
    nodes.push(songNode);
    
    // 添加专辑到歌曲的边
    edges.push({
      id: `album-to-song-${song.id}`,
      source: albumNode.id,
      target: songNode.id,
      style: { stroke: '#0066cc', strokeWidth: 2 }
    });
    
    // 添加歌手节点和边
    if (song.artists && Array.isArray(song.artists)) {
      song.artists.forEach((artist, artistIndex) => {
        const artistNodeId = `artist-${artist.id || artist.artistId}`;
        
        // 检查是否已存在相同的歌手节点
        const existingArtistNode = nodes.find(node => node.id === artistNodeId);
        
        if (!existingArtistNode) {
          // 计算歌手节点位置 - 扇形分布
          const angle = (artistIndex - (song.artists.length - 1) / 2) * 0.7;
          const radius = 250;
          const artistNode = {
            id: artistNodeId,
            type: 'artist',
            position: {
              x: -400 + index * 200 + Math.sin(angle) * radius,
              y: 250 + 250 + Math.cos(angle) * radius
            },
            data: {
              label: artist.name || '未知歌手',
              realName: artist.realName,
              type: artist.type,
              authFile: artist.authorizationFile,
              authFileUrl: artist.authorizationFile ? 
                `${import.meta.env.VITE_API_BASE_URL}/uploads/authorizations/${artist.authorizationFile}` : null
            }
          };
          nodes.push(artistNode);
        }
        
        // 添加歌曲到歌手的边
        edges.push({
          id: `song-${song.id}-to-artist-${artist.id || artist.artistId}`,
          source: songNode.id,
          target: artistNodeId,
          style: { stroke: '#8866cc', strokeWidth: 2 }
        });
      });
    }
  });
  
  elements.value = [...nodes, ...edges];
  
  // 使用setTimeout确保DOM已更新
  setTimeout(() => {
    fitView();
  }, 500);
};

// 处理节点点击
const handleNodeClick = (event, node) => {
  selectedNode.value = node;
  drawerVisible.value = true;
  
  // 如果是歌曲节点，且有歌词文件，加载歌词内容
  if (node.type === 'song' && node.data.lyricsFile) {
    loadLyricsContent(node.data.lyricsFile)
      .then(content => {
        // 更新节点数据以包含歌词内容
        node.data.lyricsContent = content;
      })
      .catch(error => {
        console.error('加载歌词失败:', error);
        node.data.lyricsContent = '加载歌词失败';
      });
  }
};

// 加载歌词内容
const loadLyricsContent = async (lyricsFile) => {
  try {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/uploads/lyrics/${lyricsFile}`);
    if (!response.ok) {
      throw new Error('无法加载歌词文件');
    }
    return await response.text();
  } catch (error) {
    console.error('加载歌词失败:', error);
    throw error;
  }
};

// 监听专辑数据变化
watch(() => props.album, (newAlbum) => {
  if (newAlbum && newAlbum.songs) {
    initializeGraph();
  }
}, { deep: true, immediate: true });

// 格式化日期
const formatDate = (date) => {
  if (!date) return '未设置';
  return new Date(date).toLocaleDateString('zh-CN');
};

// 获取资源URL
const getResourceUrl = (path) => {
  if (!path) return '';
  return resourceLoader.getResourceUrl(path);
};

// 预览文件
const previewFile = (filePath) => {
  if (!filePath) return;
  const url = getResourceUrl(filePath);
  window.open(url, '_blank');
};

// 预览歌词
const previewLyrics = (lyricsFile) => {
  console.log('预览歌词:', lyricsFile);
  // TODO: 实现歌词预览功能
};

// 组件挂载后初始化图形
onMounted(() => {
  if (props.album && props.album.songs) {
    // 延迟执行以确保容器已渲染
    setTimeout(() => {
      initializeGraph();
    }, 300);
  }
});
</script>

<style scoped>
.album-flow-container {
  width: 100%;
  height: 700px;
  position: relative;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  overflow: hidden;
  margin: 20px 0;
}

.flow-wrapper {
  width: 100%;
  height: 100%;
  background-color: #f5f7fa;
}

.flow-canvas {
  width: 100%;
  height: 100%;
}

/* 确保 Vue Flow 容器有明确的尺寸 */
:deep(.vue-flow) {
  width: 100%;
  height: 100%;
}

:deep(.vue-flow__container) {
  width: 100%;
  height: 100%;
}

/* 节点样式 */
.song-node {
  padding: 15px;
  border-radius: 8px;
  background-color: #e1f3d8;
  border: 1px solid #67c23a;
  min-width: 150px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  transition: all 0.3s;
}

.artist-node {
  padding: 15px;
  border-radius: 8px;
  background-color: #f0e6ff;
  border: 1px solid #8066cc;
  min-width: 150px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  transition: all 0.3s;
}

.album-node {
  padding: 15px;
  border-radius: 8px;
  background-color: #d8e9ff;
  border: 1px solid #409eff;
  min-width: 150px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  transition: all 0.3s;
}

.song-node:hover, .artist-node:hover, .album-node:hover {
  transform: translateY(-3px);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
}

.node-title {
  font-weight: bold;
  margin-bottom: 8px;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.node-content {
  font-size: 0.9em;
}

.file-info {
  display: flex;
  align-items: center;
  margin-top: 5px;
}

.file-info .el-icon {
  margin-right: 5px;
}

/* 节点详情样式 */
.node-details {
  padding: 16px;
}

.details-section {
  margin-bottom: 20px;
  padding: 16px;
  background-color: #f8f9fa;
  border-radius: 4px;
}

.file-preview {
  margin-top: 16px;
  padding: 12px;
  background-color: #fff;
  border: 1px solid #ebeef5;
  border-radius: 4px;
}

.lyrics-preview {
  max-height: 200px;
  overflow-y: auto;
  font-family: monospace;
  white-space: pre-wrap;
  font-size: 14px;
  line-height: 1.5;
  padding: 10px;
  background-color: #f9f9f9;
  border-radius: 4px;
}

.view-auth {
  display: inline-block;
  padding: 8px 16px;
  background-color: #409eff;
  color: white;
  border-radius: 4px;
  text-decoration: none;
  transition: background-color 0.3s;
}

.view-auth:hover {
  background-color: #66b1ff;
}
</style> 