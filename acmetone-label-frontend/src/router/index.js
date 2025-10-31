import { createRouter, createWebHistory } from 'vue-router'
import OnboardingService from '../services/OnboardingService'
import Home from '../views/Home.vue'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue')
  },
  {
    path: '/labels',
    name: 'Labels',
    component: () => import('../views/Labels.vue')
  },
  {
    path: '/onboarding',
    name: 'Onboarding',
    component: () => import('../views/Onboarding.vue')
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('../views/Dashboard.vue'),
    meta: { requiresOnboarding: true }
  },
  {
    path: '/owner/settings',
    name: 'OwnerSettings',
    component: () => import('../views/owner/OwnerSettings.vue'),
    meta: { requiresOnboarding: true }
  },
  {
    path: '/owner/submissions',
    name: 'Submissions',
    component: () => import('../views/owner/Submissions.vue'),
    meta: { requiresOnboarding: true }
  },
  {
    path: '/owner/releases',
    name: 'Releases',
    component: () => import('../views/owner/Releases.vue'),
    meta: { requiresOnboarding: true }
  },
  {
    path: '/owner/artists',
    name: 'Artists',
    component: () => import('../views/owner/Artists.vue'),
    meta: { requiresOnboarding: true }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫：检查向导状态
router.beforeEach(async (to, from, next) => {
  // 公开页面列表（不需要登录）
  const publicPages = ['Login', 'Home', 'Labels']
  
  // 如果是公开页面，直接通过
  if (publicPages.includes(to.name)) {
    next()
    return
  }

  // 检查是否需要token
  const token = localStorage.getItem('token')
  if (!token) {
    // 没有token，跳转到登录页
    next('/login')
    return
  }

  try {
    // 检查向导状态
    const response = await OnboardingService.getStatus()

    if (response.success && response.data) {
      const { user } = response.data

      // 如果访问需要完成向导的页面，但用户未完成向导
      if (to.meta.requiresOnboarding && !user.onboardingCompleted) {
        console.log('用户未完成向导，重定向到向导页面')
        next('/onboarding')
        return
      }

      // 如果访问向导页面，但用户已完成向导
      if (to.name === 'Onboarding' && user.onboardingCompleted) {
        console.log('用户已完成向导，重定向到仪表盘')
        next('/dashboard')
        return
      }
    }

    // 正常通过
    next()
  } catch (error) {
    console.error('检查向导状态失败:', error)

    // 如果是401错误，跳转到登录页
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      next('/login')
      return
    }

    // 其他错误，继续导航
    next()
  }
})

export default router
