# 服务模块文档

## 概述

为了解决 AdminWorkbench.vue 代码过多的问题，我们将图表和发行趋势相关的逻辑提取到了独立的服务模块中。

## 模块结构

### 1. chartService.js - 图表服务模块

负责处理所有图表相关的操作：

- **ChartService 类**: 管理图表实例的创建、更新和销毁
- **ChartDataProcessor 类**: 提供数据处理工具方法

#### 主要功能

```javascript
import { chartService } from '@/services/chartService'

// 初始化折线图
chartService.initLineChart(canvas, data, labels, options)

// 初始化环形图
chartService.initDonutChart(canvas, percentage, options)

// 初始化迷你图表
chartService.initMiniChart(canvas, data)

// 更新图表数据
chartService.updateChart(chartId, newData, newLabels)

// 销毁图表
chartService.destroyChart(chartId)
chartService.destroyAllCharts()
```

### 2. releaseTrendService.js - 发行趋势服务模块

专门处理发行趋势数据的计算和分析：

#### 主要功能

```javascript
import { releaseTrendService } from '@/services/releaseTrendService'

// 获取发行趋势数据
const trendData = await releaseTrendService.getReleaseTrend({
  days: 30,
  status: 'approved'
})

// 获取本周/本月趋势
const weeklyTrend = await releaseTrendService.getWeeklyTrend()
const monthlyTrend = await releaseTrendService.getMonthlyTrend()

// 获取趋势分析报告
const analysis = await releaseTrendService.getTrendAnalysis(30)
```

#### 数据格式

发行趋势数据返回格式：

```javascript
{
  summary: {
    totalReleased: 150,        // 总发行量
    averageDaily: 5.0,         // 日均发行量
    maxDaily: 12,              // 单日最高
    minDaily: 0,               // 单日最低
    deliveryRate: 85,          // 投递率
    trend: 'up'                // 趋势方向: 'up', 'down', 'stable'
  },
  chartData: {
    data: [2, 5, 3, 8, 6, 4, 7],     // 图表数据
    labels: ['1', '2', '3', '4', '5', '6', '7']  // 日期标签
  },
  dailyStats: [...]            // 详细的每日统计
}
```

## 使用方式

### 在 AdminWorkbench.vue 中

```javascript
import { chartService } from '@/services/chartService'
import { releaseTrendService } from '@/services/releaseTrendService'

export default {
  async mounted() {
    // 获取发行趋势数据
    const trendData = await releaseTrendService.getMonthlyTrend()
    this.releaseTrendData = trendData
    
    // 初始化图表
    this.initCharts()
  },
  
  beforeUnmount() {
    // 清理图表
    chartService.destroyAllCharts()
  },
  
  methods: {
    initLineChart() {
      chartService.initLineChart(
        this.$refs.lineChart,
        this.releaseTrendData.chartData.data,
        this.releaseTrendData.chartData.labels
      )
    }
  }
}
```

### 在 AdminStatusBar.vue 中

```javascript
import { releaseTrendService } from '@/services/releaseTrendService'
import { chartService } from '@/services/chartService'

// 获取一周的发行趋势数据
const trendData = await releaseTrendService.getWeeklyTrend()
materialTrendData.value = trendData.chartData.data

// 初始化迷你图表
chartService.initMiniChart(miniChart.value, materialTrendData.value)
```

## 核心改进

### 1. 数据逻辑修正

- **之前**: 按 `releaseDate` 筛选所有专辑
- **现在**: 只统计 `materialDelivered: true` 且 `releaseDate <= today` 的专辑
- **结果**: 真正反映已投递且过了发行日期的专辑数量

### 2. 代码模块化

- **之前**: 所有图表逻辑都在组件中，代码冗长
- **现在**: 提取到独立服务模块，组件代码简洁
- **结果**: 更好的可维护性和复用性

### 3. 缓存机制

- 发行趋势服务内置5分钟缓存
- 避免频繁API调用
- 提升用户体验

### 4. 错误处理

- 服务层统一错误处理
- 提供降级数据
- 保证界面稳定性

## 注意事项

1. **图表ID**: 确保每个图表都有唯一的ID，便于管理
2. **内存清理**: 组件销毁时记得调用 `chartService.destroyAllCharts()`
3. **缓存管理**: 可以通过 `releaseTrendService.clearCache()` 清除缓存
4. **错误监控**: 服务层会输出详细的错误日志，便于调试

## 扩展性

这个模块化设计为未来扩展提供了良好的基础：

- 可以轻松添加新的图表类型
- 可以扩展更多的趋势分析功能
- 可以在其他组件中复用这些服务
- 便于单元测试和维护
