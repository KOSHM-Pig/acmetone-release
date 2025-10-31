<template>
  <div class="admin-home-container">
    <!-- 发行日历组件 -->
    <AlbumCalendar
      :albums="albums"
      :selectedDate="selectedDate"
      @date-selected="onDateSelected"
      @album-selected="onAlbumSelected"
      @month-changed="onMonthChanged"
      :cellSize="100"
      :cellGap="6"
      calendarClass="admin-calendar"
    />

    <!-- 选中日期的专辑详情 -->
    <div v-if="selectedDateAlbums.length > 0" class="selected-date-info">
      <h3>{{ formatSelectedDate }} 发行的专辑</h3>
      <div class="album-list">
        <div
          v-for="album in selectedDateAlbums"
          :key="album.id"
          class="album-item"
          @click="viewAlbumDetail(album)"
        >
          <img :src="album.cover" :alt="album.name" class="album-cover" />
          <div class="album-info">
            <div class="album-name">{{ album.name }}</div>
            <div class="album-artists">{{ getArtistNames(album.artists) }}</div>
            <div class="album-label">{{ album.label }}</div>
            <div class="album-status" :class="album.status">{{ getStatusText(album.status) }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { calendarApi } from '@/api/calendar';
import AlbumCalendar from '@/components/AlbumCalendar.vue';
import { ElMessage } from 'element-plus';
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();

// 响应式数据
const albums = ref([]);
const selectedDate = ref(null);
const selectedDateAlbums = ref([]);
const currentYear = ref(new Date().getFullYear());
const currentMonth = ref(new Date().getMonth() + 1);

// 计算属性
const formatSelectedDate = computed(() => {
  if (!selectedDate.value) return '';
  const date = new Date(selectedDate.value);
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
});

// 方法
const loadCalendarData = async (year = currentYear.value, month = currentMonth.value) => {
  try {
    const response = await calendarApi.getReleases({ year, month, status: 'approved' });
    if (response.success) {
      albums.value = response.data.albums;
    } else {
      ElMessage.error('加载发行日历数据失败');
    }
  } catch (error) {
    console.error('加载发行日历数据失败:', error);
    ElMessage.error('加载发行日历数据失败');
  }
};

const onDateSelected = async (date) => {
  selectedDate.value = date;
  try {
    const response = await calendarApi.getReleasesByDate(date, { status: 'approved' });
    if (response.success) {
      selectedDateAlbums.value = response.data.albums;
    } else {
      selectedDateAlbums.value = [];
    }
  } catch (error) {
    console.error('加载指定日期专辑数据失败:', error);
    selectedDateAlbums.value = [];
  }
};

const onAlbumSelected = (album) => {
  // 跳转到专辑详情页
  router.push(`/admin/albums/${album.id}`);
};

const onMonthChanged = (year, month) => {
  currentYear.value = year;
  currentMonth.value = month;
  loadCalendarData(year, month);
};

const viewAlbumDetail = (album) => {
  router.push(`/admin/albums/${album.id}`);
};

const getArtistNames = (artists) => {
  if (!artists || artists.length === 0) return '未知艺人';
  return artists.map(artist => artist.name).join(', ');
};

const getStatusText = (status) => {
  const statusMap = {
    'pending': '待审核',
    'approved': '已通过',
    'rejected': '已拒绝'
  };
  return statusMap[status] || status;
};

// 生命周期
onMounted(() => {
  loadCalendarData();
});
</script>

<style scoped>
.admin-home-container {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
}

.admin-calendar {
  margin-bottom: 30px;
}

.selected-date-info {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.selected-date-info h3 {
  margin: 0 0 20px 0;
  color: #333;
  font-size: 18px;
  font-weight: 600;
}

.album-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.album-item {
  display: flex;
  align-items: center;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 1px solid #e9ecef;
}

.album-item:hover {
  background: #e9ecef;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.album-cover {
  width: 60px;
  height: 60px;
  border-radius: 6px;
  object-fit: cover;
  margin-right: 16px;
  flex-shrink: 0;
}

.album-info {
  flex: 1;
  min-width: 0;
}

.album-name {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.album-artists {
  font-size: 14px;
  color: #666;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.album-label {
  font-size: 12px;
  color: #888;
  margin-bottom: 6px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.album-status {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.album-status.pending {
  background: #fff3cd;
  color: #856404;
}

.album-status.approved {
  background: #d1edff;
  color: #0c5460;
}

.album-status.rejected {
  background: #f8d7da;
  color: #721c24;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .admin-home-container {
    padding: 16px;
  }

  .album-list {
    grid-template-columns: 1fr;
  }

  .album-item {
    padding: 12px;
  }

  .album-cover {
    width: 50px;
    height: 50px;
    margin-right: 12px;
  }
}
</style>
