<template>
  <div class="report-detail-container garrix-light-theme">
    <div class="detail-header">
      <el-button class="back-btn" @click="goBack">&lt; 返回报表</el-button>
      <h1>{{ year }}年 {{ month }}月收入明细</h1>
      <el-button class="action-btn">导出明细</el-button>
    </div>

    <div class="detail-summary">
      <div class="summary-item">
        <div class="summary-label">税前总收入</div>
        <div class="summary-value">¥0.00</div>
      </div>
      <div class="summary-item">
        <div class="summary-label">预估税额</div>
        <div class="summary-value">¥0.00</div>
      </div>
      <div class="summary-item">
        <div class="summary-label">税后总收入</div>
        <div class="summary-value primary-value">¥0.00</div>
      </div>
    </div>

    <div class="detail-content">
      <el-tabs v-model="activeTab" class="detail-tabs">
        <el-tab-pane label="按歌曲" name="songs">
          <div class="empty-state" v-if="songDetails.length === 0">
            <div class="empty-text">本月暂无歌曲收入数据</div>
          </div>
          <el-table v-else :data="songDetails" class="detail-table">
            <el-table-column prop="songTitle" label="歌曲"></el-table-column>
            <el-table-column prop="isrc" label="ISRC"></el-table-column>
            <el-table-column prop="streams" label="播放量"></el-table-column>
            <el-table-column prop="revenue" label="收入"></el-table-column>
          </el-table>
        </el-tab-pane>
        <el-tab-pane label="按平台" name="platforms">
          <div class="empty-state" v-if="platformDetails.length === 0">
            <div class="empty-text">本月暂无平台收入数据</div>
          </div>
           <el-table v-else :data="platformDetails" class="detail-table">
            <el-table-column prop="platform" label="平台"></el-table-column>
            <el-table-column prop="streams" label="播放量"></el-table-column>
            <el-table-column prop="revenue" label="收入"></el-table-column>
          </el-table>
        </el-tab-pane>
        <el-tab-pane label="按地区" name="regions">
           <div class="empty-state" v-if="regionDetails.length === 0">
            <div class="empty-text">本月暂无地区收入数据</div>
          </div>
           <el-table v-else :data="regionDetails" class="detail-table">
            <el-table-column prop="region" label="地区"></el-table-column>
            <el-table-column prop="streams" label="播放量"></el-table-column>
            <el-table-column prop="revenue" label="收入"></el-table-column>
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';

const props = defineProps({
  year: String,
  month: String
});

const router = useRouter();
const activeTab = ref('songs');

// Mock data, initialized as empty
const songDetails = ref([]);
const platformDetails = ref([]);
const regionDetails = ref([]);

const goBack = () => {
  router.push('/reports');
};

onMounted(() => {
  // Here you would fetch data from an API based on props.year and props.month
});
</script>

<style scoped>
.garrix-light-theme {
  background-color: #ffffff;
  color: #000000;
  padding: 40px;
  min-height: 100vh;
  font-family: 'Helvetica Neue', Arial, sans-serif;
  letter-spacing: 0.02em;
}

.report-detail-container {
  max-width: 1400px;
  margin: 0 auto;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 40px;
}

.detail-header h1 {
  font-size: 28px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0;
  text-align: center;
  flex-grow: 1;
}

.back-btn {
  background-color: transparent;
  color: #000;
  border: none;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.action-btn {
  background-color: #ffffff;
  color: #000000;
  border: 1px solid #000000;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-radius: 0;
  transition: all 0.3s ease;
  padding: 10px 20px;
}

.action-btn:hover {
  background-color: #000000;
  color: #ffffff;
}

.detail-summary {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 30px;
  background-color: #fafafa;
  border: 1px solid #e0e0e0;
  padding: 30px;
  margin-bottom: 40px;
  text-align: center;
}

.summary-label {
  font-size: 14px;
  text-transform: uppercase;
  color: #666;
  margin-bottom: 10px;
}

.summary-value {
  font-size: 24px;
  font-weight: 700;
}

.primary-value {
  color: #000;
}

.detail-content {
  margin-top: 20px;
}

.detail-tabs :deep(.el-tabs__item) {
  color: #666;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 0 20px;
  height: 50px;
  line-height: 50px;
}

.detail-tabs :deep(.el-tabs__item.is-active) {
  color: #000000;
}

.detail-tabs :deep(.el-tabs__active-bar) {
  background-color: #000000;
}

.detail-tabs :deep(.el-tabs__nav-wrap::after) {
  background-color: #e0e0e0;
}

.detail-table {
  width: 100%;
}
.detail-table :deep(th) {
  background-color: #fafafa !important;
  color: #000 !important;
  text-transform: uppercase;
}

.empty-state {
  text-align: center;
  padding: 80px 0;
  color: #999;
}

.empty-text {
  font-size: 16px;
  font-weight: 600;
}
</style> 