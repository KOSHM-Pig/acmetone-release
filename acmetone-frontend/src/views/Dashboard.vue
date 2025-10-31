<template>
  <div class="dashboard-container">
    <div class="dashboard-layout">
      <!-- 左侧：日历和专辑列表 -->
      <div class="left-panel">
        <!-- 发行日历组件 -->
        <AlbumCalendar
          :albums="albums"
          :selectedDate="selectedDate"
          @date-selected="onDateSelected"
          @album-selected="onAlbumSelected"
          @month-changed="onMonthChanged"
          :cellSize="100"
          :cellGap="6"
          calendarClass="user-calendar"
        />


      </div>

      <!-- 右侧：专辑详情面板 -->
      <div class="right-panel" v-if="selectedDate">
        <CalendarAlbumDetail
          :selectedDate="new Date(selectedDate)"
          :selectedAlbum="selectedAlbum"
          :albums="selectedDateAlbums"
          @album-selected="onAlbumSelected"
          @date-changed="onDateSelected"
        />
      </div>

    </div>
  </div>
</template>

<script setup>
import { calendarApi } from '@/api/calendar';
import AlbumCalendar from '@/components/AlbumCalendar.vue';
import CalendarAlbumDetail from '@/components/CalendarAlbumDetail.vue';
import { STATIC_BASE_URL } from '@/config';
import { ensureFullUrl } from '@/utils/urlHelper';
import { ElMessage } from 'element-plus';
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();

// 响应式数据
const albums = ref([]);
const selectedDate = ref(new Date()); // 默认选中今天
const selectedDateAlbums = ref([]);
const selectedAlbum = ref(null);
const currentYear = ref(new Date().getFullYear());
const currentMonth = ref(new Date().getMonth() + 1);

// 计算属性
const formatSelectedDate = computed(() => {
  if (!selectedDate.value) return '';
  const date = new Date(selectedDate.value);
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
});

// 处理专辑封面URL
const getAlbumCoverUrl = (album) => {
  if (!album.cover) return `${STATIC_BASE_URL}/images/default-album.png`;
  return ensureFullUrl(album.cover);
};

// 方法
const loadCalendarData = async (year = currentYear.value) => {
  try {
    console.log('📡 Dashboard: 开始加载日历数据', { year });
    // 不传month参数，获取整年的数据
    const response = await calendarApi.getReleases({ year, status: 'approved' });
    console.log('📡 Dashboard: API响应', response);

    if (response.success) {
      albums.value = response.data.albums;
      console.log('📊 Dashboard: 设置专辑数据', {
        albumCount: albums.value.length,
        albums: albums.value.map(a => ({
          id: a.id,
          name: a.name,
          releaseDate: a.releaseDate,
          cover: a.cover
        }))
      });
    } else {
      ElMessage.error('加载发行日历数据失败');
    }
  } catch (error) {
    console.error('加载发行日历数据失败:', error);
    ElMessage.error('加载发行日历数据失败');
  }
};

const onDateSelected = async (date) => {
  console.log('🗓️ Dashboard: 日期被选中', date);
  selectedDate.value = date;
  // 清除之前选中的专辑
  selectedAlbum.value = null;

  try {
    // 将Date对象转换为YYYY-MM-DD格式的字符串，使用本地时间避免时区问题
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    console.log('📅 Dashboard: 请求日期字符串', dateStr);

    const response = await calendarApi.getReleasesByDate(dateStr, { status: 'approved' });
    console.log('📡 Dashboard: API响应', response);

    if (response.success) {
      selectedDateAlbums.value = response.data.albums || [];
      console.log('💿 Dashboard: 设置选中日期专辑', selectedDateAlbums.value);
      // 如果有专辑，默认选中第一个
      if (selectedDateAlbums.value.length > 0) {
        selectedAlbum.value = selectedDateAlbums.value[0];
        console.log('🎵 Dashboard: 默认选中第一个专辑', selectedAlbum.value);
      }
    } else {
      selectedDateAlbums.value = [];
      console.log('❌ Dashboard: API返回失败，清空专辑列表');
    }
  } catch (error) {
    console.error('💥 Dashboard: 加载指定日期专辑数据失败:', error);
    selectedDateAlbums.value = [];
  }
};

const onAlbumSelected = (album) => {
  console.log('🎵 Dashboard: 专辑被选中', album);
  // 设置选中的专辑，显示在右侧详情面板
  selectedAlbum.value = album;
};

const onMonthChanged = (date) => {
  console.log('📅 Dashboard: 月份变化', date);
  currentYear.value = date.getFullYear();
  currentMonth.value = date.getMonth() + 1;
  // 不重新加载数据，让日历组件自己从现有数据中筛选
};



const getArtistNames = (artists) => {
  if (!artists || artists.length === 0) return '未知艺人';
  return artists.map(artist => artist.name).join(', ');
};

// 生命周期
onMounted(async () => {
  console.log('🚀 Dashboard: 组件挂载，开始初始化');
  console.log('📅 Dashboard: 初始选中日期', selectedDate.value);
  // 只加载一次整年的数据
  await loadCalendarData(currentYear.value);
  // 加载今天的专辑数据
  await onDateSelected(selectedDate.value);
});
</script>

<style scoped>
.dashboard-container {
  padding: 20px;
  max-width: 1600px;
  margin: 0 auto;
}

.dashboard-layout {
  display: flex;
  gap: 24px;
  align-items: flex-start;
  min-height: calc(100vh - 120px); /* 改为最小高度，允许扩展 */
}

.left-panel {
  flex: 1;
  min-width: 0;
  height: auto; /* 改为auto，允许内容决定高度 */
  min-height: 700px; /* 设置最小高度 */
  overflow: visible; /* 改为visible，确保内容完全显示 */
}

.right-panel {
  width: 400px;
  flex-shrink: 0;
  height: auto; /* 改为auto */
  min-height: 700px; /* 设置最小高度 */
  overflow: visible; /* 改为visible */
}

/* 响应式布局 */
@media (max-width: 1200px) {
  .right-panel {
    width: 350px;
  }
}

@media (max-width: 1024px) {
  .dashboard-layout {
    flex-direction: column;
    height: auto;
    gap: 16px;
  }

  .left-panel {
    height: auto; /* 改为auto，让内容决定高度 */
    min-height: 500px; /* 增加最小高度确保日历完整显示 */
  }

  .right-panel {
    width: 100%;
    height: auto; /* 改为auto */
    min-height: 300px;
    order: -1; /* 移动端右侧面板显示在上方 */
  }
}

@media (max-width: 768px) {
  .dashboard-container {
    padding: 16px;
  }

  .dashboard-layout {
    gap: 12px;
  }

  .left-panel {
    height: auto; /* 改为auto */
    min-height: 450px; /* 增加最小高度 */
  }

  .right-panel {
    height: auto; /* 改为auto */
    min-height: 250px; /* 减少最小高度 */
  }
}

.user-calendar {
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

.album-item.selected {
  background: #e3f2fd;
  border-color: #2196f3;
  box-shadow: 0 2px 8px rgba(33, 150, 243, 0.2);
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

.album-user {
  font-size: 12px;
  color: #007bff;
  font-weight: 500;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .dashboard-container {
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
