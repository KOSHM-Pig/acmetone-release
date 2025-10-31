<template>
  <div class="not-found">
    <div class="content">
      <div class="error-code">404</div>
      <h1 class="error-title">页面未找到</h1>
      <p class="error-desc">抱歉，您访问的页面不存在或已被移除</p>
      <div class="actions">
        <router-link to="/" class="back-button">
          <el-icon>
            <Back />
          </el-icon>
          返回首页
        </router-link>
      </div>
    </div>

    <div class="background">
      <div class="waves"></div>
    </div>
  </div>
</template>

<script setup>
import { Back } from '@element-plus/icons-vue'
</script>

<style lang="scss" scoped>
.not-found {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  padding: 0 20px;
}

.content {
  text-align: center;
  position: relative;
  z-index: 2;
  max-width: 600px;
}

.error-code {
  font-size: 180px;
  font-weight: 900;
  line-height: 1;
  color: var(--genre-edm);
  margin-bottom: 20px;
  text-shadow: 0 10px 30px rgba(0, 200, 255, 0.3);
  letter-spacing: -5px;
}

.error-title {
  font-size: 36px;
  margin-bottom: 20px;
}

.error-desc {
  font-size: 18px;
  color: var(--acmetone-text-secondary);
  margin-bottom: 40px;
}

.actions {
  .back-button {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    background-color: var(--genre-edm);
    color: var(--acmetone-black);
    padding: 12px 30px;
    font-size: 18px;
    font-weight: 600;
    border-radius: 0;
    transition: all 0.3s ease;

    &:hover {
      background-color: var(--acmetone-white);
      transform: translateY(-3px);
    }
  }
}

.background {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
}

.waves {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 200px;
  background: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 320"><path fill="%2300c8ff" fill-opacity="0.1" d="M0,192L48,176C96,160,192,128,288,133.3C384,139,480,181,576,181.3C672,181,768,139,864,122.7C960,107,1056,117,1152,138.7C1248,160,1344,192,1392,208L1440,224L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path></svg>') repeat-x;
  background-size: 100% 100%;
  animation: wave 20s linear infinite;
  opacity: 0.5;
}

.waves::before {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 240px;
  background: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 320"><path fill="%2300c8ff" fill-opacity="0.05" d="M0,96L48,122.7C96,149,192,203,288,208C384,213,480,171,576,165.3C672,160,768,192,864,213.3C960,235,1056,245,1152,224C1248,203,1344,149,1392,122.7L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path></svg>') repeat-x;
  background-size: 100% 100%;
  animation: wave 15s linear infinite;
  opacity: 0.7;
}

@keyframes wave {
  0% {
    background-position-x: 0;
  }

  100% {
    background-position-x: 1440px;
  }
}

@media (max-width: $breakpoint-md) {
  .error-code {
    font-size: 140px;
  }

  .error-title {
    font-size: 28px;
  }

  .error-desc {
    font-size: 16px;
  }
}

@media (max-width: $breakpoint-sm) {
  .error-code {
    font-size: 100px;
  }

  .error-title {
    font-size: 24px;
  }

  .error-desc {
    font-size: 14px;
  }

  .actions .back-button {
    padding: 10px 20px;
    font-size: 16px;
  }
}
</style>