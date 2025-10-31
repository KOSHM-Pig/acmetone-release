<template>
  <header class="app-header">
    <div class="container">
      <div class="header-inner">
        <div class="logo">
          <router-link to="/">
            <span class="logo-text">ACMETONE</span>
            <span class="logo-sub">Forum</span>
          </router-link>
        </div>

        <nav class="main-nav">
          <ul class="nav-list">
            <li class="nav-item">
              <router-link to="/" class="nav-link">首页</router-link>
            </li>
            <li class="nav-item">
              <router-link to="/forum" class="nav-link">论坛</router-link>
            </li>
            <li class="nav-item">
              <router-link to="/music-rating" class="nav-link">音乐评分</router-link>
            </li>
            <li class="nav-item">
              <router-link to="/labels" class="nav-link">厂牌专区</router-link>
            </li>
          </ul>
        </nav>

        <div class="header-actions">
          <div class="search-box">
            <el-input v-model="searchQuery" placeholder="搜索..." class="search-input" @keyup.enter="handleSearch">
              <template #suffix>
                <el-icon>
                  <Search />
                </el-icon>
              </template>
            </el-input>
          </div>

          <UserInfo />

          <button class="mobile-menu-toggle" @click="toggleAndControlScroll">
            <span class="bar"></span>
            <span class="bar"></span>
            <span class="bar"></span>
          </button>
        </div>
      </div>
    </div>
  </header>

  <!-- 遮罩层 -->
  <transition name="fade">
    <div v-if="mobileMenuOpen" @click="toggleAndControlScroll" class="mobile-menu-overlay"></div>
  </transition>

  <!-- 移动端菜单 -->
  <div class="mobile-menu" :class="{ 'is-active': mobileMenuOpen }">
    <div class="mobile-menu-header">
      <div class="logo">
        <router-link to="/">
          <span class="logo-text">ACMETONE</span>
          <span class="logo-sub">Forum</span>
        </router-link>
      </div>

      <button class="mobile-menu-close" @click="toggleAndControlScroll">×</button>
    </div>

    <ul class="mobile-nav-list">
      <li class="mobile-nav-item">
        <router-link to="/" class="mobile-nav-link" @click="toggleAndControlScroll">首页</router-link>
      </li>
      <li class="mobile-nav-item">
        <router-link to="/forum" class="mobile-nav-link" @click="toggleAndControlScroll">论坛</router-link>
      </li>
      <li class="mobile-nav-item">
        <router-link to="/music-rating" class="mobile-nav-link" @click="toggleAndControlScroll">音乐评分</router-link>
      </li>
      <li class="mobile-nav-item">
        <router-link to="/labels" class="mobile-nav-link" @click="toggleAndControlScroll">厂牌专区</router-link>
      </li>
    </ul>

    <div class="mobile-auth-buttons">
      <UserInfo />
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { Search } from '@element-plus/icons-vue';
import UserInfo from '@/components/common/UserInfo.vue';

const router = useRouter();
const searchQuery = ref('');
const mobileMenuOpen = ref(false);

const handleSearch = () => {
  if (searchQuery.value.trim()) {
    router.push({
      path: '/forum',
      query: { search: searchQuery.value.trim() }
    });
    searchQuery.value = '';
  }
};

const toggleAndControlScroll = () => {
  mobileMenuOpen.value = !mobileMenuOpen.value;
};

watch(mobileMenuOpen, (newValue) => {
  if (newValue) {
    document.documentElement.classList.add('no-scroll');
  } else {
    document.documentElement.classList.remove('no-scroll');
  }
}, { immediate: true });

onUnmounted(() => {
  if (mobileMenuOpen.value) {
    document.documentElement.classList.remove('no-scroll');
  }
});
</script>

<style lang="scss" scoped>
.app-header {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: var(--acmetone-header-height);
  padding: 30px 0;
  background-color: rgba(0, 0, 0, 0.9);
  z-index: $z-header;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--acmetone-border);
}

.header-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 100%;
}

/* Logo */
.logo {
  a {
    display: flex;
    flex-direction: column;
    line-height: 1;
  }

  .logo-text {
    font-size: 22px;
    font-weight: 800;
    letter-spacing: 3px;
  }

  .logo-sub {
    font-size: 12px;
    letter-spacing: 1px;
    color: var(--acmetone-hover);
    text-transform: uppercase;
  }
}

/* 主导航 */
.main-nav {
  display: flex;
  align-items: center;
  height: 100%;

  .nav-list {
    display: flex;
    align-items: center;
    list-style: none;
    height: 100%;
  }

  .nav-item {
    height: 100%;
    display: flex;
    align-items: center;
  }

  .nav-link {
    height: 100%;
    display: flex;
    align-items: center;
    padding: 0 20px;
    font-size: 14px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 1px;
    transition: var(--acmetone-transition);
    position: relative;

    &::after {
      content: '';
      position: absolute;
      bottom: -8px;
      left: 50%;
      transform: translateX(-50%);
      width: 0;
      height: 3px;
      background-color: var(--acmetone-white);
      transition: width 0.3s ease;
    }

    &:hover::after {
      width: 30%;
    }

    &.router-link-active::after {
      width: 100%;
    }

    &.router-link-active {
      color: var(--acmetone-white);
    }
  }
}

/* 头部操作区 */
.header-actions {
  display: flex;
  align-items: center;
}

.search-box {
  margin-right: 20px;

  .search-input {
    width: 220px;

    :deep(.el-input__wrapper) {
      background-color: var(--acmetone-dark-gray);
      border: 1px solid var(--acmetone-border);
    }

    :deep(.el-input__inner) {
      color: var(--acmetone-text);
      height: 36px;
      font-size: 14px;
    }
  }
}

.auth-buttons {
  display: flex;
  align-items: center;

  .login-btn {
    margin-right: 10px;
    height: 36px;
    padding: 0 15px;
    background-color: var(--acmetone-black);
    color: var(--acmetone-white);

    &:hover {
      color: var(--acmetone-black);
      border-color: var(--acmetone-white);
      background-color: var(--acmetone-white);
    }
  }

  .register-btn {
    height: 36px;
    padding: 0 15px;
    background-color: var(--acmetone-white);
    color: var(--acmetone-black);

    &:hover {
      background-color: var(--acmetone-hover);
    }
  }
}

/* 移动端菜单按钮 */
.mobile-menu-toggle {
  display: none;
  flex-direction: column;
  justify-content: space-between;
  width: 30px;
  height: 20px;
  background: none;
  border: none;
  cursor: pointer;

  @media (max-width: $breakpoint-md) {
    display: flex;
  }

  .bar {
    width: 100%;
    height: 2px;
    background-color: var(--acmetone-white);
    transition: var(--acmetone-transition);
  }
}

/* 遮罩层样式 */
.mobile-menu-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.7);
  z-index: calc($z-menu - 1);
  -webkit-backdrop-filter: blur(5px);
  backdrop-filter: blur(5px);
  pointer-events: auto;
  display: none;

  @media (max-width: $breakpoint-lg) {
    display: block;
  }
}

/* 遮罩层过渡动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.mobile-menu {
  position: fixed;
  top: 0;
  right: -100%;
  width: 300px;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.8);
  z-index: $z-menu;
  transition: right 0.3s ease;
  padding: 20px;
  display: flex;
  flex-direction: column;
  box-shadow: -10px 0 30px rgba(0, 0, 0, 0.5);

  &.is-active {
    right: 0;
  }
}

.mobile-menu-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 1rem;
  margin-bottom: 4rem;

  .logo-text {
    font-size: 20px;
    font-weight: 800;
    letter-spacing: 2px;
  }

  .mobile-menu-close {
    background: none;
    border: none;
    color: var(--acmetone-white);
    font-size: 30px;
    cursor: pointer;
  }
}

.mobile-nav-list {
  margin: 0 3rem;
  list-style: none;
  margin-bottom: 4rem;
}

.mobile-nav-item {
  margin-bottom: 0.5rem;
}

.mobile-nav-link {
  padding: 1rem 0;
  display: flex;
  font-size: 16px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;

  &:hover,
  &.router-link-active {
    color: var(--acmetone-white);
  }
}

.mobile-auth-buttons {
  margin-top: auto;
  margin-right: 2rem;
  margin-left: 2rem;
  margin-bottom: 2rem;
  display: flex;
  flex-direction: column;

  .login-btn,
  .register-btn {
    width: 100%;
    margin-bottom: 1rem;
  }
}

/* 响应式设计 */
@media (max-width: $breakpoint-lg) {

  .main-nav,
  .auth-buttons {
    display: none;
  }

  .mobile-menu-toggle {
    display: flex;
  }

  .search-box .search-input {
    width: 160px;
  }
}

@media (max-width: $breakpoint-sm) {
  .logo .logo-text {
    font-size: 18px;
  }

  .search-box {
    margin-right: 15px;

    .search-input {
      width: 120px;
    }
  }
}
</style>