<!-- 
    这个组件是Acmetone的搜索下拉框组件，用于在Acmetone的页面中使用。
    它继承了Acmetone的样式，并添加了更多的样式和功能。
    它是一个通用的搜索下拉框组件，可以用于任何需要搜索下拉框的地方。

-->
<template>
  <div class="acmetone-search-dropdown">
    <div class="search-box-container">
      <el-input
        v-model="searchValue"
        :placeholder="placeholder"
        class="garrix-input"
        @input="handleSearch"
        @blur="handleBlur"
        @focus="handleFocus"
      >
        <template #prefix>
          <el-icon class="search-icon"><Search /></el-icon>
        </template>
      </el-input>
      <div 
        v-if="showDropdown" 
        class="search-dropdown"
      >
        <div class="search-dropdown-content">
          <div v-if="loading" class="search-loading">
            <el-icon><Loading /></el-icon> {{ loadingText }}
          </div>
          <div v-else-if="results.length === 0" class="no-results">
            {{ emptyText }}
          </div>
          <div v-else class="search-results-list">
            <div 
              v-for="(item, index) in results" 
              :key="getItemKey(item, index)"
              class="search-result-item"
              @click="selectItem(item)"
            >
              <slot name="item" :item="item">
                <div class="item-info">
                  <div class="item-title">{{ getItemText(item) }}</div>
                  <div v-if="getItemSubtext(item)" class="item-subtext">{{ getItemSubtext(item) }}</div>
                </div>
              </slot>
              <span class="action-icon">
                <slot name="action-icon">
                  <el-icon><Plus /></el-icon>
                </slot>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue';
import { Search, Loading, Plus } from '@element-plus/icons-vue';

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  placeholder: {
    type: String,
    default: '搜索...'
  },
  results: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  },
  loadingText: {
    type: String,
    default: '搜索中...'
  },
  emptyText: {
    type: String,
    default: '没有找到匹配结果'
  },
  textField: {
    type: String,
    default: 'name'
  },
  subtextField: {
    type: String,
    default: ''
  },
  keyField: {
    type: String,
    default: 'id'
  },
  autoClose: {
    type: Boolean,
    default: true
  },
  closeDelay: {
    type: Number,
    default: 200
  }
});

const emit = defineEmits(['update:modelValue', 'search', 'select', 'blur', 'focus']);

const searchValue = ref(props.modelValue);
const showDropdown = ref(false);
const blurTimeout = ref(null);

// 同步外部值到内部
watch(() => props.modelValue, (newVal) => {
  searchValue.value = newVal;
});

// 同步内部值到外部
watch(searchValue, (newVal) => {
  emit('update:modelValue', newVal);
});

// 处理搜索
const handleSearch = () => {
  emit('search', searchValue.value);
  showDropdown.value = true;
};

// 处理失焦
const handleBlur = () => {
  emit('blur');
  if (props.autoClose) {
    // 延迟关闭下拉框，以便可以点击下拉项
    blurTimeout.value = setTimeout(() => {
      showDropdown.value = false;
    }, props.closeDelay);
  }
};

// 处理聚焦
const handleFocus = () => {
  emit('focus');
  if (searchValue.value && props.results.length > 0) {
    showDropdown.value = true;
  }
  // 清除可能存在的模糊超时
  if (blurTimeout.value) {
    clearTimeout(blurTimeout.value);
  }
};

// 选择项目
const selectItem = (item) => {
  emit('select', item);
  if (props.autoClose) {
    showDropdown.value = false;
  }
};

// 获取项目文本
const getItemText = (item) => {
  if (typeof item === 'string') return item;
  return props.textField ? item[props.textField] : item.toString();
};

// 获取项目子文本
const getItemSubtext = (item) => {
  if (!props.subtextField) return '';
  return item[props.subtextField] || '';
};

// 获取项目键
const getItemKey = (item, index) => {
  if (typeof item === 'object' && item !== null && props.keyField in item) {
    return item[props.keyField];
  }
  return index;
};
</script>

<style scoped>
.acmetone-search-dropdown {
  position: relative;
  width: 100%;
}

.search-box-container {
  position: relative;
  width: 100%;
}

:deep(.garrix-input .el-input__wrapper) {
  border: 2px solid var(--garrix-black, #1d1d1f);
  border-radius: 0;
  background-color: var(--garrix-white, #ffffff);
  box-shadow: 4px 4px 0 rgba(0, 0, 0, 0.1) !important;
  transition: all 0.2s ease;
  padding: 0 15px;
}

:deep(.garrix-input .el-input__wrapper:hover) {
  transform: translate(-2px, -2px);
  box-shadow: 6px 6px 0 rgba(0, 0, 0, 0.1) !important;
}

:deep(.garrix-input .el-input__wrapper.is-focus) {
  transform: translate(-2px, -2px);
  box-shadow: 6px 6px 0 rgba(0, 0, 0, 0.1) !important;
}

:deep(.garrix-input .el-input__inner) {
  height: 42px;
  font-weight: 500;
  color: var(--garrix-black, #1d1d1f);
}

:deep(.search-icon) {
  color: var(--garrix-black, #1d1d1f);
  font-size: 16px;
  margin-right: 8px;
}

.search-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  width: 100%;
  background-color: var(--garrix-white, #ffffff);
  border: 2px solid var(--garrix-black, #1d1d1f);
  box-shadow: 4px 4px 0 rgba(0, 0, 0, 0.1);
  z-index: 1000;
  margin-top: 8px;
}

.search-dropdown-content {
  max-height: 300px;
  overflow-y: auto;
}

.search-loading,
.no-results {
  padding: 16px;
  text-align: center;
  color: var(--garrix-text-secondary, #86868b);
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.search-results-list {
  padding: 8px 0;
}

.search-result-item {
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  transition: background-color 0.2s;
}

.search-result-item:hover {
  background-color: var(--garrix-light-grey, #f5f7fa);
}

.item-info {
  flex: 1;
  overflow: hidden;
}

.item-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--garrix-text-primary, #1d1d1f);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-subtext {
  font-size: 12px;
  color: var(--garrix-text-secondary, #86868b);
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.action-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  color: var(--garrix-text-primary, #1d1d1f);
  transition: transform 0.2s;
}

.search-result-item:hover .action-icon {
  transform: scale(1.2);
}

/* 响应式调整 */
@media (max-width: 768px) {
  .search-dropdown-content {
    max-height: 250px;
  }
  
  .search-result-item {
    padding: 10px 12px;
  }
}
</style> 