<template>
  <div class="banner-slider">
    <el-carousel :motion-blur=true interval="5000" arrow="always" indicator-position="none">
      <el-carousel-item v-for="(banner, index) in banners" :key="index" class="banner-item">
        <div class="banner-content" :style="{ backgroundImage: `url(${banner.image})` }">
          <div class="banner-overlay"></div>
          <div class="container">
            <div class="banner-text">
              <h2 class="banner-title">{{ banner.title }}</h2>
              <p class="banner-description">{{ banner.description }}</p>
              <a :href="banner.link" class="garrix-button">了解更多</a>
            </div>
          </div>
        </div>
      </el-carousel-item>
    </el-carousel>
  </div>
</template>

<script setup>
// 模拟数据，实际项目中可以从API获取
const banners = [
  {
    title: '电子音乐盛典',
    description: '最新音乐节资讯，尽在Acmetone音乐交流平台',
    image: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80',
    link: '#'
  },
  {
    title: '新人制作人专区',
    description: '分享你的作品，获得专业评价和建议',
    image: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1469&q=80',
    link: '#'
  },
  {
    title: '音乐制作教程',
    description: '从入门到精通，电子音乐制作全流程解析',
    image: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80',
    link: '#'
  }
]
</script>

<style lang="scss" scoped>
.banner-slider {
  position: relative;
  margin-bottom: 2rem;
  z-index: $z-content;

  :deep(.el-carousel) {
    height: auto;
  }

  :deep(.el-carousel__arrow) {
    background-color: rgba(0, 0, 0, 0.5);
    border-radius: 0;
    width: 50px;
    height: 50px;

    &:hover {
      background-color: var(--acmetone-white);
      color: var(--acmetone-black);
    }

    i {
      font-size: 24px;
    }
  }
}

.banner-item {
  width: 100%;
  height: 100%;
}

.banner-content {
  position: relative;
  width: 100%;
  height: 100%;
  background-size: cover;
  background-position: center;
  display: flex;
  align-items: center;
}

.banner-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(to right, rgba(0, 0, 0, 0.8) 0%, rgba(0, 0, 0, 0.4) 100%);
}

.container {
  margin: 0 10rem;
}

.banner-text {
  position: relative;
  z-index: $z-content + 1;
  max-width: 600px;
  padding: 0 20px;
}

.banner-title {
  font-size: 48px;
  font-weight: 800;
  margin-bottom: 20px;
  text-transform: uppercase;
  letter-spacing: 2px;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);

  &::after {
    content: '';
    display: block;
    width: 80px;
    height: 4px;
    background-color: var(--acmetone-white);
    margin-top: 12px;
  }
}

.banner-description {
  font-size: 18px;
  line-height: 1.6;
  margin-bottom: 30px;
  text-shadow: 0 1px 5px rgba(0, 0, 0, 0.8);
}

/* 响应式设计 */
@media (max-width: $breakpoint-lg) {
  .container {
    margin: 0 8rem;
  }
}

@media (max-width: $breakpoint-md) {
  .container {
    margin: 0 4rem;
  }

  .banner-slider {
    :deep(.el-carousel__arrow) {
      width: 40px;
      height: 40px;

      i {
        font-size: 20px;
      }
    }
  }

  .banner-title {
    font-size: 36px;
  }

  .banner-description {
    font-size: 16px;
  }
}

@media (max-width: $breakpoint-sm) {
  .container {
    margin: 0 2rem;
  }

  .banner-slider {
    :deep(.el-carousel__arrow) {
      width: 35px;
      height: 35px;

      i {
        font-size: 18px;
      }
    }
  }

  .banner-title {
    font-size: 28px;
  }

  .banner-description {
    font-size: 14px;
  }
}
</style>