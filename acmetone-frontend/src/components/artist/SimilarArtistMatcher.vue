<template>
  <div class="similar-artist-matcher">
    <div v-if="loading" class="loading-state">
      <el-skeleton :rows="3" animated />
    </div>
    
    <div v-else-if="error" class="error-state">
      <el-alert
        type="error"
        :title="error"
        show-icon
      />
    </div>
    
    <div v-else>

      <div v-if="strongMatches.length > 0" class="matches-container">
        <h3>匹配的艺人</h3>
        <div v-for="artist in strongMatches" :key="artist.id" class="artist-card">
          <div class="artist-info">
            <div class="avatar">
              <img v-if="artist.avatarUrl" :src="getAvatarUrl(artist.avatarUrl)" alt="艺人头像" />
              <el-avatar v-else :icon="User" />
            </div>
            <div class="artist-details">
              <h4>
                {{ artist.name }}
                <el-tag v-if="artist.exactNameMatch" type="success" size="small">艺名完全匹配</el-tag>
                <el-tag v-else type="warning" size="small">艺名部分匹配</el-tag>
                <el-tag v-if="artist.exactRealNameMatch" type="success" size="small">实名完全匹配</el-tag>
              </h4>
              <div class="platform-links">
                <a v-if="artist.netease" :href="artist.netease" target="_blank" class="platform-icon-link" title="网易云音乐">
                  <img src="/网易云.svg" alt="网易云音乐" />
                </a>
                <a v-if="artist.qq" :href="artist.qq" target="_blank" class="platform-icon-link" title="QQ音乐">
                  <img src="/QQ音乐.svg" alt="QQ音乐" />
                </a>
                <a v-if="artist.kugou" :href="artist.kugou" target="_blank" class="platform-icon-link" title="酷狗音乐">
                  <img src="/酷狗音乐.svg" alt="酷狗音乐" />
                </a>
                <a v-if="artist.kuwo" :href="artist.kuwo" target="_blank" class="platform-icon-link" title="酷我音乐">
                  <img src="/酷我音乐.svg" alt="酷我音乐" />
                </a>
                <a v-if="artist.qishui" :href="artist.qishui" target="_blank" class="platform-icon-link" title="汽水音乐">
                  <img src="/汽水音乐.svg" alt="汽水音乐" />
                </a>
                <a v-if="artist.spotify" :href="artist.spotify" target="_blank" class="platform-icon-link" title="Spotify">
                  <img src="/Spotify.svg" alt="Spotify" />
                </a>
                <a v-if="artist.youtube" :href="artist.youtube" target="_blank" class="platform-icon-link" title="YouTube">
                  <img src="/youtube.svg" alt="YouTube" />
                </a>
                <a v-if="artist.appleMusic" :href="artist.appleMusic" target="_blank" class="platform-icon-link" title="Apple Music">
                  <img src="/applemusic.svg" alt="Apple Music" />
                </a>
                <a v-if="artist.soundCloud" :href="artist.soundCloud" target="_blank" class="platform-icon-link" title="SoundCloud">
                  <img src="/soundcloud.svg" alt="SoundCloud" />
                </a>
                
                <!-- 显示平台链接数量 -->
                <span v-if="getPlatformCount(artist) > 5" class="platform-count">
                  +{{ getPlatformCount(artist) - 5 }}
                </span>
              </div>
            </div>
            <div class="artist-actions">
              <el-button type="primary" size="small" @click="selectArtist(artist)">选择</el-button>
            </div>
          </div>


        </div>
      </div>
      
      <div v-else class="no-matches">
        <el-alert
          type="warning"
          title="未找到匹配的艺人"
          description="请确保艺名和实名都输入正确。只有当艺名和实名同时匹配时才会显示结果。"
          show-icon
          :closable="false"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { User, Check, InfoFilled } from '@element-plus/icons-vue';
import axios from 'axios';
import { API_BASE_URL, STATIC_BASE_URL } from '@/config';

const props = defineProps({
  initialName: {
    type: String,
    default: ''
  },
  initialRealName: {
    type: String,
    default: ''
  }
});

const emit = defineEmits(['select', 'close']);

const name = ref(props.initialName || '');
const realName = ref(props.initialRealName || '');
const loading = ref(false);
const error = ref('');
const strongMatches = ref([]);
const allMatches = ref([]);

// 监听输入变化，自动搜索
watch([name, realName], debounce(searchArtists, 500), { deep: true });

// 监听props变化，更新内部变量
watch(() => props.initialName, (newVal) => {
  name.value = newVal || '';
}, { immediate: true });

watch(() => props.initialRealName, (newVal) => {
  realName.value = newVal || '';
}, { immediate: true });

// 防抖函数
function debounce(fn, delay) {
  let timer = null;
  return function(...args) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      fn.apply(this, args);
    }, delay);
  };
};

// 搜索艺人
async function searchArtists() {
  // 如果艺名或实名为空，不进行搜索
  if (!name.value || !realName.value) {
    strongMatches.value = [];
    allMatches.value = [];
    return;
  }
  
  loading.value = true;
  error.value = '';
  
  try {
    console.log('开始搜索艺人:', { name: name.value, realName: realName.value });
    const response = await axios.post(`${API_BASE_URL}/artist-wiki/search-potential-matches`, {
      name: name.value,
      realName: realName.value
    }, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    strongMatches.value = response.data.strongMatches || [];
    allMatches.value = response.data.allMatches || [];
    
    console.log('搜索结果:', {
      hasStrongMatch: response.data.hasStrongMatch,
      strongMatches: strongMatches.value.length,
      allMatches: allMatches.value.length
    });
  } catch (err) {
    console.error('搜索艺人失败:', err);
    error.value = '搜索艺人失败: ' + (err.response?.data?.message || err.message);
    strongMatches.value = [];
    allMatches.value = [];
  } finally {
    loading.value = false;
  }
}

// 选择艺人
function selectArtist(artist) {
  emit('select', artist);
}

// 获取匹配分数的标签类型
function getMatchScoreType(score) {
  if (score >= 4) return 'success';
  if (score >= 2) return 'warning';
  return 'info';
}

// 计算平台链接数量
const getPlatformCount = (artist) => {
  let count = 0;
  if (artist.netease) count++;
  if (artist.qq) count++;
  if (artist.kugou) count++;
  if (artist.kuwo) count++;
  if (artist.qishui) count++;
  if (artist.spotify) count++;
  if (artist.youtube) count++;
  if (artist.appleMusic) count++;
  if (artist.soundCloud) count++;
  return count;
};

// 处理艺人头像URL
const getAvatarUrl = (avatarUrl) => {
  if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) {
    return avatarUrl;
  }
  return `${STATIC_BASE_URL}/images/${avatarUrl}`;
};

// 初始加载
onMounted(() => {
  if (name.value && realName.value) {
    searchArtists();
  }
});
</script>

<style scoped>
.similar-artist-matcher {
  margin: 20px 0;
}

.loading-state, .error-state, .no-matches {
  margin: 20px 0;
}

.matches-container {
  margin-top: 20px;
}

.artist-card {
  border: 1px solid #ebeef5;
  border-radius: 4px;
  padding: 15px;
  margin-bottom: 15px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
  position: relative;
}

.artist-info {
  display: flex;
  align-items: center;
}

.avatar {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  overflow: hidden;
  margin-right: 15px;
  flex-shrink: 0;
}

.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.artist-details {
  flex-grow: 1;
}

.artist-details h4 {
  margin: 0 0 10px 0;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 5px;
}

.platform-links {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 5px;
}

.platform-icon-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background-color: #f5f7fa;
  margin-right: 5px;
}

.platform-icon-link img {
  width: 16px;
  height: 16px;
  object-fit: contain;
}

.platform-count {
  margin-left: 4px;
  font-size: 12px;
  color: #909399;
}

.artist-actions {
  margin-left: 15px;
}

.artist-description {
  margin-top: 10px;
  font-size: 14px;
  color: #606266;
  display: flex;
  align-items: flex-start;
}

.artist-description p {
  margin: 0;
  display: flex;
  align-items: center;
}

.artist-description .el-icon {
  margin-right: 5px;
  color: #909399;
}

.match-score {
  position: absolute;
  top: 15px;
  right: 15px;
}

.match-explanation {
  margin-bottom: 20px;
}
</style> 