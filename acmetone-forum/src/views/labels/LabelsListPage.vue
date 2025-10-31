<template>
  <div class="labels-list-page">
    <div class="container">
      <div class="page-header">
        <h1 class="page-title">音乐厂牌</h1>
        <p class="page-subtitle">探索电子音乐的顶级厂牌</p>
      </div>

      <div class="labels-filters">
        <div class="search-bar">
          <el-input v-model="searchQuery" placeholder="搜索厂牌..." class="search-input" @keyup.enter="handleSearch">
            <template #prefix>
              <el-icon>
                <Search />
              </el-icon>
            </template>
          </el-input>
        </div>

        <div class="genre-filter">
          <el-select v-model="selectedGenre" placeholder="流派筛选" class="genre-select">
            <el-option v-for="genre in genres" :key="genre.value" :label="genre.label" :value="genre.value" />
          </el-select>
        </div>

        <div class="sort-filter">
          <el-select v-model="sortBy" placeholder="排序方式" class="sort-select">
            <el-option label="按名称" value="name" />
            <el-option label="按人气" value="popularity" />
            <el-option label="按成立时间" value="founded" />
          </el-select>
        </div>
      </div>

      <div v-if="loading" class="loading-container">
        <el-skeleton :rows="5" animated />
      </div>

      <div v-else class="labels-grid">
        <label-card v-for="label in labels" :key="label.id" :label="label" @click="viewLabelDetail(label.id)" />
      </div>

      <div class="labels-pagination">
        <el-pagination v-model:current-page="currentPage" v-model:page-size="pageSize" :page-sizes="[12, 24, 36, 48]"
          layout="total, sizes, prev, pager, next, jumper" :total="totalLabels" @size-change="handleSizeChange"
          @current-change="handleCurrentChange" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Search } from '@element-plus/icons-vue'
import LabelCard from '@/components/domain/LabelCard.vue'

const router = useRouter()

// 模拟数据 - 流派
const genres = [
  { label: '全部流派', value: '' },
  { label: 'House', value: 'house' },
  { label: 'Techno', value: 'techno' },
  { label: 'Trance', value: 'trance' },
  { label: 'Drum & Bass', value: 'dnb' },
  { label: 'Dubstep', value: 'dubstep' },
  { label: 'Progressive', value: 'progressive' },
  { label: 'Future Bass', value: 'future-bass' }
]

// 模拟数据 - 厂牌
const mockLabels = [
  {
    id: 1,
    name: 'Spinnin\' Records',
    logo: 'https://i1.sndcdn.com/avatars-000006190844-7gzz4s-t500x500.jpg',
    founded: 1999,
    country: '荷兰',
    mainGenres: ['House', 'Future House', 'EDM'],
    topArtists: ['Martin Garrix', 'Tiësto', 'Oliver Heldens'],
    description: '世界领先的电子音乐厂牌之一，以发掘新兴人才和创新音乐而闻名。',
    popularity: 95,
    totalReleases: 2850,
    monthlyListeners: '3600万+'
  },
  {
    id: 2,
    name: 'Anjunabeats',
    logo: 'https://geo-media.beatport.com/image_size/590x404/e7eaead2-def3-4398-8ca0-5ee8c06ae867.jpg',
    founded: 2000,
    country: '英国',
    mainGenres: ['Trance', 'Progressive House', 'Progressive Trance'],
    topArtists: ['Above & Beyond', 'Arty', 'Andrew Bayer'],
    description: '由Above & Beyond创立的厂牌，专注于高质量的Trance和Progressive音乐。',
    popularity: 90,
    totalReleases: 1750,
    monthlyListeners: '2800万+'
  },
  {
    id: 3,
    name: 'STMPD RCRDS',
    logo: 'https://geo-media.beatport.com/image_size/590x404/65626c3f-ad91-4f98-969a-8ca3d80e0c55.jpg',
    founded: 2016,
    country: '荷兰',
    mainGenres: ['EDM', 'Future House', 'Bass House'],
    topArtists: ['Martin Garrix', 'Brooks', 'Julian Jordan'],
    description: '由Martin Garrix创立的厂牌，提供多样化的电子音乐，不局限于特定流派。',
    popularity: 88,
    totalReleases: 630,
    monthlyListeners: '2500万+'
  },
  {
    id: 4,
    name: 'Monstercat',
    logo: 'https://geo-media.beatport.com/image_size/590x404/e21e14c0-81cc-46bc-b9fa-993e4949999b.jpg',
    founded: 2011,
    country: '加拿大',
    mainGenres: ['EDM', 'Dubstep', 'Future Bass'],
    topArtists: ['Pegboard Nerds', 'Aero Chord', 'Marshmello'],
    description: '以创新的发行模式和多样化的电子音乐风格而闻名的独立厂牌。',
    popularity: 92,
    totalReleases: 2100,
    monthlyListeners: '3000万+'
  },
  {
    id: 5,
    name: 'Revealed Recordings',
    logo: 'https://geo-media.beatport.com/image_size/590x404/c31d15ed-c0a7-4c65-93bd-24dae2d48fb0.jpg',
    founded: 2010,
    country: '荷兰',
    mainGenres: ['Big Room', 'Progressive House', 'Electro House'],
    topArtists: ['Hardwell', 'W&W', 'KSHMR'],
    description: '由Hardwell创立的厂牌，以Big Room和Progressive House音乐为主。',
    popularity: 87,
    totalReleases: 1450,
    monthlyListeners: '2400万+'
  },
  {
    id: 6,
    name: 'Drumcode',
    logo: 'https://geo-media.beatport.com/image_size/590x404/1c32003d-e72d-44ae-a6ee-c95fc6407134.jpg',
    founded: 1996,
    country: '瑞典',
    mainGenres: ['Techno', 'Tech House'],
    topArtists: ['Adam Beyer', 'Amelie Lens', 'Alan Fitzpatrick'],
    description: '由Adam Beyer创立的Techno厂牌，以硬朗的风格和前卫的声音设计而闻名。',
    popularity: 89,
    totalReleases: 1200,
    monthlyListeners: '1800万+'
  },
  {
    id: 7,
    name: 'Armada Music',
    logo: 'https://geo-media.beatport.com/image_size/590x404/83fc5fcb-4f1c-444f-871f-dc366467284d.jpg',
    founded: 2003,
    country: '荷兰',
    mainGenres: ['Trance', 'Progressive House', 'Deep House'],
    topArtists: ['Armin van Buuren', 'Andrew Rayel', 'Dash Berlin'],
    description: '由Armin van Buuren共同创立的厂牌，以Trance音乐为主，但涵盖多种电子音乐风格。',
    popularity: 93,
    totalReleases: 3200,
    monthlyListeners: '3200万+'
  },
  {
    id: 8,
    name: 'Hospital Records',
    logo: 'https://geo-media.beatport.com/image_size/590x404/a85dded3-a6ba-4bc5-840f-3f573a722582.jpg',
    founded: 1996,
    country: '英国',
    mainGenres: ['Drum & Bass', 'Liquid Funk'],
    topArtists: ['High Contrast', 'London Elektricity', 'Netsky'],
    description: '专注于Drum & Bass音乐的独立厂牌，以旋律性强、制作精良的作品而闻名。',
    popularity: 86,
    totalReleases: 950,
    monthlyListeners: '1500万+'
  }
]

// 状态变量
const loading = ref(true)
const searchQuery = ref('')
const selectedGenre = ref('')
const sortBy = ref('popularity')
const currentPage = ref(1)
const pageSize = ref(12)
const totalLabels = ref(mockLabels.length)

// 过滤和排序后的厂牌列表
const labels = computed(() => {
  // 实际项目中这应该是通过API获取的数据
  // 这里简单模拟过滤和排序逻辑
  return mockLabels
})

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

// 查看厂牌详情
const viewLabelDetail = (labelId) => {
  router.push(`/labels/${labelId}`)
}

onMounted(() => {
  // 模拟加载数据
  setTimeout(() => {
    loading.value = false
  }, 1000)
})
</script>

<style lang="scss" scoped>
.labels-list-page {
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

.labels-filters {
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

  .genre-filter,
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
}

.loading-container {
  padding: 20px;
}

.labels-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 25px;
  margin-bottom: 40px;
}

.labels-pagination {
  padding: 20px 0;
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
  .labels-filters {
    .search-bar {
      width: 100%;
      flex: auto;
    }
  }

  .labels-grid {
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  }
}

@media (max-width: $breakpoint-md) {
  .labels-grid {
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 20px;
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

  .labels-grid {
    grid-template-columns: repeat(auto-fill, minmax(100%, 1fr));
  }
}
</style>