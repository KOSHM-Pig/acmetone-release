<template>
  <div class="ai-recognition-container">
    <div class="ai-recognition-header">
      <h3>AI自动识别平台链接</h3>
    </div>
    <div class="ai-recognition-content">
      <div v-if="!aiRecognitionActive">
        <el-input
          type="textarea"
          v-model="bulkPlatformLinks"
          :rows="8"
          placeholder="请粘贴歌手在各平台的链接"
          class="platform-links-input"
        />
        <div class="ai-recognition-actions">
          <el-button 
            type="primary" 
            @click="identifyPlatformLinks" 
            :loading="aiRecognitionLoading"
            :disabled="!bulkPlatformLinks"
          >
            识别平台链接
          </el-button>
        </div>
        <div class="ai-recognition-tip">
          <p>提示：将歌手的平台链接粘贴到上方文本框，AI将自动识别并填充</p>
        </div>
      </div>
      
      <div v-else class="ai-recognition-results">
        <div class="recognition-summary">
          <el-alert
            :type="aiRecognitionSuccess ? 'success' : 'info'"
            :title="aiRecognitionSummary"
            :closable="false"
            show-icon
          />
        </div>
        
        <div v-if="Object.keys(identifiedLinks).length > 0" class="recognition-section">
          <h4>已识别链接</h4>
          <div v-for="(link, platform) in identifiedLinks" :key="`identified-${platform}`" class="recognition-item success">
            <div class="platform-icon">
              <img :src="getPlatformIcon(platform)" :alt="platform" @error="handleImageError" />
            </div>
            <div class="platform-info">
              <div class="platform-name">{{ getPlatformName(platform) }}</div>
              <div class="platform-link">{{ truncateLink(link) }}</div>
            </div>
            <div class="platform-action">
              <el-button size="small" type="success" @click="applyLink(platform, link)">
                应用
              </el-button>
            </div>
          </div>
        </div>
        
        <div v-if="Object.keys(correctedLinks).length > 0" class="recognition-section">
          <h4>已修正链接</h4>
          <div v-for="(link, platform) in correctedLinks" :key="`corrected-${platform}`" class="recognition-item warning">
            <div class="platform-icon">
              <img :src="getPlatformIcon(platform)" :alt="platform" @error="handleImageError" />
            </div>
            <div class="platform-info">
              <div class="platform-name">{{ getPlatformName(platform) }}</div>
              <div class="platform-link">{{ truncateLink(link) }}</div>
            </div>
            <div class="platform-action">
              <el-button size="small" type="warning" @click="applyLink(platform, link)">
                应用
              </el-button>
            </div>
          </div>
        </div>
        
        <div v-if="invalidLinks.length > 0" class="recognition-section">
          <h4>无效链接</h4>
          <div v-for="(link, index) in invalidLinks" :key="`invalid-${index}`" class="recognition-item error">
            <div class="platform-icon">
              ⚠️
            </div>
            <div class="platform-info">
              <div class="platform-name">无法识别</div>
              <div class="platform-link">{{ truncateLink(link) }}</div>
            </div>
          </div>
        </div>
        
        <div class="ai-recognition-actions">
          <el-button @click="resetAiRecognition">
            重新识别
          </el-button>
          <el-button type="primary" @click="applyAllLinks">
            应用所有有效链接
          </el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import axios from 'axios';
import { API_BASE_URL } from '@/config';

// 定义组件的props
const props = defineProps({
  // 当前表单中的平台链接
  currentPlatforms: {
    type: Object,
    required: true
  }
});

// 定义组件的事件
const emit = defineEmits(['apply-link', 'apply-all-links']);

// AI识别相关变量
const bulkPlatformLinks = ref('');
const aiRecognitionActive = ref(false);
const aiRecognitionLoading = ref(false);
const aiRecognitionSuccess = ref(false);
const aiRecognitionSummary = ref('');
const identifiedLinks = ref({});
const correctedLinks = ref({});
const invalidLinks = ref([]);

  // 识别平台链接
const identifyPlatformLinks = async () => {
  if (!bulkPlatformLinks.value) {
    ElMessage.warning('请先粘贴平台链接');
    return;
  }

  aiRecognitionLoading.value = true;
  console.log('开始识别平台链接...');

  try {
    // 处理输入的文本，提取可能的链接
    // 先按行分割，如果只有一行，则尝试按空格分割
    let links = [];
    const inputText = bulkPlatformLinks.value.trim();
    console.log('输入文本:', inputText);
    
    if (inputText.includes('\n')) {
      // 有换行符，按行分割
      links = inputText.split('\n').map(link => link.trim()).filter(link => link);
      console.log('按行分割后的链接:', links);
    } else if (inputText.includes(' ')) {
      // 没有换行符但有空格，按空格分割
      links = inputText.split(/\s+/).filter(link => link);
      console.log('按空格分割后的链接:', links);
    } else {
      // 只有一个链接
      links = [inputText];
      console.log('单一链接:', links);
    }

    // 进一步处理：提取可能包含的URL
    links = links.flatMap(text => {
      // 尝试用正则表达式匹配URL
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const matches = text.match(urlRegex);
      console.log(`从文本 "${text}" 中提取URL:`, matches || '无URL');
      return matches || [text]; // 如果没匹配到URL，就用原文本
    });

    if (links.length === 0) {
      console.warn('未检测到有效链接');
      ElMessage.warning('未检测到有效链接');
      aiRecognitionLoading.value = false;
      return;
    }

    console.log('准备发送到后端的链接:', links);

    // 获取认证token
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('未找到认证token');
      ElMessage.error('未登录，请先登录');
      aiRecognitionLoading.value = false;
      return;
    }

    // 调用后端API
    console.log('发送请求到:', `${API_BASE_URL}/ai-chat/identify-platform-links`);
    const response = await axios.post(
      `${API_BASE_URL}/ai-chat/identify-platform-links`,
      { links },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('后端响应:', response.data);

    if (response.data.success) {
      // 更新识别结果
      identifiedLinks.value = response.data.identified_links || {};
      correctedLinks.value = response.data.corrected_links || {};
      invalidLinks.value = response.data.invalid_links || [];
      aiRecognitionSummary.value = response.data.summary || '链接识别完成';
      aiRecognitionSuccess.value = true;
      aiRecognitionActive.value = true;

      console.log('已识别链接:', identifiedLinks.value);
      console.log('已修正链接:', correctedLinks.value);
      console.log('无效链接:', invalidLinks.value);

      // 标准化平台键名
      const normalizedIdentifiedLinks = {};
      for (const [platform, link] of Object.entries(identifiedLinks.value)) {
        const normalizedPlatform = normalizePlatformKey(platform);
        normalizedIdentifiedLinks[normalizedPlatform] = link;
        console.log(`标准化平台键名: ${platform} -> ${normalizedPlatform}`);
      }
      identifiedLinks.value = normalizedIdentifiedLinks;

      const normalizedCorrectedLinks = {};
      for (const [platform, link] of Object.entries(correctedLinks.value)) {
        const normalizedPlatform = normalizePlatformKey(platform);
        normalizedCorrectedLinks[normalizedPlatform] = link;
        console.log(`标准化平台键名(修正): ${platform} -> ${normalizedPlatform}`);
      }
      correctedLinks.value = normalizedCorrectedLinks;

      // 如果没有识别到任何链接
      if (Object.keys(identifiedLinks.value).length === 0 && 
          Object.keys(correctedLinks.value).length === 0) {
        console.warn('未能识别任何有效的平台链接');
        aiRecognitionSummary.value = '未能识别任何有效的平台链接';
        aiRecognitionSuccess.value = false;
      }
    } else {
      console.error('识别失败:', response.data.message);
      ElMessage.error(response.data.message || '识别失败');
      aiRecognitionSuccess.value = false;
    }
  } catch (error) {
    console.error('识别平台链接失败:', error);
    console.error('错误详情:', error.response?.data);
    ElMessage.error(error.response?.data?.message || '识别平台链接失败，请稍后重试');
    aiRecognitionSuccess.value = false;
  } finally {
    aiRecognitionLoading.value = false;
    console.log('识别平台链接流程结束');
  }
};

// 应用识别的链接
const applyLink = (platform, link) => {
  // 添加更多调试信息
  console.log(`准备应用链接 - 平台: ${platform}`);
  console.log(`链接内容: ${link}`);
  console.log(`平台名称: ${getPlatformName(platform)}`);
  console.log(`平台图标: ${getPlatformIcon(platform)}`);
  
  // 检查平台和链接是否有效
  if (!platform || !link) {
    console.error('无效的平台或链接:', { platform, link });
    ElMessage.error('无效的平台或链接');
    return;
  }
  
  try {
    // 确保平台键名符合父组件期望的格式
    const normalizedPlatform = normalizePlatformKey(platform);
    
    // 映射到父组件期望的平台键
    const platformMapping = {
      'netease': 'netease',
      'qq': 'qq',
      'kugou': 'kugou',
      'kuwo': 'kuwo',
      'qishui': 'qishui',
      'spotify': 'spotify',
      'youtube': 'youtube',
      'appleMusic': 'appleMusic',
      'soundCloud': 'soundCloud'
    };
    
    // 获取最终平台键名
    const finalPlatform = platformMapping[normalizedPlatform] || normalizedPlatform;
    
    // 只通过事件通知父组件，不直接修改props
    console.log(`发送apply-link事件: ${platform} -> ${normalizedPlatform} -> ${finalPlatform}`);
    console.log(`链接内容: ${link}`);
    
    // 发送事件，但不显示消息提示（父组件可能会显示自己的提示）
    emit('apply-link', { platform: finalPlatform, link });
    // 移除这里的提示，避免双重提示
    // ElMessage.success(`已应用 ${getPlatformName(platform)} 链接`);
  } catch (error) {
    console.error('应用链接时出错:', error);
    ElMessage.error('应用链接失败，请重试');
  }
};

// 平台键名标准化
const normalizePlatformKey = (platform) => {
  // 平台键名映射表，确保与父组件期望的键名一致
  const platformKeyMap = {
    // 英文键名
    'netease': 'netease',
    'qq': 'qq',
    'kugou': 'kugou',
    'kuwo': 'kuwo',
    'qishui': 'qishui',
    'spotify': 'spotify',
    'youtube': 'youtube',
    'applemusic': 'appleMusic', // 注意大小写
    'apple music': 'appleMusic',
    'appleMusic': 'appleMusic',
    'soundcloud': 'soundCloud', // 注意大小写
    'sound cloud': 'soundCloud',
    'soundCloud': 'soundCloud',
    
    // 中文键名映射到英文
    '网易云音乐': 'netease',
    '网易云': 'netease',
    'qq音乐': 'qq',
    'QQ音乐': 'qq',
    '酷狗音乐': 'kugou',
    '酷狗': 'kugou',
    '酷我音乐': 'kuwo',
    '酷我': 'kuwo',
    '汽水音乐': 'qishui',
    '汽水': 'qishui',
    'apple music': 'appleMusic',
    'Apple Music': 'appleMusic'
  };
  
  // 如果是对象，直接返回
  if (typeof platform !== 'string') {
    console.warn('收到非字符串平台名称:', platform);
    return platform;
  }
  
  // 尝试直接匹配
  if (platformKeyMap[platform]) {
    console.log(`直接匹配平台键名: ${platform} -> ${platformKeyMap[platform]}`);
    return platformKeyMap[platform];
  }
  
  // 转换为小写进行匹配
  const lowerPlatform = platform.toLowerCase();
  if (platformKeyMap[lowerPlatform]) {
    console.log(`小写匹配平台键名: ${platform} -> ${platformKeyMap[lowerPlatform]}`);
    return platformKeyMap[lowerPlatform];
  }
  
  // 返回原始键名
  console.log(`未找到匹配的平台键名: ${platform}, 使用原始值`);
  return platform;
};

// 应用所有识别的链接
const applyAllLinks = () => {
  // 创建标准化后的链接对象
  const normalizedLinks = {};
  
  // 处理已识别的链接
  for (const [platform, link] of Object.entries(identifiedLinks.value)) {
    const normalizedPlatform = normalizePlatformKey(platform);
    normalizedLinks[normalizedPlatform] = link;
    console.log(`标准化平台: ${platform} -> ${normalizedPlatform}, 链接: ${link}`);
  }
  
  // 处理已修正的链接
  for (const [platform, link] of Object.entries(correctedLinks.value)) {
    const normalizedPlatform = normalizePlatformKey(platform);
    normalizedLinks[normalizedPlatform] = link;
    console.log(`标准化平台(修正): ${platform} -> ${normalizedPlatform}, 链接: ${link}`);
  }
  
  // 检查是否有有效链接可应用
  if (Object.keys(normalizedLinks).length === 0) {
    console.warn('没有可应用的有效链接');
    ElMessage.warning('没有可应用的有效链接');
    return;
  }
  
  // 只通过事件通知父组件，不直接修改props
  console.log('发送apply-all-links事件', normalizedLinks);
  emit('apply-all-links', normalizedLinks);
  // 移除这里的提示，避免双重提示
  // ElMessage.success(`已应用全部 ${Object.keys(normalizedLinks).length} 个有效链接`);
};

// 重置AI识别状态
const resetAiRecognition = () => {
  aiRecognitionActive.value = false;
  bulkPlatformLinks.value = '';
  identifiedLinks.value = {};
  correctedLinks.value = {};
  invalidLinks.value = [];
  aiRecognitionSummary.value = '';
};

// 获取平台名称
const getPlatformName = (platform) => {
  const platformNames = {
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
  return platformNames[platform] || platform;
};

// 获取平台图标
const getPlatformIcon = (platform) => {
  // 确保平台名称是有效的
  if (!platform) {
    console.warn('获取平台图标时收到无效的平台名称');
    return '/placeholder-album.png';
  }
  
  try {
    // 标准化平台名称
    const normalizedPlatform = normalizePlatformKey(platform);
    console.log(`获取平台图标: ${platform} -> 标准化为 ${normalizedPlatform}`);
    
    // 平台图标映射表
    const platformIcons = {
      // 标准英文键名
      netease: '/网易云.svg',
      qq: '/QQ音乐.svg',
      kugou: '/酷狗音乐.svg',
      kuwo: '/酷我音乐.svg',
      qishui: '/汽水音乐.svg',
      spotify: '/Spotify.svg',
      youtube: '/youtube.svg',
      appleMusic: '/applemusic.svg',
      soundCloud: '/soundcloud.svg',
      
      // 添加中文键名支持
      '网易云音乐': '/网易云.svg',
      '网易云': '/网易云.svg',
      'QQ音乐': '/QQ音乐.svg',
      '酷狗音乐': '/酷狗音乐.svg',
      '酷我音乐': '/酷我音乐.svg',
      '汽水音乐': '/汽水音乐.svg',
      'Spotify': '/Spotify.svg',
      'YouTube': '/youtube.svg',
      'Apple Music': '/applemusic.svg',
      'SoundCloud': '/soundcloud.svg'
    };
    
    // 尝试直接获取图标
    let iconPath = platformIcons[platform];
    
    // 如果直接获取失败，尝试使用标准化后的平台名称
    if (!iconPath) {
      iconPath = platformIcons[normalizedPlatform];
    }
    
    console.log(`平台 ${platform} (${normalizedPlatform}) 的图标路径: ${iconPath || '未找到，使用占位图'}`);
    
    return iconPath || '/placeholder-album.png';
  } catch (error) {
    console.error('获取平台图标时出错:', error);
    return '/placeholder-album.png';
  }
};

// 处理图片加载错误
const handleImageError = (event) => {
  console.warn('图片加载失败，使用占位图替代', event.target.src);
  event.target.src = '/placeholder-album.png';
  // 防止循环触发错误事件
  event.target.onerror = null;
};

// 截断链接显示
const truncateLink = (link) => {
  if (!link) return '';
  return link.length > 40 ? link.substring(0, 37) + '...' : link;
};
</script>

<style scoped>
/* AI识别区域样式 */
.ai-recognition-container {
  width: 300px;
  height: 100%;
  padding: 0 10px;
  position: relative;
  border-left: 1px solid #eaeaea;
  box-shadow: -2px 0 5px rgba(0, 0, 0, 0.05);
  background-color: #fff;
}

/* 移动端样式优化 */
@media (max-width: 767px) {
  .ai-recognition-container {
    width: 100%;
    padding: 0;
    border-left: none;
    box-shadow: none;
  }
  
  .ai-recognition-header h3 {
    font-size: 16px;
  }
  
  .platform-links-input {
    margin-bottom: 10px;
  }
  
  .ai-recognition-actions {
    margin-top: 10px;
  }
  
  .recognition-item {
    padding: 8px;
    margin-bottom: 8px;
  }
  
  .platform-name {
    font-size: 13px;
  }
  
  .platform-link {
    font-size: 11px;
  }
}

.ai-recognition-header h3 {
  color: #000;
  font-size: 18px;
  margin: 0;
  padding-bottom: 10px;
  border-bottom: 1px solid #eaeaea;
  text-align: center;
}

.platform-links-input {
  margin-bottom: 15px;
}

.ai-recognition-actions {
  margin-top: 15px;
  display: flex;
  justify-content: center;
  gap: 10px;
}

.ai-recognition-tip {
  margin-top: 15px;
  text-align: center;
  color: #909399;
  font-size: 13px;
}

.ai-recognition-results {
  width: 100%;
}

.recognition-summary {
  margin-bottom: 20px;
}

.recognition-section {
  margin-bottom: 20px;
}

.recognition-section h4 {
  margin-bottom: 10px;
  font-size: 16px;
  color: #000;
  border-bottom: 1px solid #eaeaea;
  padding-bottom: 5px;
  text-align: center;
}

.recognition-item {
  display: flex;
  align-items: center;
  padding: 10px;
  margin-bottom: 10px;
  border: 1px solid #000;
  background-color: #fff;
  position: relative;
}

.recognition-item.success {
  border: 1px solid #000;
  background-color: #fff;
}

.recognition-item.warning {
  border: 1px solid #000;
  background-color: #fff;
}

.recognition-item.error {
  border: 1px solid #000;
  background-color: #fff;
}

.platform-icon {
  width: 40px;
  height: 40px;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-right: 10px;
  border-radius: 50%;
  overflow: hidden;
  background-color: #f5f5f5;
}

.platform-icon img {
  width: 32px;
  height: 32px;
  object-fit: contain;
}

.platform-info {
  flex: 1;
  overflow: hidden;
  padding-right: 10px;
}

.platform-name {
  font-weight: bold;
  font-size: 14px;
  margin-bottom: 4px;
  color: #000;
}

.platform-link {
  font-size: 12px;
  color: #606266;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.platform-action {
  width: 60px;
  display: flex;
  justify-content: center;
}

/* 自定义按钮样式 */
:deep(.el-button--small) {
  min-width: 60px;
  font-size: 12px;
  padding: 6px 12px;
}

:deep(.el-button--success) {
  background-color: #fff;
  border-color: #000;
  color: #000;
}

:deep(.el-button--success:hover) {
  background-color: #000;
  border-color: #000;
  color: #fff;
}

:deep(.el-button--warning) {
  background-color: #fff;
  border-color: #000;
  color: #000;
}

:deep(.el-button--warning:hover) {
  background-color: #000;
  border-color: #000;
  color: #fff;
}
</style> 