<template>
  <div class="link-checker-container">
    <el-card class="page-header-card">
      <div class="page-header">
        <div class="header-left">
          <h2 class="page-title">链接格式检查</h2>
          <p class="page-subtitle">检查并修复歌手平台链接格式问题</p>
        </div>
        <div class="header-right">
          <el-button type="primary" @click="goBack" plain>
            返回歌手信息库
          </el-button>
        </div>
      </div>
    </el-card>

    <div class="action-buttons">
      <el-button type="primary" @click="checkAllArtists" :loading="checking" :disabled="checking">
        开始检查所有歌手链接
      </el-button>
      <el-button type="warning" @click="clearResults" :disabled="checking || invalidLinks.length === 0">
        清除检查结果
      </el-button>
      <el-button 
        type="danger" 
        @click="resetAllLinks" 
        :disabled="checking || invalidLinks.length === 0"
        :loading="resettingAll"
      >
        一键重置所有问题链接
      </el-button>
    </div>

    <div v-if="checking" class="checking-progress">
      <el-progress :percentage="checkProgress" :format="progressFormat" />
      <p>正在检查中，请稍候...</p>
    </div>

    <div v-if="invalidLinks.length > 0" class="results-container">
      <h3>检查结果：发现 {{ invalidLinks.length }} 个问题链接</h3>
      
      <el-table :data="invalidLinks" stripe style="width: 100%">
        <el-table-column prop="artistName" label="歌手名称" min-width="120" />
        <el-table-column prop="platform" label="平台" min-width="120">
          <template #default="{ row }">
            <div class="platform-item">
              <img :src="`/${getPlatformIcon(row.platform)}`" :alt="row.platform" class="platform-icon" />
              {{ getPlatformLabel(row.platform) }}
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="url" label="当前链接" min-width="250" show-overflow-tooltip />
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="editLink(row)">
              <el-icon><Edit /></el-icon> 编辑
            </el-button>
            <el-button type="danger" size="small" @click="resetLink(row)">
              <el-icon><Delete /></el-icon> 重置
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <div v-else-if="hasChecked && !checking" class="empty-result">
      <el-empty description="未发现问题链接，所有链接格式正确！" />
    </div>

    <!-- 编辑链接对话框 -->
    <el-dialog
      v-model="editDialogVisible"
      title="编辑平台链接"
      width="50%"
    >
      <el-form
        ref="editFormRef"
        :model="editForm"
        :rules="editRules"
        label-width="120px"
      >
        <el-form-item label="歌手">
          <el-input v-model="editForm.artistName" disabled />
        </el-form-item>
        
        <el-form-item label="平台">
          <div class="platform-item">
            <img :src="`/${getPlatformIcon(editForm.platform)}`" :alt="editForm.platform" class="platform-icon" />
            {{ getPlatformLabel(editForm.platform) }}
          </div>
        </el-form-item>

        <el-form-item :label="getPlatformLabel(editForm.platform)" prop="url">
          <div class="input-with-icon">
            <img :src="`/${getPlatformIcon(editForm.platform)}`" :alt="editForm.platform" class="input-icon" />
            <el-input v-model="editForm.url" :placeholder="getPlaceholder(editForm.platform)" />
          </div>
        </el-form-item>
      </el-form>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="editDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleSubmitEdit" :loading="updating">
            保存
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import axios from 'axios';
import { API_BASE_URL } from '@/config';
import { Edit, Delete } from '@element-plus/icons-vue';

const router = useRouter();

// 响应式数据
const artists = ref([]);
const invalidLinks = ref([]);
const checking = ref(false);
const checkProgress = ref(0);
const hasChecked = ref(false);
const editDialogVisible = ref(false);
const updating = ref(false);
const editFormRef = ref(null);
const resettingAll = ref(false);

// 编辑表单
const editForm = ref({
  artistId: null,
  artistName: '',
  platform: '',
  url: ''
});

// 平台链接验证规则
const validateUrl = (url, platform) => {
  if (!url) return true; // 允许为空
  
  const patterns = {
    netease: /^https?:\/\/(music\.163\.com\/#\/artist\?id=|music\.163\.com\/artist\?id=)[0-9]+/i,
    qq: /^https?:\/\/y\.qq\.com\/(n\/ryqq\/singer\/|singer\/)[a-zA-Z0-9]+/i,
    kugou: /^https?:\/\/(www\.)?kugou\.com\/singer\/[a-zA-Z0-9]+/i,
    kuwo: /^https?:\/\/(www\.)?kuwo\.cn\/singer_detail\/[a-zA-Z0-9]+/i,
    qishui: /^https?:\/\/qishui\.douyin\.com\/s\/[a-zA-Z0-9]+/i,
    spotify: /^https?:\/\/open\.spotify\.com\/artist\/[a-zA-Z0-9]+/i,
    youtube: /^https?:\/\/(music\.youtube\.com\/channel\/|www\.youtube\.com\/channel\/)[a-zA-Z0-9_-]+/i,
    appleMusic: /^https?:\/\/music\.apple\.com\/[a-z]{2}\/artist\/[a-zA-Z0-9]+/i,
    soundCloud: /^https?:\/\/(www\.)?soundcloud\.com\/[a-zA-Z0-9_-]+/i
  };
  
  return patterns[platform] ? patterns[platform].test(url) : true;
};

// 表单验证规则
const editRules = {
  url: [{ 
    validator: (rule, value, callback) => {
      if (!validateUrl(value, editForm.value.platform)) {
        callback(new Error(`请输入正确的${getPlatformLabel(editForm.value.platform)}链接格式`));
      } else {
        callback();
      }
    }, 
    trigger: 'blur' 
  }]
};

// 平台名称标签
const getPlatformLabel = (platform) => {
  const labels = {
    netease: '网易云音乐',
    qq: 'QQ音乐',
    kugou: '酷狗音乐',
    kuwo: '酷我音乐',
    qishui: '汽水音乐',
    spotify: 'Spotify',
    youtube: 'YouTube',
    appleMusic: 'Apple Music',
    soundCloud: 'SoundCloud'
  };
  return labels[platform] || platform;
};

// 平台图标
const getPlatformIcon = (platform) => {
  const icons = {
    netease: '网易云.svg',
    qq: 'QQ音乐.svg',
    kugou: '酷狗音乐.svg',
    kuwo: '酷我音乐.svg',
    qishui: '汽水音乐.svg',
    spotify: 'Spotify.svg',
    youtube: 'youtube.svg',
    appleMusic: 'applemusic.svg',
    soundCloud: 'soundcloud.svg'
  };
  return icons[platform] || '';
};

// 平台链接占位符
const getPlaceholder = (platform) => {
  const placeholders = {
    netease: 'https://music.163.com/#/artist?id=xxxxx',
    qq: 'https://y.qq.com/n/ryqq/singer/xxxxx',
    kugou: 'https://www.kugou.com/singer/xxxxx',
    kuwo: 'https://kuwo.cn/singer_detail/xxxxx',
    qishui: 'https://qishui.douyin.com/s/xxxxx',
    spotify: 'https://open.spotify.com/artist/xxxxx',
    youtube: 'https://music.youtube.com/channel/xxxxx',
    appleMusic: 'https://music.apple.com/cn/artist/xxxxx',
    soundCloud: 'https://soundcloud.com/xxxxx'
  };
  return placeholders[platform] || '';
};

// 进度格式化
const progressFormat = (percentage) => {
  return `${percentage}%`;
};

// 加载所有歌手数据
const fetchArtists = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/artist-edit-requests/artists`);
    artists.value = response.data;
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '获取歌手列表失败');
  }
};

// 检查所有歌手链接
const checkAllArtists = async () => {
  if (artists.value.length === 0) {
    await fetchArtists();
  }
  
  checking.value = true;
  invalidLinks.value = [];
  checkProgress.value = 0;
  
  const totalArtists = artists.value.length;
  let processedCount = 0;
  
  for (const artist of artists.value) {
    const platforms = artist.platforms || {};
    
    // 检查各平台链接
    Object.entries(platforms).forEach(([platform, url]) => {
      if (url && !validateUrl(url, platform)) {
        invalidLinks.value.push({
          artistId: artist.id,
          artistName: artist.name,
          platform,
          url
        });
      }
    });
    
    processedCount++;
    checkProgress.value = Math.floor((processedCount / totalArtists) * 100);
    
    // 每处理10个歌手暂停一下，避免UI阻塞
    if (processedCount % 10 === 0) {
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }
  
  checking.value = false;
  hasChecked.value = true;
  
  if (invalidLinks.value.length > 0) {
    ElMessage.warning(`检查完成，发现 ${invalidLinks.value.length} 个问题链接需要修复`);
  } else {
    ElMessage.success('检查完成，所有链接格式正确！');
  }
};

// 编辑链接
const editLink = (row) => {
  editForm.value = {
    artistId: row.artistId,
    artistName: row.artistName,
    platform: row.platform,
    url: row.url
  };
  editDialogVisible.value = true;
};

// 提交编辑
const handleSubmitEdit = async () => {
  if (!editFormRef.value) return;
  
  await editFormRef.value.validate(async (valid) => {
    if (valid) {
      try {
        updating.value = true;
        
        // 查找原始艺人数据
        const artist = artists.value.find(a => a.id === editForm.value.artistId);
        if (!artist) {
          ElMessage.error('未找到歌手数据');
          return;
        }
        
        // 准备更新的平台数据
        const platforms = { ...artist.platforms };
        platforms[editForm.value.platform] = editForm.value.url;
        
        // 调用API更新
        await axios.put(`${API_BASE_URL}/artist-edit-requests/artists/${editForm.value.artistId}`, {
          name: artist.name,
          realName: artist.realName,
          platforms
        });
        
        // 更新本地artists数组中对应歌手的数据
        const artistIndex = artists.value.findIndex(a => a.id === editForm.value.artistId);
        if (artistIndex !== -1) {
          artists.value[artistIndex].platforms[editForm.value.platform] = editForm.value.url;
        }
        
        // 更新本地数据
        const index = invalidLinks.value.findIndex(
          item => item.artistId === editForm.value.artistId && item.platform === editForm.value.platform
        );
        
        if (index !== -1) {
          // 如果新链接格式正确，从列表中移除
          if (validateUrl(editForm.value.url, editForm.value.platform)) {
            invalidLinks.value.splice(index, 1);
          } else {
            // 否则更新链接
            invalidLinks.value[index].url = editForm.value.url;
          }
        }
        
        ElMessage.success('链接更新成功');
        editDialogVisible.value = false;
      } catch (error) {
        ElMessage.error(error.response?.data?.message || '更新链接失败');
      } finally {
        updating.value = false;
      }
    }
  });
};

// 重置链接
const resetLink = async (row) => {
  try {
    await ElMessageBox.confirm(
      `确定要重置 ${row.artistName} 的 ${getPlatformLabel(row.platform)} 链接吗？`,
      '确认重置',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );
    
    // 查找原始艺人数据
    const artist = artists.value.find(a => a.id === row.artistId);
    if (!artist) {
      ElMessage.error('未找到歌手数据');
      return;
    }
    
    // 准备更新的平台数据
    const platforms = { ...artist.platforms };
    platforms[row.platform] = ''; // 设置为空字符串
    
    // 调用API更新
    await axios.put(`${API_BASE_URL}/artist-edit-requests/artists/${row.artistId}`, {
      name: artist.name,
      realName: artist.realName,
      platforms
    });
    
    // 从列表中移除
    const index = invalidLinks.value.findIndex(
      item => item.artistId === row.artistId && item.platform === row.platform
    );
    
    if (index !== -1) {
      invalidLinks.value.splice(index, 1);
    }
    
    // 更新本地的artists数组中对应歌手的数据
    const artistIndex = artists.value.findIndex(a => a.id === row.artistId);
    if (artistIndex !== -1) {
      artists.value[artistIndex].platforms[row.platform] = '';
    }
    
    ElMessage.success(`已重置 ${row.artistName} 的 ${getPlatformLabel(row.platform)} 链接`);
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error.response?.data?.message || '重置链接失败');
    }
  }
};

// 清除检查结果
const clearResults = () => {
  invalidLinks.value = [];
  hasChecked.value = false;
};

// 返回歌手信息库
const goBack = () => {
  router.push('/artist-wiki');
};

// 重置所有问题链接
const resetAllLinks = async () => {
  try {
    await ElMessageBox.confirm(
      `确定要重置所有 ${invalidLinks.value.length} 个问题链接吗？`,
      '确认批量重置',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );
    
    resettingAll.value = true;
    const totalLinks = invalidLinks.value.length;
    let successCount = 0;
    let failCount = 0;
    
    // 克隆一份链接数组，因为在处理过程中会修改原数组
    const linksToReset = [...invalidLinks.value];
    
    for (const link of linksToReset) {
      try {
        // 查找原始艺人数据
        const artist = artists.value.find(a => a.id === link.artistId);
        if (!artist) continue;
        
        // 准备更新的平台数据
        const platforms = { ...artist.platforms };
        platforms[link.platform] = ''; // 设置为空字符串
        
        // 调用API更新
        await axios.put(`${API_BASE_URL}/artist-edit-requests/artists/${link.artistId}`, {
          name: artist.name,
          realName: artist.realName,
          platforms
        });
        
        // 更新本地的artists数组中对应歌手的数据
        const artistIndex = artists.value.findIndex(a => a.id === link.artistId);
        if (artistIndex !== -1) {
          artists.value[artistIndex].platforms[link.platform] = '';
        }
        
        successCount++;
      } catch (error) {
        console.error(`重置链接失败: ${link.artistName} - ${link.platform}`, error);
        failCount++;
      }
      
      // 避免API请求过快，添加短暂延迟
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // 清空问题链接列表
    invalidLinks.value = [];
    
    if (failCount > 0) {
      ElMessage.warning(`操作完成：成功重置 ${successCount} 个链接，失败 ${failCount} 个`);
    } else {
      ElMessage.success(`已成功重置所有 ${successCount} 个问题链接`);
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('批量重置链接失败');
    }
  } finally {
    resettingAll.value = false;
  }
};

// 生命周期钩子
onMounted(async () => {
  await fetchArtists();
});
</script>

<style scoped>
.link-checker-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.page-header-card {
  margin-bottom: 24px;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 5px 0;
}

.header-left {
  display: flex;
  flex-direction: column;
}

.page-title {
  margin: 0;
  font-size: 24px;
  color: #303133;
}

.page-subtitle {
  margin: 5px 0 0;
  font-size: 14px;
  color: #909399;
}

.action-buttons {
  margin-bottom: 24px;
  display: flex;
  gap: 16px;
}

.checking-progress {
  margin: 30px 0;
  text-align: center;
}

.results-container {
  margin-top: 30px;
}

.results-container h3 {
  margin-bottom: 16px;
  color: #303133;
}

.empty-result {
  margin-top: 50px;
  text-align: center;
}

.platform-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.platform-icon {
  width: 20px;
  height: 20px;
}

.input-with-icon {
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  width: 20px;
  height: 20px;
  z-index: 1;
}

.input-with-icon :deep(.el-input__inner) {
  padding-left: 40px;
}
</style> 