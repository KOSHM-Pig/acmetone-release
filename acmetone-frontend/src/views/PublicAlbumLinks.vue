<template>
  <div class="music-page-wrapper">
    <!-- 最新发行区域 -->
    <section class="hero-release" v-if="latestRelease">
      <div class="background-title" aria-hidden="true">{{ latestRelease.albumName }}</div>
      <div class="container hero-container">
      <div class="hero-content">
          <div class="hero-info">
            <div class="release-tag">
              <span class="new-release-badge">NEW RELEASE</span>
              <span class="release-date">{{ formatDate(latestRelease.releaseDate) }}</span>
            </div>
            <h1 class="hero-album-title">{{ latestRelease.albumName }}</h1>
            <div class="hero-artist-name">
              <span>{{ latestRelease.artistName }}</span>
            </div>
            <button class="btn-story" @click="navigateToAlbum(latestRelease.slug)">READ THE STORY</button>
          </div>
          <div class="hero-cover-art" @click="navigateToAlbum(latestRelease.slug)">
            <img 
              :src="getImageUrl(getThumbnailUrl(latestRelease.coverImage))" 
              :alt="latestRelease.albumName">
          </div>
        </div>
      </div>
    </section>

    <!-- 所有发行区域 -->
    <section class="all-releases">
      <div class="container">
        <div class="section-header">
          <h2 class="section-title">CHECK ALL LATEST RELEASES</h2>
          <div class="filter-controls">
            <div class="year-filters">
              <button class="year-filter-btn" :class="{ active: selectedYear === 'all' }" @click="filterByYear('all')">All</button>
              <button v-for="year in availableYears" :key="year" class="year-filter-btn" :class="{ active: selectedYear === year }" @click="filterByYear(year)">{{ year }}</button>
            </div>
            <div class="filter-dropdown">
              <button class="filter-dropdown-btn">FILTER BY YEAR <span class="dropdown-arrow">▼</span></button>
        </div>
      </div>
    </div>

        <div class="releases-layout">
          <div class="timeline-container">
            <div class="timeline-year" v-if="currentVisibleYear">{{ currentVisibleYear }}</div>
          </div>
          <div class="grid-container">
            <div v-if="loading" class="loading-state"><el-skeleton :rows="6" animated /></div>
            
            <section v-for="group in releasesGroupedByYear"
                     :key="group.year"
                     class="year-section"
                     :data-year="group.year"
                     :ref="el => setYearSectionRef(el, group.year)">

              <div class="year-background">{{ group.year }}</div>

              <div v-if="group.releases.length > 0" class="releases-grid">
                <div v-for="link in group.releases" :key="link.id" class="release-item">
                  <div class="release-image" @click="navigateToAlbum(link.slug)">
                    <img 
                      :src="getImageUrl(getThumbnailUrl(link.coverImage))" 
                      :alt="link.albumName"
                      loading="lazy"
                    >
                  </div>
                  <div class="release-info">
                    <div class="release-tag-grid">
                      <span class="new-release-badge-grid">NEW RELEASE</span>
                      <span class="release-date-grid">{{ formatDate(link.releaseDate) }}</span>
                    </div>
                    <h3 class="release-title-grid">{{ link.albumName }}</h3>
                    <div class="release-artist-grid">{{ link.artistName }}</div>
                    <a class="more-info" @click="navigateToAlbum(link.slug)">More info →</a>
                  </div>
                </div>
              </div>
            </section>

            <div v-if="!loading && releasesGroupedByYear.length === 0" class="no-releases">
                <p>No releases found for the selected year.</p>
            </div>
            <div ref="loadMoreSentinel" class="load-more-sentinel"></div>
            <div v-if="isLoadingMore" class="loading-more"><el-skeleton :rows="2" animated /></div>
          </div>
          </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, watch, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import axios from 'axios';
import { API_BASE_URL, STATIC_BASE_URL } from '@/config';

const router = useRouter();
const loading = ref(true);
const error = ref(null);
const allLinks = ref([]);
const selectedYear = ref('all');
const availableYears = ref([]);

// --- New refs for scroll spying ---
const currentVisibleYear = ref(null);
const yearSectionRefs = ref({});
let observer = null;
const loadMoreSentinel = ref(null);
let sentinelObserver = null;
const page = ref(1);
const totalPages = ref(1);
const isLoadingMore = ref(false);

const latestRelease = computed(() => {
  if (!allLinks.value || allLinks.value.length === 0) return null;
  return allLinks.value[0];
});


const releasesGroupedByYear = computed(() => {
  if (loading.value) return [];
  const linksToDisplay = allLinks.value.filter(link => link.id !== latestRelease.value?.id);

  const groups = {};
  linksToDisplay.forEach(link => {
    const year = new Date(link.releaseDate).getFullYear();
    if (!groups[year]) {
      groups[year] = [];
    }
    groups[year].push(link);
  });
  
  const sortedGroups = Object.keys(groups)
    .sort((a, b) => b - a)
    .map(year => ({
      year: Number(year),
      releases: groups[year]
    }));
    
  if (selectedYear.value === 'all') {
      return sortedGroups;
  }
  
  return sortedGroups.filter(group => group.year === Number(selectedYear.value));
});

watch(releasesGroupedByYear, (newGroups) => {
    if(newGroups.length > 0 && selectedYear.value === 'all') {
        nextTick(() => {
            setupIntersectionObserver();
        });
    }
}, { deep: true, flush: 'post' });

const setupIntersectionObserver = () => {
    if (observer) observer.disconnect();

    const options = {
      root: null,
      rootMargin: '-30% 0px -70% 0px',
      threshold: 0,
    };

    observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          currentVisibleYear.value = entry.target.dataset.year;
        }
      });
    }, options);

    Object.values(yearSectionRefs.value).forEach(el => {
        if(el) observer.observe(el);
    });
};

const setYearSectionRef = (el, year) => {
    if (el) yearSectionRefs.value[year] = el;
};

onUnmounted(() => {
    if (observer) observer.disconnect();
});

const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
};

const getThumbnailUrl = (imagePath) => {
  if (!imagePath) return '';
  const parts = imagePath.split('/');
  const filename = parts.pop();
  const thumbFilename = `thumb_${filename}`;
  return `${parts.join('/')}/thumbnails/${thumbFilename}`;
};

const getImageUrl = (imagePath) => {
  if (!imagePath) return 'https://via.placeholder.com/400x400/1c1c1c/fff?text=No+Art';
  if (imagePath.startsWith('http')) return imagePath;
  return `${STATIC_BASE_URL}${imagePath.startsWith('/') ? '' : '/'}${imagePath}`;
};

const fetchAllLinks = async () => {
    loading.value = true;
  try {
    const response = await axios.get(`${API_BASE_URL}/album-links/public/list`, { params: { page: 1, pageSize: 60, includeSongs: false } });
    
    // 处理歌曲和歌手信息
    const processedLinks = (response.data.links || []).map(link => {
      // 处理歌曲歌手信息
      if (link.songs && link.songs.length > 0) {
        link.songs = link.songs.map(song => {
          // 如果有内部歌曲歌手信息，优先使用
          if (song.internalSong && song.internalSong.Artists && song.internalSong.Artists.length > 0) {
            const artistNames = song.internalSong.Artists.map(artist => artist.name);
            song.artistName = artistNames.join(' & ');
            
          } else if (song.internalArtistName) {
            song.artistName = song.internalArtistName;
          }
          return song;
        });
      }
      return link;
    });
    
    allLinks.value = processedLinks.sort((a, b) => new Date(b.releaseDate) - new Date(a.releaseDate));
    const years = new Set(allLinks.value.map(link => new Date(link.releaseDate).getFullYear()).filter(year => !isNaN(year)));
    availableYears.value = Array.from(years).sort((a, b) => b - a);
    if (availableYears.value.length > 0) {
        currentVisibleYear.value = availableYears.value[0];
    }
    page.value = response.data.page || 1;
    totalPages.value = response.data.totalPages || 1;
  } catch (err) {
    error.value = '加载专辑链接失败。';
    console.error(err);
  } finally {
    loading.value = false;
  }
};

const filterByYear = (year) => {
  selectedYear.value = year;
  currentVisibleYear.value = year === 'all' ? (availableYears.value[0] || null) : year;
  if(observer) observer.disconnect(); // Stop observing when not in 'all' mode
};

const loadMore = async () => {
  if (isLoadingMore.value) return;
  if (page.value >= totalPages.value) return;
  isLoadingMore.value = true;
  try {
    const nextPage = page.value + 1;
    const response = await axios.get(`${API_BASE_URL}/album-links/public/list`, { params: { page: nextPage, pageSize: 60, includeSongs: false } });
    const processedLinks = (response.data.links || []).map(link => {
      if (link.songs && link.songs.length > 0) {
        link.songs = link.songs.map(song => {
          if (song.internalSong && song.internalSong.Artists && song.internalSong.Artists.length > 0) {
            const artistNames = song.internalSong.Artists.map(artist => artist.name);
            song.artistName = artistNames.join(' & ');
          } else if (song.internalArtistName) {
            song.artistName = song.internalArtistName;
          }
          return song;
        });
      }
      return link;
    });
    allLinks.value = [...allLinks.value, ...processedLinks].sort((a, b) => new Date(b.releaseDate) - new Date(a.releaseDate));
    page.value = response.data.page || nextPage;
    totalPages.value = response.data.totalPages || totalPages.value;
    const years = new Set(allLinks.value.map(link => new Date(link.releaseDate).getFullYear()).filter(year => !isNaN(year)));
    availableYears.value = Array.from(years).sort((a, b) => b - a);
  } finally {
    isLoadingMore.value = false;
  }
};

const navigateToAlbum = (slug) => {
  if (!slug) return;
  router.push(`/album/${slug}`);
};

onMounted(fetchAllLinks);

onMounted(() => {
  sentinelObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        loadMore();
      }
    });
  }, { root: null, threshold: 0 });
  nextTick(() => {
    if (loadMoreSentinel.value) {
      sentinelObserver.observe(loadMoreSentinel.value);
    }
  });
});

onUnmounted(() => {
  if (sentinelObserver) sentinelObserver.disconnect();
});
</script>

<style scoped>
.music-page-wrapper {
  background-color: #fff;
  color: #000;
  font-family: 'Helvetica Neue', Arial, sans-serif;
}

.container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 40px;
}

/* Hero Section */
.hero-release {
  padding: 100px 0;
  position: relative;
  overflow: hidden;
  border-bottom: 1px solid #e5e5e5;
}

.background-title {
  position: absolute;
  top: 50%;
  left: 2%;
  transform: translateY(-50%);
  font-size: 25vw;
  font-weight: 900;
  color: #000;
  opacity: 0.04;
  line-height: 1;
  white-space: nowrap;
  user-select: none;
  z-index: 1;
  text-transform: uppercase;
}

.hero-container {
  position: relative;
  z-index: 2;
}

.hero-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 60px;
}

.hero-info {
  flex-basis: 55%;
}

.release-tag {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 25px;
}

.new-release-badge {
  background-color: #000;
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  padding: 5px 10px;
  text-transform: uppercase;
}

.release-date {
  font-size: 14px;
  color: #555;
}

.hero-album-title {
  font-size: 96px;
  font-weight: 900;
  line-height: 1;
  margin: 0 0 30px;
  text-transform: uppercase;
  letter-spacing: -2px;
}

.hero-artist-name {
  display: flex;
  align-items: center;
  margin-bottom: 40px;
  font-size: 18px;
  color: #333;
}

.hero-artist-name::before {
  content: "";
  display: inline-block;
  width: 25px;
  height: 1px;
  background-color: #000;
  margin-right: 15px;
}

.btn-story {
  background: none;
  border: 1px solid #000;
  padding: 12px 24px;
  font-size: 14px;
  font-weight: 600;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-story:hover {
  background-color: #000;
  color: #fff;
}

.hero-cover-art {
  flex-basis: 40%;
  max-width: 500px;
  cursor: pointer;
}

.hero-cover-art img {
  width: 100%;
  height: auto;
  display: block;
  box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.2);
}

/* All Releases Section */
.all-releases {
  padding: 80px 0;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 60px;
}

.section-title {
  font-size: 24px;
  font-weight: 700;
  text-transform: uppercase;
}

.filter-controls { display: flex; align-items: center; }
.year-filters { display: flex; gap: 25px; }
.year-filter-btn {
  background: none;
  border: none;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  color: #999;
  padding-bottom: 5px;
  border-bottom: 2px solid transparent;
  transition: all 0.3s ease;
}
.year-filter-btn.active, .year-filter-btn:hover {
  color: #000;
  border-bottom-color: #000;
}
.filter-dropdown { display: none; }

.releases-layout {
  display: flex;
  position: relative;
}

.timeline-container {
  flex: 0 0 50px;
  position: relative;
}

.timeline-year {
  position: sticky;
  top: 100px;
  left: 0;
  transform: rotate(-90deg) translateX(-100%);
  transform-origin: left top;
  font-size: 14px;
  font-weight: 600;
  color: #aaa;
  white-space: nowrap;
}

.grid-container {
  flex: 1;
  position: relative;
}

.year-section {
    position: relative;
    padding-top: 20px;
}

/* Add margin to all but the last section */
.year-section:not(:last-child) {
    margin-bottom: 80px; 
}

.year-background {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  font-size: 25vw;
  font-weight: 900;
  color: #000;
  opacity: 0.025;
  line-height: 0.8; 
  user-select: none;
  z-index: 1;
  text-transform: uppercase;
}

.loading-state { padding: 40px; }
.releases-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 70px 40px;
  position: relative;
  z-index: 2;
}

.release-item {
  display: flex;
  align-items: flex-start;
  gap: 25px;
  content-visibility: auto;
  contain-intrinsic-size: 400px 300px;
}

.release-image {
  flex: 0 0 160px;
  width: 160px;
  cursor: pointer;
}
.release-image img { width: 100%; height: auto; display: block; }

.release-info { display: flex; flex-direction: column; }
.release-tag-grid { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
.new-release-badge-grid {
  background-color: #000;
  color: #fff;
  font-size: 10px;
  padding: 4px 7px;
  font-weight: 600;
  text-transform: uppercase;
}
.release-date-grid { font-size: 12px; color: #555; }
.release-title-grid { font-size: 22px; font-weight: 700; text-transform: uppercase; margin: 0 0 8px; line-height: 1.2; }
.release-artist-grid {
  font-size: 14px;
  color: #555;
  margin: 0 0 15px;
  position: relative;
  padding-left: 25px;
}
.release-artist-grid::before {
  content: "";
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 15px;
  height: 1px;
  background-color: #000;
}
.more-info { font-size: 14px; font-weight: 500; color: #000; cursor: pointer; }

.no-releases { text-align: center; padding: 60px 0; color: #555; position: relative; z-index: 2;}

/* Responsive */
@media (max-width: 1200px) {
  .hero-album-title { font-size: 84px; }
  .releases-grid { grid-template-columns: 1fr; }
}

@media (max-width: 992px) {
  .hero-content { flex-direction: column; text-align: center; }
  .hero-artist-name { justify-content: center; }
  .hero-album-title { font-size: 10vw; }
}

@media (max-width: 768px) {
  .section-header { flex-direction: column; align-items: flex-start; gap: 20px; }
  .year-filters { display: none; }
  .filter-dropdown { display: block; } 
  .release-item { flex-direction: column; }
  .release-image { width: 100%; flex-basis: auto; }
  .timeline-container { display: none; } /* Hide timeline on mobile */
}
</style> 
.load-more-sentinel {
  width: 100%;
  height: 1px;
}

.loading-more {
  margin: 20px 0;
}
