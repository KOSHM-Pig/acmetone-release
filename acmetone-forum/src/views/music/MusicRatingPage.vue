<template>
  <div class="music-rating-page" :style="pageBackgroundStyle">
    <div class="background-overlay"></div>

    <div class="container">
      <div class="page-header">
        <h1 class="page-title">音乐发现</h1>
        <p class="page-subtitle">滑动或点击切换，发现你的下一首挚爱</p>
      </div>
      
      <div class="rating-swiper-container">
        <swiper
          :modules="[EffectCoverflow, Navigation]"
          :effect="'coverflow'"
          :grab-cursor="true"
          :centered-slides="true"
          :slides-per-view="'auto'"
          :coverflow-effect="{
            rotate: 50,
            stretch: 0,
            depth: 100,
            modifier: 1,
            slideShadows: true,
          }"
          :navigation="{
            nextEl: '.swiper-button-next',
            prevEl: '.swiper-button-prev',
          }"
          @swiper="onSwiper"
          @slide-change="onSlideChange"
          class="rating-swiper"
        >
          <swiper-slide v-for="track in tracks" :key="track.id" class="rating-slide">
            <div class="track-card">
              <div class="track-artwork">
                <img :src="track.artwork" :alt="track.title" class="track-cover">
              </div>
              <div class="track-info">
                <h3 class="track-title">{{ track.title }}</h3>
                <p class="track-artist">{{ track.artist }}</p>
                <p class="track-genre">{{ track.genre }}</p>
              </div>
              <div class="rating-control">
                <p class="rate-prompt">为这首歌评分</p>
                <el-rate
                  v-model="track.userRating"
                  @change="onRate(track)"
                  :colors="['#4f4f52', '#ffab00', '#ffab00']"
                  size="large"
                />
              </div>
            </div>
          </swiper-slide>
        </swiper>
        
        <!-- 电脑端切换按钮 -->
        <div class="swiper-button-prev"></div>
        <div class="swiper-button-next"></div>
      </div>
      
      <transition name="fade">
        <div v-if="ratedCurrentTrack" class="comments-section">
          <h2 class="section-title">评论区</h2>
          <div class="comment-list">
            <div v-if="activeTrack.comments.length === 0" class="no-comments">
              暂无评论，快来抢占沙发！
            </div>
            <div v-else v-for="comment in activeTrack.comments" :key="comment.id" class="comment-item">
              <img :src="comment.user.avatar" class="comment-avatar" />
              <div class="comment-content">
                <div class="comment-header">
                  <span class="comment-user">{{ comment.user.name }}</span>
                  <span class="comment-time">{{ formatTime(comment.createdAt) }}</span>
                </div>
                <p class="comment-text">{{ comment.text }}</p>
              </div>
            </div>
          </div>
          <div class="comment-form">
            <el-input v-model="newComment" placeholder="发表你的看法..." class="comment-input" />
            <el-button type="primary" @click="submitComment" class="submit-comment-btn">发表</el-button>
          </div>
        </div>
      </transition>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { Swiper, SwiperSlide } from 'swiper/vue';
import { EffectCoverflow, Navigation } from 'swiper/modules';
import { ElMessage } from 'element-plus';

import 'swiper/css';
import 'swiper/css/effect-coverflow';
import 'swiper/css/navigation';

const swiperInstance = ref(null);

const onSwiper = (swiper) => {
  swiperInstance.value = swiper;
};

// 模拟数据
const tracks = ref([
  {
    id: 1,
    title: 'Blinding Lights (Martin Garrix Remix)',
    artist: 'The Weeknd, Martin Garrix',
    artwork: 'https://i.scdn.co/image/ab67616d0000b27341e31d6ea1d493dd77933ee5',
    genre: 'Future House',
    userRating: 0,
    hasRated: false,
    comments: [
      { id: 101, user: { name: 'DJ小新', avatar: 'https://randomuser.me/api/portraits/men/22.jpg' }, text: '这个Remix太顶了，现场绝对爆炸！', createdAt: '2023-06-18T10:45:00Z' },
      { id: 102, user: { name: '电音少女', avatar: 'https://randomuser.me/api/portraits/women/28.jpg' }, text: '比原版更有能量感，爱了爱了。', createdAt: '2023-06-18T11:20:00Z' },
    ]
  },
  {
    id: 2,
    title: 'Diamonds',
    artist: 'Timmy Trumpet, Cascada',
    artwork: 'https://i.scdn.co/image/ab67616d0000b273e11a94906b5e73be81e978f0',
    genre: 'Hardstyle',
    userRating: 0,
    hasRated: false,
    comments: []
  },
  {
    id: 3,
    title: 'Find You',
    artist: 'Zedd, Matthew Koma, Miriam Bryant',
    artwork: 'https://i.scdn.co/image/ab67616d0000b2735f53c0dbe3e644b04f889593',
    genre: 'Progressive House',
    userRating: 0,
    hasRated: false,
    comments: [
      { id: 301, user: { name: '资深音乐节玩家', avatar: 'https://randomuser.me/api/portraits/men/45.jpg' }, text: '这首歌是我的入坑曲，经典中的经典！', createdAt: '2023-06-19T14:30:00Z' },
    ]
  },
  {
    id: 4,
    title: 'Oxygen',
    artist: 'Excision, Wooli, Trivecta',
    artwork: 'https://i.scdn.co/image/ab67616d0000b2735613b682e0a8acc8a95208db',
    genre: 'Dubstep',
    userRating: 0,
    hasRated: false,
    comments: []
  },
  {
    id: 5,
    title: 'Language',
    artist: 'Porter Robinson',
    artwork: 'https://i.scdn.co/image/ab67616d0000b2735487aadd8750fd479ad477e9',
    genre: 'Progressive House',
    userRating: 0,
    hasRated: false,
    comments: []
  }
]);

const activeIndex = ref(0);
const newComment = ref('');

const activeTrack = computed(() => tracks.value[activeIndex.value]);
const ratedCurrentTrack = computed(() => activeTrack.value.hasRated);

const pageBackgroundStyle = computed(() => {
  return {
    '--bg-image': `url(${activeTrack.value.artwork})`
  };
});

const onSlideChange = (swiper) => {
  activeIndex.value = swiper.activeIndex;
};

const onRate = (track) => {
  if (track.userRating > 0) {
    track.hasRated = true;
    ElMessage.success(`感谢您为 "${track.title}" 评分！`);
  }
};

const submitComment = () => {
  if (!newComment.value.trim()) {
    ElMessage.warning('评论内容不能为空');
    return;
  }
  
  const comment = {
    id: Date.now(),
    user: { name: '我', avatar: 'https://randomuser.me/api/portraits/men/85.jpg' },
    text: newComment.value,
    createdAt: new Date().toISOString()
  };
  
  activeTrack.value.comments.unshift(comment);
  newComment.value = '';
  ElMessage.success('评论发表成功！');
};

const formatTime = (timestamp) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);

  if (diff < 60) return '刚刚';
  if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`;
  return date.toLocaleDateString('zh-CN');
};

</script>

<style lang="scss" scoped>
.music-rating-page {
  position: relative;
  width: 100%;
  min-height: 100vh;
  padding: 40px 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-image: var(--bg-image);
    background-size: cover;
    background-position: center;
    filter: blur(20px) brightness(0.5);
    transform: scale(1.1);
    transition: background-image 0.5s ease-in-out;
  }
}

.background-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.6);
  z-index: 1;
}

.container {
  position: relative;
  z-index: 2;
  width: 100%;
  max-width: 1200px;
  padding: 0 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.page-header {
  text-align: center;
  margin-bottom: 30px;
  
  .page-title {
    font-size: 36px;
    font-weight: 800;
  }
  
  .page-subtitle {
    color: var(--acmetone-text-secondary);
    font-size: 18px;
  }
}

.rating-swiper-container {
  width: 100%;
  position: relative;
  margin-bottom: 40px;
  z-index: 5;
}

.rating-swiper {
  width: 100%;
  padding-top: 50px;
  padding-bottom: 50px;
}

.rating-slide {
  width: 360px;
  height: 580px;
}

.track-card {
  width: 100%;
  height: 100%;
  background: rgba(20, 20, 20, 0.8);
  backdrop-filter: blur(10px);
  border-radius: 20px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 10px 30px rgba(0,0,0,0.5);
  border: 1px solid rgba(255,255,255,0.1);
}

.track-artwork {
  width: 100%;
  height: 360px;
  
  .track-cover {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.track-info {
  padding: 10px 20px;
  text-align: center;
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  min-height: 0;

  .track-title {
    font-size: 20px;
    font-weight: 700;
    margin-bottom: 8px;
    line-height: 1.3;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-box-orient: vertical;
  }
  
  .track-artist {
    font-size: 15px;
    color: var(--acmetone-text-secondary);
    margin-bottom: 12px;
  }
  
  .track-genre {
    display: inline-block;
    background: var(--genre-edm);
    color: var(--acmetone-black);
    padding: 3px 10px;
    border-radius: 15px;
    font-size: 12px;
    font-weight: 600;
  }
}

.rating-control {
  margin-top: 0;
  padding: 15px 20px;
  text-align: center;
  background: rgba(0,0,0,0.3);
  
  .rate-prompt {
    font-size: 14px;
    color: var(--acmetone-text-secondary);
    margin-bottom: 10px;
  }
  
  :deep(.el-rate__icon) {
    font-size: 30px;
  }
}

.swiper-button-prev,
.swiper-button-next {
  color: var(--acmetone-white);
  --swiper-navigation-size: 30px;
  background: rgba(0,0,0,0.3);
  width: 50px;
  height: 50px;
  border-radius: 50%;

  &:hover {
    background: var(--genre-edm);
  }
  
  @media (max-width: 768px) {
    display: none;
  }
}

.comments-section {
  width: 100%;
  max-width: 800px;
  background: rgba(10, 10, 10, 0.7);
  backdrop-filter: blur(10px);
  padding: 30px;
  border-radius: 20px;
  border: 1px solid rgba(255,255,255,0.1);

  .section-title {
    font-size: 24px;
    font-weight: 700;
    margin-bottom: 20px;
    text-align: center;
  }
}

.comment-list {
  max-height: 400px;
  overflow-y: auto;
  margin-bottom: 20px;
  padding-right: 10px;
}

.comment-item {
  display: flex;
  gap: 15px;
  margin-bottom: 20px;
}

.comment-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
}

.comment-content {
  flex: 1;
}

.comment-header {
  margin-bottom: 5px;
  .comment-user {
    font-weight: 600;
    margin-right: 10px;
  }
  .comment-time {
    font-size: 12px;
    color: var(--acmetone-text-secondary);
  }
}

.comment-form {
  display: flex;
  gap: 10px;
  
  .submit-comment-btn {
    background-color: var(--genre-edm);
    color: var(--acmetone-black);
    border: none;
    font-weight: 600;
    
    &:hover {
      background-color: var(--acmetone-white);
    }
  }
}

.no-comments {
  text-align: center;
  padding: 20px;
  color: var(--acmetone-text-secondary);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style> 