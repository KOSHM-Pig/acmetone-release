/**
 * 发行趋势服务模块
 * 专门处理发行趋势数据的计算和分析
 */

import { adminWorkbenchApi } from '@/api/adminWorkbench'
import { ChartDataProcessor } from './chartService'

/**
 * 发行趋势服务类
 */
export class ReleaseTrendService {
  constructor() {
    this.cache = new Map() // 数据缓存
    this.cacheExpireTime = 5 * 60 * 1000 // 5分钟缓存过期
  }

  /**
   * 获取发行趋势数据
   * @param {Object} options - 查询选项
   * @param {number} options.days - 天数，默认30天
   * @param {string} options.status - 状态筛选
   * @param {boolean} options.useCache - 是否使用缓存
   */
  async getReleaseTrend(options = {}) {
    const { days = 30, status = 'approved', useCache = true } = options
    const cacheKey = `release_trend_${days}_${status}`

    // 检查缓存
    if (useCache && this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey).data
    }

    try {
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - (days - 1))

      const response = await adminWorkbenchApi.getMaterialStats({
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        status: status
      })

      if (response && response.success && response.data) {
        const processedData = this.processReleaseTrendData(response.data, days)
        
        // 缓存数据
        this.cache.set(cacheKey, {
          data: processedData,
          timestamp: Date.now()
        })

        return processedData
      } else {
        throw new Error('获取发行趋势数据失败')
      }
    } catch (error) {
      console.error('获取发行趋势数据失败:', error)
      // 返回模拟数据作为降级方案
      return this.generateFallbackData(days)
    }
  }

  /**
   * 处理发行趋势数据
   * @param {Object} rawData - 原始数据
   * @param {number} days - 天数
   */
  processReleaseTrendData(rawData, days) {
    const { summary, dailyStats } = rawData
    
    // 处理每日数据
    const { data: dailyReleases, labels: dateLabels } = ChartDataProcessor.processDateRangeData(dailyStats, days)
    
    // 计算统计信息
    const totalReleased = dailyReleases.reduce((sum, count) => sum + count, 0)
    const averageDaily = totalReleased / days
    const maxDaily = Math.max(...dailyReleases)
    const minDaily = Math.min(...dailyReleases)

    // 计算趋势
    const trend = this.calculateTrend(dailyReleases)

    return {
      summary: {
        totalReleased,
        averageDaily: Math.round(averageDaily * 10) / 10,
        maxDaily,
        minDaily,
        deliveryRate: summary.deliveryRate || 0,
        trend: trend
      },
      chartData: {
        data: dailyReleases,
        labels: dateLabels
      },
      dailyStats: dailyStats || []
    }
  }

  /**
   * 计算趋势方向
   * @param {Array} data - 数据数组
   */
  calculateTrend(data) {
    if (data.length < 2) return 'stable'

    const firstHalf = data.slice(0, Math.floor(data.length / 2))
    const secondHalf = data.slice(Math.floor(data.length / 2))

    const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length
    const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length

    const difference = secondAvg - firstAvg
    const threshold = firstAvg * 0.1 // 10% 阈值

    if (difference > threshold) return 'up'
    if (difference < -threshold) return 'down'
    return 'stable'
  }

  /**
   * 获取本周发行趋势
   */
  async getWeeklyTrend() {
    return this.getReleaseTrend({ days: 7 })
  }

  /**
   * 获取本月发行趋势
   */
  async getMonthlyTrend() {
    return this.getReleaseTrend({ days: 30 })
  }

  /**
   * 获取发行日历数据
   * @param {Object} options - 查询选项
   */
  async getReleaseCalendar(options = {}) {
    const { year = new Date().getFullYear(), month = null } = options
    
    try {
      const response = await adminWorkbenchApi.getCalendarData({
        year,
        month,
        status: 'approved'
      })

      if (response && response.success && response.data) {
        return this.processCalendarData(response.data)
      }
    } catch (error) {
      console.error('获取发行日历数据失败:', error)
    }

    return { albums: [], events: [] }
  }

  /**
   * 处理日历数据
   * @param {Object} rawData - 原始日历数据
   */
  processCalendarData(rawData) {
    const { albums = [] } = rawData
    const events = []

    // 按日期分组
    const groupedByDate = albums.reduce((acc, album) => {
      if (!album.releaseDate) return acc
      
      const date = new Date(album.releaseDate).toISOString().split('T')[0]
      if (!acc[date]) acc[date] = []
      acc[date].push(album)
      return acc
    }, {})

    // 转换为事件格式
    Object.entries(groupedByDate).forEach(([date, albumList]) => {
      events.push({
        date,
        count: albumList.length,
        albums: albumList,
        type: 'release'
      })
    })

    return {
      albums,
      events: events.sort((a, b) => new Date(a.date) - new Date(b.date))
    }
  }

  /**
   * 生成降级数据
   * @param {number} days - 天数
   */
  generateFallbackData(days) {
    const data = ChartDataProcessor.generateTrendData(Math.floor(Math.random() * 20) + 5, days)
    const labels = []
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      labels.push(date.getDate().toString())
    }

    const totalReleased = data.reduce((sum, count) => sum + count, 0)

    return {
      summary: {
        totalReleased,
        averageDaily: Math.round((totalReleased / days) * 10) / 10,
        maxDaily: Math.max(...data),
        minDaily: Math.min(...data),
        deliveryRate: 0,
        trend: 'stable'
      },
      chartData: { data, labels },
      dailyStats: []
    }
  }

  /**
   * 检查缓存是否有效
   * @param {string} key - 缓存键
   */
  isCacheValid(key) {
    const cached = this.cache.get(key)
    if (!cached) return false
    return Date.now() - cached.timestamp < this.cacheExpireTime
  }

  /**
   * 清除缓存
   * @param {string} key - 缓存键，不传则清除所有
   */
  clearCache(key = null) {
    if (key) {
      this.cache.delete(key)
    } else {
      this.cache.clear()
    }
  }

  /**
   * 获取趋势分析报告
   * @param {number} days - 分析天数
   */
  async getTrendAnalysis(days = 30) {
    const trendData = await this.getReleaseTrend({ days })
    const { summary, chartData } = trendData

    return {
      ...summary,
      analysis: {
        trendDirection: summary.trend,
        isActive: summary.averageDaily > 1,
        peakDay: this.findPeakDay(chartData.data, chartData.labels),
        recommendation: this.generateRecommendation(summary)
      }
    }
  }

  /**
   * 找到峰值日期
   * @param {Array} data - 数据数组
   * @param {Array} labels - 标签数组
   */
  findPeakDay(data, labels) {
    const maxValue = Math.max(...data)
    const maxIndex = data.indexOf(maxValue)
    return {
      value: maxValue,
      label: labels[maxIndex],
      index: maxIndex
    }
  }

  /**
   * 生成建议
   * @param {Object} summary - 摘要数据
   */
  generateRecommendation(summary) {
    const { trend, averageDaily, deliveryRate } = summary

    if (trend === 'up' && averageDaily > 2) {
      return '发行趋势良好，建议保持当前节奏'
    } else if (trend === 'down') {
      return '发行量有所下降，建议关注物料投递效率'
    } else if (deliveryRate < 80) {
      return '物料投递率偏低，建议优化投递流程'
    } else {
      return '发行状态稳定，可考虑适当增加发行量'
    }
  }
}

// 创建单例实例
export const releaseTrendService = new ReleaseTrendService()

// 默认导出
export default {
  ReleaseTrendService,
  releaseTrendService
}
