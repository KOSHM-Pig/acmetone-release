/**
 * 图表服务模块
 * 处理所有图表相关的数据获取、处理和渲染逻辑
 */

import Chart from 'chart.js/auto'

/**
 * 图表服务类
 */
export class ChartService {
  constructor() {
    this.charts = new Map() // 存储图表实例
  }

  /**
   * 初始化折线图
   * @param {HTMLCanvasElement} canvas - 画布元素
   * @param {Array} data - 数据数组
   * @param {Array} labels - 标签数组
   * @param {Object} options - 配置选项
   */
  initLineChart(canvas, data = [], labels = [], options = {}) {
    if (!canvas) {
      console.warn('chartService: canvas元素为空')
      return null
    }

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      console.warn('chartService: 无法获取canvas上下文')
      return null
    }

    // 销毁已存在的图表
    this.destroyChart(canvas.id)

    // 确保数据格式正确
    const safeData = Array.isArray(data) ? data : []
    const safeLabels = Array.isArray(labels) ? labels : []

    console.log('chartService: 初始化折线图', { data: safeData, labels: safeLabels, canvasId: canvas.id })

    const defaultOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false // 确保图例不显示
        },
        tooltip: {
          enabled: true,
          displayColors: false // 不显示颜色框
        }
      },
      scales: {
        x: { display: false },
        y: { display: false }
      },
      elements: {
        point: { radius: 0 }
      },
      interaction: {
        intersect: false,
        mode: 'index'
      }
    }

    const chartConfig = {
      type: 'line',
      data: {
        labels: safeLabels,
        datasets: [{
          label: '发行量', // 添加数据集标签
          data: safeData,
          borderColor: '#4F9EFF',
          backgroundColor: 'rgba(79, 158, 255, 0.1)',
          fill: true,
          tension: 0.4,
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 4
        }]
      },
      options: { ...defaultOptions, ...options }
    }

    try {
      if (typeof Chart === 'undefined') {
        console.error('chartService: Chart.js未正确加载')
        return null
      }

      const chart = new Chart(ctx, chartConfig)
      this.charts.set(canvas.id, chart)
      console.log('chartService: 折线图创建成功', canvas.id)
      return chart
    } catch (error) {
      console.error('chartService: 折线图初始化失败:', error)
      return null
    }
  }

  /**
   * 初始化环形图
   * @param {HTMLCanvasElement} canvas - 画布元素
   * @param {number} percentage - 百分比值
   * @param {Object} options - 配置选项
   */
  initDonutChart(canvas, percentage = 0, options = {}) {
    if (!canvas) return null

    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    // 销毁已存在的图表
    this.destroyChart(canvas.id)

    const defaultOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false }
      }
    }

    const chartConfig = {
      type: 'doughnut',
      data: {
        datasets: [{
          data: [percentage, 100 - percentage],
          backgroundColor: ['#FF69B4', '#E5E5E5'],
          borderWidth: 0,
          cutout: '80%'
        }]
      },
      options: { ...defaultOptions, ...options }
    }

    try {
      const chart = new Chart(ctx, chartConfig)
      this.charts.set(canvas.id, chart)
      return chart
    } catch (error) {
      console.warn('环形图初始化失败:', error)
      return null
    }
  }

  /**
   * 初始化迷你图表
   * @param {HTMLCanvasElement} canvas - 画布元素
   * @param {Array} data - 数据数组
   */
  initMiniChart(canvas, data = []) {
    if (!canvas || !data.length) return

    const ctx = canvas.getContext('2d')
    const gradient = ctx.createLinearGradient(0, 0, 0, 24)
    gradient.addColorStop(0, '#000000')
    gradient.addColorStop(1, '#666666')

    const width = canvas.width = 60
    const height = canvas.height = 24
    
    ctx.clearRect(0, 0, width, height)
    ctx.strokeStyle = gradient
    ctx.lineWidth = 1.5
    ctx.beginPath()

    const maxValue = Math.max(...data)
    const minValue = Math.min(...data)
    const range = maxValue - minValue || 1

    data.forEach((value, index) => {
      const x = (index / (data.length - 1)) * (width - 4) + 2
      const y = height - 2 - ((value - minValue) / range) * (height - 4)
      
      if (index === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    })

    ctx.stroke()
  }

  /**
   * 更新图表数据
   * @param {string} chartId - 图表ID
   * @param {Array} data - 新数据
   * @param {Array} labels - 新标签（可选）
   */
  updateChart(chartId, data, labels = null) {
    const chart = this.charts.get(chartId)
    if (!chart) return

    chart.data.datasets[0].data = data
    if (labels) {
      chart.data.labels = labels
    }
    chart.update()
  }

  /**
   * 销毁图表
   * @param {string} chartId - 图表ID
   */
  destroyChart(chartId) {
    const chart = this.charts.get(chartId)
    if (chart) {
      chart.destroy()
      this.charts.delete(chartId)
    }
  }

  /**
   * 销毁所有图表
   */
  destroyAllCharts() {
    this.charts.forEach(chart => chart.destroy())
    this.charts.clear()
  }

  /**
   * 获取图表实例
   * @param {string} chartId - 图表ID
   */
  getChart(chartId) {
    return this.charts.get(chartId)
  }
}

/**
 * 数据处理工具类
 */
export class ChartDataProcessor {
  /**
   * 生成趋势数据
   * @param {number} currentRate - 当前比率
   * @param {number} days - 天数
   */
  static generateTrendData(currentRate, days = 7) {
    const data = []
    const baseRate = Math.max(0, currentRate - 10)
    const variation = 15
    
    for (let i = 0; i < days; i++) {
      const randomVariation = (Math.random() - 0.5) * variation
      const value = Math.max(0, Math.min(100, baseRate + randomVariation + (i * 2)))
      data.push(Math.round(value))
    }
    
    data[data.length - 1] = currentRate
    return data
  }

  /**
   * 处理日期范围数据
   * @param {Array} dailyStats - 每日统计数据
   * @param {number} days - 天数
   */
  static processDateRangeData(dailyStats, days = 30) {
    const result = []
    const labels = []
    const today = new Date()
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      
      const stat = dailyStats.find(s => s.date === dateStr)
      result.push(stat ? stat.released || stat.total || 0 : 0)
      labels.push(date.getDate().toString())
    }
    
    return { data: result, labels }
  }

  /**
   * 计算完成率
   * @param {number} completed - 已完成数量
   * @param {number} total - 总数量
   */
  static calculateCompletionRate(completed, total) {
    return total > 0 ? Math.round((completed / total) * 100) : 0
  }
}

// 创建单例实例
export const chartService = new ChartService()

// 默认导出
export default {
  ChartService,
  ChartDataProcessor,
  chartService
}
