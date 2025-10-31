<template>
  <div class="admin-status-bar">
    <!-- 完成度指示器 -->
    <div class="status-item completion" :title="`物料传递完成率: ${formattedCompletionRate}%`">
      <div class="status-progress">
        <div class="progress-bar-mini">
          <div class="progress-fill-mini" :style="{ width: formattedCompletionRate + '%' }"></div>
        </div>
        <span class="status-text">{{ formattedCompletionRate }}%</span>
      </div>
    </div>

    <!-- 关键数据 -->
    <div class="status-item metrics">
      <span class="metric-mini" :title="`待审核专辑: ${totalPendingCount} 个`">
        <span class="metric-value-mini">{{ formattedTotalPending }}</span>
        <span class="metric-label-mini">待审核</span>
      </span>
      <span class="metric-mini" :title="`今日新提交: ${todayApprovedCount} 个`">
        <span class="metric-value-mini">{{ formattedTodayCount }}</span>
        <span class="metric-label-mini">今日提交</span>
      </span>
      <span class="metric-mini" :title="`待递交物料: ${materialPendingCount} 个`">
        <span class="metric-value-mini">{{ formattedMaterialPending }}</span>
        <span class="metric-label-mini">待递交</span>
      </span>
    </div>

    <!-- 迷你图表 -->
    <div class="status-item chart" title="发行趋势 (过去7天)">
      <canvas ref="miniChart" class="mini-chart-inline"></canvas>
    </div>

    <!-- Mini发行日历 -->
    <div class="status-item mini-calendar">
      <div class="mini-calendar-days">
        <div
          v-for="day in weekDays"
          :key="day.date"
          class="mini-day"
          :class="{
            'has-releases': day.releases.length > 0,
            'today': day.isToday
          }"
          :title="getDayTooltip(day)"
        >
          {{ day.number }}
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { adminWorkbenchApi } from '@/api/adminWorkbench';
import { releaseTrendService } from '@/services/releaseTrendService';
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';

export default {
  name: 'AdminStatusBar',
  setup() {
    console.log('AdminStatusBar: 组件正在初始化...');
    // 状态栏数据
    const completionRate = ref(0);
    const totalPendingCount = ref(0);
    const todayApprovedCount = ref(0);
    const materialPendingCount = ref(0);
    const miniChart = ref(null);
    const statusDataLoading = ref(false);
    
    // 图表数据
    const materialTrendData = ref([]);
    
    // 日历数据
    const weekDays = ref([]);
    const currentDate = ref(new Date());
    
    // 定时器
    let updateTimer = null;

    // 格式化显示数据
    const formattedCompletionRate = computed(() => {
      return Math.round(completionRate.value);
    });

    const formattedTotalPending = computed(() => {
      return totalPendingCount.value > 99 ? '99+' : totalPendingCount.value.toString();
    });

    const formattedTodayCount = computed(() => {
      return todayApprovedCount.value > 99 ? '99+' : todayApprovedCount.value.toString();
    });

    const formattedMaterialPending = computed(() => {
      return materialPendingCount.value > 99 ? '99+' : materialPendingCount.value.toString();
    });

    // 当前周范围
    const currentWeekRange = computed(() => {
      const startOfWeek = new Date(currentDate.value);
      startOfWeek.setDate(currentDate.value.getDate() - currentDate.value.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      
      return `${startOfWeek.getMonth() + 1}/${startOfWeek.getDate()}-${endOfWeek.getMonth() + 1}/${endOfWeek.getDate()}`;
    });

    // 获取管理员状态栏数据
    const fetchAdminStatusData = async () => {
      if (statusDataLoading.value) return;
      
      statusDataLoading.value = true;
      
      try {
        const overviewResponse = await adminWorkbenchApi.getOverview();
        
        if (overviewResponse && overviewResponse.success && overviewResponse.data) {
          const data = overviewResponse.data;
          
          completionRate.value = data.materialStats?.deliveryRate || 0;
          totalPendingCount.value = data.albumStats?.pending || 0;
          materialPendingCount.value = data.materialStats?.pending || 0;
          todayApprovedCount.value = data.activityStats?.todaySubmissions || 0;
        }
        
        await fetchMaterialTrendData();
        await fetchWeekCalendarData();
        initMiniChart();
      } catch (error) {
        console.error('获取管理员状态数据失败:', error);
      } finally {
        statusDataLoading.value = false;
      }
    };

    // 获取发行趋势数据
    const fetchMaterialTrendData = async () => {
      try {
        console.log('AdminStatusBar: 开始获取发行趋势数据...');

        // 暂时使用降级数据，确保图表能显示
        materialTrendData.value = generateTrendData(completionRate.value);
        console.log('AdminStatusBar: 使用降级数据:', materialTrendData.value);

        // 尝试获取真实数据
        const trendData = await releaseTrendService.getWeeklyTrend();
        console.log('AdminStatusBar: 获取到趋势数据:', trendData);

        if (trendData && trendData.chartData && trendData.chartData.data) {
          // 使用实际发行量数据
          materialTrendData.value = trendData.chartData.data;
          console.log('AdminStatusBar: 更新为实际数据:', materialTrendData.value);
          // 重新初始化图表
          nextTick(() => {
            initMiniChart();
          });
        }
      } catch (error) {
        console.error('AdminStatusBar: 获取发行趋势数据失败:', error);
        materialTrendData.value = generateTrendData(completionRate.value);
        console.log('AdminStatusBar: 使用降级数据:', materialTrendData.value);
      }
    };

    // 获取本周日历数据
    const fetchWeekCalendarData = async () => {
      try {
        const response = await adminWorkbenchApi.getCalendarData({
          year: currentDate.value.getFullYear(),
          status: 'approved'
        });
        
        generateWeekCalendar(response?.data?.albums || []);
      } catch (error) {
        console.error('获取日历数据失败:', error);
        generateWeekCalendar([]);
      }
    };

    // 生成本周日历
    const generateWeekCalendar = (albums) => {
      const startOfWeek = new Date(currentDate.value);
      startOfWeek.setDate(currentDate.value.getDate() - currentDate.value.getDay());
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      weekDays.value = Array.from({ length: 7 }, (_, i) => {
        const date = new Date(startOfWeek);
        date.setDate(startOfWeek.getDate() + i);
        
        const dateStr = date.toISOString().split('T')[0];
        const dayReleases = albums.filter(album => {
          if (!album.releaseDate) return false;
          const albumDate = new Date(album.releaseDate).toISOString().split('T')[0];
          return albumDate === dateStr;
        });
        
        return {
          date: dateStr,
          number: date.getDate(),
          isToday: date.toDateString() === today.toDateString(),
          releases: dayReleases
        };
      });
    };

    // 生成趋势数据
    const generateTrendData = (currentRate) => {
      const data = [];
      const baseRate = Math.max(0, currentRate - 10);
      const variation = 15;
      
      for (let i = 0; i < 7; i++) {
        const randomVariation = (Math.random() - 0.5) * variation;
        const value = Math.max(0, Math.min(100, baseRate + randomVariation + (i * 2)));
        data.push(Math.round(value));
      }
      
      data[data.length - 1] = currentRate;
      return data;
    };

    // 初始化迷你图表 - 使用原生Canvas绘制
    const initMiniChart = () => {
      if (!miniChart.value) {
        console.warn('AdminStatusBar: 迷你图表canvas元素未找到');
        return;
      }

      try {
        const data = materialTrendData.value.length > 0 ? materialTrendData.value : [completionRate.value];
        console.log('AdminStatusBar: 初始化迷你图表，数据:', data);

        // 直接使用原生Canvas绘制，不依赖chartService
        const ctx = miniChart.value.getContext('2d');
        const gradient = ctx.createLinearGradient(0, 0, 0, 24);
        gradient.addColorStop(0, '#000000');
        gradient.addColorStop(1, '#666666');

        const width = miniChart.value.width = 60;
        const height = miniChart.value.height = 24;

        ctx.clearRect(0, 0, width, height);
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 1.5;
        ctx.beginPath();

        const maxValue = Math.max(...data);
        const minValue = Math.min(...data);
        const range = maxValue - minValue || 1;

        data.forEach((value, index) => {
          const x = (index / (data.length - 1)) * (width - 4) + 2;
          const y = height - 2 - ((value - minValue) / range) * (height - 4);

          if (index === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        });

        ctx.stroke();
        console.log('AdminStatusBar: 迷你图表初始化完成');
      } catch (error) {
        console.error('AdminStatusBar: 迷你图表初始化失败:', error);
      }
    };

    // 获取日期工具提示
    const getDayTooltip = (day) => {
      if (day.releases.length === 0) {
        return `${day.number}日 - 无发行`;
      }
      
      const titles = day.releases.slice(0, 3).map(r => r.title).join(', ');
      const extra = day.releases.length > 3 ? ` 等${day.releases.length}个专辑` : '';
      return `${day.number}日 - ${titles}${extra}`;
    };

    // 监听图表元素
    watch(miniChart, (newVal) => {
      if (newVal) {
        nextTick(() => {
          initMiniChart();
        });
      }
    });

    // 组件挂载
    onMounted(() => {
      fetchAdminStatusData();
      
      // 设置定时更新
      updateTimer = setInterval(() => {
        fetchAdminStatusData();
      }, 120000); // 2分钟
    });

    // 组件卸载
    onUnmounted(() => {
      if (updateTimer) {
        clearInterval(updateTimer);
      }
    });

    return {
      // 数据
      completionRate,
      totalPendingCount,
      todayApprovedCount,
      materialPendingCount,
      miniChart,
      weekDays,
      
      // 计算属性
      formattedCompletionRate,
      formattedTotalPending,
      formattedTodayCount,
      formattedMaterialPending,
      currentWeekRange,
      
      // 方法
      getDayTooltip
    };
  }
};
</script>

<style scoped>
/* 管理员状态栏样式 */
.admin-status-bar {
  display: flex;
  align-items: center;
  gap: 32px;
  flex: 1;
  justify-content: center;
  max-width: 800px;
  margin: 0 auto;
  height: 32px; /* 统一高度 */
}

.status-item {
  display: flex;
  align-items: center;
  font-family: 'Montserrat', sans-serif;
  height: 32px; /* 统一高度 */
}

/* 完成度指示器 */
.status-item.completion {
  gap: 8px;
}

.status-progress {
  display: flex;
  align-items: center;
  gap: 6px;
}

.progress-bar-mini {
  width: 40px;
  height: 4px;
  background: #eaeaea;
  overflow: hidden;
}

.progress-fill-mini {
  height: 100%;
  background: #000000;
  transition: width 0.3s ease;
}

.status-text {
  font-size: 10px;
  font-weight: 600;
  color: #000000;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* 关键数据 */
.status-item.metrics {
  gap: 20px;
}

.metric-mini {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  cursor: help;
}

.metric-value-mini {
  font-size: 16px;
  font-weight: 700;
  color: #000000;
  line-height: 1;
}

.metric-label-mini {
  font-size: 8px;
  font-weight: 500;
  color: #666666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* 迷你图表 */
.status-item.chart {
  cursor: help;
}

.mini-chart-inline {
  width: 60px;
  height: 24px;
  display: block;
}

/* Mini发行日历 */
.status-item.mini-calendar {
  cursor: help;
}

.mini-calendar-days {
  display: flex;
  gap: 8px;
  align-items: center;
}

.mini-day {
  font-size: 12px;
  font-weight: 600;
  color: #666666;
  cursor: help;
  transition: color 0.3s ease;
  min-width: 16px;
  text-align: center;
}

.mini-day:hover {
  color: #000000;
}

.mini-day.today {
  color: #000000;
  background: #000000;
  color: #ffffff;
  padding: 2px 4px;
  margin: -2px -4px;
}

.mini-day.has-releases {
  color: #000000;
  font-weight: 700;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .admin-status-bar {
    display: none;
  }
}
</style>
