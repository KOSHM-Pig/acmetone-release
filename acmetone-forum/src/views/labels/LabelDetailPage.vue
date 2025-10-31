<template>
  <div class="label-detail-page">
    <div class="container">
      <div class="label-nav">
        <router-link to="/labels" class="back-link">
          <el-icon>
            <ArrowLeft />
          </el-icon>
          返回厂牌列表
        </router-link>
      </div>

      <div v-if="loading" class="loading-container">
        <el-skeleton :rows="10" animated />
      </div>

      <template v-else>
        <div class="label-header">
          <div class="label-logo-container">
            <img :src="label.logo" :alt="label.name" class="label-logo">
          </div>

          <div class="label-info">
            <h1 class="label-name">{{ label.name }}</h1>

            <div class="label-meta">
              <div class="meta-item">
                <span class="meta-label">成立于</span>
                <span class="meta-value">{{ label.founded }}</span>
              </div>

              <div class="meta-item">
                <span class="meta-label">所在地</span>
                <span class="meta-value">{{ label.country }}</span>
              </div>

              <div class="meta-item">
                <span class="meta-label">月听众</span>
                <span class="meta-value">{{ label.monthlyListeners }}</span>
              </div>

              <div class="meta-item">
                <span class="meta-label">发行作品</span>
                <span class="meta-value">{{ label.totalReleases }}</span>
              </div>
            </div>

            <div class="label-genres">
              <span v-for="(genre, index) in label.mainGenres" :key="index" class="genre-tag">
                {{ genre }}
              </span>
            </div>

            <p class="label-description">{{ label.description }}</p>

            <div class="label-social">
              <a href="#" class="social-link" title="Spotify">
                <el-icon>
                  <ElementPlus />
                </el-icon>
              </a>
              <a href="#" class="social-link" title="SoundCloud">
                <el-icon>
                  <ElementPlus />
                </el-icon>
              </a>
              <a href="#" class="social-link" title="YouTube">
                <el-icon>
                  <ElementPlus />
                </el-icon>
              </a>
              <a href="#" class="social-link" title="官方网站">
                <el-icon>
                  <Link />
                </el-icon>
              </a>
            </div>
          </div>
        </div>

        <div class="label-content">
          <div class="content-section">
            <h2 class="section-title">热门艺人</h2>

            <div class="artists-grid">
              <div v-for="(artist, index) in label.topArtists" :key="index" class="artist-card">
                <div class="artist-avatar-container">
                  <img
                    :src="`https://randomuser.me/api/portraits/${index % 2 === 0 ? 'men' : 'women'}/${20 + index * 10}.jpg`"
                    :alt="artist" class="artist-avatar">
                </div>
                <h3 class="artist-name">{{ artist }}</h3>
              </div>
            </div>
          </div>

          <div class="content-section">
            <h2 class="section-title">近期发行</h2>

            <div class="releases-grid">
              <div v-for="(release, index) in recentReleases" :key="index" class="release-card">
                <div class="release-cover-container">
                  <img :src="release.cover" :alt="release.title" class="release-cover">
                  <div class="play-overlay">
                    <el-icon>
                      <VideoPlay />
                    </el-icon>
                  </div>
                </div>

                <div class="release-info">
                  <h3 class="release-title">{{ release.title }}</h3>
                  <p class="release-artist">{{ release.artist }}</p>
                  <p class="release-date">{{ formatDate(release.releaseDate) }}</p>
                </div>
              </div>
            </div>
          </div>

          <div class="content-section">
            <h2 class="section-title">厂牌动态</h2>

            <div class="news-list">
              <div v-for="(news, index) in labelNews" :key="index" class="news-item">
                <div class="news-date">{{ formatDate(news.date) }}</div>

                <div class="news-content">
                  <h3 class="news-title">{{ news.title }}</h3>
                  <p class="news-excerpt">{{ news.excerpt }}</p>
                  <a href="#" class="news-link">阅读更多</a>
                </div>
              </div>
            </div>
          </div>

          <div class="content-section">
            <h2 class="section-title">讨论区</h2>

            <div class="discussions-section">
              <div class="discussions-header">
                <div class="section-description">分享你对该厂牌的看法和意见</div>
                <el-button type="primary" class="new-topic-btn" @click="showCommentForm = true">
                  发表评论
                </el-button>
              </div>

              <div v-if="showCommentForm" class="comment-form">
                <el-input v-model="commentContent" type="textarea" :rows="4" placeholder="分享你的想法..." maxlength="500"
                  show-word-limit />

                <div class="form-actions">
                  <el-button @click="showCommentForm = false">取消</el-button>
                  <el-button type="primary" @click="submitComment" :disabled="!commentContent.trim()">
                    发表
                  </el-button>
                </div>
              </div>

              <div class="discussions-list">
                <div v-for="(discussion, index) in labelDiscussions" :key="index" class="discussion-item">
                  <div class="discussion-user">
                    <img :src="discussion.user.avatar" :alt="discussion.user.name" class="user-avatar">
                  </div>

                  <div class="discussion-content">
                    <div class="discussion-header">
                      <span class="user-name">{{ discussion.user.name }}</span>
                      <span class="discussion-time">{{ formatTime(discussion.createdAt) }}</span>
                    </div>

                    <div class="discussion-body">
                      <p>{{ discussion.content }}</p>
                    </div>

                    <div class="discussion-actions">
                      <span class="discussion-action reply-action" @click="replyToDiscussion(discussion)">
                        回复
                      </span>
                      <span class="discussion-action like-action" :class="{ 'liked': discussion.isLiked }"
                        @click="toggleLike(discussion)">
                        <el-icon>
                          <Star />
                        </el-icon>
                        {{ discussion.likeCount }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ArrowLeft, ElementPlus, Link, VideoPlay, Star } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const route = useRoute()
const labelId = computed(() => route.params.id)

// 状态变量
const loading = ref(true)
const showCommentForm = ref(false)
const commentContent = ref('')

// 模拟数据 - 厂牌详情
const label = ref({
  id: 3,
  name: 'STMPD RCRDS',
  logo: 'https://geo-media.beatport.com/image_size/590x404/65626c3f-ad91-4f98-969a-8ca3d80e0c55.jpg',
  founded: 2016,
  country: '荷兰',
  mainGenres: ['EDM', 'Future House', 'Bass House', 'Progressive House'],
  topArtists: ['Martin Garrix', 'Brooks', 'Julian Jordan', 'Blinders', 'Justin Mylo', 'Matisse & Sadko'],
  description: 'STMPD RCRDS是由世界知名DJ/制作人Martin Garrix于2016年创立的厂牌。厂牌名称取自他父亲经营的拍卖公司"Stamp Trading"。STMPD RCRDS的理念是不拘泥于特定的音乐风格，而是专注于发掘和培养新兴音乐人才，提供多样化的电子音乐作品。厂牌在短短几年内迅速崛起，成为电子音乐界最具影响力的厂牌之一。',
  popularity: 88,
  totalReleases: 630,
  monthlyListeners: '2500万+'
})

// 模拟数据 - 近期发行
const recentReleases = ref([
  {
    id: 1,
    title: 'Follow',
    artist: 'Martin Garrix & Zedd',
    cover: 'https://i.scdn.co/image/ab67616d0000b27311cb71576e255c8e4c1c2a52',
    releaseDate: '2022-05-27T00:00:00Z'
  },
  {
    id: 2,
    title: 'Funk',
    artist: 'Brooks & Julian Jordan',
    cover: 'https://i.scdn.co/image/ab67616d0000b2735a6de971e0c3c74839a7e7c4',
    releaseDate: '2022-04-15T00:00:00Z'
  },
  {
    id: 3,
    title: 'Quantum',
    artist: 'Martin Garrix & Brooks',
    cover: 'https://i.scdn.co/image/ab67616d0000b273a91c10fe9472d9bd89802e5a',
    releaseDate: '2022-03-11T00:00:00Z'
  },
  {
    id: 4,
    title: 'Limitless',
    artist: 'Blinders',
    cover: 'https://i.scdn.co/image/ab67616d0000b273f2a1f0167c2b67892e7a946a',
    releaseDate: '2022-02-18T00:00:00Z'
  }
])

// 模拟数据 - 厂牌动态
const labelNews = ref([
  {
    id: 1,
    title: 'Martin Garrix宣布STMPD RCRDS夏季巡演计划',
    excerpt: 'STMPD RCRDS将在今年夏季在全球多个城市举办专场演出，包括阿姆斯特丹、纽约、东京和伦敦等地。',
    date: '2022-05-10T00:00:00Z'
  },
  {
    id: 2,
    title: 'STMPD RCRDS签约三位新艺人',
    excerpt: '厂牌负责人Martin Garrix宣布签约三位新锐电子音乐制作人，将在未来几个月内发行他们的首张EP。',
    date: '2022-04-22T00:00:00Z'
  },
  {
    id: 3,
    title: 'STMPD RCRDS五周年纪念合辑即将发行',
    excerpt: '为庆祝成立五周年，STMPD RCRDS将发行一张包含20首未发行曲目的特别纪念合辑。',
    date: '2022-03-08T00:00:00Z'
  }
])

// 模拟数据 - 讨论区
const labelDiscussions = ref([
  {
    id: 1,
    user: {
      name: '电音爱好者',
      avatar: 'https://randomuser.me/api/portraits/men/32.jpg'
    },
    content: 'STMPD是我最喜欢的厂牌之一，每一首发行的作品质量都很高。特别喜欢他们不拘泥于单一风格的理念，从Future Bass到Tech House，各种风格都有涉及。',
    createdAt: '2022-05-20T08:30:00Z',
    likeCount: 18,
    isLiked: false
  },
  {
    id: 2,
    user: {
      name: 'House音乐粉丝',
      avatar: 'https://randomuser.me/api/portraits/women/44.jpg'
    },
    content: '感觉他们最近的作品越来越偏向商业EDM了，有点怀念早期那些更有实验性的作品。不过Brooks和Julian Jordan的合作依然很棒！',
    createdAt: '2022-05-18T15:45:00Z',
    likeCount: 7,
    isLiked: true
  },
  {
    id: 3,
    user: {
      name: 'DJ小新',
      avatar: 'https://randomuser.me/api/portraits/men/22.jpg'
    },
    content: '作为一名业余DJ，我非常喜欢他们的作品，很多都是我Set中的必备曲目。希望他们能多发一些适合Club的Tech House和Bass House作品。',
    createdAt: '2022-05-15T10:20:00Z',
    likeCount: 12,
    isLiked: false
  }
])

// 格式化日期
const formatDate = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
}

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

// 点赞/取消点赞
const toggleLike = (discussion) => {
  discussion.isLiked = !discussion.isLiked
  discussion.likeCount = discussion.isLiked ? discussion.likeCount + 1 : discussion.likeCount - 1
}

// 回复讨论
const replyToDiscussion = (discussion) => {
  showCommentForm.value = true
  commentContent.value = `@${discussion.user.name} `
}

// 提交评论
const submitComment = () => {
  if (!commentContent.value.trim()) return

  // 实际项目中应该调用API提交评论
  const newComment = {
    id: Date.now(),
    user: {
      name: '当前用户',
      avatar: 'https://randomuser.me/api/portraits/men/85.jpg'
    },
    content: commentContent.value,
    createdAt: new Date().toISOString(),
    likeCount: 0,
    isLiked: false
  }

  labelDiscussions.value.unshift(newComment)
  commentContent.value = ''
  showCommentForm.value = false

  ElMessage.success('评论发表成功')
}

onMounted(() => {
  // 实际项目中应该根据路由参数获取厂牌详情
  console.log('加载厂牌ID:', labelId.value)

  // 模拟加载数据
  setTimeout(() => {
    loading.value = false
  }, 1000)
})
</script>

<style lang="scss" scoped>
.label-detail-page {
  padding: 40px 0 60px;
}

.label-nav {
  margin-bottom: 30px;

  .back-link {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    color: var(--acmetone-text);
    transition: color 0.3s ease;

    &:hover {
      color: var(--genre-edm);
      text-decoration: none;
    }
  }
}

.loading-container {
  padding: 20px;
}

.label-header {
  display: grid;
  grid-template-columns: 250px 1fr;
  gap: 30px;
  margin-bottom: 50px;
}

.label-logo-container {
  .label-logo {
    width: 100%;
    aspect-ratio: 1;
    object-fit: cover;
    border-radius: 0;
  }
}

.label-info {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.label-name {
  font-size: 36px;
  font-weight: 800;
  margin-bottom: 5px;
}

.label-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  margin-bottom: 5px;

  .meta-item {
    .meta-label {
      color: var(--acmetone-text-secondary);
      margin-right: 5px;
    }

    .meta-value {
      font-weight: 600;
    }
  }
}

.label-genres {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 10px;

  .genre-tag {
    background-color: var(--genre-edm);
    color: var(--acmetone-black);
    padding: 5px 12px;
    border-radius: 4px;
    font-size: 14px;
    font-weight: 500;
  }
}

.label-description {
  line-height: 1.6;
  margin-bottom: 15px;
}

.label-social {
  display: flex;
  gap: 15px;

  .social-link {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background-color: var(--acmetone-gray);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--acmetone-text);
    transition: all 0.3s ease;

    &:hover {
      background-color: var(--genre-edm);
      color: var(--acmetone-black);
    }
  }
}

.content-section {
  margin-bottom: 50px;

  &:last-child {
    margin-bottom: 0;
  }

  .section-title {
    font-size: 24px;
    font-weight: 700;
    margin-bottom: 25px;
    position: relative;
    padding-bottom: 10px;

    &::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      width: 50px;
      height: 3px;
      background-color: var(--genre-edm);
    }
  }
}

.artists-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 20px;
}

.artist-card {
  text-align: center;
}

.artist-avatar-container {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  overflow: hidden;
  margin: 0 auto 15px;

  .artist-avatar {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.artist-name {
  font-size: 16px;
  font-weight: 600;
}

.releases-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 25px;
}

.release-card {
  transition: transform 0.3s ease;

  &:hover {
    transform: translateY(-5px);

    .play-overlay {
      opacity: 1;
    }
  }
}

.release-cover-container {
  position: relative;
  margin-bottom: 15px;

  .release-cover {
    width: 100%;
    aspect-ratio: 1;
    object-fit: cover;
    border-radius: 0;
  }

  .play-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.3s ease;
    cursor: pointer;

    .el-icon {
      font-size: 36px;
      color: var(--acmetone-white);
    }
  }
}

.release-info {
  .release-title {
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 5px;
  }

  .release-artist {
    color: var(--acmetone-text-secondary);
    margin-bottom: 5px;
  }

  .release-date {
    font-size: 14px;
    color: var(--acmetone-text-secondary);
  }
}

.news-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.news-item {
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: 20px;
  background-color: var(--acmetone-dark-gray);
  padding: 20px;
  border-radius: 0;
}

.news-date {
  font-size: 14px;
  color: var(--acmetone-text-secondary);
}

.news-content {
  .news-title {
    font-size: 18px;
    font-weight: 600;
    margin-bottom: 10px;
  }

  .news-excerpt {
    color: var(--acmetone-text-secondary);
    margin-bottom: 10px;
    line-height: 1.5;
  }

  .news-link {
    color: var(--genre-edm);
    font-weight: 600;

    &:hover {
      text-decoration: underline;
    }
  }
}

.discussions-section {
  background-color: var(--acmetone-dark-gray);
  padding: 30px;
  border-radius: 0;
}

.discussions-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;

  .section-description {
    color: var(--acmetone-text-secondary);
  }

  .new-topic-btn {
    background-color: var(--genre-edm);
    color: var(--acmetone-black);
    border: none;
    font-weight: 600;

    &:hover {
      background-color: var(--acmetone-white);
    }
  }
}

.comment-form {
  margin-bottom: 30px;

  :deep(.el-textarea__inner) {
    background-color: var(--acmetone-gray);
    border: 1px solid var(--acmetone-border);
    color: var(--acmetone-text);
    resize: none;

    &:focus {
      border-color: var(--genre-edm);
    }
  }

  .form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 15px;
  }
}

.discussions-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.discussion-item {
  display: flex;
  gap: 15px;

  .discussion-user {
    .user-avatar {
      width: 50px;
      height: 50px;
      border-radius: 50%;
      object-fit: cover;
    }
  }

  .discussion-content {
    flex: 1;
    background-color: var(--acmetone-gray);
    padding: 15px;
    border-radius: 0;
  }
}

.discussion-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;

  .user-name {
    font-weight: 600;
  }

  .discussion-time {
    color: var(--acmetone-text-secondary);
    font-size: 14px;
  }
}

.discussion-body {
  margin-bottom: 15px;

  p {
    line-height: 1.6;
  }
}

.discussion-actions {
  display: flex;
  gap: 15px;

  .discussion-action {
    font-size: 14px;
    color: var(--acmetone-text-secondary);
    cursor: pointer;

    &:hover {
      color: var(--genre-edm);
    }

    &.like-action {
      display: flex;
      align-items: center;
      gap: 5px;

      &.liked {
        color: #ff9900;
      }

      &:hover {
        color: #ff9900;
      }
    }
  }
}

/* 响应式设计 */
@media (max-width: $breakpoint-lg) {
  .label-header {
    grid-template-columns: 200px 1fr;
  }

  .releases-grid {
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  }
}

@media (max-width: $breakpoint-md) {
  .label-header {
    grid-template-columns: 1fr;
    text-align: center;
  }

  .label-logo-container {
    .label-logo {
      width: 200px;
      margin: 0 auto;
    }
  }

  .label-meta,
  .label-genres {
    justify-content: center;
  }

  .label-social {
    justify-content: center;
  }

  .content-section {
    .section-title {
      text-align: center;

      &::after {
        left: 50%;
        transform: translateX(-50%);
      }
    }
  }

  .news-item {
    grid-template-columns: 1fr;

    .news-date {
      margin-bottom: 10px;
    }
  }
}

@media (max-width: $breakpoint-sm) {
  .artists-grid {
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  }

  .releases-grid {
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  }

  .discussions-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 15px;
  }

  .discussion-item {
    flex-direction: column;

    .discussion-user {
      display: flex;
      align-items: center;
      gap: 10px;

      .user-avatar {
        width: 40px;
        height: 40px;
      }
    }
  }
}
</style>
