<template>
  <header class="main-header">
    <div class="container">
      <div class="header-inner">
        <!-- Logo -->
        <div class="logo">
          <router-link to="/">
            <span class="logo-text">ACMETONE</span>
            <span class="logo-sub">Label</span>
          </router-link>
        </div>

        <!-- 主导航 -->
        <nav class="main-nav">
          <ul class="nav-list">
            <li class="nav-item">
              <router-link to="/" class="nav-link">主页</router-link>
            </li>
            <li class="nav-item">
              <router-link to="/labels" class="nav-link">厂牌</router-link>
            </li>
            <li class="nav-item">
              <a href="https://forum.acmetone.com" class="nav-link" target="_blank">社区</a>
            </li>
            <li class="nav-item">
              <router-link v-if="!isLoggedIn" to="/login" class="nav-link">登录</router-link>
              <router-link v-else to="/dashboard" class="nav-link">回到后台</router-link>
            </li>
          </ul>
        </nav>

        <!-- 移动端菜单按钮 -->
        <div class="header-actions">
          <button class="mobile-menu-toggle" @click="toggleMobileMenu">
            <span class="bar"></span>
            <span class="bar"></span>
            <span class="bar"></span>
          </button>
        </div>
      </div>
    </div>
  </header>

  <!-- 移动端遮罩层 -->
  <transition name="fade">
    <div v-if="mobileMenuOpen" @click="toggleMobileMenu" class="mobile-menu-overlay"></div>
  </transition>

  <!-- 移动端菜单 -->
  <div class="mobile-menu" :class="{ 'is-active': mobileMenuOpen }">
    <div class="mobile-menu-header">
      <div class="logo">
        <router-link to="/" @click="toggleMobileMenu">
          <span class="logo-text">ACMETONE</span>
          <span class="logo-sub">Label</span>
        </router-link>
      </div>
      <button class="mobile-menu-close" @click="toggleMobileMenu">×</button>
    </div>

    <ul class="mobile-nav-list">
      <li class="mobile-nav-item">
        <router-link to="/" class="mobile-nav-link" @click="toggleMobileMenu">主页</router-link>
      </li>
      <li class="mobile-nav-item">
        <router-link to="/labels" class="mobile-nav-link" @click="toggleMobileMenu">厂牌</router-link>
      </li>
      <li class="mobile-nav-item">
        <a href="https://forum.acmetone.com" class="mobile-nav-link" target="_blank" @click="toggleMobileMenu">社区</a>
      </li>
      <li class="mobile-nav-item">
        <router-link v-if="!isLoggedIn" to="/login" class="mobile-nav-link" @click="toggleMobileMenu">登录</router-link>
        <router-link v-else to="/dashboard" class="mobile-nav-link" @click="toggleMobileMenu">回到后台</router-link>
      </li>
    </ul>
  </div>
</template>

<script setup>
import { computed, onUnmounted, ref, watch } from 'vue'
import { AuthService } from '../services/AuthService.js'

const mobileMenuOpen = ref(false)

// 检查用户登录状态
const isLoggedIn = computed(() => {
  return AuthService.isAuthenticated()
})

const toggleMobileMenu = () => {
  mobileMenuOpen.value = !mobileMenuOpen.value
}

// 控制页面滚动
watch(mobileMenuOpen, (newValue) => {
  if (newValue) {
    document.documentElement.classList.add('no-scroll')
  } else {
    document.documentElement.classList.remove('no-scroll')
  }
}, { immediate: true })

// 组件卸载时清理
onUnmounted(() => {
  if (mobileMenuOpen.value) {
    document.documentElement.classList.remove('no-scroll')
  }
})
</script>

<style scoped>
.main-header {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 90px;
  padding: 30px 0;
  background-color: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-bottom: 1px solid #e5e5e5;
  z-index: 1000;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}

.header-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 100%;
}

/* Logo */
.logo a {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  line-height: 1;
  color: #1d1d1f;
  text-decoration: none;
}

.logo-text {
  font-family: 'Montserrat', sans-serif;
  font-size: 22px;
  font-weight: 800;
  letter-spacing: 3px;
  color: #1d1d1f;
  text-align: left;
}

.logo-sub {
  font-family: 'Montserrat', sans-serif;
  font-size: 12px;
  letter-spacing: 1px;
  color: #ffffff;
  text-transform: uppercase;
  text-align: left;
  background-color: #000000;
  padding: 4px 8px;
  border-radius: 4px;
  margin-top: 2px;
}

/* 主导航 */
.main-nav {
  display: flex;
  align-items: center;
  height: 100%;
}

.nav-list {
  display: flex;
  align-items: center;
  list-style: none;
  margin: 0;
  padding: 0;
  gap: 30px;
}

.nav-item {
  height: 100%;
  display: flex;
  align-items: center;
}

.nav-link {
  font-family: 'Montserrat', sans-serif;
  font-size: 1rem;
  font-weight: 500;
  color: #1d1d1f;
  text-decoration: none;
  padding: 5px 0;
  position: relative;
  transition: all 0.3s ease;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.nav-link:hover {
  opacity: 0.7;
}

.nav-link.router-link-active {
  font-weight: 700;
}

.nav-link.router-link-active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 2px;
  background-color: #1d1d1f;
}

/* 移动端菜单按钮 */
.header-actions {
  display: none;
}

.mobile-menu-toggle {
  display: flex;
  flex-direction: column;
  justify-content: space-around;
  width: 24px;
  height: 24px;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0;
}

.mobile-menu-toggle .bar {
  width: 100%;
  height: 2px;
  background-color: #1d1d1f;
  transition: all 0.3s ease;
}

/* 移动端遮罩层 */
.mobile-menu-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 999;
}

/* 移动端菜单 */
.mobile-menu {
  position: fixed;
  top: 0;
  right: -300px;
  width: 300px;
  height: 100%;
  background-color: #ffffff;
  z-index: 1001;
  transition: right 0.3s ease;
  overflow-y: auto;
}

.mobile-menu.is-active {
  right: 0;
}

.mobile-menu-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
  border-bottom: 1px solid #e5e5e5;
}

.mobile-menu-close {
  background: none;
  border: none;
  font-size: 24px;
  color: #1d1d1f;
  cursor: pointer;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mobile-nav-list {
  list-style: none;
  margin: 0;
  padding: 20px 0;
}

.mobile-nav-item {
  margin-bottom: 10px;
}

.mobile-nav-link {
  display: block;
  padding: 15px 20px;
  font-family: 'Montserrat', sans-serif;
  font-size: 16px;
  font-weight: 500;
  color: #1d1d1f;
  text-decoration: none;
  transition: all 0.3s ease;
  text-transform: uppercase;
  letter-spacing: 1px;
  position: relative;
}

.mobile-nav-link:hover {
  opacity: 0.7;
}

.mobile-nav-link.router-link-active {
  font-weight: 700;
}

.mobile-nav-link.router-link-active::after {
  content: '';
  position: absolute;
  bottom: 10px;
  left: 20px;
  width: calc(100% - 40px);
  height: 2px;
  background-color: #1d1d1f;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .main-nav {
    display: none;
  }

  .header-actions {
    display: flex;
  }
}

@media (max-width: 1024px) {
  .nav-list {
    gap: 20px;
  }

  .nav-link {
    font-size: 0.9rem;
  }
}

/* 动画效果 */
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

/* 禁止滚动 */
:global(.no-scroll) {
  overflow: hidden;
}
</style>
