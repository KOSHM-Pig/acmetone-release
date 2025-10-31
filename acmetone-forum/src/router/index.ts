import {
  createRouter,
  createWebHistory,
  RouteRecordRaw,
  RouteLocationNormalized,
  RouteLocationNormalizedLoaded,
  NavigationGuardNext,
} from "vue-router";

declare module "vue-router" {
  interface RouteMeta {
    title?: string; // 页面标题是可选的字符串
    // 其他自定义 meta 属性也可以在这里定义，例如：
    // requiresAuth?: boolean;
    // isAdmin?: boolean;
  }
}

const routes: Array<RouteRecordRaw> = [
  {
    path: "/",
    name: "home",
    component: () => import("@/views/HomePage.vue"),
    meta: { title: "首页 - Acmetone音乐交流平台" },
  },
  {
    path: "/login",
    name: "login",
    component: () => import("@/views/auth/LoginPage.vue"),
    meta: { title: "登录 - Acmetone音乐交流平台" },
  },
  {
    path: "/register",
    name: "register",
    component: () => import("@/views/auth/RegisterPage.vue"),
    meta: { title: "注册 - Acmetone音乐交流平台" },
  },
  {
    path: "/profile",
    name: "profile",
    component: () => import("@/views/auth/ProfilePage.vue"),
    meta: { title: "个人中心 - Acmetone音乐交流平台", requiresAuth: true },
  },
  {
    path: "/forum",
    name: "forum",
    component: () => import("@/views/forum/ForumListPage.vue"),
    meta: { title: "论坛 - Acmetone音乐交流平台" },
  },
  {
    path: "/forum/topic/:id",
    name: "topic-detail",
    component: () => import("@/views/forum/TopicDetailPage.vue"),
    meta: { title: "话题详情 - Acmetone音乐交流平台" },
  },
  {
    path: "/forum/create",
    name: "create-topic",
    component: () => import("@/views/forum/CreateTopicPage.vue"),
    meta: { title: "发布话题 - Acmetone音乐交流平台", requiresAuth: true },
  },
  {
    path: "/music",
    name: "music",
    component: () => import("@/views/music/MusicRatingPage.vue"),
    meta: { title: "音乐发现 - Acmetone音乐交流平台" },
  },
  {
    path: "/music-rating",
    redirect: "/music",
  },
  {
    path: "/labels",
    name: "labels",
    component: () => import("@/views/labels/LabelsListPage.vue"),
    meta: { title: "厂牌专区 - Acmetone音乐交流平台" },
  },
  {
    path: "/labels/:id",
    name: "label-detail",
    component: () => import("@/views/labels/LabelDetailPage.vue"),
    meta: { title: "厂牌详情 - Acmetone音乐交流平台" },
  },
  {
    path: "/:pathMatch(.*)*",
    name: "not-found",
    component: () => import("@/views/NotFoundPage.vue"),
    meta: { title: "页面未找到 - Acmetone音乐交流平台" },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(
    to: RouteLocationNormalized,
    from: RouteLocationNormalizedLoaded,
    savedPosition
  ) {
    if (savedPosition) {
      return savedPosition;
    } else {
      return { top: 0 };
    }
  },
});

// 动态设置页面标题
router.beforeEach(
  (
    to: RouteLocationNormalized,
    from: RouteLocationNormalizedLoaded,
    next: NavigationGuardNext
  ) => {
    document.title = to.meta.title || "Acmetone音乐交流平台";
    next();
  }
);

export default router;
