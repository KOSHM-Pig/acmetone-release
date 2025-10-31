<!-- 
    这个组件是Acmetone的翻页组件，用于在Acmetone的页面中使用。
    它继承了Acmetone的样式，并添加了更多的样式和功能。
    它是一个通用的翻页组件，可以用于任何需要翻页的地方。

-->
<template>
  <div class="acmetone-pagination">
    <el-pagination
      v-model:current-page="currentPageProxy"
      v-model:page-size="pageSizeProxy"
      :page-sizes="pageSizes"
      :layout="layout"
      :total="total"
      @size-change="handleSizeChange"
      @current-change="handleCurrentChange"
      prev-text="上一页"
      next-text="下一页"
    />
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';

const props = defineProps({
  currentPage: {
    type: Number,
    default: 1
  },
  pageSize: {
    type: Number,
    default: 10
  },
  pageSizes: {
    type: Array,
    default: () => [10, 20, 50, 100]
  },
  total: {
    type: Number,
    default: 0
  },
  layout: {
    type: String,
    default: "total, prev, pager, next, jumper"
  }
});

const emit = defineEmits(['update:currentPage', 'update:pageSize', 'size-change', 'current-change']);

const currentPageProxy = ref(props.currentPage);
const pageSizeProxy = ref(props.pageSize);

watch(() => props.currentPage, (newVal) => {
  currentPageProxy.value = newVal;
});

watch(() => props.pageSize, (newVal) => {
  pageSizeProxy.value = newVal;
});

watch(currentPageProxy, (newVal) => {
  emit('update:currentPage', newVal);
});

watch(pageSizeProxy, (newVal) => {
  emit('update:pageSize', newVal);
});

const handleSizeChange = (val) => {
  emit('size-change', val);
};

const handleCurrentChange = (val) => {
  emit('current-change', val);
};
</script>

<style scoped>
.acmetone-pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}

:deep(.el-pagination) {
  --el-pagination-font-size: 12px;
  --el-text-color-primary: var(--garrix-black, #1d1d1f);
  --el-color-primary: var(--garrix-black, #1d1d1f);
  letter-spacing: 1px;
}

:deep(.el-pagination button),
:deep(.el-pagination .el-pager li) {
  border: 1px solid var(--garrix-black, #1d1d1f);
  border-radius: 0;
  background-color: var(--garrix-white, #ffffff);
  min-width: 32px;
  height: 32px;
  margin: 0 4px;
}

:deep(.el-pagination .btn-prev .el-icon),
:deep(.el-pagination .btn-next .el-icon) {
  display: none;
}

:deep(.el-pagination .el-pager li.is-active) {
  background-color: var(--garrix-black, #1d1d1f);
  color: var(--garrix-white, #ffffff);
}

:deep(.el-pagination__total) {
  margin-right: 16px;
}

:deep(.el-pagination__jump) {
  margin-left: 16px;
}

:deep(.el-pagination__jump .el-input__wrapper) {
  border-radius: 0;
  border: 1px solid var(--garrix-black, #1d1d1f);
  box-shadow: none !important;
  width: 40px;
}

/* 响应式调整 */
@media (max-width: 480px) {
  :deep(.el-pagination) {
    flex-wrap: wrap;
    justify-content: center;
  }
  
  :deep(.el-pagination__total) {
    display: block;
    width: 100%;
    text-align: center;
    margin-bottom: 10px;
  }
}
</style> 