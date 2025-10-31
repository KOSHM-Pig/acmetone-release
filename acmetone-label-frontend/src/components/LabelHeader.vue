<template>
  <header class="label-header">
    <div class="header-container">
      <!-- 菜单图标 -->
      <div class="menu-icon" @click="toggleMenu">
        <div class="menu-lines">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>

      <!-- 默认Header内容 -->
      <transition name="header-fade" mode="out-in">
        <div v-if="!menuVisible" class="header-default-content">
          <!-- Logo区域 -->
          <div class="logo-container">
            <router-link to="/dashboard" class="logo">
              <span class="logo-text">ACMETONE</span>
              <span class="logo-sub">LABEL</span>
            </router-link>
          </div>

          <!-- 中间状态信息 - 完全参考AdminStatusBar设计 -->
          <div class="admin-status-bar">
            <!-- 关键数据 -->
            <div class="status-item metrics">
              <span class="metric-mini" :title="`今日投稿: ${todayStats.submissions || 0} 个`">
                <span class="metric-value-mini">{{ formattedSubmissions }}</span>
                <span class="metric-label-mini">投稿</span>
              </span>
              <span class="metric-mini" :title="`待审核项目: ${todayStats.pending || 0} 个`">
                <span class="metric-value-mini">{{ formattedPending }}</span>
                <span class="metric-label-mini">待审核</span>
              </span>
              <span class="metric-mini" :title="`本月发行: ${todayStats.monthly || 0} 个`">
                <span class="metric-value-mini">{{ formattedMonthly }}</span>
                <span class="metric-label-mini">本月发行</span>
              </span>
            </div>

            <!-- 迷你图表 -->
            <div class="status-item chart" title="活动趋势 (过去7天)">
              <canvas ref="defaultMiniChart" class="mini-chart-inline"></canvas>
            </div>

            <!-- Mini日历 -->
            <div class="status-item mini-calendar">
              <div class="mini-calendar-days">
                <div
                  v-for="day in weekDays"
                  :key="day.date"
                  class="mini-day"
                  :class="{
                    'has-activity': day.hasActivity,
                    'today': day.isToday
                  }"
                  :title="getDayTooltip(day)"
                >
                  {{ day.number }}
                </div>
              </div>
            </div>
          </div>

          <!-- 右侧用户控制区 -->
          <div class="user-controls">
            <div class="user-info" v-if="!loading">
              <span class="user-role">{{ roleDisplayName }}</span>
              <span class="user-name">{{ displayName }}</span>
            </div>

            <!-- 加载状态 -->
            <div v-if="loading" class="user-info">
              <span class="user-role">加载中...</span>
              <span class="user-name">请稍候</span>
            </div>

            <!-- 用户头像和下拉菜单 -->
            <div class="user-dropdown" @click="toggleDropdown">
              <div class="user-avatar">
                <img v-if="avatarUrl" :src="avatarUrl" :alt="displayName" />
                <div v-else class="avatar-placeholder">{{ displayName.charAt(0) }}</div>
              </div>

              <!-- 下拉菜单 -->
              <div v-if="dropdownVisible" class="dropdown-menu" @click.stop>
                <div class="dropdown-item" @click="goToProfile">
                  <span>个人资料</span>
                </div>
                <div class="dropdown-item" @click="goToSettings">
                  <span>设置</span>
                </div>
                <div class="dropdown-divider"></div>
                <div class="dropdown-item logout" @click="handleLogout">
                  <span>退出登录</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 菜单内容 - Martin Garrix风格的功能菜单 -->
        <div v-else class="header-menu-content">
          <div class="menu-grid">
            <!-- 主要功能区 -->
            <div class="menu-section primary-functions">
              <div class="section-title">核心功能</div>
              <div class="menu-items">
                <div
                  v-for="menuItem in primaryMenuItems"
                  :key="menuItem.key"
                  class="menu-item-card"
                  @click="navigateToModule(menuItem.key)"
                  :title="`${menuItem.label} - ${menuItem.subtitle}`"
                >
                  <div class="menu-item-icon">
                    <el-icon><component :is="menuItem.icon" /></el-icon>
                  </div>
                  <div class="menu-item-content">
                    <div class="menu-item-label">{{ menuItem.label }}</div>
                    <div class="menu-item-subtitle">{{ menuItem.subtitle }}</div>
                  </div>
                  <div v-if="menuItem.badge" class="menu-item-badge">{{ menuItem.badge }}</div>
                </div>
              </div>
            </div>

            <!-- 次要功能区 -->
            <div class="menu-section secondary-functions">
              <div class="section-title">工具与设置</div>
              <div class="menu-items">
                <div
                  v-for="menuItem in secondaryMenuItems"
                  :key="menuItem.key"
                  class="menu-item-card secondary"
                  @click="navigateToModule(menuItem.key)"
                  :title="`${menuItem.label} - ${menuItem.subtitle}`"
                >
                  <div class="menu-item-icon">
                    <el-icon><component :is="menuItem.icon" /></el-icon>
                  </div>
                  <div class="menu-item-content">
                    <div class="menu-item-label">{{ menuItem.label }}</div>
                    <div class="menu-item-subtitle">{{ menuItem.subtitle }}</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 快捷操作区 -->
            <div class="menu-section quick-actions">
              <div class="section-title">快捷操作</div>
              <div class="quick-action-buttons">
                <button class="quick-btn primary" @click="quickCreateAlbum" title="创建新专辑">
                  <span class="quick-icon">
                    <el-icon><Plus /></el-icon>
                  </span>
                  <span>新专辑</span>
                </button>
                <button class="quick-btn secondary" @click="quickReviewSubmissions" title="快速审核">
                  <span class="quick-icon">
                    <el-icon><Right /></el-icon>
                  </span>
                  <span>快审核</span>
                </button>
                <button class="quick-btn secondary" @click="quickViewStats" title="查看统计">
                  <span class="quick-icon">
                    <el-icon><TrendCharts /></el-icon>
                  </span>
                  <span>数据</span>
                </button>
              </div>
            </div>

            <!-- 状态信息区 -->
            <div class="menu-section status-info">
              <div class="section-title">实时状态</div>
              <div class="status-cards">
                <div class="status-card">
                  <div class="status-number">{{ todayStats.submissions }}</div>
                  <div class="status-label">今日投稿</div>
                </div>
                <div class="status-card urgent" v-if="todayStats.pending > 0">
                  <div class="status-number">{{ todayStats.pending }}</div>
                  <div class="status-label">待处理</div>
                </div>
                <div class="status-card">
                  <div class="status-number">{{ todayStats.monthly }}</div>
                  <div class="status-label">本月发行</div>
                </div>
              </div>
              
              <!-- 迷你图表 -->
              <div class="mini-chart-container" title="活动趋势 (过去7天)">
                <canvas ref="miniChart" class="mini-chart"></canvas>
              </div>
            </div>
          </div>
        </div>
      </transition>
    </div>
  </header>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElIcon } from 'element-plus'
import { DataBoard, Upload, Headset, User, TrendCharts, Picture, Flag, UserFilled, Setting, List, CircleCheck, PieChart, Document, ChatLineRound, Folder, CopyDocument, PictureRounded, Star, FolderOpened, Promotion, CollectionTag, Plus, Right } from '@element-plus/icons-vue'
import LabelService from '@/services/LabelService'
import UserService from '@/services/UserService'
import OnboardingService from '@/services/OnboardingService'

const props = defineProps({
  userRole: {
    type: String,
    default: ''
  }
})

const router = useRouter()
const dropdownVisible = ref(false)
const loading = ref(true)
const menuVisible = ref(false)

// 迷你图表和日历相关数据
const miniChart = ref(null)
const defaultMiniChart = ref(null) // 默认状态的图表
const weekDays = ref([])
const chartData = ref([])
const currentDate = ref(new Date())

// 用户基本信息（从acmetone-backend获取）
const userInfo = ref({
  id: null,
  username: '',
  nickname: '',
  avatar: '',
  email: ''
})

// 厂牌角色信息（从acmetone-label-backend获取）
const labelRole = ref({
  role: '',
  labelId: null,
  isVerified: false,
  status: ''
})

// 厂牌基本信息
const labelInfo = ref({
  chineseName: '',
  englishName: '',
  id: null
})

// 今日统计数据（模拟数据，实际应该从API获取）
const todayStats = ref({
  submissions: 0,
  pending: 0,
  monthly: 0
})

// 计算属性
const displayName = computed(() => {
  return UserService.getDisplayName(userInfo.value)
})

const avatarUrl = computed(() => {
  return UserService.getAvatarUrl(userInfo.value.avatar)
})

const roleDisplayName = computed(() => {
  const roleNames = {
    'owner': '主理人',
    'reviewer': '审核',
    'designer': '美工',
    'copywriter': '文案'
  }

  let roleName = ''
  if (props.userRole) {
    roleName = props.userRole
  } else {
    roleName = roleNames[labelRole.value.role] || '用户'
  }

  // 在角色前面加上厂牌英文名
  const labelEnglishName = labelInfo.value.englishName
  const labelChineseName = labelInfo.value.chineseName

  console.log('[LabelHeader] roleDisplayName计算:', {
    englishName: labelEnglishName,
    chineseName: labelChineseName,
    roleName: roleName,
    labelInfo: labelInfo.value
  })

  if (labelEnglishName) {
    return `${labelEnglishName} ${roleName}`
  }

  return roleName
})

// 根据角色获取菜单项
const getMenuItemsByRole = (role) => {
  const menuConfigs = {
    'owner': [
      { key: 'dashboard', icon: 'DataBoard', label: '仪表盘', badge: null, subtitle: 'Dashboard' },
      { key: 'submissions', icon: 'Upload', label: '投稿管理', badge: todayStats.value.pending, subtitle: 'Submissions' },
      { key: 'releases', icon: 'Headset', label: '发行管理', badge: null, subtitle: 'Releases' },
      { key: 'artists', icon: 'User', label: '艺人管理', badge: null, subtitle: 'Artists' },
      { key: 'analytics', icon: 'TrendCharts', label: '数据分析', badge: null, subtitle: 'Analytics' },
      { key: 'showcase', icon: 'Picture', label: '厂牌展示', badge: null, subtitle: 'Showcase' },
      { key: 'campaigns', icon: 'Flag', label: '征稿活动', badge: null, subtitle: 'Campaigns' },
      { key: 'team', icon: 'UserFilled', label: '团队管理', badge: null, subtitle: 'Team' },
      { key: 'settings', icon: 'Setting', label: '厂牌设置', badge: null, subtitle: 'Settings' }
    ],
    'reviewer': [
      { key: 'dashboard', icon: 'DataBoard', label: '审核台', badge: null, subtitle: 'Review Panel' },
      { key: 'queue', icon: 'List', label: '审核队列', badge: todayStats.value.pending, subtitle: 'Queue' },
      { key: 'reviewed', icon: 'CircleCheck', label: '已审核', badge: null, subtitle: 'Reviewed' },
      { key: 'stats', icon: 'PieChart', label: '审核统计', badge: null, subtitle: 'Statistics' },
      { key: 'guidelines', icon: 'Document', label: '审核指南', badge: null, subtitle: 'Guidelines' },
      { key: 'feedback', icon: 'ChatLineRound', label: '反馈中心', badge: null, subtitle: 'Feedback' },
      { key: 'settings', icon: 'Setting', label: '设置', badge: null, subtitle: 'Settings' }
    ],
    'designer': [
      { key: 'dashboard', icon: 'DataBoard', label: '设计台', badge: null, subtitle: 'Design Panel' },
      { key: 'tasks', icon: 'List', label: '设计任务', badge: null, subtitle: 'Tasks' },
      { key: 'library', icon: 'Folder', label: '作品库', badge: null, subtitle: 'Library' },
      { key: 'templates', icon: 'CopyDocument', label: '模板管理', badge: null, subtitle: 'Templates' },
      { key: 'assets', icon: 'PictureRounded', label: '品牌资产', badge: null, subtitle: 'Assets' },
      { key: 'inspiration', icon: 'Star', label: '灵感收集', badge: null, subtitle: 'Inspiration' },
      { key: 'settings', icon: 'Setting', label: '设置', badge: null, subtitle: 'Settings' }
    ],
    'copywriter': [
      { key: 'dashboard', icon: 'DataBoard', label: '文案台', badge: null, subtitle: 'Content Panel' },
      { key: 'tasks', icon: 'List', label: '文案任务', badge: null, subtitle: 'Tasks' },
      { key: 'library', icon: 'FolderOpened', label: '内容库', badge: null, subtitle: 'Library' },
      { key: 'guide', icon: 'Document', label: '风格指南', badge: null, subtitle: 'Style Guide' },
      { key: 'campaigns', icon: 'Promotion', label: '推广活动', badge: null, subtitle: 'Campaigns' },
      { key: 'keywords', icon: 'CollectionTag', label: '关键词库', badge: null, subtitle: 'Keywords' },
      { key: 'settings', icon: 'Setting', label: '设置', badge: null, subtitle: 'Settings' }
    ]
  }

  return menuConfigs[role] || []
}

// 当前角色的菜单项
const currentMenuItems = computed(() => {
  const role = props.userRole ?
    (props.userRole === '主理人' ? 'owner' :
     props.userRole === '审核' ? 'reviewer' :
     props.userRole === '美工' ? 'designer' :
     props.userRole === '文案' ? 'copywriter' : 'owner') :
    labelRole.value.role

  return getMenuItemsByRole(role)
})

// 主要功能菜单项（前5个）
const primaryMenuItems = computed(() => {
  return currentMenuItems.value.slice(0, 5)
})

// 次要功能菜单项（后面的）
const secondaryMenuItems = computed(() => {
  return currentMenuItems.value.slice(5)
})

// 格式化显示数据 - 参考AdminStatusBar
const formattedSubmissions = computed(() => {
  const value = todayStats.value.submissions || 0
  return value > 99 ? '99+' : value.toString()
})

const formattedPending = computed(() => {
  const value = todayStats.value.pending || 0
  return value > 99 ? '99+' : value.toString()
})

const formattedMonthly = computed(() => {
  const value = todayStats.value.monthly || 0
  return value > 99 ? '99+' : value.toString()
})

// 获取用户基本信息
const fetchUserInfo = async () => {
  try {
    console.log('[LabelHeader] 获取用户基本信息')

    // 检查token是否存在
    const token = localStorage.getItem('token')
    console.log('[LabelHeader] 当前token:', token ? '存在' : '不存在')

    const response = await UserService.getCurrentUser()

    if (response.success) {
      userInfo.value = response.data
      console.log('[LabelHeader] 用户信息获取成功:', response.data)
    } else {
      console.error('[LabelHeader] 获取用户信息失败:', response.message)
    }
  } catch (error) {
    console.error('[LabelHeader] 获取用户信息异常:', error)
    console.error('[LabelHeader] 错误详情:', error.response?.data || error.message)
  }
}

// 获取厂牌角色信息
const fetchLabelRole = async () => {
  try {
    console.log('[LabelHeader] 获取厂牌角色信息')
    const response = await LabelService.getUserLabelRole()

    if (response.success) {
      labelRole.value = response.data
      console.log('[LabelHeader] 厂牌角色获取成功:', response.data)

      // 获取厂牌详细信息
      if (response.data.labelId) {
        await fetchLabelInfo()
      }
    } else {
      console.error('[LabelHeader] 获取厂牌角色失败:', response.message)
    }
  } catch (error) {
    console.error('[LabelHeader] 获取厂牌角色异常:', error)
  }
}

// 获取厂牌详细信息
const fetchLabelInfo = async () => {
  try {
    console.log('[LabelHeader] 获取厂牌详细信息')
    const response = await LabelService.getLabelInfo()

    console.log('[LabelHeader] API响应完整数据:', response)

    if (response.success && response.data) {
      console.log('[LabelHeader] 响应数据详情:', response.data)

      labelInfo.value = {
        chineseName: response.data.chineseName || '',
        englishName: response.data.englishName || '',
        id: response.data.id
      }
      console.log('[LabelHeader] 厂牌信息获取成功:', labelInfo.value)
      console.log('[LabelHeader] 英文名:', response.data.englishName)
      console.log('[LabelHeader] 中文名:', response.data.chineseName)
    } else {
      console.error('[LabelHeader] 获取厂牌信息失败:', response.message)
    }
  } catch (error) {
    console.error('[LabelHeader] 获取厂牌信息异常:', error)
    // 如果获取失败，设置默认值
    labelInfo.value = {
      chineseName: '',
      englishName: '',
      id: null
    }
  }
}

// 获取统计数据（模拟）
const fetchStats = async () => {
  try {
    // TODO: 实现真实的统计数据获取
    console.log('[LabelHeader] 获取统计数据')

    // 模拟数据
    todayStats.value = {
      submissions: Math.floor(Math.random() * 10) + 1,
      pending: Math.floor(Math.random() * 5) + 1,
      monthly: Math.floor(Math.random() * 20) + 5
    }
  } catch (error) {
    console.error('[LabelHeader] 获取统计数据异常:', error)
  }
}

// 初始化数据
const initializeData = async () => {
  loading.value = true

  try {
    // 并行获取数据
    await Promise.all([
      fetchUserInfo(),
      fetchLabelRole(),
      fetchStats()
    ])
  } catch (error) {
    console.error('[LabelHeader] 初始化数据失败:', error)
  } finally {
    loading.value = false
  }
}

// 切换菜单显示
const toggleMenu = () => {
  menuVisible.value = !menuVisible.value
  // 关闭用户下拉菜单
  dropdownVisible.value = false

  // 如果显示菜单，延迟初始化图表
  if (menuVisible.value) {
    setTimeout(() => {
      initMiniChart()
    }, 100)
  }
}

// 导航到指定模块
const navigateToModule = (module) => {
  console.log('[LabelHeader] 导航到模块:', module)

  // 关闭菜单
  menuVisible.value = false

  // 特殊处理仪表盘
  if (module === 'dashboard') {
    router.push('/dashboard')
    return
  }

  // 获取当前角色
  const role = props.userRole ?
    (props.userRole === '主理人' ? 'owner' :
     props.userRole === '审核' ? 'reviewer' :
     props.userRole === '美工' ? 'designer' :
     props.userRole === '文案' ? 'copywriter' : 'owner') :
    labelRole.value.role

  // 根据角色和模块构建路由
  const route = `/${role}/${module}`

  console.log('[LabelHeader] 跳转路由:', route)

  // 跳转路由
  try {
    router.push(route)
  } catch (error) {
    console.error('[LabelHeader] 路由跳转失败:', error)
    // 如果路由不存在，显示提示
    alert(`功能开发中...\n即将跳转到: ${route}\n角色: ${roleDisplayName.value}\n模块: ${module}`)
  }
}

// 快捷操作方法
const quickCreateAlbum = () => {
  menuVisible.value = false
  console.log('快速创建专辑')
  alert('跳转到专辑创建页面')
  // router.push('/owner/releases/create')
}

const quickReviewSubmissions = () => {
  menuVisible.value = false
  console.log('快速审核投稿')
  alert('跳转到投稿审核页面')
  // router.push('/owner/submissions')
}

const quickViewStats = () => {
  menuVisible.value = false
  console.log('查看数据统计')
  alert('跳转到数据分析页面')
  // router.push('/owner/analytics')
}

// 切换下拉菜单
const toggleDropdown = () => {
  dropdownVisible.value = !dropdownVisible.value
  // 关闭主菜单
  menuVisible.value = false
}

// 点击外部关闭菜单
const handleClickOutside = (event) => {
  // 关闭用户下拉菜单
  if (!event.target.closest('.user-dropdown')) {
    dropdownVisible.value = false
  }

  // 关闭主菜单
  if (!event.target.closest('.menu-icon') && !event.target.closest('.header-menu-content')) {
    menuVisible.value = false
  }
}

// 导航方法
const goToProfile = () => {
  dropdownVisible.value = false
  router.push('/profile')
}

const goToSettings = () => {
  dropdownVisible.value = false
  router.push('/settings')
}

const handleLogout = () => {
  dropdownVisible.value = false
  // TODO: 调用实际的登出逻辑
  console.log('用户登出')
  // 清除本地存储
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  router.push('/login')
}

// 根据角色生成图表数据
const generateChartDataByRole = () => {
  const role = props.userRole ?
    (props.userRole === '主理人' ? 'owner' :
     props.userRole === '审核' ? 'reviewer' :
     props.userRole === '美工' ? 'designer' :
     props.userRole === '文案' ? 'copywriter' : 'owner') :
    labelRole.value.role

  const roleData = {
    'owner': [65, 70, 68, 75, 72, 78, 80],      // 主理人 - 整体业务趋势
    'reviewer': [45, 52, 48, 55, 58, 62, 60],   // 审核 - 审核量趋势
    'designer': [35, 42, 38, 45, 48, 52, 50],   // 美工 - 设计任务趋势
    'copywriter': [25, 32, 28, 35, 38, 42, 40]  // 文案 - 文案任务趋势
  }

  return roleData[role] || roleData['owner']
}

// 通用图表绘制方法
const drawMiniChart = (canvasRef, data) => {
  if (!canvasRef) return

  try {
    const ctx = canvasRef.getContext('2d')
    const gradient = ctx.createLinearGradient(0, 0, 0, 24)
    gradient.addColorStop(0, '#000000')
    gradient.addColorStop(1, '#666666')

    const width = canvasRef.width = 60
    const height = canvasRef.height = 24

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
  } catch (error) {
    console.error('[LabelHeader] 图表绘制失败:', error)
  }
}

// 初始化默认状态的迷你图表
const initDefaultMiniChart = () => {
  const defaultData = [65, 70, 68, 75, 72, 78, 80] // 默认数据
  drawMiniChart(defaultMiniChart.value, defaultData)
}

// 初始化菜单状态的迷你图表
const initMiniChart = () => {
  const data = generateChartDataByRole()
  drawMiniChart(miniChart.value, data)
}

// 生成本周日历
const generateWeekCalendar = () => {
  const startOfWeek = new Date(currentDate.value)
  startOfWeek.setDate(currentDate.value.getDate() - currentDate.value.getDay())

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  weekDays.value = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(startOfWeek)
    date.setDate(startOfWeek.getDate() + i)

    return {
      date: date.toISOString().split('T')[0],
      number: date.getDate(),
      isToday: date.toDateString() === today.toDateString(),
      hasActivity: Math.random() > 0.6 // 模拟活动数据
    }
  })
}

// 获取日期工具提示
const getDayTooltip = (day) => {
  if (!day.hasActivity) {
    return `${day.number}日 - 无活动`
  }
  return `${day.number}日 - 有活动`
}

// 生命周期
onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  initializeData()
  generateWeekCalendar()

  // 延迟初始化图表，确保DOM已渲染
  setTimeout(() => {
    initDefaultMiniChart() // 初始化默认图表
    initMiniChart() // 初始化菜单图表
  }, 100)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.label-header {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 80px;
  background-color: #ffffff;
  border-bottom: 1px solid #eaeaea;
  z-index: 999;
  transition: all 0.3s ease;
}

.header-container {
  display: flex;
  align-items: center;
  max-width: 1400px;
  height: 100%;
  margin: 0 auto;
  padding: 0 40px;
  gap: 20px;
  position: relative;
}

/* 菜单图标 */
.menu-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-radius: 8px;
  transition: background-color 0.3s ease;
  flex-shrink: 0;
}

.menu-icon:hover {
  background-color: #f5f5f5;
}

.menu-lines {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.menu-lines span {
  width: 20px;
  height: 2px;
  background-color: #000;
  transition: all 0.3s ease;
}

/* 默认Header内容 */
.header-default-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  gap: 20px;
}

/* Logo样式 - 参考acmetone-forum的主副标题设计 */
.logo-container {
  flex-shrink: 0;
}

.logo {
  display: flex;
  flex-direction: column;
  line-height: 1;
  text-decoration: none;
  text-align: left;
}

.logo-text {
  font-size: 22px;
  font-weight: 800;
  letter-spacing: 3px;
  color: #000;
  transition: color 0.3s ease;
}

.logo-sub {
  font-size: 12px;
  letter-spacing: 1px;
  color: #666;
  text-transform: uppercase;
  margin-top: 2px;
}

.logo:hover .logo-text {
  color: #333;
}

.logo:hover .logo-sub {
  color: #888;
}

/* Martin Garrix风格的菜单内容 */
.header-menu-content {
  position: absolute;
  top: 100%;
  left: 0;
  width: 100%;
  background: #ffffff;
  border-bottom: 1px solid #eaeaea;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  z-index: 998;
  font-family: 'Montserrat', sans-serif;
  padding: 40px 0 60px;
  min-height: 400px;
}

.menu-grid {
  display: grid;
  grid-template-columns: 2fr 1.5fr 1fr 1fr;
  gap: 40px;
  max-width: 1200px;
  width: 100%;
  margin: 0 auto;
  padding: 0 40px;
}

/* 菜单区域 */
.menu-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.section-title {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: #666;
  margin-bottom: 8px;
}

/* 主要功能区 */
.menu-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.menu-item-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  border: 1px solid #e0e0e0;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  background: #fff;
  min-height: 60px;
}

.menu-item-card:hover {
  border-color: #000;
  transform: translateX(2px);
}

.menu-item-card.secondary {
  padding: 12px 16px;
  border-color: #f0f0f0;
  min-height: 50px;
}

.menu-item-card.secondary:hover {
  border-color: #ccc;
}

.menu-item-icon {
  font-size: 16px;
  width: 20px;
  text-align: center;
  flex-shrink: 0;
}

.menu-item-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.menu-item-label {
  font-size: 14px;
  font-weight: 600;
  color: #000;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.menu-item-shortcut {
  font-size: 9px;
  color: #666;
  font-weight: 500;
}

.menu-item-badge {
  background: #ff4444;
  color: white;
  padding: 2px 6px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 700;
  min-width: 18px;
  text-align: center;
}

/* 快捷操作区 */
.quick-action-buttons {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.quick-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border: none;
  cursor: pointer;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  transition: all 0.3s ease;
}

.quick-btn.primary {
  background: #000;
  color: #fff;
}

.quick-btn.primary:hover {
  background: #333;
}

.quick-btn.secondary {
  background: #fff;
  color: #000;
  border: 1px solid #e0e0e0;
}

.quick-btn.secondary:hover {
  border-color: #000;
  background: #f9f9f9;
}

.quick-icon {
  font-size: 12px;
}

/* 状态信息区 */
.status-cards {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.status-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px;
  border: 1px solid #e0e0e0;
  background: #fff;
  transition: all 0.3s ease;
}

.status-card:hover {
  border-color: #000;
}

.status-card.urgent {
  border-color: #ff4444;
  background: #fff5f5;
}

.status-number {
  font-size: 18px;
  font-weight: 900;
  color: #000;
  line-height: 1;
}

.status-card.urgent .status-number {
  color: #ff4444;
}

.status-label {
  font-size: 8px;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-top: 2px;
}

.mini-chart-container {
  display: flex;
  justify-content: center;
  padding: 8px;
  border: 1px solid #e0e0e0;
  background: #fff;
}

.mini-chart {
  width: 80px;
  height: 30px;
}

/* 完全复制AdminStatusBar的样式 */
.admin-status-bar {
  display: flex;
  align-items: center;
  gap: 24px; /* 稍微减小间距，让菜单更紧凑 */
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

/* 关键数据样式 - 完全复制AdminStatusBar */
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

/* 菜单项样式 - 图标和文字在同一行 */
.status-item.menu-item {
  cursor: pointer;
  transition: all 0.3s ease;
}

.status-item.menu-item:hover {
  opacity: 0.7;
}

.menu-metric {
  display: flex;
  align-items: center;
  gap: 6px; /* 图标和文字之间的间距，稍微增加一点 */
  cursor: help;
  padding: 4px 8px; /* 添加一些内边距 */
  border-radius: 4px;
  transition: background-color 0.2s ease;
}

.menu-metric:hover {
  background-color: #f5f5f5;
}

.menu-icon {
  font-size: 12px; /* 更小更精致的图标 */
  font-weight: 400;
  color: #000000;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 12px;
  height: 12px;
}

.menu-label {
  font-size: 8px; /* 保持小字体 */
  font-weight: 500;
  color: #666666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  white-space: nowrap;
}

/* 迷你图表样式 - 完全复制AdminStatusBar */
.status-item.chart {
  cursor: help;
}

.mini-chart-inline {
  width: 60px;
  height: 24px;
  display: block;
}

/* Mini日历样式 - 完全复制AdminStatusBar */
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

.mini-day.has-activity {
  color: #000000;
  font-weight: 700;
}

/* 过渡动画 */
.header-fade-enter-active,
.header-fade-leave-active {
  transition: all 0.3s ease;
}

.header-fade-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}

.header-fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

/* Logo样式 */
.logo-container {
  flex-shrink: 0;
}

.logo {
  font-family: 'Montserrat', sans-serif;
  font-size: 24px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 2px;
  color: #000000;
  text-decoration: none;
  transition: color 0.3s ease;
}

.logo:hover {
  color: #666666;
}

/* 中间状态信息 */
.header-status {
  display: flex;
  gap: 32px;
  flex: 1;
  justify-content: center;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.status-label {
  color: #666;
  font-weight: 500;
}

.status-value {
  color: #000;
  font-weight: 700;
  font-size: 18px;
}

.status-unit {
  color: #666;
  font-weight: 500;
}

/* 用户控制区 */
.user-controls {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-shrink: 0;
}

.user-info {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  font-size: 14px;
}

.user-role {
  color: #666;
  font-weight: 500;
}

.user-name {
  color: #000;
  font-weight: 600;
}

/* 用户下拉菜单 */
.user-dropdown {
  position: relative;
  cursor: pointer;
}

.user-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  overflow: hidden;
  border: 2px solid #eaeaea;
  transition: border-color 0.3s ease;
}

.user-avatar:hover {
  border-color: #000;
}

.user-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  background-color: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  color: #666;
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 8px;
  background: white;
  border: 1px solid #eaeaea;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  min-width: 160px;
  overflow: hidden;
}

.dropdown-item {
  padding: 12px 16px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  font-size: 14px;
  font-weight: 500;
}

.dropdown-item:hover {
  background-color: #f5f5f5;
}

.dropdown-item.logout {
  color: #e74c3c;
}

.dropdown-item.logout:hover {
  background-color: #fdf2f2;
}

.dropdown-divider {
  height: 1px;
  background-color: #eaeaea;
  margin: 4px 0;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .menu-grid {
    grid-template-columns: 1fr 1fr;
    gap: 30px;
  }
  
  .menu-section.status-info,
  .menu-section.quick-actions {
    display: none;
  }
  
  /* 参考AdminStatusBar的响应式处理 - 在中等屏幕下隐藏状态栏 */
  .admin-status-bar {
    display: none;
  }
}

@media (max-width: 768px) {
  .header-container {
    padding: 0 20px;
  }

  .header-status {
    display: none;
  }

  .user-info {
    display: none;
  }
  
  .menu-grid {
    grid-template-columns: 1fr;
    gap: 20px;
    padding: 0 20px;
  }
  
  .header-menu-content {
    padding: 15px 0;
  }
  
  .menu-item-card {
    padding: 10px 12px;
  }
  
  .menu-item-label {
    font-size: 11px;
  }
}
</style>
