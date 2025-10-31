<template>
  <div class="captcha-modal-overlay" @click="handleOverlayClick">
    <div class="captcha-modal" @click.stop>
      <!-- 模态框头部 -->
      <div class="modal-header">
        <h3>人机验证</h3>
        <button class="close-btn" @click="$emit('close')" type="button">
          ✕
        </button>
      </div>

      <!-- 模态框内容 -->
      <div class="modal-content">
        <div v-if="loading" class="loading-container">
          <div class="loading-spinner"></div>
          <span>加载中...</span>
        </div>

        <div v-if="!loading && captchaData.backgroundImage" class="captcha-content">
          <div class="captcha-image-container">
            <img :src="captchaData.backgroundImage" class="background-image" alt="验证码背景" />
            <img
              :src="captchaData.pieceImage"
              class="piece-image"
              :style="{ top: captchaData.positionY + 'px', left: sliderValue + 'px' }"
              alt="拼图块"
            />
            <button class="refresh-btn" @click="refreshCaptcha" type="button" title="刷新验证码">
              ↻
            </button>
          </div>

          <div class="slider-container">
            <div class="slider-track" ref="trackRef">
              <div
                class="slider-thumb"
                :style="{ left: sliderValue + 'px' }"
                @mousedown="onDragStart"
                @touchstart="onDragStart"
              >
                →
              </div>
              <div class="slider-tip">{{ tipText }}</div>
            </div>
          </div>
        </div>

        <div v-if="!loading && !captchaData.backgroundImage" class="error-container">
          <p>验证码加载失败</p>
          <button class="retry-btn" @click="fetchCaptcha" type="button">重试</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue';
import { authApi } from '../utils/api';
import notification from '../utils/notification';

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

// 处理遮罩层点击
const handleOverlayClick = () => {
  emit('close')
}

// 获取验证码
const fetchCaptcha = async () => {
  loading.value = true
  tipText.value = '向右拖动滑块填充拼图'
  sliderValue.value = 0
  try {
    const response = await authApi.get('/captcha')
    Object.assign(captchaData, response.data)
  } catch (error) {
    console.error('验证码加载失败:', error)
    notification.error('验证码加载失败，请稍后重试')
    emit('close')
  } finally {
    loading.value = false
  }
}

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
  if (!isDragging.value) return
  event.preventDefault() // 阻止滚动等默认行为
  const trackWidth = trackRef.value.clientWidth
  const thumbWidth = 50 // 与acmetone-frontend保持一致
  // 兼容触摸和鼠标事件
  const moveX = (event.clientX || event.touches[0].clientX) - startX.value
  let newLeft = Math.max(0, Math.min(moveX, trackWidth - thumbWidth))
  sliderValue.value = newLeft
}

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
/* 模态框遮罩层 */
.captcha-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10001;
  padding: 20px;
  box-sizing: border-box;
}

/* 模态框主体 */
.captcha-modal {
  background: var(--garrix-white, #ffffff);
  border: 1px solid var(--garrix-border-grey, #d2d2d7);
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  position: relative;
  width: 400px;
  max-width: 90vw;
}

/* 模态框头部 */
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid var(--garrix-border-grey, #d2d2d7);
}

.modal-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--garrix-black, #1d1d1f);
  font-family: var(--garrix-font-primary);
}

.close-btn {
  background: none;
  border: none;
  font-size: 18px;
  color: var(--garrix-grey, #86868b);
  cursor: pointer;
  padding: 4px;
  transition: color 0.2s ease;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  color: var(--garrix-black, #1d1d1f);
}

/* 模态框内容 */
.modal-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

/* 加载状态 */
.loading-container {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
  flex-direction: column;
  gap: 12px;
  color: var(--garrix-grey, #86868b);
  font-family: var(--garrix-font-primary);
}

.loading-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid var(--garrix-border-grey, #d2d2d7);
  border-top: 2px solid var(--garrix-black, #1d1d1f);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* 验证码内容 */
.captcha-content {
  position: relative;
  user-select: none;
  width: 310px;
}

.captcha-image-container {
  position: relative;
  width: 100%;
  height: 160px;
  overflow: hidden;
  border: 1px solid var(--garrix-border-grey, #d2d2d7);
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

.refresh-btn {
  position: absolute;
  top: 10px;
  right: 10px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid var(--garrix-border-grey, #d2d2d7);
  color: var(--garrix-black, #1d1d1f);
  cursor: pointer;
  padding: 8px;
  font-size: 16px;
  transition: all 0.2s ease;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.refresh-btn:hover {
  background: var(--garrix-white, #ffffff);
  border-color: var(--garrix-black, #1d1d1f);
}

/* 滑块容器 */
.slider-container {
  margin-top: 20px;
}

.slider-track {
  width: 100%;
  height: 38px;
  background-color: var(--garrix-light-grey, #f8f9fa);
  border: 1px solid var(--garrix-border-grey, #d2d2d7);
  margin-top: 10px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.slider-thumb {
  position: absolute;
  top: -1px;
  left: 0;
  width: 50px;
  height: 38px;
  background-color: var(--garrix-white, #ffffff);
  border: 1px solid var(--garrix-border-grey, #d2d2d7);
  cursor: grab;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 20px;
  color: var(--garrix-black, #1d1d1f);
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
  transition: background-color 0.2s;
}

.slider-thumb:hover {
  background-color: var(--garrix-light-grey, #f8f9fa);
}

.slider-tip {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: var(--garrix-grey, #86868b);
  font-size: 14px;
  pointer-events: none;
  z-index: 1;
  font-family: var(--garrix-font-primary);
}

/* 错误状态 */
.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 40px 20px;
  color: var(--garrix-grey, #86868b);
  font-family: var(--garrix-font-primary);
}

.retry-btn {
  background: none;
  border: 1px solid var(--garrix-black, #1d1d1f);
  color: var(--garrix-black, #1d1d1f);
  font-weight: 600;
  padding: 8px 16px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: var(--garrix-font-primary);
}

.retry-btn:hover {
  background: var(--garrix-black, #1d1d1f);
  color: var(--garrix-white, #ffffff);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .captcha-modal {
    width: 95vw;
    margin: 10px;
  }

  .modal-header,
  .modal-content {
    padding: 16px;
  }

  .captcha-image-container {
    height: 160px;
  }
}
</style>
