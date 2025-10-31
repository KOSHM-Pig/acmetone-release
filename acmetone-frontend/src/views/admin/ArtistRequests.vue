<template>
  <div class="admin-artist-requests-container">
    <el-card>
      <template #header>
        <div class="header-content">
          <h2>歌手信息审核</h2>
        </div>
      </template>

      <div v-if="loading" class="loading-container">
        <el-skeleton :rows="5" animated />
      </div>
      
      <div v-else-if="errorMessage" class="error-container">
        <el-alert
          :title="errorMessage"
          type="error"
          description="请尝试刷新页面或联系管理员"
          show-icon
          :closable="false"
        />
        <el-button class="refresh-btn" type="primary" @click="fetchRequests">
          刷新
        </el-button>
      </div>
      
      <div v-else-if="artistEditRequestStore.pendingRequests.length === 0" class="empty-container">
        <el-empty description="暂无待审核的歌手信息修改申请" />
      </div>
      
      <el-table v-else :data="artistEditRequestStore.pendingRequests" stripe>
        <el-table-column label="歌手名称" width="150" prop="Artist.name" />
        <el-table-column label="所属歌曲" width="200" prop="Song.title" />
        <el-table-column label="所属专辑" width="200" prop="Song.Album.title" />
        <el-table-column label="修改内容" min-width="150">
          <template #default="{ row }">
            <div class="change-tags">
              <el-tag v-if="hasNameChanged(row)" type="warning" effect="dark">艺名</el-tag>
              <el-tag v-if="hasRealNameChanged(row)" type="warning" effect="dark">实名</el-tag>
              <el-tag v-if="hasIdNumberChanged(row)" type="warning" effect="dark">身份证</el-tag>
              <el-tag v-if="hasPlatformsChanged(row)" type="warning" effect="dark">平台链接</el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="提交者" width="120" prop="requestedBy.username" />
        <el-table-column label="提交时间" width="180">
          <template #default="{ row }">
            {{ formatDateTime(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <div class="action-buttons">
              <el-button @click="handleView(row)" type="primary" size="small">
                查看
              </el-button>
              <el-button @click="handleApprove(row)" type="success" size="small">
                通过
              </el-button>
              <el-button @click="handleReject(row)" type="danger" size="small">
                拒绝
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 查看详情对话框 -->
    <el-dialog
      v-model="viewDialogVisible"
      title="歌手信息修改详情"
      width="80%"
      top="5vh"
    >
       <div v-if="currentRequest" class="detail-content">
        <div class="reason-section">
          <strong>修改理由：</strong>
          <p>{{ currentRequest.reason || '未提供理由' }}</p>
        </div>

        <div v-if="hasInvalidLinks" class="validation-summary warning">
            <el-icon><WarningFilled /></el-icon>
            <span>检测到部分平台链接格式可能不正确，请仔细审核</span>
        </div>

        <div class="comparison-section">
            <el-descriptions title="原始信息" :column="1" border>
                <el-descriptions-item label="艺名">{{ currentRequest.Artist?.name || '未知' }}</el-descriptions-item>
                <el-descriptions-item label="实名">{{ currentRequest.Artist?.realName || '未知' }}</el-descriptions-item>
                <el-descriptions-item label="身份证号">{{ maskIdNumber(currentRequest.Artist?.id_number) || '未设置' }}</el-descriptions-item>
                <el-descriptions-item v-for="platform in platformKeys" :key="'orig-' + platform" :label="getPlatformLabel(platform)">
                  {{ currentRequest.Artist?.[platform] || '无' }}
                </el-descriptions-item>
            </el-descriptions>

            <el-descriptions title="修改后信息" :column="1" border>
                <el-descriptions-item :label="'艺名'" :class="{ 'modified': hasNameChanged(currentRequest) }">
                  <span v-if="!hasNameChanged(currentRequest)">{{ currentRequest.Artist?.name }}</span>
                  <span v-else class="new-value">{{ currentRequest.newName }}</span>
                </el-descriptions-item>
                 <el-descriptions-item :label="'实名'" :class="{ 'modified': hasRealNameChanged(currentRequest) }">
                  <span v-if="!hasRealNameChanged(currentRequest)">{{ currentRequest.Artist?.realName }}</span>
                  <span v-else class="new-value">{{ currentRequest.newRealName }}</span>
                </el-descriptions-item>
                <el-descriptions-item :label="'身份证号'" :class="{ 'modified': hasIdNumberChanged(currentRequest) }">
                    <span v-if="!hasIdNumberChanged(currentRequest)">{{ maskIdNumber(currentRequest.Artist?.id_number) || '未设置' }}</span>
                    <span v-else class="new-value">{{ maskIdNumber(currentRequest.new_id_number) }}</span>
                </el-descriptions-item>
                <el-descriptions-item 
                  v-for="platform in platformKeys"
                  :key="'new-' + platform"
                  :label="getPlatformLabel(platform)"
                  :class="{ 'modified': isPlatformChanged(currentRequest, platform) }"
                >
                  <span v-if="!isPlatformChanged(currentRequest, platform)" class="platform-value">{{ currentRequest.Artist?.[platform] || '无' }}</span>
                  <span v-else class="new-value" :class="{ 'invalid-link': !isValidPlatformLink(platform, getNewPlatformValue(currentRequest, platform)) }">
                      {{ getNewPlatformValue(currentRequest, platform) }}
                      <el-tooltip v-if="!isValidPlatformLink(platform, getNewPlatformValue(currentRequest, platform))" placement="top">
                        <template #content>
                          <div class="link-validation-tooltip">
                            <p class="error-message">链接格式可能不正确</p>
                            <p class="expected-format">期望格式: {{ getPlatformLinkFormat(platform) }}</p>
                          </div>
                        </template>
                        <el-icon class="warning-icon"><WarningFilled /></el-icon>
                      </el-tooltip>
                      <el-button 
                        v-if="getNewPlatformValue(currentRequest, platform) !== '未修改' && isValidPlatformLink(platform, getNewPlatformValue(currentRequest, platform))"
                        class="preview-link-btn" 
                        size="small" 
                        @click="previewLink(getNewPlatformValue(currentRequest, platform))"
                        type="primary" 
                        link
                      >
                        预览
                      </el-button>
                  </span>
                </el-descriptions-item>
            </el-descriptions>
        </div>

        <div class="song-album-info">
          <h4>关联信息</h4>
          <p><strong>所属歌曲：</strong>{{ currentRequest?.Song?.title || '未知歌曲' }}</p>
          <p><strong>所属专辑：</strong>{{ currentRequest?.Song?.Album?.title || '未知专辑' }}</p>
          <p><strong>提交者：</strong>{{ currentRequest?.requestedBy?.username || '未知用户' }}</p>
          <p><strong>提交时间：</strong>{{ formatDateTime(currentRequest?.createdAt) }}</p>
        </div>
      </div>

      <template #footer>
        <div class="dialog-footer">
            <el-button @click="viewDialogVisible = false">关闭</el-button>
            <el-button @click="handleApprove(currentRequest)" type="success">通过</el-button>
            <el-button @click="handleReject(currentRequest)" type="danger">拒绝</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 审核意见对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="500px"
    >
      <el-form
        ref="formRef"
        :model="form"
        label-position="top"
      >
        <el-form-item label="审核意见">
          <el-input
            v-model="form.comment"
            type="textarea"
            :rows="4"
            placeholder="请输入审核意见（通过时可不填）"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleSubmit" :loading="loading">
            确定
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue';
import { useArtistEditRequestStore } from '../../stores/artistEditRequest';
import { ElMessage } from 'element-plus';
import { WarningFilled, Lock } from '@element-plus/icons-vue';

const artistEditRequestStore = useArtistEditRequestStore();

const dialogVisible = ref(false);
const viewDialogVisible = ref(false);
const dialogTitle = ref('');
const loading = ref(false);
const errorMessage = ref('');
const currentRequest = ref(null);
const currentAction = ref('');

const form = reactive({
  comment: '',
});

const platformKeys = [
  'netease', 'qq', 'kugou', 'kuwo', 'qishui', 
  'spotify', 'youtube', 'appleMusic', 'soundCloud'
];

const formatDateTime = (date) => {
  if (!date) return '未知';
  return new Date(date).toLocaleString('zh-CN');
};

const hasNameChanged = (request) => {
  if (!request) return false;
  return !!request.newName && request.newName !== request.Artist?.name;
};

const hasRealNameChanged = (request) => {
  if (!request) return false;
  return !!request.newRealName && request.newRealName !== request.Artist?.realName;
};

const hasIdNumberChanged = (request) => {
  if (!request) return false;
  return !!request.new_id_number && request.new_id_number !== request.Artist?.id_number;
};

const hasPlatformsChanged = (request) => {
  if (!request) return false;
  
  for (const platform of platformKeys) {
    if (isPlatformChanged(request, platform)) {
      return true;
    }
  }
  
  return false;
};

const isPlatformChanged = (request, platform) => {
  if (!request) return false;
  
  const newValue = getNewPlatformValue(request, platform);
  const oldValue = request.Artist?.[platform];
  
  // 修复：当原值不存在（显示为"无"）但新值存在时，应该显示为已修改
  return newValue !== '未修改' && newValue !== oldValue;
};

const getNewPlatformValue = (request, platform) => {
  if (!request) return '无';
  
  const platformMapping = {
    'netease': 'newNetease',
    'qq': 'newQq',
    'kugou': 'newKugou',
    'kuwo': 'newKuwo',
    'qishui': 'newQishui',
    'spotify': 'newSpotify',
    'youtube': 'newYoutube',
    'appleMusic': 'newAppleMusic',
    'soundCloud': 'newSoundCloud'
  };
  
  // 获取新值，如果不存在则返回"未修改"
  const newPlatformKey = platformMapping[platform];
  return request[newPlatformKey] || '未修改';
};

const getPlatformLinks = (artist) => {
  if (!artist) return {};
  
  return {
    netease: artist.netease,
    qq: artist.qq,
    kugou: artist.kugou,
    kuwo: artist.kuwo,
    qishui: artist.qishui,
    spotify: artist.spotify,
    youtube: artist.youtube,
    appleMusic: artist.appleMusic,
    soundCloud: artist.soundCloud
  };
};

const getPlatformLabel = (key) => {
  const labels = {
    netease: '网易云音乐',
    qq: 'QQ音乐',
    kugou: '酷狗音乐',
    kuwo: '酷我音乐',
    qishui: '汽水音乐',
    spotify: 'Spotify',
    youtube: 'Youtube',
    appleMusic: 'Apple Music',
    soundCloud: 'SoundCloud',
  };
  return labels[key] || key;
};

const handleView = (request) => {
  currentRequest.value = request;
  viewDialogVisible.value = true;
};

const handleApprove = (request) => {
  currentRequest.value = request;
  currentAction.value = 'approved';
  dialogTitle.value = '通过修改申请';
  form.comment = '';
  dialogVisible.value = true;
};

const handleReject = (request) => {
  currentRequest.value = request;
  currentAction.value = 'rejected';
  dialogTitle.value = '拒绝修改申请';
  form.comment = '';
  dialogVisible.value = true;
};

const handleSubmit = async () => {
  if (!currentRequest.value || !currentAction.value) return;

  try {
    loading.value = true;
    await artistEditRequestStore.handleRequest(
      currentRequest.value.id,
      currentAction.value,
      form.comment
    );
    
    await artistEditRequestStore.fetchPendingRequests();
    ElMessage.success('处理申请成功');
    dialogVisible.value = false;
  } catch (error) {
    ElMessage.error(error.toString());
  } finally {
    loading.value = false;
    form.comment = '';
    currentRequest.value = null;
    currentAction.value = '';
  }
};

const fetchRequests = async () => {
  try {
    loading.value = true;
    errorMessage.value = '';
    await artistEditRequestStore.fetchPendingRequests();
  } catch (error) {
    console.error('获取待审核申请失败:', error);
    errorMessage.value = '获取待审核申请失败：' + (error.message || '未知错误');
    ElMessage.error('获取待审核申请失败');
  } finally {
    loading.value = false;
  }
};

// 平台链接格式验证规则
const platformRegexRules = {
  netease: /^https?:\/\/(music\.163\.com|y\.music\.163\.com)\/.*$/i,
  qq: /^https?:\/\/(y\.qq\.com)\/.*$/i,
  kugou: /^https?:\/\/(www\.kugou\.com)\/.*$/i,
  kuwo: /^https?:\/\/(www\.kuwo\.cn)\/.*$/i,
  qishui: /^https?:\/\/(qishui\.com)\/.*$/i,
  spotify: /^https?:\/\/(open\.spotify\.com)\/.*$/i,
  youtube: /^https?:\/\/(www\.youtube\.com|youtube\.com|youtu\.be)\/.*$/i,
  appleMusic: /^https?:\/\/(music\.apple\.com)\/.*$/i,
  soundCloud: /^https?:\/\/(soundcloud\.com)\/.*$/i
};

// 验证平台链接格式是否正确
const isValidPlatformLink = (platform, link) => {
  // 如果是未修改或无，则不需要验证
  if (!link || link === '未修改' || link === '无') {
    return true;
  }
  
  // 检查链接是否符合对应平台的格式规则
  const regex = platformRegexRules[platform];
  if (!regex) {
    return true; // 如果没有对应平台的规则，默认为有效
  }
  
  return regex.test(link);
};

// 计算属性：是否有无效链接
const hasInvalidLinks = computed(() => {
  if (!currentRequest.value) return false;
  
  for (const platform of platformKeys) {
    const newValue = getNewPlatformValue(currentRequest.value, platform);
    if (newValue !== '未修改' && !isValidPlatformLink(platform, newValue)) {
      return true;
    }
  }
  
  return false;
});

// 获取平台链接的预期格式
const getPlatformLinkFormat = (platform) => {
  const formats = {
    netease: 'https://music.163.com/...',
    qq: 'https://y.qq.com/...',
    kugou: 'https://www.kugou.com/...',
    kuwo: 'https://www.kuwo.cn/...',
    qishui: 'https://qishui.com/...',
    spotify: 'https://open.spotify.com/...',
    youtube: 'https://www.youtube.com/... 或 https://youtu.be/...',
    appleMusic: 'https://music.apple.com/...',
    soundCloud: 'https://soundcloud.com/...'
  };
  
  return formats[platform] || '标准URL格式';
};

// 预览链接
const previewLink = (link) => {
  if (!link || link === '未修改' || link === '无') return;
  
  // 安全检查：确保是有效的URL
  try {
    const url = new URL(link);
    if (['http:', 'https:'].includes(url.protocol)) {
      window.open(link, '_blank', 'noopener,noreferrer');
    } else {
      ElMessage.error('无效的URL协议');
    }
  } catch (error) {
    ElMessage.error('无效的URL格式');
  }
};

// 添加身份证号码掩码函数
const maskIdNumber = (idNumber) => {
  if (!idNumber) return '';
  return idNumber.replace(/^(.{6})(.*)(.{4})$/, '$1********$3');
};

onMounted(fetchRequests);
</script>

<style scoped>
/* Martin Garrix Design Language - White Theme */
.admin-artist-requests-container {
  padding: 24px;
  background-color: #f5f5f7;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
}

:deep(.el-card) {
  background-color: #ffffff;
  border-radius: 0;
  border: 1px solid #000000;
  box-shadow: 5px 5px 0px 0px rgba(0,0,0,1);
}

.header-content h2 {
  font-size: 20px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  color: #000000;
  margin: 0;
}

/* Loading/Empty/Error States */
.loading-container, .error-container, .empty-container {
  padding: 60px 0;
}
.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

/* Table Styles */
:deep(.el-table) {
  --el-table-border-color: #eaeaea;
  --el-table-header-bg-color: #ffffff;
  --el-table-row-hover-bg-color: #f5f5f7;
  border-top: 1px solid #000;
}
:deep(.el-table th.el-table__cell) {
  color: #666;
  font-weight: 700;
  text-transform: uppercase;
  font-size: 11px;
  border-bottom: 2px solid #000;
}
:deep(.el-table--striped .el-table__body tr.el-table__row--striped td.el-table__cell) {
  background-color: #fafafa;
}
.change-tags {
  display: flex;
  gap: 6px;
}

/* Tag Styles */
:deep(.el-tag) {
  border-radius: 0;
  font-weight: 700;
  font-size: 10px;
}
:deep(.el-tag--warning) {
  background-color: #ffc107;
  color: #000;
  border-color: #ffc107;
}

/* Buttons */
.action-buttons {
  display: flex;
  gap: 8px;
}
:deep(.el-button) {
  border-radius: 0;
  font-weight: 700;
  text-transform: uppercase;
  border-width: 2px;
  box-shadow: none;
}
:deep(.el-button--primary) {
  background-color: #000; border-color: #000; color: #fff;
}
:deep(.el-button--primary:hover) {
  background-color: #fff; color: #000;
}
:deep(.el-button--success) {
  background-color: transparent; border-color: #28a745; color: #28a745;
}
:deep(.el-button--success:hover) {
  background-color: #28a745; color: #fff;
}
:deep(.el-button--danger) {
  background-color: transparent; border-color: #dc3545; color: #dc3545;
}
:deep(.el-button--danger:hover) {
  background-color: #dc3545; color: #fff;
}

/* Dialog Styles */
:deep(.el-dialog) {
  border-radius: 0;
  border: 2px solid #000;
  box-shadow: 6px 6px 0 0 #000;
}
:deep(.el-dialog__header) {
  border-bottom: 2px solid #000;
}
:deep(.el-dialog__title) {
  color: #000;
  text-transform: uppercase;
  font-weight: 700;
}
:deep(.el-dialog__footer) {
  border-top: 2px solid #000;
}
.dialog-footer {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
}

/* Detail Dialog Content */
.detail-content {
  padding: 0 10px;
}
.reason-section, .validation-summary, .song-album-info {
  margin-bottom: 24px;
  padding: 16px;
  border: 2px solid #000;
}
.reason-section strong, .song-album-info h4 {
  text-transform: uppercase;
  font-size: 12px;
  letter-spacing: 1px;
  display: block;
  margin-bottom: 8px;
}
.reason-section p, .song-album-info p {
  margin: 0;
}
.validation-summary {
  border-color: #e6a23c;
  display: flex;
  align-items: center;
  gap: 10px;
  color: #e6a23c;
  font-weight: 600;
}

.comparison-section {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}
:deep(.el-descriptions) {
  border: 2px solid #000;
}
:deep(.el-descriptions__title) {
  text-transform: uppercase;
  font-weight: 700;
  font-size: 14px;
}
:deep(.el-descriptions-item__label) {
  font-weight: 700;
  color: #666;
  background: #f5f5f7 !important;
  font-size: 11px;
}
:deep(.el-descriptions-item__cell.modified) {
  background-color: #fffbe6 !important;
}
:deep(.el-descriptions-item__cell.modified .el-descriptions-item__label) {
  background-color: #f5f0d5 !important;
}
.new-value {
  color: #28a745;
  font-weight: 600;
}
.new-value.invalid-link {
  color: #dc3545;
  border-bottom: 2px dotted #dc3545;
}
.warning-icon {
  color: #e6a23c;
  margin-left: 8px;
}
.preview-link-btn {
  margin-left: 8px;
}
.link-validation-tooltip {
  max-width: 250px;
}
.error-message { color: #dc3545; margin-bottom: 5px; }
.expected-format { color: #999; font-size: 12px; }
</style> 