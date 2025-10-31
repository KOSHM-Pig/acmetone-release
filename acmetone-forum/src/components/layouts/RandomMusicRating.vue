<template>
  <div class="random-music-rating">
    <div class="section-header">
      <h2 ref="sectionTitleRef" class="section-title">随机音乐评分</h2>
      <p class="section-subtitle">发现新音乐，分享你的看法</p>
    </div>

    <Transition name="fade" mode="out-in">
      <div v-if="loading" class="loading-container">
        <el-skeleton :rows="3" animated />
      </div>

      <div v-else-if="currentTrack" class="track-container">
        <div class="track-info">
          <div class="track-artwork">
            <img :src="currentTrack.artwork" :alt="currentTrack.title" class="artwork-image">
            <div class="track-controls">
              <button class="play-button" @click="togglePlay">
                <el-icon class="icon">
                  <component :is="isPlaying ? 'VideoPause' : 'VideoPlay'" />
                </el-icon>
              </button>
            </div>
          </div>

          <div class="track-details">
            <h3 class="track-title">{{ currentTrack.title }}</h3>
            <p class="track-artist">{{ currentTrack.artist }}</p>
            <p class="track-genre">
              <span class="genre-tag" :style="getGenreTagStyle(currentTrack.genre)">
                {{ currentTrack.genre }}
              </span>
              <span class="release-date">发行于 {{ formatDate(currentTrack.releaseDate) }}</span>
            </p>

            <div class="track-rating">
              <div class="rating-header">
                <h4>你的评分</h4>
                <div class="average-rating">
                  <span>平均得分: </span>
                  <strong>{{ currentTrack.averageRating.toFixed(1) }}</strong>
                  <span class="rating-count">({{ currentTrack.ratingCount }}人评价)</span>
                </div>
              </div>

              <div class="rating-stars">
                <el-rate v-model="userRating" :colors="['#ff9900', '#ff9900', '#ff9900']"
                  :void-color="'rgba(255,255,255,0.2)'" :texts="['不值一听', '一般', '还不错', '很棒', '神作']" show-text
                  @change="submitRating" />
              </div>
            </div>

            <div class="action-buttons">
              <button class="garrix-button-outline skip-button" @click="skipTrack">
                <el-icon>
                  <RefreshRight />
                </el-icon> 换一首
              </button>
              <button class="garrix-button comment-button" @click="showCommentForm = !showCommentForm">
                <el-icon>
                  <ChatLineRound />
                </el-icon> 添加评论
              </button>
            </div>
          </div>
        </div>

        <el-collapse-transition>
          <div v-show="showCommentForm" class="comment-form">
            <el-input v-model="commentContent" type="textarea" :rows="3" placeholder="分享你对这首歌的看法..." resize="none" />
            <div class="form-actions">
              <button class="garrix-button-outline" @click="showCommentForm = false">取消</button>
              <button class="garrix-button" type="primary" @click="submitComment" :disabled="!commentContent.trim()">
                发表评论
              </button>
            </div>
          </div>
        </el-collapse-transition>

        <div class="track-comments" v-if="currentTrack.comments.length > 0">
          <h4 class="comments-title">
            最新评论 <span class="comments-count">({{ currentTrack.comments.length }})</span>
          </h4>

          <ul class="comments-list">
            <li v-for="comment in currentTrack.comments" :key="comment.id" class="comment-item">
              <div class="comment-avatar">
                <img :src="comment.user.avatar" :alt="comment.user.name">
              </div>
              <div class="comment-content">
                <div class="comment-header">
                  <span class="comment-author">{{ comment.user.name }}</span>
                  <div class="comment-rating-date">
                    <div class="comment-rating">
                      <el-rate v-model="comment.rating" disabled text-color="#ff9900"
                        :colors="['#ff9900', '#ff9900', '#ff9900']" :void-color="'rgba(255,255,255,0.2)'"
                        :show-score="true" score-template="{value}" />
                    </div>
                    <span class="comment-date">{{ formatDate(comment.date) }}</span>
                  </div>
                </div>
                <p class="comment-text">{{ comment.content }}</p>
                <div class="comment-actions">
                  <button class="action-button like-button">
                    <el-icon>
                      <Star />
                    </el-icon>
                    <span>{{ comment.likes }}</span>
                  </button>
                  <button class="action-button reply-button">
                    <el-icon>
                      <ChatDotSquare />
                    </el-icon>
                    <span>回复</span>
                  </button>
                </div>
              </div>
            </li>
          </ul>

          <div class="view-more">
            <button class="view-more-button">查看更多评论</button>
          </div>
        </div>
      </div>

      <div v-else class="empty-state">
        <el-empty description="暂无推荐歌曲" />
        <button class="garrix-button refresh-button" @click="fetchRandomTrack">
          <el-icon>
            <RefreshRight />
          </el-icon> 刷新
        </button>
      </div>
    </Transition>

    <!-- 音频播放器 (隐藏) -->
    <audio ref="audioPlayer" @ended="isPlaying = false" />
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { ElCollapseTransition } from 'element-plus'
import { RefreshRight, VideoPlay, VideoPause, Star, ChatDotSquare, ChatLineRound } from '@element-plus/icons-vue'
import { getGenreColor } from '@/utils/genreColor'
import { isLightColor } from '@/utils/colorHelpers';

// 模拟数据
const mockTracks = [
  {
    id: 1,
    title: 'Alive',
    artist: 'Hardwell & JGUAR',
    artwork: 'https://www.udiscovermusic.com/wp-content/uploads/2022/01/The-Weeknd-820x820.jpg',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    genre: 'EDM',
    releaseDate: '2023-06-15',
    averageRating: 4.7,
    ratingCount: 253,
    comments: [
      {
        id: 101,
        user: {
          name: '电音爱好者',
          avatar: 'https://randomuser.me/api/portraits/men/32.jpg'
        },
        content: '这首歌的drop太震撼了，完美的festival anthem！',
        rating: 5,
        likes: 42,
        date: '2023-06-20'
      },
      {
        id: 102,
        user: {
          name: 'EDM达人',
          avatar: 'https://randomuser.me/api/portraits/women/44.jpg'
        },
        content: '这种大气磅礴的电音正是我喜欢的，Hardwell不愧是大师级制作人',
        rating: 4.5,
        likes: 28,
        date: '2023-06-18'
      }
    ]
  },
  {
    id: 2,
    title: 'Chemicals',
    artist: 'Don Diablo',
    artwork: 'https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/b2/c0/1d/b2c01d38-2798-1bce-e6f3-8d0959ca51dd/23UMGIM22528.rgb.jpg/1200x1200bf-60.jpg',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
    genre: 'Future House',
    releaseDate: '2023-05-20',
    averageRating: 4.3,
    ratingCount: 186,
    comments: [
      {
        id: 201,
        user: {
          name: '未来房子',
          avatar: 'https://randomuser.me/api/portraits/women/68.jpg'
        },
        content: 'Don Diablo的Future House风格太有辨识度了，这首很有创新',
        rating: 4,
        likes: 31,
        date: '2023-05-25'
      }
    ]
  },
  {
    id: 3,
    title: 'Higher Ground',
    artist: 'KSHMR & Tungevaag',
    artwork: 'https://wallpapers.com/images/hd/the-weeknd-after-hours-1400-x-1268-wallpaper-vgq0153yskrbpr0p.jpg',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
    genre: 'Progressive House',
    releaseDate: '2023-04-10',
    averageRating: 4.5,
    ratingCount: 215,
    comments: [
      {
        id: 301,
        user: {
          name: 'DJ小新',
          avatar: 'https://randomuser.me/api/portraits/men/22.jpg'
        },
        content: 'KSHMR的制作水平总是那么高，旋律太好听了',
        rating: 5,
        likes: 45,
        date: '2023-04-15'
      },
      {
        id: 302,
        user: {
          name: '音乐制作者',
          avatar: 'https://randomuser.me/api/portraits/men/45.jpg'
        },
        content: '编曲和混音都非常专业，这就是顶级制作的水准',
        rating: 4.5,
        likes: 27,
        date: '2023-04-12'
      },
      {
        id: 303,
        user: {
          name: '电音少女',
          avatar: 'https://randomuser.me/api/portraits/women/28.jpg'
        },
        content: '旋律太洗脑了，循环播放中...',
        rating: 5,
        likes: 36,
        date: '2023-04-11'
      }
    ]
  }
]

const sectionTitleRef = ref(null);
const loading = ref(true)
const currentTrack = ref(null)
const userRating = ref(0)
const isPlaying = ref(false)
const showCommentForm = ref(false)
const commentContent = ref('')
const audioPlayer = ref(null)

// 获取随机曲目
const fetchRandomTrack = (shouldScroll = true) => {
  loading.value = true

  // 点击“换一首”按钮后滚动到标题
  if (shouldScroll) {
    nextTick(() => {
      if (sectionTitleRef.value) {
        sectionTitleRef.value.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }

  // 模拟API请求延迟
  setTimeout(() => {
    const randomIndex = Math.floor(Math.random() * mockTracks.length)
    currentTrack.value = mockTracks[randomIndex]
    userRating.value = 0
    loading.value = false

    // 重置音频播放器
    if (audioPlayer.value) {
      audioPlayer.value.pause()
      audioPlayer.value.src = currentTrack.value.audioUrl
      isPlaying.value = false
    }

  }, 1000)
}

// 跳过当前曲目
const skipTrack = () => {
  fetchRandomTrack(true)
}

// 切换播放状态
const togglePlay = () => {
  if (!audioPlayer.value) return

  if (isPlaying.value) {
    audioPlayer.value.pause()
  } else {
    audioPlayer.value.play()
  }

  isPlaying.value = !isPlaying.value
}

// 提交评分
const submitRating = (rating) => {
  console.log('提交评分:', rating)
  // 这里应该调用API提交评分

  // 模拟更新平均分
  const oldTotal = currentTrack.value.averageRating * currentTrack.value.ratingCount
  currentTrack.value.ratingCount++
  currentTrack.value.averageRating = (oldTotal + rating) / currentTrack.value.ratingCount
}

// 提交评论
const submitComment = () => {
  if (!commentContent.value.trim()) return

  // 模拟添加新评论
  const newComment = {
    id: Date.now(),
    user: {
      name: '我',
      avatar: 'https://randomuser.me/api/portraits/lego/1.jpg'
    },
    content: commentContent.value,
    rating: userRating.value,
    likes: 0,
    date: new Date().toISOString().split('T')[0]
  }

  currentTrack.value.comments.unshift(newComment)
  commentContent.value = ''
  showCommentForm.value = false
}

// 格式化日期
const formatDate = (dateString) => {
  const options = { year: 'numeric', month: 'long', day: 'numeric' }
  return new Date(dateString).toLocaleDateString('zh-CN', options)
}

onMounted(() => {
  fetchRandomTrack(false)
})

const getGenreTagStyle = (genre) => {
  const bgColor = getGenreColor(genre); // 获取流派的背景色
  const textColor = isLightColor(bgColor) ? 'black' : 'white';

  return {
    backgroundColor: bgColor,
    color: textColor
  };
};
</script>

<style lang="scss" scoped>
.random-music-rating {
  background: linear-gradient(var(--acmetone-dark-gray), var(--acmetone-black));
  border-radius: 0;
  padding: 40px 40px 10px 40px;

  .section-header {
    text-align: center;
    margin-bottom: 40px;

    .section-title {
      font-size: 32px;
      margin-bottom: 10px;
      position: relative;
      display: inline-block;
      padding-bottom: 15px;

      // 解决自动滚动时 Header 覆盖问题
      scroll-margin-top: var(--acmetone-header-height);

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
}

.loading-container {
  padding: 20px;
}

.track-container {
  margin-bottom: 20px;
}

.track-info {
  display: flex;
  gap: 30px;
  margin-bottom: 30px;
}

.track-artwork {
  flex: 0 0 300px;
  height: 300px;
  position: relative;
  overflow: hidden;

  .artwork-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.3s ease;
  }

  &:hover {
    .artwork-image {
      transform: scale(1.05);
    }

    .track-controls {
      opacity: 1;
    }
  }
}

.track-controls {
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

  .play-button {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    background-color: var(--acmetone-white);
    color: var(--acmetone-black);
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: transform 0.3s ease, background-color 0.3s ease;

    &:hover {
      transform: scale(1.1);
      background-color: var(--acmetone-white);
    }

    .icon {
      font-size: 30px;
    }
  }
}

.track-details {
  flex: 1;

  .track-title {
    font-size: 28px;
    margin-bottom: 10px;
  }

  .track-artist {
    font-size: 20px;
    color: var(--acmetone-text-secondary);
    margin-bottom: 15px;
  }

  .track-genre {
    display: flex;
    align-items: center;
    margin-bottom: 25px;

    .genre-tag {
      padding: 5px 12px;
      font-size: 14px;
      font-weight: 500;
      border-radius: 4px;
      margin-right: 15px;
    }

    .release-date {
      color: var(--acmetone-text-secondary);
      font-size: 14px;
    }
  }
}

.track-rating {
  background-color: var(--acmetone-gray);
  padding: 20px;

  .rating-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;

    h4 {
      margin: 0;
      font-size: 18px;
    }

    .average-rating {
      color: var(--acmetone-text-secondary);

      strong {
        color: #ff9900;
        font-size: 18px;
        margin: 0 5px;
      }

      .rating-count {
        font-size: 14px;
        margin-left: 5px;
      }
    }
  }

  .rating-stars {
    :deep(.el-rate__icon) {
      font-size: 24px;
      margin-right: 6px;
    }

    :deep(.el-rate__text) {
      color: var(--acmetone-text-secondary);
      margin-left: 10px;
    }
  }
}

.action-buttons {
  margin-top: 1rem;
  display: flex;
  gap: 15px;

  .skip-button,
  .comment-button {
    display: flex;
    align-items: center;
    gap: 8px;
  }
}

.comment-form {
  margin-bottom: 30px;
  overflow: hidden;

  .el-textarea {
    margin-top: 15px;
    margin-bottom: 15px;
  }

  .form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
  }
}

.track-comments {
  margin-top: 40px;

  .comments-title {
    font-size: 20px;
    margin-bottom: 20px;
    padding-bottom: 10px;
    border-bottom: 1px solid var(--acmetone-border);

    .comments-count {
      color: var(--acmetone-text-secondary);
      font-size: 16px;
    }
  }
}

.comments-list {
  list-style: none;
}

.comment-item {
  display: flex;
  gap: 15px;
  margin-bottom: 25px;
  padding-bottom: 25px;
  border-bottom: 1px solid var(--acmetone-border);

  &:last-child {
    border-bottom: none;
  }
}

.comment-avatar {
  flex: 0 0 50px;

  img {
    width: 50px;
    height: 50px;
    border-radius: 50%;
    object-fit: cover;
  }
}

.comment-content {
  flex: 1;

  .comment-header {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    margin-bottom: 10px;

    .comment-author {
      font-weight: 600;
      margin-right: 15px;
    }

    .comment-rating-date {
      display: flex;
      flex-direction: row;
      align-items: center;
    }

    .comment-rating {
      display: flex;
      margin-right: 15px;

      :deep(.el-rate__icon) {
        font-size: 16px;
        margin-right: 2px;
      }

      :deep(.el-rate__text) {
        font-size: 14px;
      }
    }

    .comment-date {
      color: var(--acmetone-text-secondary);
      font-size: 14px;
    }
  }

  .comment-text {
    line-height: 1.6;
    margin-bottom: 15px;
  }

  .comment-actions {
    display: flex;
    gap: 15px;

    .action-button {
      display: flex;
      align-items: center;
      gap: 5px;
      background: none;
      border: none;
      color: var(--acmetone-text-secondary);
      cursor: pointer;
      padding: 5px 0;
      transition: color 0.3s ease;

      &:hover {
        color: var(--acmetone-white);
      }

      .el-icon {
        font-size: 16px;
      }
    }
  }
}

.view-more {
  text-align: center;
  margin-top: 20px;

  .view-more-button {
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

.empty-state {
  text-align: center;
  padding: 40px 0;

  .refresh-button {
    margin-top: 20px;
  }
}

/* 添加淡入淡出过渡样式 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 响应式设计 */
@media (max-width: $breakpoint-lg) {
  .track-info {
    flex-direction: column;
    gap: 0;
  }

  .track-artwork {
    flex: 0 0 auto;
    height: auto;
    width: 100%;
    max-width: 400px;
    margin: 0 auto 30px;
  }
}

@media (max-width: $breakpoint-md) {
  .random-music-rating {
    padding: 30px 20px;
  }

  .track-details {
    .track-title {
      font-size: 24px;
    }

    .track-artist {
      font-size: 18px;
    }
  }

  .track-rating {
    .rating-header {
      h4 {
        margin-bottom: 10px;
      }
    }
  }
}

@media (max-width: $breakpoint-sm) {
  .section-header {
    .section-title {
      font-size: 24px;
    }
  }

  .action-buttons {
    flex-direction: column;
  }

  .track-rating {
    .rating-header {
      flex-direction: column;
      align-items: flex-start;
    }
  }

  .comment-header {
    flex-direction: column;
    align-items: flex-start;

    .comment-rating-date {
      flex-direction: row;
    }

    .comment-author {
      margin-bottom: 5px;
    }
  }

  .comment-content {
    .comment-header {
      align-items: flex-start;
    }
  }
}
</style>