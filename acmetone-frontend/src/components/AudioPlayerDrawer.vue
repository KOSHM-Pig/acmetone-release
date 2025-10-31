<template>
  <div class="audio-player-drawer" :class="{ 'visible': visible }">
    <div class="drawer-mask" @click="close"></div>
    <div class="drawer-content">
      <!-- 抽屉头部 -->
      <div class="drawer-header">
        <div class="header-left">
          <div class="song-info">
            <h3 class="song-title">{{ currentSong?.title || '未选择歌曲' }}</h3>
            <p class="song-artist">{{ currentSong?.Artists?.map(a => a.name).join(' / ') || '未知艺人' }}</p>
          </div>
        </div>
        <div class="header-right">
          <button class="close-btn garrix-button-circle" @click="close">
            <el-icon><Close /></el-icon>
          </button>
        </div>
      </div>

      <!-- 播放器主体 -->
      <div class="drawer-body">
        <div class="player-container">
          <!-- 专辑封面 -->
          <div class="album-cover">
            <img
              :src="albumCover"
              :alt="currentSong?.title"
              @error="handleImageError"
            />
            <div class="cover-overlay" :class="{ 'playing': isPlaying }">
              <div class="vinyl-effect"></div>
            </div>
          </div>

          <!-- 播放控制区域 -->
          <div class="player-controls">
            <!-- 进度条 -->
            <div class="progress-section">
              <span class="time-display">{{ formatTime(currentTime) }}</span>
              <div class="progress-bar" @click="seekTo">
                <div class="progress-track">
                  <div class="progress-fill" :style="{ width: progressPercentage + '%' }"></div>
                  <div class="progress-thumb" :style="{ left: progressPercentage + '%' }"></div>
                </div>
              </div>
              <span class="time-display">{{ formatTime(duration) }}</span>
            </div>

            <!-- 播放按钮组 -->
            <div class="control-buttons">
              <button 
                class="control-btn prev-btn garrix-button-circle" 
                @click="previousSong"
                :disabled="!hasPrevious"
              >
                <el-icon><DArrowLeft /></el-icon>
              </button>
              
              <button 
                class="control-btn play-btn garrix-button-circle large" 
                @click="togglePlay"
                :disabled="!currentSong || audioError"
              >
                <el-icon v-if="audioLoading"><Loading /></el-icon>
                <el-icon v-else-if="isPlaying"><VideoPause /></el-icon>
                <el-icon v-else><VideoPlay /></el-icon>
              </button>
              
              <button 
                class="control-btn next-btn garrix-button-circle" 
                @click="nextSong"
                :disabled="!hasNext"
              >
                <el-icon><DArrowRight /></el-icon>
              </button>
            </div>

            <!-- 音量控制 -->
            <div class="volume-section">
              <el-icon class="volume-icon"><Mute /></el-icon>
              <div class="volume-bar" @click="setVolume">
                <div class="volume-track">
                  <div class="volume-fill" :style="{ width: volume * 100 + '%' }"></div>
                  <div class="volume-thumb" :style="{ left: volume * 100 + '%' }"></div>
                </div>
              </div>
            </div>
          </div>

          <!-- 错误状态 -->
          <div v-if="audioError" class="error-section">
            <el-icon class="error-icon"><Warning /></el-icon>
            <p class="error-message">{{ audioErrorMessage || '音频加载失败' }}</p>
            <button class="garrix-button" @click="retryLoad">重试</button>
          </div>
        </div>
      </div>

      <!-- 播放列表 -->
      <div class="playlist-section" v-if="playlist && playlist.length > 0">
        <div class="playlist-header">
          <h4>播放列表</h4>
          <span class="playlist-count">{{ playlist.length }} 首歌曲</span>
        </div>
        <div class="playlist-container">
          <div 
            v-for="(song, index) in playlist" 
            :key="song.id"
            class="playlist-item"
            :class="{ 'active': currentSong?.id === song.id }"
            @click="selectSong(song, index)"
          >
            <div class="playlist-item-number">
              <span v-if="currentSong?.id === song.id && isPlaying" class="playing-indicator">
                <el-icon><VideoPlay /></el-icon>
              </span>
              <span v-else>{{ index + 1 }}</span>
            </div>
            <div class="playlist-item-info">
              <div class="playlist-item-title">{{ song.title }}</div>
              <div class="playlist-item-artist">{{ song.Artists?.map(a => a.name).join(' / ') || '未知艺人' }}</div>
            </div>
            <div class="playlist-item-duration">{{ formatTime(song.duration) }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 隐藏的音频元素 -->
    <audio 
      ref="audioElement"
      @loadstart="onLoadStart"
      @loadeddata="onLoadedData"
      @canplay="onCanPlay"
      @timeupdate="onTimeUpdate"
      @ended="onEnded"
      @error="onError"
      @play="onPlay"
      @pause="onPause"
      preload="none"
    ></audio>
  </div>
</template>

<script setup>
import { API_BASE_URL } from '@/config';
import {
  Close,
  DArrowLeft,
  DArrowRight,
  Loading,
  Mute,
  VideoPause,
  VideoPlay,
  Warning
} from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';

// Props
const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  currentSong: {
    type: Object,
    default: null
  },
  playlist: {
    type: Array,
    default: () => []
  },
  albumCover: {
    type: String,
    default: '/placeholder-album.png'
  },
  albumId: {
    type: [String, Number],
    default: null
  }
});

// Emits
const emit = defineEmits(['close', 'song-change']);

// 响应式数据
const audioElement = ref(null);
const isPlaying = ref(false);
const audioLoading = ref(false);
const audioError = ref(false);
const audioErrorMessage = ref('');
const currentTime = ref(0);
const duration = ref(0);
const volume = ref(0.8);
const currentIndex = ref(0);

// 计算属性
const progressPercentage = computed(() => {
  if (duration.value === 0) return 0;
  return (currentTime.value / duration.value) * 100;
});

const hasPrevious = computed(() => {
  return currentIndex.value > 0;
});

const hasNext = computed(() => {
  return currentIndex.value < props.playlist.length - 1;
});



// 方法
const close = () => {
  if (audioElement.value) {
    audioElement.value.pause();
  }
  emit('close');
};

const formatTime = (seconds) => {
  if (!seconds || isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const handleImageError = (e) => {
  e.target.src = '/placeholder-album.png';
};

// 播放控制方法
const togglePlay = async () => {
  if (!props.currentSong) {
    console.log('⚠️ [AudioPlayer] 没有选择歌曲');
    return;
  }

  console.log('🎮 [AudioPlayer] 切换播放状态:', {
    isPlaying: isPlaying.value,
    hasSrc: !!audioElement.value.src,
    currentSrc: audioElement.value.src
  });

  if (!audioElement.value.src) {
    console.log('🔄 [AudioPlayer] 音频源为空，开始加载');
    await loadAudio();
  }

  if (isPlaying.value) {
    console.log('⏸️ [AudioPlayer] 暂停播放');
    audioElement.value.pause();
  } else {
    try {
      console.log('▶️ [AudioPlayer] 开始播放');
      await audioElement.value.play();
    } catch (error) {
      console.error('❌ [AudioPlayer] 播放失败:', error);
      ElMessage.error('播放失败');
    }
  }
};

const loadAudio = async () => {
  if (!props.currentSong || audioLoading.value) return;

  console.log('🎵 [AudioPlayer] 开始加载音频:', {
    songId: props.currentSong.id,
    songTitle: props.currentSong.title,
    albumId: props.albumId
  });

  audioLoading.value = true;
  audioError.value = false;
  audioErrorMessage.value = '';

  try {
    // 构建API URL获取音频
    const apiUrl = `${API_BASE_URL}/albums/${props.albumId}/songs/${props.currentSong.id}/audio`;
    const token = localStorage.getItem('token');

    console.log('🌐 [AudioPlayer] 请求音频URL:', apiUrl);

    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`获取音频失败: ${response.status}`);
    }

    const data = await response.json();
    console.log('📡 [AudioPlayer] 服务器响应:', data);

    if (!data.audioUrl) {
      throw new Error('服务器未返回有效的音频URL');
    }

    console.log('🎶 [AudioPlayer] 设置音频源:', data.audioUrl);

    // 验证URL格式
    if (!data.audioUrl.startsWith('http')) {
      throw new Error(`无效的音频URL格式: ${data.audioUrl}`);
    }

    // 确保音频元素存在且URL有效
    if (audioElement.value && data.audioUrl) {
      // 先暂停并清空当前音频
      audioElement.value.pause();
      audioElement.value.src = '';

      // 设置新的音频源
      audioElement.value.src = data.audioUrl;
      audioElement.value.volume = volume.value;
      audioElement.value.load(); // 强制重新加载

      console.log('✅ [AudioPlayer] 音频源设置完成，当前src:', audioElement.value.src);
    } else {
      throw new Error('音频元素不存在或URL无效');
    }

  } catch (error) {
    console.error('❌ [AudioPlayer] 加载音频失败:', error);
    audioError.value = true;
    audioErrorMessage.value = error.message;
    ElMessage.error(`加载音频失败: ${error.message}`);
  } finally {
    audioLoading.value = false;
  }
};

const retryLoad = () => {
  loadAudio();
};

const seekTo = (event) => {
  if (!audioElement.value || duration.value === 0) return;

  const rect = event.currentTarget.getBoundingClientRect();
  const clickX = event.clientX - rect.left;
  const percentage = clickX / rect.width;
  const newTime = percentage * duration.value;

  audioElement.value.currentTime = newTime;
};

const setVolume = (event) => {
  const rect = event.currentTarget.getBoundingClientRect();
  const clickX = event.clientX - rect.left;
  const newVolume = Math.max(0, Math.min(1, clickX / rect.width));

  volume.value = newVolume;
  if (audioElement.value) {
    audioElement.value.volume = newVolume;
  }
};

const previousSong = () => {
  if (hasPrevious.value) {
    const newIndex = currentIndex.value - 1;
    selectSong(props.playlist[newIndex], newIndex);
  }
};

const nextSong = () => {
  if (hasNext.value) {
    const newIndex = currentIndex.value + 1;
    selectSong(props.playlist[newIndex], newIndex);
  }
};

const selectSong = (song, index) => {
  currentIndex.value = index;
  emit('song-change', song);
};

// 音频事件处理
const onLoadStart = () => {
  console.log('🔄 [AudioPlayer] 音频开始加载');
  audioLoading.value = true;
};

const onLoadedData = () => {
  console.log('📊 [AudioPlayer] 音频数据加载完成');
  audioLoading.value = false;
};

const onCanPlay = () => {
  console.log('✅ [AudioPlayer] 音频可以播放');
  audioLoading.value = false;
  audioError.value = false;
};

const onTimeUpdate = () => {
  if (audioElement.value) {
    currentTime.value = audioElement.value.currentTime;
  }
};

const onEnded = () => {
  console.log('🏁 [AudioPlayer] 音频播放结束');
  isPlaying.value = false;
  // 自动播放下一首
  if (hasNext.value) {
    console.log('⏭️ [AudioPlayer] 自动播放下一首');
    nextSong();
    nextTick(() => {
      togglePlay();
    });
  }
};

const onError = (error) => {
  console.error('❌ [AudioPlayer] 音频播放错误:', error);
  console.error('❌ [AudioPlayer] 错误详情:', {
    error: error.target?.error,
    networkState: error.target?.networkState,
    readyState: error.target?.readyState,
    src: error.target?.src
  });
  audioError.value = true;
  audioErrorMessage.value = '音频播放出错';
  audioLoading.value = false;
  isPlaying.value = false;
};

const onPlay = () => {
  console.log('▶️ [AudioPlayer] 音频开始播放');
  isPlaying.value = true;
};

const onPause = () => {
  console.log('⏸️ [AudioPlayer] 音频暂停');
  isPlaying.value = false;
};

// 监听器
watch(() => props.currentSong, (newSong, oldSong) => {
  console.log('🔄 [AudioPlayer] 歌曲切换:', {
    from: oldSong?.title || 'null',
    to: newSong?.title || 'null',
    newSongId: newSong?.id
  });

  if (newSong) {
    // 找到当前歌曲在播放列表中的索引
    const index = props.playlist.findIndex(song => song.id === newSong.id);
    if (index !== -1) {
      currentIndex.value = index;
      console.log('📍 [AudioPlayer] 设置播放索引:', index);
    }

    // 重置音频状态
    if (audioElement.value) {
      audioElement.value.pause();
      audioElement.value.src = '';
      audioElement.value.load(); // 重置音频元素
    }
    isPlaying.value = false;
    currentTime.value = 0;
    duration.value = 0;
    audioError.value = false;
    audioLoading.value = false;

    console.log('🔄 [AudioPlayer] 重置音频状态，准备加载新音频');

    // 延迟加载新音频，确保重置完成
    setTimeout(() => {
      if (props.visible) {
        loadAudio();
      }
    }, 100);
  }
});

watch(() => props.visible, (visible) => {
  console.log('👁️ [AudioPlayer] 抽屉可见性变化:', visible);

  if (visible) {
    document.documentElement.classList.add('drawer-open');
    console.log('🎵 [AudioPlayer] 抽屉打开，当前歌曲:', props.currentSong?.title);

    // 如果有当前歌曲但还没加载音频，则加载
    if (props.currentSong && !audioElement.value.src && !audioLoading.value) {
      console.log('🔄 [AudioPlayer] 检测到需要加载音频');
      setTimeout(() => {
        loadAudio();
      }, 200);
    }
  } else {
    document.documentElement.classList.remove('drawer-open');
    console.log('🚪 [AudioPlayer] 抽屉关闭');
  }
});

// 生命周期
onMounted(() => {
  console.log('🚀 [AudioPlayer] 组件挂载');

  // 监听音频元素的 loadedmetadata 事件来获取时长
  if (audioElement.value) {
    audioElement.value.addEventListener('loadedmetadata', () => {
      const audioDuration = audioElement.value.duration || 0;
      duration.value = audioDuration;
      console.log('⏱️ [AudioPlayer] 获取音频时长:', audioDuration);
    });
  }
});

onUnmounted(() => {
  console.log('💀 [AudioPlayer] 组件卸载');
  document.documentElement.classList.remove('drawer-open');
  if (audioElement.value) {
    audioElement.value.pause();
  }
});
</script>

<style scoped>
/* 抽屉基础样式 */
.audio-player-drawer {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 9999;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.audio-player-drawer.visible {
  pointer-events: all;
  opacity: 1;
}

.drawer-mask {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
}

.drawer-content {
  position: absolute;
  right: 0;
  top: 0;
  width: 450px;
  height: 100%;
  background-color: var(--garrix-white, #ffffff);
  box-shadow: -4px 0 20px rgba(0, 0, 0, 0.15);
  transform: translateX(100%);
  transition: transform 0.3s ease;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.audio-player-drawer.visible .drawer-content {
  transform: translateX(0);
}

/* 抽屉头部 */
.drawer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid var(--garrix-border, #dddddd);
  background-color: var(--garrix-gray, #f5f5f5);
}

.header-left {
  flex: 1;
  min-width: 0;
}

.song-info {
  overflow: hidden;
}

.song-title {
  font-family: var(--garrix-font-primary, 'Montserrat', sans-serif);
  font-size: 18px;
  font-weight: 600;
  color: var(--garrix-text, #000000);
  margin: 0 0 4px 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.song-artist {
  font-size: 14px;
  color: var(--garrix-text-secondary, #666666);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.close-btn {
  width: 40px;
  height: 40px;
  border: 1px solid var(--garrix-border, #dddddd);
  background-color: transparent;
  color: var(--garrix-text, #000000);
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 16px;
  flex-shrink: 0;
}

.close-btn:hover {
  background-color: var(--garrix-black, #000000);
  color: var(--garrix-white, #ffffff);
}

/* 抽屉主体 */
.drawer-body {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
}

.player-container {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* 专辑封面 */
.album-cover {
  position: relative;
  width: 280px;
  height: 280px;
  margin: 0 auto;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
}

.album-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cover-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: radial-gradient(circle at center, transparent 30%, rgba(0, 0, 0, 0.1) 100%);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.cover-overlay.playing {
  opacity: 1;
}

.vinyl-effect {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 60px;
  height: 60px;
  border: 2px solid rgba(255, 255, 255, 0.8);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.cover-overlay.playing .vinyl-effect {
  opacity: 1;
  animation: spin 3s linear infinite;
}

@keyframes spin {
  from { transform: translate(-50%, -50%) rotate(0deg); }
  to { transform: translate(-50%, -50%) rotate(360deg); }
}

/* 播放控制 */
.player-controls {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.progress-section {
  display: flex;
  align-items: center;
  gap: 12px;
}

.time-display {
  font-family: var(--garrix-font-secondary, 'Helvetica Neue', Arial, sans-serif);
  font-size: 12px;
  color: var(--garrix-text-secondary, #666666);
  min-width: 35px;
  text-align: center;
}

.progress-bar {
  flex: 1;
  height: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
}

.progress-track {
  position: relative;
  width: 100%;
  height: 4px;
  background-color: var(--garrix-dark-gray, #e0e0e0);
  border-radius: 2px;
}

.progress-fill {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  background-color: var(--garrix-black, #000000);
  border-radius: 2px;
  transition: width 0.1s ease;
}

.progress-thumb {
  position: absolute;
  top: 50%;
  width: 12px;
  height: 12px;
  background-color: var(--garrix-black, #000000);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  transition: left 0.1s ease;
}

/* 控制按钮 */
.control-buttons {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
}

.control-btn {
  width: 48px;
  height: 48px;
  border: 1px solid var(--garrix-black, #000000);
  background-color: transparent;
  color: var(--garrix-black, #000000);
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
}

.control-btn:hover:not(:disabled) {
  background-color: var(--garrix-black, #000000);
  color: var(--garrix-white, #ffffff);
}

.control-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.control-btn.large {
  width: 64px;
  height: 64px;
  font-size: 24px;
}

/* 音量控制 */
.volume-section {
  display: flex;
  align-items: center;
  gap: 12px;
  justify-content: center;
}

.volume-icon {
  color: var(--garrix-text-secondary, #666666);
  font-size: 16px;
}

.volume-bar {
  width: 100px;
  height: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
}

.volume-track {
  position: relative;
  width: 100%;
  height: 3px;
  background-color: var(--garrix-dark-gray, #e0e0e0);
  border-radius: 2px;
}

.volume-fill {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  background-color: var(--garrix-black, #000000);
  border-radius: 2px;
  transition: width 0.1s ease;
}

.volume-thumb {
  position: absolute;
  top: 50%;
  width: 10px;
  height: 10px;
  background-color: var(--garrix-black, #000000);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  transition: left 0.1s ease;
}

/* 错误状态 */
.error-section {
  text-align: center;
  padding: 20px;
  background-color: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
}

.error-icon {
  font-size: 24px;
  color: #ef4444;
  margin-bottom: 8px;
}

.error-message {
  color: #dc2626;
  margin: 0 0 16px 0;
  font-size: 14px;
}

/* 播放列表 */
.playlist-section {
  border-top: 1px solid var(--garrix-border, #dddddd);
  background-color: var(--garrix-gray, #f5f5f5);
  flex-shrink: 0;
}

.playlist-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  border-bottom: 1px solid var(--garrix-border, #dddddd);
}

.playlist-header h4 {
  font-family: var(--garrix-font-primary, 'Montserrat', sans-serif);
  font-size: 16px;
  font-weight: 600;
  color: var(--garrix-text, #000000);
  margin: 0;
}

.playlist-count {
  font-size: 12px;
  color: var(--garrix-text-secondary, #666666);
}

.playlist-container {
  max-height: 300px;
  overflow-y: auto;
}

.playlist-item {
  display: flex;
  align-items: center;
  padding: 12px 24px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  border-bottom: 1px solid var(--garrix-border, #dddddd);
}

.playlist-item:hover {
  background-color: var(--garrix-gray-hover, #eeeeee);
}

.playlist-item.active {
  background-color: var(--garrix-dark-gray, #e0e0e0);
}

.playlist-item-number {
  width: 24px;
  text-align: center;
  font-size: 12px;
  color: var(--garrix-text-secondary, #666666);
  margin-right: 12px;
}

.playing-indicator {
  color: var(--garrix-black, #000000);
}

.playlist-item-info {
  flex: 1;
  min-width: 0;
  margin-right: 12px;
}

.playlist-item-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--garrix-text, #000000);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 2px;
}

.playlist-item-artist {
  font-size: 12px;
  color: var(--garrix-text-secondary, #666666);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.playlist-item-duration {
  font-size: 12px;
  color: var(--garrix-text-secondary, #666666);
  min-width: 35px;
  text-align: right;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .drawer-content {
    width: 100%;
  }

  .album-cover {
    width: 240px;
    height: 240px;
  }

  .drawer-body {
    padding: 20px;
  }
}

/* 全局样式 - 防止页面滚动 */
:global(html.drawer-open) {
  overflow: hidden !important;
}

:global(html.drawer-open body) {
  overflow: hidden !important;
}
</style>
