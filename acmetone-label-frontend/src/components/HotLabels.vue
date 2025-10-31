<template>
  <div class="hot-labels">
    <div class="container">
      <div class="labels-grid">
        <div
          v-for="label in hotLabels"
          :key="label.id"
          class="label-item"
          @click="goToLabel(label.id)"
        >
          <div class="label-cover">
            <img
              :src="label.logoUrl || defaultLogo"
              :alt="label.chineseName"
              @error="handleImageError"
            />
          </div>
          <div class="label-details">
            <h3 class="label-title">{{ label.chineseName }}</h3>
            <p class="label-subtitle">{{ label.englishName }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const hotLabels = ref([])
const loading = ref(false)

// 默认Logo
const defaultLogo = 'https://via.placeholder.com/120x120?text=LOGO'

// 模拟热门厂牌数据
const mockLabels = [
  {
    id: 1,
    chineseName: '极音电子',
    englishName: 'Acmetone Electronic',
    description: '专注电子音乐制作与发行的独立厂牌',
    logoUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=120&h=120&fit=crop&crop=center',
    genres: '["电子", "House", "Techno"]',
    albumCount: 25,
    artistCount: 12
  },
  {
    id: 2,
    chineseName: '星河音乐',
    englishName: 'Galaxy Music',
    description: '汇聚新生代音乐人的创意平台',
    logoUrl: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=120&h=120&fit=crop&crop=center',
    genres: '["流行", "摇滚", "民谣"]',
    albumCount: 18,
    artistCount: 8
  },
  {
    id: 3,
    chineseName: '节拍工厂',
    englishName: 'Beat Factory',
    description: '专业的节拍制作与音乐发行厂牌',
    logoUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=120&h=120&fit=crop&crop=center',
    genres: '["Hip-Hop", "R&B", "Trap"]',
    albumCount: 32,
    artistCount: 15
  },
  {
    id: 4,
    chineseName: '声波实验室',
    englishName: 'Sound Lab',
    description: '实验性音乐与前卫声音的探索者',
    logoUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=120&h=120&fit=crop&crop=center',
    genres: '["实验", "环境音乐", "电子"]',
    albumCount: 14,
    artistCount: 6
  },
  {
    id: 5,
    chineseName: '城市律动',
    englishName: 'Urban Rhythm',
    description: '城市音乐文化的传播者与创造者',
    logoUrl: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=120&h=120&fit=crop&crop=center',
    genres: '["Urban", "Funk", "Soul"]',
    albumCount: 21,
    artistCount: 10
  },
  {
    id: 6,
    chineseName: '梦境音响',
    englishName: 'Dream Sound',
    description: '营造梦幻音乐体验的专业厂牌',
    logoUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=120&h=120&fit=crop&crop=center',
    genres: '["Ambient", "Chillout", "Downtempo"]',
    albumCount: 16,
    artistCount: 7
  }
]

// 获取热门厂牌数据
const fetchHotLabels = async () => {
  loading.value = true
  try {
    // 这里应该调用实际的API
    // const response = await LabelService.getHotLabels()
    // hotLabels.value = response.data
    
    // 暂时使用模拟数据
    await new Promise(resolve => setTimeout(resolve, 500)) // 模拟API延迟
    hotLabels.value = mockLabels
  } catch (error) {
    console.error('获取热门厂牌失败:', error)
  } finally {
    loading.value = false
  }
}

// 解析音乐类型
const getGenres = (genresStr) => {
  try {
    const genres = JSON.parse(genresStr)
    return Array.isArray(genres) ? genres.slice(0, 3) : []
  } catch {
    return []
  }
}

// 处理图片加载错误
const handleImageError = (event) => {
  event.target.src = defaultLogo
}

// 跳转到厂牌详情
const goToLabel = (labelId) => {
  router.push(`/labels/${labelId}`)
}

// 查看所有厂牌
const viewAllLabels = () => {
  router.push('/labels')
}

onMounted(() => {
  fetchHotLabels()
})
</script>

<style lang="scss" scoped>
.hot-labels {
  padding: 60px 0;
  background-color: #fff;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}

.labels-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 40px;
  margin-bottom: 60px;
}


/* 卡片样式对齐 Labels.vue */
.label-item {
  opacity: 1;
  transform: none;
  transition: transform 0.5s ease;
  cursor: pointer;
  background: none;
}

.label-cover {
  position: relative;
  width: 100%;
  padding-top: 75%; /* 4:3 */
  overflow: hidden;
  margin-bottom: 12px;
  background-color: #f5f5f5;
}

.label-cover img {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.5s ease;
}

.label-item:hover .label-cover img {
  transform: scale(1.05);
}

.label-details {
  padding: 0 5px;
}

.label-title {
  font-size: 1.2rem;
  font-weight: 800;
  margin: 0 0 4px;
  text-transform: uppercase;
  letter-spacing: -0.5px;
  line-height: 1.2;
  color: #000;
}

.label-subtitle {
  font-size: 0.8rem;
  color: #666;
  margin: 0;
  font-weight: 500;
}

.view-more {
  text-align: center;
}

.garrix-btn {
  background-color: #007bff;
  color: white;
  border: none;
  padding: 12px 32px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.3s ease;

  &:hover {
    background-color: #0056b3;
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .hot-labels {
    padding: 40px 0;
  }
  .labels-grid {
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 20px;
  }
}
</style>
