<template>
  <div class="slider-captcha-container">
    <div v-if="loading" class="captcha-loading">
      <el-icon class="is-loading"><Loading /></el-icon>
      <span>加载中...</span>
    </div>

    <div v-if="!loading && captchaData.backgroundImage" class="captcha-content">
      <div class="captcha-image-container">
        <img :src="captchaData.backgroundImage" class="background-image" alt="captcha background" />
        <img 
          :src="captchaData.pieceImage" 
          class="piece-image" 
          :style="{ top: captchaData.positionY + 'px', left: sliderValue + 'px' }" 
          alt="captcha piece"
        />
        <div class="captcha-actions">
          <el-button circle @click="refreshCaptcha" :icon="RefreshRight" title="刷新" />
        </div>
      </div>
      <div class="slider-track" ref="trackRef">
        <div 
          class="slider-thumb"
          :style="{ left: sliderValue + 'px' }"
          @mousedown="onDragStart"
          @touchstart="onDragStart"
        >
          <el-icon><DArrowRight /></el-icon>
        </div>
        <div class="slider-tip">{{ tipText }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, reactive, watch } from 'vue';
import { ElMessage, ElIcon, ElButton } from 'element-plus';
import { Loading, DArrowRight, RefreshRight } from '@element-plus/icons-vue';
import axios from 'axios';
import { API_BASE_URL } from '@/config';

const emit = defineEmits(['success', 'close']);

const loading = ref(true);
const captchaData = reactive({
  captchaId: '',
  backgroundImage: '',
  pieceImage: '',
  positionY: 0,
});
const trackRef = ref(null);
const sliderValue = ref(0);
const isDragging = ref(false);
const startX = ref(0);
const tipText = ref('向右拖动滑块填充拼图');

// 获取验证码
const fetchCaptcha = async () => {
  loading.value = true;
  tipText.value = '向右拖动滑块填充拼图';
  sliderValue.value = 0;
  try {
    const response = await axios.get(`${API_BASE_URL}/captcha`);
    Object.assign(captchaData, response.data);
  } catch (error) {
    ElMessage.error('无法加载验证码，请重试');
    emit('close');
  } finally {
    loading.value = false;
  }
};

// 刷新验证码
const refreshCaptcha = () => {
  fetchCaptcha();
};

const onDragStart = (event) => {
  if (loading.value) return;
  isDragging.value = true;
  // 兼容触摸和鼠标事件
  startX.value = event.clientX || event.touches[0].clientX;
  tipText.value = '';
  document.addEventListener('mousemove', onDragMove);
  document.addEventListener('mouseup', onDragEnd);
  document.addEventListener('touchmove', onDragMove, { passive: false });
  document.addEventListener('touchend', onDragEnd);
};

const onDragMove = (event) => {
  if (!isDragging.value) return;
  event.preventDefault(); // 阻止滚动等默认行为
  const trackWidth = trackRef.value.clientWidth;
  const thumbWidth = 50;
  // 兼容触摸和鼠标事件
  const moveX = (event.clientX || event.touches[0].clientX) - startX.value;
  let newLeft = Math.max(0, Math.min(moveX, trackWidth - thumbWidth));
  sliderValue.value = newLeft;
};

const onDragEnd = () => {
  if (!isDragging.value) return;
  isDragging.value = false;
  document.removeEventListener('mousemove', onDragMove);
  document.removeEventListener('mouseup', onDragEnd);
  document.removeEventListener('touchmove', onDragMove);
  document.removeEventListener('touchend', onDragEnd);
  
  // 在这里，我们可以认为拖动结束就是一次验证尝试
  // 直接向上层组件抛出成功事件，由上层组件发送所有数据到后端进行验证
  emit('success', { captchaId: captchaData.captchaId, captchaX: sliderValue.value });
};

onMounted(() => {
  fetchCaptcha();
});
</script>

<style scoped>
.slider-captcha-container {
  padding: 10px;
  background: #fff;
  border-radius: 4px;
  display: inline-block;
}
.captcha-content {
  position: relative;
  user-select: none;
  width: 310px;
}
.captcha-loading {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
  color: #909399;
}
.captcha-image-container {
  position: relative;
  width: 100%;
  height: 160px;
  overflow: hidden;
  border-radius: 4px;
  border: 1px solid #e0e0e0;
}
.background-image {
  width: 100%;
  height: 100%;
  display: block;
}
.piece-image {
  position: absolute;
  width: 60px;
  height: 60px;
  filter: drop-shadow(0 0 5px rgba(0, 0, 0, 0.5));
}
.slider-track {
  width: 100%;
  height: 38px;
  background-color: #f7f9fa;
  border-radius: 4px;
  border: 1px solid #e4e7eb;
  margin-top: 10px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}
.slider-tip {
  color: #7f8c8d;
  font-size: 13px;
}
.slider-thumb {
  position: absolute;
  top: -1px;
  left: 0;
  width: 50px;
  height: 38px;
  background-color: #ffffff;
  border: 1px solid #ccc;
  border-radius: 4px;
  cursor: grab;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 20px;
  color: #3498db;
  box-shadow: 0 0 10px rgba(0,0,0,0.1);
  transition: background-color 0.2s;
}
.slider-thumb:hover {
  background-color: #f2f6fc;
}
.captcha-actions {
  position: absolute;
  top: 5px;
  right: 5px;
}
.captcha-actions .el-button {
  width: 28px;
  height: 28px;
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(0, 0, 0, 0.1);
}
</style> 