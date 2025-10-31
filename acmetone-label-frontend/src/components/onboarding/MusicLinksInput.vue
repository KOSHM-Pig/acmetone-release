<template>
  <div class="music-links-input">
    <div class="step-header">
      <h2>是否拥有音乐人主页链接？</h2>
      <p>添加您在各大音乐平台的主页链接，让厂牌更好地了解您</p>
    </div>

    <div class="choice-section">
      <div class="choice-buttons">
        <button 
          :class="['choice-btn', { 'active': hasLinks === false }]"
          @click="setHasLinks(false)"
          type="button"
        >
          暂时没有
        </button>
        <button 
          :class="['choice-btn', { 'active': hasLinks === true }]"
          @click="setHasLinks(true)"
          type="button"
        >
          有链接要添加
        </button>
      </div>
    </div>

    <!-- 音乐平台链接输入 -->
    <div v-if="hasLinks" class="links-section">
      <div class="platform-links">
        <div 
          v-for="platform in musicPlatforms" 
          :key="platform.id"
          class="platform-item"
        >
          <div class="platform-info">
            <span class="platform-icon">{{ platform.icon }}</span>
            <span class="platform-name">{{ platform.name }}</span>
          </div>
          <input
            v-model="musicLinks[platform.id]"
            type="url"
            class="acmetone-input"
            :placeholder="`您在 ${platform.name} 的主页链接`"
            @input="handleLinkInput"
          />
        </div>
      </div>
    </div>

    <div class="step-actions">
      <button 
        @click="handleNext"
        class="acmetone-btn large"
        type="button"
      >
        {{ hasLinks ? '完成设置' : '跳过此步' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, watch } from 'vue'

const props = defineProps({
  modelValue: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['update:modelValue', 'next'])

const hasLinks = ref(null)
const musicLinks = reactive({})

// 音乐平台列表（参考acmetone后端的9个平台）
const musicPlatforms = [
  { id: 'spotify', name: 'Spotify', icon: '🎵' },
  { id: 'apple_music', name: 'Apple Music', icon: '🍎' },
  { id: 'youtube_music', name: 'YouTube Music', icon: '📺' },
  { id: 'soundcloud', name: 'SoundCloud', icon: '☁️' },
  { id: 'bandcamp', name: 'Bandcamp', icon: '🎪' },
  { id: 'netease', name: '网易云音乐', icon: '🎧' },
  { id: 'qq_music', name: 'QQ音乐', icon: '🎶' },
  { id: 'kugou', name: '酷狗音乐', icon: '🐶' },
  { id: 'kuwo', name: '酷我音乐', icon: '🎤' }
]

// 初始化数据
if (props.modelValue.artistInfo.musicLinks.length > 0) {
  hasLinks.value = true
  props.modelValue.artistInfo.musicLinks.forEach(link => {
    musicLinks[link.platform] = link.url
  })
}

// 设置是否有链接
const setHasLinks = (value) => {
  hasLinks.value = value
  if (!value) {
    // 清空所有链接
    Object.keys(musicLinks).forEach(key => {
      musicLinks[key] = ''
    })
    updateModelValue()
  }
}

// 处理链接输入
const handleLinkInput = () => {
  updateModelValue()
}

// 更新模型值
const updateModelValue = () => {
  const updatedState = { ...props.modelValue }
  
  if (hasLinks.value) {
    // 收集有效链接
    const validLinks = []
    Object.entries(musicLinks).forEach(([platform, url]) => {
      if (url && url.trim()) {
        validLinks.push({
          platform,
          url: url.trim(),
          platformName: musicPlatforms.find(p => p.id === platform)?.name || platform
        })
      }
    })
    updatedState.artistInfo.musicLinks = validLinks
  } else {
    updatedState.artistInfo.musicLinks = []
  }
  
  emit('update:modelValue', updatedState)
}

// 处理下一步
const handleNext = () => {
  updateModelValue()
  emit('next')
}
</script>

<style scoped>
.music-links-input {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 32px;
  text-align: center;
}

.step-header h2 {
  font-size: 24px;
  font-weight: 600;
  color: var(--garrix-black, #1d1d1f);
  margin: 0 0 8px 0;
  font-family: var(--garrix-font-primary);
}

.step-header p {
  font-size: 14px;
  color: var(--garrix-grey, #86868b);
  margin: 0;
  font-family: var(--garrix-font-primary);
}

.choice-buttons {
  display: flex;
  gap: 16px;
  justify-content: center;
}

.choice-btn {
  padding: 12px 24px;
  border: 1px solid var(--garrix-border-grey, #d2d2d7);
  background: var(--garrix-white, #ffffff);
  color: var(--garrix-grey, #86868b);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: var(--garrix-font-primary);
}

.choice-btn:hover {
  border-color: var(--garrix-black, #1d1d1f);
  color: var(--garrix-black, #1d1d1f);
}

.choice-btn.active {
  border-color: var(--garrix-black, #1d1d1f);
  background: var(--garrix-black, #1d1d1f);
  color: var(--garrix-white, #ffffff);
}

.links-section {
  text-align: left;
}

.platform-links {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 500px;
  margin: 0 auto;
}

.platform-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.platform-info {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: var(--garrix-black, #1d1d1f);
  font-family: var(--garrix-font-primary);
}

.platform-icon {
  font-size: 16px;
}

.acmetone-input {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid var(--garrix-border-grey, #d2d2d7);
  background: var(--garrix-white, #ffffff);
  font-size: 14px;
  font-family: var(--garrix-font-primary);
  transition: border-color 0.2s ease;
}

.acmetone-input:focus {
  outline: none;
  border-color: var(--garrix-black, #1d1d1f);
}

.acmetone-input::placeholder {
  color: var(--garrix-grey, #86868b);
}

.step-actions {
  display: flex;
  justify-content: center;
}

.acmetone-btn {
  background: none;
  border: 1px solid var(--garrix-black, #1d1d1f);
  color: var(--garrix-black, #1d1d1f);
  font-weight: 600;
  padding: 12px 32px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: var(--garrix-font-primary);
}

.acmetone-btn.large {
  padding: 16px 40px;
  font-size: 16px;
}

.acmetone-btn:hover:not(:disabled) {
  background: var(--garrix-black, #1d1d1f);
  color: var(--garrix-white, #ffffff);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .step-header h2 {
    font-size: 20px;
  }
  
  .choice-buttons {
    flex-direction: column;
    align-items: center;
  }
  
  .choice-btn {
    width: 200px;
  }
  
  .platform-links {
    max-width: none;
  }
}
</style>
