<template>
  <div class="label-search">
    <div class="step-header">
      <h2>搜索您的厂牌</h2>
      <p>输入厂牌中文名进行搜索，找到您要申请认证的厂牌</p>
    </div>

    <div class="search-section">
      <div class="search-wrapper">
        <input
          v-model="searchQuery"
          type="text"
          class="acmetone-input search-input"
          placeholder="请输入厂牌中文名"
          @input="handleSearch"
        />
        <div v-if="searching" class="search-loading">
          搜索中...
        </div>
      </div>

      <!-- 搜索结果 -->
      <div v-if="searchResults.length > 0" class="search-results">
        <div class="results-header">
          找到 {{ searchResults.length }} 个匹配的厂牌
        </div>
        <div class="results-list">
          <div 
            v-for="label in searchResults" 
            :key="label.id"
            :class="['result-item', { 'selected': selectedLabel?.id === label.id }]"
            @click="selectLabel(label)"
          >
            <div class="label-avatar">
              <img :src="label.avatar || '/images/default-label-avatar.png'" :alt="label.chineseName" />
            </div>
            <div class="label-info">
              <div class="label-name">{{ label.chineseName }}</div>
              <div class="label-english">{{ label.englishName }}</div>
              <div class="label-meta">
                成立于 {{ formatDate(label.createdAt) }} · {{ label.memberCount || 0 }} 名成员
              </div>
            </div>
            <div class="select-indicator">
              <span v-if="selectedLabel?.id === label.id">✓</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 无搜索结果 -->
      <div v-else-if="searchQuery && !searching && hasSearched" class="no-results">
        <div class="no-results-icon">🔍</div>
        <div class="no-results-text">
          <h3>未找到匹配的厂牌</h3>
          <p>请检查厂牌名称是否正确，或联系管理员添加厂牌信息</p>
        </div>
      </div>
    </div>

    <div class="step-actions">
      <button 
        @click="handleNext"
        :disabled="!selectedLabel"
        class="acmetone-btn large"
        type="button"
      >
        申请认证此厂牌
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  modelValue: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['update:modelValue', 'next'])

const searchQuery = ref('')
const searching = ref(false)
const hasSearched = ref(false)
const searchResults = ref([])
const selectedLabel = ref(null)

// 模拟搜索延迟
let searchTimeout = null

// 处理搜索
const handleSearch = () => {
  if (searchTimeout) {
    clearTimeout(searchTimeout)
  }
  
  if (!searchQuery.value.trim()) {
    searchResults.value = []
    hasSearched.value = false
    return
  }
  
  searching.value = true
  
  searchTimeout = setTimeout(async () => {
    try {
      // 这里调用实际的搜索API
      const results = await searchLabels(searchQuery.value)
      searchResults.value = results
      hasSearched.value = true
    } catch (error) {
      console.error('搜索厂牌失败:', error)
      searchResults.value = []
      hasSearched.value = true
    } finally {
      searching.value = false
    }
  }, 500)
}

// 模拟搜索API
const searchLabels = async (query) => {
  // 模拟API延迟
  await new Promise(resolve => setTimeout(resolve, 300))
  
  // 模拟搜索结果
  const mockLabels = [
    {
      id: 1,
      chineseName: '极音记',
      englishName: 'JiYinJi Records',
      avatar: '/images/labels/jiyinji.png',
      createdAt: '2020-01-15',
      memberCount: 25
    },
    {
      id: 2,
      chineseName: '节奏阵列',
      englishName: 'Beat Array',
      avatar: '/images/labels/beatarray.png',
      createdAt: '2019-06-20',
      memberCount: 18
    },
    {
      id: 3,
      chineseName: '音乐工厂',
      englishName: 'Music Factory',
      avatar: '/images/labels/musicfactory.png',
      createdAt: '2021-03-10',
      memberCount: 12
    }
  ]
  
  // 简单的模糊搜索
  return mockLabels.filter(label => 
    label.chineseName.includes(query) || 
    label.englishName.toLowerCase().includes(query.toLowerCase())
  )
}

// 选择厂牌
const selectLabel = (label) => {
  selectedLabel.value = label
  
  // 更新状态
  const updatedState = { ...props.modelValue }
  updatedState.labelInfo.selectedLabelId = label.id
  updatedState.labelInfo.chineseName = label.chineseName
  updatedState.labelInfo.englishName = label.englishName
  updatedState.labelInfo.isInJiYinJi = true
  
  emit('update:modelValue', updatedState)
}

// 格式化日期
const formatDate = (dateString) => {
  const date = new Date(dateString)
  return date.getFullYear() + '年'
}

// 处理下一步
const handleNext = () => {
  if (selectedLabel.value) {
    emit('next')
  }
}
</script>

<style scoped>
.label-search {
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

.search-section {
  text-align: left;
}

.search-wrapper {
  position: relative;
  margin-bottom: 24px;
}

.search-input {
  width: 100%;
  padding: 16px;
  border: 1px solid var(--garrix-border-grey, #d2d2d7);
  background: var(--garrix-white, #ffffff);
  font-size: 16px;
  font-family: var(--garrix-font-primary);
  transition: border-color 0.2s ease;
}

.search-input:focus {
  outline: none;
  border-color: var(--garrix-black, #1d1d1f);
}

.search-loading {
  position: absolute;
  right: 16px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 14px;
  color: var(--garrix-grey, #86868b);
  font-family: var(--garrix-font-primary);
}

.search-results {
  border: 1px solid var(--garrix-border-grey, #d2d2d7);
}

.results-header {
  padding: 12px 16px;
  background: var(--garrix-light-grey, #f8f9fa);
  font-size: 14px;
  color: var(--garrix-grey, #86868b);
  font-family: var(--garrix-font-primary);
  border-bottom: 1px solid var(--garrix-border-grey, #d2d2d7);
}

.results-list {
  max-height: 300px;
  overflow-y: auto;
}

.result-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  border-bottom: 1px solid var(--garrix-border-grey, #d2d2d7);
}

.result-item:last-child {
  border-bottom: none;
}

.result-item:hover {
  background: var(--garrix-light-grey, #f8f9fa);
}

.result-item.selected {
  background: var(--garrix-light-grey, #f8f9fa);
  border-color: var(--garrix-black, #1d1d1f);
}

.label-avatar {
  width: 48px;
  height: 48px;
  flex-shrink: 0;
}

.label-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border: 1px solid var(--garrix-border-grey, #d2d2d7);
}

.label-info {
  flex: 1;
}

.label-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--garrix-black, #1d1d1f);
  margin-bottom: 4px;
  font-family: var(--garrix-font-primary);
}

.label-english {
  font-size: 14px;
  color: var(--garrix-grey, #86868b);
  margin-bottom: 4px;
  font-family: var(--garrix-font-primary);
}

.label-meta {
  font-size: 12px;
  color: var(--garrix-grey, #86868b);
  font-family: var(--garrix-font-primary);
}

.select-indicator {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  color: var(--garrix-black, #1d1d1f);
}

.no-results {
  text-align: center;
  padding: 48px 24px;
}

.no-results-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.no-results-text h3 {
  font-size: 18px;
  font-weight: 600;
  color: var(--garrix-black, #1d1d1f);
  margin: 0 0 8px 0;
  font-family: var(--garrix-font-primary);
}

.no-results-text p {
  font-size: 14px;
  color: var(--garrix-grey, #86868b);
  margin: 0;
  font-family: var(--garrix-font-primary);
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

.acmetone-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .step-header h2 {
    font-size: 20px;
  }
  
  .result-item {
    padding: 12px;
    gap: 12px;
  }
  
  .label-avatar {
    width: 40px;
    height: 40px;
  }
}
</style>
