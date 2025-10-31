<template>
  <div class="label-card" @click="navigateToLabel">
    <div class="label-logo">
      <img :src="label.logo" :alt="label.name">
    </div>
    <div class="label-info">
      <h3 class="label-name">{{ label.name }}</h3>
      <p class="label-owner">创始人: {{ label.owner }}</p>
      <div class="label-stats">
        <div class="stat-item">
          <el-icon>
            <Headset />
          </el-icon>
          <span>{{ label.trackCount }} 首歌曲</span>
        </div>
        <div class="stat-item">
          <el-icon>
            <Star />
          </el-icon>
          <span>{{ label.followerCount }} 关注者</span>
        </div>
      </div>
      <div class="label-genres">
        <span v-for="genre in label.genres" :key="genre" class="genre-tag" :style="getGenreTagStyle(genre)">
          {{ genre }}
        </span>
      </div>
    </div>
    <div class="label-overlay">
      <button class="view-button">
        查看详情
        <el-icon class="icon">
          <ArrowRight />
        </el-icon>
      </button>
    </div>
  </div>
</template>

<script setup>
import { Headset, Star, ArrowRight } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import { getGenreColor } from '@/utils/genreColor'
import { isLightColor } from '@/utils/colorHelpers';

const props = defineProps({
  label: {
    type: Object,
    required: true
  }
})

const router = useRouter()

const navigateToLabel = () => {
  router.push(`/labels/${props.label.id}`)
}

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
.label-card {
  background-color: var(--acmetone-dark-gray);
  border-radius: 0;
  overflow: hidden;
  position: relative;
  cursor: pointer;
  height: 100%;
  display: flex;
  flex-direction: column;
  transition: transform 0.3s ease, box-shadow 0.3s ease;

  &:hover {
    transform: translateY(-10px);
    box-shadow: 0 20px 30px rgba(0, 0, 0, 0.3);

    .label-overlay {
      opacity: 1;
    }

    .label-logo img {
      transform: scale(1.1);
    }
  }
}

.label-logo {
  height: 180px;
  overflow: hidden;
  position: relative;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.5s ease;
  }

  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 50%;
    background: linear-gradient(to top, var(--acmetone-dark-gray), transparent);
  }
}

.label-info {
  padding: 20px;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.label-name {
  font-size: 22px;
  font-weight: 700;
  margin-bottom: 8px;
}

.label-owner {
  color: var(--acmetone-text-secondary);
  margin-bottom: 15px;
  font-size: 14px;
}

.label-stats {
  display: flex;
  gap: 15px;
  margin-bottom: 15px;

  .stat-item {
    display: flex;
    align-items: center;
    gap: 5px;
    color: var(--acmetone-text-secondary);
    font-size: 14px;
  }
}

.label-genres {
  margin-top: auto;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;

  .genre-tag {
    padding: 4px 10px;
    font-size: 12px;
    font-weight: 500;
    border-radius: 4px;
  }
}

.label-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.view-button {
  background-color: transparent;
  color: var(--acmetone-white);
  border: solid 1px var(--acmetone-white);
  padding: 12px 24px;
  font-size: 16px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: background-color 0.3s ease;

  &:hover {
    background-color: var(--acmetone-white);
    color: var(--acmetone-black);
  }

  .icon {
    font-size: 18px;
  }
}

@media (max-width: $breakpoint-md) {
  .label-logo {
    height: 150px;
  }

  .label-name {
    font-size: 18px;
  }
}
</style>