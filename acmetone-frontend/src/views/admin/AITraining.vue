<template>
  <div class="ai-training-dark" ref="containerRef">
    <!-- Action Bar -->
    <div class="action-bar">
        <div class="action-bar-left">
            <el-button @click="toggleFullScreen" text>
                <el-icon><FullScreen /></el-icon>
                <span>{{ isFullScreen ? '退出全屏' : '全屏' }}</span>
            </el-button>
        </div>
        <div class="action-bar-right">
            <el-button type="primary" @click="generateImages" :loading="isGenerating" class="generate-btn">
              {{ isGenerating ? '生成中...' : '生成图像' }}
            </el-button>
        </div>
            </div>

    <el-row :gutter="20" class="main-layout">
      <!-- Controls Column -->
      <el-col :span="8" class="controls-column">
        <div class="controls-wrapper">
          <h2 class="section-title">生成设置</h2>
          <el-form :model="form" label-position="top">
             <el-form-item label="核心提示词">
              <el-input v-model="form.prompt" type="textarea" :rows="4" placeholder="一只宇航员猫在月球上钓鱼，数字艺术..."></el-input>
              <div class="prompt-actions">
                <el-button @click="handleAiWrite" :loading="isWritingLoading" text>AI 帮写</el-button>
                <el-tooltip 
                  content="资产库为空，请先生成并保存一些优质图片" 
                  :disabled="savedAssets.length > 0"
                  placement="top"
                  effect="dark"
                >
                  <div style="display: inline-block;">
                    <el-button 
                      @click="handleEnhancePrompt" 
                      :loading="isEnhancingLoading" 
                      :disabled="savedAssets.length === 0"
                      text
                    >灵感强化</el-button>
                  </div>
                </el-tooltip>
              </div>
            </el-form-item>
             <el-form-item label="艺术风格">
              <el-select v-model="form.style" placeholder="选择一个预设风格" style="width: 100%;">
                <el-option label="默认" value=""></el-option>
                <el-option label="电影感" value="cinematic"></el-option>
                <el-option label="动漫风" value="anime"></el-option>
                <el-option label="写实照片" value="photorealistic"></el-option>
                <el-option label="极简矢量" value="minimalist"></el-option>
              </el-select>
            </el-form-item>
             <el-form-item label="反向提示词">
              <el-input v-model="form.negative_prompt" type="textarea" :rows="2" placeholder="不希望出现的内容，例如：丑陋、畸形、水印..."></el-input>
            </el-form-item>
            
            <el-collapse v-model="activeCollapseName" class="advanced-settings">
              <el-collapse-item title="高级设置" name="advanced">
                <el-row :gutter="20">
                    <el-col :span="12">
                         <el-form-item label="参考图">
              <el-upload
                class="reference-uploader"
                action="#"
                :auto-upload="false"
                            :show-file-list="false"
                            :on-change="handleReferenceImageChange"
                            :before-upload="beforeImageUpload"
                            accept="image/jpeg,image/png"
              >
                            <div v-if="referenceImageBase64" class="reference-preview">
                                <img :src="referenceImageBase64" />
                                <div class="reference-actions">
                                    <el-icon @click.stop="handleReferenceImageRemove"><Close /></el-icon>
                </div>
                  </div>
                            <el-icon v-else><Plus /></el-icon>
              </el-upload>
            </el-form-item>
                    </el-col>
                    <el-col :span="12">
                        <el-form-item label="图片尺寸">
                          <el-select v-model="form.image_size" placeholder="选择尺寸">
                            <el-option label="1024x1024" value="1024x1024"></el-option>
                            <el-option label="512x512" value="512x512"></el-option>
                          </el-select>
                        </el-form-item>
                    </el-col>
                </el-row>
                <el-row :gutter="20">
                    <el-col :span="12">
                        <el-form-item label="生成数量">
                            <el-input-number v-model="form.batch_size" :min="1" :max="4" style="width: 100%;" />
                        </el-form-item>
                    </el-col>
                    <el-col :span="12">
                        <el-form-item label="随机种子">
                            <el-input v-model="form.seed" placeholder="留空则随机" clearable></el-input>
                        </el-form-item>
                    </el-col>
                </el-row>
                <el-form-item label="推理步数">
                  <el-slider v-model="form.num_inference_steps" :min="10" :max="50" show-input />
            </el-form-item>
                <el-form-item label="引导系数">
                  <el-slider v-model="form.guidance_scale" :min="1" :max="20" :step="0.5" show-input />
            </el-form-item>
              </el-collapse-item>
            </el-collapse>
          </el-form>
        </div>
      </el-col>

      <!-- Results Column -->
      <el-col :span="16" class="results-column">
        <div class="results-wrapper">
            <!-- Generation Results -->
            <div class="results-section">
                <div class="section-header">
                    <h2 class="section-title">生成结果</h2>
                     <div v-if="generationSeed" class="seed-display">
                        <el-tag type="info" size="small" effect="dark">种子: {{ generationSeed }}</el-tag>
                        <el-button text @click="reuseSeed(generationSeed)" class="reuse-seed-btn">使用此种子</el-button>
                    </div>
            </div>
          <div v-if="isGenerating" class="results-loading">
                    <el-row :gutter="10">
                    <el-col :span="6" v-for="i in form.batch_size" :key="i">
                        <el-skeleton-item variant="image" class="result-skeleton-item" />
                    </el-col>
                    </el-row>
          </div>
          <div v-else-if="!generatedImages.length" class="results-placeholder">
                    <el-icon><Picture /></el-icon>
                    <span>等待生成...</span>
          </div>
                <div v-else class="generated-gallery">
                    <el-row :gutter="10">
                    <el-col v-for="(image, index) in generatedImages" :key="index" :span="6">
                         <div class="generated-item">
                            <el-image :src="image.url" fit="cover" class="generated-image" lazy :preview-src-list="[image.url]"></el-image>
                  <div class="image-actions">
                                <el-button circle @click="saveAsset(image)">
                                    <el-icon><Star /></el-icon>
                                </el-button>
                  </div>
                </div>
              </el-col>
            </el-row>
                </div>
            </div>
    
            <!-- Asset Library -->
            <div class="library-section">
                <div class="section-header">
                    <h2 class="section-title">资产库</h2>
                    <el-button text @click="fetchAssets">
                        <el-icon><Refresh /></el-icon>
                    </el-button>
            </div>
          <div v-if="isLoadingAssets" class="assets-loading">
                    <el-skeleton :rows="3" animated />
          </div>
           <div v-else-if="!savedAssets.length" class="assets-placeholder">
                     <el-icon><FolderOpened /></el-icon>
                    <span>资产库为空</span>
          </div>
          <div v-else class="asset-gallery">
                    <div v-for="asset in savedAssets" :key="asset.id" class="asset-item">
                    <el-image :src="getStaticUrl(asset.image_path)" fit="cover" class="asset-image" lazy :preview-src-list="[getStaticUrl(asset.image_path)]"></el-image>
                        <div class="asset-overlay">
                        <p class="asset-prompt" @click="copyPrompt(asset.prompt)">{{ asset.prompt }}</p>
                            <div class="asset-seed" @click="reuseSeed(asset.seed)">
                                种子: {{asset.seed}}
                            </div>
                        </div>
                        <button @click="deleteAsset(asset.id)" class="delete-asset-btn">×</button>
                    </div>
                </div>
            </div>
          </div>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { Plus, Star, Refresh, Close, Picture, FolderOpened, FullScreen } from '@element-plus/icons-vue';
import axios from 'axios';
import { API_BASE_URL, STATIC_BASE_URL } from '@/config';
import { useUserStore } from '@/stores/user';
import aiChatService from '@/services/aiChatService.js';

const userStore = useUserStore();
const containerRef = ref(null);
const isFullScreen = ref(false);
const activeCollapseName = ref('advanced');

const form = ref({
  prompt: 'A cinematic shot of a an astronaut on a distant planet, epic sci-fi, breathtaking landscape, hyper-detailed, 8k',
  negative_prompt: 'blurry, low quality, text, watermark, signature',
  batch_size: 4,
  num_inference_steps: 30,
  guidance_scale: 7.5,
  image_size: '1024x1024',
  seed: '',
  style: 'photorealistic',
});

const referenceImageBase64 = ref(null);
const isGenerating = ref(false);
const isWritingLoading = ref(false);
const isEnhancingLoading = ref(false);
const generatedImages = ref([]);
const generationSeed = ref(null);

const savedAssets = ref([]);
const isLoadingAssets = ref(true);

const getStaticUrl = (relativePath) => {
    if (!relativePath) return '';
    return `${STATIC_BASE_URL}/${relativePath}`;
};

const copyPrompt = (promptText) => {
    navigator.clipboard.writeText(promptText).then(() => {
        ElMessage.success({ message: '提示词已复制', customClass: 'dark-message' });
    }).catch(err => {
        console.error('Could not copy text: ', err);
        ElMessage.error({ message: '复制失败', customClass: 'dark-message' });
    });
};

const reuseSeed = (seed) => {
  if (!seed) return;
  form.value.seed = seed;
  ElMessage.success({ message: `已应用种子: ${seed}`, customClass: 'dark-message' });
  activeCollapseName.value = 'advanced';
};

const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
        containerRef.value.requestFullscreen();
        isFullScreen.value = true;
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
            isFullScreen.value = false;
        }
    }
};

const beforeImageUpload = (rawFile) => {
  const isJpgOrPng = rawFile.type === 'image/jpeg' || rawFile.type === 'image/png';
  if (!isJpgOrPng) {
    ElMessage.error({ message: '参考图必须是 JPG/PNG 格式!', customClass: 'dark-message' });
  }
  return isJpgOrPng;
};

const handleReferenceImageChange = (file) => {
  const reader = new FileReader();
  reader.onload = (e) => {
    referenceImageBase64.value = e.target.result;
  };
  reader.readAsDataURL(file.raw);
};

const handleReferenceImageRemove = () => {
  referenceImageBase64.value = null;
};

const generateImages = async () => {
  if (!form.value.prompt) {
    ElMessage.warning({ message: '请输入核心提示词', customClass: 'dark-message' });
    return;
  }

  isGenerating.value = true;
  generatedImages.value = [];
  generationSeed.value = null;

  try {
    const payload = { ...form.value };
    if (referenceImageBase64.value) {
      payload.reference_image = referenceImageBase64.value;
  }
    if (!payload.seed) {
        delete payload.seed;
    }

    const response = await axios.post(`${API_BASE_URL}/ai/generate-for-training`, payload, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userStore.token}`,
      },
    });
    generatedImages.value = response.data.images;
    generationSeed.value = response.data.seed;
  } catch (error) {
    console.error('Error generating images:', error);
    ElMessage.error({ message: error.response?.data?.message || '图片生成失败', customClass: 'dark-message' });
  } finally {
    isGenerating.value = false;
  }
};

const handleAiWrite = async () => {
    if (!form.value.prompt) {
        ElMessage.warning({ message: '请先输入一些关键词', customClass: 'dark-message' });
        return;
    }
    isWritingLoading.value = true;
    try {
        const newPrompt = await aiChatService.generateCreativePrompt(form.value.prompt);
        if (typeof newPrompt === 'string' && newPrompt) {
            form.value.prompt = newPrompt;
            ElMessage.success({ message: 'AI 已生成新的提示词', customClass: 'dark-message' });
        } else {
            throw new Error('AI did not return a valid prompt string.');
        }
    } catch (error) {
        ElMessage.error({ message: 'AI帮写失败，请稍后再试', customClass: 'dark-message' });
    } finally {
        isWritingLoading.value = false;
    }
};

const handleEnhancePrompt = async () => {
    if (!form.value.prompt) {
        ElMessage.warning({ message: '请先输入一些关键词以获取灵感', customClass: 'dark-message' });
        return;
    }
    isEnhancingLoading.value = true;
    try {
        const newPrompt = await aiChatService.generateCreativePrompt(form.value.prompt);
        if (typeof newPrompt === 'string' && newPrompt) {
            form.value.prompt = newPrompt;
            ElMessage.success({ message: '灵感强化成功！', customClass: 'dark-message' });
        } else {
            throw new Error('AI did not return a valid prompt string.');
        }
    } catch (error) {
        console.error('Error enhancing prompt:', error);
        ElMessage.error({ message: '灵感强化失败，请稍后再试', customClass: 'dark-message' });
    } finally {
        isEnhancingLoading.value = false;
    }
};

const saveAsset = async (image) => {
  if (!image || !image.url) {
    ElMessage.error({ message: '无效的图片数据', customClass: 'dark-message' });
    return;
  }
  
    try {
    const assetData = {
            image_url: image.url,
            prompt: form.value.prompt,
            negative_prompt: form.value.negative_prompt,
            seed: generationSeed.value,
      num_inference_steps: form.value.num_inference_steps,
      guidance_scale: form.value.guidance_scale,
      model_name: "Kwai-Kolors/Kolors",
      style: form.value.style,
        };

    const response = await axios.post(`${API_BASE_URL}/ai/save-asset`, assetData, {
             headers: { 'Authorization': `Bearer ${userStore.token}` }
        });
    
    ElMessage.success({ message: '资产已成功保存！', customClass: 'dark-message' });
    savedAssets.value.unshift(response.data);

    } catch (error) {
        console.error('Error saving asset:', error);
    ElMessage.error({ message: error.response?.data?.message || '资产保存失败', customClass: 'dark-message' });
    }
};

const fetchAssets = async () => {
    isLoadingAssets.value = true;
    try {
    const response = await axios.get(`${API_BASE_URL}/ai/assets`, {
             headers: { 'Authorization': `Bearer ${userStore.token}` }
        });
        savedAssets.value = response.data;
    } catch (error) {
        console.error('Error fetching assets:', error);
    ElMessage.error({ message: '加载资产库失败', customClass: 'dark-message' });
    } finally {
        isLoadingAssets.value = false;
    }
};

const deleteAsset = async (assetId) => {
    if (confirm('您确定要删除这个资产吗？此操作无法撤销。')) {
        try {
            await axios.delete(`${API_BASE_URL}/ai/assets/${assetId}`, {
                headers: { 'Authorization': `Bearer ${userStore.token}` }
            });
            savedAssets.value = savedAssets.value.filter(asset => asset.id !== assetId);
            ElMessage.success({ message: '资产已成功删除', customClass: 'dark-message' });
        } catch (error) {
            console.error(`Error deleting asset ${assetId}:`, error);
            ElMessage.error({ message: '删除资产失败', customClass: 'dark-message' });
        }
    }
};

onMounted(() => {
  fetchAssets();

  document.addEventListener('fullscreenchange', () => {
    isFullScreen.value = !!document.fullscreenElement;
});
});
</script>

<style>
/* Global styles for dark theme messages */
.el-message.dark-message {
    background-color: #1a1a1a;
    border-color: #444;
}
.el-message.dark-message .el-message__content {
    color: #e0e0e0;
}
.el-message.dark-message .el-message__closeBtn {
    color: #e0e0e0;
}
</style>

<style scoped>
.ai-training-dark {
  background-color: #000;
  color: #e0e0e0;
  padding: 20px;
  height: calc(100vh - 100px); /* Adjust based on your layout's header height */
  font-family: 'Inter', sans-serif;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.action-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
  margin-bottom: 20px;
    flex-shrink: 0;
}

.action-bar-left .el-button, .action-bar-right .el-button {
    color: #a0a0a0;
}
.action-bar-left .el-button .el-icon {
    margin-right: 8px;
}

.generate-btn {
  background-color: #fff;
  color: #000;
  border: none;
  font-weight: 600;
  border-radius: 4px;
  letter-spacing: 0.5px;
}
.generate-btn:hover {
  background-color: #e0e0e0;
}

.main-layout {
  height: 100%;
  flex-grow: 1;
}

.controls-column, .results-column {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.controls-wrapper, .results-wrapper {
  background-color: #121212;
  border: 1px solid #222;
  border-radius: 8px;
  padding: 24px;
  height: 100%;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.results-wrapper {
    padding: 0;
    background-color: transparent;
    border: none;
}

.section-title {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 20px;
  letter-spacing: -0.5px;
  color: #fff;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px;
  padding-bottom: 20px;
}

.results-section, .library-section {
    background-color: #121212;
    border: 1px solid #222;
    border-radius: 8px;
    margin-bottom: 20px;
}

.library-section {
    flex-grow: 1;
    display: flex;
    flex-direction: column;
}

/* Form Styles */
:deep(.el-form-item__label) {
  color: #a0a0a0;
  font-size: 0.875rem;
}

:deep(.el-input__wrapper), :deep(.el-textarea__inner) {
  background-color: #1e1e1e !important;
  box-shadow: none !important;
  border: 1px solid #333 !important;
  color: #e0e0e0;
  border-radius: 4px;
}
:deep(.el-input__inner::placeholder), :deep(.el-textarea__inner::placeholder) {
  color: #666;
}

:deep(.el-select .el-input__wrapper) {
    width: 100%;
}

.prompt-actions {
  margin-top: 10px;
  display: flex;
  gap: 10px;
}
.prompt-actions .el-button {
  color: #a0a0a0;
}

/* Collapse */
:deep(.el-collapse) {
  border: none;
}
:deep(.el-collapse-item__header) {
  background-color: transparent;
  color: #fff;
  border: none;
  font-size: 1rem;
}
:deep(.el-collapse-item__wrap) {
  background-color: transparent;
  border: none;
}
:deep(.el-collapse-item__content) {
  padding-bottom: 0;
  color: #a0a0a0;
}

/* Slider Styles inspired by Garrix Theme */
:deep(.el-slider) {
  --el-slider-height: 4px;
}

:deep(.el-slider__runway) {
  background-color: #333;
  border-radius: 2px;
}

:deep(.el-slider__bar) {
  background-color: #fff;
  border-radius: 2px;
}

:deep(.el-slider__button) {
  width: 18px;
  height: 18px;
  border: 2px solid #fff;
  background-color: #000;
  transition: transform .2s ease-in-out;
}
:deep(.el-slider__button-wrapper:hover .el-slider__button) {
  transform: scale(1.1);
}

:deep(.el-slider .el-input-number) {
    width: 150px;
}

:deep(.el-slider .el-input-number .el-input__wrapper) {
    background-color: #1e1e1e !important;
    border: 1px solid #333 !important;
    box-shadow: none !important;
    padding: 0 40px !important;
    border-radius: 4px !important;
  height: 40px;
}

:deep(.el-slider .el-input-number__decrease),
:deep(.el-slider .el-input-number__increase) {
    background: transparent;
    border: 1px solid #888;
    color: #e0e0e0;
    width: 40px;
    height: 40px;
    border-radius: 0;
    transition: all 0.3s ease;
}

:deep(.el-slider .el-input-number__decrease) {
    left: 0;
    border-top-left-radius: 4px;
    border-bottom-left-radius: 4px;
    border-right: none;
}

:deep(.el-slider .el-input-number__increase) {
    right: 0;
    border-top-right-radius: 4px;
    border-bottom-right-radius: 4px;
    border-left: none;
}

:deep(.el-slider .el-input-number__decrease:hover),
:deep(.el-slider .el-input-number__increase:hover) {
  background-color: #fff;
  color: #000;
  border-color: #fff;
}
/* End of Slider Styles */

/* Uploader */
.reference-uploader :deep(.el-upload) {
    width: 100%;
    height: 100px;
    background-color: #1e1e1e;
    border: 1px dashed #444;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
}
.reference-uploader :deep(.el-upload .el-icon) {
    color: #666;
    font-size: 24px;
}
.reference-preview {
    width: 100%;
    height: 100%;
    position: relative;
}
.reference-preview img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 4px;
}
.reference-actions {
    position: absolute;
    top: 5px;
    right: 5px;
    background-color: rgba(0,0,0,0.5);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    cursor: pointer;
}

/* Results Area */
.results-placeholder, .assets-placeholder {
  height: 200px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #666;
  font-size: 1rem;
}
.results-placeholder .el-icon, .assets-placeholder .el-icon {
  font-size: 40px;
  margin-bottom: 10px;
}
.results-loading, .assets-loading {
  padding: 0 24px 24px;
}
.result-skeleton-item {
    height: 150px;
    border-radius: 4px;
}
.generated-gallery {
    padding: 0 24px 24px;
}
.generated-item {
  position: relative;
  border-radius: 4px;
  overflow: hidden;
}
.generated-image {
  width: 100%;
    aspect-ratio: 1/1;
  display: block;
}
.generated-item .image-actions {
  position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  opacity: 0;
  transition: opacity 0.3s;
}
.generated-item:hover .image-actions {
  opacity: 1;
}
.image-actions .el-button {
    background-color: rgba(0,0,0,0.5);
    border-color: rgba(255,255,255,0.5);
    color: white;
}
.seed-display {
    display: flex;
    align-items: center;
    gap: 8px;
}
.seed-display .el-tag {
    background-color: #333;
    border-color: #555;
    color: #e0e0e0;
}
.reuse-seed-btn {
    color: #a0a0a0;
}

/* Library */
.asset-gallery {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 10px;
    padding: 0 24px 24px;
    overflow-y: auto;
    flex-grow: 1;
}
.asset-item {
    position: relative;
    border-radius: 4px;
    overflow: hidden;
    aspect-ratio: 1/1;
}
.asset-image {
    width: 100%;
    height: 100%;
    display: block;
}
.asset-overlay {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    background: linear-gradient(to top, rgba(0,0,0,0.8), transparent);
    padding: 8px;
    opacity: 0;
    transition: opacity 0.3s;
}
.asset-item:hover .asset-overlay {
    opacity: 1;
}
.asset-prompt, .asset-seed {
    font-size: 0.75rem;
    color: #fff;
    cursor: pointer;
}
.asset-prompt {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    overflow: hidden;
}
.asset-seed {
    margin-top: 4px;
    color: #a0a0a0;
}

/* Scrollbar */
::-webkit-scrollbar {
  width: 6px;
}
::-webkit-scrollbar-track {
  background: #121212;
}
::-webkit-scrollbar-thumb {
  background: #333;
  border-radius: 3px;
}
::-webkit-scrollbar-thumb:hover {
  background: #555;
}

.asset-card {
    position: relative; /* Required for positioning the delete button */
    overflow: hidden; /* Ensures the button doesn't overflow the card's rounded corners */
}

.delete-asset-btn {
    position: absolute;
    top: 5px;
    right: 5px;
    background-color: rgba(0, 0, 0, 0.6);
    color: white;
    border: none;
    border-radius: 50%;
    width: 24px;
    height: 24px;
    font-size: 16px;
    line-height: 24px;
    text-align: center;
    cursor: pointer;
    opacity: 0;
    transition: opacity 0.2s ease-in-out;
}

.asset-card:hover .delete-asset-btn {
    opacity: 1;
}
</style> 