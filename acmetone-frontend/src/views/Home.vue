<template>
  <div class="home-container">
    <!-- 全屏英雄区 -->
    <section class="hero-section">
      <video autoplay loop muted playsinline class="video-background">
        <source src="/videos/header.webm" type="video/webm">
        您的浏览器不支持视频标签。
      </video>
      <div class="hero-overlay"></div>
      <div class="hero-content">
        <h2 class="hero-title">ACMETONE</h2>
        <p class="hero-subtitle">数字音乐发行平台</p>
        <div class="hero-text">
          <p>致力让 AI、数字化 为您的音乐全球平台200+发行 赋能</p>
          <div class="hero-buttons">
            <button class="hero-button primary" @click="$router.push('/register')">开始发行</button>
            <button class="hero-button secondary" @click="scrollToContent">了解更多</button>
          </div>
        </div>
      </div>
      <!-- 向下箭头 -->
      <div class="scroll-down-arrow" @click="scrollToContent">
        <el-icon :size="24"><ArrowDown /></el-icon>
      </div>
    </section>

    <!-- 最新专辑展示 -->
    <section class="latest-release" v-if="latestAlbum" id="latest-release">
      <div class="release-grid">
        <div class="release-info">
          <div class="release-header">
            <div class="release-badge">最新发行</div>
            <div class="release-date">{{ formatDate(latestAlbum.releaseDate) }}</div>
          </div>
          <div v-if="latestAlbum.albumName" class="release-title-bg">{{ latestAlbum.albumName }}</div>
          <h2 class="release-title">{{ latestAlbum.albumName }}</h2>
          <div class="release-artist">
            <span class="artist-line"></span>
            {{ latestAlbum.artistName }}
          </div>
          <div class="release-action">
            <button class="view-button" @click="navigateToAlbum(latestAlbum.slug)">
              了解详情
            </button>
          </div>
        </div>
        <div class="release-image">
          <img 
            :src="getImageUrl(getThumbnailUrl(latestAlbum.coverImage))" 
            :alt="latestAlbum.albumName"
          />
        </div>
      </div>
    </section>

    <!-- 服务亮点 -->
    <section class="modern-section services-highlight">
      <div class="section-container">
        <h2 class="modern-section-title">全方位音乐服务</h2>
        <p class="modern-section-subtitle">发行数字化管理，我们为您提供一站式解决方案</p>
        <div class="highlight-grid">
          <div class="highlight-card">
            <div class="card-icon">
              <el-icon><Position /></el-icon>
            </div>
            <h3 class="card-title">全球发行</h3>
            <p class="card-description">一键分发至全球主流平台，覆盖广泛听众。</p>
          </div>
          <div class="highlight-card">
            <div class="card-icon">
              <el-icon><CopyDocument /></el-icon>
            </div>
            <h3 class="card-title">AI赋能</h3>
            <p class="card-description">特定知识微调AI大模型，为您提供发行通知</p>
          </div>
          <div class="highlight-card">
            <div class="card-icon">
              <el-icon><DataAnalysis /></el-icon>
            </div>
            <h3 class="card-title">数据洞察</h3>
            <p class="card-description">深度分析播放数据，助您制定精准营销策略。</p>
          </div>
        </div>
      </div>
    </section>

    <!-- 发行流程 -->
    <section class="modern-section steps-visual">
      <div class="section-container">
        <h2 class="modern-section-title">简单的发行流程</h2>
        <div class="steps-wrapper">
          <div class="step-item">
            <div class="step-number">1</div>
            <h3 class="step-title">实名认证</h3>
            <p class="step-description">确保您的身份真实可靠且预留结算信息</p>
          </div>
          <div class="step-arrow">→</div>
          <div class="step-item">
            <div class="step-number">2</div>
            <h3 class="step-title">专辑创建</h3>
            <p class="step-description">上传您的音乐和专辑信息并签署发行协议。</p>
          </div>
          <div class="step-arrow">→</div>
          <div class="step-item">
            <div class="step-number">3</div>
            <h3 class="step-title">提交审核</h3>
            <p class="step-description">我们的团队将快速审核您的作品。</p>
          </div>
          <div class="step-arrow">→</div>
          <div class="step-item">
            <div class="step-number">4</div>
            <h3 class="step-title">成功发行</h3>
            <p class="step-description">在全球范围内收获您的听众和收益。</p>
          </div>
        </div>
      </div>
    </section>

    <!-- 分发平台 -->
    <section class="modern-section distribution-platforms">
      <div class="section-container">
        <h2 class="modern-section-title">覆盖全球主流音乐平台</h2>
        <p class="modern-section-subtitle">我们将您的音乐分发至全球各地的热门商店和流媒体服务，包括但不限于...</p>
        <div class="platform-scroller">
          <div class="platform-grid">
            <!-- Original Items -->
            <div class="platform-item"><img src="/网易云.svg" alt="网易云音乐"/><span>网易云音乐</span></div>
            <div class="platform-item"><img src="/QQ音乐.svg" alt="QQ音乐"/><span>QQ音乐</span></div>
            <div class="platform-item"><img src="/酷狗音乐.svg" alt="酷狗音乐"/><span>酷狗音乐</span></div>
            <div class="platform-item"><img src="/酷我音乐.svg" alt="酷我音乐"/><span>酷我音乐</span></div>
            <div class="platform-item"><img src="/汽水音乐.svg" alt="汽水音乐"/><span>汽水音乐 (抖音)</span></div>
            <div class="platform-item"><img src="/Spotify.svg" alt="Spotify"/><span>Spotify</span></div>
            <div class="platform-item"><img src="/applemusic.svg" alt="Apple Music"/><span>Apple Music</span></div>
            <div class="platform-item"><img src="/youtube.svg" alt="YouTube Music"/><span>YouTube Music</span></div>
            <div class="platform-item"><img src="/soundcloud.svg" alt="SoundCloud"/><span>SoundCloud</span></div>
            <div class="platform-item"><img src="/tidal.png" alt="Tidal"/><span>TIDAL</span></div>
            <div class="platform-item"><img src="/amazon-music.svg" alt="Amazon Music"/><span>Amazon Music</span></div>
            <div class="platform-item"><img src="/deezer.svg" alt="Deezer"/><span>Deezer</span></div>
            <div class="platform-item"><img src="/joox.svg" alt="Joox"/><span>Joox</span></div>
            <div class="platform-item"><img src="/huawei-music.webp" alt="华为音乐"/><span>华为音乐</span></div>
            <div class="platform-item"><img src="/xiaomi.svg" alt="小米音乐"/><span>小米音乐</span></div>
            <div class="platform-item"><img src="/anghami.png" alt="Anghami"/><span>Anghami</span></div>
            <div class="platform-item"><img src="/napster.svg" alt="Napster"/><span>Napster</span></div>
            <div class="platform-item"><img src="/iheartradio.svg" alt="iHeartRadio"/><span>iHeartRadio</span></div>
            <div class="platform-item"><img src="/kkbox.svg" alt="KKBOX"/><span>KKBOX</span></div>
            <div class="platform-item"><img src="/moov.png" alt="MOOV"/><span>MOOV</span></div>


            <div class="platform-item"><img src="/网易云.svg" alt="网易云音乐"/><span>网易云音乐</span></div>
            <div class="platform-item"><img src="/QQ音乐.svg" alt="QQ音乐"/><span>QQ音乐</span></div>
            <div class="platform-item"><img src="/酷狗音乐.svg" alt="酷狗音乐"/><span>酷狗音乐</span></div>
            <div class="platform-item"><img src="/酷我音乐.svg" alt="酷我音乐"/><span>酷我音乐</span></div>
            <div class="platform-item"><img src="/汽水音乐.svg" alt="汽水音乐"/><span>汽水音乐 (抖音)</span></div>
            <div class="platform-item"><img src="/Spotify.svg" alt="Spotify"/><span>Spotify</span></div>
            <div class="platform-item"><img src="/applemusic.svg" alt="Apple Music"/><span>Apple Music</span></div>
            <div class="platform-item"><img src="/youtube.svg" alt="YouTube Music"/><span>YouTube Music</span></div>
            <div class="platform-item"><img src="/soundcloud.svg" alt="SoundCloud"/><span>SoundCloud</span></div>
            <div class="platform-item"><img src="/tidal.png" alt="Tidal"/><span>TIDAL</span></div>
            <div class="platform-item"><img src="/amazon-music.svg" alt="Amazon Music"/><span>Amazon Music</span></div>
            <div class="platform-item"><img src="/deezer.svg" alt="Deezer"/><span>Deezer</span></div>
            <div class="platform-item"><img src="/joox.svg" alt="Joox"/><span>Joox</span></div>
            <div class="platform-item"><img src="/huawei-music.webp" alt="华为音乐"/><span>华为音乐</span></div>
            <div class="platform-item"><img src="/xiaomi.svg" alt="小米音乐"/><span>小米音乐</span></div>
            <div class="platform-item"><img src="/anghami.png" alt="Anghami"/><span>Anghami</span></div>
            <div class="platform-item"><img src="/napster.svg" alt="Napster"/><span>Napster</span></div>
            <div class="platform-item"><img src="/iheartradio.svg" alt="iHeartRadio"/><span>iHeartRadio</span></div>
            <div class="platform-item"><img src="/kkbox.svg" alt="KKBOX"/><span>KKBOX</span></div>
            <div class="platform-item"><img src="/moov.png" alt="MOOV"/><span>MOOV</span></div>
          </div>
        </div>
      </div>
    </section>

    <!-- 特别优势 -->
    <section class="modern-section special-advantages">
        <div class="section-container">
            <h2 class="modern-section-title">特别优势</h2>
            <p class="modern-section-subtitle">我们关注您的每一步，提供超越发行的贴心支持。</p>
            <div class="advantage-row">
                <div class="advantage-text">
                    <div class="card-icon"><el-icon><Promotion /></el-icon></div>
                    <h3 class="card-title">邮件通知提醒</h3>
                    <p class="card-description">从作品审核、平台上线到版税报告，每一个关键节点我们都会主动通知，让您全程安心。</p>
                </div>
                <div class="advantage-image">
                    <img src="/images/features/mail.png" alt="邮件通知提醒示意图">
                </div>
            </div>
            <div class="advantage-row">
                <div class="advantage-text">
                    <div class="card-icon"><el-icon><Service /></el-icon></div>
                    <h3 class="card-title">专属人工服务</h3>
                    <p class="card-description">我们提供一对一的专属客服支持，高效解答您在发行过程中遇到的任何问题，为您保驾护航。</p>
                </div>
                <div class="advantage-image">
                    <img src="/images/features/service.png" alt="专属人工服务示意图">
                </div>
            </div>
            <div class="advantage-row">
                <div class="advantage-text">
                    <div class="card-icon"><el-icon><Connection /></el-icon></div>
                    <h3 class="card-title">节奏阵列对接</h3>
                    <p class="card-description">无缝对接中国首个电子音乐厂牌汇总网，支持AI审核与自定义邮件通知，高效处理来自各大厂牌的投稿。</p>
                </div>
                <div class="advantage-image">
                    <img src="/images/features/beatarray.png" alt="节奏阵列对接示意图">
                </div>
            </div>
            <div class="advantage-row">
                <div class="advantage-text">
                    <div class="card-icon"><el-icon><Link /></el-icon></div>
                    <h3 class="card-title">专辑链接分享</h3>
                    <p class="card-description">优美的响应式设计，完美适配电脑、平板和手机。一个页面，汇总您在各大主流音乐平台的收听链接，让分享更优雅。</p>
                </div>
                <div class="advantage-image">
                    <img src="/images/features/Link.png" alt="专辑链接分享示意图">
                </div>
            </div>
        </div>
    </section>

    <!-- 行动召唤 -->
    <section class="modern-section final-cta">
        <div class="cta-content">
            <h2 class="cta-title">准备好让世界听到你的声音了吗？</h2>
            <p class="cta-subtitle">立即加入，开启您的全球音乐之旅。</p>
            <button class="cta-button primary" @click="$router.push('/register')">免费开始</button>
        </div>
    </section>
  </div>
</template>

<script>
// This normal <script> block is executed only once per module import.
// We define latestAlbum here to act as a simple, module-level cache.
import { ref } from 'vue';
const latestAlbum = ref(null);
</script>

<script setup>
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import axios from 'axios';
import { API_BASE_URL } from '@/config';
import {
  Document,
  User,
  Connection,
  ArrowDown,
  Check,
  Position,
  DataAnalysis,
  Money,
  Promotion,
  CopyDocument,
  VideoPlay,
  Star,
  Timer,
  Service,
  Link
} from '@element-plus/icons-vue';
import { STATIC_BASE_URL } from '../config';

const router = useRouter();
// latestAlbum is now defined in the script block above, acting as a cache.

// 辅助函数：生成缩略图URL
const getThumbnailUrl = (imagePath) => {
  if (!imagePath) return '';
  const parts = imagePath.split('/');
  const filename = parts.pop();
  const thumbFilename = `thumb_${filename}`;
  return `${parts.join('/')}/thumbnails/${thumbFilename}`;
};

// 格式化日期
const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return date.toLocaleDateString('zh-CN', options);
};

// 获取图片URL
const getImageUrl = (imagePath) => {
  if (!imagePath) return 'https://element-plus.org/images/element-plus-logo.svg';
  if (imagePath.startsWith('http')) return imagePath;
  return `${STATIC_BASE_URL}/${imagePath}`;
};

// 导航到专辑详情页
const navigateToAlbum = (slug) => {
  router.push(`/album/${slug}`);
};

// 滚动到内容区域
const scrollToContent = () => {
  const section = document.getElementById('latest-release');
  if (section) {
    section.scrollIntoView({ 
      behavior: 'smooth', 
      block: 'start' // 滚动到元素顶部
    });
  }
};

// 获取最新专辑
const fetchLatestAlbum = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/album-links/public/list?limit=1`);
    if (response.data && response.data.links && response.data.links.length > 0) {
      latestAlbum.value = response.data.links[0];
    }
  } catch (error) {
    console.error('获取最新专辑失败:', error);
  }
};

onMounted(() => {
  // Only fetch if the cached data is not available.
  if (!latestAlbum.value) {
    fetchLatestAlbum();
  }
});
</script>

<style scoped>
/* --- 全局和基础样式 --- */
.home-container {
  color: #000000;
  background-color: #ffffff;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  margin: 0;
  padding: 0;
}

/* --- 英雄区 (基本无变化) --- */
.hero-section {
  position: relative;
  height: 100vh;
  min-height: 600px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  overflow: hidden;
  box-sizing: border-box; /* 确保内边距和边框包含在总高度和宽度内 */
  padding-top: 80px; /* 为固定定位的导航栏预留空间 */
}
.video-background {
  position: absolute;
  top: 0; left: 0; width: 100%; height: 100%;
  object-fit: cover; z-index: 1;
  filter: grayscale(100%);
}
.hero-overlay {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.5);
  z-index: 2;
}
.hero-content {
  position: relative; z-index: 3; text-align: center;
  padding: 0 20px; max-width: 900px;
}
.hero-title {
  font-size: clamp(40px, 10vw, 80px);
  font-weight: 700; text-transform: uppercase;
  letter-spacing: 5px; margin-bottom: 20px; line-height: 1;
}
.hero-subtitle {
  font-size: clamp(18px, 3vw, 24px);
  font-weight: 400; letter-spacing: 3px;
  text-transform: uppercase; margin-bottom: 40px;
}
.hero-text p {
  font-size: clamp(16px, 2.5vw, 20px);
  line-height: 1.6; margin-bottom: 30px;
  max-width: 700px; margin-left: auto; margin-right: auto;
}
.hero-buttons { display: flex; gap: 20px; justify-content: center; }
.hero-button {
  padding: 15px 30px; font-size: 16px; font-weight: 500;
  text-transform: uppercase; letter-spacing: 1px;
  cursor: pointer; transition: all 0.3s ease; border: none;
}
.hero-button.primary { background-color: #ffffff; color: #000000; }
.hero-button.primary:hover { background-color: #f0f0f0; }
.hero-button.secondary { background-color: transparent; border: 1px solid #ffffff; color: #ffffff; }
.hero-button.secondary:hover { background-color: rgba(255, 255, 255, 0.1); }
.scroll-down-arrow {
  position: absolute; bottom: 30px; left: 50%;
  transform: translateX(-50%); z-index: 3;
  cursor: pointer; animation: bounce 2s infinite; color: #ffffff;
}
@keyframes bounce {
  0%, 20%, 50%, 80%, 100% { transform: translateY(0) translateX(-50%); }
  40% { transform: translateY(-20px) translateX(-50%); }
  60% { transform: translateY(-10px) translateX(-50%); }
}

/* --- 最新发行 (基本无变化) --- */
.latest-release {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 20px;
  min-height: calc(100vh - 160px); /* 精确计算高度：视口高度减去导航栏高度 */
  display: flex;
  align-items: center;
  scroll-margin-top: 80px; /* 保留这个正确的属性，用于滚动定位 */
}
.release-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 60px; align-items: center; width: 100%; }
.release-info { position: relative; overflow: hidden; padding: 20px; }
.release-header { display: flex; align-items: center; gap: 15px; margin-bottom: 30px; }
.release-date { font-size: 16px; color: #333333; }
.release-badge {
  background-color: #000000; color: #ffffff; font-size: 14px;
  padding: 5px 15px; text-transform: uppercase; letter-spacing: 1px; font-weight: 500;
}
.release-title-bg {
    position: absolute; top: 50%; left: 20px; transform: translateY(-50%);
    font-size: 250px; font-weight: 900; color: rgba(0, 0, 0, 0.05);
    z-index: 1; text-transform: uppercase; white-space: nowrap; user-select: none;
}
.release-title {
  font-size: clamp(48px, 12vw, 120px); font-weight: 900; line-height: 1;
  text-transform: uppercase; margin-bottom: 20px; color: #000000;
  position: relative; z-index: 2;
}
.release-artist {
  display: flex; align-items: center; font-size: 20px;
  font-family: serif; color: #666666; margin-bottom: 40px;
  position: relative; z-index: 2;
}
.artist-line { width: 30px; height: 1px; background-color: #999999; margin-right: 15px; }
.release-action { margin-top: 40px; position: relative; z-index: 2; }
.view-button {
  background-color: transparent; border: 2px solid #000000; color: #000000;
  font-size: 16px; font-weight: 700; text-transform: uppercase;
  letter-spacing: 1px; padding: 15px 30px; cursor: pointer; transition: all 0.3s ease;
}
.view-button:hover { background-color: #000000; color: #ffffff; }
.release-image {
  width: 100%;
  aspect-ratio: 1 / 1;
  max-width: 600px;
  justify-self: end;
}
.release-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* --- 全新现代化板块样式 --- */
.modern-section {
  padding: 100px 20px;
  border-bottom: 1px solid #e5e5e5;
}
.modern-section:last-of-type {
  border-bottom: none;
}
.section-container {
  max-width: 1200px;
  margin: 0 auto;
  text-align: center;
}
.modern-section-title {
  font-size: clamp(28px, 5vw, 42px);
  font-weight: 700;
  margin-bottom: 20px;
  text-transform: uppercase;
  letter-spacing: 1px;
}
.modern-section-subtitle {
  font-size: clamp(16px, 2.5vw, 18px);
  color: #666;
  max-width: 600px;
  margin: 0 auto 60px auto;
  line-height: 1.6;
}

/* 服务亮点 */
.services-highlight { background-color: #f9f9f9; }
.highlight-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 40px;
}
.highlight-card {
  text-align: center;
}
.card-icon {
  font-size: 40px;
  margin-bottom: 20px;
  color: #000;
}
.card-title {
  font-size: 22px;
  font-weight: 600;
  margin-bottom: 15px;
  text-transform: uppercase;
}
.card-description {
  color: #666;
  line-height: 1.6;
}

/* 发行流程 */
.steps-visual {
  background-color: #ffffff;
}
.steps-wrapper {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  gap: 20px;
  flex-wrap: wrap;
}
.step-item {
  flex: 1;
  min-width: 200px;
  text-align: center;
}
.step-number {
  font-size: 24px;
  font-weight: 700;
  color: #fff;
  background-color: #000;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20px auto;
}
.step-title {
  font-size: 18px;
  font-weight: 600;
  text-transform: uppercase;
  margin-bottom: 10px;
}
.step-arrow {
  font-size: 24px;
  font-weight: bold;
  margin-top: 12px;
  color: #ccc;
}
@media (max-width: 920px) {
  .step-arrow { display: none; }
}

/* 分发平台 */
.distribution-platforms {
  background-color: #f9f9f9;
  overflow: hidden;
}
.platform-scroller {
  width: 100%;
  overflow: hidden;
  position: relative;
  -webkit-mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent);
  mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent);
}
.platform-grid {
  display: flex;
  width: max-content;
  animation: scroll 40s linear infinite;
}
.platform-scroller:hover .platform-grid {
  animation-play-state: paused;
}
@keyframes scroll {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}
.platform-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;
  text-align: center;
  margin: 0 40px; /* 增加图标之间的间距 */
  width: 150px;
}
.platform-item img {
  height: 60px;
  max-width: 120px;
  object-fit: contain;
  filter: grayscale(100%);
  opacity: 0.7;
  transition: all 0.3s ease;
}
.platform-item:hover img {
  filter: grayscale(0);
  opacity: 1;
}
.platform-item span {
  font-weight: 500;
  color: #333;
}

/* 最终行动召唤 */
.final-cta {
  background-color: #000;
  color: #fff;
  padding: 120px 20px;
  text-align: center;
}
.cta-title {
  font-size: clamp(32px, 5vw, 48px);
  font-weight: 700;
  text-transform: uppercase;
  margin-bottom: 20px;
}
.cta-subtitle {
  font-size: clamp(16px, 2.5vw, 20px);
  color: #ccc;
  margin-bottom: 40px;
}
.cta-button {
  background-color: #fff;
  color: #000;
  border: none;
  padding: 18px 40px;
  font-size: 16px;
  font-weight: 600;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.3s ease;
}
.cta-button:hover {
  background-color: #f0f0f0;
  transform: scale(1.05);
}

/* 响应式调整 */
@media (max-width: 1024px) {
  .release-grid { grid-template-columns: 1fr; gap: 40px; }
  .release-image {
    justify-self: center;
  }
  .release-title { font-size: 80px; }
}

@media (max-width: 768px) {
  .release-title { font-size: 48px; }
  .release-image { order: -1; }
  .advantage-row { grid-template-columns: 1fr; }
  .advantage-text { text-align: center; }
  .advantage-image { margin-top: 30px; }
}

/* 特别优势 */
.special-advantages {
  background-color: #ffffff;
}
.advantage-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 60px;
  align-items: center;
  margin-bottom: 80px;
}
.advantage-row:last-child {
  margin-bottom: 0;
}
.advantage-text {
  text-align: left;
}
.advantage-image img {
  width: 100%;
  border-radius: 8px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s ease;
}
.advantage-image img:hover {
  transform: scale(1.03);
}

/* 发行流程 */
.steps-visual {
  background-color: #ffffff;
}
@media (max-width: 768px) {
  .release-title { font-size: 48px; }
  .release-image { order: -1; }
  .advantage-row { grid-template-columns: 1fr; }
  .advantage-text { text-align: center; }
  .advantage-image { margin-top: 30px; }
}
</style> 