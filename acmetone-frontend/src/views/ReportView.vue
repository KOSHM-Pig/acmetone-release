<template>
  <div class="report-container garrix-light-theme">
    <div class="report-header">
      <h1>版税收入报表</h1>
      <div class="report-actions">
        <el-button class="action-btn">导出报表</el-button>
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          format="YYYY-MM-DD"
          value-format="YYYY-MM-DD"
          @change="filterByDate"
          class="date-picker"
        />
      </div>
    </div>

    <!-- 统计卡片部分 -->
    <div class="report-summary-cards">
      <div class="summary-card primary-card">
        <div class="card-title">版税收入</div>
        <div class="card-amount">0.00</div>
        <div class="card-detail">
          从0个渠道歌曲获得
        </div>
      </div>
    </div>

    <!-- 处理流程指引 -->
    <div class="process-guide">
      <div class="step" :class="{ 'active-step': currentStep >= 1 }">
        <div class="step-number">1</div>
        <div class="step-desc">平台推送账单后，您需确认账单</div>
      </div>
      <div class="step" :class="{ 'active-step': currentStep >= 2 }">
        <div class="step-number">2</div>
        <div class="step-desc">选择支付方式</div>
      </div>
      <div class="step" :class="{ 'active-step': currentStep >= 3 }">
        <div class="step-number">3</div>
        <div class="step-desc">平台打款 (次月打款)</div>
      </div>
      <div class="step" :class="{ 'active-step': currentStep >= 4 }">
        <div class="step-number">4</div>
        <div class="step-desc">支付结果</div>
      </div>
      <el-button type="text" class="guide-help" @click="showGuideHelp">查看结算指引</el-button>
    </div>

    <!-- 子标签页 -->
    <div class="sub-tabs-container">
      <el-tabs v-model="subActiveTab" class="sub-tabs">
        <el-tab-pane label="全部" name="all"></el-tab-pane>
        <el-tab-pane label="待确认账单" name="toConfirm"></el-tab-pane>
        <el-tab-pane label="待选择支付方式" name="paymentMethod"></el-tab-pane>
        <el-tab-pane label="支付结果" name="paymentResult"></el-tab-pane>
        <el-tab-pane label="收入分析" name="analysis"></el-tab-pane>
      </el-tabs>
    </div>

    <!-- 年度选择器 -->
    <div class="year-selector">
      <span class="year-label">{{ currentYear }}年</span>
      <el-dropdown @command="changeYear" class="year-dropdown">
        <span class="el-dropdown-link">
          全部账单
          <i class="el-icon-arrow-down"></i>
        </span>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="all">全部账单</el-dropdown-item>
            <el-dropdown-item command="confirmed">已确认账单</el-dropdown-item>
            <el-dropdown-item command="pending">待确认账单</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>

    <!-- 月度提示信息 -->
    <div class="month-info-alert">
      <el-alert
        type="info"
        show-icon
        :closable="false"
      >
        {{ currentYear }}账单正在结算进行中，因用户众多，预计在本月底生成完毕。期间如有算歌曲版合同不全为正常现象，请以月底账单结算金额为准，感谢您的理解和配合
      </el-alert>
    </div>

    <!-- 月度报表列表 -->
    <div class="monthly-reports">
      <div class="empty-state" v-if="monthlyData.length === 0">
        <div class="empty-icon">
          <i class="el-icon-data-line"></i>
        </div>
        <div class="empty-text">暂无收入数据</div>
        <div class="empty-subtext">当您的音乐开始产生收益后，将在这里显示月度收入报表</div>
        <el-button class="action-btn">了解如何增加收入</el-button>
      </div>
      
      <div v-for="month in monthlyData" :key="month.month" class="monthly-report-item">
        <div class="month-info">
          <div class="month-name">{{ month.month }}月</div>
          <div class="month-amount">{{ month.amount }}</div>
          <div class="tax-info">税前结算金额 <el-tooltip content="查看税额计算方式" placement="top"><i class="el-icon-question"></i></el-tooltip></div>
        </div>

        <div class="month-details">
          <div class="month-contracts">
            结算合同: {{ month.contracts }}
            <el-popover
              placement="bottom"
              width="400"
              trigger="click"
            >
              <template #reference>
                <i class="el-icon-arrow-down"></i>
              </template>
              <div class="contracts-popover">
                <h4>结算合同明细</h4>
                <div class="empty-popover" v-if="!month.contractDetails || month.contractDetails.length === 0">
                  暂无合同明细数据
                </div>
                <el-table v-else :data="month.contractDetails" style="width: 100%">
                  <el-table-column prop="name" label="合同名称" width="180"></el-table-column>
                  <el-table-column prop="amount" label="金额"></el-table-column>
                </el-table>
              </div>
            </el-popover>
          </div>
          
          <div class="month-songs">
            结算歌曲: {{ month.songs }}
            <el-popover
              placement="bottom"
              width="400"
              trigger="click"
            >
              <template #reference>
                <i class="el-icon-arrow-down"></i>
              </template>
              <div class="songs-popover">
                <h4>结算歌曲明细</h4>
                <div class="empty-popover" v-if="!month.songDetails || month.songDetails.length === 0">
                  暂无歌曲明细数据
                </div>
                <el-table v-else :data="month.songDetails" style="width: 100%">
                  <el-table-column prop="name" label="歌曲名称" width="180"></el-table-column>
                  <el-table-column prop="plays" label="播放量"></el-table-column>
                  <el-table-column prop="amount" label="收入金额"></el-table-column>
                </el-table>
              </div>
            </el-popover>
          </div>
          
          <div class="month-actions">
            <el-button size="small" class="action-btn-secondary" @click="exportMonthReport(month)">确认账单</el-button>
            <el-button size="small" class="action-btn" @click="viewMonthDetail(month)">收入明细</el-button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { useRouter } from 'vue-router';

// 状态变量
const router = useRouter();
const dateRange = ref([]);
const currentStep = ref(1);
const subActiveTab = ref('all');
const currentYear = ref(new Date().getFullYear());

// 收入数据 - 初始化为零
const totalRoyalty = ref(0);

// 月度数据 - 初始化为空数组
const monthlyData = ref([]);

// 显示指引帮助
const showGuideHelp = () => {
  ElMessage({
    message: '结算流程指引：平台每月自动结算上月收入，您需要确认账单后选择支付方式，平台将在次月进行打款。',
    type: 'info',
    duration: 5000
  });
};

// 切换年份
const changeYear = (command) => {
  // 这里可以根据选择的年份获取对应的数据
};

// 按日期筛选
const filterByDate = (dates) => {
  if (dates) {
    // 这里实现日期筛选逻辑
  }
};

// 导出月报表
const exportMonthReport = (month) => {
  ElMessage.success(`${month.month}月份账单已确认`);
};

// 查看月度详情
const viewMonthDetail = (month) => {
  router.push(`/reports/${currentYear.value}/${month.month}`);
};

onMounted(() => {
  // 在这里可以从API获取数据
});
</script>

<style scoped>
/* Martin Garrix Inspired Light Theme */
.garrix-light-theme {
  background-color: #ffffff;
  color: #000000;
  padding: 40px;
  min-height: 100vh;
  font-family: 'Helvetica Neue', Arial, sans-serif;
  letter-spacing: 0.02em;
}

.report-container {
  max-width: 1400px;
  margin: 0 auto;
}

.report-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 40px;
  border-bottom: 1px solid #e0e0e0;
  padding-bottom: 20px;
}

.report-header h1 {
  font-size: 32px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0;
}

.report-actions {
  display: flex;
  gap: 15px;
}

.action-btn, .action-btn-secondary {
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

.action-btn:hover, .action-btn-secondary:hover {
  background-color: #000000;
  color: #ffffff;
}

.action-btn-secondary {
  background-color: #f0f0f0;
  border-color: #f0f0f0;
}

.action-btn-secondary:hover {
  background-color: #000000;
  color: #ffffff;
  border-color: #000000;
}

/* 统计卡片样式 */
.report-summary-cards {
  margin-bottom: 50px;
}

.summary-card {
  background-color: #ffffff;
  border: 1px solid #000000;
  padding: 20px;
  max-width: 300px;
  box-shadow: none;
  border-radius: 0;
}

.primary-card {
  border-left: 3px solid #000000;
}

.card-title {
  font-size: 14px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 15px;
  color: #666;
}

.card-amount {
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 15px;
}

.card-detail {
  font-size: 12px;
  color: #999;
}

/* 流程指引样式 */
.process-guide {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #ffffff;
  border: 1px solid #e0e0e0;
  padding: 25px;
  margin-bottom: 40px;
  position: relative;
}

.step {
  display: flex;
  align-items: center;
  gap: 15px;
  flex: 1;
  position: relative;
}

.step:not(:last-child)::after {
  content: '';
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 30px;
  height: 1px;
  background-color: #e0e0e0;
}

.active-step:not(:last-child)::after {
  background-color: #000000;
}

.step-number {
  width: 30px;
  height: 30px;
  border: 1px solid #000000;
  color: #000000;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 14px;
  border-radius: 50%;
  transition: all 0.3s ease;
}

.active-step .step-number {
  background-color: #000000;
  color: #ffffff;
  border-color: #000000;
}

.step-desc {
  font-size: 14px;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.active-step .step-desc {
  color: #000000;
  font-weight: 600;
}

.guide-help {
  position: absolute;
  right: 25px;
  top: 50%;
  transform: translateY(-50%);
  color: #000000;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.guide-help:hover {
  opacity: 0.7;
}

/* 子标签页样式 */
.sub-tabs-container {
  margin-bottom: 30px;
}

.sub-tabs :deep(.el-tabs__item) {
  color: #666;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 0 20px;
}

.sub-tabs :deep(.el-tabs__item.is-active) {
  color: #000000;
}

.sub-tabs :deep(.el-tabs__active-bar) {
  background-color: #000000;
}
.sub-tabs :deep(.el-tabs__nav-wrap::after) {
  background-color: #e0e0e0;
}

/* 年度选择器样式 */
.year-selector {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.year-label {
  font-size: 24px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.year-dropdown {
  color: #000000;
  cursor: pointer;
}

.el-dropdown-link {
  color: #000000;
  font-size: 14px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* 月度提示信息样式 */
.month-info-alert {
  margin-bottom: 30px;
}
.month-info-alert :deep(.el-alert) {
  background-color: #f0f0f0;
  border-radius: 0;
  border: 1px solid #e0e0e0;
}
.month-info-alert :deep(.el-alert__title),
.month-info-alert :deep(.el-alert__icon) {
  color: #000 !important;
}

/* 月度报表列表样式 */
.monthly-reports {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.monthly-report-item {
  border: 1px solid #e0e0e0;
  background-color: #ffffff;
  padding: 20px;
}

.month-info {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 20px;
}

.month-name {
  font-size: 22px;
  font-weight: 700;
  width: 40px;
  text-transform: uppercase;
}

.month-amount {
  font-size: 24px;
  font-weight: 700;
  color: #000000;
  flex: 1;
}

.tax-info {
  font-size: 12px;
  color: #999;
  display: flex;
  align-items: center;
  gap: 5px;
}

.month-details {
  display: flex;
  align-items: center;
}

.month-contracts, .month-songs {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 5px;
  color: #666;
  font-size: 14px;
}

.month-contracts i, .month-songs i {
  cursor: pointer;
  color: #ccc;
}

.month-actions {
  display: flex;
  gap: 10px;
}

/* 空状态样式 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 60px 20px;
  background-color: #fafafa;
  border: 1px dashed #cccccc;
}

.empty-icon {
  font-size: 50px;
  color: #cccccc;
  margin-bottom: 20px;
}

.empty-text {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 10px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.empty-subtext {
  font-size: 14px;
  color: #999;
  max-width: 400px;
  margin-bottom: 25px;
}

.empty-popover {
  color: #999;
  text-align: center;
  padding: 20px 0;
}

/* 弹出框样式 */
.contracts-popover h4, .songs-popover h4 {
  margin-top: 0;
  margin-bottom: 15px;
  font-size: 16px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* 响应式布局 */
@media (max-width: 768px) {
  .garrix-light-theme {
    padding: 20px;
  }
  
  .summary-card {
    max-width: none;
  }
  
  .report-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 15px;
  }
  
  .process-guide {
    flex-direction: column;
    gap: 20px;
    padding: 20px;
  }
  
  .step {
    width: 100%;
  }
  
  .step:not(:last-child)::after {
    display: none;
  }
  
  .month-details {
    flex-direction: column;
    align-items: flex-start;
    gap: 15px;
  }
  
  .month-actions {
    width: 100%;
    justify-content: flex-end;
    margin-top: 10px;
  }
}
</style> 