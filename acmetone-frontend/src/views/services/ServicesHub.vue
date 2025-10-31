<template>
  <div class="services-hub-container">
    <div class="hub-header">
      <h1>我们的服务</h1>
      <p>一系列增值服务，旨在提升您的音乐事业。</p>
    </div>
    
    <div class="services-grid">
      <router-link to="/services/dynamic-cover-request" class="service-card-link">
        <div class="service-card">
          <div class="card-icon">
            <el-icon><PictureRounded /></el-icon>
          </div>
          <h2 class="card-title">动态封面</h2>
          <p class="card-description">为您的曲目申请定制动画封面，以增强在所有平台上的视觉吸引力。</p>
          <span class="card-cta">立即申请 <el-icon><ArrowRight /></el-icon></span>
        </div>
      </router-link>
      
      <router-link to="/services/promotion-request" class="service-card-link">
        <div class="service-card">
          <div class="card-icon">
            <el-icon><DataLine /></el-icon>
          </div>
          <h2 class="card-title">音乐推广</h2>
          <p class="card-description">提交您的作品以获得量身定制的推广计划，让世界听到您的音乐。</p>
          <span class="card-cta">立即申请 <el-icon><ArrowRight /></el-icon></span>
        </div>
      </router-link>

      <div class="service-card disabled">
        <div class="card-icon">
          <el-icon><MagicStick /></el-icon>
        </div>
        <h2 class="card-title">AI母带处理</h2>
        <p class="card-description">即将推出！由人工智能驱动的音轨一键母带处理。</p>
        <span class="card-cta">即将推出</span>
      </div>
      
    </div>
  </div>
</template>

<script setup>
import { PictureRounded, DataLine, MagicStick, ArrowRight } from '@element-plus/icons-vue';
</script>

<style scoped>
.services-hub-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 80px 40px;
  background-color: #ffffff;
  color: #1a1a1a;
  min-height: 100vh;
  font-family: 'Inter', sans-serif;
}

.hub-header {
  text-align: center;
  margin-bottom: 80px;
}

.hub-header h1 {
  font-family: 'Montserrat', sans-serif;
  font-size: 4rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  margin-bottom: 20px;
}

.hub-header p {
  font-size: 1.1rem;
  color: #6c757d;
  max-width: 600px;
  margin: 0 auto;
}

.services-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 40px;
}

.service-card-link {
  text-decoration: none;
  color: inherit;
}

.service-card {
  background-color: #ffffff;
  padding: 40px;
  border: 1px solid #e9ecef;
  border-radius: 0;
  transition: box-shadow 0.3s ease, transform 0.3s ease, border-color 0.3s ease;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.service-card:hover {
  border-color: #1a1a1a;
  transform: translateY(-8px);
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.07);
}

.service-card.disabled {
  background-color: #f8f9fa;
  border-color: #e9ecef;
  cursor: not-allowed;
}

.service-card.disabled:hover {
  transform: none;
  box-shadow: none;
  border-color: #e9ecef;
  border-color: #e9ecef;
}

.card-icon {
  font-size: 2.8rem;
  margin-bottom: 25px;
  color: #000000;
}

.service-card.disabled .card-icon {
  color: #adb5bd;
}

.card-title {
  font-family: 'Montserrat', sans-serif;
  font-size: 1.5rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 15px;
}

.service-card.disabled .card-title {
  color: #adb5bd;
}

.card-description {
  font-size: 1rem;
  color: #6c757d;
  line-height: 1.7;
  flex-grow: 1;
  margin-bottom: 30px;
}

.service-card.disabled .card-description {
  color: #adb5bd;
}

.card-cta {
  font-weight: 600;
  color: #1a1a1a;
  display: flex;
  align-items: center;
  transition: color 0.3s;
}

.service-card:hover .card-cta {
  color: #000;
}

.card-cta .el-icon {
  margin-left: 8px;
  transition: transform 0.3s;
}

.service-card:hover .card-cta .el-icon {
  transform: translateX(5px);
}

.service-card.disabled .card-cta {
  color: #adb5bd;
}

/* 响应式布局样式 */
@media (max-width: 1200px) {
  .services-grid {
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 30px;
  }
  
  .service-card {
    padding: 30px;
  }
}

@media (max-width: 992px) {
  .services-hub-container {
    padding: 60px 30px;
  }
  
  .hub-header {
    margin-bottom: 60px;
  }
  
  .hub-header h1 {
    font-size: 3.5rem;
  }
}

@media (max-width: 768px) {
  .services-hub-container {
    padding: 40px 20px;
  }
  
  .hub-header {
    margin-bottom: 40px;
  }
  
  .hub-header h1 {
    font-size: 2.8rem;
    margin-bottom: 15px;
  }
  
  .hub-header p {
    font-size: 1rem;
  }
  
  .services-grid {
    grid-template-columns: 1fr;
    gap: 25px;
  }
  
  .service-card {
    padding: 25px;
  }
  
  .card-icon {
    font-size: 2.4rem;
    margin-bottom: 20px;
  }
  
  .card-title {
    font-size: 1.3rem;
  }
}

@media (max-width: 480px) {
  .services-hub-container {
    padding: 30px 15px;
  }
  
  .hub-header h1 {
    font-size: 2.2rem;
    letter-spacing: 1px;
  }
  
  .hub-header p {
    font-size: 0.9rem;
  }
  
  .service-card {
    padding: 20px;
  }
  
  .card-icon {
    font-size: 2rem;
    margin-bottom: 15px;
  }
  
  .card-title {
    font-size: 1.2rem;
    margin-bottom: 10px;
  }
  
  .card-description {
    font-size: 0.9rem;
    margin-bottom: 20px;
  }
}
</style> 