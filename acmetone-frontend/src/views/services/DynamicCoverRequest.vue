<template>
  <div class="request-form-container">
    <!-- 放大查看视频组件 -->
    <VideoEnlargeViewer
      v-if="enlargedVideo.show"
      :videoSrc="enlargedVideo.src"
      :isPortrait="enlargedVideo.isPortrait"
      @close="closeEnlargedVideo"
    />
    <!-- 页面标题 -->
    <div class="page-header">
      <div class="header-main">
        <router-link to="/services" class="back-link">
          <el-icon><ArrowLeft /></el-icon>
          <span>返回服务中心</span>
        </router-link>
        <h1 class="page-title">动态封面申请</h1>
        <p class="subtitle">为您的专辑封面注入活力</p>
      </div>
      <div class="header-actions">
        <router-link to="/user-center/dynamic-covers">
          <button class="garrix-btn">
            <el-icon><Document /></el-icon>
            我的申请记录
          </button>
        </router-link>
      </div>
    </div>

    <!-- 水平分隔线 -->
    <div class="page-divider"></div>

    <!-- 步骤进度条 -->
    <div class="steps-container">
      <el-steps :active="currentStep" finish-status="success" align-center>
        <el-step title="选择专辑" description="选择需要申请动态封面的专辑"></el-step>
        <el-step title="选择平台" description="选择发布的目标平台"></el-step>
        <el-step title="上传封面" description="上传动态封面文件"></el-step>
      </el-steps>
    </div>

    <!-- 表单部分 - 去掉内容布局的分栏，使用全宽显示 -->
    <div class="form-section">
      <el-form :model="form" :rules="rules" ref="formRef" @submit.prevent="submitForm" class="request-form">

        <!-- 第一步：选择专辑 -->
        <el-card v-show="currentStep === 0" class="form-card">
          <template #header>
            <div class="card-header">
              <span>第一步：选择专辑</span>
            </div>
          </template>
          <div class="service-intro">
            <p><strong>注意：</strong>动态封面现在支持<strong>网易云音乐</strong>、<strong>QQ音乐</strong>和<strong>苹果音乐</strong>平台的申请。</p>
            <p>为您的专辑封面注入活力，让您的音乐在平台上脱颖而出。</p>
          </div>
          <el-form-item label="选择您已发行的曲目或专辑" prop="trackId" class="album-search-form-item">
            <AcmetoneSearchDropdown
              v-model="searchQuery"
              :results="trackOptions"
              :loading="loadingTracks"
              placeholder="搜索您在本站上传的专辑"
              text-field="title"
              key-field="id"
              @search="searchTracks"
              @select="selectTrack"
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
                  </div>
                </div>
              </template>
              <template #action-icon>
                <el-icon><Check /></el-icon>
              </template>
            </AcmetoneSearchDropdown>
          </el-form-item>
          <div class="step-actions">
            <el-button type="primary" @click="goToNextStep" :disabled="!form.trackId">下一步</el-button>
          </div>
        </el-card>

        <!-- 第二步：选择平台 -->
        <el-card v-show="currentStep === 1" class="form-card">
          <template #header>
            <div class="card-header">
              <span>第二步：选择平台</span>
            </div>
          </template>
          <div v-if="selectedAlbumCover" class="selected-album">
            <h3>已选择专辑：{{ selectedAlbumTitle }}</h3>
            <div class="album-preview">
              <img 
                :src="selectedAlbumCover.startsWith('http') ? selectedAlbumCover : normalizeUrl(ensureFullUrl(selectedAlbumCover))" 
                alt="专辑封面"
                class="album-cover-preview"
              />
            </div>
          </div>
          <el-form-item label="选择目标平台" prop="platform">
            <AcmetoneRadioGroup 
              v-model="form.platform" 
              :options="platformOptions"
              class="platform-radio-group"
            >
              <template #option="{ option }">
                <div class="platform-option">
                  <img :src="option.icon" :alt="option.label" class="platform-icon" />
                  <span>{{ option.label }}</span>
                </div>
              </template>
            </AcmetoneRadioGroup>
          </el-form-item>
          <div class="step-actions">
            <el-button @click="goToPrevStep">上一步</el-button>
            <el-button type="primary" @click="goToNextStep" :disabled="!form.platform">下一步</el-button>
          </div>
        </el-card>

        <!-- 第三步：上传动态封面 - 重新设计，整合格式要求 -->
        <el-card v-show="currentStep === 2" class="form-card upload-step-card">
          <template #header>
            <div class="card-header">
              <span>第三步：上传动态封面</span>
            </div>
          </template>
          
          <div class="upload-step-content">
            <!-- 选择信息汇总 -->
            <div class="selected-summary">
              <div class="selected-item">
                <span class="summary-label">专辑：</span>
                <span class="summary-value">{{ selectedAlbumTitle }}</span>
              </div>
              <div class="selected-item">
                <span class="summary-label">平台：</span>
                <span class="summary-value">{{ getPlatformName(form.platform) }}</span>
                <img :src="getPlatformIcon(form.platform)" :alt="getPlatformName(form.platform)" class="platform-preview-icon" />
              </div>
            </div>

            <!-- 平台要求信息 - 简化并整合 -->
            <div class="requirements-panel">
              <h3>{{ getPlatformName(form.platform) }}平台要求</h3>
              
              <!-- 平台特殊要求 -->
              <div class="platform-specific-reqs">
                <div v-if="form.platform === 'netease'">
                  <span class="req-item"><el-icon><Timer /></el-icon> 时长: 不超过15秒</span>
                  <span class="req-item"><el-icon><VideoPlay /></el-icon> 帧率: 不低于24fps</span>
                </div>
                <div v-else-if="form.platform === 'qqmusic'">
                  <span class="req-item"><el-icon><Timer /></el-icon> 时长: 不超过10秒</span>
                  <span class="req-item"><el-icon><VideoPlay /></el-icon> 帧率: 不低于30fps</span>
                </div>
                <div v-else-if="form.platform === 'applemusic'">
                  <span class="req-item"><el-icon><Timer /></el-icon> 时长: 8-20秒</span>
                  <span class="req-item"><el-icon><VideoPlay /></el-icon> 帧率: 23.976、24、25、29.97或30 fps</span>
                  <span class="req-item"><el-icon><Picture /></el-icon> 格式: H.264或ProRes 4444编码，无音频</span>
                  <span class="req-item important"><el-icon><InfoFilled /></el-icon> 必须同时提交两种格式:</span>
                  <span class="req-item"><el-icon><Picture /></el-icon> 1:1比例 - 3840 x 3840像素 (Mac、iPad、智能电视)</span>
                  <span class="req-item"><el-icon><Picture /></el-icon> 3:4比例 - 2048 x 2732像素 (iPhone、Android)</span>
                  <span class="req-item"><el-icon><Warning /></el-icon> 请注意安全区域，可点击"显示安全区域"查看</span>
                  <span class="req-item"><el-icon><Refresh /></el-icon> 首尾帧应自然衔接，实现无缝循环</span>
                  <span class="req-item"><el-icon><Picture /></el-icon> 第一帧必须与静态封面完全一致</span>
                </div>
              </div>
              
              <!-- 通用要求 -->
              <div class="common-requirements">
                <span class="req-item"><el-icon><Film /></el-icon> 格式: MP4，大小不超过100MB</span>
                <span class="req-item"><el-icon><Picture /></el-icon> 分辨率: 高清，符合比例要求</span>
                <span class="req-item"><el-icon><Refresh /></el-icon> 循环: 首尾相连无缝循环，不使用淡出</span>
                <span class="req-item"><el-icon><Picture /></el-icon> 起始帧: 必须与静态封面完全一致</span>
                <span class="req-item"><el-icon><Warning /></el-icon> 禁止: 家长忠告徽标、边框、剧烈闪光、丢帧、多镜头剪辑</span>
              </div>
            </div>
            
            <!-- 上传区域 - 调整为紧凑版 -->
            <div class="upload-area-compact">
              <!-- 动态封面（1:1）部分 -->
              <div class="cover-upload-section full-width">
                <div class="cover-header">
                  <h4>动态封面 <span class="ratio-badge">1:1</span></h4>
                </div>
                
                <div class="cover-container">
                  <!-- 当前静态封面 -->
                  <div class="static-cover">
                    <img 
                      :src="selectedAlbumCover.startsWith('http') ? selectedAlbumCover : normalizeUrl(ensureFullUrl(selectedAlbumCover))" 
                      alt="当前封面"
                    />
                    <div class="cover-label">当前封面</div>
                  </div>
                  
                  <!-- 动态封面上传/预览区域 -->
                  <div 
                    class="dynamic-cover" 
                    :class="{ 'is-disabled': isResubmitting && replaceType === 'portrait' }"
                  >
                    <!-- 上传组件 -->
                    <el-upload
                      v-if="!(isResubmitting && replaceType === 'portrait')"
                      class="upload-component"
                      drag
                      :auto-upload="false"
                      :show-file-list="false"
                      :on-change="handleDynamicCoverChange"
                      accept="video/mp4,video/quicktime"
                      ref="dynamicUploadRef"
                    >
                      <template v-if="!form.dynamicCover">
                        <div class="upload-placeholder">
                          <el-icon class="upload-icon"><Upload /></el-icon>
                          <div class="upload-text">点击或拖拽上传</div>
                          <div class="upload-hint">支持MP4/MOV格式</div>
                        </div>
                      </template>
                      
                      <template v-else>
                        <div class="video-preview-container">
                          <video
                            ref="previewVideo"
                            :src="form.dynamicCover"
                            loop
                            muted
                            class="preview-video"
                            @loadedmetadata="handleVideoLoad"
                          ></video>
                          
                          <!-- 桌面端悬浮控制按钮 -->
                          <div class="video-controls">
                            <el-button type="primary" size="small" circle @click.stop="toggleVideoPlay">
                              <el-icon><component :is="isPlaying ? 'VideoPause' : 'VideoPlay'" /></el-icon>
                            </el-button>
                            <el-button type="info" size="small" circle @click.stop="openEnlargedVideo(form.dynamicCover, false)">
                              <el-icon><View /></el-icon>
                            </el-button>
                            <el-button type="danger" size="small" circle @click.stop="removeDynamicCover">
                              <el-icon><Delete /></el-icon>
                            </el-button>
                          </div>
                        </div>
                      </template>
                    </el-upload>
                    <div class="cover-label">{{ form.dynamicCover ? '动态效果' : '点击上传动态封面' }}</div>
                    
                    <!-- 手机端控制按钮 -->
                    <div v-if="form.dynamicCover" class="mobile-video-controls">
                      <el-button :type="isPlaying ? 'info' : 'primary'" class="mobile-control-btn" @click="toggleVideoPlay">
                        <el-icon><component :is="isPlaying ? 'VideoPause' : 'VideoPlay'" /></el-icon>
                        {{ isPlaying ? '暂停' : '播放' }}
                      </el-button>
                      <el-button type="info" class="mobile-control-btn" @click="openEnlargedVideo(form.dynamicCover, false)">
                        
                        放大查看
                      </el-button>
                      <el-button type="default" class="mobile-control-btn" @click="handleReplaceDynamicCover">
                        <el-icon><RefreshRight /></el-icon>
                        更换
                      </el-button>
                      <el-button type="danger" class="mobile-control-btn" @click="removeDynamicCover">
                        <el-icon><Delete /></el-icon>
                        删除
                      </el-button>
                    </div>
                    
                    <!-- 手机端上传按钮 -->
                    <el-button v-if="!form.dynamicCover" type="primary" plain class="mobile-upload-btn" @click="triggerDynamicCoverUpload">
                      <el-icon><Upload /></el-icon>
                      上传动态封面
                    </el-button>

                    <!-- 当替换竖版时，显示旧的正方形视频预览 -->
                    <div v-if="isResubmitting && replaceType === 'portrait'" class="existing-video-preview">
                       <video
                          :src="form.dynamicCover"
                          loop
                          muted
                          autoplay
                          class="preview-video"
                        ></video>
                        <div class="preview-overlay">
                          <el-icon><Check /></el-icon>
                          <span>保留当前视频</span>
                        </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 竖版封面（3:4）部分 - 只有苹果音乐才需要 -->
              <div class="cover-upload-section full-width" v-if="form.platform === 'applemusic'">
                <div class="cover-header">
                  <h4>竖版封面 <span class="ratio-badge">3:4</span></h4>
                  <el-button 
                    type="text" 
                    size="small" 
                    @click="toggleSafeZoneOverlay" 
                    class="safe-zone-toggle"
                  >
                    {{ showSafeZoneOverlay ? '隐藏安全区域' : '显示安全区域' }}
                  </el-button>
                </div>
                
                <div class="cover-container">
                  <!-- 当前静态封面 -->
                  <div class="static-cover vertical">
                    <img 
                      :src="selectedAlbumCover.startsWith('http') ? selectedAlbumCover : normalizeUrl(ensureFullUrl(selectedAlbumCover))" 
                      alt="当前封面"
                    />
                    <div class="cover-label">当前封面</div>
                  </div>
                  
                  <!-- 竖版封面上传/预览区域 -->
                  <div 
                    class="dynamic-cover vertical"
                    :class="{ 'is-disabled': isResubmitting && replaceType === 'square' }"
                  >
                    <el-upload
                      v-if="!(isResubmitting && replaceType === 'square')"
                      class="upload-component"
                      drag
                      :auto-upload="false"
                      :show-file-list="false"
                      :on-change="handleVerticalCoverChange"
                      accept="video/mp4,video/quicktime"
                      ref="verticalUploadRef"
                    >
                      <template v-if="!form.verticalCover">
                        <div class="upload-placeholder vertical">
                          <el-icon class="upload-icon"><Upload /></el-icon>
                          <div class="upload-text">点击或拖拽上传</div>
                          <div class="upload-hint">支持MP4/MOV格式</div>
                        </div>
                      </template>
                      
                      <template v-else>
                        <div class="video-preview-container">
                          <video
                            ref="previewVerticalVideo"
                            :src="form.verticalCover"
                            loop
                            muted
                            class="preview-video vertical"
                            @loadedmetadata="handleVerticalVideoLoad"
                          ></video>
                          
                          <!-- 安全区域覆盖图 -->
                          <div v-if="showSafeZoneOverlay" class="safe-zone-overlay vertical"></div>
                          
                          <!-- 桌面端悬浮控制按钮 -->
                          <div class="video-controls">
                            <el-button type="primary" size="small" circle @click.stop="toggleVerticalVideoPlay">
                              <el-icon><component :is="isVerticalPlaying ? 'VideoPause' : 'VideoPlay'" /></el-icon>
                            </el-button>
                            <el-button type="info" size="small" circle @click.stop="openEnlargedVideo(form.verticalCover, true)">
                              <el-icon><View /></el-icon>
                            </el-button>
                            <el-button type="danger" size="small" circle @click.stop="removeVerticalCover">
                              <el-icon><Delete /></el-icon>
                            </el-button>
                          </div>
                        </div>
                      </template>
                    </el-upload>
                    <div class="cover-label">{{ form.verticalCover ? '动态效果' : '点击上传竖版封面' }}</div>
                    
                    <!-- 手机端控制按钮 -->
                    <div v-if="form.verticalCover" class="mobile-video-controls">
                      <el-button :type="isVerticalPlaying ? 'info' : 'primary'" class="mobile-control-btn" @click="toggleVerticalVideoPlay">
                        <el-icon><component :is="isVerticalPlaying ? 'VideoPause' : 'VideoPlay'" /></el-icon>
                        {{ isVerticalPlaying ? '暂停' : '播放' }}
                      </el-button>
                      <el-button type="info" class="mobile-control-btn" @click="openEnlargedVideo(form.verticalCover, true)">
                        
                        放大查看
                      </el-button>
                      <el-button type="default" class="mobile-control-btn" @click="handleReplaceVerticalCover">
                        <el-icon><RefreshRight /></el-icon>
                        更换
                      </el-button>
                      <el-button type="danger" class="mobile-control-btn" @click="removeVerticalCover">
                        <el-icon><Delete /></el-icon>
                        删除
                      </el-button>
                    </div>
                    
                    <!-- 手机端上传按钮 -->
                    <el-button v-if="!form.verticalCover" type="primary" plain class="mobile-upload-btn" @click="triggerVerticalCoverUpload">
                      <el-icon><Upload /></el-icon>
                      上传竖版封面
                    </el-button>

                    <!-- 当替换正方形时，显示旧的竖版视频预览 -->
                    <div v-if="isResubmitting && replaceType === 'square'" class="existing-video-preview vertical">
                       <video
                          :src="form.verticalCover"
                          loop
                          muted
                          autoplay
                          class="preview-video vertical"
                        ></video>
                        <div class="preview-overlay">
                          <el-icon><Check /></el-icon>
                          <span>保留当前视频</span>
                        </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div class="step-actions">
            <el-button @click="goToPrevStep">上一步</el-button>
            <el-button type="primary" @click="submitForm" :loading="submitting" :disabled="!canSubmit">
              {{ submitting ? '提交中...' : '提交申请' }}
            </el-button>
          </div>
        </el-card>
      </el-form>
    </div>

    <!-- 上传进度指示器 -->
    <el-dialog
      v-model="uploadProgressVisible"
      :title="uploadProgressText"
      :show-close="false"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      :show-confirm-button="false"
      :show-cancel-button="false"
      :show-input="false"
      :show-footer="false"
      :custom-class="'upload-progress-dialog'"
      width="300px"
      top="50%"
      left="50%"
      :modal="false"
      :append-to-body="true"
    >
      <div class="upload-progress-content">
        <el-progress :percentage="uploadProgress" :color="['#000']" :indeterminate="uploadProgress === 0" />
        <p class="upload-progress-text">{{ uploadProgressText }}</p>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onBeforeUnmount, computed, watch } from 'vue';
import { ElMessage, ElMessageBox, ElSteps, ElStep } from 'element-plus';
import { UploadFilled, ArrowLeft, Check, Film, Refresh, Picture, ZoomIn, CircleClose, Timer, VideoPlay, Upload, Delete, VideoPause, RefreshRight, InfoFilled, Warning, View, Document } from '@element-plus/icons-vue';
import { useRouter } from 'vue-router';
import dynamicCoverService from '@/services/dynamicCoverService';
import { STATIC_BASE_URL } from '@/config';
import { ensureFullUrl, normalizeUrl } from '@/utils/urlHelper';
import { validateAppleMusicCover, getAppleMusicCoverSpecs } from '@/utils/appleMusicCoverValidator';
import { useUserStore } from '@/stores/user';
import VideoEnlargeViewer from '@/components/VideoEnlargeViewer.vue';
import AcmetoneSearchDropdown from '@/components/acmetone/AcmetoneSearchDropdown.vue';
import AcmetoneRadioGroup from '@/components/acmetone/AcmetoneRadioGroup.vue';

// 添加重新提交相关的状态
const resubmitId = ref(null);
const replaceType = ref(null);
const existingRequest = ref(null);
const isResubmitting = computed(() => !!resubmitId.value);

// 添加上传进度相关变量
const uploadProgress = ref(0);
const uploadProgressVisible = ref(false);
const uploadProgressText = ref('正在上传...');

const router = useRouter();
const formRef = ref(null);
const submitting = ref(false);
const loadingTracks = ref(false);
const trackOptions = ref([]);
const selectedAlbumCover = ref('');
const selectedAlbumTitle = ref('');
const uploadRef = ref(null);
const verticalUploadRef = ref(null);
const previewVideo = ref(null);
const previewVerticalVideo = ref(null);
const dynamicUploadRef = ref(null);

// 添加搜索查询变量
const searchQuery = ref('');

// 放大查看视频状态
const enlargedVideo = reactive({
  show: false,
  src: '',
  isPortrait: false
});

// 步骤状态管理
const currentStep = ref(0); // 当前步骤，0-2

// 平台选项
const platformOptions = [
  { value: 'netease', label: '网易云音乐', icon: '/网易云.svg' },
  { value: 'qqmusic', label: 'QQ音乐', icon: '/QQ音乐.svg' },
  { value: 'applemusic', label: '苹果音乐', icon: '/applemusic.svg' }
];

const form = reactive({
  trackId: '',
  platform: '',
  dynamicCover: null,
  verticalCover: null,
  dynamicCoverFile: null,
  verticalCoverFile: null, // 苹果音乐竖版封面
});

const rules = reactive({
  trackId: [{ required: true, message: '请选择您的一个曲目', trigger: 'change' }],
  platform: [{ required: true, message: '请选择目标平台', trigger: 'change' }],
  dynamicCoverFile: [{ required: true, message: '请上传动态封面文件', trigger: 'change' }],
});

// 监听专辑ID变化，更新搜索框显示
watch(() => form.trackId, (newId) => {
  if (newId) {
    const selectedTrack = trackOptions.value.find(track => track.id === newId);
    if (selectedTrack) {
      searchQuery.value = selectedTrack.title;
    }
  }
});

// 判断是否可以提交表单
const canSubmit = computed(() => {
  if (!form.trackId || !form.platform) return false;

  if (isResubmitting.value) {
    if (replaceType.value === 'square') return !!form.dynamicCoverFile;
    if (replaceType.value === 'portrait') return !!form.verticalCoverFile;
    // 如果是重新提交整个申请
    return form.platform === 'applemusic' 
      ? (!!form.dynamicCoverFile && !!form.verticalCoverFile)
      : !!form.dynamicCoverFile;
  }
  
  // 对于新申请
  return form.platform === 'applemusic' 
    ? (!!form.dynamicCoverFile && !!form.verticalCoverFile) 
    : !!form.dynamicCoverFile;
});

// 步骤切换方法
const goToNextStep = () => {
  if (currentStep.value === 0) {
    // 验证第一步
    if (!form.trackId) {
      ElMessage.error('请选择专辑');
      return;
    }
    currentStep.value = 1;
  } else if (currentStep.value === 1) {
    // 验证第二步
    if (!form.platform) {
      ElMessage.error('请选择平台');
      return;
    }
    currentStep.value = 2;
  }
};

const goToPrevStep = () => {
  if (currentStep.value === 1) {
    currentStep.value = 0;
  } else if (currentStep.value === 2) {
    currentStep.value = 1;
  }
};

// 获取平台名称
const getPlatformName = (platform) => {
  const platformNames = {
    'netease': '网易云音乐',
    'qqmusic': 'QQ音乐',
    'applemusic': '苹果音乐'
  };
  return platformNames[platform] || platform;
};

// 获取平台图标
const getPlatformIcon = (platform) => {
  if (platform === 'netease') return '/网易云.svg';
  if (platform === 'qqmusic') return '/QQ音乐.svg';
  if (platform === 'applemusic') return '/applemusic.svg';
  return '';
};

// 获取用户的专辑列表
const fetchUserAlbums = async () => {
  loadingTracks.value = true;
  try {
    const response = await dynamicCoverService.getUserAlbums();
    if (response.data && Array.isArray(response.data)) {
      trackOptions.value = response.data.map(album => ({
        id: album.id,
        title: album.title,
        coverUrl: album.coverImage.startsWith('http') ? album.coverImage : normalizeUrl(ensureFullUrl(album.coverImage))
      }));
      
      // 如果已经选择了专辑ID，更新搜索框显示
      if (form.trackId) {
        const selectedTrack = trackOptions.value.find(track => track.id === form.trackId);
        if (selectedTrack) {
          searchQuery.value = selectedTrack.title;
        }
      }
    }
  } catch (error) {
    console.error('获取专辑列表失败:', error);
    ElMessage.error('获取专辑列表失败，请稍后重试');
  } finally {
    loadingTracks.value = false;
  }
};

// 初始加载专辑列表
onMounted(async () => {
  await fetchUserAlbums();
  
  // 检查URL参数中是否有重新提交的请求ID
  const query = router.currentRoute.value.query;
  resubmitId.value = query.resubmitId || null;
  replaceType.value = query.replace_type || null;

  if (resubmitId.value) {
    try {
      const response = await dynamicCoverService.getDynamicCoverRequest(resubmitId.value);
      existingRequest.value = response.data;
      
      // 预填表单
      form.trackId = existingRequest.value.albumId;
      form.platform = existingRequest.value.platform;
      onTrackSelect(form.trackId, true); // silent = true, to avoid reset
      
      // 更新搜索框显示
      const selectedTrack = trackOptions.value.find(track => track.id === form.trackId);
      if (selectedTrack) {
        searchQuery.value = selectedTrack.title;
      }
      
      // 根据替换类型，设置已有的文件预览
      if (replaceType.value === 'square') {
        // 用户要替换正方形视频，保留旧的竖版视频
        if (existingRequest.value.portraitCoverPath) {
          form.verticalCover = normalizeUrl(ensureFullUrl(existingRequest.value.portraitCoverPath));
          // 注意：这里不设置 verticalCoverFile，因为我们不会重新上传它
        }
        ElMessage.info('您正在更换正方形(1:1)视频，旧的竖版视频将被保留。');
      } else if (replaceType.value === 'portrait') {
        // 用户要替换竖版视频，保留旧的正方形视频
        if (existingRequest.value.dynamicCoverPath) {
          form.dynamicCover = normalizeUrl(ensureFullUrl(existingRequest.value.dynamicCoverPath));
          // 注意：这里不设置 dynamicCoverFile
        }
        ElMessage.info('您正在更换竖版(3:4)视频，旧的正方形视频将被保留。');
      } else {
        // 重新上传整个申请
        ElMessage.info('您正在重新提交申请，请上传新的视频文件。');
      }

      currentStep.value = 2; // 直接跳转到上传步骤

    } catch (error) {
      console.error("获取旧申请信息失败:", error);
      ElMessage.error('加载申请信息失败，请重试。');
      resubmitId.value = null; // 加载失败则重置
    }
  } else if (query.albumId) {
    form.trackId = parseInt(query.albumId);
    onTrackSelect(form.trackId, true);
    
    // 更新搜索框显示
    const selectedTrack = trackOptions.value.find(track => track.id === form.trackId);
    if (selectedTrack) {
      searchQuery.value = selectedTrack.title;
    }
    
    currentStep.value = 1;
    if (query.platform) {
      form.platform = query.platform;
      currentStep.value = 2;
    }
  }
});

// 搜索专辑
const searchTracks = (query) => {
  if (!trackOptions.value.length) {
    fetchUserAlbums();
    return;
  }
  
  if (query) {
    return trackOptions.value.filter(track =>
      track.title.toLowerCase().includes(query.toLowerCase())
    );
  } else {
    return trackOptions.value;
  }
};

// 选择专辑
const selectTrack = (track) => {
  form.trackId = track.id;
  searchQuery.value = track.title; // 更新搜索框显示选中的专辑标题
  onTrackSelect(track.id);
};

const onTrackSelect = (trackId, silent = false) => {
  const selectedTrack = trackOptions.value.find(track => track.id === trackId);
  if (selectedTrack) {
    selectedAlbumCover.value = selectedTrack.coverUrl;
    selectedAlbumTitle.value = selectedTrack.title;
    if (!silent) {
      // 重置平台选择
      form.platform = '';
      // 重置文件上传
      removeDynamicCover();
      removeVerticalCover();
    }
  }
};

// 已移除视频压缩函数

// 处理动态封面变更
const handleDynamicCoverChange = async (file) => {
  if (!file || !file.raw) {
    form.dynamicCover = null;
    return;
  }
  
  const fileType = file.raw.type;
  if (fileType !== 'video/mp4' && fileType !== 'video/quicktime') {
    ElMessage.error('仅支持上传 MP4/MOV 格式的视频！');
    form.dynamicCover = null;
    return;
  }
  
  // 检查文件大小
  const maxSize = 100 * 1024 * 1024; // 100MB
  if (file.raw.size > maxSize) {
    ElMessage.error('文件大小超过100MB，请使用更小的视频文件');
    form.dynamicCover = null;
    return;
  }
  
  try {
    // 如果是苹果音乐平台，进行额外的格式验证
    if (form.platform === 'applemusic') {
      try {
        // 显示验证中提示
        ElMessage.info('正在验证视频是否符合苹果音乐规范...');
        
        // 验证视频是否符合苹果音乐动态封面要求
        const validationResult = await validateAppleMusicCover(file.raw, { aspectRatio: '1:1' });
        
        // 显示警告信息
        if (validationResult.warnings && validationResult.warnings.length > 0) {
          validationResult.warnings.forEach(warning => {
            ElMessage.warning(warning);
          });
        }
        
        // 如果验证不通过，显示错误信息
        if (!validationResult.valid) {
          ElMessage.error(validationResult.message);
          form.dynamicCover = null;
          return;
        }
        
        // 验证通过，显示视频详情
        console.log('视频详情:', validationResult.details);
        ElMessage.success('视频符合苹果音乐动态封面规范');
      } catch (validationError) {
        console.error('视频验证失败:', validationError);
        ElMessage.error(validationError.message || '视频验证失败');
        form.dynamicCover = null;
        return;
      }
    }
    
    // 直接使用原始文件，不进行压缩
    form.dynamicCover = URL.createObjectURL(file.raw);
    form.dynamicCoverFile = file;
  } catch (error) {
    console.error('处理视频文件失败:', error);
    ElMessage.error('处理视频文件失败，请重试');
    form.dynamicCover = null;
  }
};

// 处理竖版封面变更
const handleVerticalCoverChange = async (file) => {
  if (!file || !file.raw) {
    form.verticalCover = null;
    return;
  }
  
  const fileType = file.raw.type;
  if (fileType !== 'video/mp4' && fileType !== 'video/quicktime') {
    ElMessage.error('仅支持上传 MP4/MOV 格式的视频！');
    form.verticalCover = null;
    return;
  }
  
  // 检查文件大小
  const maxSize = 100 * 1024 * 1024; // 100MB
  if (file.raw.size > maxSize) {
    ElMessage.error('文件大小超过100MB，请使用更小的视频文件');
    form.verticalCover = null;
    return;
  }
  
  try {
    // 如果是苹果音乐平台，进行额外的格式验证
    if (form.platform === 'applemusic') {
      try {
        // 显示验证中提示
        ElMessage.info('正在验证竖版视频是否符合苹果音乐规范...');
        
        // 验证视频是否符合苹果音乐动态封面要求
        const validationResult = await validateAppleMusicCover(file.raw, { aspectRatio: '3:4' });
        
        // 显示警告信息
        if (validationResult.warnings && validationResult.warnings.length > 0) {
          validationResult.warnings.forEach(warning => {
            ElMessage.warning(warning);
          });
        }
        
        // 如果验证不通过，显示错误信息
        if (!validationResult.valid) {
          ElMessage.error(validationResult.message);
          form.verticalCover = null;
          return;
        }
        
        // 验证通过，显示视频详情
        console.log('竖版视频详情:', validationResult.details);
        ElMessage.success('竖版视频符合苹果音乐动态封面规范');
      } catch (validationError) {
        console.error('竖版视频验证失败:', validationError);
        ElMessage.error(validationError.message || '竖版视频验证失败');
        form.verticalCover = null;
        return;
      }
    }
    
    // 直接使用原始文件，不进行压缩
    form.verticalCover = URL.createObjectURL(file.raw);
    form.verticalCoverFile = file;
  } catch (error) {
    console.error('处理竖版视频文件失败:', error);
    ElMessage.error('处理竖版视频文件失败，请重试');
    form.verticalCover = null;
  }
};

// 移除动态封面
const removeDynamicCover = () => {
  if (form.dynamicCover) {
    URL.revokeObjectURL(form.dynamicCover);
    form.dynamicCover = null;
    form.dynamicCoverFile = null;
  }
};

// 移除竖版封面
const removeVerticalCover = () => {
  if (form.verticalCover) {
    URL.revokeObjectURL(form.verticalCover);
    form.verticalCover = null;
    form.verticalCoverFile = null;
  }
};

// 视频预览控制
const isPlaying = ref(false);
const isVerticalPlaying = ref(false);

// 切换动态封面视频播放
const toggleVideoPlay = () => {
  const video = previewVideo.value;
  if (video) {
    if (video.paused) {
      video.play();
      isPlaying.value = true;
    } else {
      video.pause();
      isPlaying.value = false;
    }
  }
};

// 切换竖版封面视频播放
const toggleVerticalVideoPlay = () => {
  const video = previewVerticalVideo.value;
  if (video) {
    if (video.paused) {
      video.play();
      isVerticalPlaying.value = true;
    } else {
      video.pause();
      isVerticalPlaying.value = false;
    }
  }
};

// 处理视频加载
const handleVideoLoad = () => {
  const video = previewVideo.value;
  if (video) {
    // 检查视频比例
    const aspectRatio = video.videoWidth / video.videoHeight;
    
    // 检查分辨率
    const minResolution = 3840 * 0.9; // 允许10%的误差
    
    if (Math.abs(aspectRatio - 1) > 0.05) {
      ElMessage.warning(`视频的宽高比不是1:1 (当前: ${aspectRatio.toFixed(2)})，这可能导致平台拒绝您的动态封面。`);
    }
    
    if (video.videoWidth < minResolution || video.videoHeight < minResolution) {
      ElMessage.warning(`视频分辨率低于推荐值 (3840x3840)，当前: ${video.videoWidth}x${video.videoHeight}`);
    }
    
    // 检查时长
    if (video.duration < 8 || video.duration > 20) {
      ElMessage.warning(`视频时长应在8-20秒之间，当前: ${video.duration.toFixed(1)}秒`);
    }
    
    // 检测帧率
    if (form.platform === 'applemusic') {
      // 这里我们不再需要自己实现帧率检测，而是使用validateAppleMusicCover中的检测结果
      // 帧率信息会在验证过程中显示
      console.log('视频信息:', {
        宽度: video.videoWidth,
        高度: video.videoHeight,
        比例: aspectRatio.toFixed(2),
        时长: video.duration.toFixed(1) + '秒'
      });
    } else {
      // 显示视频信息（不包含帧率）
      console.log('视频信息:', {
        宽度: video.videoWidth,
        高度: video.videoHeight,
        比例: aspectRatio.toFixed(2),
        时长: video.duration.toFixed(1) + '秒'
      });
    }
  }
};

// 处理竖版视频加载
const handleVerticalVideoLoad = () => {
  const video = previewVerticalVideo.value;
  if (video) {
    // 检查视频比例
    const aspectRatio = video.videoWidth / video.videoHeight;
    const expectedRatio = 3/4; // 0.75
    
    // 检查分辨率
    const minWidth = 2048 * 0.9; // 允许10%的误差
    const minHeight = 2732 * 0.9;
    
    if (Math.abs(aspectRatio - expectedRatio) > 0.05) {
      ElMessage.warning(`视频的宽高比不是3:4 (当前: ${aspectRatio.toFixed(2)})，这可能导致平台拒绝您的动态封面。`);
    }
    
    if (video.videoWidth < minWidth || video.videoHeight < minHeight) {
      ElMessage.warning(`视频分辨率低于推荐值 (2048x2732)，当前: ${video.videoWidth}x${video.videoHeight}`);
    }
    
    // 检查时长
    if (video.duration < 8 || video.duration > 20) {
      ElMessage.warning(`视频时长应在8-20秒之间，当前: ${video.duration.toFixed(1)}秒`);
    }
    
    // 检测帧率
    if (form.platform === 'applemusic') {
      // 这里我们不再需要自己实现帧率检测，而是使用validateAppleMusicCover中的检测结果
      // 帧率信息会在验证过程中显示
      console.log('竖版视频信息:', {
        宽度: video.videoWidth,
        高度: video.videoHeight,
        比例: aspectRatio.toFixed(2),
        时长: video.duration.toFixed(1) + '秒'
      });
    } else {
      // 显示视频信息（不包含帧率）
      console.log('竖版视频信息:', {
        宽度: video.videoWidth,
        高度: video.videoHeight,
        比例: aspectRatio.toFixed(2),
        时长: video.duration.toFixed(1) + '秒'
      });
    }
  }
};

// 手机端触发上传方法
const triggerDynamicCoverUpload = () => {
  const uploadInput = document.createElement('input');
  uploadInput.type = 'file';
  uploadInput.accept = 'video/mp4,video/webm';
  uploadInput.onchange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      handleDynamicCoverChange({ raw: file });
    }
  };
  uploadInput.click();
};

const triggerVerticalCoverUpload = () => {
  const uploadInput = document.createElement('input');
  uploadInput.type = 'file';
  uploadInput.accept = 'video/mp4,video/webm';
  uploadInput.onchange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      handleVerticalCoverChange({ raw: file });
    }
  };
  uploadInput.click();
};

// 手机端替换视频方法
const handleReplaceDynamicCover = () => {
  removeDynamicCover();
  setTimeout(() => {
    triggerDynamicCoverUpload();
  }, 100);
};

const handleReplaceVerticalCover = () => {
  removeVerticalCover();
  setTimeout(() => {
    triggerVerticalCoverUpload();
  }, 100);
};

// 添加备用的文件上传方法
const uploadFileWithXHR = (file, isPortrait = false) => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append('file', file);
    
    // 监听上传进度
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        const percentCompleted = Math.round((event.loaded * 100) / event.total);
        console.log(`XHR上传进度: ${percentCompleted}%`);
      }
    });
    
    // 监听完成事件
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          resolve(response);
        } catch (error) {
          reject(new Error('解析响应失败'));
        }
      } else {
        reject(new Error(`上传失败，状态码: ${xhr.status}`));
      }
    });
    
    // 监听错误事件
    xhr.addEventListener('error', () => {
      reject(new Error('网络错误'));
    });
    
    // 监听中止事件
    xhr.addEventListener('abort', () => {
      reject(new Error('上传被中止'));
    });
    
    // 打开连接
    xhr.open('POST', `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'}/dynamic-cover-requests/upload?isPortrait=${isPortrait}`, true);
    
    // 设置授权头
    const userStore = useUserStore();
    if (userStore.token) {
      xhr.setRequestHeader('Authorization', `Bearer ${userStore.token}`);
    }
    
    // 发送请求
    xhr.send(formData);
  });
};

// 分片上传文件 - 使用Base64编码
const uploadChunkedBase64 = (file, isPortrait = false) => {
  return new Promise(async (resolve, reject) => {
    try {
      // 文件信息
      console.log(`开始分片上传文件: ${file.name}, 大小: ${file.size} 字节, 类型: ${file.type}`);
      
      // 分片大小：1MB (降低分片大小以提高可靠性)
      const CHUNK_SIZE = 1 * 1024 * 1024; 
      const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
      console.log(`文件将被分为 ${totalChunks} 个分片上传`);
      
      // 创建唯一上传ID
      const uploadId = Date.now().toString(36) + Math.random().toString(36).substring(2);
      
      // 读取文件为ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      
      // 上传每个分片
      let uploadedChunks = 0;
      let filePath = null;
      
      // 更新上传进度
      const updateProgress = (current, total) => {
        const progress = Math.round((current / total) * 100);
        console.log(`上传进度: ${progress}%`);
        uploadProgress.value = progress;
        uploadProgressVisible.value = true;
        uploadProgressText.value = isPortrait ? '正在上传竖版封面...' : '正在上传正方形封面...';
      };
      
      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        // 计算当前分片的起始位置和结束位置
        const start = chunkIndex * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunkSize = end - start;
        
        // 提取当前分片数据
        const chunk = arrayBuffer.slice(start, end);
        
        // 转换为Base64
        const base64Chunk = await blobToBase64(new Blob([chunk]));
        
        // 准备上传数据
        const chunkData = {
          fileName: file.name,
          fileType: file.type,
          uploadId: uploadId,
          chunkIndex: chunkIndex,
          totalChunks: totalChunks,
          isLastChunk: chunkIndex === totalChunks - 1,
          isPortrait: isPortrait,
          base64Data: base64Chunk,
          fileSize: file.size
        };
        
        try {
          // 上传当前分片
          console.log(`上传分片 ${chunkIndex + 1}/${totalChunks}`);
          
          // 添加重试逻辑
          let retries = 0;
          const maxRetries = 3;
          let success = false;
          let response;
          
          while (retries < maxRetries && !success) {
            try {
              if (retries > 0) {
                console.log(`重试分片 ${chunkIndex + 1} 上传，第 ${retries} 次尝试`);
              }
              
              response = await dynamicCoverService.uploadChunkedBase64(chunkData);
              success = true;
            } catch (retryError) {
              retries++;
              if (retries >= maxRetries) {
                throw retryError;
              }
              // 等待一段时间再重试
              await new Promise(r => setTimeout(r, 1000 * retries));
            }
          }
          
          // 更新进度
          uploadedChunks++;
          updateProgress(uploadedChunks, totalChunks);
          
          // 如果是最后一个分片，保存返回的文件路径
          if (chunkData.isLastChunk && success) {
            filePath = response.data.filePath;
          }
        } catch (error) {
          console.error(`分片 ${chunkIndex + 1} 上传失败:`, error);
          
          // 显示详细错误信息
          if (error.response && error.response.data) {
            const errorData = error.response.data;
            console.error('服务器错误详情:', errorData);
            ElMessage.error(`上传失败: ${errorData.message || '服务器错误'}`);
            if (errorData.detail) {
              ElMessage.warning(errorData.detail);
            }
          } else {
            ElMessage.error(`上传失败: ${error.message || '网络错误'}`);
          }
          
          uploadProgressVisible.value = false;
          reject(error);
          return;
        }
      }
      
      // 所有分片上传完成
      if (filePath) {
        console.log(`文件上传完成，服务器路径: ${filePath}`);
        // 延迟隐藏进度条，让用户看到100%
        setTimeout(() => {
          uploadProgressVisible.value = false;
        }, 500);
        resolve({ filePath, isPortrait });
      } else {
        uploadProgressVisible.value = false;
        reject(new Error('文件上传完成但未返回文件路径'));
      }
    } catch (error) {
      console.error('文件上传过程中发生错误:', error);
      uploadProgressVisible.value = false;
      reject(error);
    }
  });
};

// 将Blob转换为Base64
const blobToBase64 = (blob) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

// 在组件卸载前释放资源
onBeforeUnmount(() => {
  if (form.dynamicCover) {
    URL.revokeObjectURL(form.dynamicCover);
  }
  if (form.verticalCover) {
    URL.revokeObjectURL(form.verticalCover);
  }
});

// 提交表单
const submitForm = () => {
  formRef.value.validate(async (valid) => {
    if (valid && canSubmit.value) { // 使用 canSubmit 计算属性
      ElMessageBox.confirm(
        `请确认您的视频符合${getPlatformName(form.platform)}平台的所有格式要求。`,
        '提交确认',
        {
          confirmButtonText: '确认提交',
          cancelButtonText: '取消',
          type: 'warning'
        }
      ).then(async () => {
        submitting.value = true;
        try {
          // 如果是重新提交
          if (isResubmitting.value) {
            await handleUpdateRequest();
          } else {
            // 如果是新申请
            await handleCreateRequest();
          }
        } catch (error) {
          console.error('提交申请失败:', error);
          const message = error.response?.data?.message || '提交申请失败，请稍后重试';
          ElMessage.error(message);
        } finally {
          submitting.value = false;
        }
      }).catch(() => {
        ElMessage.info('已取消提交');
      });
    } else {
      ElMessage.error('请填写所有必填项并上传所需文件。');
    }
  });
};

// 处理创建新申请
const handleCreateRequest = async () => {
  let filePath, portraitFilePath;

  // 上传正方形文件
  if (form.dynamicCoverFile) {
    filePath = (await uploadChunkedBase64(form.dynamicCoverFile.raw, false)).filePath;
  }

  // 如果是苹果音乐并且有竖版封面，则上传竖版封面
  if (form.platform === 'applemusic' && form.verticalCoverFile) {
    portraitFilePath = (await uploadChunkedBase64(form.verticalCoverFile.raw, true)).filePath;
  }

  const requestData = {
    trackId: form.trackId,
    platform: form.platform,
    filePath,
    portraitFilePath
  };

  await dynamicCoverService.createDynamicCoverRequest(requestData);
  ElMessage.success('您的申请已成功提交！');
  router.push('/user-center/dynamic-covers');
};

// 处理更新申请
const handleUpdateRequest = async () => {
  const requestData = {
    resubmitId: resubmitId.value,
    replaceType: replaceType.value
  };

  // 根据替换类型上传文件
  if (replaceType.value === 'square' && form.dynamicCoverFile) {
    requestData.filePath = (await uploadChunkedBase64(form.dynamicCoverFile.raw, false)).filePath;
  } else if (replaceType.value === 'portrait' && form.verticalCoverFile) {
    requestData.portraitFilePath = (await uploadChunkedBase64(form.verticalCoverFile.raw, true)).filePath;
  } else if (!replaceType.value) {
    // 重新提交整个申请
    if (form.dynamicCoverFile) {
      requestData.filePath = (await uploadChunkedBase64(form.dynamicCoverFile.raw, false)).filePath;
    }
    if (form.platform === 'applemusic' && form.verticalCoverFile) {
      requestData.portraitFilePath = (await uploadChunkedBase64(form.verticalCoverFile.raw, true)).filePath;
    }
  }

  await dynamicCoverService.updateDynamicCoverFile(requestData);
  ElMessage.success('您的申请已更新并重新提交审核！');
  router.push('/user-center/dynamic-covers');
};

// 重置表单
const resetForm = () => {
  formRef.value.resetFields();
  form.dynamicCoverFile = null;
  form.verticalCoverFile = null;
  form.platform = '';
  selectedAlbumCover.value = '';
  selectedAlbumTitle.value = '';
  removeDynamicCover();
  removeVerticalCover();
  currentStep.value = 0; // 重置到第一步
};

// 在需要显示安全区域的地方添加覆盖图
const showSafeZoneOverlay = ref(false);

// 在组件的data部分添加
const toggleSafeZoneOverlay = () => {
  showSafeZoneOverlay.value = !showSafeZoneOverlay.value;
};

// 放大查看视频
const openEnlargedVideo = (src, isPortrait = false) => {
  // 确保URL没有双斜杠问题
  enlargedVideo.src = normalizeUrl(src);
  enlargedVideo.isPortrait = isPortrait;
  enlargedVideo.show = true;
};

// 关闭放大查看
const closeEnlargedVideo = () => {
  enlargedVideo.show = false;
};
</script>

<style scoped>
/* Martin Garrix 白色系简约直角设计语言 */
.request-form-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 20px;
  font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", Helvetica, Arial, sans-serif;
  background-color: #ffffff;
  color: #000000;
  min-height: 100vh;
  letter-spacing: -0.02em;
}

/* 页面标题区域 */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 40px;
}

.header-main {
  flex: 1;
}

.header-actions {
  display: flex;
  align-items: center;
}

.garrix-btn {
  background: none;
  border: 1px solid #000;
  color: #000;
  font-weight: 600;
  padding: 10px 16px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 8px;
}

.garrix-btn:hover {
  background-color: #000;
  color: #fff;
  transform: translate(-2px, -2px);
  box-shadow: 2px 2px 0 rgba(0, 0, 0, 0.1);
}

.page-title {
  font-size: 32px;
  font-weight: 700;
  margin: 12px 0 8px;
  color: #000000;
  letter-spacing: -0.04em;
  text-transform: uppercase;
}

.subtitle {
  font-size: 16px;
  color: #666666;
  margin: 0;
  letter-spacing: -0.01em;
}

.page-divider {
  height: 1px;
  background-color: #e0e0e0;
  margin: 30px 0;
}

/* 步骤进度条样式 */
.steps-container {
  margin: 60px 0;
}

:deep(.el-steps) {
  --el-step-icon-size: 40px;
}

:deep(.el-step__title) {
  font-size: 16px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
}

:deep(.el-step__description) {
  font-size: 13px;
  color: #666666;
}

:deep(.el-step__icon.is-text) {
  border: 1px solid #000;
  background: #fff;
  font-weight: 600;
  transition: all 0.3s;
}

:deep(.el-step__icon.is-text.is-active) {
  background: #000;
  color: #fff;
}

:deep(.el-step__line) {
  background-color: #000000;
  height: 1px;
}

/* 表单卡片样式 */
.form-section {
  max-width: 1000px;
  margin: 0 auto;
}

.form-card {
  background: #ffffff;
  padding: 30px;
  margin-bottom: 40px;
  box-shadow: none;
  border: 1px solid #dcdfe6;
  transition: all 0.2s;
}

.form-card:hover {
  box-shadow: 8px 8px 0 rgba(0, 0, 0, 1);
  transform: translate(-4px, -4px);
}

:deep(.el-card) {
  border: 1px solid #dcdfe6 !important;
  border-radius: 0 !important;
  box-shadow: none !important;
  transition: all 0.2s !important;
  overflow: visible !important;
}

:deep(.el-card:hover) {
  box-shadow: 8px 8px 0 #000 !important;
  transform: translate(-4px, -4px);
}

:deep(.el-card__header) {
  padding: 20px 24px !important;
  border-bottom: 1px solid #dcdfe6 !important;
  background-color: #f8f8f8;
}

:deep(.el-card__body) {
  padding: 30px !important;
}

/* 专辑选择样式 */
.album-search-form-item {
  display: flex;
  flex-direction: column;
}

.album-search-form-item :deep(.el-form-item__label) {
  margin-bottom: 10px;
  text-align: left;
  float: none;
  line-height: 1.5;
  font-size: 16px;
  font-weight: 600;
}

.album-search-form-item :deep(.el-form-item__content) {
  margin-left: 0 !important;
  width: 100%;
}

.album-search-dropdown {
  width: 100%;
}

.album-option {
  display: flex;
  align-items: center;
  gap: 16px;
  width: 100%;
}

.album-thumbnail {
  width: 40px;
  height: 40px;
  object-fit: cover;
  border: 1px solid #dcdfe6;
  flex-shrink: 0;
}

.item-info {
  flex: 1;
  min-width: 0; /* 确保文本可以正确截断 */
}

.item-title {
  font-weight: 600;
  font-size: 15px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.selected-album {
  margin-bottom: 30px;
  padding: 24px;
  background: #f9f9f9;
  border: 1px solid #dcdfe6;
  display: flex;
  align-items: center;
  gap: 20px;
}

.selected-album h3 {
  font-size: 18px;
  margin: 0;
  font-weight: 600;
  color: #000;
  text-transform: uppercase;
}

.album-preview {
  width: 80px;
  height: 80px;
  border: 1px solid #dcdfe6;
  overflow: hidden;
}

.album-cover-preview {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* 第三步选择信息汇总 */
.selected-summary {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 40px;
  padding: 20px;
  background-color: #f8f8f8;
  border: 1px solid #dcdfe6;
  margin-bottom: 30px;
  flex-wrap: wrap;
}

.selected-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.summary-label {
  font-weight: 700;
  color: #000;
  text-transform: uppercase;
  font-size: 14px;
}

.summary-value {
  color: #000;
  font-weight: 500;
  font-size: 14px;
}

.platform-preview-icon {
  width: 24px;
  height: 24px;
  object-fit: contain;
}

/* 平台要求信息样式 - 优化为更紧凑的展示 */
.requirements-panel {
  background: #ffffff;
  padding: 24px;
  margin-bottom: 30px;
  border: 1px solid #dcdfe6;
}

.requirements-panel h3 {
  font-size: 18px;
  margin-bottom: 24px;
  color: #000;
  text-align: center;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
}

/* 平台特殊要求 */
.platform-specific-reqs {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 20px;
  padding-bottom: 20px;
  border-bottom: 1px solid #dcdfe6;
}

/* 通用要求 */
.common-requirements {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.req-item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: #ffffff;
  border: 1px solid #000;
  font-size: 13px;
  color: #000;
  font-weight: 500;
  margin: 4px;
}

.req-item .el-icon {
  font-size: 14px;
  color: #000;
}

.req-item.important {
  background: #000;
  color: #fff;
  font-weight: 600;
}

.req-item.important .el-icon {
  color: #fff;
}

/* 平台选择样式 */
.platform-radio-group {
  margin-top: 15px;
  max-width: 600px;
}

.platform-option {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 15px;
  padding: 10px;
  width: 100%;
}

.platform-icon {
  width: 24px;
  height: 24px;
  object-fit: contain;
}

.platform-option span {
  font-size: 14px;
  font-weight: 500;
}

.card-header span {
  font-family: 'Helvetica Neue', Arial, sans-serif;
  font-weight: 700;
  font-size: 18px;
  color: #000;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.service-intro {
  color: #333;
  line-height: 1.7;
  font-size: 16px;
  margin-bottom: 30px;
}

.back-link {
  color: #000;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 12px;
  transition: all 0.2s ease;
  text-transform: uppercase;
  font-size: 14px;
  letter-spacing: 1px;
}

.back-link:hover {
  transform: translateX(-5px);
}

/* 步骤操作按钮 */
.step-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 40px;
  gap: 20px;
}

.step-actions .el-button {
  min-width: 120px;
  height: 46px;
  font-weight: 600;
  letter-spacing: 1px;
  text-transform: uppercase;
}

:deep(.el-button) {
  border: 1px solid #000 !important;
  border-radius: 0 !important;
  padding: 12px 24px !important;
  transition: all 0.2s !important;
}

:deep(.el-button:hover) {
  transform: translate(-4px, -4px) !important;
  box-shadow: 4px 4px 0 #000 !important;
}

:deep(.el-button--primary) {
  background-color: #000 !important;
  color: #fff !important;
}

:deep(.el-button--default) {
  background-color: #fff !important;
  color: #000 !important;
}

/* 上传区域样式优化 */
.upload-area-compact {
  display: flex;
  flex-wrap: wrap;
  gap: 30px;
}

.cover-upload-section {
  background: #fff;
  padding: 24px;
  flex: 1;
  min-width: 300px;
  border: 1px solid #dcdfe6;
  margin-bottom: 30px;
}

.cover-upload-section.full-width {
  width: 100%;
  flex-basis: 100%;
}

.cover-header {
  display: flex;
  align-items: center;
  margin-bottom: 24px;
}

.cover-header h4 {
  font-size: 18px;
  font-weight: 700;
  color: #000;
  margin: 0;
  letter-spacing: 1px;
  text-transform: uppercase;
  display: flex;
  align-items: center;
  gap: 8px;
}

.ratio-badge {
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  background: #000;
  padding: 4px 10px;
  margin-left: 10px;
}

.cover-container {
  display: flex;
  gap: 30px;
  justify-content: center;
}

.static-cover, .dynamic-cover {
  flex: 1;
  max-width: 220px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;
}

.static-cover {
  aspect-ratio: 1;
  position: relative;
  overflow: hidden;
  border: 1px solid #dcdfe6;
}

.static-cover.vertical {
  aspect-ratio: 3/4;
}

.static-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.dynamic-cover {
  width: 100%;
}

.dynamic-cover .upload-component {
  width: 100%;
  aspect-ratio: 1;
}

.dynamic-cover.vertical .upload-component {
  aspect-ratio: 3/4;
}

:deep(.el-upload.el-upload--text) {
  width: 100%;
  height: 100%;
  border: 1px solid #dcdfe6;
  background: #fff;
  transition: all 0.2s;
}

:deep(.el-upload.el-upload--text:hover) {
  transform: translate(-4px, -4px);
  box-shadow: 4px 4px 0 rgba(0, 0, 0, 1);
}

:deep(.el-upload-dragger) {
  width: 100%;
  height: 100%;
  border: none;
  border-radius: 0;
  background-color: #fff;
  padding: 0;
}

:deep(.el-upload-dragger:hover) {
  background-color: #f8f8f8;
}

.upload-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.upload-placeholder.vertical {
  aspect-ratio: 3/4;
}

.upload-icon {
  font-size: 36px;
  color: #000;
  margin-bottom: 16px;
}

.upload-text {
  font-size: 16px;
  color: #000;
  margin-bottom: 8px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.upload-hint {
  display: block;
  margin-top: 8px;
  font-size: 14px;
  color: #666;
}

.video-preview-container {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  border: 1px solid #dcdfe6;
}

.preview-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  background: #000;
}

.preview-video.vertical {
  aspect-ratio: 3/4;
}

.video-controls {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 12px;
  opacity: 0;
  transition: opacity 0.3s;
}

.video-preview-container:hover .video-controls {
  opacity: 1;
}

.cover-label {
  font-size: 14px;
  color: #000;
  text-align: center;
  margin-top: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* 全宽选择器 */
.full-width {
  width: 100%;
}

/* 输入框样式 */
:deep(.el-input__wrapper),
:deep(.el-textarea__wrapper) {
  box-shadow: none !important;
  border: 1px solid #000 !important;
  border-radius: 0 !important;
  background: #fff !important;
  transition: all 0.2s;
}

:deep(.el-input__wrapper:hover),
:deep(.el-textarea__wrapper:hover) {
  transform: translate(-4px, -4px);
  box-shadow: 4px 4px 0 rgba(0, 0, 0, 1) !important;
}

:deep(.el-input__wrapper.is-focus),
:deep(.el-textarea__wrapper.is-focus) {
  transform: translate(-4px, -4px);
  box-shadow: 4px 4px 0 rgba(0, 0, 0, 1) !important;
}

:deep(.el-input__inner) {
  font-weight: 500;
  color: #000;
}

:deep(.el-select-dropdown__item.selected) {
  color: #000;
  font-weight: 600;
}

:deep(.el-select-dropdown__item) {
  padding: 18px 20px;
  height: 50px;
}

:deep(.el-select-dropdown__item.hover) {
  background-color: #f8f8f8;
}

/* 手机端控制按钮 */
.mobile-video-controls {
  display: none;
}

.mobile-upload-btn {
  display: none;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .request-form-container {
    padding: 20px;
  }

  .page-title {
    font-size: 24px;
  }

  :deep(.el-step__title) {
    font-size: 14px;
  }
  :deep(.el-step__description) {
    font-size: 12px;
  }

  .card-header span {
    font-size: 16px;
  }

  .page-header {
    flex-direction: column;
    gap: 16px;
  }
  
  .header-actions {
    width: 100%;
  }
  
  .header-actions .garrix-btn {
    width: 100%;
    justify-content: center;
  }
  
  .platform-radio-group {
    flex-direction: column;
    gap: 16px;
  }

  .platform-radio-group .el-radio {
    width: 100%;
    margin-right: 0;
  }

  .el-radio.is-checked .platform-option {
    transform: none;
    box-shadow: none;
  }

  .platform-option {
    width: 100%;
    box-sizing: border-box;
    padding: 15px;
    justify-content: center;
  }
  
  .cover-container {
    flex-direction: column;
    align-items: center;
  }

  .static-cover, .dynamic-cover {
    max-width: 100%;
    width: 100%;
  }

  .step-actions {
    flex-direction: column;
    gap: 16px;
  }

  .step-actions .el-button {
    width: 100%;
  }

  .upload-area-compact {
    flex-direction: column;
  }
  
  /* 手机端视频控制按钮 */
  .mobile-video-controls {
    display: flex;
    margin-top: 24px;
    justify-content: center;
    gap: 12px;
    flex-wrap: wrap;
  }
  
  .mobile-control-btn {
    flex: 1;
    min-width: 70px;
    font-size: 14px;
    padding: 10px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    font-weight: 600;
  }
  
  /* 在手机端隐藏悬浮控制按钮 */
  .video-preview-container:hover .video-controls {
    opacity: 0;
  }
  
  /* 手机端上传按钮 */
  .mobile-upload-btn {
    display: block;
    margin-top: 20px;
    width: 100%;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    font-weight: 600;
  }

  /* 移动端平台要求样式 */
  .requirements-panel {
    padding: 16px;
  }

  .platform-specific-reqs, .common-requirements {
    gap: 8px;
  }

  .req-item {
    font-size: 12px;
    padding: 6px 12px;
  }
  
  .selected-summary {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }
  
  /* 专辑搜索表单项样式 */
  .album-search-form-item :deep(.el-form-item__label) {
    font-size: 14px;
    margin-bottom: 8px;
  }
  
  .album-option {
    gap: 10px;
  }
  
  .album-thumbnail {
    width: 32px;
    height: 32px;
  }
  
  .item-title {
    font-size: 14px;
  }
}

@media (max-width: 480px) {
  .request-form-container {
    padding: 15px;
  }
  
  .page-title {
    font-size: 20px;
  }
  
  .subtitle {
    font-size: 14px;
  }
  
  :deep(.el-card__body) {
    padding: 20px !important;
  }
  
  :deep(.el-card__header) {
    padding: 15px 20px !important;
  }
  
  .service-intro {
    font-size: 14px;
    margin-bottom: 20px;
  }
  
  .steps-container {
    margin: 30px 0;
  }
  
  :deep(.el-step__icon) {
    --el-step-icon-size: 30px;
  }
  
  :deep(.el-step__title) {
    font-size: 12px;
  }
  
  :deep(.el-step__description) {
    font-size: 10px;
  }
  
  .req-item {
    font-size: 11px;
    padding: 5px 10px;
  }
  
  .requirements-panel h3 {
    font-size: 16px;
    margin-bottom: 15px;
  }
  
  .album-search-form-item :deep(.el-form-item__label) {
    font-size: 13px;
  }
}

/* 安全区域覆盖图样式 */
.safe-zone-toggle {
  margin-left: auto;
  padding: 0;
  font-size: 14px;
}

.safe-zone-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 10;
  background-image: url('/images/ui/cover-limit.jpg');
  background-size: cover;
  background-position: center;
  opacity: 0.7;
}

.safe-zone-overlay.vertical {
  aspect-ratio: 3/4;
}

.video-preview-container {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  border: 1px solid #dcdfe6;
}

.existing-video-preview {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  border: 1px dashed #ccc;
  background-color: #f9f9f9;
}

.existing-video-preview.vertical {
  aspect-ratio: 3/4;
}

.existing-video-preview .preview-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.preview-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  color: white;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
  gap: 8px;
}

.preview-overlay .el-icon {
  font-size: 24px;
}

.dynamic-cover.is-disabled {
  pointer-events: none;
  opacity: 0.7;
}

/* 上传进度对话框样式 */
:deep(.upload-progress-dialog) {
  border: 2px solid #000;
  border-radius: 0;
  box-shadow: 5px 5px 0 rgba(0, 0, 0, 0.1);
  background-color: #fff;
  padding: 0;
}

:deep(.upload-progress-dialog .el-dialog__header) {
  padding: 15px;
  margin-right: 0;
  border-bottom: 1px solid #000;
  text-align: center;
}

:deep(.upload-progress-dialog .el-dialog__body) {
  padding: 20px;
}

.upload-progress-content {
  text-align: center;
}

.upload-progress-text {
  margin-top: 15px;
  font-size: 14px;
  color: #333;
}

:deep(.upload-progress-content .el-progress-bar__outer) {
  background-color: #f0f0f0;
  border: 1px solid #ddd;
  height: 12px !important;
}

:deep(.upload-progress-content .el-progress-bar__inner) {
  background-color: #000;
}
</style>

<style>
@media (max-width: 768px) {
  .album-select-popper .album-option {
    gap: 15px !important;
    min-height: 74px;
    align-items: center;
  }

  .album-select-popper .album-thumbnail {
    width: 44px !important;
    height: 44px !important;
  }

  .album-select-popper .album-title {
    font-size: 15px !important;
    white-space: normal !important;
    line-height: 1.4 !important;
  }
}
</style>
