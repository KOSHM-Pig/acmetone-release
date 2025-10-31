<template>
  <ClientOnly>
    <StagewiseToolbar 
      :config="{
        plugins: [stagewiseConfig]
      }"
    />
  </ClientOnly>
  
  <el-container class="app-container">
    <!-- 简洁的顶部导航栏 -->
    <el-header v-if="!shouldHideNav" class="garrix-header">
      <div class="garrix-nav-container">
        <div class="logo-container">
          <AdminNotificationLogo />
        </div>

        <!-- 管理员状态栏组件 -->
        <AdminStatusBar v-if="userStore.isAdmin && userStore.isAuthenticated" />

        <div v-if="!userStore.isAuthenticated" class="menu-button" @click="toggleMenu">
          <span class="menu-label">菜单</span>
        </div>

        <div v-else class="user-header-controls">
          <!-- 移动端菜单按钮 -->
          <div class="mobile-menu-button" @click="toggleMobileSidebar">
            <el-icon><Menu /></el-icon>
          </div>
          <span class="welcome-text">欢迎, {{ userStore.user.username }}</span>
          <el-dropdown @command="handleCommand">
            <span class="user-dropdown-link">
              <el-avatar :size="32" :src="userAvatarUrl" icon="el-icon-user"></el-avatar>
              <!-- 右上角红点通知 -->
              <div v-if="userStore.isAdmin && notificationStore.hasPendingNotifications" class="notification-dot notification-dot-avatar"></div>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="profile">个人信息</el-dropdown-item>
                <el-dropdown-item command="logout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>
    </el-header>

    <!-- 全屏覆盖菜单 (仅未登录用户可见) -->
    <div class="fullscreen-menu" :class="{'menu-open': menuOpen}" v-if="!shouldHideNav && !userStore.isAuthenticated">
      <div class="menu-header">
        <div class="logo-container">
          <router-link to="/" class="logo" @click="closeMenu">ACMETONE</router-link>
          
        </div>
        
        <div class="close-button" @click="closeMenu">
          <span class="close-label">关闭</span>
        </div>
      </div>
      
      <div class="menu-content">
        <div class="menu-section">
          <router-link to="/" class="menu-item" @click="closeMenu">首页</router-link>
          <router-link to="/album-links" class="menu-item" @click="closeMenu">新专辑上线</router-link>
        </div>
        
        <div class="menu-actions">
          <router-link to="/login" class="menu-action-button" @click="closeMenu">登录</router-link>
          <router-link to="/register" class="menu-action-button primary" @click="closeMenu">注册</router-link>
        </div>
      </div>
    </div>
    
    <!-- 登录用户的侧边栏布局 -->
    <el-container v-if="userStore.isAuthenticated && !shouldHideNav">
      <!-- 移动端遮罩层 -->
      <div class="mobile-sidebar-overlay" v-if="mobileSidebarActive" @click="closeMobileSidebar"></div>
      
      <el-aside :width="sidebarCollapsed ? '64px' : '250px'" class="sidebar-menu" :class="{'collapsed': sidebarCollapsed, 'active': mobileSidebarActive}">
        <div class="sidebar-header" v-show="!sidebarCollapsed">
          <div class="sidebar-logo">{{userStore.user.username}}</div>
          <div class="sidebar-role-tag">
            {{ userStore.user.role === 'admin' ? '管理员' : '普通用户' }}
          </div>
        </div>
        
        <!-- 侧边栏折叠按钮，添加相对定位容器 -->
        <div class="sidebar-collapse-btn" @click="toggleSidebar">
          <el-icon v-if="sidebarCollapsed"><ArrowRight /></el-icon>
          <el-icon v-else><ArrowLeft /></el-icon>
          <!-- 侧边栏折叠按钮上的红点通知 -->
          <div v-if="showNotificationDot" class="notification-dot notification-dot-collapse"></div>
        </div>
        
        <!-- 移动端关闭按钮 -->
        <div class="mobile-sidebar-close" @click="closeMobileSidebar">
          <el-icon><Close /></el-icon>
        </div>
        
        <div class="sidebar-content">
          <div v-if="!sidebarCollapsed" class="new-album-container">
            <el-button
              class="new-album-button"
              @click="router.push('/album-links')"
            >

              <span>新专辑上线</span>
            </el-button>

            <!-- 厂牌端按钮
            <el-button
              class="label-button"
              @click="router.push('/labels')"
            >
              <span>厂牌端</span>
            </el-button> -->
          </div>
          <el-menu
            class="sidebar-navigation"
            :default-active="activeMenuItem"
            :router="true"
            :collapse="sidebarCollapsed"
            :collapse-transition="false"
            @select="closeMobileSidebar"
          >
            <el-menu-item index="/dashboard">
              <el-icon><DataAnalysis /></el-icon>
              <span>发行日历</span>
            </el-menu-item>

          
            <!-- 我的音乐菜单项 -->
            <div class="menu-group" v-if="!sidebarCollapsed">
              <div class="menu-group-title">我的音乐</div>
            </div>
            
            <el-sub-menu index="albums" popper-class="sidebar-popper">
              <template #title>
                <div>
                  <el-icon><Headset /></el-icon>
                  <span>专辑管理</span>
                </div>
              </template>
              <el-menu-item index="/albums">我的专辑</el-menu-item>
              <el-menu-item index="/albums/new">新建专辑</el-menu-item>
              <el-menu-item index="/user-album-links">专辑链接管理</el-menu-item>
            </el-sub-menu>
            
            <el-sub-menu index="resources" popper-class="sidebar-popper">
              <template #title>
                <div>
                  <el-icon><Collection /></el-icon>
                  <span>音乐资源</span>
                </div>
              </template>
              <el-menu-item index="/artist-wiki">歌手Wiki</el-menu-item>
              <el-menu-item index="/beat-array-submissions">节奏阵列投稿</el-menu-item>
            </el-sub-menu>

            <el-menu-item index="/services">
              <el-icon><MagicStick /></el-icon>
              <span>增值服务</span>
            </el-menu-item>
            
            <!-- 用户中心菜单项 -->
            <div class="menu-group" v-if="!sidebarCollapsed">
              <div class="menu-group-title">用户中心</div>
            </div>
            
            <el-sub-menu index="account" popper-class="sidebar-popper">
              <template #title>
                <div>
                  <el-icon><User /></el-icon>
                  <span>账户管理</span>
                </div>
              </template>
              <el-menu-item index="/user-center">个人信息</el-menu-item>
              <el-menu-item index="/user-center/contracts">生效合同</el-menu-item>
              <el-menu-item index="/user-center/shipments">物流信息</el-menu-item>
              <el-menu-item index="/reports">财务报表</el-menu-item>
              <el-menu-item index="/user-verification">
              实名认证
                    <el-tag 
                      v-if="verificationStatus === 'approved'" 
                      type="success" 
                      size="small" 
                class="verification-tag"
                    >
                      已认证
                    </el-tag>
                    <el-tag 
                      v-else-if="verificationStatus === 'pending'" 
                      type="warning" 
                      size="small" 
                class="verification-tag"
                    >
                      审核中
                    </el-tag>
                    <el-tag 
                      v-else-if="verificationStatus === 'rejected'" 
                      type="danger" 
                      size="small" 
                class="verification-tag"
                    >
                      已拒绝
                    </el-tag>
              </el-menu-item>
              
            </el-sub-menu>
              
            <!-- 管理员功能 -->
              <template v-if="userStore.isAdmin">
              <div class="menu-group" v-if="!sidebarCollapsed">
                <div class="menu-group-title">管理功能</div>
              </div>
              
              <el-sub-menu index="review" popper-class="sidebar-popper">
                <template #title>
                  <div class="menu-title-container" :class="{'collapsed-title': sidebarCollapsed}">
                    <div class="menu-icon-text">
                      <el-icon><Check /></el-icon>
                      <span>内容审核</span>
                    </div>
                    <!-- 子菜单通知红点位置修正 -->
                    <div v-if="notificationStore.totalPendingCount > 0 && !sidebarCollapsed" class="notification-dot notification-dot-menu"></div>
                  </div>
                  <!-- 折叠状态下的红点，独立于内容区域 -->
                  <div v-if="notificationStore.totalPendingCount > 0 && sidebarCollapsed" class="notification-dot notification-dot-collapsed"></div>
                </template>
                <el-menu-item index="/admin/workbench" class="menu-item-with-badge">
                  <span>审核工作台</span>
                  <BadgeWithMax
                    v-if="notificationStore.totalPendingCount > 0"
                    :value="notificationStore.totalPendingCount"
                    class="notification-badge"
                    :isCollapsed="sidebarCollapsed"
                  />
                </el-menu-item>
                <el-menu-item index="/admin/albums" class="menu-item-with-badge">
                  <span>专辑审核</span>
                  <BadgeWithMax
                    v-if="notificationStore.pendingAlbums > 0"
                    :value="notificationStore.pendingAlbums"
                    class="notification-badge"
                    :isCollapsed="sidebarCollapsed"
                  />
                </el-menu-item>
                <el-menu-item index="/admin/artist-requests" class="menu-item-with-badge">
                  <span>歌手信息审核</span>
                  <BadgeWithMax 
                    v-if="notificationStore.pendingArtistRequests > 0" 
                    :value="notificationStore.pendingArtistRequests" 
                    class="notification-badge" 
                    :isCollapsed="sidebarCollapsed"
                  />
                </el-menu-item>
                <el-menu-item index="/admin/user-verification" class="menu-item-with-badge">
                  <span>实名认证审核</span>
                  <BadgeWithMax 
                    v-if="notificationStore.pendingVerifications > 0" 
                    :value="notificationStore.pendingVerifications" 
                    class="notification-badge" 
                    :isCollapsed="sidebarCollapsed"
                  />
                </el-menu-item>
                <el-menu-item index="/admin/dynamic-covers">动态封面审核</el-menu-item>
                <el-menu-item index="/admin/promotion-requests">推广申请审核</el-menu-item>
                <el-menu-item index="/admin/labels">厂牌申请审核</el-menu-item>
              </el-sub-menu>
              
              <el-sub-menu index="content" popper-class="sidebar-popper">
                <template #title>
                  <div>
                    <el-icon><Document /></el-icon>
                    <span>内容管理</span>
                  </div>
                </template>
                <el-menu-item index="/admin/all-albums">所有用户专辑</el-menu-item>
                <el-menu-item index="/admin/album-links">专辑链接管理</el-menu-item>
                <el-menu-item index="/admin/cover-templates">封面模板编辑器</el-menu-item>
                <el-menu-item index="/admin/rights-chain">权利链条管理</el-menu-item>
              </el-sub-menu>
              
              <el-sub-menu index="ai-tools" popper-class="sidebar-popper">
                <template #title>
                  <div>
                    <el-icon><Cpu /></el-icon>
                    <span>AI 工具</span>
                  </div>
                </template>
                <el-menu-item index="/admin/ai-training">AI图像训练</el-menu-item>
              </el-sub-menu>
              
              <el-sub-menu index="system" popper-class="sidebar-popper">
                <template #title>
                  <div>
                    <el-icon><Setting /></el-icon>
                    <span>用户与系统</span>
                  </div>
                </template>
                <el-menu-item index="/admin/users">用户管理</el-menu-item>
                <el-menu-item index="/admin/contracts">合同管理</el-menu-item>
                <el-menu-item index="/admin/release-monitor">上架检测设置</el-menu-item>
                <el-menu-item index="/admin/authorization-tool">授权书生成工具</el-menu-item>
                <el-menu-item index="/admin/scheduler">定时任务</el-menu-item>
              </el-sub-menu>
              
              <el-sub-menu index="notification" popper-class="sidebar-popper">
                <template #title>
                  <div>
                    <el-icon><Message /></el-icon>
                    <span>通知与日志</span>
                  </div>
                </template>
                <el-menu-item index="/admin/email-settings">邮件通知设置</el-menu-item>
                <el-menu-item index="/admin/email-logs">邮件日志</el-menu-item>
              </el-sub-menu>
                <el-sub-menu index="materials" popper-class="sidebar-popper">
                  <template #title>
                    <div>
                      <el-icon><Document /></el-icon>
                      <span>物料与物流</span>
                    </div>
                  </template>
                  <el-menu-item index="/admin/material-templates">物料模板</el-menu-item>
                  <el-menu-item index="/admin/shipments">物流记录</el-menu-item>
                </el-sub-menu>
            </template>
          </el-menu>
        </div>
        
        <!-- AI助手菜单项 - 固定在底部 -->
        <div class="ai-menu-container" v-if="!shouldHideAi">
          <div @click="toggleAiChat" class="ai-menu-button">
            <el-icon><ChatLineRound /></el-icon>
            <span v-if="!sidebarCollapsed">AI 助手</span>
      </div>
            </div>
            
        <!-- AI助手对话框 -->
        <div v-if="showAiChat && !shouldHideAi" class="sidebar-ai-chat">
          <AiChat @close="closeAiChat" />
      </div>
      </el-aside>
      
      <el-container>
        <el-main 
          v-if="userStore.isAuthenticated && !shouldHideNav" 
          id="main-container" 
          class="garrix-main sidebar-main"
          :class="{'album-detail-container': isAlbumDetailRoute}"
        >
      <Suspense>
        <template #default>
          <router-view v-slot="{ Component }">
            <transition name="page-transition" mode="out-in">
                  <component :is="Component" class="router-view-container" />
            </transition>
          </router-view>
        </template>
        <template #fallback>
          <div class="loading-container">
            <el-skeleton :rows="10" animated />
          </div>
        </template>
      </Suspense>
    </el-main>
      </el-container>
    </el-container>
            
    <!-- 未登录用户或特殊页面的主内容区域 -->
    <el-main 
      v-if="!userStore.isAuthenticated || shouldHideNav" 
      id="main-container" 
      class="garrix-main"
      :class="{ 
        'clean-mode': shouldHideNav,
        'album-detail-container': isAlbumDetailRoute
      }"
    >
      <Suspense>
        <template #default>
          <router-view v-slot="{ Component }">
            <transition name="page-transition" mode="out-in">
              <component :is="Component" class="router-view-container" />
            </transition>
          </router-view>
        </template>
        <template #fallback>
          <div class="loading-container">
            <el-skeleton :rows="10" animated />
          </div>
        </template>
      </Suspense>
    </el-main>

    <el-footer v-if="!shouldHideNav && shouldShowFooter" class="garrix-footer">
      <div class="footer-container">
        <div class="social-section">
          <h3 class="footer-title">
            <span class="footer-title-main">关注我们</span>
            <span class="footer-title-sub">CONNECT</span>
          </h3>
          <div class="social-icons">
            <a href="#" target="_blank" class="social-icon"><el-icon><Camera /></el-icon></a>
            <a href="#" target="_blank" class="social-icon"><el-icon><VideoCameraFilled /></el-icon></a>
            <a href="#" target="_blank" class="social-icon"><el-icon><Headset /></el-icon></a>
            <a href="#" target="_blank" class="social-icon"><el-icon><Link /></el-icon></a>
            <a href="#" target="_blank" class="social-icon"><el-icon><VideoCamera /></el-icon></a>
            <a href="#" target="_blank" class="social-icon"><el-icon><ChatLineRound /></el-icon></a>
            <a href="#" target="_blank" class="social-icon"><el-icon><Picture /></el-icon></a>
            <a href="#" target="_blank" class="social-icon"><el-icon><Apple /></el-icon></a>
          </div>
        </div>
        
        <!-- 品牌广告横幅 -->
        <div class="promo-section">
          <div class="promo-container">
            <div class="promo-item">
              <div class="promo-logo">
                <span class="logo-text">ACMETONE</span>
                <span class="logo-label">FORUM</span>
              </div>
              <div class="promo-text">找音乐交流平台？</div>
              <router-link to="/music-library" class="promo-link">去音乐社区</router-link>
            </div>
            
            <div class="promo-item">
              <div class="promo-logo">
                <span class="logo-text">ACMETONE</span>
                <span class="logo-label">STUDIO</span>
              </div>
              <div class="promo-text">需要寻求创作合作艺人？</div>
              <router-link to="/studios" class="promo-link">去撮合平台</router-link>
            </div>
          </div>
        </div>

        <div class="footer-links-section">
          <div class="footer-links-column">
            <h3 class="footer-column-title">
              <span class="column-title-main">音乐</span>
              <span class="column-title-sub">MUSIC</span>
            </h3>
            <router-link to="/album-links" class="footer-link">全部音乐</router-link>
            <router-link to="/album-links?year=2024" class="footer-link">2024</router-link>
            <router-link to="/album-links?year=2023" class="footer-link">2023</router-link>
            <router-link to="/album-links?year=2022" class="footer-link">2022</router-link>
            <router-link to="/album-links?year=2021" class="footer-link">2021</router-link>
          </div>
          <div class="footer-links-column">
            <h3 class="footer-column-title">
              <span class="column-title-main">服务</span>
              <span class="column-title-sub">SERVICES</span>
            </h3>
            <router-link to="/services/distribution" class="footer-link">音乐发行</router-link>
            <router-link to="/services/copyright" class="footer-link">版权保护</router-link>
            <router-link to="/services/promotion" class="footer-link">音乐推广</router-link>
            <router-link to="/services/analytics" class="footer-link">数据分析</router-link>
          </div>
          <div class="footer-links-column">
            <h3 class="footer-column-title">
              <span class="column-title-main">资源</span>
              <span class="column-title-sub">RESOURCES</span>
            </h3>
            <router-link to="/studios" class="footer-link">撮合平台</router-link>
            <router-link to="/forum" class="footer-link">音乐社区</router-link>
            <router-link to="/faq" class="footer-link">常见问题</router-link>
            <router-link to="/support" class="footer-link">帮助中心</router-link>
          </div>
          <div class="footer-links-column">
            <h3 class="footer-column-title">
              <span class="column-title-main">联系我们</span>
              <span class="column-title-sub">CONTACT</span>
            </h3>
            <router-link to="/contact" class="footer-link">联系方式</router-link>
            <router-link to="/about" class="footer-link">关于我们</router-link>
            <router-link to="/join-us" class="footer-link">加入我们</router-link>
          </div>
        </div>

        <div class="footer-bottom">
          <div class="footer-logo">
            <div class="logo-chinese">极音记</div>
            <div class="logo-english">ACMETONE</div>
          </div>
          <div class="copyright">
            <p>© 2024-2025 Shanghai Acmetone Culture Technology Co., Ltd.. All rights reserved.</p>
            <div class="footer-legal">
              <a href="/terms" class="legal-link">服务条款</a>
              <a href="/privacy" class="legal-link">隐私政策</a>
            </div>
          </div>
        </div>
      </div>
    </el-footer>
  </el-container>
</template>

<script setup>
import { Apple, ArrowLeft, ArrowRight, Camera, ChatLineRound, Check, Close, Collection, Cpu, DataAnalysis, Document, Headset, Link, MagicStick, Menu, Message, Picture, Setting, User, VideoCamera, VideoCameraFilled } from '@element-plus/icons-vue';
import { StagewiseToolbar } from '@stagewise/toolbar-vue';
import { ElMessage } from 'element-plus';
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { initInteractiveBackground } from './assets/interactive-bg';
import './assets/styles/appNavigation.css';
import AdminNotificationLogo from './components/AdminNotificationLogo.vue';
import AdminStatusBar from './components/AdminStatusBar.vue';
import AiChat from './components/AiChat.vue';
import BadgeWithMax from './components/BadgeWithMax.vue';
import ClientOnly from './components/ClientOnly.vue';
import { STATIC_BASE_URL } from './config';
import stagewiseConfig from './stagewise-config';
import { useAlbumStore } from './stores/album';
import { useNotificationStore } from './stores/notification';
import { useUserStore } from './stores/user';
import { useUserVerificationStore } from './stores/userVerification';
import authChecker from './utils/authChecker';

const userStore = useUserStore();
const userVerificationStore = useUserVerificationStore();
const notificationStore = useNotificationStore();
const albumStore = useAlbumStore();
const router = useRouter();
const route = useRoute();
const verificationStatus = ref(null);
let cleanupBackground = null;
// 标记是否是页面刷新
const isPageRefresh = ref(true);
// 菜单状态
const menuOpen = ref(false);
// 当前活动菜单项
const activeMenuItem = ref('');
// 侧边栏折叠状态
const sidebarCollapsed = ref(false);
// AI助手显示状态
const showAiChat = ref(false);
// 移动端侧边栏状态
const mobileSidebarActive = ref(false);

// 管理员状态栏已移至独立组件 AdminStatusBar.vue




// 用户头像URL
const userAvatarUrl = computed(() => {
  try {
    if (!userStore.user) {

      return '';
    }
    
    if (!userStore.user.avatar) {

      return '';
    }
    
    // 添加时间戳确保每次都获取最新头像
    const timestamp = new Date().getTime();
    
    // 处理不同格式的头像URL
    let url = userStore.user.avatar;

    
    // 确保URL以/开头
    if (!url.startsWith('/') && !url.startsWith('http')) {
      url = '/' + url;

    }
    
    // 如果是相对URL，添加STATIC_BASE_URL
    if (url.startsWith('/uploads')) {
      url = `${STATIC_BASE_URL}${url}`;
 
    }
    
    // 添加时间戳参数
    url = url.includes('?') ? `${url}&t=${timestamp}` : `${url}?t=${timestamp}`;

    
    return url;
  } catch (error) {
    console.error('App.vue: 计算头像URL时出错:', error);
    return '';
  }
});

// 计算是否应该隐藏导航栏
const shouldHideNav = computed(() => {
  return route.meta.hideNav === true;
});

// 计算是否应该隐藏AI助手
const shouldHideAi = computed(() => {
  return route.meta.hideAi === true;
});

// 计算是否应该显示页脚
const shouldShowFooter = computed(() => {
  // 未登录用户显示页脚
  if (!userStore.isAuthenticated) {
    return true;
  }
  
  // 登录用户只在特定页面显示页脚
  const publicPages = [
    '/', 
    '/album-links', 
    '/new-songs',
    '/song', 
    '/album'
  ];
  
  return publicPages.some(page => 
    route.path === page || 
    route.path.startsWith(page + '/') ||
    route.meta.showFooter === true
  );
});

// 折叠状态下是否显示红点通知
const showNotificationDot = computed(() => {
  return sidebarCollapsed.value && notificationStore.hasPendingNotifications;
});

// 获取用户认证状态和待审核项目
const fetchUserData = async () => {
  if (!userStore.isAuthenticated) return;
  
  try {
    // 获取认证状态
    const result = await userVerificationStore.getVerificationStatus();
    verificationStatus.value = result.verification?.status || null;
    
    // 如果是管理员，获取待审核数量
    if (userStore.isAdmin) {
      await notificationStore.fetchNotifications();
    }
  } catch (error) {
    if (error.response?.status !== 404) {
      console.error('获取用户数据失败:', error);
    }
  }
};

// 状态栏相关方法已移至 AdminStatusBar.vue 组件

// 图表和趋势数据相关方法已移至 AdminStatusBar.vue 组件

// 监听用户状态变化
watch(() => userStore.isAuthenticated, (newValue) => {
  if (newValue) {
    fetchUserData();
  } else {
    // 用户登出时重置状态
    verificationStatus.value = null;
    notificationStore.clearNotifications();
  }
});

// 处理下拉菜单命令
const handleCommand = (command) => {
  if (command === 'logout') {
    handleLogout();
  } else if (command === 'profile') {
    router.push('/user-center');
  }
};

const handleLogout = () => {
  userStore.logout();
  userVerificationStore.resetState();
  ElMessage.success('已退出登录');
  closeMenu();
  router.push('/login');
};

// 菜单控制
const toggleMenu = () => {
  menuOpen.value = !menuOpen.value;
  document.body.style.overflow = menuOpen.value ? 'hidden' : '';
};

const closeMenu = () => {
  menuOpen.value = false;
  document.body.style.overflow = '';
};

// 更新活动菜单项
const updateActiveMenuItem = () => {
  const path = route.path;
  activeMenuItem.value = path;
};

// 路由变化时关闭菜单并更新活动菜单项
watch(() => route.path, (newPath) => {
  closeMenu();
  closeMobileSidebar();
  updateActiveMenuItem();
});

// 初始化交互式背景
const setupBackground = () => {
  // 在首页、登录或注册页面才初始化背景
  if (router.currentRoute.value.path === '/' || router.currentRoute.value.path === '/login' || router.currentRoute.value.path === '/register') {
    // 先清理现有背景避免重复创建
    if (cleanupBackground) {
      cleanupBackground();
      cleanupBackground = null;
    }
    
    // 使用稍微延迟确保DOM已经完全渲染
    setTimeout(() => {
      cleanupBackground = initInteractiveBackground('main-container');
    }, 200);
  }
};

// 监听路由变化
watch(() => router.currentRoute.value.path, (newPath, oldPath) => {
  console.log('路由变化:', oldPath, '->', newPath);

  // 清理之前的背景
  if (cleanupBackground) {
    cleanupBackground();
    cleanupBackground = null;
  }

  // 特殊处理：从AdminWorkbench离开时强制清理
  if (oldPath === '/admin/workbench' && newPath !== '/admin/workbench') {
    console.log('离开AdminWorkbench，执行强制清理...');

    // 清理可能残留的定时器
    const highestTimeoutId = setTimeout(() => {}, 0);
    for (let i = 0; i < highestTimeoutId; i++) {
      clearTimeout(i);
      clearInterval(i);
    }

    // 强制垃圾回收（如果支持）
    if (window.gc) {
      window.gc();
    }

    // 添加短暂延迟确保清理完成
    setTimeout(() => {
      console.log('AdminWorkbench 清理完成');
    }, 100);
  }
  
  // 在首页、登录或注册页面再次初始化背景
  if (newPath === '/' || newPath === '/login' || newPath === '/register') {
    // 使用稍微延迟确保DOM已经完全渲染
    setTimeout(() => {
      cleanupBackground = initInteractiveBackground('main-container');
    }, 200);
  }
  
  // 如果路由发生变化，则不再是页面刷新
  if (oldPath) {
    isPageRefresh.value = false;
  }
});

// 侧边栏折叠控制
const toggleSidebar = () => {
  sidebarCollapsed.value = !sidebarCollapsed.value;
  // 保存到本地存储
  localStorage.setItem('sidebarCollapsed', sidebarCollapsed.value ? 'true' : 'false');
};

// 初始化侧边栏状态
const initSidebarState = () => {
  const savedState = localStorage.getItem('sidebarCollapsed');
  if (savedState !== null) {
    sidebarCollapsed.value = savedState === 'true';
  }
};

// 切换AI助手显示状态
const toggleAiChat = () => {
  showAiChat.value = !showAiChat.value;
};

// 关闭AI助手
const closeAiChat = () => {
  showAiChat.value = false;
};

// 移动端侧边栏控制
const toggleMobileSidebar = () => {
  mobileSidebarActive.value = !mobileSidebarActive.value;
  // 如果是在移动端打开侧边栏，确保侧边栏不是折叠状态
  if (mobileSidebarActive.value && window.innerWidth <= 768) {
    sidebarCollapsed.value = false;
  }
};

// 关闭移动端侧边栏
const closeMobileSidebar = () => {
  mobileSidebarActive.value = false;
};

// 监听窗口大小变化
const handleResize = () => {
  if (window.innerWidth > 768) {
    // 大屏幕，如果侧边栏是通过移动端菜单打开的，则关闭它
    if (mobileSidebarActive.value) {
      mobileSidebarActive.value = false;
    }
  }
};

// 添加定期刷新通知的定时器
let notificationTimer = null;

// 设置定期刷新通知的函数
const setupNotificationTimer = () => {
  // 清除现有定时器
  if (notificationTimer) {
    clearInterval(notificationTimer);
  }
  
  // 如果用户已登录且是管理员，每2分钟刷新一次通知
  if (userStore.isAuthenticated && userStore.isAdmin) {
    notificationTimer = setInterval(() => {
      notificationStore.fetchNotifications();
    }, 120000); // 2分钟
  }
};

// miniChart 监听已移至 AdminStatusBar.vue 组件

onMounted(() => {
  // 应用程序挂载后立即检查登录状态
  if (localStorage.getItem('token')) {
    console.log('[App] 应用程序挂载，检查登录状态');
    authChecker.checkAuthStatus();
  }
  
  // 标记页面刷新状态
  isPageRefresh.value = true;
  
  // 添加窗口大小变化监听器
  window.addEventListener('resize', handleResize);
  
  // 在下一个tick后，将页面刷新状态设置为false
  nextTick(() => {
    setTimeout(() => {
      isPageRefresh.value = false;
    }, 100);
  });
  
  // 确保用户状态已初始化
  if (localStorage.getItem('token') && !userStore.user) {
    userStore.init().then(() => {
      if (userStore.isAuthenticated) {
        fetchUserData();
        initSidebarState();
        setupNotificationTimer(); // 设置通知定时器
      }
    });
  } else if (userStore.isAuthenticated) {
    fetchUserData();
    initSidebarState();
    setupNotificationTimer(); // 设置通知定时器
  }
  
  // 初始化活动菜单项
  updateActiveMenuItem();
  
  // 延迟初始化背景以确保DOM已完全加载
  setTimeout(() => {
    setupBackground();
  }, 300);
});

onBeforeUnmount(() => {
  // 移除窗口大小变化监听器
  window.removeEventListener('resize', handleResize);
  
  // 清理背景
  if (cleanupBackground) {
    cleanupBackground();
  }
  
  // 清理通知定时器
  if (notificationTimer) {
    clearInterval(notificationTimer);
  }
});

// 判断当前路由是否为专辑详情页
const isAlbumDetailRoute = computed(() => {
  return route.path.includes('/album-links/') || route.path.includes('/album/');
});

// 判断当前是否在专辑相关页面
const isAlbumRoute = computed(() => {
  return route.path.includes('/albums/') && route.params.id;
});

// 获取当前专辑ID
const currentAlbumId = computed(() => {
  if (isAlbumRoute.value) {
    return route.params.id;
  }
  return null;
});
</script>

<style>
/* 全局样式 */
html, body {
  margin: 0;
  padding: 0;
  background-color: #000000;
  color: #333;
  min-height: 100vh;
  width: 100%;
}

.app-container {
  min-height: 100vh;
  height: auto;
  display: flex;
  flex-direction: column;
}

.el-container {
  min-height: 100vh;
}

.el-main {
  padding: 20px;
  flex-grow: 1;
  padding-bottom: 0 !important;
  margin-bottom: 0 !important;
  box-sizing: border-box;
}

/* Album link页面特殊样式处理 */
.router-view-container {
  min-height: 100vh;
  flex: 1;
}

/* 当路由为专辑详情页时，移除内边距和背景色 */
.album-detail-container .el-main {
  padding: 0 !important;
  margin: 0 !important;
  background-color: #000000 !important;
  overflow: hidden !important;
}

/* 导航栏样式 */
.garrix-header {
  padding: 0;
  height: 80px;
  background-color: #ffffff;
  border-bottom: 1px solid #eaeaea;
  box-shadow: none;
  z-index: 999;
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  transition: all 0.3s ease;
}

.garrix-nav-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 1400px;
  height: 100%;
  margin: 0 auto;
  padding: 0 40px;
  gap: 20px;
  
  /* 添加专辑信息组件样式 */
  .album-header-info {
    flex: 1;
    margin: 0 20px;
    max-width: 400px;
  }
}

.logo-container {
  z-index: 20;
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

.menu-button, .close-button {
  cursor: pointer;
  z-index: 20;
}

.menu-label, .close-label {
  font-family: 'Montserrat', sans-serif;
  font-size: 16px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  transition: color 0.3s ease;
}

.menu-label:hover, .close-label:hover {
  color: #666666;
}

/* 管理员状态栏样式已移至 AdminStatusBar.vue 组件 */

/* 全屏菜单样式 */
.fullscreen-menu {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: #ffffff;
  z-index: 1000;
  visibility: hidden;
  opacity: 0;
  transition: all 0.5s ease;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.fullscreen-menu.menu-open {
  visibility: visible;
  opacity: 1;
}

.menu-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 40px;
  height: 80px;
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
}

.menu-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 40px;
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
}

.menu-section {
  display: flex;
  flex-direction: column;
  margin-bottom: 60px;
}

.menu-title {
  font-family: 'Montserrat', sans-serif;
  font-size: 14px;
  font-weight: 600;
  color: #999999;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-top: 30px;
  margin-bottom: 10px;
  position: relative;
  padding-bottom: 8px;
}

.menu-title:after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 30px;
  height: 2px;
  background-color: #000;
}

.menu-item {
  font-family: 'Montserrat', sans-serif;
  font-size: 18px;
  font-weight: 600;
  color: #000000;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 12px;
  text-decoration: none;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  position: relative;
  padding-left: 5px;
}

.menu-item:hover {
  color: #666666;
  transform: translateX(3px);
}

.menu-category .menu-item {
  font-size: 16px;
  margin-bottom: 10px;
}

.menu-category {
  margin-bottom: 20px;
  border-left: 2px solid #f0f0f0;
  padding-left: 15px;
  transition: all 0.3s ease;
}

.menu-category:hover {
  border-left-color: #000;
}

.menu-subtitle {
  font-family: 'Montserrat', sans-serif;
  font-size: 14px;
  font-weight: 600;
  color: #666666;
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.menu-item .verification-tag {
  margin-left: 10px;
  text-transform: none;
}

.menu-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  margin-top: 40px;
}

.menu-action-button {
  font-family: 'Montserrat', sans-serif;
  font-size: 14px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  padding: 12px 24px;
  border: 1px solid #000000;
  background-color: transparent;
  color: #000000;
  cursor: pointer;
  transition: all 0.3s ease;
  text-decoration: none;
}

.menu-action-button:hover {
  background-color: rgba(0, 0, 0, 0.05);
}

.menu-action-button.primary {
  background-color: #000000;
  color: #ffffff;
}

.menu-action-button.primary:hover {
  background-color: #333333;
}

/* 主内容区域 */
.garrix-main {
  background-color: #ffffff;
  padding-top: 120px;
  padding-bottom: 40px;
  min-height: calc(100vh - 80px);
}

.garrix-info-banner {
  background-color: #f5f5f5;
  color: #000000;
  padding: 10px 20px;
  margin: 0 20px 20px;
  font-size: 14px;
  letter-spacing: 0.5px;
}

.garrix-footer {
  background-color: #000000 !important;
  color: #ffffff;
  padding: 0 !important;
  height: auto !important;
  border-top: none !important;
}

.footer-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 60px 40px 30px;
}

.social-section {
  text-align: center;
  margin-bottom: 60px;
}

.footer-title {
  font-family: 'Montserrat', sans-serif;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 2px;
  margin-bottom: 30px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.footer-title-main {
  font-size: 20px;
}

.footer-title-sub {
  font-size: 12px;
  letter-spacing: 4px;
  margin-top: 5px;
  opacity: 0.7;
  font-weight: 400;
}

.social-icons {
  display: flex;
  justify-content: center;
  gap: 20px;
  flex-wrap: wrap;
}

.social-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 45px;
  height: 45px;
  border: 1px solid rgba(255, 255, 255, 0.7);
  color: #ffffff;
  transition: all 0.3s ease;
}

.social-icon .el-icon {
  font-size: 20px;
}

.social-icon:hover {
  background-color: #ffffff;
  color: #000000;
  transform: translateY(-3px);
}

.footer-links-section {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 30px;
  margin-bottom: 60px;
}

.footer-column-title {
  font-family: 'Montserrat', sans-serif;
  font-weight: 600;
  letter-spacing: 1px;
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
}

.column-title-main {
  font-size: 16px;
  text-transform: uppercase;
}

.column-title-sub {
  font-size: 10px;
  letter-spacing: 2px;
  margin-top: 3px;
  opacity: 0.7;
  font-weight: 400;
}

.footer-link {
  display: block;
  font-family: 'Montserrat', sans-serif;
  font-size: 14px;
  color: #cccccc;
  text-decoration: none;
  margin-bottom: 10px;
  transition: color 0.3s ease;
}

.footer-link:hover {
  color: #ffffff;
}

.footer-bottom {
  display: grid;
  grid-template-columns: 1fr 2fr;
  align-items: center;
  padding-top: 30px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.footer-logo {
  font-family: 'Montserrat', sans-serif;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 2px;
}

.logo-chinese {
  font-size: 28px;
  margin-bottom: 5px;
}

.logo-english {
  font-size: 14px;
  letter-spacing: 8px;
  opacity: 0.8;
  font-weight: 400;
}

.copyright {
  text-align: right;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.6;
}

.copyright p {
  margin-bottom: 5px;
}

.footer-legal {
  display: flex;
  justify-content: flex-end;
  gap: 20px;
  margin-top: 5px;
}

.legal-link {
  font-family: 'Montserrat', sans-serif;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.5);
  text-decoration: none;
  transition: color 0.3s ease;
  position: relative;
}

.legal-link:not(:last-child)::after {
  content: "";
  position: absolute;
  right: -10px;
  top: 50%;
  transform: translateY(-50%);
  width: 1px;
  height: 12px;
  background-color: rgba(255, 255, 255, 0.3);
}

.legal-link:hover {
  color: #ffffff;
}

@media (max-width: 992px) {
  .sidebar-menu {
    width: 220px !important;
  }
  
  .sidebar-menu.collapsed {
    width: 64px !important;
  }
  
  .sidebar-main {
    margin-left: 220px;
    width: calc(100% - 220px);
  }
  
  .collapsed + .el-container .sidebar-main {
    margin-left: 64px;
    width: calc(100% - 64px);
  }
}

@media (max-width: 768px) {
  /* 移动端样式 - 此部分已移至文件底部的统一媒体查询中 */
  }
  
@media (max-width: 576px) {
  .sidebar-menu.collapsed {
    width: 250px !important;
    overflow: hidden;
    border-right: none;
  }
  
  .sidebar-menu.collapsed.active {
    left: 0;
    width: 250px !important;
  }
  
  .collapsed + .el-container .sidebar-main {
    margin-left: 0;
    width: 100%;
  }
  
  .garrix-main {
    padding-left: 10px;
    padding-right: 10px;
  }
  
  .logo {
    font-size: 18px;
  }
}

/* 修复黑边问题 */
html, body {
  margin: 0;
  padding: 0;
  overflow-x: hidden;
  width: 100%;
  height: 100%;
}

.app-container {
  margin: 0;
  padding: 0;
  width: 100%;
  min-height: 100vh;
  overflow-x: hidden;
}

.el-container {
  margin: 0;
  padding: 0;
  width: 100%;
}

.el-main {
  padding: 0;
  margin: 0;
  width: 100%;
}

/* 清除专辑详情页面的内边距 */
.clean-mode {
  padding: 0 !important;
  margin: 0 !important;
  width: 100% !important;
  min-height: 100vh;
}

/* 品牌广告横幅 */
.promo-section {
  margin-top: 50px;
  margin-bottom: 50px;
  padding: 0;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.promo-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
}

.promo-item {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 20px;
  padding: 25px 20px;
  transition: all 0.3s ease;
}

.promo-item:first-child {
  border-right: 1px solid rgba(255, 255, 255, 0.1);
}

.promo-item:hover {
  background-color: rgba(255, 255, 255, 0.05);
}

.promo-logo {
  height: 50px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
}

.logo-text {
  font-family: 'Montserrat', sans-serif;
  font-weight: 700;
  font-size: 18px;
  letter-spacing: 2px;
  line-height: 1;
  color: #ffffff;
}

.logo-label {
  font-family: 'Montserrat', sans-serif;
  font-size: 12px;
  font-weight: 400;
  letter-spacing: 4px;
  color: rgba(255, 255, 255, 0.7);
  margin-top: 4px;
}

.promo-logo img {
  max-height: 100%;
  width: auto;
}

.promo-text {
  font-family: 'Montserrat', sans-serif;
  font-size: 16px;
  font-weight: 600;
  color: #ffffff;
  letter-spacing: 1px;
}

.promo-link {
  font-family: 'Montserrat', sans-serif;
  font-size: 14px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: #ffffff;
  text-decoration: none;
  border: 1px solid #ffffff;
  padding: 8px 16px;
  transition: all 0.3s ease;
  white-space: nowrap;
}

.promo-link:hover {
  background-color: #ffffff;
  color: #000000;
}

@media (max-width: 768px) {
  .promo-container {
    grid-template-columns: 1fr;
  }

  .promo-item:first-child {
    border-right: none;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  .promo-item {
    padding: 15px 20px;
  }
}

@media (max-width: 576px) {
  .promo-item {
    grid-template-columns: 1fr;
    text-align: center;
    gap: 10px;
  }
  
  .promo-logo {
    justify-content: center;
  }
  
  .promo-link {
    justify-self: center;
  }
}

.menu-category {
  margin-bottom: 20px;
  border-left: 2px solid #f0f0f0;
  padding-left: 15px;
}

.menu-subtitle {
  font-family: 'Montserrat', sans-serif;
  font-size: 14px;
  font-weight: 600;
  color: #666666;
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.menu-category .menu-item {
  font-size: 16px;
  margin-bottom: 10px;
}

/* 侧边栏样式 */
.sidebar-menu {
  background-color: #fff;
  border-right: 1px solid rgba(0, 0, 0, 0.05);
  height: calc(100vh - 80px); /* 减去顶部导航栏的高度 */
  position: fixed;
  top: 80px;
  left: 0;
  z-index: 900;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.03);
  overflow: hidden;
  transition: width 0.3s;
  display: flex;
  flex-direction: column;
}

.sidebar-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  max-height: calc(100vh - 200px); /* 为底部按钮留出空间 */
  padding-top: 20px;
  padding-bottom: 60px; /* 增加底部内边距，为AI助手按钮腾出空间 */
}

.sidebar-header {
  padding: 20px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  margin-bottom: 10px;
}

.sidebar-collapse-btn {
  position: absolute; /* 绝对定位 */
  right: -12px;
  top: 70px;
  width: 24px;
  height: 24px;
  background-color: #fff;
  border: 1px solid rgba(0, 0, 0, 0.05);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 910;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
}

.sidebar-collapse-btn:hover {
  background-color: #f9f9f9;
  transform: scale(1.05);
}

.sidebar-collapse-btn .el-icon {
  font-size: 20px;
  color: #333;
  transition: transform 0.3s ease;
}

.collapsed .sidebar-collapse-btn .el-icon {
  transform: rotate(180deg);
}

.sidebar-logo {
  font-family: 'Montserrat', sans-serif;
  font-size: 20px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 2px;
  color: #000;
  margin-bottom: 5px;
}

.sidebar-role-tag {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.5);
  text-transform: uppercase;
  letter-spacing: 1px;
}

/* 菜单组样式 */
.menu-group {
  padding: 10px 0;
}

.menu-group-title {
  font-family: 'Montserrat', sans-serif;
  font-size: 13px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.4);
  text-transform: uppercase;
  letter-spacing: 1px;
  padding: 0 20px;
  margin: 20px 0 10px;
  position: relative;
}

.menu-group-title:after {
  content: '';
  position: absolute;
  bottom: -5px;
  left: 20px;
  width: 25px;
  height: 1px;
  background-color: rgba(0, 0, 0, 0.1);
}

/* 导航菜单样式 */
.sidebar-navigation {
  border-right: none;
  transition: width 0.3s;
  margin-top: 10px;
  background-color: transparent;
}

.collapsed .sidebar-navigation {
  margin-top: 50px;
}

.sidebar-navigation.el-menu--collapse {
  width: 64px;
}

.sidebar-navigation .el-menu-item,
.sidebar-navigation .el-sub-menu__title {
  font-family: 'Montserrat', sans-serif;
  font-weight: 500;
  letter-spacing: 0.5px;
  height: 50px;
  line-height: 50px;
  transition: all 0.3s ease;
  color: rgba(0, 0, 0, 0.7);
  background-color: transparent;
  box-sizing: border-box;
}

.sidebar-navigation .el-sub-menu__title {
  font-weight: 600;
}

.sidebar-navigation .el-menu-item.is-active {
  background-color: rgba(0, 0, 0, 0.03);
  color: #000;
  font-weight: 600;
  border-left: 2px solid #000;
}

.sidebar-navigation .el-sub-menu.is-active .el-sub-menu__title {
  color: #000;
}

.sidebar-navigation .el-menu-item:hover,
.sidebar-navigation .el-sub-menu__title:hover {
  background-color: rgba(0, 0, 0, 0.02);
  color: #000;
}

/* 折叠状态样式 */
.sidebar-navigation.el-menu--collapse .el-menu-item,
.sidebar-navigation.el-menu--collapse .el-sub-menu__title {
  padding: 0 !important;
  text-align: center;
  display: flex;
  justify-content: center;
  align-items: center;
}

.sidebar-navigation.el-menu--collapse .el-icon {
  margin: 0 !important;
  font-size: 20px;
  color: rgba(0, 0, 0, 0.7);
}

/* 确保折叠状态下文字不显示 */
.sidebar-navigation.el-menu--collapse .el-menu-item span,
.sidebar-navigation.el-menu--collapse .el-sub-menu__title span {
  display: none !important;
  opacity: 0;
  visibility: hidden;
}

/* 确保折叠状态下只有图标显示 */
.sidebar-navigation.el-menu--collapse .el-tooltip__trigger {
  width: auto;
  justify-content: center;
}

/* 修复折叠菜单图标位置 */
.sidebar-navigation.el-menu--collapse .el-menu-item .el-tooltip__trigger,
.sidebar-navigation.el-menu--collapse .el-sub-menu__title .el-icon {
  margin: 0 auto !important;
}

.sidebar-navigation.el-menu--collapse .el-menu-item .el-tooltip__trigger,
.sidebar-navigation.el-menu--collapse .el-sub-menu__title {
  display: flex;
  justify-content: center;
}

/* 隐藏折叠状态下的箭头图标 */
.sidebar-navigation.el-menu--collapse .el-sub-menu__icon-arrow {
  display: none;
}

.sidebar-navigation .el-menu-item .el-icon,
.sidebar-navigation .el-sub-menu__title .el-icon {
  margin-right: 10px;
  font-size: 18px;
  color: rgba(0, 0, 0, 0.7);
}

/* 弹出菜单样式 */
:deep(.sidebar-popper) {
  border-radius: 0 !important;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.06) !important;
  border: 1px solid rgba(0, 0, 0, 0.05) !important;
  margin-left: 5px !important;
  background-color: #fff !important;
}

:deep(.sidebar-popper .el-menu) {
  border-right: none !important;
  min-width: 180px;
  background-color: #fff !important;
}

:deep(.sidebar-popper .el-menu-item) {
  height: 40px;
  line-height: 40px;
  font-family: 'Montserrat', sans-serif;
  letter-spacing: 0.5px;
  color: rgba(0, 0, 0, 0.7) !important;
}

:deep(.sidebar-popper .el-menu-item.is-active) {
  background-color: rgba(0, 0, 0, 0.03) !important;
  color: #000 !important;
}

:deep(.sidebar-popper .el-menu-item:hover) {
  background-color: rgba(0, 0, 0, 0.02) !important;
  color: #000 !important;
}

/* 工具提示样式 */
.el-tooltip__trigger {
  display: inline-flex;
  align-items: center;
  width: 100%;
}

/* 折叠状态下的菜单项悬停效果 */
.sidebar-navigation.el-menu--collapse .el-menu-item:hover,
.sidebar-navigation.el-menu--collapse .el-sub-menu__title:hover {
  background-color: rgba(0, 0, 0, 0.02);
}

/* 折叠状态下的活动菜单项 */
.sidebar-navigation.el-menu--collapse .el-menu-item.is-active {
  background-color: rgba(0, 0, 0, 0.03);
  border-left: 2px solid #000;
}

/* 子菜单样式 */
.el-menu--popup {
  min-width: 200px;
  padding: 5px 0;
  background-color: #fff !important;
}

.el-menu--popup .el-menu-item {
  height: 40px;
  line-height: 40px;
  padding: 0 20px;
  color: rgba(0, 0, 0, 0.7) !important;
}

.el-menu--popup .el-menu-item:hover {
  background-color: rgba(0, 0, 0, 0.02) !important;
  color: #000 !important;
}

/* 修复折叠状态下的子菜单展开箭头 */
.sidebar-navigation:not(.el-menu--collapse) .el-sub-menu__icon-arrow {
  right: 15px;
  margin-top: -5px;
  color: rgba(0, 0, 0, 0.4);
}

/* AI助手菜单项样式 */
.ai-menu-container {
  border-top: 1px solid rgba(0, 0, 0, 0.05);
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  background-color: #fff;
  z-index: 920; /* 确保AI助手按钮在最上层 */
}

.ai-menu-button {
  background-color: #fff;
  color: rgba(0, 0, 0, 0.7);
  height: 50px;
  line-height: 50px;
  padding: 0 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  transition: all 0.3s ease;
  border-top: 1px solid rgba(0, 0, 0, 0.05);
  font-family: 'Montserrat', sans-serif;
  font-weight: 500;
  letter-spacing: 0.5px;
}

.ai-menu-button:hover {
  background-color: rgba(0, 0, 0, 0.02);
  color: #000;
}

.ai-menu-button .el-icon {
  font-size: 18px;
  margin-right: 10px;
  color: rgba(0, 0, 0, 0.7);
}

.ai-menu-button span {
  font-size: 14px;
  text-transform: none;
}

.collapsed .ai-menu-button {
  padding: 0;
  justify-content: center;
}

.collapsed .ai-menu-button .el-icon {
  margin-right: 0;
}

.collapsed .ai-menu-button span {
  display: none;
}

.sidebar-main {
  margin-left: 250px;
  padding-top: 100px;
  width: calc(100% - 250px);
  transition: margin-left 0.3s, width 0.3s;
}

.collapsed + .el-container .sidebar-main {
  margin-left: 64px;
  width: calc(100% - 64px);
}

.user-header-controls {
  display: flex;
  align-items: center;
  gap: 15px;
  flex-shrink: 0;
}

.welcome-text {
  font-family: 'Montserrat', sans-serif;
  font-size: 14px;
  color: #666;
}

.user-dropdown-link {
  cursor: pointer;
  display: flex;
  align-items: center;
}

/* 侧边栏AI助手样式 */
.sidebar-ai-chat {
  position: fixed;
  bottom: 20px;
  left: 75px;
  z-index: 1000;
}

.collapsed + .el-container .sidebar-ai-chat {
  left: 75px;
}

@media (max-width: 768px) {
  .sidebar-ai-chat {
    left: 10px;
    bottom: 10px;
  }
  
  .collapsed + .el-container .sidebar-ai-chat {
    left: 10px;
  }
}

/* 页脚响应式样式 */
@media (max-width: 992px) {
  .footer-links-section {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .footer-container {
    padding: 40px 20px 20px;
  }
  
  .social-section {
    margin-bottom: 40px;
  }
  
  .social-icons {
    gap: 20px;
  }
  
  .footer-bottom {
    grid-template-columns: 1fr;
    gap: 20px;
  }
  
  .footer-logo {
    text-align: center;
  }
  
  .copyright {
    text-align: center;
  }
  
  .footer-legal {
    justify-content: center;
    flex-wrap: wrap;
  }
}

@media (max-width: 576px) {
  .footer-links-section {
    grid-template-columns: 1fr;
  }
  
  .footer-links-column {
    text-align: center;
  }
  
  .footer-column-title {
    margin-top: 20px;
  }
}

/* 移动端菜单按钮 */
.mobile-menu-button {
  display: none;
  cursor: pointer;
  margin-right: 10px;
}

.mobile-menu-button .el-icon {
  font-size: 24px;
  color: #000;
}

/* 移动端关闭按钮 */
.mobile-sidebar-close {
  display: none;
  position: absolute;
  top: 20px;
  right: 20px;
  cursor: pointer;
  z-index: 920;
}

.mobile-sidebar-close .el-icon {
  font-size: 24px;
  color: #000;
}

/* 移动端遮罩层 */
.mobile-sidebar-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 950;
  display: none;
}

@media (max-width: 768px) {
  .mobile-sidebar-overlay {
    display: block;
  }
  
  .garrix-header {
    height: 60px;
  }
  
  .garrix-nav-container {
    padding: 0 15px;
  }
  
  .logo {
    font-size: 20px;
  }
  
  .mobile-menu-button {
    display: block;
  }
  
  .mobile-sidebar-close {
    display: block;
  }
  
  /* 在移动端，侧边栏始终以完整宽度显示 */
  .sidebar-menu {
    width: 250px !important;
    left: -100%;
    position: fixed;
    top: 60px;
    height: calc(100vh - 60px);
    transition: left 0.3s ease;
    z-index: 1000;
    overflow-y: auto;
  }
  
  .sidebar-menu.active {
    left: 0;
    box-shadow: 0 0 15px rgba(0, 0, 0, 0.1);
  }
  
  /* 移动端不显示折叠后的侧边栏样式 */
  .sidebar-menu.collapsed {
    width: 250px !important;
    left: -100%;
  }
  
  .sidebar-menu.collapsed.active {
    left: 0;
    width: 250px !important;
  }
  
  /* 隐藏折叠按钮 */
  .sidebar-collapse-btn {
    display: none !important;
  }
  
  .sidebar-main {
    margin-left: 0 !important;
    width: 100% !important;
    padding-top: 80px !important;
  }
  
  .garrix-main {
    padding-top: 80px;
    padding-left: 15px;
    padding-right: 15px;
  }
  
  .welcome-text {
    display: none;
  }
}

/* 页面过渡动画 */
.page-transition-enter-active,
.page-transition-leave-active {
  transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}

.page-transition-enter-from {
  opacity: 0;
  transform: translateY(20px);
}

.page-transition-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}

/* 添加通知红点样式 */
.notification-dot {
  position: absolute;
  width: 10px;
  height: 10px;
  background-color: #f56c6c;
  border-radius: 50%;
  z-index: 10;
}

/* 修正菜单标题容器结构 */
.menu-title-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  position: relative;
}

/* 折叠状态下的标题容器 */
.collapsed-title {
  justify-content: center;
}

.menu-icon-text {
  display: flex;
  align-items: center;
}

/* 折叠按钮上的红点 */
.notification-dot-collapse {
  top: -4px;
  right: -4px;
}

/* 菜单项上的红点 - 位置修正 */
.notification-dot-menu {
  position: relative;
  top: 0;
  right: 0;
  margin-right: 15px;
}

/* 头像上的红点 */
.notification-dot-avatar {
  top: 0;
  right: 0;
}

/* 折叠状态下的子菜单标题上的红点位置调整 */
.sidebar-navigation.el-menu--collapse .el-sub-menu__title .notification-dot-menu {
  position: absolute;
  right: 5px;
  top: 5px;
  margin-right: 0;
  width: 8px;
  height: 8px;
}

/* 折叠状态下的专用红点 */
.notification-dot-collapsed {
  position: absolute;
  width: 8px;
  height: 8px;
  background-color: #f56c6c;
  border-radius: 50%;
  right: 6px;
  top: 6px;
  z-index: 10;
}

/* 收缩状态下的子菜单图标位置调整 */
.sidebar-navigation.el-menu--collapse .el-sub-menu__title {
  position: relative;
  text-align: center;
}

/* 确保收缩状态下图标位于正中间 */
.sidebar-navigation.el-menu--collapse .el-menu-item,
.sidebar-navigation.el-menu--collapse .el-sub-menu__title {
  padding: 0 !important;
  justify-content: center;
  display: flex;
}

/* 通知数字样式 */
.notification-badge {
  margin-left: 5px;
}

/* 用户头像容器需要相对定位以便放置红点 */
.user-dropdown-link {
  position: relative;
}

/* 菜单项内容布局 */
.menu-item-with-badge {
  display: flex !important;
  justify-content: space-between !important;
  align-items: center !important;
  height: 40px !important;
  /* 显式设置padding以覆盖默认值并保持一致 */
  padding-left: 20px !important;
  padding-right: 15px !important; 
}

.menu-item-content {
  display: none; /* 废弃这个容器 */
}

/* 确保菜单项中的文本和徽章垂直居中 */
.menu-item-content span {
  line-height: 1;
}

/* 修复折叠状态下子菜单的宽度 */
.sidebar-popper .menu-item-content {
  width: 100%;
}

.new-album-container {
  padding: 10px 20px 15px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.new-album-button {
  width: 100%;
  background-color: #1a1a1a;
  color: #ffffff;
  border: none;
  border-radius: 6px;
  height: 44px;
  font-size: 14px;
  font-weight: 500;
  font-family: 'Montserrat', sans-serif;
  transition: background-color 0.2s ease;
}

.new-album-button .el-icon {
  margin-right: 10px;
}

.new-album-button:hover {
  background-color: #333333;
  color: #ffffff;
}

.label-button {
  width: 100%;
  background-color: #ffffff;
  color: #1a1a1a;
  border: 1px solid #1a1a1a;
  border-radius: 6px;
  height: 44px;
  font-size: 14px;
  font-weight: 500;
  font-family: 'Montserrat', sans-serif;
  transition: all 0.2s ease;
}

.label-button:hover {
  background-color: #1a1a1a;
  color: #ffffff;
}
</style>

