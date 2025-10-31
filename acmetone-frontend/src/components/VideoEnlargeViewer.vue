<template>
  <div class="video-enlarge-viewer">
    <div class="overlay" @click="$emit('close')"></div>
    <div class="viewer-content">
      <div class="video-container" :class="{ 'portrait': isPortrait }">
        <video 
          ref="videoRef"
          :src="videoSrc" 
          controls 
          autoplay
          loop
          muted
          class="enlarged-video"
        ></video>
        
        <!-- 安全区域覆盖图 -->
        <div v-if="showSafeZone && isPortrait" class="safe-zone-overlay"></div>
        
        <!-- 控制按钮 -->
        <div class="viewer-controls">
          <acmetone-btn v-if="isPortrait" @click="toggleSafeZone">
            {{ showSafeZone ? '隐藏安全区域' : '显示安全区域' }}
          </acmetone-btn>
          <acmetone-btn type="danger" @click="$emit('close')">关闭</acmetone-btn>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import AcmetoneBtn from './acmetone/AcmetoneBtn.vue';

const props = defineProps({
  videoSrc: {
    type: String,
    required: true
  },
  isPortrait: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['close']);
const videoRef = ref(null);
const showSafeZone = ref(false);

// 切换安全区域显示
const toggleSafeZone = () => {
  showSafeZone.value = !showSafeZone.value;
};

// 监听ESC键关闭
const handleKeyDown = (event) => {
  if (event.key === 'Escape') {
    emit('close');
  }
};

onMounted(() => {
  document.addEventListener('keydown', handleKeyDown);
  // 禁止背景滚动
  document.body.style.overflow = 'hidden';
});

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKeyDown);
  // 恢复背景滚动
  document.body.style.overflow = '';
});
</script>

<style scoped>
.video-enlarge-viewer {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
}

.overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.85);
  cursor: pointer;
}

.viewer-content {
  position: relative;
  z-index: 10000;
  max-width: 90vw;
  max-height: 90vh;
}

.video-container {
  position: relative;
  width: 80vmin;  /* 正方形视频默认尺寸 */
  height: 80vmin;
  background-color: #000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.video-container.portrait {
  width: 60vmin;  /* 竖版视频宽度 */
  height: 80vmin;  /* 竖版视频高度，保持3:4比例 */
}

.enlarged-video {
  max-width: 100%;
  max-height: 100%;
  width: auto;
  height: auto;
  object-fit: contain;
}

.safe-zone-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  background-image: url('/images/ui/cover-limit.jpg');
  background-size: cover;
  background-position: center;
  opacity: 0.7;
  z-index: 10001;
}

.viewer-controls {
  position: absolute;
  bottom: -60px;
  left: 0;
  width: 100%;
  display: flex;
  justify-content: center;
  gap: 20px;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .video-container {
    width: 90vw;
    height: 90vw;
  }
  
  .video-container.portrait {
    width: 67.5vw;  /* 保持3:4比例 */
    height: 90vw;
  }
  
  .viewer-controls {
    flex-direction: column;
    align-items: center;
    bottom: -120px;
    gap: 10px;
  }
  
  .viewer-controls :deep(.acmetone-btn) {
    width: 100%;
  }
}
</style> 