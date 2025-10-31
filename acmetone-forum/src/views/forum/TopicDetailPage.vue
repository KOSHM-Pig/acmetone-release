<template>
  <div class="topic-detail-page">
    <div class="container">
      <div class="topic-header">
        <div class="topic-nav">
          <router-link to="/forum" class="back-link">
            <el-icon>
              <ArrowLeft />
            </el-icon>
            返回论坛
          </router-link>
        </div>

        <div class="topic-main-info">
          <div class="topic-user">
            <img :src="topic.user.avatar" :alt="topic.user.name" class="user-avatar">
          </div>

          <div class="topic-content-header">
            <h1 class="topic-title">{{ topic.title }}</h1>

            <div class="topic-meta">
              <span class="user-name">{{ topic.user.name }}</span>
              <span class="topic-time">{{ formatTime(topic.createdAt) }}</span>
              <span class="category-tag" :style="{ backgroundColor: getCategoryColor(topic.category) }">
                {{ topic.category }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div class="topic-content">
        <div class="topic-body">
          <p v-for="(paragraph, index) in topic.content" :key="index" class="content-paragraph">
            {{ paragraph }}
          </p>
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
          <div class="stat-item like-stat" :class="{ 'liked': isLiked }" @click="toggleLike">
            <el-icon>
              <Star />
            </el-icon>
            <span>{{ likeCount }}</span>
          </div>
        </div>

        <div class="topic-actions">
          <el-button class="action-btn share-btn">
            <el-icon>
              <Share />
            </el-icon>
            分享
          </el-button>
          <el-button class="action-btn report-btn">
            <el-icon>
              <Warning />
            </el-icon>
            举报
          </el-button>
        </div>
      </div>

      <div class="topic-replies">
        <h2 class="replies-title">回复 ({{ topic.replies.length }})</h2>

        <div class="reply-form">
          <div class="form-header">
            <img src="https://randomuser.me/api/portraits/men/85.jpg" alt="当前用户" class="current-user-avatar">
            <span class="form-title">发表回复</span>
          </div>

          <el-input v-model="replyContent" type="textarea" :rows="4" placeholder="分享你的想法..." maxlength="1000"
            show-word-limit />

          <div class="form-actions">
            <el-button type="primary" class="submit-btn" @click="submitReply" :disabled="!replyContent.trim()">
              回复
            </el-button>
          </div>
        </div>

        <div class="replies-list">
          <div v-for="(reply, index) in topic.replies" :key="index" class="reply-item">
            <div class="reply-user">
              <img :src="reply.user.avatar" :alt="reply.user.name" class="user-avatar">
            </div>

            <div class="reply-content">
              <div class="reply-header">
                <span class="user-name">{{ reply.user.name }}</span>
                <span class="reply-time">{{ formatTime(reply.createdAt) }}</span>
              </div>

              <div class="reply-body">
                <p>{{ reply.content }}</p>
              </div>

              <div class="reply-actions">
                <span class="reply-action" @click="showReplyForm(reply.id)">回复</span>
                <span class="reply-action like-action" :class="{ 'liked': reply.isLiked }"
                  @click="toggleReplyLike(reply)">
                  <el-icon>
                    <Star />
                  </el-icon>
                  {{ reply.likeCount }}
                </span>
              </div>

              <div v-if="activeReplyId === reply.id" class="sub-reply-form">
                <el-input v-model="subReplyContent" type="textarea" :rows="3"
                  :placeholder="`回复 ${reply.user.name}...`" />

                <div class="form-actions">
                  <el-button class="cancel-btn" @click="hideReplyForm">取消</el-button>
                  <el-button type="primary" class="submit-btn" @click="submitSubReply(reply)"
                    :disabled="!subReplyContent.trim()">
                    回复
                  </el-button>
                </div>
              </div>

              <div v-if="reply.subReplies && reply.subReplies.length > 0" class="sub-replies">
                <div v-for="(subReply, subIndex) in reply.subReplies" :key="subIndex" class="sub-reply-item">
                  <div class="sub-reply-user">
                    <img :src="subReply.user.avatar" :alt="subReply.user.name" class="sub-user-avatar">
                  </div>

                  <div class="sub-reply-content">
                    <div class="sub-reply-header">
                      <span class="user-name">{{ subReply.user.name }}</span>
                      <span class="reply-to">回复</span>
                      <span class="target-user">{{ subReply.replyTo }}</span>
                      <span class="reply-time">{{ formatTime(subReply.createdAt) }}</span>
                    </div>

                    <div class="sub-reply-body">
                      <p>{{ subReply.content }}</p>
                    </div>

                    <div class="sub-reply-actions">
                      <span class="reply-action" @click="showReplyForm(reply.id, subReply.user.name)">回复</span>
                      <span class="reply-action like-action" :class="{ 'liked': subReply.isLiked }"
                        @click="toggleSubReplyLike(subReply)">
                        <el-icon>
                          <Star />
                        </el-icon>
                        {{ subReply.likeCount }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ArrowLeft, View, ChatLineRound, Star, Share, Warning } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const route = useRoute()
const topicId = computed(() => route.params.id)

// 模拟数据 - 话题详情
const mockTopic = {
  id: 1,
  title: '【讨论】电子音乐节期间如何保持体力？',
  user: {
    name: '音乐节爱好者',
    avatar: 'https://randomuser.me/api/portraits/men/32.jpg'
  },
  category: '讨论',
  viewCount: 2458,
  replyCount: 36,
  likeCount: 125,
  createdAt: '2023-06-18T08:30:00Z',
  content: [
    '大家好，最近有不少音乐节要参加，想请教一下有经验的朋友们，怎么在连续几天的电音节中保持体力？',
    '我去年参加了Ultra音乐节，连续三天下来真的感觉体力不支，第三天几乎是强撑着听完了压轴DJ的表演。',
    '今年夏天准备去Tomorrowland，希望能得到一些建议，有什么补给品、休息方式或者其他技巧可以分享吗？感谢大家！'
  ],
  replies: [
    {
      id: 101,
      user: {
        name: 'DJ小新',
        avatar: 'https://randomuser.me/api/portraits/men/22.jpg'
      },
      content: '我一般会带能量棒和电解质饮料，每天早上补充维生素B，中午适当休息，不要从头到尾都在蹦，选择自己最喜欢的DJ表演时间全力以赴，其他时间可以放松一点。',
      createdAt: '2023-06-18T10:45:00Z',
      likeCount: 28,
      isLiked: false,
      subReplies: [
        {
          id: 1001,
          user: {
            name: '电音少女',
            avatar: 'https://randomuser.me/api/portraits/women/28.jpg'
          },
          replyTo: 'DJ小新',
          content: '同意！我还会带一些水果，比如香蕉，补充能量特别好，而且不会有饱腹感影响蹦迪。',
          createdAt: '2023-06-18T11:20:00Z',
          likeCount: 12,
          isLiked: false
        }
      ]
    },
    {
      id: 102,
      user: {
        name: '资深音乐节玩家',
        avatar: 'https://randomuser.me/api/portraits/men/45.jpg'
      },
      content: '穿着很重要！一定要穿舒适的鞋子，我一般会带两双鞋轮换着穿。衣服选择透气的材质，带一件轻薄的防风外套应对早晚温差。',
      createdAt: '2023-06-18T14:30:00Z',
      likeCount: 35,
      isLiked: true,
      subReplies: []
    },
    {
      id: 103,
      user: {
        name: '电音医生',
        avatar: 'https://randomuser.me/api/portraits/men/67.jpg'
      },
      content: '作为一名医生也是电音爱好者，我建议：1. 保持充分水分，但不要过量；2. 带些高能量低体积的食物；3. 使用耳塞保护听力；4. 每天睡眠至少6小时；5. 注意防晒。',
      createdAt: '2023-06-19T09:15:00Z',
      likeCount: 42,
      isLiked: false,
      subReplies: [
        {
          id: 1002,
          user: {
            name: '音乐节爱好者',
            avatar: 'https://randomuser.me/api/portraits/men/32.jpg'
          },
          replyTo: '电音医生',
          content: '谢谢医生的专业建议！耳塞确实很重要，去年我就是没带，回来后耳鸣了好几天。',
          createdAt: '2023-06-19T10:05:00Z',
          likeCount: 8,
          isLiked: true
        },
        {
          id: 1003,
          user: {
            name: '夜店达人',
            avatar: 'https://randomuser.me/api/portraits/women/36.jpg'
          },
          replyTo: '电音医生',
          content: '有推荐的耳塞品牌吗？我尝试过一些，但感觉音质失真很严重。',
          createdAt: '2023-06-19T11:30:00Z',
          likeCount: 3,
          isLiked: false
        }
      ]
    }
  ]
}

// 状态变量
const topic = ref(mockTopic)
const isLiked = ref(false)
const likeCount = ref(topic.value.likeCount)
const replyContent = ref('')
const activeReplyId = ref(null)
const subReplyContent = ref('')

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

// 点赞/取消点赞话题
const toggleLike = () => {
  isLiked.value = !isLiked.value
  likeCount.value = isLiked.value ? likeCount.value + 1 : likeCount.value - 1
}

// 点赞/取消点赞回复
const toggleReplyLike = (reply) => {
  reply.isLiked = !reply.isLiked
  reply.likeCount = reply.isLiked ? reply.likeCount + 1 : reply.likeCount - 1
}

// 点赞/取消点赞子回复
const toggleSubReplyLike = (subReply) => {
  subReply.isLiked = !subReply.isLiked
  subReply.likeCount = subReply.isLiked ? subReply.likeCount + 1 : subReply.likeCount - 1
}

// 显示回复表单
const showReplyForm = (replyId, replyToName) => {
  activeReplyId.value = replyId
  subReplyContent.value = replyToName ? `@${replyToName} ` : ''
}

// 隐藏回复表单
const hideReplyForm = () => {
  activeReplyId.value = null
  subReplyContent.value = ''
}

// 提交回复
const submitReply = () => {
  if (!replyContent.value.trim()) return

  // 实际项目中应该调用API提交回复
  const newReply = {
    id: Date.now(),
    user: {
      name: '当前用户',
      avatar: 'https://randomuser.me/api/portraits/men/85.jpg'
    },
    content: replyContent.value,
    createdAt: new Date().toISOString(),
    likeCount: 0,
    isLiked: false,
    subReplies: []
  }

  topic.value.replies.unshift(newReply)
  topic.value.replyCount++
  replyContent.value = ''

  ElMessage.success('回复成功')
}

// 提交子回复
const submitSubReply = (reply) => {
  if (!subReplyContent.value.trim()) return

  // 实际项目中应该调用API提交子回复
  const newSubReply = {
    id: Date.now(),
    user: {
      name: '当前用户',
      avatar: 'https://randomuser.me/api/portraits/men/85.jpg'
    },
    replyTo: reply.user.name,
    content: subReplyContent.value,
    createdAt: new Date().toISOString(),
    likeCount: 0,
    isLiked: false
  }

  if (!reply.subReplies) {
    reply.subReplies = []
  }

  reply.subReplies.push(newSubReply)
  topic.value.replyCount++
  hideReplyForm()

  ElMessage.success('回复成功')
}

onMounted(() => {
  // 实际项目中应该根据路由参数获取话题详情
  console.log('加载话题ID:', topicId.value)

  // 模拟增加浏览次数
  topic.value.viewCount++
})
</script>

<style lang="scss" scoped>
.topic-detail-page {
  padding: 40px 0 60px;
}

.topic-header {
  margin-bottom: 30px;
}

.topic-nav {
  margin-bottom: 20px;

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

.topic-main-info {
  display: flex;
  gap: 20px;

  .topic-user {
    .user-avatar {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      object-fit: cover;
    }
  }

  .topic-content-header {
    flex: 1;
  }
}

.topic-title {
  font-size: 28px;
  font-weight: 800;
  margin-bottom: 15px;
  line-height: 1.3;
}

.topic-meta {
  display: flex;
  align-items: center;
  gap: 15px;
  flex-wrap: wrap;

  .user-name {
    font-weight: 600;
  }

  .topic-time {
    color: var(--acmetone-text-secondary);
  }

  .category-tag {
    padding: 4px 10px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 500;
    color: var(--acmetone-black);
  }
}

.topic-content {
  background-color: var(--acmetone-dark-gray);
  padding: 30px;
  margin-bottom: 30px;
  border-radius: 0;
  position: relative;
}

.topic-body {
  margin-bottom: 30px;

  .content-paragraph {
    margin-bottom: 15px;
    line-height: 1.6;
    font-size: 16px;

    &:last-child {
      margin-bottom: 0;
    }
  }
}

.topic-stats {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;

  .stat-item {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--acmetone-text-secondary);
    font-size: 14px;
    cursor: pointer;

    &.like-stat {
      &.liked {
        color: #ff9900;
      }

      &:hover {
        color: #ff9900;
      }
    }
  }
}

.topic-actions {
  display: flex;
  gap: 15px;

  .action-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    border: 1px solid var(--acmetone-border);
    background-color: transparent;
    color: var(--acmetone-text);

    &:hover {
      border-color: var(--genre-edm);
      color: var(--genre-edm);
    }

    &.report-btn:hover {
      border-color: #ff4d4f;
      color: #ff4d4f;
    }
  }
}

.topic-replies {
  .replies-title {
    font-size: 24px;
    font-weight: 700;
    margin-bottom: 20px;
  }
}

.reply-form {
  background-color: var(--acmetone-dark-gray);
  padding: 20px;
  margin-bottom: 30px;
  border-radius: 0;

  .form-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 15px;

    .current-user-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      object-fit: cover;
    }

    .form-title {
      font-weight: 600;
    }
  }

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
    margin-top: 15px;

    .submit-btn {
      background-color: var(--genre-edm);
      color: var(--acmetone-black);
      border: none;
      font-weight: 600;

      &:hover {
        background-color: var(--acmetone-white);
      }

      &:disabled {
        background-color: var(--acmetone-gray);
        color: var(--acmetone-text-secondary);
      }
    }
  }
}

.replies-list {
  .reply-item {
    display: flex;
    gap: 15px;
    margin-bottom: 25px;

    &:last-child {
      margin-bottom: 0;
    }

    .reply-user {
      .user-avatar {
        width: 50px;
        height: 50px;
        border-radius: 50%;
        object-fit: cover;
      }
    }

    .reply-content {
      flex: 1;
      background-color: var(--acmetone-dark-gray);
      padding: 20px;
      border-radius: 0;
    }
  }
}

.reply-header {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 10px;

  .user-name {
    font-weight: 600;
  }

  .reply-time {
    color: var(--acmetone-text-secondary);
    font-size: 14px;
  }
}

.reply-body {
  margin-bottom: 15px;

  p {
    line-height: 1.6;
  }
}

.reply-actions {
  display: flex;
  gap: 15px;

  .reply-action {
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

.sub-reply-form {
  margin-top: 15px;
  margin-bottom: 15px;

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
    margin-top: 10px;

    .cancel-btn {
      background-color: transparent;
      border: 1px solid var(--acmetone-border);
      color: var(--acmetone-text);

      &:hover {
        border-color: var(--acmetone-white);
      }
    }

    .submit-btn {
      background-color: var(--genre-edm);
      color: var(--acmetone-black);
      border: none;
      font-weight: 600;

      &:hover {
        background-color: var(--acmetone-white);
      }

      &:disabled {
        background-color: var(--acmetone-gray);
        color: var(--acmetone-text-secondary);
      }
    }
  }
}

.sub-replies {
  margin-top: 15px;
  border-left: 2px solid var(--acmetone-border);
  padding-left: 15px;

  .sub-reply-item {
    display: flex;
    gap: 10px;
    margin-bottom: 15px;

    &:last-child {
      margin-bottom: 0;
    }

    .sub-reply-user {
      .sub-user-avatar {
        width: 30px;
        height: 30px;
        border-radius: 50%;
        object-fit: cover;
      }
    }

    .sub-reply-content {
      flex: 1;
    }
  }
}

.sub-reply-header {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-bottom: 8px;
  font-size: 14px;

  .user-name,
  .target-user {
    font-weight: 600;
  }

  .reply-to {
    color: var(--acmetone-text-secondary);
  }

  .reply-time {
    color: var(--acmetone-text-secondary);
    margin-left: 5px;
  }
}

.sub-reply-body {
  margin-bottom: 8px;

  p {
    line-height: 1.5;
    font-size: 14px;
  }
}

.sub-reply-actions {
  display: flex;
  gap: 15px;

  .reply-action {
    font-size: 12px;
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
@media (max-width: $breakpoint-md) {
  .topic-main-info {
    flex-direction: column;
    align-items: center;
    text-align: center;

    .topic-content-header {
      display: flex;
      flex-direction: column;
      align-items: center;
    }
  }

  .topic-meta {
    justify-content: center;
  }
}

@media (max-width: $breakpoint-sm) {
  .topic-title {
    font-size: 24px;
  }

  .topic-content {
    padding: 20px;
  }

  .reply-item {
    flex-direction: column;

    .reply-user {
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