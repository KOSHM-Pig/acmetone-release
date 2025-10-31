<template>
  <div class="forum-list-page">
    <div class="container">
      <div class="page-header">
        <h1 class="page-title">电音论坛</h1>
        <p class="page-subtitle">分享你的想法，探索电子音乐的世界</p>
      </div>

      <div class="forum-actions">
        <div class="search-bar">
          <el-input v-model="searchQuery" placeholder="搜索帖子..." class="search-input" @keyup.enter="handleSearch">
            <template #prefix>
              <el-icon>
                <Search />
              </el-icon>
            </template>
          </el-input>
        </div>

        <div class="category-filter">
          <el-select v-model="selectedCategory" placeholder="全部分类" class="category-select">
            <el-option v-for="category in categories" :key="category.value" :label="category.label"
              :value="category.value" />
          </el-select>
        </div>

        <div class="sort-filter">
          <el-select v-model="sortBy" placeholder="排序方式" class="sort-select">
            <el-option label="最新发布" value="newest" />
            <el-option label="热门回复" value="replies" />
            <el-option label="最多浏览" value="views" />
          </el-select>
        </div>

        <el-button type="primary" class="new-topic-btn">
          <el-icon>
            <Plus />
          </el-icon>
          发布新帖
        </el-button>
      </div>

      <div class="forum-content">
        <div class="forum-list">
          <div class="forum-list-header">
            <div class="header-topic">话题</div>
            <div class="header-category">分类</div>
            <div class="header-stats">统计</div>
            <div class="header-activity">最近活动</div>
          </div>

          <div v-if="loading" class="loading-container">
            <el-skeleton :rows="10" animated />
          </div>

          <template v-else>
            <div v-if="topics.length === 0" class="empty-state">
              <el-empty description="暂无帖子" />
            </div>

            <div v-else v-for="topic in topics" :key="topic.id" class="topic-item">
              <div class="topic-main">
                <div class="topic-user">
                  <img :src="topic.user.avatar" :alt="topic.user.name" class="user-avatar">
                </div>

                <div class="topic-content">
                  <h3 class="topic-title">
                    <router-link :to="`/forum/topic/${topic.id}`">{{ topic.title }}</router-link>
                  </h3>

                  <p class="topic-excerpt">{{ topic.excerpt }}</p>

                  <div class="topic-meta">
                    <span class="user-name">{{ topic.user.name }}</span>
                    <span class="topic-time">{{ formatTime(topic.createdAt) }}</span>
                  </div>
                </div>
              </div>

              <div class="topic-category">
                <span class="category-tag" :style="{ backgroundColor: getCategoryColor(topic.category) }">
                  {{ topic.category }}
                </span>
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

              <div class="topic-activity">
                <div class="last-reply">
                  <div class="reply-user">
                    <img :src="topic.lastReply?.user.avatar || topic.user.avatar"
                      :alt="topic.lastReply?.user.name || topic.user.name" class="reply-avatar">
                  </div>
                  <div class="reply-meta">
                    <div class="reply-name">{{ topic.lastReply?.user.name || topic.user.name }}</div>
                    <div class="reply-time">{{ formatTime(topic.lastReply?.createdAt || topic.createdAt) }}</div>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </div>

        <div class="forum-pagination">
          <el-pagination v-model:current-page="currentPage" v-model:page-size="pageSize" :page-sizes="[10, 20, 30, 50]"
            layout="total, sizes, prev, pager, next, jumper" :total="totalTopics" @size-change="handleSizeChange"
            @current-change="handleCurrentChange" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Search, Plus, View, ChatLineRound, Star } from '@element-plus/icons-vue'

// 模拟数据 - 分类
const categories = [
  { label: '全部分类', value: '' },
  { label: '讨论', value: '讨论' },
  { label: '制作分享', value: '制作分享' },
  { label: '新闻', value: '新闻' },
  { label: '器材', value: '器材' },
  { label: '活动', value: '活动' }
]

// 模拟数据 - 帖子
const mockTopics = [
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
    lastReply: {
      user: {
        name: 'DJ小新',
        avatar: 'https://randomuser.me/api/portraits/men/22.jpg'
      },
      content: '我一般会带能量棒和电解质饮料...',
      createdAt: '2023-06-19T10:45:00Z'
    }
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
    lastReply: {
      user: {
        name: '制作大师',
        avatar: 'https://randomuser.me/api/portraits/men/45.jpg'
      },
      content: '整体不错，但是鼓点的设计可以再细致一些...',
      createdAt: '2023-06-18T20:30:00Z'
    }
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
    lastReply: {
      user: {
        name: '电音少女',
        avatar: 'https://randomuser.me/api/portraits/women/28.jpg'
      },
      content: '太期待了！今年一定要去现场感受一下',
      createdAt: '2023-06-19T14:15:00Z'
    }
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
    lastReply: {
      user: {
        name: '器材达人',
        avatar: 'https://randomuser.me/api/portraits/men/66.jpg'
      },
      content: '推荐Arturia Minilab MKII，紧凑实用而且预算内',
      createdAt: '2023-06-19T09:05:00Z'
    }
  },
  {
    id: 5,
    title: '【活动】上海电子音乐派对7月活动预告',
    excerpt: '7月15日，我们将在上海举办一场地下电子音乐派对，特邀知名DJ前来表演，欢迎大家参加！',
    user: {
      name: '派对策划人',
      avatar: 'https://randomuser.me/api/portraits/men/36.jpg'
    },
    category: '活动',
    viewCount: 1987,
    replyCount: 27,
    likeCount: 156,
    createdAt: '2023-06-14T16:40:00Z',
    lastReply: {
      user: {
        name: '夜店达人',
        avatar: 'https://randomuser.me/api/portraits/women/36.jpg'
      },
      content: '请问有具体的地址和门票信息吗？',
      createdAt: '2023-06-18T18:20:00Z'
    }
  }
]

// 状态变量
const loading = ref(true)
const searchQuery = ref('')
const selectedCategory = ref('')
const sortBy = ref('newest')
const currentPage = ref(1)
const pageSize = ref(10)
const totalTopics = ref(mockTopics.length)

// 过滤和排序后的主题列表
const topics = computed(() => {
  // 实际项目中这应该是通过API获取的数据
  // 这里简单模拟过滤和排序逻辑
  return mockTopics
})

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

// 处理搜索
const handleSearch = () => {
  // 实际项目中应该调用API进行搜索
  console.log('搜索:', searchQuery.value)
  currentPage.value = 1
}

// 处理页码变化
const handleCurrentChange = (page) => {
  // 实际项目中应该调用API获取对应页面的数据
  console.log('当前页:', page)
}

// 处理每页条数变化
const handleSizeChange = (size) => {
  // 实际项目中应该调用API获取对应条数的数据
  console.log('每页条数:', size)
  currentPage.value = 1
}

onMounted(() => {
  // 模拟加载数据
  setTimeout(() => {
    loading.value = false
  }, 1000)
})
</script>

<style lang="scss" scoped>
.forum-list-page {
  padding: 60px 0;
}

.page-header {
  text-align: center;
  margin-bottom: 40px;

  .page-title {
    font-size: 36px;
    font-weight: 800;
    margin-bottom: 10px;
    position: relative;
    display: inline-block;
    padding-bottom: 15px;

    &::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 50%;
      transform: translateX(-50%);
      width: 60px;
      height: 3px;
      background-color: var(--genre-edm);
    }
  }

  .page-subtitle {
    color: var(--acmetone-text-secondary);
    font-size: 18px;
  }
}

.forum-actions {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 30px;
  flex-wrap: wrap;

  .search-bar {
    flex: 1;
    min-width: 250px;

    .search-input {
      width: 100%;

      :deep(.el-input__wrapper) {
        background-color: var(--acmetone-dark-gray);
        box-shadow: none !important;
        border: 1px solid var(--acmetone-border);

        &:hover,
        &.is-focus {
          border-color: var(--genre-edm);
        }
      }

      :deep(.el-input__inner) {
        color: var(--acmetone-text);
        height: 40px;
        font-size: 14px;
      }
    }
  }

  .category-filter,
  .sort-filter {
    :deep(.el-select) {
      width: 140px;

      .el-input__wrapper {
        background-color: var(--acmetone-dark-gray);
        box-shadow: none !important;
        border: 1px solid var(--acmetone-border);

        &:hover,
        &.is-focus {
          border-color: var(--genre-edm);
        }
      }

      .el-input__inner {
        color: var(--acmetone-text);
        height: 40px;
        font-size: 14px;
      }
    }
  }

  .new-topic-btn {
    background-color: var(--genre-edm);
    color: var(--acmetone-black);
    border: none;
    display: flex;
    align-items: center;
    gap: 5px;
    height: 40px;
    font-weight: 600;

    &:hover {
      background-color: var(--acmetone-white);
    }
  }
}

.forum-content {
  background-color: var(--acmetone-dark-gray);
  border-radius: 0;
  overflow: hidden;
}

.forum-list-header {
  display: grid;
  grid-template-columns: 1fr 120px 140px 180px;
  padding: 15px 20px;
  background-color: rgba(0, 0, 0, 0.2);
  font-size: 14px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  border-bottom: 1px solid var(--acmetone-border);
}

.loading-container {
  padding: 20px;
}

.topic-item {
  display: grid;
  grid-template-columns: 1fr 120px 140px 180px;
  padding: 20px;
  border-bottom: 1px solid var(--acmetone-border);
  transition: background-color 0.3s ease;

  &:hover {
    background-color: rgba(0, 0, 0, 0.2);
  }

  &:last-child {
    border-bottom: none;
  }
}

.topic-main {
  display: flex;
  gap: 15px;
}

.topic-user {
  .user-avatar {
    width: 50px;
    height: 50px;
    border-radius: 50%;
    object-fit: cover;
  }
}

.topic-content {
  flex: 1;
  min-width: 0;
}

.topic-title {
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 10px;

  a {
    color: var(--acmetone-white);
    transition: color 0.3s ease;

    &:hover {
      color: var(--genre-edm);
      text-decoration: none;
    }
  }
}

.topic-excerpt {
  color: var(--acmetone-text-secondary);
  margin-bottom: 10px;
  font-size: 14px;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.topic-meta {
  font-size: 13px;

  .user-name {
    font-weight: 600;
    margin-right: 10px;
  }

  .topic-time {
    color: var(--acmetone-text-secondary);
  }
}

.topic-category {
  display: flex;
  align-items: center;

  .category-tag {
    padding: 4px 10px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 500;
    color: var(--acmetone-black);
  }
}

.topic-stats {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 8px;

  .stat-item {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--acmetone-text-secondary);
    font-size: 14px;
  }
}

.topic-activity {
  display: flex;
  align-items: center;
}

.last-reply {
  display: flex;
  align-items: center;
  gap: 10px;

  .reply-avatar {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    object-fit: cover;
  }

  .reply-meta {
    font-size: 13px;

    .reply-name {
      font-weight: 600;
      margin-bottom: 3px;
    }

    .reply-time {
      color: var(--acmetone-text-secondary);
    }
  }
}

.forum-pagination {
  padding: 20px;
  display: flex;
  justify-content: center;

  :deep(.el-pagination) {
    --el-pagination-bg-color: transparent;
    --el-pagination-text-color: var(--acmetone-text);
    --el-pagination-button-color: var(--acmetone-text);
    --el-pagination-hover-color: var(--genre-edm);

    .el-pager li {
      background-color: var(--acmetone-gray);

      &.is-active {
        background-color: var(--genre-edm);
        color: var(--acmetone-black);
      }
    }

    .btn-prev,
    .btn-next {
      background-color: var(--acmetone-gray);
    }
  }
}

/* 响应式设计 */
@media (max-width: $breakpoint-lg) {
  .forum-actions {
    .search-bar {
      width: 100%;
      flex: auto;
    }
  }

  .forum-list-header,
  .topic-item {
    grid-template-columns: 1fr 100px 120px;

    .header-activity,
    .topic-activity {
      display: none;
    }
  }
}

@media (max-width: $breakpoint-md) {

  .forum-list-header,
  .topic-item {
    grid-template-columns: 1fr 100px;

    .header-stats,
    .topic-stats {
      display: none;
    }
  }

  .topic-excerpt {
    -webkit-line-clamp: 1;
  }
}

@media (max-width: $breakpoint-sm) {
  .page-header {
    .page-title {
      font-size: 28px;
    }

    .page-subtitle {
      font-size: 16px;
    }
  }

  .forum-list-header {
    display: none;
  }

  .topic-item {
    display: block;
    padding: 15px;
  }

  .topic-category {
    margin: 15px 0;
  }
}
</style>