<template>
  <div class="app-container">
    <div v-if="$route.name === 'music'" @click="goHome" class="back-to-home-global">
      <el-icon>
        <ArrowLeftBold />
      </el-icon>
      <span>返回首页</span>
    </div>
    <AppHeader v-if="$route.name !== 'music'" />
    <main class="app-main" :class="{ 'no-header': $route.name === 'music' }">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>
    <AppFooter v-if="$route.name !== 'music'" />
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import AppHeader from '@/components/global/AppHeader.vue'
import AppFooter from '@/components/global/AppFooter.vue'
import { ArrowLeftBold } from '@element-plus/icons-vue'

const router = useRouter()

const goHome = () => {
  router.push('/')
}
</script>

<style lang="scss">
.app-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--acmetone-black);
  position: relative;
}

.back-to-home-global {
  position: absolute;
  top: 30px;
  left: 30px;
  z-index: 1000;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 15px;
  background-color: rgba(0, 0, 0, 0.4);
  color: var(--acmetone-white);
  border-radius: 20px;
  text-decoration: none;
  font-weight: 600;
  transition: background-color 0.3s ease;
  cursor: pointer;

  &:hover {
    background-color: rgba(0, 0, 0, 0.7);
  }
}

.app-main {
  flex: 1;
  padding-top: var(--acmetone-header-height);

  &.no-header {
    padding-top: 0;
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>