<template>
  <div class="request-form-container">
    <div class="page-header">
      <div class="header-main">
      <router-link to="/services" class="back-link">
        <el-icon><ArrowLeft /></el-icon>
        <span>返回服务中心</span>
      </router-link>
        <h1 class="page-title">音乐推广申请</h1>
        <p class="subtitle">提交您的作品以获得量身定制的推广计划，让世界听到您的音乐</p>
      </div>
      <div class="header-actions">
        <router-link to="/user-center/promotion-requests">
          <acmetone-btn>
            <el-icon><Document /></el-icon>
            我的申请记录
          </acmetone-btn>
        </router-link>
      </div>
    </div>

    <!-- 水平分隔线 -->
    <div class="page-divider"></div>

    <el-form :model="form" :rules="rules" ref="formRef" @submit.prevent="submitForm" class="request-form">
      <el-card class="form-card">
        <template #header>
          <div class="card-header">
            <span>选择专辑</span>
          </div>
        </template>
        
        <div class="service-intro">
          <p><strong>注意：</strong>推广申请需要提前<strong>至少14天</strong>提交，请确保您的专辑发行日期距今至少14天。</p>
          <p>我们的团队将评估您的申请，并为您提供最适合的推广方案。</p>
        </div>

        <el-form-item label="选择您的专辑" prop="albumId" class="album-search-form-item">
          <AcmetoneSearchDropdown
            v-model="searchQuery"
            :results="albumOptions"
            :loading="loadingAlbums"
            placeholder="搜索您在本站上传的专辑"
            text-field="title"
            key-field="id"
            @search="searchAlbums"
            @select="selectAlbum"
            class="full-width album-search-dropdown"
            :auto-close="true"
            :close-delay="300"
            loading-text="正在加载专辑列表..."
            empty-text="没有找到匹配的专辑"
          >
            <template #item="{ item }">
              <div class="album-option">
                <img 
                  v-if="item.coverUrl" 
                  :src="item.coverUrl" 
                  class="album-thumbnail" 
                  alt="专辑封面"
                />
                <div class="item-info">
                  <div class="item-title">{{ item.title }}</div>
                  <div class="item-subtext">
                    <span class="release-date">发行日期: {{ formatDate(item.releaseDate) }}</span>
                    <span class="days-left" :class="getDaysLeftClass(item.releaseDate)">
                      {{ getDaysLeftText(item.releaseDate) }}
                    </span>
                  </div>
                </div>
              </div>
            </template>
            <template #action-icon>
              <el-icon><Check /></el-icon>
            </template>
          </AcmetoneSearchDropdown>
        </el-form-item>

        <div v-if="selectedAlbum" class="selected-album-info">
          <div class="album-preview">
            <img :src="selectedAlbum.coverUrl" alt="专辑封面" class="album-cover-preview" />
            <div class="album-details">
              <h3>{{ selectedAlbum.title }}</h3>
              <p>发行日期: {{ formatDate(selectedAlbum.releaseDate) }}</p>
              <p class="days-left" :class="getDaysLeftClass(selectedAlbum.releaseDate)">
                {{ getDaysLeftText(selectedAlbum.releaseDate) }}
              </p>
            </div>
          </div>
        </div>
      </el-card>

      <el-card class="form-card" v-if="isEligibleForPromotion">
        <template #header>
          <div class="card-header">
            <span>推广亮点</span>
          </div>
        </template>
        <el-form-item label="作品亮点" prop="highlights">
          <el-input
            v-model="form.highlights"
            type="textarea"
            :rows="4"
            placeholder="描述您的作品亮点，例如：特色合作、独特制作技术、背后故事等"
            maxlength="1000"
            show-word-limit
          />
        </el-form-item>
        
        <el-form-item label="已有宣传资源" prop="existingPromotion">
          <el-input
            v-model="form.existingPromotion"
            type="textarea"
            :rows="3"
            placeholder="描述您已有的宣传资源，例如：社交媒体账号、粉丝数量、过往媒体报道等"
            maxlength="500"
            show-word-limit
          />
        </el-form-item>
      </el-card>
      
      <div class="form-actions" v-if="isEligibleForPromotion">
        <acmetone-btn @click="resetForm" type="secondary">重置</acmetone-btn>
        <acmetone-btn @click="submitForm" :disabled="submitting || !isFormValid">
          {{ submitting ? '提交中...' : '提交申请' }}
        </acmetone-btn>
      </div>

      <div v-if="!isEligibleForPromotion && selectedAlbum" class="ineligible-notice">
        <el-alert
          title="您的专辑不符合推广申请条件"
          type="warning"
          :closable="false"
          show-icon
        >
          <p>推广申请需要提前至少14天提交，您选择的专辑发行日期距今不足14天。</p>
          <p>请选择发行日期距今至少14天的专辑。</p>
        </el-alert>
      </div>
    </el-form>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { ArrowLeft, Document, Check, Search } from '@element-plus/icons-vue';
import { useRouter, useRoute } from 'vue-router';
import AcmetoneSearchDropdown from '@/components/acmetone/AcmetoneSearchDropdown.vue';
import AcmetoneBtn from '@/components/acmetone/AcmetoneBtn.vue';
import promotionService from '@/services/promotionService';
import { normalizeUrl, ensureFullUrl } from '@/utils/urlHelper';

const router = useRouter();
const route = useRoute();
const formRef = ref(null);
const submitting = ref(false);
const loadingAlbums = ref(false);
const albumOptions = ref([]);
const searchQuery = ref('');
const selectedAlbum = ref(null);

const form = reactive({
  albumId: '',
  highlights: '',
  existingPromotion: ''
});

const rules = reactive({
  albumId: [{ required: true, message: '请选择您的专辑', trigger: 'change' }],
  highlights: [{ required: true, message: '请描述您的作品亮点', trigger: 'blur' }],
});

// 格式化日期
const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
};

// 计算距离发行日期的天数
const calculateDaysLeft = (releaseDate) => {
  if (!releaseDate) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const release = new Date(releaseDate);
  release.setHours(0, 0, 0, 0);
  const diffTime = release.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// 获取距离发行日期的文本
const getDaysLeftText = (releaseDate) => {
  const daysLeft = calculateDaysLeft(releaseDate);
  if (daysLeft < 0) return `已发行 ${Math.abs(daysLeft)} 天`;
  if (daysLeft === 0) return '今日发行';
  return `距发行还有 ${daysLeft} 天`;
};

// 获取距离发行日期的CSS类
const getDaysLeftClass = (releaseDate) => {
  const daysLeft = calculateDaysLeft(releaseDate);
  if (daysLeft < 14) return 'ineligible';
  return 'eligible';
};

// 判断是否符合推广申请条件（发行日期至少14天）
const isEligibleForPromotion = computed(() => {
  if (!selectedAlbum.value || !selectedAlbum.value.releaseDate) return false;
  return calculateDaysLeft(selectedAlbum.value.releaseDate) >= 14;
});

// 判断表单是否有效
const isFormValid = computed(() => {
  return form.albumId && form.highlights;
});

// 搜索专辑
const searchAlbums = async (query) => {
  loadingAlbums.value = true;
  try {
    // 获取用户的专辑列表
    const response = await promotionService.getUserAlbums();
    const albums = response.data;
    
    console.log('获取到的专辑数据:', albums);
    
    if (!albums || albums.length === 0) {
      console.log('未找到任何专辑');
      albumOptions.value = [];
      return;
    }
    
    // 处理专辑数据
    const processedAlbums = albums.map(album => {
      // 确保coverUrl字段存在，优先使用coverUrl，如果不存在则使用coverImage
      const coverImagePath = album.coverUrl || album.coverImage || '';
      const coverUrl = coverImagePath ? normalizeUrl(ensureFullUrl(coverImagePath)) : '';
      
      return {
        id: album.id,
        title: album.title,
        coverUrl: coverUrl,
        releaseDate: album.releaseDate
      };
    });
    
    console.log('处理后的专辑数据:', processedAlbums);
    
    // 如果有查询关键词，则过滤；否则返回所有专辑
    if (query && query.trim() !== '') {
      albumOptions.value = processedAlbums.filter(album => 
        album.title.toLowerCase().includes(query.toLowerCase())
      );
  } else {
      albumOptions.value = processedAlbums;
    }
    
    console.log('过滤后的专辑选项:', albumOptions.value);
  } catch (error) {
    console.error('获取专辑列表失败:', error);
    ElMessage.error('获取专辑列表失败');
  } finally {
    loadingAlbums.value = false;
  }
};

// 选择专辑
const selectAlbum = (album) => {
  selectedAlbum.value = album;
  form.albumId = album.id;
  searchQuery.value = album.title;
};

// 重置表单
const resetForm = () => {
  formRef.value.resetFields();
  selectedAlbum.value = null;
  searchQuery.value = '';
};

// 提交表单
const submitForm = () => {
  if (!isEligibleForPromotion.value) {
    ElMessage.warning('您选择的专辑不符合推广申请条件');
    return;
  }
  
  formRef.value.validate(async (valid) => {
    if (valid) {
      submitting.value = true;
      
      // 构建提交数据
      const submitData = {
        albumId: form.albumId,
        highlights: form.highlights,
        existingPromotion: form.existingPromotion
      };
      
      try {
        await promotionService.createPromotionRequest(submitData);
        ElMessage.success('您的推广申请已成功提交！');
        router.push('/user-center/promotion-requests');
      } catch (error) {
        console.error('提交申请失败:', error);
        const errorMsg = error.response?.data?.message || '提交申请失败，请稍后重试';
        ElMessage.error(errorMsg);
      } finally {
        submitting.value = false;
      }
    } else {
      ElMessage.error('请填写所有必填项');
      return false;
    }
  });
};

// 加载初始数据
onMounted(async () => {
  // 检查URL参数中是否有专辑ID
  const albumId = route.query.albumId;
  if (albumId) {
    try {
      loadingAlbums.value = true;
      const response = await promotionService.getUserAlbums();
      const albums = response.data;
      
      console.log('初始化时获取的专辑数据:', albums);
      
      // 查找指定的专辑
      const album = albums.find(a => a.id === parseInt(albumId));
      if (album) {
        // 确保coverUrl字段存在，优先使用coverUrl，如果不存在则使用coverImage
        const coverImagePath = album.coverUrl || album.coverImage || '';
        const coverUrl = coverImagePath ? normalizeUrl(ensureFullUrl(coverImagePath)) : '';
        
        const processedAlbum = {
          id: album.id,
          title: album.title,
          coverUrl: coverUrl,
          releaseDate: album.releaseDate
        };
        
        selectedAlbum.value = processedAlbum;
        form.albumId = processedAlbum.id;
        searchQuery.value = processedAlbum.title;
        
        console.log('已选择专辑:', processedAlbum);
      }
    } catch (error) {
      console.error('获取专辑信息失败:', error);
    } finally {
      loadingAlbums.value = false;
    }
  } else {
    // 没有指定专辑ID时，预加载所有专辑
    searchAlbums('');
  }
});
</script>

<style scoped>
.request-form-container {
  max-width: 900px;
  margin: 0 auto;
  padding: 60px 20px;
  background-color: #fff;
  min-height: 100vh;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}

.header-main {
  flex: 1;
}

.back-link {
  display: flex;
  align-items: center;
  text-decoration: none;
  color: #6c757d;
  font-weight: 500;
  margin-bottom: 20px;
}

.back-link:hover {
  color: #1a1a1a;
}

.back-link .el-icon {
  margin-right: 8px;
}

.page-title {
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 10px;
}

.subtitle {
  font-size: 1.1rem;
  color: #6c757d;
  max-width: 500px;
  line-height: 1.6;
}

.page-divider {
  height: 1px;
  background-color: #e9ecef;
  margin: 30px 0;
}

.service-intro {
  margin-bottom: 25px;
  padding: 15px;
  background-color: #f8f9fa;
  border-left: 4px solid #6c757d;
}

.service-intro p {
  margin: 8px 0;
}

.album-search-form-item {
  margin-bottom: 20px;
}

.album-search-dropdown {
  width: 100%;
}

.album-option {
  display: flex;
  align-items: center;
  gap: 12px;
}

.album-thumbnail {
  width: 60px;
  height: 60px;
  object-fit: cover;
}

.item-info {
  flex: 1;
}

.item-title {
  font-weight: 600;
  margin-bottom: 5px;
}

.item-subtext {
  display: flex;
  flex-direction: column;
  font-size: 0.9rem;
  color: #6c757d;
}

.days-left {
  font-weight: 500;
}

.days-left.eligible {
  color: #4CAF50;
}

.days-left.ineligible {
  color: #E53935;
}

.selected-album-info {
  margin-top: 20px;
  padding: 20px;
  background-color: #f8f9fa;
  border: 1px solid #e9ecef;
}

.album-preview {
  display: flex;
  align-items: center;
  gap: 20px;
}

.album-cover-preview {
  width: 100px;
  height: 100px;
  object-fit: cover;
}

.album-details h3 {
  margin-top: 0;
  margin-bottom: 10px;
}

.album-details p {
  margin: 5px 0;
}

.form-card {
  margin-bottom: 30px;
  border: 1px solid #e9ecef;
  border-radius: 0;
  box-shadow: none;
}

.card-header span {
  font-weight: 600;
  font-size: 1.1rem;
}

.goal-radio-group {
  width: 100%;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 15px;
  margin-top: 40px;
}

.ineligible-notice {
  margin-top: 30px;
}

/* 响应式布局 */
@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
}

  .header-actions {
    margin-top: 20px;
  }
  
  .header-actions a {
    width: 100%;
}

  .header-actions button {
    width: 100%;
  }
  
  .page-title {
    font-size: 2rem;
}

  .album-preview {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .album-cover-preview {
    margin-bottom: 15px;
  }
  
  .form-actions {
    flex-direction: column;
  }
  
  .form-actions button {
    width: 100%;
    margin-bottom: 10px;
  }
}
</style> 