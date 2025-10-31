<!-- 
    这个组件是Acmetone的表格组件，用于在Acmetone的页面中使用。
    它继承了Acmetone的样式，并添加了更多的样式和功能。
    它是一个通用的表格组件，可以用于任何需要表格的地方。
    它支持以下功能：
    1. 支持自定义列配置
    2. 支持排序
    3. 支持斑马纹
    4. 支持悬停效果
    5. 支持加载状态
-->
<template>
  <div class="acmetone-table-container">
    <div v-if="loading" class="table-loading">
      <div class="loading-spinner"></div>
      <span>加载中...</span>
    </div>
    <table v-else :class="['acmetone-table', { 'striped': striped, 'hover': hover }]">
      <thead>
        <tr>
          <th 
            v-for="column in columns" 
            :key="column.key"
            :class="{ 'sortable': column.sortable }"
            @click="column.sortable && handleSort(column.key)"
          >
            <div class="th-content">
              <span>{{ column.title }}</span>
              <span v-if="column.sortable" class="sort-icon">
                <span :class="getSortClass(column.key)">↕</span>
              </span>
            </div>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, index) in sortedData" :key="index">
          <td v-for="column in columns" :key="column.key">
            <slot 
              :name="column.key" 
              :row="row" 
              :value="row[column.key]" 
              :index="index"
            >
              {{ row[column.key] }}
            </slot>
          </td>
        </tr>
      </tbody>
    </table>
    <div v-if="!loading && (!data || data.length === 0)" class="empty-state">
      <slot name="empty">
        <div class="empty-content">
          <span class="empty-icon">📋</span>
          <p>暂无数据</p>
        </div>
      </slot>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
  data: {
    type: Array,
    default: () => []
  },
  columns: {
    type: Array,
    required: true
  },
  striped: {
    type: Boolean,
    default: true
  },
  hover: {
    type: Boolean,
    default: true
  },
  loading: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['sort']);

const sortKey = ref('');
const sortOrder = ref('');

const sortedData = computed(() => {
  if (!sortKey.value) return props.data;
  
  return [...props.data].sort((a, b) => {
    const aVal = a[sortKey.value];
    const bVal = b[sortKey.value];
    
    if (sortOrder.value === 'asc') {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });
});

const handleSort = (key) => {
  if (sortKey.value === key) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortKey.value = key;
    sortOrder.value = 'asc';
  }
  
  emit('sort', { key, order: sortOrder.value });
};

const getSortClass = (key) => {
  if (sortKey.value !== key) return 'sort-none';
  return sortOrder.value === 'asc' ? 'sort-asc' : 'sort-desc';
};
</script>

<style scoped>
.acmetone-table-container {
  width: 100%;
  overflow-x: auto;
  background: var(--garrix-white, #ffffff);
  border-radius: 16px;
  border: 1px solid var(--garrix-border-grey, #e0e0e0);
}

.acmetone-table {
  width: 100%;
  border-collapse: collapse;
  font-family: var(--garrix-font-primary, 'Montserrat', sans-serif);
}

.acmetone-table thead {
  background: var(--garrix-light-grey, #f8f9fa);
}

.acmetone-table th {
  padding: 16px 20px;
  text-align: left;
  font-weight: 600;
  color: var(--garrix-black, #1d1d1f);
  border-bottom: 1px solid var(--garrix-border-grey, #e0e0e0);
  font-size: 14px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.acmetone-table th.sortable {
  cursor: pointer;
  user-select: none;
}

.acmetone-table th.sortable:hover {
  background: var(--garrix-border-grey, #e0e0e0);
}

.th-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.sort-icon {
  margin-left: 8px;
  font-size: 12px;
  opacity: 0.6;
}

.sort-asc::before {
  content: '↑';
}

.sort-desc::before {
  content: '↓';
}

.sort-none {
  opacity: 0.3;
}

.acmetone-table td {
  padding: 16px 20px;
  border-bottom: 1px solid var(--garrix-border-grey, #e0e0e0);
  color: var(--garrix-black, #1d1d1f);
  font-size: 14px;
}

.acmetone-table.striped tbody tr:nth-child(even) {
  background: var(--garrix-light-grey, #f8f9fa);
}

.acmetone-table.hover tbody tr:hover {
  background: var(--garrix-border-grey, #e0e0e0);
}

.table-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
  color: var(--garrix-grey, #86868b);
}

.loading-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid var(--garrix-border-grey, #e0e0e0);
  border-top: 2px solid var(--garrix-black, #1d1d1f);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-right: 12px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.empty-state {
  padding: 40px;
  text-align: center;
}

.empty-content {
  color: var(--garrix-grey, #86868b);
}

.empty-icon {
  font-size: 48px;
  display: block;
  margin-bottom: 16px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .acmetone-table th,
  .acmetone-table td {
    padding: 12px 16px;
    font-size: 13px;
  }
}
</style>
