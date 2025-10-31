<template>
  <!-- 找到类似这样的代码 -->
  <el-form-item label="发行日期" prop="releaseDate" class="date-form-item">
    <div class="date-picker-wrapper">
      <el-date-picker
        v-model="albumForm.releaseDate"
        type="date"
        placeholder="选择发行日期"
        format="YYYY-MM-DD"
        value-format="YYYY-MM-DD"
        :disabled-date="disabledDate"
      />
    </div>
  </el-form-item>
</template>

<style scoped>
/* 添加样式 */
.date-picker-wrapper {
  width: 100%;
}
</style> 