<template>
  <div class="new-album-container">
    <div class="main-content">
      <!-- 标题区域 -->
      <div class="page-header">
        <h1 class="page-title">创建专辑</h1>
        <p class="subtitle">填写专辑信息，一步完成音乐作品发行</p>
      </div>

      <!-- 主体表单区域 -->
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-position="top"
        @submit.prevent="handleSubmit"
        class="garrix-form"
      >
        <div class="form-grid">
          <!-- 左侧 - 封面上传和预览 -->
          <div class="left-column">
            <div class="form-section">
              <h3 class="section-title">专辑封面</h3>
              <div class="section-content">
                <!-- Standalone Cover Uploader -->
                <div class="cover-uploader-standalone" @click="triggerCoverValidation">
                   <el-upload
                      class="cover-uploader"
                      action="#"
                      :auto-upload="false"
                      :show-file-list="false"
                      :on-change="handleCoverChange"
                      accept="image/jpeg"
                    >
                      <img v-if="imageUrl" :src="imageUrl" class="cover-preview" />
                      <div v-else class="cover-placeholder">
                        <el-icon class="uploader-icon"><Plus /></el-icon>
                        <span class="uploader-text">上传封面 (3000x3000)</span>
                      </div>
                    </el-upload>
                </div>

                <button type="button" @click="openAiDialog" class="garrix-btn-secondary ai-creator-btn">
                  <el-icon><MagicStick /></el-icon>
                  AI 封面创作
                </button>

                <!-- Hidden form item for validation -->
                <el-form-item prop="coverImage" class="cover-form-item-hidden">
                   <el-input v-model="form.coverImage" />
                </el-form-item>

                <div class="guidelines">
                  <h4 class="guideline-title">封面要求</h4>
                  <ul>
                    <li>JPG格式, 3000×3000像素</li>
                    <li>无条码、二维码、价格</li>
                    <li>无品牌标志或广告</li>
                    <li>无社交媒体账户或日期</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <!-- 右侧 - 表单字段 -->
          <div class="right-column">
            <div class="form-section">
              <h3 class="section-title">基本信息</h3>
              <div class="section-content">
                <el-form-item label="专辑名称" prop="title">
                  <el-input 
                    v-model="form.title" 
                    placeholder="输入专辑名称" 
                    class="garrix-input"
                  />
                </el-form-item>
                
                <div class="form-row">
                  <el-form-item label="专辑类型" prop="type">
                    <div class="type-selector">
                      <button type="button" class="garrix-btn-toggle" :class="{ 'active': form.type === '专辑' }" @click="form.type = '专辑'">专辑</button>
                      <button type="button" class="garrix-btn-toggle" :class="{ 'active': form.type === '单曲' }" @click="form.type = '单曲'">单曲</button>
                    </div>
                  </el-form-item>
                  <el-form-item label="发行日期" prop="releaseDate">
                    <el-date-picker
                      v-model="form.releaseDate"
                      type="date"
                      placeholder="选择日期"
                      :disabled-date="disabledDate"
                      value-format="YYYY-MM-DD"
                      format="YYYY-MM-DD"
                      class="garrix-date-picker"
                    />
                  </el-form-item>
                </div>

                <transition name="fade">
                  <div class="release-info-card" v-if="form.releaseDate">
                    <div class="release-header">
                      <div class="release-icon">
                        <el-icon><Timer /></el-icon>
                      </div>
                      <div class="release-main-info">
                        <div class="date">{{ getFormattedDate(form.releaseDate) }}</div>
                        <div class="note">作品将于发行当日0点自动上线</div>
                      </div>
                    </div>
                    <div class="release-rules">
                      <div class="rule-item" :class="{ 'warning': isDateTooClose }">
                        <el-icon v-if="isDateTooClose"><Warning /></el-icon>
                        <el-icon v-else><InfoFilled /></el-icon>
                        <span>
                          <template v-if="isDateTooClose">
                            <strong>发行风险提示：</strong>选择日期距今不足3天，存在发行延误风险
                          </template>
                          <template v-else>
                            常规发行建议提前4-5天
                          </template>
                        </span>
                      </div>
                    </div>
                  </div>
                </transition>
              </div>
            </div>

            <div class="form-section">
              <h3 class="section-title">详细信息</h3>
              <div class="section-content">
                <el-form-item label="发行外显" prop="displayInfo">
                  <el-input 
                    v-model="form.displayInfo" 
                    placeholder="例如：ASPIRE SOUND × 极音记" 
                    class="garrix-input"
                  />
                </el-form-item>

                <el-form-item label="专辑表演者" prop="performers">
                  <div class="acm-performers-container">
                    <div class="acm-search-box-container">
                      <acmetone-search-dropdown
                        v-model="artistSearchKeyword"
                        placeholder="搜索并添加歌手Wiki..."
                        :results="searchResults"
                        :loading="searchingArtists"
                        :text-field="'name'"
                        :subtext-field="'realName'"
                        :key-field="'id'"
                        loading-text="搜索中..."
                        empty-text="没有找到匹配的歌手"
                        @search="handleGlobalArtistSearch"
                        @blur="handleSearchBlur"
                        @select="addArtistDirectly"
                      >
                        <template #item="{ item }">
                              <div class="artist-info">
                            <div class="artist-name">{{ item.name }}</div>
                            <div v-if="item.realName" class="artist-realname">{{ item.realName }}</div>
                              </div>
                        </template>
                        <template #action-icon>
                          <el-icon><Plus /></el-icon>
                        </template>
                      </acmetone-search-dropdown>
                    </div>
                    
                    <div class="performers-cards">
                      <draggable 
                        v-model="form.performers"
                        item-key="id"
                        handle=".acm-drag-handle"
                        class="acm-performers-card-list"
                      >
                        <template #item="{ element, index }">
                          <div class="acm-performer-card">
                            <div class="acm-pf-number">{{ index + 1 }}</div>
                            <span class="acm-drag-handle">::</span>
                            <span class="acm-performer-name">{{ element.name }}</span>
                            <span
                              class="acm-remove-performer-icon"
                              @click="handleRemovePerformer(index)"
                            >&times;</span>
                          </div>
                        </template>
                      </draggable>
                    </div>
                  </div>
                </el-form-item>

                <el-form-item label="专辑简介" prop="description" style="min-height: 550px;"> 
                  <div style="position: relative;">
                    <button 
                        type="button" 
                        @click="generateDescription" 
                        :disabled="isGeneratingDescription || !form.title" 
                        class="description-ai-btn"
                      >
                      <el-icon><MagicStick /></el-icon>
                        <span>AI 帮写</span>
                        <span v-if="isGeneratingDescription" class="loading-dots">...</span>
                      </button>
                    </div>
                  
                  <div class="description-container" style="width: 100%; min-height: 500px; ">
                    
                    <div class="description-header">
                      
                    </div>
                    <el-input
                      v-model="form.description"
                      type="textarea"
                      :rows="20"
                      placeholder="介绍您的专辑..."
                      class="garrix-textarea"
                      style="height: 100%;min-height: 500px !important;"
                    />
                  </div>
                </el-form-item>
              </div>
            </div>

            <!-- 表单操作按钮 -->
            <div class="form-actions">
                <button type="button" @click="$router.push('/albums')" class="garrix-btn-secondary">
                  返回
                </button>
                <button type="submit" :loading="loading" class="garrix-btn" :disabled="formProcessing">
                  创建专辑
                </button>
            </div>
          </div>
        </div>
      </el-form>
    </div>

    <!-- AI Cover Generation Dialog -->
    <el-dialog
      v-model="aiDialogVisible"
      :title="showTemplateStep ? '应用封面模板' : 'AI 封面创作'"
      :width="dialogWidth"
      :close-on-click-modal="false"
      class="ai-cover-dialog"
      :class="{ 'mobile-dialog': isMobile }"
      @closed="resetAiDialog"
    >
      <div class="ai-dialog-content">
        <!-- Left Column: Controls -->
        <div class="ai-dialog-left">
          <div v-if="!showTemplateStep">
            <div class="prompt-section">
              <div class="prompt-header">
                <h4 class="section-subtitle">创作提示词</h4>
                <div class="prompt-actions">
                  <div class="language-toggle">
                    <button @click="promptLanguage = 'zh'" :class="{ active: promptLanguage === 'zh' }">中</button>
                    <button @click="promptLanguage = 'en'" :class="{ active: promptLanguage === 'en' }">En</button>
                  </div>
                  <el-tooltip content="让AI帮你构思创意" placement="top">
                    <button @click="generatePrompt" :disabled="isGeneratingPrompt" class="garrix-btn-text small">
                      <el-icon><MagicStick /></el-icon>
                      <span>AI构思</span>
                    </button>
                  </el-tooltip>
                </div>
              </div>
              <el-input
                v-model="aiPrompt"
                type="textarea"
                :rows="4"
                :placeholder="'描述你想要的封面效果，例如：\n- 一条龙在霓虹灯下的东京夜晚飞翔\n- 数字艺术风格，史诗级场景'"
                :disabled="isGeneratingAiCover"
                class="prompt-input"
              ></el-input>
            </div>

            <div class="style-selector">
              <h4 class="section-subtitle">选择风格</h4>
              <div class="style-options">
                <div
                  v-for="style in aiStyles"
                  :key="style.value"
                  class="style-option"
                  :class="{ active: aiStyle === style.value }"
                  @click="aiStyle = style.value"
                >
                  <el-icon><component :is="style.icon" /></el-icon>
                  <span>{{ style.label }}</span>
                </div>
              </div>
            </div>

            <PromptEnhancer 
              @add-keyword="handleAddKeyword" 
              :language="promptLanguage"
            />
            
            <div class="generation-controls">
              <el-button 
                @click="generateAiCover" 
                :loading="isGeneratingAiCover" 
                class="generate-btn" 
                type="primary"
                :disabled="!aiPrompt.trim()"
              >
                <span v-if="isGeneratingAiCover">AI 正在创作中...</span>
                <span v-else>开始创作</span>
              </el-button>
            </div>
          </div>
          <!-- Template List -->
          <div v-else class="template-view-container">
            <div class="template-search">
              <el-input
                v-model="templateSearch"
                placeholder="搜索模板..."
                class="garrix-input"
                clearable
              >
                <template #prefix>
                  <el-icon><Search /></el-icon>
                </template>
              </el-input>
            </div>
            <el-scrollbar class="template-list-scrollbar" v-loading="loadingTemplates">
              <div 
                v-for="template in filteredTemplates" 
                :key="template.id" 
                class="template-item" 
                :class="{ active: selectedTemplate?.id === template.id }"
                @click="selectTemplate(template)"
              >
                <span class="template-name">{{ template.name }}</span>
              </div>
              <el-empty v-if="!filteredTemplates.length && !loadingTemplates" description="无可用模板" :image-size="80"></el-empty>
            </el-scrollbar>
          </div>
        </div>
  
        <!-- Right Column: Result -->
        <div class="ai-dialog-right">
          <div class="result-section" v-loading="applyingTemplate" element-loading-text="正在应用模板...">
            <div class="result-container">
              <div class="result-section">
                <img v-if="currentImageUrl" :src="currentImageUrl" class="generated-image-preview" />
                <div v-else-if="isGeneratingAiCover" class="generating-placeholder">
                  <div class="generating-animation">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                  <p class="generating-text">AI 正在发挥创意...</p>
                </div>
                <div v-else class="empty-placeholder">
                  <el-icon><Picture /></el-icon>
                  <span>AI 创作结果将在这里显示</span>
                  <p class="placeholder-tip">填写左侧提示词开始创作</p>
                </div>
              </div>
            </div>
          </div>

          <div class="recommendations-section">
            <div class="recommendation-header">
              <h4 class="section-subtitle">创作灵感 (点击图片下方文字即可添加)</h4>
              <el-button text @click="fetchRecommendedAssets" :loading="loadingRecommendations" class="refresh-recommendations-btn">
                <el-icon><Refresh /></el-icon>
                <span>换一批</span>
              </el-button>
            </div>
            <div v-if="loadingRecommendations" class="recommendations-grid">
              <div v-for="i in 2" :key="i" class="recommendation-item-skeleton"></div>
            </div>
            <div v-else-if="recommendedAssets.length" class="recommendations-grid">
              <div 
                v-for="asset in recommendedAssets" 
                :key="asset.id" 
                class="recommendation-item" 
                @click="useRecommendation(asset)"
              >
                <el-image
                  :src="getStaticUrl(asset.thumbnail_path || asset.image_path)"
                  :preview-src-list="[getStaticUrl(asset.image_path)]"
                  class="recommendation-image"
                  fit="cover"
                  loading="lazy"
                  hide-on-click-modal
                  preview-teleported
                  @click.stop
                />
                <div class="recommendation-prompt">{{ asset.prompt }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="aiDialogVisible = false">取消</el-button>
          
          <el-button 
            v-if="showTemplateStep"
            @click="showTemplateStep = false; processedImageUrl = ''"
          >
            返回
          </el-button>

          <el-button 
            v-if="!showTemplateStep"
            @click="switchToTemplateStep" 
            :disabled="!generatedImageUrl || isGeneratingAiCover" 
            type="primary"
            plain
          >
            <el-icon><Picture /></el-icon>
            应用文字模板
          </el-button>

          <el-button 
            @click="handleUseImage" 
            :disabled="!currentImageUrl || isGeneratingAiCover || applyingTemplate" 
            type="primary"
          >
            使用这张图片
          </el-button>
        </div>
      </template>
    </el-dialog>

  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick, watch, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAlbumStore } from '../stores/album';
import { ElMessage, ElMessageBox } from 'element-plus';
import axios from 'axios';
import { API_BASE_URL, STATIC_BASE_URL } from '@/config';

import { 
  Plus, 
  Check, 
  InfoFilled, 
  Warning, 
  UploadFilled, 
  ArrowUp, 
  ArrowDown, 
  Document,
  Rank,
  Delete,
  Search,
  Loading,
  Close,
  Goods,
  Headset,
  Calendar,
  Timer,
  MagicStick,
  Picture,
  Film,
  PictureFilled,
  Camera,
  Crop,
  Refresh,
} from '@element-plus/icons-vue';
import draggable from 'vuedraggable';
import { coverTemplateService } from '@/services/coverTemplateService';
import { useUserStore } from '../stores/user';
import PromptEnhancer from '@/components/PromptEnhancer.vue';
import AcmetoneSearchDropdown from '@/components/acmetone/AcmetoneSearchDropdown.vue';

const router = useRouter();
const albumStore = useAlbumStore();
const userStore = useUserStore();
const formRef = ref(null);
const loading = ref(false);
const formProcessing = ref(false);
const imageUrl = ref('');

// AI Cover Generation State
const aiDialogVisible = ref(false);
const aiPrompt = ref('');
const aiStyle = ref('cinematic');
const isGeneratingAiCover = ref(false);
const generatedImageUrl = ref('');
const isGeneratingPrompt = ref(false);
const isGeneratingDescription = ref(false);

// State for Sharp-based template application
const showTemplateStep = ref(false);
const coverTemplates = ref([]);
const loadingTemplates = ref(false);
const applyingTemplate = ref(false);
const processedImageUrl = ref(''); // URL for the image processed by Sharp

const recommendedAssets = ref([]);
const loadingRecommendations = ref(true);

const isMobile = ref(false);

const checkScreenSize = () => {
  isMobile.value = window.innerWidth < 768;
};

onMounted(() => {
  checkScreenSize();
  window.addEventListener('resize', checkScreenSize);
});

onUnmounted(() => {
  window.removeEventListener('resize', checkScreenSize);
});

const dialogWidth = computed(() => (isMobile.value ? '100vw' : '1000px'));

const currentImageUrl = computed(() => processedImageUrl.value || generatedImageUrl.value);

const promptLanguage = ref('zh');

const form = reactive({
  title: '',
  type: '',
  releaseDate: '',
  coverImage: null,
  displayInfo: '',
  description: '',
  performers: [],
  status: 'pending',
  comment: '',
  authorizationFile: null,
});

const artistSearchKeyword = ref('');
const searchingArtists = ref(false);
const searchResults = ref([]);
const showArtistSearchDropdown = ref(false);
const searchInputRef = ref(null);

const templateSearch = ref('');
const selectedTemplate = ref(null);

const filteredTemplates = computed(() => {
  if (!templateSearch.value) return coverTemplates.value;
  const search = templateSearch.value.toLowerCase();
  return coverTemplates.value.filter(template => 
    template.name.toLowerCase().includes(search) || 
    template.description?.toLowerCase().includes(search)
  );
});

const selectTemplate = (template) => {
  selectedTemplate.value = template;
  applyTemplate(template);
};

const getFormattedDate = (dateString) => {
  if (!dateString) return '';
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return new Date(dateString).toLocaleDateString('zh-CN', options);
};

const isDateTooClose = computed(() => {
  if (!form.releaseDate) return false;
  
  const releaseDate = new Date(form.releaseDate);
  releaseDate.setHours(0, 0, 0, 0);
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const diffTime = releaseDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays < 3;
});

const aiStyles = [
  { label: '电影感', value: 'cinematic', icon: Film },
  { label: '动漫风', value: 'anime', icon: PictureFilled },
  { label: '写实照片', value: 'photorealistic', icon: Camera },
  { label: '极简矢量', value: 'minimalist', icon: Crop }
];

const rules = {
  title: [
    { required: true, message: '请输入专辑名称', trigger: 'blur' },
  ],
  type: [
    { required: true, message: '请选择专辑类型', trigger: 'change' },
  ],
  releaseDate: [
    { required: true, message: '请选择发行日期', trigger: 'change' },
  ],
  coverImage: [
    { required: true, message: '请上传专辑封面', trigger: 'change' },
  ],
  displayInfo: [
    { required: true, message: '请输入发行外显', trigger: 'blur' },
  ],
  description: [
    { required: true, message: '请输入专辑简介', trigger: 'blur' },
  ],
  performers: [
    { 
      validator: (rule, value, callback) => {
        if (!value || value.length === 0) {
          callback(new Error('请至少添加一位表演者'));
        } else {
          callback();
        }
      }, 
      trigger: 'change' 
    }
  ],
};

const disabledDate = (time) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return time.getTime() < today.getTime();
};

const handleCoverChange = (file) => {
  const isJPG = file.raw.type === 'image/jpeg';
  if (!isJPG) {
    ElMessage.error('专辑封面只能是JPG格式!');
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      if (img.width !== 3000 || img.height !== 3000) {
        ElMessage.warning('图片尺寸建议为3000x3000像素。AI生成的图片可能尺寸较小，请注意平台要求。');
        // For AI generated images, we might want to bypass strict dimension check
        // but for now, we just warn the user.
      }
      imageUrl.value = e.target.result;
      form.coverImage = file.raw;
      
      // Manually clear validation message if any
      formRef.value.clearValidate('coverImage');
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file.raw);
};

const triggerCoverValidation = () => {
  if (!form.coverImage) {
    formRef.value.validateField('coverImage');
  }
}

const handleSearchBlur = () => {
  setTimeout(() => {
    showArtistSearchDropdown.value = false;
  }, 200);
};

const handleGlobalArtistSearch = async () => {
  if (!artistSearchKeyword.value.trim()) {
    showArtistSearchDropdown.value = false;
    return;
  }
  
  try {
    searchingArtists.value = true;
    showArtistSearchDropdown.value = true;
    const response = await axios.get(`${API_BASE_URL}/artist-edit-requests/search?keyword=${encodeURIComponent(artistSearchKeyword.value)}`);
    searchResults.value = response.data || [];
  } catch (error) {
    console.error('搜索歌手失败:', error);
    ElMessage.error('搜索歌手失败');
    searchResults.value = [];
  } finally {
    searchingArtists.value = false;
  }
};

const handleRemovePerformer = (index) => {
  if (form.performers.length <= 1) {
    ElMessage.warning('至少保留一位表演者');
    return;
  }
  form.performers.splice(index, 1);
};

const addArtistDirectly = (artist) => {
  // 检查是否已存在相同ID的表演者
  const existingIdIndex = form.performers.findIndex(p => p.artistId === artist.id);
  if (existingIdIndex >= 0) {
    ElMessage.warning(`表演者 "${artist.name}" 已添加`);
    return;
  }
  
  // 检查是否已存在相同名称的表演者（处理没有ID的情况）
  const existingNameIndex = form.performers.findIndex(p => p.name === artist.name);
  if (existingNameIndex >= 0) {
    ElMessage.warning(`已存在同名表演者 "${artist.name}"`);
    return;
  }
  
  // 如果艺人有canonicalArtist信息，使用主艺人信息
  let artistMessage = `已添加表演者: ${artist.name}`;
  
  if (artist.canonicalArtist) {
    artistMessage = `已添加表演者: ${artist.name} (关联到主艺人: ${artist.canonicalArtist.name})`;
    console.log(`艺人 ${artist.name} (ID: ${artist.id}) 关联到主艺人 ${artist.canonicalArtist.name} (ID: ${artist.canonicalArtistId})`);
  }
  
  form.performers.push({
    id: Date.now(),
    name: artist.name,
    artistId: artist.id,
    realName: artist.realName || '',
    canonicalArtistId: artist.canonicalArtistId || null,
    canonicalArtist: artist.canonicalArtist || null,
    order: form.performers.length
  });
  
  artistSearchKeyword.value = '';
  showArtistSearchDropdown.value = false;
  searchResults.value = [];
  
  ElMessage.success(artistMessage);
};

const handleSubmit = async () => {
  if (!formRef.value) return;
  
  // 检查表单各个字段，提供详细的错误信息
  const validateFields = async () => {
    try {
      await formRef.value.validate();
      return { valid: true };
    } catch (errors) {
      // 获取具体的错误信息
      const errorFields = Object.keys(errors.fields || {});
      const errorMessages = [];
      
      // 检查各个字段的错误
      if (errorFields.includes('title')) {
        errorMessages.push('请输入专辑名称');
      }
      if (errorFields.includes('type')) {
        errorMessages.push('请选择专辑类型');
      }
      if (errorFields.includes('releaseDate')) {
        errorMessages.push('请选择发行日期');
      }
      if (errorFields.includes('coverImage')) {
        errorMessages.push('请上传专辑封面');
      }
      if (errorFields.includes('displayInfo')) {
        errorMessages.push('请输入发行外显');
      }
      if (errorFields.includes('description')) {
        errorMessages.push('请输入专辑简介');
      }
      if (errorFields.includes('performers')) {
        errorMessages.push('请至少添加一位表演者');
      }
      
      // 如果没有具体错误信息，提供一个通用消息
      if (errorMessages.length === 0) {
        errorMessages.push('表单信息不完整，请检查所有必填项');
      }
      
      return { valid: false, messages: errorMessages };
    }
  };
  
  const validation = await validateFields();
  if (!validation.valid) {
    // 显示所有错误信息
    validation.messages.forEach(msg => {
      ElMessage.error(msg);
    });
      return;
    }

    formProcessing.value = true;
    loading.value = true;
    
    try {
      const performerString = form.performers.map(p => p.name).join('/');
      const performerIds = form.performers.map(p => p.artistId).filter(id => id);
      
      // 收集关联歌手的主歌手ID
      const canonicalArtistMap = {};
      form.performers.forEach(performer => {
        if (performer.artistId && performer.canonicalArtistId) {
          canonicalArtistMap[performer.artistId] = performer.canonicalArtistId;
        }
      });
      
      const albumData = {
        title: form.title,
        type: form.type,
        releaseDate: form.releaseDate,
        coverImage: form.coverImage,
        displayInfo: form.displayInfo,
        description: form.description,
        status: form.status,
        performer: performerString,
        performerIds: JSON.stringify(performerIds),
        canonicalArtistMap: Object.keys(canonicalArtistMap).length > 0 ? JSON.stringify(canonicalArtistMap) : null,
      };
      
      await albumStore.createAlbum(albumData);
    
      ElMessage.success('专辑创建成功');
      router.push('/albums');
    } catch (error) {
      ElMessage.error(error.toString());
    } finally {
      loading.value = false;
      formProcessing.value = false;
    }
};

const openAiDialog = () => {
  aiDialogVisible.value = true;
};

const resetAiDialog = () => {
  generatedImageUrl.value = '';
  processedImageUrl.value = '';
  aiPrompt.value = '';
  showTemplateStep.value = false;
  applyingTemplate.value = false;
  // Any other resets needed
}

const generatePrompt = async () => {
  isGeneratingPrompt.value = true;
  try {
    // Pass album title as keywords for more relevant suggestions
    const response = await axios.post(`${API_BASE_URL}/ai-chat/generate-creative-prompt`, {
      keywords: form.title, 
      language: promptLanguage.value
    });

    if (response.data && response.data.success) {
      aiPrompt.value = response.data.prompt;
      ElMessage.success('创意指令已生成！');
    } else {
      ElMessage.error('无法生成创意指令，请稍后重试。');
    }
  } catch (error) {
    console.error('Failed to generate creative prompt:', error);
    const errorMessage = error.response?.data?.message || '生成创意指令失败。';
    ElMessage.error(errorMessage);
  } finally {
    isGeneratingPrompt.value = false;
  }
};

const generateAiCover = async () => {
  if (!aiPrompt.value.trim()) {
    ElMessage.warning('请输入创意指令');
    return;
  }
  isGeneratingAiCover.value = true;
  generatedImageUrl.value = '';
  try {
    const response = await axios.post(`${API_BASE_URL}/ai/generate-cover`, {
      prompt: aiPrompt.value,
      style: aiStyle.value,
    });
    if (response.data && response.data.url) {
      generatedImageUrl.value = response.data.url;
      ElMessage.success('封面生成成功！');
    } else {
      ElMessage.error('AI服务未能返回图片，请稍后重试');
    }
  } catch (error) {
    console.error('AI cover generation failed:', error);
    const errorMessage = error.response?.data?.message || '生成失败，请检查网络或联系管理员';
    ElMessage.error(errorMessage);
  } finally {
    isGeneratingAiCover.value = false;
  }
};

const switchToTemplateStep = async () => {
  showTemplateStep.value = true;
  loadingTemplates.value = true;
  try {
    coverTemplates.value = await coverTemplateService.getAll();
  } catch (error) {
    ElMessage.error('获取模板列表失败');
  } finally {
    loadingTemplates.value = false;
  }
};

const applyTemplate = async (template) => {
  if (!generatedImageUrl.value || applyingTemplate.value) return;

  applyingTemplate.value = true;
  processedImageUrl.value = ''; // Clear previous result
  try {
    // Fetch the image and convert to Base64
    const imageResponse = await fetch(generatedImageUrl.value);
    const imageBlob = await imageResponse.blob();
    const reader = new FileReader();
    
    reader.onloadend = async () => {
      const base64Image = reader.result;

      try {
        const payload = {
          imageBase64: base64Image,
          definition: template.definition, // Pass the entire definition
          data: {
            title: form.title || '专辑标题',
            performers: form.performers.map(p => p.name).join(' / ') || '艺人名',
            displayInfo: form.displayInfo || ''
          }
        };
        const result = await coverTemplateService.applyTemplate(payload);
        if (result.success) {
          // The backend now returns a base64 URL directly
          processedImageUrl.value = result.url;
        } else {
          ElMessage.error('应用模板失败');
        }
      } catch (error) {
        ElMessage.error(error.message || '应用模板时发生错误');
      } finally {
        applyingTemplate.value = false;
      }
    };
    
    reader.onerror = () => {
      ElMessage.error('无法读取生成的图片');
      applyingTemplate.value = false;
    };

    reader.readAsDataURL(imageBlob);

  } catch (error) {
    ElMessage.error('获取AI生成图片失败: ' + (error.message || '未知错误'));
    applyingTemplate.value = false;
  }
};

const handleUseImage = async () => {
  const finalUrl = processedImageUrl.value || generatedImageUrl.value;
  if (!finalUrl) return;

  try {
    // Save to asset library first
    const assetData = {
      image_url: finalUrl,
      prompt: aiPrompt.value,
      negative_prompt: '',
      seed: null,
      num_inference_steps: 30,
      guidance_scale: 7.5,
      model_name: "User-Apply",
      style: '',
    };

    try {
      await axios.post(`${API_BASE_URL}/ai/save-asset`, assetData, {
        headers: { 'Authorization': `Bearer ${userStore.token}` }
      });
    } catch (error) {
      console.error('Error saving to asset library:', error);
      // Don't block the main flow if saving to library fails
    }

    // Using a proxy might be needed if CORS issues arise with the temp URL
    const response = await fetch(finalUrl);
    const blob = await response.blob();
    const file = new File([blob], "ai_cover.jpg", { type: "image/jpeg" });
    
    // Revoke previous object URL if it exists
    if (imageUrl.value.startsWith('blob:')) {
      URL.revokeObjectURL(imageUrl.value);
    }

    imageUrl.value = URL.createObjectURL(file);
    form.coverImage = file;
    formRef.value.clearValidate('coverImage');

    ElMessage.success('已应用封面');
    aiDialogVisible.value = false;
  } catch (error) {
    console.error('Failed to use AI image:', error);
    ElMessage.error('无法应用该图片，请尝试手动下载并上传');
  }
};

const generateDescription = async () => {
  if (!form.title) {
    ElMessage.warning('请先填写专辑名称');
    return;
  }
  
  isGeneratingDescription.value = true;
  try {
    // 准备参数
    const params = {
      title: form.title,
      displayInfo: form.displayInfo || '',
      performers: form.performers.map(p => p.name).join(' / '),
      type: form.type || '专辑'
    };
    
    // 调用新的专辑简介生成API
    const response = await axios.post(`${API_BASE_URL}/ai-chat/generate-album-description`, params);
    
    if (response.data.success) {
      form.description = response.data.description;
      ElMessage.success('专辑简介生成成功');
    } else {
      ElMessage.error(response.data.message || '生成失败，请稍后再试');
    }
  } catch (error) {
    console.error('生成专辑简介失败:', error);
    ElMessage.error('生成失败，请稍后再试');
  } finally {
    isGeneratingDescription.value = false;
  }
};

const handleAddKeyword = (keyword) => {
  if (aiPrompt.value.trim() && !aiPrompt.value.endsWith(',')) {
    aiPrompt.value += ', ';
  }
  aiPrompt.value += keyword;
};

const getStaticUrl = (relativePath) => {
    if (!relativePath) return '';
    return `${STATIC_BASE_URL}/${relativePath.replace(/\\/g, '/')}`;
};

const fetchRecommendedAssets = async () => {
    loadingRecommendations.value = true;
    try {
        const response = await axios.get(`${API_BASE_URL}/ai/assets/random?limit=2`);
        recommendedAssets.value = response.data;
    } catch (error) {
        console.error('Failed to fetch recommended assets:', error);
    } finally {
        loadingRecommendations.value = false;
    }
};

const useRecommendation = (asset) => {
    if (!asset) return;
    aiPrompt.value = asset.prompt;
    if (asset.style) {
        aiStyle.value = asset.style;
    }
    ElMessage.success({ message: '已应用推荐灵感', customClass: 'dark-message' });
};

watch(aiDialogVisible, (isVisible) => {
  if (isVisible) {
    fetchRecommendedAssets();
  }
});
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap');
@import url('../assets/css/newAlbum.css');

/* 覆盖Element Plus的文本域默认高度 */
:deep(.el-textarea__inner) {
  min-height: 500px !important;
}

:deep(.garrix-textarea .el-textarea__inner) {
  min-height: 500px !important;
  height: 500px !important;
}
</style> 