<template>
  <div class="home">
    <!-- 滚动Banner -->
    <BannerSlider />

    <!-- 随机音乐评分区 -->
    <section class="container">
      <RandomMusicRating />
    </section>

    <!-- 厂牌专区 -->
    <section class="container">
      <div class="section-header">
        <h2 class="section-title">热门厂牌</h2>
        <p class="section-subtitle">发现最优质的电子音乐厂牌</p>
      </div>

      <div class="labels-grid">
        <LabelCard v-for="label in topLabels" :key="label.id" :label="label" />
      </div>

      <div class="section-footer">
        <router-link to="/labels" class="view-all-button">
          查看全部厂牌
          <el-icon>
            <ArrowRight />
          </el-icon>
        </router-link>
      </div>
    </section>

    <!-- 最新帖子 -->
    <section class="container">
      <div class="section-header">
        <h2 class="section-title">最新热门帖子</h2>
        <p class="section-subtitle">参与讨论，分享你的想法</p>
      </div>

      <div class="topics-list">
        <div v-for="topic in latestTopics" :key="topic.id" class="topic-card">
          <div class="topic-info">
            <div class="topic-user">
              <img :src="topic.user.avatar" :alt="topic.user.name" class="user-avatar">
              <div class="user-info">
                <div class="user-name">{{ topic.user.name }}</div>
                <div class="post-time">{{ formatTime(topic.createdAt) }}</div>
              </div>
            </div>

            <h3 class="topic-title">
              <router-link :to="`/forum/topic/${topic.id}`">{{ topic.title }}</router-link>
            </h3>

            <p class="topic-excerpt">{{ topic.excerpt }}</p>

            <div class="topic-meta">
              <div class="topic-category" :style="{ backgroundColor: getCategoryColor(topic.category) }">
                {{ topic.category }}
              </div>

              <div class="topic-stats">
                <div class="stat-item">
                  <el-icon>
                    <View />
                  </el-icon>
                  <span>{{ topic.viewCount }}</span>
                </div>
                <div class="stat-item">
                  <el-icon>
                    <ChatLineRound />
                  </el-icon>
                  <span>{{ topic.replyCount }}</span>
                </div>
                <div class="stat-item">
                  <el-icon>
                    <Star />
                  </el-icon>
                  <span>{{ topic.likeCount }}</span>
                </div>
              </div>
            </div>
          </div>

          <div v-if="topic.image" class="topic-image">
            <img :src="topic.image" :alt="topic.title">
          </div>
        </div>
      </div>

      <div class="section-footer">
        <router-link to="/forum" class="view-all-button">
          查看全部帖子
          <el-icon>
            <ArrowRight />
          </el-icon>
        </router-link>
      </div>
    </section>

    <!-- 活动日历 -->
    <section class="container">
      <div class="section-header">
        <h2 class="section-title">近期活动</h2>
        <p class="section-subtitle">不要错过最热门的电子音乐活动</p>
      </div>

      <div class="events-carousel">
        <el-carousel :interval="4000" type="card" height="250px">
          <el-carousel-item v-for="event in upcomingEvents" :key="event.id">
            <div class="event-card" :style="{ backgroundImage: `url(${event.image})` }">
              <div class="event-overlay"></div>
              <div class="event-content">
                <div class="event-date">{{ formatEventDate(event.date) }}</div>
                <h3 class="event-title">{{ event.title }}</h3>
                <div class="event-location">
                  <el-icon>
                    <Location />
                  </el-icon>
                  <span>{{ event.location }}</span>
                </div>
                <a :href="event.link" class="event-link">了解详情</a>
              </div>
            </div>
          </el-carousel-item>
        </el-carousel>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ArrowRight, View, ChatLineRound, Star, Location } from '@element-plus/icons-vue'
import BannerSlider from '@/components/domain/BannerSlider.vue'
import RandomMusicRating from '@/components/layouts/RandomMusicRating.vue'
import LabelCard from '@/components/domain/LabelCard.vue'

// 模拟数据 - 热门厂牌
const topLabels = [
  {
    id: 'spinnin',
    name: 'Spinnin\' Records',
    owner: 'Roger de Graaf & Eelko van Kooten',
    logo: 'https://i1.sndcdn.com/avatars-000326711847-d3g5la-t500x500.jpg',
    trackCount: 3246,
    followerCount: 1200000,
    genres: ['EDM', 'House', 'Future House']
  },
  {
    id: 'revealed',
    name: 'Revealed Recordings',
    owner: 'Hardwell',
    logo: 'https://i1.sndcdn.com/avatars-000515654252-i3wztd-t500x500.jpg',
    trackCount: 1528,
    followerCount: 850000,
    genres: ['EDM', 'Progressive House', 'Big Room']
  },
  {
    id: 'stmpd',
    name: 'STMPD RCRDS',
    owner: 'Martin Garrix',
    logo: 'https://i1.sndcdn.com/avatars-000625899232-33axb0-t500x500.jpg',
    trackCount: 987,
    followerCount: 750000,
    genres: ['EDM', 'Future Bass', 'House']
  },
  {
    id: 'protocol',
    name: 'Protocol Recordings',
    owner: 'Nicky Romero',
    logo: 'https://i1.sndcdn.com/avatars-000326100183-l3j0oj-t500x500.jpg',
    trackCount: 756,
    followerCount: 620000,
    genres: ['EDM', 'Progressive House']
  }
]

// 模拟数据 - 最新帖子
const latestTopics = [
  {
    id: 1,
    title: '【讨论】电子音乐节期间如何保持体力？',
    excerpt: '大家好，最近有不少音乐节要参加，想请教一下有经验的朋友们，怎么在连续几天的电音节中保持体力？有什么补给品推荐吗？',
    user: {
      name: '音乐节爱好者',
      avatar: 'https://randomuser.me/api/portraits/men/32.jpg'
    },
    category: '讨论',
    viewCount: 2456,
    replyCount: 36,
    likeCount: 125,
    createdAt: '2023-06-18T08:30:00Z',
    image: null
  },
  {
    id: 2,
    title: '【制作分享】我的第一首Future Bass作品，请大家点评',
    excerpt: '学习制作电子音乐快一年了，这是我的第一首完整的Future Bass风格作品，希望得到各位的建议和指导。',
    user: {
      name: '新手制作人',
      avatar: 'https://randomuser.me/api/portraits/women/44.jpg'
    },
    category: '制作分享',
    viewCount: 1876,
    replyCount: 28,
    likeCount: 95,
    createdAt: '2023-06-17T15:45:00Z',
    image: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=400&q=80'
  },
  {
    id: 3,
    title: '【新闻】Tomorrowland 2023完整阵容公布！',
    excerpt: '全球最大的电子音乐节之一Tomorrowland 2023完整阵容已经公布，今年将有超过800位艺术家在各个舞台表演。',
    user: {
      name: '音乐资讯',
      avatar: 'https://randomuser.me/api/portraits/men/28.jpg'
    },
    category: '新闻',
    viewCount: 5289,
    replyCount: 42,
    likeCount: 237,
    createdAt: '2023-06-16T10:20:00Z',
    image: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=400&q=80'
  },
  {
    id: 4,
    title: '【器材】如何选择适合初学者的MIDI键盘？',
    excerpt: '打算开始学习音乐制作，需要购买一个MIDI键盘，预算2000元以内，有什么推荐吗？',
    user: {
      name: '电音小白',
      avatar: 'https://randomuser.me/api/portraits/women/22.jpg'
    },
    category: '器材',
    viewCount: 3265,
    replyCount: 52,
    likeCount: 108,
    createdAt: '2023-06-15T12:35:00Z',
    image: null
  }
]

// 模拟数据 - 近期活动
const upcomingEvents = [
  {
    id: 1,
    title: 'Electric Daisy Carnival China',
    date: '2023-08-12',
    location: '上海国际音乐村',
    image: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80',
    link: '#'
  },
  {
    id: 2,
    title: 'Creamfields Beijing',
    date: '2023-09-22',
    location: '北京朝阳公园',
    image: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80',
    link: '#'
  },
  {
    id: 3,
    title: 'Ultra Music Festival Asia Tour',
    date: '2023-10-15',
    location: '深圳湾体育中心',
    image: 'https://images.unsplash.com/photo-1642178225043-f299072af862?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80',
    link: '#'
  },
  {
    id: 4,
    title: 'Storm Festival Shanghai',
    date: '2023-11-05',
    location: '上海世博公园',
    image: 'https://images.unsplash.com/photo-1493676304819-0d7a8d026dcf?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1469&q=80',
    link: '#'
  }
]

// 格式化发布时间
const formatTime = (timestamp) => {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = Math.floor((now - date) / 1000) // 秒差

  if (diff < 60) {
    return '刚刚'
  } else if (diff < 3600) {
    return `${Math.floor(diff / 60)}分钟前`
  } else if (diff < 86400) {
    return `${Math.floor(diff / 3600)}小时前`
  } else if (diff < 2592000) {
    return `${Math.floor(diff / 86400)}天前`
  } else {
    return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
  }
}

// 格式化活动日期
const formatEventDate = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })
}

// 获取分类颜色
const getCategoryColor = (category) => {
  const categoryColors = {
    '讨论': '#00c8ff',
    '制作分享': '#ff00a8',
    '新闻': '#00ff88',
    '器材': '#9d00ff',
    '活动': '#ff7700'
  }

  return categoryColors[category] || '#666666'
}
</script>

<style lang="scss" scoped>
.container {
  padding-top: 40px;
  padding-bottom: 40px;
  margin-bottom: 4em;
}

.home {
  padding-bottom: 60px;
}

.section-header {
  text-align: center;
  margin-bottom: 40px;

  .section-title {
    font-size: 32px;
    margin-bottom: 10px;
    position: relative;
    display: inline-block;
    padding-bottom: 15px;

    &::after {
      content: '';
      position: absolute;
      bottom: 6px;
      left: 50%;
      transform: translateX(-50%);
      width: 60px;
      height: 3px;
      background-color: var(--acmetone-white);
    }
  }

  .section-subtitle {
    color: var(--acmetone-text-secondary);
    font-size: 16px;
  }
}

.section-footer {
  text-align: right;
  margin-top: 40px;

  .view-all-button {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background-color: transparent;
    color: var(--acmetone-white);
    border: 1px solid var(--acmetone-white);
    padding: 12px 24px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;

    &:hover {
      background-color: var(--acmetone-white);
      color: var(--acmetone-black);
    }
  }
}

/* 厂牌网格 */
.labels-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 30px;
}

/* 帖子列表 */
.topics-list {
  display: flex;
  flex-direction: column;
  gap: 30px;
}

.topic-card {
  display: flex;
  background-color: var(--acmetone-dark-gray);
  border-radius: 0;
  overflow: hidden;
  transition: transform 0.3s ease;

  &:hover {
    transform: translateY(-5px);

    .topic-title a {
      color: var(--acmetone-white);
    }
  }
}

.topic-info {
  flex: 1;
  padding: 40px;
}

.topic-user {
  display: flex;
  align-items: center;
  margin-bottom: 15px;

  .user-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    object-fit: cover;
    margin-right: 15px;
  }

  .user-name {
    font-weight: 600;
    margin-bottom: 3px;
  }

  .post-time {
    font-size: 12px;
    color: var(--acmetone-text-secondary);
  }
}

.topic-title {
  font-size: 20px;
  font-weight: 700;
  margin-bottom: 10px;

  a {
    color: var(--acmetone-white);
    transition: color 0.3s ease;

    &:hover {
      text-decoration: none;
    }
  }
}

.topic-excerpt {
  color: var(--acmetone-text-secondary);
  margin-bottom: 15px;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.topic-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.topic-category {
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  color: var(--acmetone-black);
}

.topic-stats {
  display: flex;
  gap: 15px;

  .stat-item {
    display: flex;
    align-items: center;
    gap: 5px;
    color: var(--acmetone-text-secondary);
    font-size: 14px;
  }
}

.topic-image {
  flex: 0 0 200px;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

/* 活动轮播 */
.events-carousel {
  margin: 0 -40px;

  :deep(.el-carousel__item) {
    border-radius: 0;
  }

  :deep(.el-carousel__arrow) {
    background-color: rgba(0, 0, 0, 0.5);

    &:hover {
      color: var(--acmetone-black);
      background-color: var(--acmetone-white);
    }
  }
}

.event-card {
  height: 100%;
  background-size: cover;
  background-position: center;
  position: relative;
  display: flex;
  align-items: flex-end;
}

.event-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.9) 0%, rgba(0, 0, 0, 0.3) 100%);
}

.event-content {
  position: relative;
  z-index: 1;
  padding: 20px;
  width: 100%;
}

.event-date {
  display: inline-block;
  background-color: var(--acmetone-white);
  color: var(--acmetone-black);
  padding: 4px 10px;
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 10px;
}

.event-title {
  font-size: 20px;
  margin-bottom: 10px;
}

.event-location {
  display: flex;
  align-items: center;
  gap: 5px;
  color: var(--acmetone-text-secondary);
  margin-bottom: 15px;
  font-size: 14px;
}

.event-link {
  display: inline-block;
  border: 1px solid var(--acmetone-white);
  padding: 6px 12px;
  font-size: 14px;
  transition: all 0.3s ease;

  &:hover {
    background-color: var(--acmetone-white);
    color: var(--acmetone-black);
  }
}

/* 响应式设计 */
@media (max-width: $breakpoint-lg) {
  .labels-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 20px;
  }
}

@media (max-width: $breakpoint-md) {
  .topic-card {
    flex-direction: column;
  }

  .topic-image {
    flex: 0 0 auto;
    height: 200px;
    order: -1;
  }

  .event-title {
    font-size: 18px;
  }
}

@media (max-width: $breakpoint-sm) {
  .section-header {
    .section-title {
      font-size: 24px;
    }
  }

  .labels-grid {
    grid-template-columns: 1fr;
  }

  .topic-meta {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
}
</style>