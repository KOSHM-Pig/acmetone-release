import { createRouter, createWebHistory } from 'vue-router';
import { useUserStore } from '../stores/user';
import ForgotPassword from '../views/ForgotPassword.vue';
import Login from '../views/Login.vue';
import NotFound from '../views/NotFound.vue';
import Register from '../views/Register.vue';
import ReportDetail from '../views/ReportDetail.vue';
import ReportView from '../views/ReportView.vue';
import Studios from '../views/Studios.vue';
import Support from '../views/Support.vue';
import UserCenter from '../views/UserCenter.vue';
import UserVerification from '../views/UserVerification.vue';
import AdminDynamicCovers from '../views/admin/AdminDynamicCovers.vue';
import AdminMaterials from '../views/admin/AdminMaterials.vue';
import AdminRightsChain from '../views/admin/AdminRightsChain.vue';
import AdminShipments from '../views/admin/AdminShipments.vue';
import Analytics from '../views/services/Analytics.vue';
import Copyright from '../views/services/Copyright.vue';
import Distribution from '../views/services/Distribution.vue';
import DynamicCoverRequest from '../views/services/DynamicCoverRequest.vue';
import PromotionRequest from '../views/services/PromotionRequest.vue';
import ServicesHub from '../views/services/ServicesHub.vue';
import UserDynamicCovers from '../views/user/UserDynamicCovers.vue';
import UserPromotionRequests from '../views/user/UserPromotionRequests.vue';
import UserShipments from '../views/user/UserShipments.vue';
import UserContracts from '../views/user/UserContracts.vue';

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('../views/Home.vue'),
  },
  {
    path: '/login',
    name: 'Login',
    component: Login,
    meta: { guest: true },
  },
  {
    path: '/register',
    name: 'Register',
    component: Register,
    meta: { guest: true },
  },
  {
    path: '/forgot-password',
    name: 'ForgotPassword',
    component: ForgotPassword,
    meta: { guest: true },
  },
  {
    path: '/email-verified',
    name: 'EmailVerified',
    component: () => import('../views/EmailVerified.vue'),
  },
  {
    path: '/user-center',
    name: 'UserCenter',
    component: UserCenter,
    meta: { requiresAuth: true },
  },
  {
    path: '/user-center/dynamic-covers',
    name: 'UserDynamicCovers',
    component: UserDynamicCovers,
    meta: { requiresAuth: true },
  },
  {
    path: '/user-center/promotion-requests',
    name: 'UserPromotionRequests',
    component: UserPromotionRequests,
    meta: { requiresAuth: true },
  },
  {
    path: '/user-center/shipments',
    name: 'UserShipments',
    component: UserShipments,
    meta: { requiresAuth: true },
  },
  {
    path: '/user-center/contracts',
    name: 'UserContracts',
    component: UserContracts,
    meta: { requiresAuth: true },
  },
  {
    path: '/user-verification',
    name: 'UserVerification',
    component: UserVerification,
    meta: { requiresAuth: true }
  },
  {
    path: '/labels',
    name: 'Labels',
    component: () => import('../views/Labels.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/reports',
    name: 'Reports',
    component: ReportView,
    meta: { requiresAuth: true }
  },
  {
    path: '/reports/:year/:month',
    name: 'ReportDetail',
    component: ReportDetail,
    meta: { requiresAuth: true },
    props: true
  },
  {
    path: '/user-album-links',
    name: 'UserAlbumLinksList',
    component: () => import('../views/user/UserAlbumLinks.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/albums',
    name: 'Albums',
    component: () => import('../views/Albums.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/albums/new',
    name: 'NewAlbum',
    component: () => import('../views/NewAlbum.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/albums/:id',
    name: 'AlbumDetail',
    component: () => import('../views/AlbumDetail.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/album/:id/flow',
    name: 'AlbumFlowEditor',
    component: () => import('../views/AlbumFlowEditor.vue')
  },
  {
    path: '/beat-array-submissions',
    name: 'BeatArraySubmissions',
    component: () => import('../views/BeatArraySubmissions.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/album-links',
    name: 'PublicAlbumLinks',
    component: () => import('../views/PublicAlbumLinks.vue'),
  },
  {
    path: '/song/:slug',
    name: 'SongLinkDetail',
    component: () => import('../views/SongLinkDetail.vue'),
    meta: { 
      hideNav: true,
      hideAi: true
    }
  },
  {
    path: '/admin/albums',
    name: 'AdminAlbums',
    component: () => import('../views/admin/Albums.vue'),
    meta: { requiresAuth: true, requiresAdmin: true },
  },
  {
    path: '/admin/approved-albums',
    name: 'ApprovedAlbums',
    component: () => import('../views/admin/ApprovedAlbums.vue'),
    meta: { requiresAuth: true, requiresAdmin: true },
  },
  {
    path: '/admin/rejected-albums',
    name: 'RejectedAlbums',
    component: () => import('../views/admin/RejectedAlbums.vue'),
    meta: { requiresAuth: true, requiresAdmin: true },
  },
  {
    path: '/admin/rights-chain',
    name: 'AdminRightsChain',
    component: AdminRightsChain,
    meta: { requiresAuth: true, requiresAdmin: true },
  },
  {
    path: '/admin/artist-requests',
    name: 'AdminArtistRequests',
    component: () => import('../views/admin/ArtistRequests.vue'),
    meta: { requiresAuth: true, requiresAdmin: true },
  },
  {
    path: '/admin/user-verification',
    name: 'AdminUserVerification',
    component: () => import('../views/admin/UserVerificationCheck.vue'),
    meta: { requiresAuth: true, requiresAdmin: true },
  },
  {
    path: '/admin/users',
    name: 'AdminUsers',
    component: () => import('../views/admin/UserManagement.vue'),
    meta: { requiresAuth: true, requiresAdmin: true },
  },
  {
    path: '/admin/contracts',
    name: 'AdminContracts',
    component: () => import('../views/admin/ContractManagement.vue'),
    meta: { requiresAuth: true, requiresAdmin: true },
  },
  {
    path: '/admin/email-settings',
    name: 'EmailSettings',
    component: () => import('../views/admin/EmailSettings.vue'),
    meta: { requiresAuth: true, requiresAdmin: true },
  },
  {
    path: '/admin/email-logs',
    name: 'EmailLogs',
    component: () => import('../views/admin/EmailLogs.vue'),
    meta: { requiresAuth: true, requiresAdmin: true },
  },
  {
    path: '/admin/album-links',
    name: 'AdminAlbumLinks',
    component: () => import('../views/admin/AlbumLinks.vue'),
    meta: { requiresAuth: true, requiresAdmin: true },
  },
  {
    path: '/admin/cover-templates',
    name: 'AdminCoverTemplateEditor',
    component: () => import('../views/admin/CoverTemplateEditor.vue'),
    meta: { requiresAuth: true, requiresAdmin: true },
  },
  {
    path: '/admin/album-links/create',
    name: 'AdminAlbumLinkCreate',
    component: () => import('../views/admin/AlbumLinkCreate.vue'),
    meta: { requiresAuth: true, requiresAdmin: true },
  },
  {
    path: '/admin/album-links/:id/edit',
    name: 'AdminAlbumLinkEdit',
    component: () => import('../views/admin/AlbumLinkEdit.vue'),
    meta: { requiresAuth: true, requiresAdmin: true },
  },
  {
    path: '/admin/album-links/:id/songs',
    name: 'AdminAlbumLinkSongs',
    component: () => import('../views/admin/AlbumLinkSongs.vue'),
    meta: { requiresAuth: true, requiresAdmin: true },
  },
  {
    path: '/album/:slug',
    name: 'AlbumLinkDetail',
    component: () => import('../views/AlbumLinkDetail.vue'),
    meta: { 
      hideNav: true,
      hideAi: true
    }
  },
  {
    path: '/artist-wiki',
    name: 'ArtistWiki',
    component: () => import('../views/ArtistWiki.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/link-checker',
    name: 'LinkChecker',
    component: () => import('../views/LinkChecker.vue'),
    meta: { requiresAuth: true, requiresAdmin: true },
  },
  {
    path: '/admin/all-albums',
    name: 'AdminAllAlbums',
    component: () => import('../views/admin/AllAlbums.vue'),
    meta: { requiresAuth: true, requiresAdmin: true },
  },
  /* 暂时禁用，缺少对应的视图文件
  {
    path: '/admin/all-albums/:id',
    name: 'AdminAllAlbumEdit',
    component: () => import('../views/admin/AllAlbumEdit.vue'),
    meta: { requiresAuth: true, requiresAdmin: true },
  },
  */
  {
    path: '/admin/authorization-tool',
    name: 'AuthorizationTool',
    component: () => import('../views/admin/AuthorizationTool.vue'),
    meta: { requiresAuth: true, requiresAdmin: true },
  },
  {
    path: '/admin/email-logs',
    name: 'AdminEmailLogs',
    component: () => import('../views/admin/EmailLogs.vue'),
    meta: { requiresAuth: true, requiresAdmin: true },
  },
  {
    path: '/admin/release-monitor',
    name: 'ReleaseMonitor',
    component: () => import('../views/admin/ReleaseMonitor.vue'),
    meta: { requiresAuth: true, requiresAdmin: true },
  },
  {
    path: '/admin/ai-training',
    name: 'AITraining',
    component: () => import('../views/admin/AITraining.vue'),
    meta: { requiresAuth: true, requiresAdmin: true },
  },
  {
    path: '/admin/dynamic-covers',
    name: 'AdminDynamicCovers',
    component: AdminDynamicCovers,
    meta: { requiresAuth: true, requiresAdmin: true },
  },
  {
    path: '/admin/promotion-requests',
    name: 'AdminPromotionRequests',
    component: () => import('../views/admin/AdminPromotionRequests.vue'),
    meta: { requiresAuth: true, requiresAdmin: true },
  },
  {
    path: '/admin/labels',
    name: 'AdminLabels',
    component: () => import(/* webpackChunkName: "admin-labels" */ '../views/admin/AdminLabels.vue'),
    meta: {
      requiresAuth: true,
      requiresAdmin: true,
      title: '厂牌申请审核'
    },
  },
  {
    path: '/admin/test',
    name: 'AdminTest',
    component: () => import('../views/admin/TestPage.vue'),
    meta: { requiresAuth: true, requiresAdmin: true, title: '路由测试' },
  },
  {
    path: '/admin/rights-chain-demo',
    name: 'RightsChainDemo',
    component: () => import('../views/admin/RightsChainDemo.vue'),
    meta: { requiresAuth: true, requiresAdmin: true },
  },
  { path: '/admin/material-templates', name: 'AdminMaterials', component: AdminMaterials, meta: { requiresAuth: true, requiresAdmin: true } },
  { path: '/admin/shipments', name: 'AdminShipments', component: AdminShipments, meta: { requiresAuth: true, requiresAdmin: true } },
  { path: '/admin/workbench', name: 'AdminWorkbench', component: () => import('../views/admin/AdminWorkbench.vue'), meta: { requiresAuth: true, requiresAdmin: true } },
  // --- 新添加的静态页面路由 ---
  { path: '/music-library', name: 'MusicLibrary', component: () => import('../views/MusicLibrary.vue') },
  { path: '/studios', name: 'Studios', component: Studios },
  { path: '/services/distribution', name: 'Distribution', component: Distribution, meta: { title: '全球发行' } },
  { path: '/services/copyright', name: 'Copyright', component: Copyright, meta: { title: '版权管理' } },
  { path: '/services/analytics', name: 'Analytics', component: Analytics, meta: { title: '数据分析' } },
  { path: '/services', name: 'ServicesHub', component: ServicesHub, meta: { title: '增值服务', requiresAuth: true } },
  { path: '/services/dynamic-cover-request', name: 'DynamicCoverRequest', component: DynamicCoverRequest, meta: { title: '动态封面申请', requiresAuth: true } },
  { path: '/services/promotion-request', name: 'PromotionRequest', component: PromotionRequest, meta: { title: '推广服务申请', requiresAuth: true } },
  { path: '/forum', name: 'Forum', component: () => import('../views/Forum.vue') },
  { path: '/faq', name: 'FAQ', component: () => import('../views/FAQ.vue') },
  { path: '/support', name: 'Support', component: Support },
  { path: '/contact', name: 'Contact', component: () => import('../views/Contact.vue') },
  { path: '/about', name: 'About', component: () => import('../views/About.vue') },
  { path: '/join-us', name: 'JoinUs', component: () => import('../views/JoinUs.vue') },
  { path: '/terms', name: 'Terms', component: () => import('../views/Terms.vue') },
  { path: '/privacy', name: 'Privacy', component: () => import('../views/Privacy.vue') },
  
  {
    path: '/admin',
    name: 'Admin',
    component: () => import('../views/admin/AdminHome.vue'),
    meta: {
      requiresAuth: true,
      isAdmin: true,
      title: '管理后台'
    },
  },
  {
    path: '/admin/scheduler',
    name: 'SchedulerManager',
    component: () => import('../views/admin/SchedulerManager.vue'),
    meta: { requiresAuth: true, requiresAdmin: true },
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('../views/Dashboard.vue'),
    meta: {
      requiresAuth: true,
      title: '发行日历'
    }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: NotFound
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// 保存上一个路由信息，用于判断是否是页面刷新
let previousRoute = null;

router.beforeEach((to, from, next) => {
  const userStore = useUserStore();
  const isAuthenticated = userStore.isAuthenticated;
  const isAdmin = userStore.isAdmin;

  // 特殊处理：从AdminWorkbench离开时的清理
  if (from.path === '/admin/workbench' && to.path !== '/admin/workbench') {
    console.log('路由守卫：离开AdminWorkbench，执行预清理...');

    // 给组件一点时间执行beforeUnmount
    setTimeout(() => {
      // 清理可能残留的定时器和事件监听器
      const highestId = setTimeout(() => {}, 0);
      for (let i = 0; i < highestId; i++) {
        clearTimeout(i);
        clearInterval(i);
      }
    }, 50);
  }

  // 检查是否是页面刷新或直接访问URL
  // 页面刷新时，from.name为null且previousRoute为null或与to不同
  const isDirectAccess = !from.name && (!previousRoute || previousRoute.path !== to.path);

  // 更新previousRoute
  previousRoute = to;
  
  // 如果是直接访问URL（包括页面刷新），则允许导航，不做权限检查
  if (isDirectAccess) {
    ('直接访问URL或页面刷新，允许导航:', to.path);
    next();
    return;
  }
  
  // 如果是通过应用内导航，则进行权限检查
  ('应用内导航，进行权限检查:', to.path);
  
  if (to.meta.requiresAuth && !isAuthenticated) {
    ('需要认证但未登录，重定向到登录页');
    next('/login');
  } else if (to.meta.requiresAdmin && !isAdmin) {
    ('需要管理员权限但不是管理员，重定向到首页');
    next('/');
  } else if (to.meta.guest && isAuthenticated) {
    ('访客页面但已登录，重定向到首页');
    next('/');
  } else {
    ('权限检查通过，允许导航');
    next();
  }
});

export default router;