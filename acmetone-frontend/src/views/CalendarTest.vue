<template>
  <div class="calendar-test">
    <div class="test-layout">
      <!-- 左侧：日历 -->
      <div class="calendar-section">
        <AlbumCalendar
          :albums="albums"
          :selectedDate="selectedDate"
          @date-selected="onDateSelected"
          @album-selected="onAlbumSelected"
          @month-changed="onMonthChanged"
          :cellSize="80"
          :cellGap="4"
        />
      </div>

      <!-- 右侧：专辑详情列表 -->
      <div class="detail-section">
        <CalendarAlbumDetail
          :selectedDate="selectedDate"
          :selectedAlbum="selectedAlbum"
          :albums="selectedDateAlbums"
          @album-selected="onAlbumSelected"
          @date-changed="onDateSelected"
          @view-album-detail="onViewAlbumDetail"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import AlbumCalendar from '@/components/AlbumCalendar.vue'
import CalendarAlbumDetail from '@/components/CalendarAlbumDetail.vue'

// 响应式数据
const selectedDate = ref(new Date())
const selectedAlbum = ref(null)

// 模拟专辑数据
const albums = ref([
  {
    id: 1,
    name: "Midnights",
    artists: [{ name: "Taylor Swift" }],
    label: "Republic Records",
    cover: "https://i.scdn.co/image/ab67616d0000b273bb54dde68cd23e2a268ae0f5",
    releaseDate: "2025-08-07"
  },
  {
    id: 2,
    name: "Harry's House",
    artists: [{ name: "Harry Styles" }],
    label: "Columbia Records",
    cover: "https://i.scdn.co/image/ab67616d0000b2732e8ed79e177ff6011076f5f0",
    releaseDate: "2025-08-07"
  },
  {
    id: 3,
    name: "Un Verano Sin Ti",
    artists: [{ name: "Bad Bunny" }],
    label: "Rimas Entertainment",
    cover: "https://i.scdn.co/image/ab67616d0000b273c4fee55d7b51479f9c0f28c4",
    releaseDate: "2025-08-08"
  },
  {
    id: 4,
    name: "Renaissance",
    artists: [{ name: "Beyoncé" }],
    label: "Parkwood Entertainment",
    cover: "https://i.scdn.co/image/ab67616d0000b2730e58a0f8308c1ad403d105e7",
    releaseDate: "2025-08-10"
  },
  {
    id: 5,
    name: "As It Was",
    artists: [{ name: "Harry Styles" }],
    label: "Columbia Records",
    cover: "https://i.scdn.co/image/ab67616d0000b273c4fee55d7b51479f9c0f28c4",
    releaseDate: "2025-08-15"
  }
])

// 计算选中日期的专辑
const selectedDateAlbums = computed(() => {
  if (!selectedDate.value) return []
  
  const dateStr = selectedDate.value.toISOString().split('T')[0]
  return albums.value.filter(album => album.releaseDate === dateStr)
})

// 事件处理
const onDateSelected = (date) => {
  selectedDate.value = date
  selectedAlbum.value = null
}

const onAlbumSelected = (album) => {
  selectedAlbum.value = album
}

const onMonthChanged = (date) => {
  console.log('月份变更:', date)
}

const onViewAlbumDetail = (album) => {
  console.log('查看专辑详情:', album)
  // 这里可以跳转到专辑详情页面
}

onMounted(() => {
  // 默认选中今天
  selectedDate.value = new Date()
})
</script>

<style scoped>
.calendar-test {
  height: 100vh;
  background: var(--color-gray-50);
}

.test-layout {
  display: flex;
  height: 100%;
}

.calendar-section {
  flex: 1;
  padding: 24px;
  background: var(--color-white);
  border-right: 1px solid var(--color-gray-200);
}

.detail-section {
  width: 400px;
  background: var(--color-white);
}

/* 响应式设计 */
@media (max-width: 1024px) {
  .test-layout {
    flex-direction: column;
  }
  
  .calendar-section {
    border-right: none;
    border-bottom: 1px solid var(--color-gray-200);
  }
  
  .detail-section {
    width: 100%;
    height: 50vh;
  }
}
</style>
