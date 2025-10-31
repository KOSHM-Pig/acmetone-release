<template>
  <div class="album-calendar" :class="calendarClass">
    <!-- 日历头部 -->
    <div class="calendar-header" v-if="showHeader">
      <button
        class="nav-btn prev-btn"
        @click="previousMonth"
        :disabled="!allowNavigation"
        title="上个月"
        v-if="showNavigation"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="15,18 9,12 15,6"></polyline>
        </svg>
      </button>
      <h2 class="month-title">{{ currentMonthYear }}</h2>
      <button
        class="nav-btn next-btn"
        @click="nextMonth"
        :disabled="!allowNavigation"
        title="下个月"
        v-if="showNavigation"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="9,18 15,12 9,6"></polyline>
        </svg>
      </button>
    </div>

    <!-- 日历容器 -->
    <div class="calendar-container">
      <!-- 状态图例 -->
      <div class="status-legend" v-if="albums.length > 0">
        <div class="legend-title">状态图例：</div>
        <div class="legend-items">
          <div class="legend-item">
            <div class="legend-dot status-draft"></div>
            <span class="legend-label">草稿</span>
          </div>
          <div class="legend-item">
            <div class="legend-dot status-pending"></div>
            <span class="legend-label">待审核</span>
          </div>
          <div class="legend-item">
            <div class="legend-dot status-approved"></div>
            <span class="legend-label">已通过</span>
          </div>
          <div class="legend-item">
            <div class="legend-dot status-rejected"></div>
            <span class="legend-label">已拒绝</span>
          </div>
          <div class="legend-item">
            <div class="legend-dot status-released"></div>
            <span class="legend-label">已发行</span>
          </div>
        </div>
      </div>

      <!-- 星期标题 -->
      <div class="weekdays-header" v-if="showWeekdays" :style="weekdaysGridStyle">
        <div
          v-for="weekday in weekdays"
          :key="weekday"
          class="weekday-cell"
        >
          {{ weekday }}
        </div>
      </div>

      <!-- 日历网格 -->
      <div class="calendar-grid" :style="gridStyle">
      <div
        v-for="date in calendarDates"
        :key="`${date.year}-${date.month}-${date.day}`"
        class="date-cell"
        :class="getDateCellClass(date)"
        @click="selectDate(date)"
      >
        <!-- 如果有专辑，显示专辑封面；否则显示日期 -->
        <div v-if="date.hasReleases && date.albums.length > 0" class="album-cover-full">
          <!-- 单个专辑 -->
          <div v-if="date.albums.length === 1" class="single-album">
            <img
              :src="getAlbumCoverUrl(date.albums[0])"
              :alt="date.albums[0].name"
              class="cover-full"
              @click.stop="selectAlbum(date.albums[0])"
              @error="handleImageError($event, date.albums[0])"
              @load="handleImageLoad($event, date.albums[0])"
            />
          </div>

          <!-- 多个专辑分割显示 -->
          <div v-else class="multi-albums" :class="`albums-${Math.min(date.albums.length, 4)}`">
            <div
              v-for="(album, index) in date.albums.slice(0, 4)"
              :key="album.id"
              class="album-section"
              :class="`section-${index + 1}`"
              @click.stop="selectAlbum(album)"
            >
              <img
                :src="getAlbumCoverUrl(album)"
                :alt="album.name"
                class="cover-section"
                @error="handleImageError($event, album)"
                @load="handleImageLoad($event, album)"
              />
            </div>
            <!-- 状态指示器（替代原来的专辑数量指示器） -->
            <div class="status-indicator" v-if="date.albums.length > 0">
              <!-- 如果只有一个专辑，显示状态圆点 -->
              <div v-if="date.albums.length === 1"
                   :class="`status-badge single status-${getAlbumStatus(date.albums[0])}`"
                   :title="`${getStatusLabel(getAlbumStatus(date.albums[0]))}`">
              </div>
              <!-- 如果有多个专辑，显示数量和主要状态 -->
              <div v-else
                   :class="`status-badge multiple status-${getDatePrimaryStatus(date)}`"
                   :title="`${date.albums.length}个专辑 - 主要状态: ${getStatusLabel(getDatePrimaryStatus(date))}`">
                {{ date.albums.length }}
              </div>
            </div>
          </div>
        </div>

        <!-- 没有专辑时显示日期 -->
        <div v-else class="date-content">
          <div class="date-number">{{ date.day }}</div>
          <div class="date-weekday" v-if="date.isCurrentMonth && showDateLabels">
            {{ getDateLabel(date) }}
          </div>
        </div>
      </div>
    </div>


    </div>
  </div>
</template>

<script>
import { STATIC_BASE_URL } from '@/config'
import { ensureFullUrl } from '@/utils/urlHelper'

export default {
  name: 'AlbumCalendar',
  props: {
    // 专辑数据
    albums: {
      type: Array,
      default: () => []
    },
    // 当前选中日期
    selectedDate: {
      type: Date,
      default: () => new Date()
    },
    // 初始显示月份
    initialDate: {
      type: Date,
      default: () => new Date()
    },
    // 是否显示头部
    showHeader: {
      type: Boolean,
      default: true
    },
    // 是否显示导航按钮
    showNavigation: {
      type: Boolean,
      default: true
    },
    // 是否允许导航
    allowNavigation: {
      type: Boolean,
      default: true
    },
    // 是否显示星期标题
    showWeekdays: {
      type: Boolean,
      default: true
    },
    // 是否显示日期标签
    showDateLabels: {
      type: Boolean,
      default: true
    },
    // 是否显示专辑数量
    showAlbumCount: {
      type: Boolean,
      default: true
    },
    // 星期标签
    weekdays: {
      type: Array,
      default: () => ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
    },
    // 日期格子大小
    cellSize: {
      type: Number,
      default: 80
    },
    // 格子间距
    cellGap: {
      type: Number,
      default: 4
    },

    // 自定义样式类
    calendarClass: {
      type: String,
      default: ''
    },
    // 语言设置
    locale: {
      type: String,
      default: 'zh-CN'
    }
  },
  data() {
    return {
      currentDate: new Date(this.initialDate),
      windowWidth: window.innerWidth
    }
  },
  computed: {
    // 响应式单元格大小
    responsiveCellSize() {
      if (this.windowWidth <= 360) {
        return Math.round(45 * 0.9)  // 超小屏幕: 40px
      } else if (this.windowWidth <= 480) {
        return Math.round(50 * 0.9)  // 手机端: 45px
      } else if (this.windowWidth <= 768) {
        return Math.round(60 * 0.9)  // 平板端: 54px
      } else if (this.windowWidth <= 1024) {
        return Math.round(70 * 0.9)  // 小屏幕桌面: 63px
      } else if (this.windowWidth <= 1440) {
        return Math.round(80 * 0.9)  // 中等屏幕桌面: 72px
      } else if (this.windowWidth <= 1920) {
        return Math.round(90 * 0.9)  // 大屏幕桌面: 81px
      } else {
        return Math.min(Math.round(this.cellSize * 0.9), 90)  // 超大屏幕限制最大尺寸: 90px
      }
    },

    // 响应式间距
    responsiveCellGap() {
      if (this.windowWidth <= 360) {
        return 3 * 2  // 超小屏幕: 2px
      } else if (this.windowWidth <= 480) {
        return 3 * 2  // 手机端: 4px
      } else if (this.windowWidth <= 768) {
        return 3 * 2  // 平板端: 6px
      } else {
        return this.cellGap * 3  // 桌面端使用原始设置的2倍
      }
    },

    // 响应式断点检测
    isMobile() {
      return this.windowWidth <= 768
    },

    isTablet() {
      return this.windowWidth > 768 && this.windowWidth <= 1024
    },

    isDesktop() {
      return this.windowWidth > 1024
    },

    currentMonthYear() {
      return this.currentDate.toLocaleDateString(this.locale, {
        year: 'numeric',
        month: 'long'
      })
    },
    gridStyle() {
      const cellSize = this.responsiveCellSize
      const gap = this.responsiveCellGap

      return {
        gridTemplateColumns: `repeat(7, ${cellSize}px)`,
        gap: `${gap}px`,
        // 确保网格不会超出容器
        maxWidth: `${7 * cellSize + 6 * gap}px`
      }
    },
    weekdaysGridStyle() {
      const cellSize = this.responsiveCellSize
      const gap = this.responsiveCellGap

      return {
        gridTemplateColumns: `repeat(7, ${cellSize}px)`,
        gap: `${gap}px`,
        // 确保与日历网格对齐
        maxWidth: `${7 * cellSize + 6 * gap}px`
      }
    },
    calendarDates() {
      const dates = []
      const year = this.currentDate.getFullYear()
      const month = this.currentDate.getMonth()
      
      // 获取当月第一天和最后一天
      const firstDay = new Date(year, month, 1)
      const lastDay = new Date(year, month + 1, 0)
      
      // 获取第一周的开始日期（周一开始）
      const startDate = new Date(firstDay)
      const dayOfWeek = (firstDay.getDay() + 6) % 7 // 转换为周一开始
      startDate.setDate(firstDay.getDate() - dayOfWeek)
      
      // 生成42天的日期（6周 x 7天）
      for (let i = 0; i < 42; i++) {
        const date = new Date(startDate)
        date.setDate(startDate.getDate() + i)
        
        const dateObj = {
          date: date,
          day: date.getDate(),
          month: date.getMonth(),
          year: date.getFullYear(),
          isCurrentMonth: date.getMonth() === month,
          isToday: this.isToday(date),
          isSelected: this.isSelected(date),
          albums: this.getAlbumsForDate(date),
          hasReleases: false
        }
        
        dateObj.hasReleases = dateObj.albums.length > 0
        dates.push(dateObj)
      }
      
      return dates
    }
  },
  mounted() {
    window.addEventListener('resize', this.handleResize)
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.handleResize)
  },
  methods: {
    // 导航方法
    previousMonth() {
      if (!this.allowNavigation) return
      const newDate = new Date(this.currentDate)
      newDate.setMonth(newDate.getMonth() - 1)
      this.currentDate = newDate
      this.$emit('month-changed', newDate)
    },
    nextMonth() {
      if (!this.allowNavigation) return
      const newDate = new Date(this.currentDate)
      newDate.setMonth(newDate.getMonth() + 1)
      this.currentDate = newDate
      this.$emit('month-changed', newDate)
    },
    
    // 日期选择
    selectDate(date) {
      console.log('📅 AlbumCalendar: 日期被点击', date);
      console.log('📅 AlbumCalendar: 发送date-selected事件', date.date);
      this.$emit('date-selected', date.date)
    },
    selectAlbum(album) {
      console.log('🎵 AlbumCalendar: 专辑被点击', album);
      // 当选择专辑时，也需要选择对应的日期
      // 使用本地时间避免时区问题
      const releaseDate = album.releaseDate;
      let albumDate;

      if (releaseDate.includes('T')) {
        // ISO格式: '2025-08-01T00:00:00.000Z'
        albumDate = new Date(releaseDate.split('T')[0]);
      } else {
        // 简单格式: '2025-08-01'
        const [year, month, day] = releaseDate.split('-').map(Number);
        albumDate = new Date(year, month - 1, day); // month是0-based
      }

      console.log('📅 AlbumCalendar: 解析的日期', albumDate);
      console.log('📅 AlbumCalendar: 发送date-selected事件', albumDate);
      console.log('🎵 AlbumCalendar: 发送album-selected事件', album);
      this.$emit('date-selected', albumDate)
      this.$emit('album-selected', album)
    },
    
    // 日期判断
    isToday(date) {
      const today = new Date()
      return date.toDateString() === today.toDateString()
    },
    isSelected(date) {
      return this.selectedDate && date.toDateString() === this.selectedDate.toDateString()
    },
    isWeekend(date) {
      const day = date.getDay()
      return day === 0 || day === 6
    },
    
    // 获取日期对应的专辑
    getAlbumsForDate(date) {
      // 使用本地时间避免时区问题
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      console.log(`🔍 AlbumCalendar: 查找日期 ${dateStr} 的专辑`, {
        totalAlbums: this.albums.length,
        searchDate: dateStr
      });

      const matchedAlbums = this.albums.filter(album => {
        // 处理不同的日期格式
        let albumDateStr = album.releaseDate;

        // 如果是ISO格式的日期字符串，提取日期部分
        if (albumDateStr && albumDateStr.includes('T')) {
          albumDateStr = albumDateStr.split('T')[0];
        }

        // 如果是Date对象，转换为字符串
        if (albumDateStr instanceof Date) {
          const albumYear = albumDateStr.getFullYear();
          const albumMonth = String(albumDateStr.getMonth() + 1).padStart(2, '0');
          const albumDay = String(albumDateStr.getDate()).padStart(2, '0');
          albumDateStr = `${albumYear}-${albumMonth}-${albumDay}`;
        }

        const isMatch = albumDateStr === dateStr;

        console.log(`🔍 AlbumCalendar: 专辑匹配检查`, {
          albumName: album.name,
          albumId: album.id,
          albumReleaseDate: album.releaseDate,
          processedDate: albumDateStr,
          searchDate: dateStr,
          isMatch: isMatch,
          albumCover: album.cover
        });

        if (isMatch) {
          console.log(`✅ AlbumCalendar: 找到匹配专辑 ${dateStr}:`, {
            name: album.name,
            id: album.id,
            cover: album.cover
          });
        }
        return isMatch;
      });

      console.log(`📊 AlbumCalendar: 日期 ${dateStr} 匹配结果`, {
        matchedCount: matchedAlbums.length,
        albums: matchedAlbums.map(a => ({ name: a.name, id: a.id, cover: a.cover }))
      });

      return matchedAlbums;
    },

    // 获取专辑状态
    getAlbumStatus(album) {
      // 检查是否是草稿状态
      if (album.comment && album.comment.startsWith('DRAFT:')) {
        return 'draft';
      }

      // 检查是否已发行 - 优先检查isReleased字段，然后检查发行日期
      if (album.isReleased) {
        return 'released';
      }

      // 如果专辑已通过审核，检查是否已到发行日期
      if (album.status === 'approved' && album.releaseDate) {
        const today = new Date();
        today.setHours(0, 0, 0, 0); // 设置为当天开始时间

        let releaseDate;
        if (album.releaseDate.includes('T')) {
          // ISO格式: '2025-08-01T00:00:00.000Z'
          releaseDate = new Date(album.releaseDate.split('T')[0]);
        } else {
          // 简单格式: '2025-08-01'
          releaseDate = new Date(album.releaseDate);
        }
        releaseDate.setHours(0, 0, 0, 0); // 设置为发行日开始时间

        // 如果今天已经是或超过发行日期，则认为已发行
        if (today >= releaseDate) {
          return 'released';
        }
      }

      // 返回数据库状态
      return album.status || 'pending';
    },

    // 获取日期的主要状态（用于边框颜色）
    getDatePrimaryStatus(date) {
      if (!date.albums || date.albums.length === 0) {
        return 'none';
      }

      const statuses = date.albums.map(album => this.getAlbumStatus(album));

      // 优先级：已发行 > 已通过 > 待审核 > 已拒绝 > 草稿
      if (statuses.includes('released')) return 'released';
      if (statuses.includes('approved')) return 'approved';
      if (statuses.includes('pending')) return 'pending';
      if (statuses.includes('rejected')) return 'rejected';
      if (statuses.includes('draft')) return 'draft';

      return 'none';
    },

    // 获取状态统计（用于多状态指示器）
    getStatusStats(date) {
      if (!date.albums || date.albums.length === 0) {
        return {};
      }

      const stats = {};
      date.albums.forEach(album => {
        const status = this.getAlbumStatus(album);
        stats[status] = (stats[status] || 0) + 1;
      });

      return stats;
    },

    // 获取状态标签
    getStatusLabel(status) {
      const labels = {
        'draft': '草稿',
        'pending': '待审核',
        'approved': '已通过',
        'rejected': '已拒绝',
        'released': '已发行'
      };
      return labels[status] || status;
    },

    // 样式相关
    getDateCellClass(date) {
      const primaryStatus = this.getDatePrimaryStatus(date);

      return {
        'other-month': !date.isCurrentMonth,
        'today': date.isToday,
        'selected': date.isSelected,
        'has-releases': date.hasReleases,
        'weekend': this.isWeekend(date.date),
        // 状态样式类
        'status-draft': primaryStatus === 'draft',
        'status-pending': primaryStatus === 'pending',
        'status-approved': primaryStatus === 'approved',
        'status-rejected': primaryStatus === 'rejected',
        'status-released': primaryStatus === 'released'
      }
    },
    getDateLabel(date) {
      const dayNames = ['日', '一', '二', '三', '四', '五', '六']
      return dayNames[date.date.getDay()]
    },
    


    // 处理专辑封面URL
    getAlbumCoverUrl(album) {
      if (!album || !album.cover) return `${STATIC_BASE_URL}/images/default-album.png`;

      // 优先使用缩略图
      if (album.coverImageThumbnail) {
        return ensureFullUrl(album.coverImageThumbnail);
      }

      // 如果没有缩略图字段，尝试构建缩略图路径
      const coverUrl = ensureFullUrl(album.cover);

      try {
        // 如果是完整URL
        if (coverUrl.startsWith('http')) {
          // 检查是否已经是缩略图
          if (coverUrl.includes('thumb_')) {
            return coverUrl;
          }

          // 构建缩略图URL
          const url = new URL(coverUrl);
          const pathParts = url.pathname.split('/');
          const fileName = pathParts[pathParts.length - 1];

          // 如果路径中包含thumbnails目录
          if (url.pathname.includes('/thumbnails/')) {
            const thumbFileName = `thumb_${fileName}`;
            const dirPath = pathParts.slice(0, -1).join('/');
            url.pathname = `${dirPath}/${thumbFileName}`;
          } else {
            // 添加thumbnails目录和thumb_前缀
            const dirPath = pathParts.slice(0, -1).join('/');
            url.pathname = `${dirPath}/thumbnails/thumb_${fileName}`;
          }

          return url.toString();
        }
      } catch (error) {
        console.error('构建缩略图URL失败:', error);
      }

      // 如果构建失败，返回原图
      return coverUrl;
    },

    // 图片加载错误处理
    handleImageError(event, album) {
      console.error('专辑封面加载失败:', album.name, event.target.src);
      // 设置默认图片
      event.target.src = `${STATIC_BASE_URL}/images/default-album.png`;
    },

    // 图片加载成功处理
    handleImageLoad(event, album) {
      console.log('专辑封面加载成功:', album.name, event.target.src);
    },

    // 窗口大小改变处理
    handleResize() {
      this.windowWidth = window.innerWidth
    }
  }
}
</script>

<style scoped>
.album-calendar {
  padding: 24px;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--color-white, #ffffff);
  overflow: auto; /* 改为auto，允许滚动 */
  min-height: 700px; /* 增加最小高度 */
}

/* 头部样式 */
.calendar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
  padding: 0 16px;
}

.month-title {
  font-size: 24px;
  font-weight: 700;
  color: var(--color-black, #000000);
  margin: 0;
  text-align: center;
  flex: 1;
}

.nav-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;
  border-radius: 50%;
  transition: all 0.2s ease;
  color: var(--color-gray-600, #6b7280);
}

.nav-btn:hover:not(:disabled) {
  background: var(--color-gray-100, #f3f4f6);
  color: var(--color-black, #000000);
}

.nav-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 日历容器 */
.calendar-container {
  padding: 20px;
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: visible; /* 改为visible，确保内容完全显示 */
  min-height: 600px; /* 设置最小高度确保6行日期完整显示 */
}

/* 状态图例 */
.status-legend {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
  padding: 12px 16px;
  background: var(--color-gray-50, #f9fafb);
  border-radius: 8px;
  border: 1px solid var(--color-gray-200, #e5e7eb);
}

.legend-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-gray-700, #374151);
  white-space: nowrap;
}

.legend-items {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.legend-label {
  font-size: 11px;
  color: var(--color-gray-600, #4b5563);
  white-space: nowrap;
}

/* 星期标题 */
.weekdays-header {
  display: grid;
  margin-bottom: 16px;
  /* 确保与日历网格完全对齐 */
  width: fit-content;
  margin-left: auto;
  margin-right: auto;
}

.weekday-cell {
  text-align: center;
  font-size: 12px;
  font-weight: 600;
  color: var(--color-gray-500, #6b7280);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 8px 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 日历网格 */
.calendar-grid {
  display: grid;
  justify-content: center;
  width: fit-content;
  margin-left: auto;
  margin-right: auto;
  max-width: 100%; /* 确保不超出容器 */
  overflow: visible; /* 确保内容可见 */
  flex: 1; /* 占用剩余空间 */
  align-content: start; /* 从顶部开始对齐 */
}

.date-cell {
  background: var(--color-white, #ffffff);
  padding: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--color-gray-200, #e5e7eb);
  border-radius: 4px;
  overflow: hidden;
  aspect-ratio: 1; /* 确保正方形 */
  width: 100%;
  height: auto;
}

.date-cell:hover {
  background: var(--color-gray-50, #f9fafb);
  border-color: var(--color-gray-300, #d1d5db);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.date-cell.other-month {
  background: var(--color-gray-50, #f9fafb);
  color: var(--color-gray-400, #9ca3af);
  opacity: 0.6;
}

.date-cell.other-month:hover {
  background: var(--color-gray-100, #f3f4f6);
  opacity: 0.8;
}

.date-cell.today {
  background: var(--color-gray-100, #f3f4f6);
  border-color: var(--color-black, #000000);
  border-width: 2px;
}

.date-cell.selected {
  background: var(--color-black, #000000);
  color: var(--color-white, #ffffff);
  border-color: var(--color-black, #000000);
}

.date-cell.weekend .date-number {
  color: var(--color-red-500, #ef4444);
}

.date-cell.weekend.other-month .date-number {
  color: var(--color-red-300, #fca5a5);
}

/* 专辑封面样式 */
.album-cover-full {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  border-radius: 8px;
  overflow: hidden;
}

/* 单个专辑 */
.single-album {
  width: 100%;
  height: 100%;
}

.cover-full {
  width: 100%;
  height: 100%;
  object-fit: cover;
  cursor: pointer;
  transition: all 0.2s ease;
}

.cover-full:hover {
  transform: scale(1.05);
}

/* 多个专辑分割显示 */
.multi-albums {
  position: relative;
  width: 100%;
  height: 100%;
  display: grid;
  gap: 1px;
}

/* 2个专辑：左右分割 */
.albums-2 {
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr;
}

/* 3个专辑：左边一个大的，右边两个小的 */
.albums-3 {
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
}

.albums-3 .section-1 {
  grid-row: 1 / 3;
}

/* 4个专辑：2x2网格 */
.albums-4 {
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
}

.album-section {
  position: relative;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s ease;
}

.album-section:hover {
  transform: scale(1.02);
  z-index: 1;
}

.cover-section {
  width: 100%;
  height: 100%;
  object-fit: cover;
}



/* 日期内容样式 */
.date-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
}

/* 状态指示器 */
.status-indicator {
  position: absolute;
  top: 4px;
  right: 4px;
  z-index: 2;
}

.status-badge {
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  color: white;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.status-badge.single {
  width: 8px;
  height: 8px;
}

.status-badge.multiple {
  width: 18px;
  height: 18px;
  font-size: 10px;
  line-height: 1;
}

/* 状态颜色定义 */
.status-draft,
.status-badge.status-draft {
  background-color: #9ca3af; /* 灰色 - 草稿 */
  border-color: #9ca3af;
}

.status-pending,
.status-badge.status-pending {
  background-color: #f59e0b; /* 橙色 - 待审核 */
  border-color: #f59e0b;
}

.status-approved,
.status-badge.status-approved {
  background-color: #10b981; /* 绿色 - 已通过 */
  border-color: #10b981;
}

.status-rejected,
.status-badge.status-rejected {
  background-color: #ef4444; /* 红色 - 已拒绝 */
  border-color: #ef4444;
}

.status-released,
.status-badge.status-released {
  background-color: #8b5cf6; /* 紫色 - 已发行 */
  border-color: #8b5cf6;
}

/* 日期格子状态边框 */
.date-cell.status-draft {
  border-left: 3px solid #9ca3af;
}

.date-cell.status-pending {
  border-left: 3px solid #f59e0b;
}

.date-cell.status-approved {
  border-left: 3px solid #10b981;
}

.date-cell.status-rejected {
  border-left: 3px solid #ef4444;
}

.date-cell.status-released {
  border-left: 3px solid #8b5cf6;
}

.date-number {
  font-size: 16px;
  font-weight: 700;
  line-height: 1;
  margin-bottom: 1px;
}

.date-weekday {
  font-size: 7px;
  font-weight: 600;
  color: var(--color-gray-500, #6b7280);
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.selected .date-weekday {
  color: var(--color-gray-300, #d1d5db);
}



/* 大屏幕优化 */
@media (min-width: 1920px) {
  .album-calendar {
    padding: 32px;
  }

  .calendar-container {
    padding: 24px;
  }

  .calendar-header {
    margin-bottom: 32px;
  }

  .month-title {
    font-size: 28px;
  }

  .weekday-cell {
    font-size: 14px;
    padding: 12px 0;
  }



  .date-number {
    font-size: 18px;
  }


}

/* 中等大屏幕优化 */
@media (min-width: 1440px) and (max-width: 1919px) {
  .album-calendar {
    padding: 28px;
  }

  .calendar-container {
    padding: 22px;
  }



  .date-number {
    font-size: 17px;
  }


}

/* 小桌面屏幕优化 */
@media (min-width: 1025px) and (max-width: 1439px) {
  .album-calendar {
    min-height: 700px; /* 确保足够高度 */
  }



  .date-number {
    font-size: 16px;
  }
}

/* 响应式设计 */
@media (max-width: 1024px) {
  .album-calendar {
    padding: 16px;
    height: 100%;
    min-height: 600px;
  }

  .calendar-container {
    padding: 16px;
    min-height: 500px;
  }

  .status-legend {
    gap: 12px;
    margin-bottom: 12px;
    padding: 10px 12px;
  }

  .legend-title {
    font-size: 11px;
  }

  .legend-items {
    gap: 10px;
  }

  .legend-label {
    font-size: 10px;
  }

  .calendar-header {
    margin-bottom: 16px;
    padding: 0 8px;
  }

  .month-title {
    font-size: 20px;
  }

  .weekday-cell {
    font-size: 11px;
    padding: 6px 0;
  }



  .date-number {
    font-size: 14px;
  }

  .album-cover-full img {
    border-radius: 4px;
  }

  .multi-albums .cover-section {
    border-radius: 2px;
  }


}

@media (max-width: 768px) {
  .album-calendar {
    padding: 12px;
    min-height: 500px;
  }

  .calendar-container {
    padding: 12px;
    min-height: 400px;
  }

  .status-legend {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
    margin-bottom: 10px;
    padding: 8px 10px;
  }

  .legend-items {
    gap: 8px;
  }

  .legend-dot {
    width: 6px;
    height: 6px;
  }

  .status-indicator {
    top: 2px;
    right: 2px;
  }

  .status-badge.single {
    width: 6px;
    height: 6px;
  }

  .status-badge.multiple {
    width: 16px;
    height: 16px;
    font-size: 9px;
  }

  .calendar-header {
    margin-bottom: 12px;
    padding: 0 4px;
  }

  .month-title {
    font-size: 18px;
  }

  .weekdays-header {
    margin-bottom: 12px;
  }

  .weekday-cell {
    font-size: 10px;
    padding: 4px 0;
  }

  .date-cell {
    padding: 3px;
  }

  .date-number {
    font-size: 12px;
    margin-bottom: 2px;
  }

  .album-cover-full img {
    border-radius: 3px;
  }

  .multi-albums .cover-section {
    border-radius: 2px;
  }


}

@media (max-width: 480px) {
  .album-calendar {
    padding: 8px;
    min-height: 450px;
  }

  .calendar-container {
    padding: 8px;
    min-height: 350px;
  }

  .status-legend {
    margin-bottom: 8px;
    padding: 6px 8px;
  }

  .legend-title {
    font-size: 10px;
  }

  .legend-label {
    font-size: 9px;
  }

  .status-indicator {
    top: 1px;
    right: 1px;
  }

  .status-badge.single {
    width: 5px;
    height: 5px;
  }

  .status-badge.multiple {
    width: 14px;
    height: 14px;
    font-size: 8px;
  }

  .calendar-header {
    margin-bottom: 8px;
    padding: 0 2px;
  }

  .month-title {
    font-size: 16px;
  }

  .weekdays-header {
    margin-bottom: 8px;
  }

  .weekday-cell {
    font-size: 9px;
    padding: 3px 0;
    letter-spacing: 0.3px;
  }

  .date-cell {
    padding: 2px;
  }

  .date-number {
    font-size: 11px;
    margin-bottom: 1px;
  }

  .album-cover-full img {
    border-radius: 2px;
  }

  .multi-albums .cover-section {
    border-radius: 1px;
  }



  /* 手机端专辑详情优化 */
  .single-album .cover-full {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .multi-albums {
    height: 100%;
  }

  .multi-albums .album-section {
    overflow: hidden;
  }

  .multi-albums .cover-section {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

/* 超小屏幕优化 (小于360px) */
@media (max-width: 360px) {
  .album-calendar {
    padding: 4px;
  }

  .calendar-container {
    padding: 4px;
  }

  .calendar-header {
    margin-bottom: 6px;
  }

  .month-title {
    font-size: 14px;
  }

  .weekdays-header {
    margin-bottom: 6px;
  }

  .weekday-cell {
    font-size: 8px;
    padding: 2px 0;
  }

  .date-cell {
    padding: 1px;
  }

  .date-number {
    font-size: 10px;
  }


}

/* 横屏模式优化 */
@media (max-height: 500px) and (orientation: landscape) {
  .album-calendar {
    padding: 8px;
    height: auto; /* 横屏时使用自动高度 */
    min-height: 400px;
  }

  .calendar-container {
    padding: 8px;
    min-height: 300px;
  }

  .calendar-header {
    margin-bottom: 8px;
  }

  .weekdays-header {
    margin-bottom: 8px;
  }


}
</style>
