<template>
  <div class="admin-workbench-container" v-bind="$attrs">
    <!-- 主要工作台内容 -->
    <div class="admin-workbench">
      <!-- 初始化加载状态 -->
      <div v-if="!isInitialized" class="initialization-loading">
        <div class="loading-spinner"></div>
        <p>正在加载工作台...</p>
      </div>

      <!-- 主要内容区域 -->
      <div v-else-if="!isDestroyed" class="main-content">
      <!-- 专辑列表区域 -->
      <div class="albums-section">
        <!-- 批量操作栏 -->
        <div class="garrix-batch-actions" v-if="selectedAlbums.length > 0">
          <div class="batch-info">
            <span class="selected-count">已选择 {{ selectedAlbums.length }} 项</span>
          </div>
          <div class="batch-buttons">
            <button
              class="garrix-btn success"
              @click="batchApprove"
              :disabled="batchLoading"
            >
              批量通过
            </button>
            <button
              class="garrix-btn danger"
              @click="batchReject"
              :disabled="batchLoading"
            >
              批量驳回
            </button>
            <button
              class="garrix-btn secondary"
              @click="batchDownloadMaterials"
              :disabled="downloadLoading"
            >
              下载物料
            </button>
            <button
              class="garrix-btn secondary"
              @click="batchMarkDelivered"
              :disabled="deliveryLoading"
            >
              标记已传递
            </button>
          </div>
        </div>

        <!-- 工具栏 -->
        <div class="garrix-toolbar">
          <div class="toolbar-left">
            <button
              class="garrix-btn-text"
              @click="toggleSelectAll"
              v-if="filteredAlbums.length > 0"
            >
              {{ isAllSelected ? '取消全选' : '全选' }}
            </button>
          </div>
          <div class="toolbar-right">
            <button class="garrix-btn-text" @click="refreshData">刷新</button>
            <button class="garrix-btn-text">导出</button>
          </div>
        </div>

        <!-- Garrix风格分类标签 -->
        <div class="garrix-categories">
          <div class="category-list">
            <button
              v-for="category in albumCategories"
              :key="category.value"
              class="garrix-category-btn"
              :class="{ active: activeFilter === category.value }"
              @click="setFilter(category.value)"
            >
              {{ category.label }}
              <span class="count">{{ categoryCountsComputed[category.value] || 0 }}</span>
            </button>
          </div>
        </div>

        <!-- Garrix风格专辑列表 -->
        <div class="garrix-albums-list">
          <div
            v-for="album in paginatedAlbums"
            :key="album.id"
            class="garrix-album-card compact-album-row"
            :class="{
              selected: selectedAlbums.includes(album.id)
            }"
          >
            <!-- 选择区域 -->
            <div class="album-select" @click.stop>
              <div
                class="garrix-checkbox"
                :class="{ checked: selectedAlbums.includes(album.id) }"
                @click="toggleAlbumSelection(album.id)"
              >
                <div class="checkbox-inner"></div>
              </div>
            </div>

            <!-- 专辑内容 -->
            <div class="album-content" @click="selectAlbum(album)">
              <div class="album-cover">
                <img :src="getFullImageUrl(album.coverImage)" :alt="album.title" />
                <div class="cover-overlay">
                  <div class="album-type">{{ album.type }}</div>
                </div>
              </div>

              <!-- 新的三列布局 -->
              <div class="album-details">
                <!-- 第一列：基本信息 -->
                <div class="album-basic-info">
                  <h3 class="album-title">{{ album.title }}</h3>
                  <div class="album-artist">{{ album.performer }}</div>
                  <!-- 发行外显信息移到第一列第三行 -->
                  <div class="display-info">{{ album.displayInfo }}</div>
                </div>

                <!-- 第二列：两行布局设计 -->
                <div class="album-status-info">
                  <!-- 第一行：发行日期 -->
                  <div class="date-row">
                    <div class="release-date">{{ formatDate(album.releaseDate) }}</div>
                  </div>

                  <!-- 第二行：状态徽章（左下角） -->
                  <div class="status-badges-row">
                    <div class="album-status" :class="album.status">
                      {{ getStatusText(album.status) }}
                    </div>
                    <!-- 物料递交状态 -->
                    <div
                      v-if="album.status === 'approved'"
                      class="material-status"
                      :class="{ delivered: album.materialDelivered }"
                    >
                      {{ album.materialDelivered ? '已递交' : '待递交' }}
                    </div>
                  </div>
                </div>

                <!-- 第三列：描述信息 -->
                <div class="album-meta-info">
                  <div class="album-description" v-if="album.description">
                    {{ album.description }}
                  </div>
                </div>
              </div>
            </div>

            <!-- 操作按钮 -->
            <div class="album-actions" @click.stop>
              <button
                class="garrix-action-trigger"
                @click="showActionsPanel(album)"
              >
                操作
              </button>
            </div>
          </div>
        </div>

        <!-- 分页控件 -->
        <div class="pagination-container" v-if="totalPages > 1">
          <div class="pagination-info">
            第 {{ currentPage }} 页，共 {{ totalPages }} 页 ({{ filteredAlbums.length }} 个专辑)
          </div>
          <div class="pagination-controls">
            <button
              class="pagination-btn"
              :disabled="currentPage === 1"
              @click="currentPage = 1"
            >
              首页
            </button>
            <button
              class="pagination-btn"
              :disabled="currentPage === 1"
              @click="currentPage--"
            >
              上一页
            </button>
            <span class="page-numbers">
              <button
                v-for="page in visiblePages"
                :key="page"
                class="page-number"
                :class="{ active: page === currentPage }"
                @click="currentPage = page"
              >
                {{ page }}
              </button>
            </span>
            <button
              class="pagination-btn"
              :disabled="currentPage === totalPages"
              @click="currentPage++"
            >
              下一页
            </button>
            <button
              class="pagination-btn"
              :disabled="currentPage === totalPages"
              @click="currentPage = totalPages"
            >
              末页
            </button>
          </div>
        </div>

        <!-- 发行日历 -->
        <div class="release-calendar-section">
          <div class="calendar-header">
            <div class="calendar-title">发行日历</div>
            <div class="calendar-controls">
              <div class="view-switcher">
                <button
                  v-for="view in calendarViews"
                  :key="view.value"
                  class="calendar-view-btn"
                  :class="{ active: calendarView === view.value }"
                  @click="setCalendarView(view.value)"
                >
                  {{ view.label }}
                </button>
              </div>
              <div class="calendar-navigation">
                <button class="calendar-nav-btn" @click="previousPeriod">
                  ←
                </button>
                <div class="current-period">{{ currentPeriodText }}</div>
                <button class="calendar-nav-btn" @click="nextPeriod">
                  →
                </button>
              </div>
            </div>
          </div>

          <!-- 周视图日历 -->
          <div class="week-calendar" v-if="calendarView === 'week'">
            <div class="week-header">
              <div v-for="day in calendarDays" :key="day.date" class="week-day-header">
                <div class="day-number">{{ day.number }}</div>
                <div class="day-name">{{ day.name }}</div>
              </div>
            </div>
            <div class="week-content">
              <div
                v-for="day in calendarDays"
                :key="day.date"
                class="week-day-column"
                :data-day="`${day.name} ${day.number}`"
              >
                <div
                  v-for="event in day.events"
                  :key="event.id"
                  class="week-event"
                  :class="event.status"
                  :title="getDayTooltip(event)"
                >
                  <div class="event-title">{{ event.title }}</div>
                  <div class="event-artist">{{ event.performer }}</div>
                  <div class="event-status">{{ getStatusText(event.status) }}</div>
                </div>
                <div v-if="day.events.length === 0" class="no-events">
                  无发行计划
                </div>
              </div>
            </div>
          </div>

          <!-- 月视图日历 -->
          <div class="month-calendar" v-if="calendarView === 'month'">
            <div class="month-weekdays">
              <div v-for="day in weekdays" :key="day" class="month-weekday">{{ day }}</div>
            </div>
            <div class="month-days">
              <div
                v-for="day in monthDays"
                :key="day.date"
                class="month-day"
                :class="{
                  'other-month': !day.isCurrentMonth,
                  'today': day.isToday,
                  'has-events': day.events.length > 0
                }"
              >
                <div class="day-number">{{ day.number }}</div>
                <div class="day-events">
                  <div
                    v-for="event in day.events.slice(0, 2)"
                    :key="event.id"
                    class="month-event"
                    :class="event.status"
                    :title="getDayTooltip(event)"
                  >
                    {{ event.title }}
                  </div>
                  <div v-if="day.events.length > 2" class="more-events">
                    +{{ day.events.length - 2 }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Garrix风格右侧面板 -->
      <div class="garrix-right-panel">
        <!-- 物料递交管理区域 - 置顶 -->
        <div class="garrix-material-section">
          <div class="section-title">
            物料递交管理
            <span v-if="pendingMaterialCount > 0" class="alert-count">{{ pendingMaterialCount }}</span>
          </div>

          <div class="material-content">
            <div v-if="pendingMaterialAlbums.length === 0" class="no-materials">
              <div class="no-materials-icon">✓</div>
              <div class="no-materials-text">所有物料已递交完成</div>
            </div>
            <div v-else class="garrix-material-list">
              <div
                v-for="album in pendingMaterialAlbums.slice(0, 4)"
                :key="album.id"
                class="garrix-material-item"
                @click="selectAlbum(album)"
              >
                <div class="material-info">
                  <div class="material-cover">
                    <img :src="getFullImageUrl(album.coverImage)" :alt="album.title" />
                  </div>
                  <div class="material-details">
                    <div class="material-title">{{ album.title }}</div>
                    <div class="material-artist">{{ album.performer }}</div>
                    <div class="material-date">{{ formatDate(album.releaseDate) }}</div>
                  </div>
                </div>
                <button
                  class="garrix-material-btn"
                  @click.stop="markAsDelivered(album)"
                >
                  标记已递交
                </button>
              </div>
              <div v-if="pendingMaterialAlbums.length > 4" class="more-materials">
                <button class="view-all-btn" @click="showAllMaterials">
                  查看全部 {{ pendingMaterialAlbums.length }} 个待递交专辑
                </button>
              </div>
            </div>
          </div>
        </div>



        <!-- Mini风格统计概览 -->
        <div class="mini-stats-section" v-if="isInitialized">
          <div class="mini-stats-header">
            <span class="mini-stats-title">数据分析</span>
            <span class="mini-stats-period">实时</span>
          </div>
          <div class="mini-stats-grid" v-if="overview.albumStats">
            <div class="mini-stat-item">
              <div class="mini-stat-value">{{ albumStatsComputed.total }}</div>
              <div class="mini-stat-label">总专辑</div>
            </div>
            <div class="mini-stat-item">
              <div class="mini-stat-value">{{ albumStatsComputed.pending }}</div>
              <div class="mini-stat-label">待审核</div>
            </div>
            <div class="mini-stat-item">
              <div class="mini-stat-value">{{ albumStatsComputed.approved }}</div>
              <div class="mini-stat-label">已通过</div>
            </div>
            <div class="mini-stat-item">
              <div class="mini-stat-value">{{ albumStatsComputed.rejected }}</div>
              <div class="mini-stat-label">已驳回</div>
            </div>
          </div>
          <div class="mini-stats-loading" v-else>
            <p>正在加载统计数据...</p>
          </div>

          <!-- Mini趋势图 -->
          <div class="mini-chart-section">
            <div class="mini-chart-header">
              <span class="mini-chart-title">发行趋势</span>
              <span class="mini-chart-period">本月</span>
            </div>
            <div class="mini-chart-container">
              <canvas ref="miniTrendChart" class="mini-trend-chart"></canvas>
            </div>
          </div>
        </div>




      </div>
    </div>

      <!-- 组件销毁状态 -->
      <div v-else class="workbench-destroyed">
        <!-- 空占位，确保始终有根元素 -->
      </div>
    </div>

    <!-- Acmetone 拒绝理由输入框 -->
    <AcmetoneDialog
      :visible="rejectModalVisible"
      title="拒绝专辑"
      size="medium"
      class="reject-dialog"
      @close="closeRejectModal"
    >
    <div class="reject-dialog-content">
      <div class="album-preview" v-if="selectedAlbumForReject">
        <img :src="getFullImageUrl(selectedAlbumForReject.coverImage)" :alt="selectedAlbumForReject.title" />
        <div class="album-info">
          <h4>{{ selectedAlbumForReject.title }}</h4>
          <p>{{ selectedAlbumForReject.performer }}</p>
        </div>
      </div>

      <AcmetoneInput
        v-model="rejectReason"
        type="textarea"
        label="拒绝理由"
        placeholder="请输入详细的拒绝理由，帮助用户了解需要修改的地方..."
        :rows="4"
        required
        :error="rejectReasonError"
        helper-text="拒绝理由至少需要5个字符"
      />
    </div>

    <template #footer>
      <div class="dialog-actions">
        <AcmetoneBtn
          type="secondary"
          @click="closeRejectModal"
        >
          取消
        </AcmetoneBtn>
        <AcmetoneBtn
          type="danger"
          :loading="actionLoading"
          :disabled="!rejectReason.trim() || rejectReason.trim().length < 5"
          @click="confirmReject"
        >
          确定拒绝
        </AcmetoneBtn>
      </div>
    </template>
  </AcmetoneDialog>

    <!-- Garrix 简洁抽屉 -->
    <div class="garrix-drawer" :class="{ 'visible': actionsPanelVisible }">
      <div class="drawer-backdrop" @click="closeActionsPanel"></div>
      <div class="drawer-panel">
        <!-- 头部 -->
        <div class="drawer-header">
          <div class="header-info">
            <div class="album-number">{{ selectedAlbumForActions?.id || '21312312' }}</div>
            <div class="album-artist">{{ selectedAlbumForActions?.performer || 'KOSHM' }}</div>
          </div>
          <button class="close-btn" @click="closeActionsPanel">×</button>
        </div>

      <!-- 内容 -->
      <div class="drawer-content" v-if="selectedAlbumForActions">
        <!-- 专辑信息 -->
        <div class="album-info">
          <div class="album-cover">
            <img :src="getFullImageUrl(selectedAlbumForActions.coverImage)" :alt="selectedAlbumForActions.title" />
            <div class="status-badge" :class="selectedAlbumForActions.status">
              {{ getStatusText(selectedAlbumForActions.status) }}
            </div>
          </div>
          <div class="album-meta">
            <h3 class="album-title">{{ selectedAlbumForActions.title }}</h3>
            <p class="artist-name">{{ selectedAlbumForActions.performer }}</p>
            <div class="meta-info">
              {{ formatDate(selectedAlbumForActions.createdAt) }}
            </div>
          </div>
        </div>

        <!-- 物料递交状态 -->
        <div v-if="selectedAlbumForActions.status === 'approved'" class="delivery-section">
          <h4 class="section-title">物料递交状态</h4>
          <div class="delivery-toggle">
            <div class="toggle-info">
              <span class="toggle-label">递交状态</span>
              <span class="toggle-desc">标记物料是否已递交</span>
            </div>
            <el-switch
              v-model="selectedAlbumForActions.materialDelivered"
              @change="toggleMaterialDelivery(selectedAlbumForActions)"
              active-text="已递交"
              inactive-text="未递交"
              active-color="#000000"
              inactive-color="#e0e0e0"
              :loading="deliveryLoading"
            />
          </div>
          <div v-if="selectedAlbumForActions.materialDeliveredAt" class="delivery-timestamp">
            递交时间: {{ formatDate(selectedAlbumForActions.materialDeliveredAt) }}
          </div>
        </div>

        <!-- 审核操作 -->
        <div v-if="selectedAlbumForActions.status === 'pending'" class="review-section">
          <h4 class="section-title">审核操作</h4>
          <div class="review-actions">
            <button
              class="action-button approve-btn"
              @click="handleQuickAction(selectedAlbumForActions)"
              :disabled="actionLoading"
            >
              <span v-if="actionLoading">处理中...</span>
              <span v-else>快速通过</span>
            </button>
            <button
              class="action-button reject-btn"
              @click="handleQuickReject(selectedAlbumForActions)"
              :disabled="actionLoading"
            >
              <span v-if="actionLoading">处理中...</span>
              <span v-else>快速拒绝</span>
            </button>
          </div>
        </div>

        <!-- 通用操作 -->
        <div class="actions-section">
          <h4 class="section-title">通用操作</h4>
          <div class="action-grid">
            <button
              class="action-button view-btn"
              @click="selectAlbum(selectedAlbumForActions)"
            >
              查看详情
            </button>
            <button
              class="action-button download-btn"
              @click="downloadAlbumMaterial(selectedAlbumForActions)"
              :disabled="actionLoading"
            >
              下载物料
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
  </div>
</template>

<script>
import { adminWorkbenchApi } from '@/api/adminWorkbench'
import { API_BASE_URL, STATIC_BASE_URL } from '@/config'
import { useAlbumStore } from '@/stores/album'
// 移除图标导入，采用简洁设计
import api from '@/services/api'
import { chartService } from '@/services/chartService'
import { releaseTrendService } from '@/services/releaseTrendService'
// 导入Acmetone组件
import AcmetoneBtn from '@/components/acmetone/AcmetoneBtn.vue'
import AcmetoneDialog from '@/components/acmetone/AcmetoneDialog.vue'
import AcmetoneInput from '@/components/acmetone/AcmetoneInput.vue'
// 导入通知store
import { useNotificationStore } from '@/stores/notification'

export default {
  name: 'AdminWorkbench',
  inheritAttrs: false,
  components: {
    AcmetoneDialog,
    AcmetoneBtn,
    AcmetoneInput
  },
  data() {
    return {
      searchQuery: '',
      activeFilter: 'undelivered', // 默认显示未投递专辑
      selectedAlbums: [], // 批量选择的专辑ID数组
      albums: [],
      overview: {},
      calendarData: [],
      completionRate: 68,
      releaseTrendData: [], // 发行趋势数据

      // Store引用
      notificationStore: useNotificationStore(),

      // 数据缓存
      albumsCache: {
        pending: { data: [], timestamp: 0 },
        approved: { data: [], timestamp: 0 },
        rejected: { data: [], timestamp: 0 },
        all: { data: [], timestamp: 0 }
      },
      cacheExpireTime: 2 * 60 * 1000, // 缓存2分钟过期
      refreshTimer: null, // 定时器

      // 分页相关
      currentPage: 1,
      pageSize: 3, // 限制为3行

      // 加载状态
      batchLoading: false,
      downloadLoading: false,
      deliveryLoading: false,
      actionLoading: false,

      // 操作面板状态
      actionsPanelVisible: false,
      selectedAlbumForActions: null,

      // 拒绝理由输入框状态
      rejectModalVisible: false,
      selectedAlbumForReject: null,
      rejectReason: '',
      rejectReasonError: '',
      currentUser: {
        name: 'Martin Garixx'
      },

      // 专辑分类
      albumCategories: [
        { label: '未投递', value: 'undelivered' },
        { label: '待审核', value: 'pending' },
        { label: '已通过', value: 'approved' },
        { label: '已拒绝', value: 'rejected' },
        { label: '所有专辑', value: 'all' }
      ],
      // 日历相关
      calendarDays: [],
      monthDays: [],
      calendarView: 'week', // 'day', 'week', 'month'
      calendarViews: [
        { label: '日', value: 'day' },
        { label: '周', value: 'week' },
        { label: '月', value: 'month' }
      ],
      currentDate: new Date(),
      weekdays: ['日', '一', '二', '三', '四', '五', '六'],
      // 配置
      STATIC_BASE_URL,

      // 组件状态标志
      isDestroyed: false,
      isInitialized: false
    }
  },
  computed: {
    filteredAlbums() {
      // 现在API已经返回正确筛选的数据，不需要额外筛选
      let filtered = this.albums || []

      // 如果有搜索关键词，进行搜索筛选
      if (this.searchQuery && this.searchQuery.trim()) {
        const query = this.searchQuery.trim().toLowerCase()
        filtered = filtered.filter(album =>
          (album.title && album.title.toLowerCase().includes(query)) ||
          (album.performer && album.performer.toLowerCase().includes(query))
        )
      }

      if (this.searchQuery) {
        filtered = filtered.filter(album =>
          (album.title || '').toLowerCase().includes(this.searchQuery.toLowerCase()) ||
          (album.performer || '').toLowerCase().includes(this.searchQuery.toLowerCase()) ||
          (album.description || '').toLowerCase().includes(this.searchQuery.toLowerCase())
        )
      }

      console.log('筛选结果:', {
        activeFilter: this.activeFilter,
        totalAlbums: this.albums?.length || 0,
        filteredCount: filtered.length,
        filteredAlbums: filtered.map(album => ({
          id: album.id,
          title: album.title,
          status: album.status,
          comment: album.comment,
          isDraft: album.comment === 'DRAFT: 尚未提交审核',
          isPending: album.status === 'pending' && album.comment !== 'DRAFT: 尚未提交审核'
        }))
      })

      // 专门检查待审核筛选时的草稿情况
      if (this.activeFilter === 'pending') {
        console.log('=== 待审核筛选详细调试 ===')
        console.log('所有pending状态的专辑:')
        this.albums.filter(album => album.status === 'pending').forEach(album => {
          console.log(`专辑ID: ${album.id}, 标题: ${album.title}`)
          console.log(`comment: "${album.comment}"`)
          console.log(`comment类型: ${typeof album.comment}`)

          const isDraft = album.comment === 'DRAFT: 尚未提交审核' ||
                         album.comment === 'DRAFT:尚未提交审核' ||
                         (album.comment && album.comment.startsWith('DRAFT:'))

          console.log(`是否为草稿: ${isDraft}`)
          console.log(`是否应该显示在待审核: ${!isDraft}`)
          console.log('---')
        })

        console.log('筛选后的待审核专辑:')
        filtered.forEach(album => {
          console.log(`专辑ID: ${album.id}, 标题: ${album.title}, comment: "${album.comment}"`)
        })
        console.log('=== 调试结束 ===')
      }

      return filtered
    },

    // 分页后的专辑列表
    paginatedAlbums() {
      const startIndex = (this.currentPage - 1) * this.pageSize
      const endIndex = startIndex + this.pageSize
      return this.filteredAlbums.slice(startIndex, endIndex)
    },

    // 总页数
    totalPages() {
      return Math.ceil(this.filteredAlbums.length / this.pageSize)
    },

    // 可见的页码
    visiblePages() {
      const total = this.totalPages
      const current = this.currentPage
      const delta = 2 // 当前页前后显示的页数

      let start = Math.max(1, current - delta)
      let end = Math.min(total, current + delta)

      // 确保显示足够的页码
      if (end - start < 4 && total > 4) {
        if (start === 1) {
          end = Math.min(total, start + 4)
        } else if (end === total) {
          start = Math.max(1, end - 4)
        }
      }

      const pages = []
      for (let i = start; i <= end; i++) {
        pages.push(i)
      }
      return pages
    },

    isAllSelected() {
      return this.filteredAlbums.length > 0 &&
             this.selectedAlbums.length === this.filteredAlbums.length &&
             this.filteredAlbums.every(album => this.selectedAlbums.includes(album.id))
    },

    selectedAlbumsData() {
      return this.albums.filter(album => this.selectedAlbums.includes(album.id))
    },

    pendingMaterialAlbums() {
      // 物料递交管理应该显示所有已通过但未递交的专辑，不受左侧分类筛选影响

      // 如果当前正在显示已通过分类，优先使用当前数据（最新）
      if (this.activeFilter === 'approved' && this.albums && this.albums.length > 0) {
        return this.albums.filter(album => !album.materialDelivered)
      }

      // 然后从已通过专辑的缓存中获取数据
      const approvedCache = this.albumsCache.approved
      if (approvedCache && approvedCache.data && approvedCache.data.length > 0) {
        return approvedCache.data.filter(album => !album.materialDelivered)
      }

      // 最后从当前显示的专辑中筛选已通过但未递交的
      if (this.albums && this.albums.length > 0) {
        return this.albums.filter(album => album.status === 'approved' && !album.materialDelivered)
      }

      // 否则返回空数组，避免显示错误的数据
      return []
    },

    pendingMaterialCount() {
      return this.pendingMaterialAlbums.length
    },

    calendarViewText() {
      const viewMap = {
        day: '天',
        week: '周',
        month: '月'
      }
      return viewMap[this.calendarView] || '周'
    },

    currentPeriodText() {
      const date = this.currentDate
      if (this.calendarView === 'month') {
        return `${date.getFullYear()}年${date.getMonth() + 1}月`
      } else if (this.calendarView === 'week') {
        const startOfWeek = new Date(date)
        startOfWeek.setDate(date.getDate() - date.getDay())
        const endOfWeek = new Date(startOfWeek)
        endOfWeek.setDate(startOfWeek.getDate() + 6)
        return `${startOfWeek.getMonth() + 1}月${startOfWeek.getDate()}日 - ${endOfWeek.getMonth() + 1}月${endOfWeek.getDate()}日`
      } else {
        return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
      }
    },

    // 确保分类数量实时更新
    categoryCountsComputed() {
      return {
        undelivered: this.getCategoryCount('undelivered'),
        pending: this.getCategoryCount('pending'),
        approved: this.getCategoryCount('approved'),
        rejected: this.getCategoryCount('rejected'),
        all: this.getCategoryCount('all')
      }
    },

    // 专辑统计（不包括草稿）
    albumStatsComputed() {
      if (this.overview && this.overview.albumStats) {
        const stats = this.overview.albumStats
        return {
          total: (stats.pending || 0) + (stats.approved || 0) + (stats.rejected || 0),
          pending: stats.pending || 0,
          approved: stats.approved || 0,
          rejected: stats.rejected || 0
        }
      }
      return { total: 0, pending: 0, approved: 0, rejected: 0 }
    }
  },
  async mounted() {
    try {
      await this.loadData()
      this.generateCalendar()

      // 启动定时刷新
      this.startAutoRefresh()

      // 立即刷新一次所有数据
      this.refreshAllAlbumsData()

      // 标记组件初始化完成
      this.isInitialized = true

      // 在组件初始化完成后初始化图表
      this.$nextTick(() => {
        this.initCharts()
      })
    } catch (error) {
      console.error('AdminWorkbench 初始化失败:', error)
      this.isInitialized = true // 即使失败也要标记为已初始化，避免卡住
    }
  },

  watch: {
    searchQuery() {
      // 搜索查询变化时重置分页
      this.currentPage = 1
    }
  },

  beforeUnmount() {
    console.log('AdminWorkbench 组件即将销毁，清理资源...')

    // 设置销毁标志，阻止后续异步操作
    this.isDestroyed = true
    this.isInitialized = false

    // 组件销毁前停止定时器
    this.stopAutoRefresh()

    // 清理图表
    try {
      chartService.destroyAllCharts()
    } catch (error) {
      console.warn('清理图表时出错:', error)
    }

    // 清理数据缓存
    this.albumsCache = {
      pending: { data: [], timestamp: 0 },
      approved: { data: [], timestamp: 0 },
      rejected: { data: [], timestamp: 0 },
      all: { data: [], timestamp: 0 }
    }

    // 重置状态
    this.actionsPanelVisible = false
    this.selectedAlbumForActions = null
    this.rejectModalVisible = false
    this.selectedAlbums = []

    console.log('AdminWorkbench 资源清理完成')
  },
  methods: {
    async loadData() {
      try {
        // 检查组件是否已销毁
        if (this.isDestroyed) {
          console.log('组件已销毁，取消数据加载')
          return
        }

        console.log('开始加载工作台数据...', '当前筛选条件:', this.activeFilter)

        // 获取概览数据
        const overviewResponse = await adminWorkbenchApi.getOverview()
        console.log('概览数据响应:', overviewResponse)

        // 再次检查组件是否已销毁
        if (this.isDestroyed) {
          console.log('组件已销毁，取消数据更新')
          return
        }

        if (overviewResponse && overviewResponse.success && overviewResponse.data) {
          this.overview = overviewResponse.data
          // 更新完成率
          if (this.overview.materialStats) {
            this.completionRate = this.overview.materialStats.deliveryRate || 0
          }
        } else {
          this.overview = {}
          console.warn('概览数据格式异常:', overviewResponse)
        }

        // 重写专辑获取逻辑 - 简单直接
        await this.fetchAlbumsByFilter()

        // 获取日历数据
        const calendarParams = {
          year: this.currentDate.getFullYear(),
          status: 'all'
        }
        console.log('请求日历数据参数:', calendarParams)
        const calendarResponse = await adminWorkbenchApi.getCalendarData(calendarParams)
        console.log('日历数据响应:', calendarResponse)

        // 检查组件是否已销毁
        if (this.isDestroyed) {
          console.log('组件已销毁，取消日历数据更新')
          return
        }

        if (calendarResponse && calendarResponse.success && calendarResponse.data) {
          this.calendarData = calendarResponse.data
        } else {
          this.calendarData = { albums: [] }
          console.warn('日历数据格式异常:', calendarResponse)
        }

        // 重新生成日历以显示最新数据
        this.generateCalendar()

        // 获取发行趋势数据
        await this.fetchReleaseTrendData()

        console.log('数据加载完成:', {
          albumsCount: this.albums.length,
          overview: this.overview,
          calendarData: this.calendarData,
          pendingMaterialCount: this.pendingMaterialCount,
          categoryCounts: this.categoryCountsComputed,
          albumsDetail: this.albums.map(album => ({
            id: album.id,
            title: album.title,
            status: album.status,
            comment: album.comment
          }))
        })

        // 如果专辑API没有返回数据，但日历API有数据，使用日历数据
        if (this.albums.length === 0 && this.calendarData && this.calendarData.albums && this.calendarData.albums.length > 0) {
          console.log('专辑API无数据，使用日历数据中的专辑...')
          // 将日历数据中的专辑转换为标准格式，只保留已通过和已拒绝的专辑
          this.albums = this.calendarData.albums
            .filter(album => {
              // 只显示已通过和已拒绝的专辑
              return album.status === 'approved' || album.status === 'rejected'
            })
            .map(album => ({
              id: album.id,
              title: album.name || album.title,
              performer: album.performer || album.artist || '未知艺术家',
              description: album.description || album.displayInfo || '',
              coverImage: this.getFullImageUrl(album.cover || album.coverImage),
              type: album.type || '专辑',
              status: album.status,
              comment: album.comment || null, // 确保comment字段存在且不是undefined
              releaseDate: album.releaseDate,
              createdAt: album.createdAt || album.submittedAt,
              materialDelivered: album.materialDelivered || false
            }))
          console.log('转换后的专辑数据（仅包含最终状态）:', this.albums)
        }

      } catch (error) {
        console.error('加载数据失败:', error)
        this.$message.error(`加载数据失败: ${error.message || '未知错误'}`)
      }
    },

    // 检查缓存是否有效
    isCacheValid(filterType) {
      const cache = this.albumsCache[filterType]
      if (!cache || !cache.timestamp) return false

      const now = Date.now()
      return (now - cache.timestamp) < this.cacheExpireTime
    },

    // 清除相关缓存
    clearRelatedCache(types) {
      types.forEach(type => {
        if (this.albumsCache[type]) {
          this.albumsCache[type] = { data: [], timestamp: 0 }
          console.log(`清除 ${type} 缓存`)
        }
      })
    },

    // 从缓存获取数据
    getFromCache(filterType) {
      if (this.isCacheValid(filterType)) {
        console.log(`从缓存获取 ${filterType} 数据`)
        return this.albumsCache[filterType].data
      }
      return null
    },

    // 更新缓存
    updateCache(filterType, data) {
      this.albumsCache[filterType] = {
        data: data,
        timestamp: Date.now()
      }
      console.log(`缓存已更新: ${filterType}, 数据量: ${data.length}`)
    },

    // 从API获取单个类型的专辑数据
    async fetchAlbumsFromAPI(filterType) {
      try {
        // 检查组件是否已销毁
        if (this.isDestroyed) {
          console.log('组件已销毁，取消API请求')
          return []
        }

        const token = localStorage.getItem('token')
        if (!token) {
          throw new Error('未找到token')
        }

        let response

        switch (filterType) {
          case 'pending':
            response = await fetch(`${API_BASE_URL}/albums/pending`, {
              headers: { 'Authorization': `Bearer ${token}` }
            })
            break

          case 'approved':
            response = await fetch(`${API_BASE_URL}/albums/approved`, {
              headers: { 'Authorization': `Bearer ${token}` }
            })
            break

          case 'rejected':
            response = await fetch(`${API_BASE_URL}/albums/rejected`, {
              headers: { 'Authorization': `Bearer ${token}` }
            })
            break

          case 'undelivered':
            // 获取未投递专辑（已通过但未递交物料）
            response = await fetch(`${API_BASE_URL}/albums/approved`, {
              headers: { 'Authorization': `Bearer ${token}` }
            })
            break

          case 'all':
            response = await fetch(`${API_BASE_URL}/admin/all-albums?page=1&pageSize=100`, {
              headers: { 'Authorization': `Bearer ${token}` }
            })
            break

          default:
            throw new Error(`未知的筛选类型: ${filterType}`)
        }

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const data = await response.json()

        // 再次检查组件是否已销毁
        if (this.isDestroyed) {
          console.log('组件已销毁，取消数据处理')
          return []
        }

        // 处理不同API的响应格式
        let albums = []
        if (filterType === 'all') {
          albums = data.albums || []
          // 过滤掉草稿状态的专辑
          albums = albums.filter(album =>
            !(album.comment && album.comment.startsWith('DRAFT:'))
          )
          console.log(`${filterType} API返回的专辑数据示例:`, albums[0])
        } else if (filterType === 'undelivered') {
          // 未投递：只显示已通过但未递交物料的专辑
          albums = Array.isArray(data) ? data : []
          console.log(`${filterType} API返回的原始数据示例:`, albums[0])
          albums = albums.filter(album =>
            album.status === 'approved' && !album.materialDelivered
          )
        } else {
          albums = Array.isArray(data) ? data : []
          console.log(`${filterType} API返回的专辑数据示例:`, albums[0])

          // 过滤掉草稿状态的专辑
          albums = albums.filter(album =>
            !(album.comment && album.comment.startsWith('DRAFT:'))
          )
        }

        // 统一处理专辑数据格式，确保coverImage字段正确
        albums = albums.map(album => ({
          ...album,
          // 确保coverImage字段存在且格式正确
          coverImage: album.coverImage || album.cover || null,
          // 确保其他必要字段存在
          title: album.title || album.name || '未知专辑',
          performer: album.performer || album.artist || '未知艺术家'
        }))

        // 更新缓存
        this.updateCache(filterType, albums)

        return albums

      } catch (error) {
        console.error(`获取 ${filterType} 专辑数据失败:`, error)
        throw error
      }
    },

    // 刷新所有类型的数据（后台静默更新）
    async refreshAllAlbumsData() {
      // 检查组件是否已销毁
      if (this.isDestroyed) {
        console.log('组件已销毁，取消数据刷新')
        return
      }

      console.log('开始刷新所有类型专辑数据...')

      const types = ['undelivered', 'pending', 'approved', 'rejected', 'all']

      for (const type of types) {
        // 在每次循环中检查组件状态
        if (this.isDestroyed) {
          console.log('组件已销毁，停止数据刷新')
          return
        }

        try {
          await this.fetchAlbumsFromAPI(type)
        } catch (error) {
          console.error(`刷新 ${type} 数据失败:`, error)
        }
      }

      console.log('所有专辑数据刷新完成')
    },

    // 获取专辑数据（优先使用缓存）
    async fetchAlbumsByFilter() {
      try {
        console.log('获取专辑数据，筛选条件:', this.activeFilter)

        // 先尝试从缓存获取
        const cachedData = this.getFromCache(this.activeFilter)
        if (cachedData) {
          this.albums = cachedData
          console.log(`从缓存获取到 ${cachedData.length} 个专辑`)
          return
        }

        // 缓存无效，从API获取
        console.log(`缓存无效，从API获取 ${this.activeFilter} 数据`)
        const albums = await this.fetchAlbumsFromAPI(this.activeFilter)
        this.albums = albums
        console.log(`从API获取到 ${albums.length} 个专辑`)

      } catch (error) {
        console.error('获取专辑数据失败:', error)
        this.albums = []
        this.$message.error('获取专辑数据失败: ' + error.message)
      }
    },

    // 启动定时刷新
    startAutoRefresh() {
      // 清除现有定时器
      if (this.refreshTimer) {
        clearInterval(this.refreshTimer)
      }

      // 设置定时器，每1分钟刷新一次数据
      this.refreshTimer = setInterval(() => {
        this.refreshAllAlbumsData()
      }, 60 * 1000) // 1分钟

      console.log('定时刷新已启动，每1分钟刷新一次')
    },

    // 停止定时刷新
    stopAutoRefresh() {
      if (this.refreshTimer) {
        clearInterval(this.refreshTimer)
        this.refreshTimer = null
        console.log('定时刷新已停止')
      }
    },

    async setFilter(filter) {
      console.log('切换筛选条件:', filter)
      this.activeFilter = filter
      this.selectedAlbums = [] // 清空选择
      this.currentPage = 1 // 重置分页

      // 清除当前分类的缓存，确保获取最新数据
      this.clearRelatedCache([filter])

      // 获取最新数据
      await this.fetchAlbumsByFilter()
    },
    
    selectAlbum(album) {
      // 直接跳转到专辑详情页面
      this.$router.push(`/albums/${album.id}`)
    },
    
    async handleQuickAction(album) {
      try {
        this.actionLoading = true

        // 参考AdminPanel.vue的逻辑，使用albumStore.updateAlbumStatus
        const albumStore = useAlbumStore()

        // 快速通过，使用默认评论
        await albumStore.updateAlbumStatus(album.id, 'approved', '审核通过')

        this.$message.success(`专辑《${album.title}》已快速通过`)

        // 立即更新本地数据
        album.status = 'approved'
        album.comment = '审核通过'

        // 关闭操作面板
        this.closeActionsPanel()

        // 清除相关缓存，强制重新加载
        this.clearRelatedCache(['pending', 'approved', 'all'])

        // 刷新数据并强制更新视图
        await this.loadData()

        // 如果当前不在"已通过"分类，切换到"已通过"分类显示结果
        if (this.activeFilter !== 'approved') {
          this.$message.info('专辑已移至"已通过"分类')
        }
      } catch (error) {
        console.error('快速通过失败:', error)
        this.$message.error(error.message || '快速通过失败')
      } finally {
        this.actionLoading = false
      }
    },

    async handleQuickReject(album) {
      // 显示自定义拒绝理由输入框
      this.selectedAlbumForReject = album
      this.rejectReason = ''
      this.rejectModalVisible = true
    },

    // 关闭拒绝理由输入框
    closeRejectModal() {
      this.rejectModalVisible = false
      this.selectedAlbumForReject = null
      this.rejectReason = ''
      this.rejectReasonError = ''
    },

    // 确认拒绝
    async confirmReject() {
      // 清除之前的错误信息
      this.rejectReasonError = ''

      if (!this.rejectReason.trim()) {
        this.rejectReasonError = '请输入拒绝理由'
        return
      }

      if (this.rejectReason.trim().length < 5) {
        this.rejectReasonError = '拒绝理由至少需要5个字符'
        return
      }

      try {
        this.actionLoading = true

        // 参考AdminPanel.vue的逻辑，使用albumStore.updateAlbumStatus
        const albumStore = useAlbumStore()

        await albumStore.updateAlbumStatus(this.selectedAlbumForReject.id, 'rejected', this.rejectReason.trim())

        this.$message.success(`专辑《${this.selectedAlbumForReject.title}》已拒绝`)

        // 立即更新本地数据
        this.selectedAlbumForReject.status = 'rejected'
        this.selectedAlbumForReject.comment = this.rejectReason.trim()

        // 关闭模态框和操作面板
        this.closeRejectModal()
        this.closeActionsPanel()

        // 清除相关缓存，强制重新加载
        this.clearRelatedCache(['pending', 'rejected', 'all'])

        // 刷新数据并强制更新视图
        await this.loadData()

        // 更新通知数量
        await this.notificationStore.fetchNotifications()

        // 如果当前不在"已拒绝"分类，切换到"已拒绝"分类显示结果
        if (this.activeFilter !== 'rejected') {
          this.$message.info('专辑已移至"已拒绝"分类')
        }
      } catch (error) {
        console.error('快速拒绝失败:', error)
        this.$message.error(error.message || '快速拒绝失败')
      } finally {
        this.actionLoading = false
      }
    },

    // 显示操作面板
    showActionsPanel(album) {
      this.selectedAlbumForActions = album
      this.actionsPanelVisible = true
    },

    // 关闭操作面板
    closeActionsPanel() {
      this.actionsPanelVisible = false
      this.selectedAlbumForActions = null
    },

    // 下载单个专辑物料
    async downloadAlbumMaterial(album) {
      try {
        this.actionLoading = true

        // 检查专辑状态
        if (album.status !== 'approved') {
          this.$message.warning('只能下载已审核通过的专辑物料')
          return
        }

        this.$message.info(`正在生成专辑《${album.title}》的物料包...`)

        // 调用下载API - 使用api服务下载ZIP文件
        const response = await api.get(`/albums/${album.id}/download`, {
          responseType: 'blob'
        })

        // 获取文件名 - 后端使用res.download()设置的文件名
        // 后端文件名格式：YYYY.MM.DD - 专辑名称.zip
        let filename = `${album.title}_物料包.zip` // 默认文件名

        // 尝试从Content-Disposition头获取后端设置的文件名
        const contentDisposition = response.headers['content-disposition']
        if (contentDisposition) {
          // 解析Content-Disposition头中的filename
          const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)
          if (filenameMatch) {
            filename = filenameMatch[1].replace(/['"]/g, '')
            console.log('从响应头获取到文件名:', filename)
          }
        }

        // 如果没有从响应头获取到文件名，生成与后端一致的文件名格式
        if (!contentDisposition && album.releaseDate) {
          try {
            // 格式化发行日期为YYYY.MM.DD格式
            const releaseDate = new Date(album.releaseDate).toISOString().split('T')[0].replace(/-/g, '.')
            // 处理专辑标题，移除特殊字符
            const albumTitle = album.title.replace(/[\\/:*?"<>|]/g, '_')
            filename = `${releaseDate} - ${albumTitle}.zip`
            console.log('生成的文件名:', filename)
          } catch (error) {
            console.warn('生成文件名失败，使用默认文件名:', error)
          }
        }

        // 创建下载链接
        const blob = new Blob([response.data])
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)

        this.$message.success(`专辑《${album.title}》物料包下载成功`)

        // 关闭面板
        this.closeActionsPanel()
      } catch (error) {
        console.error('下载物料失败:', error)
        this.$message.error(`下载物料失败: ${error.message}`)
      } finally {
        this.actionLoading = false
      }
    },

    // 切换物料递交状态
    async toggleMaterialDelivery(album) {
      try {
        console.log('切换物料递交状态:', album.id, album.materialDelivered)

        const response = await adminWorkbenchApi.updateMaterialDeliveryStatus(album.id, {
          delivered: album.materialDelivered,
          deliveredAt: album.materialDelivered ? new Date().toISOString() : null,
          comment: album.materialDelivered ? '通过管理员工作台标记为已递交' : '通过管理员工作台标记为未递交'
        })

        if (response.success) {
          this.$message.success(
            album.materialDelivered ? '已标记为物料已递交' : '已标记为物料未递交'
          )

          // 更新本地数据
          album.materialDeliveredAt = album.materialDelivered ? new Date().toISOString() : null

          // 更新缓存中的数据
          if (this.albumsCache.approved && this.albumsCache.approved.data) {
            const cachedAlbum = this.albumsCache.approved.data.find(a => a.id === album.id)
            if (cachedAlbum) {
              cachedAlbum.materialDelivered = album.materialDelivered
              cachedAlbum.materialDeliveredAt = album.materialDeliveredAt
            }
          }

          // 清除相关缓存，强制重新加载
          this.clearRelatedCache(['approved', 'all'])

          // 刷新统计数据
          await this.loadData()
        } else {
          throw new Error(response.message || '更新失败')
        }
      } catch (error) {
        console.error('切换物料递交状态失败:', error)

        // 恢复开关状态
        album.materialDelivered = !album.materialDelivered

        this.$message.error('更新物料递交状态失败: ' + error.message)
      }
    },
    
    async handleAlbumAction({ action, albumIds, comment }) {
      try {
        await adminWorkbenchApi.batchReviewAlbums({
          albumIds,
          action,
          comment
        })
        this.$message.success('操作成功')
        await this.loadData()
      } catch (error) {
        this.$message.error('操作失败')
        console.error(error)
      }
    },
    
    getStatusText(status) {
      const statusMap = {
        pending: '待审核',
        approved: '已通过',
        rejected: '已驳回'
      }
      return statusMap[status] || status
    },
    

    
    // 验证日期是否有效
    isValidDate(date) {
      if (!date) return false
      const dateObj = new Date(date)
      return !isNaN(dateObj.getTime())
    },

    formatDate(date) {
      if (!date) return '未设置'

      try {
        const dateObj = new Date(date)
        if (isNaN(dateObj.getTime())) {
          console.warn('无效日期:', date)
          return '无效日期'
        }
        return dateObj.toLocaleDateString('zh-CN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        })
      } catch (error) {
        console.warn('日期格式化错误:', date, error)
        return '格式错误'
      }
    },

    formatTime(date) {
      if (!date) return ''

      try {
        const dateObj = new Date(date)
        if (isNaN(dateObj.getTime())) {
          return ''
        }
        return dateObj.toLocaleTimeString('zh-CN', {
          hour: '2-digit',
          minute: '2-digit'
        })
      } catch (error) {
        console.warn('时间格式化错误:', date, error)
        return ''
      }
    },

    getDayTooltip(event) {
      if (!event) return ''

      const status = this.getStatusText(event.status)
      const date = this.formatDate(event.releaseDate)

      return `${event.title} - ${event.performer}\n状态: ${status}\n发行日期: ${date}`
    },
    
    async refreshData() {
      await this.loadData()
      this.$message.success('数据已刷新')
    },



    // 获取各分类的专辑数量
    getCategoryCount(status) {
      // 优先使用概览统计数据，更准确
      if (this.overview && this.overview.albumStats) {
        const stats = this.overview.albumStats

        // 调试：输出概览统计数据
        if (status === 'undelivered') {
          console.log('=== 未投递统计调试 ===')
          console.log('概览统计数据:', stats)
          console.log('materialPending字段:', stats.materialPending)
          console.log('当前activeFilter:', this.activeFilter)
          console.log('当前albums数量:', this.albums ? this.albums.length : 0)
        }

        switch (status) {
          case 'undelivered':
            // 未投递：已通过但未递交物料的专辑数量
            // 优先使用缓存数据，即使缓存过期也使用（因为概览数据中没有这个统计）
            const undeliveredCache = this.albumsCache.undelivered

            if (undeliveredCache && undeliveredCache.data) {
              console.log('使用未投递缓存数据，数量:', undeliveredCache.data.length)
              return undeliveredCache.data.length
            }

            // 如果没有缓存，返回当前显示的数量（如果正在显示未投递）
            const fallbackCount = this.activeFilter === 'undelivered' ? (this.albums ? this.albums.length : 0) : 0
            console.log('未投递无缓存，使用备选逻辑，数量:', fallbackCount)
            return fallbackCount
          case 'pending':
            return stats.pending || 0
          case 'approved':
            return stats.approved || 0
          case 'rejected':
            return stats.rejected || 0
          case 'all':
            // 所有专辑不包括草稿，只统计需要审核的专辑
            return (stats.pending || 0) + (stats.approved || 0) + (stats.rejected || 0)
          default:
            return 0
        }
      }

      // 如果没有概览数据，使用当前加载的专辑数据作为备选
      if (!this.albums) return 0

      // 对于未投递，优先使用缓存数据（即使过期）
      if (status === 'undelivered') {
        const undeliveredCache = this.albumsCache.undelivered
        if (undeliveredCache && undeliveredCache.data) {
          return undeliveredCache.data.length
        }
        // 如果没有缓存，返回当前显示的数量（如果正在显示未投递）
        return this.activeFilter === 'undelivered' ? (this.albums ? this.albums.length : 0) : 0
      }

      // 现在直接使用概览数据或当前筛选的专辑数量
      if (status === 'all') {
        // 优先使用概览数据
        if (this.overview.albumStats) {
          return this.overview.albumStats.total || 0
        }
        return this.albums ? this.albums.length : 0
      }

      if (status === 'pending') {
        // 优先使用概览数据
        if (this.overview.albumStats) {
          return this.overview.albumStats.pending || 0
        }
        return this.activeFilter === 'pending' ? (this.albums ? this.albums.length : 0) : 0
      }

      // 其他状态（approved, rejected）
      if (status === 'approved') {
        if (this.overview.albumStats) {
          return this.overview.albumStats.approved || 0
        }
        return this.activeFilter === 'approved' ? (this.albums ? this.albums.length : 0) : 0
      }

      if (status === 'rejected') {
        if (this.overview.albumStats) {
          return this.overview.albumStats.rejected || 0
        }
        return this.activeFilter === 'rejected' ? (this.albums ? this.albums.length : 0) : 0
      }

      return 0
    },

    // 切换专辑选择状态
    toggleAlbumSelection(albumId) {
      const index = this.selectedAlbums.indexOf(albumId)
      if (index > -1) {
        this.selectedAlbums.splice(index, 1)
      } else {
        this.selectedAlbums.push(albumId)
      }
    },

    // 获取完整的图片URL（优先使用缩略图）
    getFullImageUrl(imagePath) {
      if (!imagePath) {
        return 'https://via.placeholder.com/80x80/E0E0E0/999999?text=No+Image'
      }

      try {
        // 检查是否已经是缩略图（无论是完整URL还是相对路径）
        if (imagePath.includes('thumb_')) {
          // 如果已经是完整URL，直接返回
          if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
            return imagePath;
          }
          // 如果是相对路径，添加基础URL
          if (imagePath.startsWith('/')) {
            return `${this.STATIC_BASE_URL}${imagePath}`;
          } else {
            return `${this.STATIC_BASE_URL}/${imagePath}`;
          }
        }

        // 如果不是缩略图，需要构建缩略图URL
        if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
          // 处理完整URL
          const url = new URL(imagePath);
          const pathParts = url.pathname.split('/');
          const fileName = pathParts[pathParts.length - 1];

          // 如果路径中包含thumbnails目录
          if (url.pathname.includes('/thumbnails/')) {
            const thumbFileName = fileName.startsWith('thumb_') ? fileName : `thumb_${fileName}`;
            const dirPath = pathParts.slice(0, -1).join('/');
            url.pathname = `${dirPath}/${thumbFileName}`;
          } else {
            // 添加thumbnails目录和thumb_前缀
            const dirPath = pathParts.slice(0, -1).join('/');
            const thumbFileName = fileName.startsWith('thumb_') ? fileName : `thumb_${fileName}`;
            url.pathname = `${dirPath}/thumbnails/${thumbFileName}`;
          }

          return url.toString();
        } else {
          // 处理相对路径
          const pathParts = imagePath.split('/');
          const fileName = pathParts[pathParts.length - 1];

          // 如果路径中包含thumbnails目录
          if (imagePath.includes('/thumbnails/')) {
            // 检查文件名是否已经有thumb_前缀
            const thumbFileName = fileName.startsWith('thumb_') ? fileName : `thumb_${fileName}`;
            const dirPath = pathParts.slice(0, -1).join('/');
            const thumbPath = `${dirPath}/${thumbFileName}`;

            // 返回缩略图URL
            if (thumbPath.startsWith('/')) {
              return `${this.STATIC_BASE_URL}${thumbPath}`;
            } else {
              return `${this.STATIC_BASE_URL}/${thumbPath}`;
            }
          } else {
            // 添加thumbnails目录和thumb_前缀
            const dirPath = pathParts.slice(0, -1).join('/');
            const thumbFileName = fileName.startsWith('thumb_') ? fileName : `thumb_${fileName}`;
            const thumbPath = `${dirPath}/thumbnails/${thumbFileName}`;

            // 返回缩略图URL
            if (thumbPath.startsWith('/')) {
              return `${this.STATIC_BASE_URL}${thumbPath}`;
            } else {
              return `${this.STATIC_BASE_URL}/${thumbPath}`;
            }
          }
        }
      } catch (error) {
        console.error('构建缩略图URL失败:', error);

        // 出错时返回原图路径
        if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
          return imagePath;
        }
        return `${this.STATIC_BASE_URL}/${imagePath}`;
      }
    },
    

    
    // 获取发行趋势数据
    async fetchReleaseTrendData() {
      try {
        const trendData = await releaseTrendService.getMonthlyTrend()
        this.releaseTrendData = trendData
        console.log('发行趋势数据:', trendData)

        // 初始化图表
        this.initCharts()
      } catch (error) {
        console.error('获取发行趋势数据失败:', error)
        // 使用默认数据
        this.releaseTrendData = {
          chartData: {
            data: [20, 35, 25, 45, 35, 50],
            labels: ['1', '2', '3', '4', '5', '6']
          }
        }
        this.initCharts()
      }
    },

    // 初始化图表
    initCharts() {
      // 检查组件是否已销毁
      if (this.isDestroyed) {
        console.log('组件已销毁，取消图表初始化')
        return
      }

      this.$nextTick(() => {
        // 再次检查组件状态
        if (this.isDestroyed) {
          console.log('组件已销毁，取消图表初始化')
          return
        }

        try {
          this.initMiniTrendChart()
        } catch (error) {
          console.warn('图表初始化失败:', error)
        }
      })
    },



    // 初始化Mini趋势图
    initMiniTrendChart(retryCount = 0) {
      // 检查组件是否已销毁
      if (this.isDestroyed) {
        console.log('组件已销毁，取消Mini趋势图初始化')
        return
      }

      if (!this.$refs.miniTrendChart) {
        if (retryCount < 3 && !this.isDestroyed) {
          console.log(`Mini趋势图canvas元素未找到，重试 ${retryCount + 1}/3`)
          setTimeout(() => {
            if (!this.isDestroyed) {
              this.initMiniTrendChart(retryCount + 1)
            }
          }, 100)
          return
        } else {
          console.warn('Mini趋势图canvas元素未找到，已达到最大重试次数或组件已销毁')
          return
        }
      }

      try {
        const chartData = this.releaseTrendData?.chartData || {
          data: [20, 35, 25, 45, 35, 50],
          labels: ['1', '2', '3', '4', '5', '6']
        }

        // 确保数据格式正确
        const safeData = Array.isArray(chartData.data) ? chartData.data : [20, 35, 25, 45, 35, 50]

        console.log('初始化Mini趋势图，数据:', safeData)

        // 直接使用原生Canvas绘制mini图表
        const ctx = this.$refs.miniTrendChart.getContext('2d')
        const gradient = ctx.createLinearGradient(0, 0, 0, 60)
        gradient.addColorStop(0, '#4F9EFF')
        gradient.addColorStop(1, 'rgba(79, 158, 255, 0.1)')

        const width = this.$refs.miniTrendChart.width = this.$refs.miniTrendChart.offsetWidth
        const height = this.$refs.miniTrendChart.height = 60

        ctx.clearRect(0, 0, width, height)

        // 绘制填充区域
        ctx.fillStyle = gradient
        ctx.beginPath()

        const maxValue = Math.max(...safeData)
        const minValue = Math.min(...safeData)
        const range = maxValue - minValue || 1

        safeData.forEach((value, index) => {
          const x = (index / (safeData.length - 1)) * (width - 8) + 4
          const y = height - 4 - ((value - minValue) / range) * (height - 8)

          if (index === 0) {
            ctx.moveTo(x, height - 4)
            ctx.lineTo(x, y)
          } else {
            ctx.lineTo(x, y)
          }
        })

        ctx.lineTo(width - 4, height - 4)
        ctx.closePath()
        ctx.fill()

        // 绘制线条
        ctx.strokeStyle = '#4F9EFF'
        ctx.lineWidth = 2
        ctx.beginPath()

        safeData.forEach((value, index) => {
          const x = (index / (safeData.length - 1)) * (width - 8) + 4
          const y = height - 4 - ((value - minValue) / range) * (height - 8)

          if (index === 0) {
            ctx.moveTo(x, y)
          } else {
            ctx.lineTo(x, y)
          }
        })

        ctx.stroke()
        console.log('Mini趋势图初始化完成')
      } catch (error) {
        console.error('Mini趋势图初始化错误:', error)
      }
    },
    
    generateCalendar() {
      if (this.calendarView === 'week') {
        this.generateWeekCalendar()
      } else if (this.calendarView === 'month') {
        this.generateMonthCalendar()
      }
    },

    generateWeekCalendar() {
      const startOfWeek = new Date(this.currentDate)
      startOfWeek.setDate(this.currentDate.getDate() - this.currentDate.getDay())

      this.calendarDays = Array.from({ length: 7 }, (_, i) => {
        const date = new Date(startOfWeek)
        date.setDate(startOfWeek.getDate() + i)

        return {
          date: date.toISOString().split('T')[0],
          number: date.getDate(),
          name: ['日', '一', '二', '三', '四', '五', '六'][i],
          events: this.getEventsForDate(date)
        }
      })
    },

    generateMonthCalendar() {
      const year = this.currentDate.getFullYear()
      const month = this.currentDate.getMonth()
      const firstDay = new Date(year, month, 1)
      const startDate = new Date(firstDay)
      startDate.setDate(startDate.getDate() - firstDay.getDay())

      const days = []
      const today = new Date()

      for (let i = 0; i < 42; i++) { // 6 weeks * 7 days
        const date = new Date(startDate)
        date.setDate(startDate.getDate() + i)

        days.push({
          date: date.toISOString().split('T')[0],
          number: date.getDate(),
          isCurrentMonth: date.getMonth() === month,
          isToday: date.toDateString() === today.toDateString(),
          events: this.getEventsForDate(date)
        })
      }

      this.monthDays = days
    },

    setCalendarView(view) {
      this.calendarView = view
      this.generateCalendar()
    },

    previousPeriod() {
      const date = new Date(this.currentDate)
      if (this.calendarView === 'month') {
        date.setMonth(date.getMonth() - 1)
      } else if (this.calendarView === 'week') {
        date.setDate(date.getDate() - 7)
      } else {
        date.setDate(date.getDate() - 1)
      }
      this.currentDate = date
      this.generateCalendar()
    },

    nextPeriod() {
      const date = new Date(this.currentDate)
      if (this.calendarView === 'month') {
        date.setMonth(date.getMonth() + 1)
      } else if (this.calendarView === 'week') {
        date.setDate(date.getDate() + 7)
      } else {
        date.setDate(date.getDate() + 1)
      }
      this.currentDate = date
      this.generateCalendar()
    },

    selectAlbumFromCalendar(event) {
      const album = this.albums.find(a => a.id === event.albumId)
      if (album) {
        this.selectAlbum(album)
      }
    },

    async markAsDelivered(album) {
      try {
        console.log('标记专辑物料已递交:', album.id, album.title)

        const response = await adminWorkbenchApi.updateMaterialDeliveryStatus(album.id, {
          delivered: true,
          deliveredAt: new Date().toISOString(),
          comment: '从提醒面板标记为已递交'
        })

        console.log('标记响应:', response)

        if (response.success) {
          this.$message.success(`专辑《${album.title}》已标记为物料已递交`)

          // 立即更新本地数据，避免显示错误
          album.materialDelivered = true
          album.materialDeliveredAt = new Date().toISOString()

          // 更新缓存中的数据
          if (this.albumsCache.approved && this.albumsCache.approved.data) {
            const cachedAlbum = this.albumsCache.approved.data.find(a => a.id === album.id)
            if (cachedAlbum) {
              cachedAlbum.materialDelivered = true
              cachedAlbum.materialDeliveredAt = new Date().toISOString()
            }
          }

          // 清除相关缓存，强制重新加载
          this.clearRelatedCache(['approved', 'all'])

          await this.loadData()
        } else {
          throw new Error(response.message || '标记失败')
        }
      } catch (error) {
        this.$message.error(`标记失败: ${error.message}`)
        console.error('标记物料递交失败:', error)
      }
    },

    // 显示所有待递交物料
    showAllMaterials() {
      // 设置筛选条件为已通过且未递交
      this.activeFilter = 'approved'
      this.searchQuery = ''

      // 重新加载数据
      this.loadData().then(() => {
        // 滚动到专辑列表顶部
        const albumsList = document.querySelector('.garrix-albums-list')
        if (albumsList) {
          albumsList.scrollIntoView({ behavior: 'smooth' })
        }

        this.$message.info(`显示 ${this.pendingMaterialCount} 个待递交物料的专辑`)
      })
    },
    
    getEventsForDate(date) {
      const dateStr = date.toISOString().split('T')[0]

      // 只使用专辑列表的数据源（发行日历仅显示最终状态）
      let albumsForDate = []

      console.log(`\n🗓️ ===== 获取日期 ${dateStr} 的发行事件 =====`)
      console.log(`当前筛选条件: ${this.activeFilter}`)
      console.log(`专辑数据源数量: ${this.albums?.length || 0}`)

      // 使用专辑列表数据（发行日历仅显示最终状态）
      if (this.albums && this.albums.length > 0) {
        console.log(`=== 处理专辑列表数据 ===`)
        console.log(`专辑数量: ${this.albums.length}`)

        albumsForDate = this.albums.filter(album => {
          if (!album.releaseDate) {
            return false
          }

          // 发行日历只显示已通过和已拒绝的专辑，不显示待审核状态
          if (album.status !== 'approved' && album.status !== 'rejected') {
            console.log(`🚫 过滤掉非最终状态专辑: ${album.title} - 状态: ${album.status}`)
            return false
          }

          try {
            const albumDate = new Date(album.releaseDate).toISOString().split('T')[0]
            const isDateMatch = albumDate === dateStr

            if (isDateMatch) {
              console.log(`✅ 找到发行专辑: ${album.title} (${album.status}) - ${dateStr}`)
            }

            return isDateMatch
          } catch (error) {
            console.warn(`日期格式错误:`, album.releaseDate, album.title)
            return false
          }
        })

        console.log(`日期 ${dateStr} 的专辑数量: ${albumsForDate.length}`)
      }

      // 不再使用单独的日历数据源，专辑列表数据已经正确过滤为最终状态

      // 转换为事件格式
      const events = albumsForDate.map(album => ({
        id: album.id,
        albumId: album.id,
        title: album.title || album.name,
        performer: album.performer,
        status: album.status,
        coverImage: this.getFullImageUrl(album.coverImage || album.cover),
        type: album.type,
        releaseDate: album.releaseDate
      }))

      if (events.length > 0) {
        console.log(`📅 日期 ${dateStr} 有 ${events.length} 个发行事件:`, events.map(e => `${e.title}(${e.status})`))
      }

      return events
    },

    // 批量操作相关方法
    toggleSelectAll() {
      if (this.isAllSelected) {
        this.selectedAlbums = []
      } else {
        this.selectedAlbums = this.filteredAlbums.map(album => album.id)
      }
    },



    async batchApprove() {
      if (this.selectedAlbums.length === 0) {
        this.$message.warning('请先选择要审核的专辑')
        return
      }

      try {
        await this.$confirm('确定要批量通过这些专辑吗？', '批量审核', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        })

        this.batchLoading = true

        // 使用与单个通过相同的逻辑，确保发送邮件通知
        const albumStore = useAlbumStore()
        let successCount = 0
        let failCount = 0

        // 逐个处理每个专辑，确保每个都能发送邮件
        for (const albumId of this.selectedAlbums) {
          try {
            await albumStore.updateAlbumStatus(albumId, 'approved', '批量审核通过')
            successCount++
          } catch (error) {
            console.error(`通过专辑 ${albumId} 失败:`, error)
            failCount++
          }
        }

        // 显示结果
        if (successCount > 0 && failCount === 0) {
          this.$message.success(`成功通过 ${successCount} 个专辑，已发送邮件通知`)
        } else if (successCount > 0 && failCount > 0) {
          this.$message.warning(`成功通过 ${successCount} 个专辑，${failCount} 个专辑处理失败`)
        } else {
          this.$message.error('所有专辑审核失败')
        }

        // 清除相关缓存，强制重新加载
        this.clearRelatedCache(['pending', 'approved', 'all'])

        this.selectedAlbums = []
        await this.loadData()

        // 更新通知数量
        await this.notificationStore.fetchNotifications()

        // 提示用户专辑状态变化
        if (successCount > 0) {
          this.$message.info(`${successCount} 个专辑已移至"已通过"分类`)
        }
      } catch (error) {
        if (error !== 'cancel') {
          this.$message.error('批量审核失败')
          console.error(error)
        }
      } finally {
        this.batchLoading = false
      }
    },

    async batchReject() {
      if (this.selectedAlbums.length === 0) {
        this.$message.warning('请先选择要驳回的专辑')
        return
      }

      try {
        const { value: comment } = await this.$prompt('请输入驳回理由', '批量驳回', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          inputValidator: (value) => {
            if (!value || value.trim() === '') {
              return '请输入驳回理由'
            }
            return true
          }
        })

        this.batchLoading = true

        // 使用与单个拒绝相同的逻辑，确保发送邮件通知
        const albumStore = useAlbumStore()
        let successCount = 0
        let failCount = 0

        // 逐个处理每个专辑，确保每个都能发送邮件
        for (const albumId of this.selectedAlbums) {
          try {
            await albumStore.updateAlbumStatus(albumId, 'rejected', comment.trim())
            successCount++
          } catch (error) {
            console.error(`拒绝专辑 ${albumId} 失败:`, error)
            failCount++
          }
        }

        // 显示结果
        if (successCount > 0 && failCount === 0) {
          this.$message.success(`成功驳回 ${successCount} 个专辑，已发送邮件通知`)
        } else if (successCount > 0 && failCount > 0) {
          this.$message.warning(`成功驳回 ${successCount} 个专辑，${failCount} 个专辑处理失败`)
        } else {
          this.$message.error('所有专辑驳回失败')
        }

        // 清除相关缓存，强制重新加载
        this.clearRelatedCache(['pending', 'rejected', 'all'])

        this.selectedAlbums = []
        await this.loadData()

        // 更新通知数量
        await this.notificationStore.fetchNotifications()

        // 提示用户专辑状态变化
        if (successCount > 0) {
          this.$message.info(`${successCount} 个专辑已移至"已拒绝"分类`)
        }
      } catch (error) {
        if (error !== 'cancel') {
          this.$message.error('批量驳回失败')
          console.error(error)
        }
      } finally {
        this.batchLoading = false
      }
    },

    async batchDownloadMaterials() {
      if (this.selectedAlbums.length === 0) {
        this.$message.warning('请先选择要下载物料的专辑')
        return
      }

      this.downloadLoading = true
      try {
        // 简单提示用户使用单个下载功能
        this.$message.info(`已选择 ${this.selectedAlbums.length} 个专辑，请点击专辑操作按钮逐个下载物料包`)

        // 清空选择
        this.selectedAlbums = []
      } catch (error) {
        this.$message.error(`操作失败: ${error.message}`)
        console.error(error)
      } finally {
        this.downloadLoading = false
      }
    },

    async batchMarkDelivered() {
      if (this.selectedAlbums.length === 0) {
        this.$message.warning('请先选择要标记的专辑')
        return
      }

      // 只处理已通过的专辑
      const approvedAlbums = this.selectedAlbumsData.filter(album => album.status === 'approved')
      if (approvedAlbums.length === 0) {
        this.$message.warning('所选专辑中没有已通过审核的专辑')
        return
      }

      try {
        await this.$confirm(`确定要将 ${approvedAlbums.length} 个已通过的专辑标记为物料已传递吗？`, '批量标记', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        })

        this.deliveryLoading = true

        // 使用批量API更新物料传递状态
        const albumIds = approvedAlbums.map(album => album.id)
        const response = await adminWorkbenchApi.batchMarkDelivered(albumIds, {
          deliveredAt: new Date().toISOString(),
          comment: '批量标记为已传递'
        })

        if (!response.success) {
          throw new Error(response.message || '批量标记失败')
        }

        this.$message.success(`成功标记 ${response.data.updatedCount || approvedAlbums.length} 个专辑为物料已传递`)

        // 立即更新本地数据，避免显示错误
        approvedAlbums.forEach(album => {
          album.materialDelivered = true
          album.materialDeliveredAt = new Date().toISOString()
        })

        // 更新缓存中的数据
        if (this.albumsCache.approved && this.albumsCache.approved.data) {
          this.albumsCache.approved.data.forEach(cachedAlbum => {
            if (albumIds.includes(cachedAlbum.id)) {
              cachedAlbum.materialDelivered = true
              cachedAlbum.materialDeliveredAt = new Date().toISOString()
            }
          })
        }

        // 清除相关缓存，强制重新加载
        this.clearRelatedCache(['approved', 'all'])

        this.selectedAlbums = []
        await this.loadData()

        // 提示用户专辑状态变化
        this.$message.info(`${response.data.updatedCount || approvedAlbums.length} 个专辑已标记为物料已传递`)
      } catch (error) {
        if (error !== 'cancel') {
          this.$message.error(`批量标记失败: ${error.message}`)
          console.error('批量标记物料递交失败:', error)
        }
      } finally {
        this.deliveryLoading = false
      }
    }
  }
}
</script>

<style scoped>
/* Garrix设计系统 - 管理工作台 */
.admin-workbench {
  min-height: 100vh;
  background: var(--garrix-white, #ffffff);
  font-family: var(--garrix-font-primary, 'Montserrat', sans-serif);
}

/* Garrix顶部栏 */
.garrix-header {
  background: var(--garrix-white, #ffffff);
  border-bottom: 1px solid var(--garrix-border, #dddddd);
  padding: 24px 32px;
  margin-bottom: 0;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 1400px;
  margin: 0 auto;
}

.header-left {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.page-title {
  font-family: var(--garrix-font-primary, 'Montserrat', sans-serif);
  font-size: 28px;
  font-weight: 700;
  color: var(--garrix-black, #000000);
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.page-subtitle {
  font-size: 14px;
  color: var(--garrix-text-secondary, #666666);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.header-right {
  display: flex;
  align-items: center;
}

.garrix-search-box {
  position: relative;
}

.garrix-input {
  width: 300px;
  height: 48px;
  border: 1px solid var(--garrix-black, #000000);
  background: transparent;
  padding: 0 16px;
  font-family: var(--garrix-font-primary, 'Montserrat', sans-serif);
  font-size: 14px;
  color: var(--garrix-black, #000000);
  outline: none;
  transition: all 0.3s ease;
  border-radius: 0;
}

.garrix-input:focus {
  background: var(--garrix-black, #000000);
  color: var(--garrix-white, #ffffff);
}

.garrix-input::placeholder {
  color: var(--garrix-text-secondary, #666666);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-size: 12px;
}

/* 主要内容区域 */
.main-content {
  display: grid;
  grid-template-columns: 1fr 400px;
  gap: 0;
  min-height: calc(100vh - 96px);
}

.albums-section {
  background: var(--garrix-white, #ffffff);
  border-right: 1px solid var(--garrix-border, #dddddd);
  padding: 32px;
}

/* Garrix批量操作栏 - 黑色镂空白色填背景 */
.garrix-batch-actions {
  background: var(--garrix-white, #ffffff);
  color: var(--garrix-black, #000000);
  border: 2px solid var(--garrix-black, #000000);
  padding: 16px 24px;
  margin: -32px -32px 24px -32px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  position: relative;
  z-index: 10;
}

.batch-info {
  font-family: var(--garrix-font-primary, 'Montserrat', sans-serif);
  font-size: 14px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--garrix-black, #000000);
}

.batch-buttons {
  display: flex;
  gap: 12px;
}

/* 批量操作栏中的按钮特殊样式 */
.garrix-batch-actions .garrix-btn {
  border-width: 2px;
  font-weight: 600;
  padding: 10px 18px;
}

.garrix-batch-actions .garrix-btn.success {
  border-color: #28a745;
  color: #28a745;
}

.garrix-batch-actions .garrix-btn.danger {
  border-color: #dc3545;
  color: #dc3545;
}

.garrix-batch-actions .garrix-btn.secondary {
  border-color: #6c757d;
  color: #6c757d;
}

/* Garrix工具栏 */
.garrix-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--garrix-border, #dddddd);
}

.toolbar-left,
.toolbar-right {
  display: flex;
  gap: 16px;
}

/* Garrix分类标签 */
.garrix-categories {
  margin-bottom: 32px;
}

.category-list {
  display: flex;
  gap: 0;
  border: 1px solid var(--garrix-black, #000000);
}

.garrix-category-btn {
  flex: 1;
  padding: 16px 24px;
  border: none;
  background: transparent;
  color: var(--garrix-black, #000000);
  font-family: var(--garrix-font-primary, 'Montserrat', sans-serif);
  font-size: 12px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  cursor: pointer;
  transition: all 0.3s ease;
  border-right: 1px solid var(--garrix-black, #000000);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.garrix-category-btn:last-child {
  border-right: none;
}

.garrix-category-btn:hover {
  background: var(--garrix-gray, #f5f5f5);
}

.garrix-category-btn.active {
  background: var(--garrix-black, #000000);
  color: var(--garrix-white, #ffffff);
}

.garrix-category-btn .count {
  background: rgba(255, 255, 255, 0.2);
  padding: 2px 6px;
  border-radius: 2px;
  font-size: 10px;
  min-width: 16px;
  text-align: center;
}

.garrix-category-btn:not(.active) .count {
  background: var(--garrix-dark-gray, #e0e0e0);
  color: var(--garrix-text-secondary, #666666);
}

/* Garrix按钮系统 */
.garrix-btn {
  padding: 12px 20px;
  border: 1px solid var(--garrix-black, #000000);
  background: transparent;
  color: var(--garrix-black, #000000);
  font-family: var(--garrix-font-primary, 'Montserrat', sans-serif);
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  cursor: pointer;
  transition: all 0.3s ease;
  border-radius: 0;
}

.garrix-btn:hover:not(:disabled) {
  background: var(--garrix-black, #000000);
  color: var(--garrix-white, #ffffff);
}

.garrix-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.garrix-btn.success {
  border-color: #28a745;
  color: #28a745;
}

.garrix-btn.success:hover:not(:disabled) {
  background: #28a745;
  color: #ffffff;
}

.garrix-btn.danger {
  border-color: #dc3545;
  color: #dc3545;
}

.garrix-btn.danger:hover:not(:disabled) {
  background: #dc3545;
  color: #ffffff;
}

.garrix-btn.secondary {
  border-color: var(--garrix-text-secondary, #666666);
  color: var(--garrix-text-secondary, #666666);
}

.garrix-btn.secondary:hover:not(:disabled) {
  background: var(--garrix-text-secondary, #666666);
  color: var(--garrix-white, #ffffff);
}

.garrix-btn-text {
  background: none;
  border: none;
  color: var(--garrix-text-secondary, #666666);
  font-family: var(--garrix-font-primary, 'Montserrat', sans-serif);
  font-size: 12px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  cursor: pointer;
  transition: color 0.3s ease;
  padding: 8px 0;
}

.garrix-btn-text:hover {
  color: var(--garrix-black, #000000);
}

/* Garrix专辑列表 */
.garrix-albums-list {
  display: flex;
  flex-direction: column;
  gap: 1px;
  background: var(--garrix-border, #dddddd);
  border: 1px solid var(--garrix-border, #dddddd);
}

/* 新的紧凑行样式 - 使用更高优先级 */
.compact-album-row.garrix-album-card {
  display: flex !important;
  background: #ffffff !important;
  transition: all 0.2s ease !important;
  position: relative !important;
  min-height: 80px !important; /* 为三列布局提供足够高度 */
  height: auto !important; /* 允许自适应高度 */
  border-bottom: 1px solid #f0f0f0 !important;
  align-items: stretch !important; /* 拉伸对齐，让内容占满高度 */
}

.garrix-album-card {
  display: flex;
  background: #ffffff;
  transition: all 0.2s ease;
  position: relative;
  min-height: 80px; /* 减少行高 */
  border-bottom: 1px solid #f0f0f0;
}

/* 紧凑行的悬停和选中状态 */
.compact-album-row.garrix-album-card:hover {
  background: #f8f9fa !important;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1) !important;
  transform: none !important; /* 移除上浮效果避免高度变化 */
}

.compact-album-row.garrix-album-card.selected {
  background: #e3f2fd !important;
  border-left: 4px solid #2196f3 !important;
  color: #1976d2 !important;
}

.garrix-album-card:hover {
  background: #f8f9fa;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transform: translateY(-1px);
}

.garrix-album-card.selected {
  background: #e3f2fd;
  border-left: 4px solid #2196f3;
  color: #1976d2;
}

/* 紧凑行的选择区域 */
.compact-album-row .album-select {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  width: 40px !important; /* 更小的宽度 */
  padding: 8px 0 !important; /* 更小的内边距 */
  border-right: 1px solid #e9ecef !important;
  background: #fafafa !important;
}

/* 专辑卡片内部结构 */
.album-select {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 50px; /* 减少宽度 */
  padding: 12px 0; /* 减少内边距 */
  border-right: 1px solid #e9ecef;
  background: #fafafa;
}

.garrix-checkbox {
  width: 18px;
  height: 18px;
  border: 2px solid #dee2e6;
  background: transparent;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  border-radius: 3px;
}

.garrix-checkbox:hover {
  border-color: #007bff;
  background: #f8f9fa;
}

.garrix-checkbox.checked {
  background: #007bff;
  border-color: #007bff;
}

.checkbox-inner {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 6px;
  height: 6px;
  background: #ffffff;
  opacity: 0;
  transition: opacity 0.2s ease;
  border-radius: 1px;
}

.garrix-checkbox.checked .checkbox-inner {
  opacity: 1;
}

/* 紧凑行的内容区域 */
.compact-album-row .album-content {
  display: flex !important;
  flex: 1 !important;
  cursor: pointer !important;
  transition: all 0.2s ease !important;
  padding: 10px 0 !important; /* 适当的内边距 */
  align-items: center !important; /* 垂直居中 */
  height: 100% !important; /* 占满容器高度 */
}

.compact-album-row .album-cover {
  position: relative !important;
  width: 50px !important; /* 稍大一点的封面 */
  height: 50px !important;
  flex-shrink: 0 !important;
  overflow: hidden !important;
  border-radius: 4px !important;
  margin: 0 16px !important; /* 适当的边距 */
}

.album-content {
  display: flex;
  flex: 1;
  cursor: pointer;
  transition: all 0.2s ease;
  padding: 12px 0; /* 减少内边距 */
}

.album-cover {
  position: relative;
  width: 40px; /* 减少封面尺寸 */
  height: 40px;
  flex-shrink: 0;
  overflow: hidden;
  border-radius: 4px;
  margin: 0 16px;
}

.album-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cover-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.8), transparent);
  padding: 8px 12px;
  display: flex;
  align-items: flex-end;
}

.album-type {
  color: var(--garrix-white, #ffffff);
  font-size: 10px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* 紧凑行的详情区域 - 新三列布局 */
.compact-album-row .album-details {
  flex: 1 !important;
  padding: 0 16px !important;
  display: grid !important; /* 使用网格布局 */
  grid-template-columns: 2fr 1.8fr 1.8fr !important; /* 调整比例，给状态列更多空间 */
  gap: 16px !important; /* 稍微减少间距 */
  align-items: center !important;
  height: 100% !important;
  overflow: hidden !important;
}

/* 第一列：基本信息 - 三行布局 */
.compact-album-row .album-basic-info {
  display: flex !important;
  flex-direction: column !important;
  gap: 6px !important; /* 增加间距 */
  min-width: 0 !important; /* 允许收缩 */
  justify-content: flex-start !important; /* 改为顶部对齐 */
  height: 100% !important;
  padding: 2px 0 !important; /* 添加一点内边距 */
}

/* 第二列：两行布局设计 */
.compact-album-row .album-status-info {
  display: flex !important;
  flex-direction: column !important;
  gap: 8px !important;
  justify-content: space-between !important;
  height: 100% !important;
  padding: 4px 0 !important;
}

/* 第一行：发行日期 */
.compact-album-row .date-row {
  display: flex !important;
  justify-content: flex-start !important;
  align-items: center !important;
}

/* 第二行：状态徽章（左下角） */
.compact-album-row .status-badges-row {
  display: flex !important;
  gap: 6px !important;
  align-items: center !important;
  justify-content: flex-start !important; /* 左对齐 */
}

/* 第三列：描述信息 */
.compact-album-row .album-meta-info {
  display: flex !important;
  flex-direction: column !important;
  min-width: 0 !important; /* 允许收缩 */
}

.album-details {
  flex: 1;
  padding: 12px 16px; /* 减少内边距 */
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 6px; /* 减少间距 */
}

.album-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px; /* 减少间距 */
}

/* 紧凑行的标题样式 */
.compact-album-row .album-title {
  font-family: var(--garrix-font-primary, 'Montserrat', sans-serif) !important;
  font-size: 15px !important; /* 稍大一点的标题 */
  font-weight: 600 !important;
  color: #212529 !important;
  margin: 0 !important;
  line-height: 1.3 !important;
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
}

.album-title {
  font-family: var(--garrix-font-primary, 'Montserrat', sans-serif);
  font-size: 16px; /* 减少字体大小 */
  font-weight: 600;
  color: #212529;
  margin: 0;
  line-height: 1.3;
  flex: 1;
}

.album-status-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex-shrink: 0;
}

.album-status {
  padding: 4px 8px;
  font-size: 10px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-radius: 2px;
  text-align: center;
}

.material-status {
  padding: 3px 6px;
  font-size: 9px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  text-align: center;
  border: 1px solid var(--garrix-border, #dddddd);
  background: transparent;
  color: var(--garrix-text-secondary, #666666);
}

.material-status.delivered {
  background: #d4edda;
  color: #155724;
  border-color: #c3e6cb;
}

.album-status.pending {
  background: #fff3cd;
  color: #856404;
}

.album-status.approved {
  background: #d4edda;
  color: #155724;
}

.album-status.rejected {
  background: #f8d7da;
  color: #721c24;
}

/* 紧凑行的艺术家样式 */
.compact-album-row .album-artist {
  font-size: 13px !important;
  color: #6c757d !important;
  margin: 0 !important;
  font-weight: 500 !important;
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
}

.album-artist {
  font-size: 13px; /* 减少字体大小 */
  color: #6c757d;
  margin: 0;
  font-weight: 500;
}

/* 移除旧的状态徽章容器样式，使用新的非对称设计 */

/* 底部状态徽章 - 小巧精致 */
.compact-album-row .album-status {
  padding: 3px 8px !important;
  font-size: 10px !important;
  font-weight: 500 !important;
  border-radius: 12px !important;
  text-transform: uppercase !important;
  letter-spacing: 0.3px !important;
}

/* 底部物料递交状态徽章 - 与审核状态同行 */
.compact-album-row .material-status {
  padding: 3px 8px !important;
  font-size: 10px !important;
  font-weight: 500 !important;
  border-radius: 12px !important;
  text-transform: uppercase !important;
  letter-spacing: 0.3px !important;
  border: 1px solid transparent !important;
}

/* 已递交状态 */
.compact-album-row .material-status.delivered {
  background: #d1ecf1 !important;
  color: #0c5460 !important;
  border-color: #bee5eb !important;
}

/* 待递交状态 */
.compact-album-row .material-status.pending {
  background: #fff3cd !important;
  color: #856404 !important;
  border-color: #ffeaa7 !important;
}

/* 禁用状态（未审核通过时） */
.compact-album-row .material-status.disabled {
  background: #f8f9fa !important;
  color: #6c757d !important;
  border-color: #dee2e6 !important;
  opacity: 0.7 !important;
}

/* 顶部发行日期 - 突出显示 */
.compact-album-row .release-date {
  font-size: 14px !important;
  color: #212529 !important;
  font-weight: 600 !important;
  white-space: nowrap !important;
  text-align: left !important; /* 左对齐 */
}

/* 第一列第三行的发行外显信息 */
.compact-album-row .album-basic-info .display-info {
  font-size: 10px !important;
  color: #868e96 !important;
  font-weight: 500 !important;
  background: #f8f9fa !important;
  padding: 2px 6px !important;
  border-radius: 6px !important;
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  align-self: flex-start !important; /* 左对齐 */
  border: 1px solid #e9ecef !important;
}

/* 紧凑行的描述 */
.compact-album-row .album-description {
  font-size: 12px !important;
  color: #6c757d !important;
  line-height: 1.4 !important;
  margin: 0 !important;
  display: -webkit-box !important;
  -webkit-line-clamp: 2 !important; /* 显示两行 */
  line-clamp: 2 !important;
  -webkit-box-orient: vertical !important;
  overflow: hidden !important;
}

.album-description {
  font-size: 12px; /* 减少字体大小 */
  color: #6c757d;
  line-height: 1.4;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 1; /* 只显示一行 */
  line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* 移除旧的底部区域样式，因为我们重新组织了布局 */

.album-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 4px; /* 减少顶部间距 */
}

.release-date {
  font-size: 11px; /* 减少字体大小 */
  color: #868e96;
  font-weight: 500;
}

/* 紧凑行的操作区域 */
.compact-album-row .album-actions {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  width: 80px !important; /* 更小的宽度 */
  border-left: 1px solid #e9ecef !important;
  padding: 4px !important; /* 减少内边距 */
}

.compact-album-row .garrix-action-trigger {
  padding: 6px 10px !important; /* 更小的按钮 */
  font-size: 9px !important; /* 更小的字体 */
  border-radius: 2px !important;
}

.album-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100px;
  border-left: 1px solid var(--garrix-border, #dddddd);
}

.garrix-action-trigger {
  padding: 16px 20px;
  border: 1px solid var(--garrix-black, #000000);
  background: transparent;
  color: var(--garrix-black, #000000);
  font-family: var(--garrix-font-primary, 'Montserrat', sans-serif);
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  cursor: pointer;
  transition: all 0.3s ease;
  border-radius: 0;
  width: 100%;
}

.garrix-action-trigger:hover {
  background: var(--garrix-black, #000000);
  color: var(--garrix-white, #ffffff);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .main-content {
    grid-template-columns: 1fr;
  }

  .garrix-header {
    padding: 16px 20px;
  }

  .header-content {
    flex-direction: column;
    gap: 16px;
    align-items: flex-start;
  }

  .garrix-input {
    width: 100%;
  }

  .albums-section {
    padding: 20px;
  }

  .garrix-album-card {
    flex-direction: column;
  }

  .album-select {
    width: 100%;
    padding: 12px 0;
    border-right: none;
    border-bottom: 1px solid var(--garrix-border, #dddddd);
  }

  .album-cover {
    width: 100px;
    height: 100px;
  }

  .album-actions {
    width: 100%;
    border-left: none;
    border-top: 1px solid var(--garrix-border, #dddddd);
  }

  .category-list {
    flex-direction: column;
  }

  .garrix-category-btn {
    border-right: none;
    border-bottom: 1px solid var(--garrix-black, #000000);
  }

  .garrix-category-btn:last-child {
    border-bottom: none;
  }

  .batch-buttons {
    flex-wrap: wrap;
  }
}

/* 清理完成 */

/* 抽屉样式保留 - 已在前面定义 */



/* Garrix右侧面板样式 */
.garrix-right-panel {
  background: var(--garrix-white, #ffffff);
  border-left: 1px solid var(--garrix-border, #dddddd);
  padding: 32px;
  display: flex;
  flex-direction: column;
  gap: 32px;
}

/* 区域标题 */
.section-title {
  font-family: var(--garrix-font-primary, 'Montserrat', sans-serif);
  font-size: 14px;
  font-weight: 600;
  color: var(--garrix-black, #000000);
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--garrix-border, #dddddd);
  position: relative;
}

.section-title::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 0;
  width: 40px;
  height: 1px;
  background: var(--garrix-black, #000000);
}



/* Mini统计概览区域 */
.mini-stats-section {
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  padding: 16px;
  background: #ffffff;
  margin-bottom: 20px;
}

.mini-stats-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  font-family: 'Montserrat', sans-serif;
}

.mini-stats-title {
  font-size: 14px;
  font-weight: 600;
  color: #1a1a1a;
}

.mini-stats-period {
  font-size: 12px;
  color: #666666;
}

.mini-stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 20px;
}

.mini-stat-item {
  text-align: center;
  font-family: 'Montserrat', sans-serif;
}

.mini-stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #1a1a1a;
  line-height: 1;
  margin-bottom: 4px;
}

.mini-stat-label {
  font-size: 12px;
  color: #666666;
  font-weight: 500;
}

.mini-chart-section {
  border-top: 1px solid #f0f0f0;
  padding-top: 16px;
}

.mini-chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  font-family: 'Montserrat', sans-serif;
}

.mini-chart-title {
  font-size: 12px;
  font-weight: 600;
  color: #1a1a1a;
}

.mini-chart-period {
  font-size: 11px;
  color: #666666;
}

.mini-chart-container {
  height: 60px;
  position: relative;
}

.mini-trend-chart {
  width: 100%;
  height: 100%;
}

/* Garrix风格分页控件样式 */
.pagination-container {
  padding: 24px 32px;
  border-top: 1px solid var(--garrix-border, #dddddd);
  background: var(--garrix-white, #ffffff);
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-family: var(--garrix-font-primary, 'Montserrat', sans-serif);
}

.pagination-info {
  font-size: 12px;
  font-weight: 500;
  color: var(--garrix-text-secondary, #666666);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.pagination-controls {
  display: flex;
  align-items: center;
  gap: 0;
  border: 1px solid var(--garrix-black, #000000);
}

.pagination-btn {
  padding: 8px 16px;
  border: none;
  background: transparent;
  color: var(--garrix-black, #000000);
  font-family: var(--garrix-font-primary, 'Montserrat', sans-serif);
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  cursor: pointer;
  transition: all 0.3s ease;
  border-right: 1px solid var(--garrix-black, #000000);
}

.pagination-btn:last-child {
  border-right: none;
}

.pagination-btn:hover:not(:disabled) {
  background: var(--garrix-gray, #f5f5f5);
}

.pagination-btn:disabled {
  color: var(--garrix-text-light, #cccccc);
  cursor: not-allowed;
  background: var(--garrix-gray, #f5f5f5);
}

.page-numbers {
  display: flex;
  gap: 0;
}

.page-number {
  padding: 8px 16px;
  border: none;
  background: transparent;
  color: var(--garrix-black, #000000);
  font-family: var(--garrix-font-primary, 'Montserrat', sans-serif);
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  border-right: 1px solid var(--garrix-black, #000000);
  min-width: 40px;
  text-align: center;
}

.page-number:last-child {
  border-right: none;
}

.page-number:hover {
  background: var(--garrix-gray, #f5f5f5);
}

.page-number.active {
  background: var(--garrix-black, #000000);
  color: var(--garrix-white, #ffffff);
}

/* Garrix风格发行日历样式 */
.release-calendar-section {
  border: 1px solid var(--garrix-border, #dddddd);
  background: var(--garrix-white, #ffffff);
  margin: 32px 20px;
  overflow: hidden;
}

.calendar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 32px;
  border-bottom: 1px solid var(--garrix-border, #dddddd);
  background: var(--garrix-white, #ffffff);
}

.calendar-title {
  font-family: var(--garrix-font-primary, 'Montserrat', sans-serif);
  font-size: 18px;
  font-weight: 700;
  color: var(--garrix-black, #000000);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.calendar-controls {
  display: flex;
  align-items: center;
  gap: 24px;
}

.view-switcher {
  display: flex;
  gap: 0;
  border: 1px solid var(--garrix-black, #000000);
}

.calendar-view-btn {
  padding: 8px 16px;
  border: none;
  background: transparent;
  color: var(--garrix-black, #000000);
  font-family: var(--garrix-font-primary, 'Montserrat', sans-serif);
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  cursor: pointer;
  transition: all 0.3s ease;
  border-right: 1px solid var(--garrix-black, #000000);
}

.calendar-view-btn:last-child {
  border-right: none;
}

.calendar-view-btn:hover {
  background: var(--garrix-gray, #f5f5f5);
}

.calendar-view-btn.active {
  background: var(--garrix-black, #000000);
  color: var(--garrix-white, #ffffff);
}

.calendar-navigation {
  display: flex;
  align-items: center;
  gap: 16px;
}

.calendar-nav-btn {
  width: 32px;
  height: 32px;
  border: 1px solid var(--garrix-black, #000000);
  background: transparent;
  color: var(--garrix-black, #000000);
  font-family: var(--garrix-font-primary, 'Montserrat', sans-serif);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.calendar-nav-btn:hover {
  background: var(--garrix-black, #000000);
  color: var(--garrix-white, #ffffff);
}

.current-period {
  font-family: var(--garrix-font-primary, 'Montserrat', sans-serif);
  font-size: 12px;
  font-weight: 600;
  color: var(--garrix-black, #000000);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  min-width: 120px;
  text-align: center;
}

/* Garrix风格周视图样式 */
.week-calendar {
  border: 1px solid var(--garrix-border, #dddddd);
  background: var(--garrix-white, #ffffff);
}

.week-header {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  border-bottom: 1px solid var(--garrix-border, #dddddd);
  background: var(--garrix-gray, #f5f5f5);
}

.week-day-header {
  padding: 16px 12px;
  text-align: center;
  border-right: 1px solid var(--garrix-border, #dddddd);
}

.week-day-header:last-child {
  border-right: none;
}

.day-number {
  font-family: var(--garrix-font-primary, 'Montserrat', sans-serif);
  font-size: 18px;
  font-weight: 700;
  color: var(--garrix-black, #000000);
  line-height: 1;
  margin-bottom: 4px;
}

.day-name {
  font-family: var(--garrix-font-primary, 'Montserrat', sans-serif);
  font-size: 10px;
  font-weight: 500;
  color: var(--garrix-text-secondary, #666666);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.week-content {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  min-height: 300px;
}

.week-day-column {
  border-right: 1px solid var(--garrix-border, #dddddd);
  padding: 16px 12px;
}

.week-day-column:last-child {
  border-right: none;
}

.week-event {
  position: relative;
  padding: 12px;
  border: 1px solid var(--garrix-border, #dddddd);
  background: var(--garrix-white, #ffffff);
  cursor: pointer;
  transition: all 0.3s ease;
  margin-bottom: 8px;
}

.week-event:hover {
  border-color: var(--garrix-black, #000000);
  transform: translateY(-1px);
}

.week-event::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: var(--garrix-black, #000000);
}

.week-event.pending::before {
  background: #ffc107;
}

.week-event.approved::before {
  background: #28a745;
}

.week-event.rejected::before {
  background: #dc3545;
}



.event-title {
  font-family: var(--garrix-font-primary, 'Montserrat', sans-serif);
  font-size: 12px;
  font-weight: 600;
  color: var(--garrix-black, #000000);
  margin-bottom: 4px;
  line-height: 1.2;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.event-artist {
  font-size: 10px;
  color: var(--garrix-text-secondary, #666666);
  line-height: 1.2;
  margin-bottom: 4px;
}

.event-status {
  font-family: var(--garrix-font-primary, 'Montserrat', sans-serif);
  font-size: 8px;
  color: var(--garrix-text-secondary, #666666);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 500;
}

.no-events {
  text-align: center;
  padding: 32px 16px;
  color: var(--garrix-text-secondary, #666666);
  font-family: var(--garrix-font-primary, 'Montserrat', sans-serif);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Garrix风格月视图样式 */
.month-calendar {
  border: 1px solid var(--garrix-border, #dddddd);
  background: var(--garrix-white, #ffffff);
}

.month-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  border-bottom: 1px solid var(--garrix-border, #dddddd);
  background: var(--garrix-gray, #f5f5f5);
}

.month-weekday {
  padding: 12px;
  text-align: center;
  font-family: var(--garrix-font-primary, 'Montserrat', sans-serif);
  font-size: 11px;
  font-weight: 600;
  color: var(--garrix-black, #000000);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-right: 1px solid var(--garrix-border, #dddddd);
}

.month-weekday:last-child {
  border-right: none;
}

.month-days {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  grid-template-rows: repeat(6, 1fr);
}

.month-day {
  min-height: 100px;
  border-right: 1px solid var(--garrix-border, #dddddd);
  border-bottom: 1px solid var(--garrix-border, #dddddd);
  padding: 8px;
  background: var(--garrix-white, #ffffff);
  transition: all 0.3s ease;
}

.month-day:nth-child(7n) {
  border-right: none;
}

.month-day:hover {
  background: var(--garrix-gray, #f5f5f5);
}

.month-day.other-month {
  background: var(--garrix-gray, #f5f5f5);
  opacity: 0.5;
}

.month-day.today {
  background: var(--garrix-black, #000000);
  color: var(--garrix-white, #ffffff);
}

.month-day.today .day-number {
  color: var(--garrix-white, #ffffff);
}

.month-day.has-events {
  border-color: var(--garrix-black, #000000);
}

.day-number {
  font-family: var(--garrix-font-primary, 'Montserrat', sans-serif);
  font-size: 14px;
  font-weight: 600;
  color: var(--garrix-black, #000000);
  margin-bottom: 8px;
}

.day-events {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.month-event {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 4px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 9px;
  color: var(--garrix-black, #000000);
}

.month-event:hover {
  background: rgba(0, 0, 0, 0.1);
}

.month-event::before {
  content: '';
  width: 6px;
  height: 6px;
  background: var(--garrix-black, #000000);
  flex-shrink: 0;
}

.month-event.pending::before {
  background: #ffc107;
}

.month-event.approved::before {
  background: #28a745;
}

.month-event.rejected::before {
  background: #dc3545;
}

.more-events {
  font-size: 8px;
  color: var(--garrix-text-secondary, #666666);
  text-align: center;
  padding: 2px;
  font-family: var(--garrix-font-primary, 'Montserrat', sans-serif);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-top: 2px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .mini-stats-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }

  .mini-stat-value {
    font-size: 20px;
  }

  .mini-chart-container {
    height: 50px;
  }

  .pagination-container {
    flex-direction: column;
    gap: 16px;
    padding: 20px;
  }

  .pagination-controls {
    flex-direction: column;
    gap: 8px;
  }

  .pagination-btn,
  .page-number {
    border: 1px solid var(--garrix-black, #000000);
    border-right: none;
  }

  .release-calendar-section {
    margin: 20px;
  }

  .calendar-header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
    padding: 20px;
  }

  .calendar-controls {
    flex-direction: column;
    gap: 16px;
  }

  /* 日历响应式设计 */
  .week-content {
    grid-template-columns: 1fr;
    gap: 1px;
    background: var(--garrix-border, #dddddd);
  }

  .week-day-column {
    border-right: none;
    border-bottom: 1px solid var(--garrix-border, #dddddd);
    background: var(--garrix-white, #ffffff);
  }

  .week-day-column:last-child {
    border-bottom: none;
  }

  .week-header {
    display: none; /* 在移动端隐藏周标题 */
  }

  .week-day-column::before {
    content: attr(data-day);
    display: block;
    font-family: var(--garrix-font-primary, 'Montserrat', sans-serif);
    font-size: 12px;
    font-weight: 600;
    color: var(--garrix-black, #000000);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 8px;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--garrix-border, #dddddd);
  }

  .month-days {
    grid-template-columns: 1fr;
    gap: 1px;
    background: var(--garrix-border, #dddddd);
  }

  .month-day {
    border-right: none;
    border-bottom: none;
    background: var(--garrix-white, #ffffff);
    min-height: 80px;
  }

  .month-weekdays {
    display: none; /* 在移动端隐藏星期标题 */
  }
}

.garrix-stats-grid {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.garrix-stat-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px;
  border: 1px solid var(--garrix-border, #dddddd);
  transition: all 0.3s ease;
}

.garrix-stat-card:hover {
  border-color: var(--garrix-black, #000000);
}

.stat-value {
  font-family: var(--garrix-font-primary, 'Montserrat', sans-serif);
  font-size: 32px;
  font-weight: 700;
  color: var(--garrix-black, #000000);
  line-height: 1;
}

.stat-label {
  font-family: var(--garrix-font-primary, 'Montserrat', sans-serif);
  font-size: 10px;
  font-weight: 500;
  color: var(--garrix-text-secondary, #666666);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.stat-bar {
  height: 2px;
  background: var(--garrix-border, #dddddd);
  position: relative;
  overflow: hidden;
}

.stat-fill {
  height: 100%;
  background: var(--garrix-black, #000000);
  transition: width 0.5s ease;
}

.garrix-stat-card.pending .stat-fill {
  background: #ffc107;
}

.garrix-stat-card.approved .stat-fill {
  background: #28a745;
}

.garrix-stat-card.rejected .stat-fill {
  background: #dc3545;
}

/* 图表分析区域 */
.garrix-charts-section {
  border: 1px solid var(--garrix-border, #dddddd);
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.garrix-chart-card {
  border: 1px solid var(--garrix-border, #dddddd);
  padding: 16px;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--garrix-border, #dddddd);
}

.chart-title {
  font-family: var(--garrix-font-primary, 'Montserrat', sans-serif);
  font-size: 12px;
  font-weight: 600;
  color: var(--garrix-black, #000000);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.chart-period,
.chart-value {
  font-family: var(--garrix-font-primary, 'Montserrat', sans-serif);
  font-size: 10px;
  font-weight: 500;
  color: var(--garrix-text-secondary, #666666);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.chart-content {
  position: relative;
  height: 120px;
}

.garrix-line-chart,
.garrix-donut-chart {
  width: 100% !important;
  height: 100% !important;
}

.garrix-progress-chart {
  position: relative;
  width: 120px;
  height: 120px;
  margin: 0 auto;
}

.progress-center {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
}

.progress-percentage {
  font-family: var(--garrix-font-primary, 'Montserrat', sans-serif);
  font-size: 24px;
  font-weight: 700;
  color: var(--garrix-black, #000000);
  line-height: 1;
}

.progress-label {
  font-family: var(--garrix-font-primary, 'Montserrat', sans-serif);
  font-size: 8px;
  font-weight: 500;
  color: var(--garrix-text-secondary, #666666);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-top: 4px;
}

/* 物料递交管理区域 */
.garrix-material-section {
  border: 1px solid var(--garrix-border, #dddddd);
  padding: 24px;
  background: var(--garrix-white, #ffffff);
  border-radius: 4px;
}

.alert-count {
  background: var(--garrix-black, #000000);
  color: var(--garrix-white, #ffffff);
  padding: 2px 6px;
  font-size: 8px;
  font-weight: 600;
  margin-left: 8px;
  border-radius: 2px;
}

.material-content {
  margin-top: 16px;
}

.no-materials {
  text-align: center;
  padding: 32px 16px;
  color: var(--garrix-text-secondary, #666666);
}

.no-materials-icon {
  font-size: 32px;
  color: var(--garrix-success, #28a745);
  margin-bottom: 8px;
}

.no-materials-text {
  font-size: 14px;
  font-weight: 500;
}

.garrix-material-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.garrix-material-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border: 1px solid var(--garrix-border, #dddddd);
  background: var(--garrix-gray, #f8f9fa);
  cursor: pointer;
  transition: all 0.2s ease;
}

.garrix-material-item:hover {
  background: var(--garrix-white, #ffffff);
  border-color: var(--garrix-black, #000000);
}

.material-info {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0; /* 确保flex子元素可以收缩 */
  max-width: calc(100% - 120px); /* 为按钮留出空间 */
}

.material-cover {
  width: 40px;
  height: 40px;
  border-radius: 2px;
  overflow: hidden;
  flex-shrink: 0;
}

.material-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.material-details {
  flex: 1;
  min-width: 0; /* 允许收缩 */
  overflow: hidden; /* 确保内容不会溢出 */
}

.material-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--garrix-black, #000000);
  margin-bottom: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.material-artist {
  font-size: 11px;
  color: var(--garrix-text-secondary, #666666);
  margin-bottom: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%; /* 确保不超出父容器 */
}

.material-date {
  font-size: 10px;
  color: var(--garrix-text-light, #999999);
}

.garrix-material-btn {
  padding: 6px 12px;
  font-size: 10px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  background: var(--garrix-black, #000000);
  color: var(--garrix-white, #ffffff);
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.garrix-material-btn:hover {
  background: var(--garrix-dark, #333333);
}

.more-materials {
  margin-top: 8px;
  text-align: center;
}

.view-all-btn {
  padding: 8px 16px;
  font-size: 11px;
  font-weight: 500;
  color: var(--garrix-black, #000000);
  background: transparent;
  border: 1px solid var(--garrix-border, #dddddd);
  cursor: pointer;
  transition: all 0.2s ease;
  width: 100%;
}

.view-all-btn:hover {
  background: var(--garrix-gray, #f8f9fa);
  border-color: var(--garrix-black, #000000);
}







/* 响应式设计更新 */
@media (max-width: 768px) {
  .main-content {
    grid-template-columns: 1fr;
  }

  .garrix-right-panel {
    order: -1;
    border-left: none;
    border-bottom: 1px solid var(--garrix-border, #dddddd);
    padding: 20px;
  }

  .garrix-stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* Garrix 简洁抽屉样式 */
.garrix-drawer {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 9999;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.garrix-drawer.visible {
  pointer-events: all;
  opacity: 1;
}

.drawer-backdrop {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
}

.drawer-panel {
  position: absolute;
  right: 0;
  top: 0;
  width: 480px;
  height: 100%;
  background: #ffffff;
  box-shadow: -4px 0 20px rgba(0, 0, 0, 0.1);
  transform: translateX(100%);
  transition: transform 0.3s ease;
  display: flex;
  flex-direction: column;
}

.garrix-drawer.visible .drawer-panel {
  transform: translateX(0);
}

/* 头部样式 */
.drawer-header {
  padding: 24px;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #ffffff;
}

.header-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.album-number {
  font-size: 24px;
  font-weight: 700;
  color: #000000;
  letter-spacing: -0.3px;
}

.album-artist {
  font-size: 13px;
  font-weight: 500;
  color: #666666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.close-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: #f5f5f5;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #666666;
  font-size: 18px;
  font-weight: 300;
}

.close-btn:hover {
  background: #000000;
  color: #ffffff;
}

/* 内容样式 */
.drawer-content {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
}

/* 专辑信息 */
.album-info {
  margin-bottom: 32px;
}

.album-cover {
  position: relative;
  width: 100%;
  height: 240px;
  border-radius: 6px;
  overflow: hidden;
  margin-bottom: 16px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}

.album-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.status-badge {
  position: absolute;
  top: 12px;
  right: 12px;
  padding: 6px 12px;
  border-radius: 16px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  backdrop-filter: blur(4px);
}

.status-badge.pending {
  background: rgba(255, 193, 7, 0.9);
  color: #000;
}

.status-badge.approved {
  background: rgba(40, 167, 69, 0.9);
  color: #fff;
}

.status-badge.rejected {
  background: rgba(220, 53, 69, 0.9);
  color: #fff;
}

.album-meta {
  text-align: left;
}

.album-title {
  font-size: 18px;
  font-weight: 700;
  color: #000000;
  margin: 0 0 6px 0;
  line-height: 1.2;
}

.artist-name {
  font-size: 14px;
  font-weight: 500;
  color: #666666;
  margin: 0 0 8px 0;
}

.meta-info {
  font-size: 12px;
  color: #999999;
}

/* 递交状态区域 */
.delivery-section {
  margin-bottom: 24px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #000000;
  margin: 0 0 12px 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.delivery-toggle {
  background: #f8f8f8;
  border-radius: 8px;
  padding: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.toggle-info {
  flex: 1;
}

.toggle-label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #000000;
  margin-bottom: 2px;
}

.toggle-desc {
  font-size: 12px;
  color: #666666;
}

.delivery-timestamp {
  font-size: 12px;
  color: #999999;
  margin-top: 8px;
  padding: 8px 12px;
  background: #ffffff;
  border-radius: 6px;
  border: 1px solid #e8e8e8;
}

/* 审核操作区域 */
.review-section {
  margin-bottom: 24px;
}

.review-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.approve-btn {
  background: #22c55e !important;
  color: #ffffff !important;
  border-color: #22c55e !important;
}

.approve-btn:hover:not(:disabled) {
  background: #16a34a !important;
  border-color: #16a34a !important;
}

.reject-btn {
  background: #ef4444 !important;
  color: #ffffff !important;
  border-color: #ef4444 !important;
}

.reject-btn:hover:not(:disabled) {
  background: #dc2626 !important;
  border-color: #dc2626 !important;
}

/* 操作区域 */
.actions-section {
  margin-bottom: 24px;
}

.action-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.action-button {
  padding: 16px 12px;
  border: 1px solid #e0e0e0;
  background: #ffffff;
  color: #000000;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 13px;
  font-weight: 500;
  border-radius: 6px;
  text-align: center;
  min-height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-button:hover:not(:disabled) {
  background: #000000;
  color: #ffffff;
  border-color: #000000;
}

.action-button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.view-btn {
  border-color: #000000;
}

.download-btn {
  border-color: #666666;
  color: #666666;
}

.download-btn:hover:not(:disabled) {
  background: #666666;
  color: #ffffff;
  border-color: #666666;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .drawer-panel {
    width: 100%;
  }

  .drawer-header {
    padding: 24px 20px 20px;
  }

  .drawer-body {
    padding: 0 20px 20px;
  }

  .album-cover {
    height: 240px;
  }

  .action-buttons {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .action-btn {
    min-height: 56px;
    padding: 16px 12px;
    font-size: 12px;
  }
}

/* Garrix 拒绝理由输入框样式 */
.garrix-reject-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 10000; /* 比抽屉更高的层级 */
  visibility: hidden;
  opacity: 0;
  transition: all 0.3s ease;
}

.garrix-reject-modal.visible {
  visibility: visible;
  opacity: 1;
}

.modal-backdrop {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
}

.modal-panel {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 480px;
  max-width: 90vw;
  background: #ffffff;
  border-radius: 8px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 24px 0;
  border-bottom: 1px solid #f0f0f0;
  margin-bottom: 24px;
}

.modal-title {
  font-size: 18px;
  font-weight: 600;
  color: #000000;
  margin: 0;
}

.modal-content {
  padding: 0 24px;
}

.album-preview {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
  padding: 16px;
  background: #f8f8f8;
  border-radius: 6px;
}

.album-preview img {
  width: 60px;
  height: 60px;
  border-radius: 4px;
  object-fit: cover;
}

.album-preview .album-info h4 {
  margin: 0 0 4px 0;
  font-size: 14px;
  font-weight: 600;
  color: #000000;
}

.album-preview .album-info p {
  margin: 0;
  font-size: 12px;
  color: #666666;
}

.input-section {
  margin-bottom: 24px;
}

.input-label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #000000;
  margin-bottom: 8px;
}

.reject-textarea {
  width: 100%;
  min-height: 100px;
  padding: 12px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  font-size: 14px;
  line-height: 1.5;
  resize: vertical;
  font-family: inherit;
  transition: border-color 0.2s ease;
}

.reject-textarea:focus {
  outline: none;
  border-color: #000000;
}

.reject-textarea::placeholder {
  color: #999999;
}

.modal-actions {
  display: flex;
  gap: 12px;
  padding: 24px;
  border-top: 1px solid #f0f0f0;
  justify-content: flex-end;
}

.modal-btn {
  padding: 12px 24px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.cancel-btn {
  background: #ffffff;
  color: #666666;
}

.cancel-btn:hover {
  background: #f8f8f8;
  border-color: #cccccc;
}

.confirm-btn {
  background: #ef4444;
  color: #ffffff;
  border-color: #ef4444;
}

.confirm-btn:hover:not(:disabled) {
  background: #dc2626;
  border-color: #dc2626;
}

.confirm-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 拒绝对话框样式 */
.reject-dialog-content {
  padding: 16px 0;
}

.album-preview {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
  padding: 16px;
  background: var(--garrix-gray, #f8f8f8);
  border-radius: 8px;
}

.album-preview img {
  width: 60px;
  height: 60px;
  border-radius: 6px;
  object-fit: cover;
}

.album-preview .album-info h4 {
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--garrix-text, #000000);
}

.album-preview .album-info p {
  margin: 0;
  font-size: 14px;
  color: var(--garrix-text-secondary, #666666);
}

.dialog-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

/* 确保拒绝对话框在最高层级 */
.reject-dialog {
  z-index: 10002 !important;
}

/* 初始化加载样式 */
.initialization-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 50vh;
  color: var(--garrix-text-secondary, #666666);
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid var(--garrix-primary, #000000);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* 组件销毁状态样式 */
.workbench-destroyed {
  display: none;
}

/* 根容器样式 */
.admin-workbench-container {
  width: 100%;
  height: 100%;
  position: relative;
}

/* 统计数据加载状态 */
.mini-stats-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  color: var(--garrix-text-secondary, #666666);
  font-size: 14px;
}
</style>
