<template>
  <div class="user-album-links">
    <div class="page-header">
      <h1>{{ isEditMode ? '编辑专辑链接' : '专辑链接管理' }}</h1>
    </div>

    <div class="filter-bar">
      <div class="garrix-input-wrapper">
        <el-select 
          v-model="filterStatus" 
          placeholder="链接状态" 
          clearable 
          @change="handleFilterChange"
          popper-class="garrix-select-popper"
        >
          <el-option v-for="item in statusOptions" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
      </div>
      <div class="garrix-input-wrapper">
        <el-input
          v-model="searchQuery"
          placeholder="搜索专辑名称"
          clearable
          @input="handleSearch"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
      </div>
    </div>

    <!-- 桌面端表格视图 -->
    <div class="desktop-view" v-if="!isMobileView">
      <el-table
        v-loading="loading"
        :data="filteredLinks"
        style="width: 100%"
        row-key="id"
        empty-text="暂无专辑链接记录"
      >
        <el-table-column label="专辑封面" width="100">
          <template #default="scope">
            <el-image
              :src="getCompleteImageUrl(scope.row.coverImage)"
              fit="cover"
              style="width: 60px; height: 60px; border-radius: 0; cursor: pointer;"
              :preview-src-list="[]"
              @click="navigateToAlbum(scope.row)"
            />
          </template>
        </el-table-column>
        <el-table-column label="专辑名称" prop="albumName" min-width="200" show-overflow-tooltip />
        <el-table-column label="歌手" prop="artistName" min-width="150" show-overflow-tooltip />
        <el-table-column label="发行日期" width="120">
          <template #default="scope">
            {{ formatDate(scope.row.releaseDate) }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="120">
          <template #default="scope">
            <span :class="['status-badge', getStatusClass(scope.row.isActive)]">
              {{ scope.row.isActive ? '已启用' : '待启用' }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="权限" width="120">
          <template #default="scope">
            <el-tag size="small" :type="scope.row.isAlbumOwner ? 'success' : 'info'">
              {{ scope.row.ownershipType }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="scope">
            <acmetone-btn size="small" @click="editLink(scope.row)">
              编辑链接
            </acmetone-btn>
            <acmetone-btn size="small" type="secondary" @click="viewDetails(scope.row)" style="margin-left: 8px;">
              查看详情
            </acmetone-btn>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 移动端卡片视图 -->
    <div class="mobile-view" v-if="isMobileView">
      <div v-if="loading" class="loading-container">
        <el-loading :fullscreen="false" />
      </div>
      <div v-else-if="filteredLinks.length === 0" class="empty-state">
        暂无专辑链接记录
      </div>
      <div v-else class="link-cards">
        <div 
          v-for="item in filteredLinks" 
          :key="item.id" 
          class="link-card"
          @click="viewDetails(item)"
        >
          <div class="card-header">
            <el-image
              :src="getCompleteImageUrl(item.coverImage)"
              fit="cover"
              class="card-album-cover"
              style="cursor: pointer;"
              :preview-src-list="[]"
              @click.stop="navigateToAlbum(item)"
            />
            <div class="card-header-info">
              <h3 class="card-title">{{ item.albumName }}</h3>
              <p class="card-artist">{{ item.artistName }}</p>
            </div>
          </div>
          <div class="card-body">
            <div class="card-info-row">
              <span class="card-label">发行日期</span>
              <span class="card-value">{{ formatDate(item.releaseDate) }}</span>
            </div>
            <div class="card-info-row">
              <span class="card-label">状态</span>
              <span :class="['status-badge', getStatusClass(item.isActive)]">
                {{ item.isActive ? '已启用' : '待启用' }}
              </span>
            </div>
            <div class="card-info-row">
              <span class="card-label">权限</span>
              <el-tag size="small" :type="item.isAlbumOwner ? 'success' : 'info'">
                {{ item.ownershipType }}
              </el-tag>
            </div>
          </div>
          <div class="card-footer">
            <acmetone-btn size="small" @click.stop="editLink(item)">编辑链接</acmetone-btn>
            <acmetone-btn size="small" type="secondary" style="margin-left: 8px;">查看详情</acmetone-btn>
          </div>
        </div>
      </div>
    </div>

    <acmetone-pagination
      v-model:current-page="currentPage"
      v-model:page-size="pageSize"
      :page-sizes="[10, 20, 50, 100]"
      :total="totalItems"
      @size-change="handleSizeChange"
      @current-change="handleCurrentChange"
    />

    <!-- 详情对话框 -->
    <el-dialog
      v-model="detailsVisible"
      title="专辑链接详情"
      :width="isMobileView ? '95%' : '800px'"
      destroy-on-close
      class="details-dialog"
      :append-to-body="true"
      :fullscreen="isMobileView"
    >
      <div v-if="currentLink" class="dialog-layout" :class="{'mobile-layout': isMobileView}">
        <!-- 左侧：封面和基本信息 -->
        <div class="preview-column">
          <div class="cover-preview">
            <h4>专辑封面</h4>
            <div class="cover-container">
              <el-image
                :src="getCompleteImageUrl(currentLink.coverImage)"
                fit="cover"
                class="album-cover"
                style="cursor: pointer;"
                :preview-src-list="[]"
                @click="navigateToAlbum(currentLink)"
              />
            </div>
          </div>

          <div class="link-preview">
            <h4>链接预览</h4>
            <div class="link-url">
              <el-input 
                :value="getPreviewUrl(currentLink)" 
                readonly
                :disabled="!currentLink.isActive"
              >
                <template #append>
                  <acmetone-btn @click="copyLink" :disabled="!currentLink.isActive">
                    <el-icon><CopyDocument /></el-icon>
                    复制
                  </acmetone-btn>
                  <acmetone-btn @click="openPreview" :disabled="!currentLink.isActive">
                    <el-icon><View /></el-icon>
                    预览
                  </acmetone-btn>
                </template>
              </el-input>
            </div>
          </div>
        </div>

        <!-- 右侧：详细信息和平台链接 -->
        <div class="details-column">
          <div class="album-main-info">
            <h3 class="album-title">{{ currentLink.albumName }}</h3>
            <p class="album-artist">{{ currentLink.artistName }}</p>
          </div>

          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">发行日期</span>
              <span>{{ formatDate(currentLink.releaseDate) }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">状态</span>
              <span :class="['status-badge', getStatusClass(currentLink.isActive)]">
                {{ currentLink.isActive ? '已启用' : '待启用' }}
              </span>
            </div>
            <div class="info-item" v-if="!currentLink.isActive">
              <span class="info-label">预计启用时间</span>
              <span>{{ formatDate(currentLink.releaseDate) }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">权限</span>
              <el-tag size="small" :type="currentLink.isAlbumOwner ? 'success' : 'info'">
                {{ currentLink.ownershipType }}
              </el-tag>
            </div>
          </div>

          <div class="platform-links">
            <h4>平台链接</h4>
            <div class="platform-grid">
              <div v-for="platform in platforms" :key="platform.key" class="platform-item">
                <img :src="platform.icon" :alt="platform.name" class="platform-icon">
                <span class="platform-name">{{ platform.name }}</span>
                <span class="platform-link">{{ currentLink[platform.key] || '未设置' }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <acmetone-btn type="secondary" @click="detailsVisible = false">关闭</acmetone-btn>
          <acmetone-btn @click="editLink(currentLink)" style="margin-left: 8px;">编辑链接</acmetone-btn>
        </span>
      </template>
    </el-dialog>

    <!-- 编辑对话框 -->
    <el-dialog
      v-model="editDialogVisible"
      title="编辑专辑链接"
      :width="isMobileView ? '95%' : '600px'"
      destroy-on-close
      :append-to-body="true"
    >
      <div v-if="editingLink" class="edit-dialog-content">
        <h3 class="edit-album-title">{{ editingLink.albumName }}</h3>
        <p class="edit-album-artist">{{ editingLink.artistName }}</p>
        
        <div class="platform-links-form">
          <h4>平台链接</h4>
          <p class="form-tip">请输入各平台的链接地址，不需要填写的平台可以留空</p>
          
          <div v-for="platform in platforms" :key="platform.key" class="platform-input-row">
            <div class="platform-info">
              <img :src="platform.icon" :alt="platform.name" class="platform-icon">
              <span class="platform-name">{{ platform.name }}</span>
            </div>
            <el-input 
              v-model="editForm[platform.key]" 
              :placeholder="`${platform.name}链接`"
              clearable
            />
          </div>
        </div>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <acmetone-btn type="secondary" @click="editDialogVisible = false">取消</acmetone-btn>
          <acmetone-btn @click="saveLink" style="margin-left: 8px;">保存</acmetone-btn>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeMount, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { ElMessage } from 'element-plus';
import { Search, CopyDocument, View } from '@element-plus/icons-vue';
import { useAlbumLinkStore } from '@/stores/albumLink';
import AcmetoneBtn from '@/components/acmetone/AcmetoneBtn.vue';
import AcmetonePagination from '@/components/acmetone/AcmetonePagination.vue';
import { STATIC_BASE_URL } from '@/config';

const router = useRouter();
const route = useRoute();
const albumLinkStore = useAlbumLinkStore();
const loading = ref(false);
const links = ref([]);
const filterStatus = ref('');
const searchQuery = ref('');
const currentPage = ref(1);
const pageSize = ref(10);
const totalItems = ref(0);
const detailsVisible = ref(false);
const currentLink = ref(null);
const isMobileView = ref(false);
const albumId = ref(null);
const isEditMode = ref(false);

// 编辑相关
const editDialogVisible = ref(false);
const editingLink = ref(null);
const editForm = ref({});

// 监听路由变化
watch(() => route.params.id, (newId) => {
  if (newId) {
    albumId.value = newId;
    isEditMode.value = true;
    console.log('检测到专辑ID:', albumId.value, '进入编辑模式');
    loadData();
  } else {
    albumId.value = null;
    isEditMode.value = false;
  }
}, { immediate: true });

// 状态选项
const statusOptions = [
  { value: 'active', label: '已启用' },
  { value: 'inactive', label: '待启用' }
];

// 平台配置
const platforms = [
  { key: 'netease', name: '网易云音乐', icon: '/网易云.svg' },
  { key: 'qq', name: 'QQ音乐', icon: '/QQ音乐.svg' },
  { key: 'kugou', name: '酷狗音乐', icon: '/酷狗音乐.svg' },
  { key: 'kuwo', name: '酷我音乐', icon: '/酷我音乐.svg' },
  { key: 'qishui', name: '汽水音乐', icon: '/汽水音乐.svg' },
  { key: 'spotify', name: 'Spotify', icon: '/Spotify.svg' },
  { key: 'youtube', name: 'YouTube', icon: '/youtube.svg' },
  { key: 'appleMusic', name: 'Apple Music', icon: '/applemusic.svg' },
  { key: 'soundCloud', name: 'SoundCloud', icon: '/soundcloud.svg' }
];

// 处理图片URL，确保路径正确
const getImageUrl = (imagePath) => {
  if (!imagePath) return '';
  
  // 如果是完整URL，直接返回
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  
  // 确保路径以/开头
  const normalizedPath = imagePath.startsWith('/') ? imagePath : '/' + imagePath;
  
  // 添加静态服务器基础URL
  return `${STATIC_BASE_URL}${normalizedPath}`;
};

// 获取缩略图URL
const getThumbnailUrl = (imagePath) => {
  if (!imagePath) return '';
  
  // 如果已经是缩略图路径，直接返回
  if (imagePath.includes('/thumbnails/thumb_')) {
    return imagePath;
  }
  
  // 构建缩略图路径
  const parts = imagePath.split('/');
  const filename = parts.pop();
  const thumbFilename = `thumb_${filename}`;
  return `${parts.join('/')}/thumbnails/${thumbFilename}`;
};

// 完整的图片处理函数
const getCompleteImageUrl = (imagePath) => {
  if (!imagePath) return 'https://via.placeholder.com/400x400/1c1c1c/fff?text=No+Art';
  
  // 尝试获取缩略图URL
  const thumbnailUrl = getThumbnailUrl(imagePath);
  // 确保URL格式正确
  return getImageUrl(thumbnailUrl);
};

// 检测是否为移动端视图
const checkMobileView = () => {
  isMobileView.value = window.innerWidth < 768;
};

onBeforeMount(() => {
  checkMobileView();
  window.addEventListener('resize', checkMobileView);
});

onMounted(() => {
  loadData();
});

// 格式化日期
const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
};

// 获取状态样式类
const getStatusClass = (isActive) => {
  return isActive ? 'status-approved' : 'status-pending';
};

// 获取预览URL
const getPreviewUrl = (link) => {
  if (!link || !link.slug) return '';
  return `${window.location.origin}/album/${link.slug}`;
};

// 跳转到专辑链接展示页面
const navigateToAlbum = (link) => {
  if (!link || !link.slug) return;
  
  // 使用完整URL，包括协议和域名
  const baseUrl = window.location.origin;
  const url = `${baseUrl}/album/${link.slug}`;
  
  console.log('跳转到专辑展示页面:', url);
  window.open(url, '_blank');
};

// 处理从API返回的链接数据
const processLinks = (links) => {
  return links.map(link => {
    // 添加一个标志，指示是否为专辑拥有者
    if (link.isAlbumOwner) {
      link.ownershipType = '专辑拥有者';
    } else {
      link.ownershipType = '链接创建者';
    }
    return link;
  });
};

// 过滤后的链接列表
const filteredLinks = computed(() => {
  let result = links.value;
  
  // 状态过滤
  if (filterStatus.value) {
    const isActive = filterStatus.value === 'active';
    result = result.filter(item => item.isActive === isActive);
  }
  
  // 搜索过滤
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    result = result.filter(item => 
      item.albumName.toLowerCase().includes(query) || 
      item.artistName.toLowerCase().includes(query)
    );
  }
  
  return result;
});

// 加载数据
const loadData = async () => {
  loading.value = true;
  try {
    // 调用 store 中获取用户链接的方法
    let response;
    
    if (isEditMode.value && albumId.value) {
      console.log('获取专辑ID为', albumId.value, '的链接');
      // 这里应该调用获取特定专辑链接的API
      // 由于没有现成的API，我们先使用fetchUserLinks，后续可以添加专门的API
      response = await albumLinkStore.fetchUserLinks({
        page: currentPage.value,
        pageSize: pageSize.value,
        albumId: albumId.value
      });
    } else {
      console.log('获取用户的所有链接');
      response = await albumLinkStore.fetchUserLinks({
        page: currentPage.value,
        pageSize: pageSize.value,
        search: searchQuery.value,
        status: filterStatus.value,
      });
    }
    
    links.value = processLinks(response.links);
    totalItems.value = response.total;
    
    // 调试信息：打印第一个链接的结构
    if (links.value && links.value.length > 0) {
      console.log('链接对象示例:', JSON.stringify(links.value[0], null, 2));
    }
  } catch (error) {
    console.error('获取用户专辑链接列表失败:', error);
    ElMessage.error('获取专辑链接列表失败');
  } finally {
    loading.value = false;
  }
};

// 用户不允许创建新链接

// 编辑链接
const editLink = (link) => {
  console.log('编辑链接:', link);
  
  // 使用albumId或internalAlbumId（取决于哪个可用）
  const effectiveAlbumId = link?.albumId || link?.internalAlbumId;
  
  if (!effectiveAlbumId) {
    ElMessage.warning('无法编辑此链接，缺少专辑ID');
    console.error('链接缺少albumId或internalAlbumId字段:', link);
    return;
  }
  
  // 设置编辑表单的初始值
  editingLink.value = link;
  editForm.value = {
    id: link.id,
    netease: link.netease || '',
    qq: link.qq || '',
    kugou: link.kugou || '',
    kuwo: link.kuwo || '',
    qishui: link.qishui || '',
    spotify: link.spotify || '',
    youtube: link.youtube || '',
    appleMusic: link.appleMusic || '',
    soundCloud: link.soundCloud || ''
  };
  
  // 显示编辑对话框
  editDialogVisible.value = true;
};

// 保存链接
const saveLink = async () => {
  if (!editingLink.value || !editForm.value) return;
  
  try {
    loading.value = true;
    
    // 构建更新数据
    const updateData = {
      netease: editForm.value.netease,
      qq: editForm.value.qq,
      kugou: editForm.value.kugou,
      kuwo: editForm.value.kuwo,
      qishui: editForm.value.qishui,
      spotify: editForm.value.spotify,
      youtube: editForm.value.youtube,
      appleMusic: editForm.value.appleMusic,
      soundCloud: editForm.value.soundCloud
    };
    
    // 调用API更新链接
    await albumLinkStore.updateUserLink(editingLink.value.id, updateData);
    
    ElMessage.success('专辑链接已更新');
    editDialogVisible.value = false;
    
    // 重新加载数据
    loadData();
  } catch (error) {
    console.error('更新专辑链接失败:', error);
    ElMessage.error(error.toString());
  } finally {
    loading.value = false;
  }
};

// 查看详情
const viewDetails = (link) => {
  currentLink.value = link;
  detailsVisible.value = true;
};

// 复制链接
const copyLink = () => {
  if (!currentLink.value || !currentLink.value.isActive) {
    ElMessage.warning('链接尚未启用，无法复制');
    return;
  }
  
  const url = getPreviewUrl(currentLink.value);
  navigator.clipboard.writeText(url)
    .then(() => {
      ElMessage.success('链接已复制到剪贴板');
    })
    .catch(() => {
      ElMessage.error('复制链接失败');
    });
};

// 打开预览
const openPreview = () => {
  if (!currentLink.value || !currentLink.value.isActive) {
    ElMessage.warning('链接尚未启用，无法预览');
    return;
  }
  
  window.open(getPreviewUrl(currentLink.value), '_blank');
};

// 处理筛选变化
const handleFilterChange = () => {
  currentPage.value = 1;
  loadData();
};

// 处理搜索
const handleSearch = () => {
  currentPage.value = 1;
  loadData();
};

// 处理每页显示数量变化
const handleSizeChange = (val) => {
  pageSize.value = val;
  currentPage.value = 1;
  loadData();
};

// 处理页码变化
const handleCurrentChange = (val) => {
  currentPage.value = val;
  loadData();
};
</script>

<style scoped>
/* 复用UserDynamicCovers.vue的样式 */
:root {
  --garrix-black: #1d1d1f;
  --garrix-white: #ffffff;
  --garrix-grey: #86868b;
  --garrix-light-grey: #f5f7fa;
  --garrix-border-grey: #d2d2d7;
  --garrix-text-primary: #1d1d1f;
  --garrix-text-secondary: #86868b;
}

.user-album-links {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
  font-family: sans-serif;
  background-color: var(--garrix-white);
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--garrix-black);
  padding-bottom: 20px;
  margin-bottom: 30px;
}

.page-header h1 {
  font-size: 2rem;
  font-weight: 700;
  margin: 0;
}

/* Filter bar styling */
.filter-bar {
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
}

.filter-bar .garrix-input-wrapper:first-of-type {
  width: 200px;
}

.garrix-input-wrapper {
  position: relative;
  border: 2px solid var(--garrix-black);
  background-color: var(--garrix-white);
  box-shadow: 4px 4px 0 rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
}

.garrix-input-wrapper:hover {
  transform: translate(-2px, -2px);
  box-shadow: 6px 6px 0 rgba(0, 0, 0, 0.1);
}

:deep(.garrix-input-wrapper .el-input__wrapper),
:deep(.garrix-input-wrapper .el-select__wrapper) {
  border: none !important;
  box-shadow: none !important;
  background-color: transparent !important;
  padding: 0 15px;
  height: 54px;
}

/* Status badges */
.status-badge {
  padding: 4px 10px;
  border-radius: 0;
  font-size: 12px;
  font-weight: 600;
  border: 1px solid;
  white-space: nowrap;
  display: inline-block;
  min-width: 90px;
  text-align: center;
}

.status-pending {
  color: #c78517;
  border-color: #F9A825;
}

.status-approved {
  color: #2E7D32;
  border-color: #4CAF50;
}

/* Platform icons */
.platform-icon {
  height: 20px;
  width: 20px;
  object-fit: contain;
}

/* Details dialog */
.dialog-layout {
  display: grid;
  grid-template-columns: 350px 1fr;
  gap: 30px;
}

.preview-column {
  display: flex;
  flex-direction: column;
  gap: 30px;
}

.cover-preview h4,
.link-preview h4 {
  font-size: 14px;
  font-weight: 600;
  margin: 0 0 10px;
  color: var(--garrix-text-secondary);
}

.cover-container {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  border: 1px solid var(--garrix-border-grey);
  overflow: hidden;
}

.album-cover {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.link-url {
  margin-top: 10px;
}

/* Details column */
.album-main-info {
  margin-bottom: 24px;
  border-bottom: 2px solid var(--garrix-border-grey);
  padding-bottom: 16px;
}

.album-title {
  font-size: 24px;
  font-weight: 700;
  margin: 0 0 8px;
  color: var(--garrix-text-primary);
}

.album-artist {
  font-size: 16px;
  color: var(--garrix-text-secondary);
  margin: 0;
}

.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  padding-bottom: 16px;
  margin-bottom: 16px;
  border-bottom: 1px solid var(--garrix-border-grey);
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-label {
  font-size: 12px;
  color: var(--garrix-text-secondary);
  text-transform: uppercase;
}

/* Platform links */
.platform-links h4 {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 16px;
  color: var(--garrix-text-primary);
}

.platform-grid {
  display: grid;
  gap: 12px;
}

.platform-item {
  display: grid;
  grid-template-columns: 24px auto 1fr;
  align-items: center;
  gap: 12px;
  padding: 8px;
  border: 1px solid var(--garrix-border-grey);
  border-radius: 4px;
}

.platform-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--garrix-text-primary);
}

.platform-link {
  font-size: 14px;
  color: var(--garrix-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Mobile view */
@media (max-width: 768px) {
  .desktop-view {
    display: none;
  }
  
  .mobile-view {
    display: block;
  }
  
  .dialog-layout {
    grid-template-columns: 1fr;
    gap: 24px;
  }
  
  .filter-bar {
    flex-direction: column;
    gap: 12px;
  }
  
  .filter-bar .garrix-input-wrapper:first-of-type {
    width: 100%;
  }
  
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }
  
  .header-actions {
    width: 100%;
  }
  
  .link-cards {
    display: grid;
    grid-template-columns: 1fr;
    gap: 16px;
  }
  
  .link-card {
    border: 1px solid var(--garrix-border-grey);
    border-radius: 4px;
    overflow: hidden;
  }
  
  .card-header {
    display: flex;
    padding: 12px;
    gap: 12px;
    background-color: var(--garrix-light-grey);
  }
  
  .card-album-cover {
    width: 60px;
    height: 60px;
    object-fit: cover;
  }
  
  .card-title {
    font-size: 16px;
    font-weight: 600;
    margin: 0 0 4px;
  }
  
  .card-artist {
    font-size: 14px;
    color: var(--garrix-text-secondary);
    margin: 0;
  }
  
  .card-body {
    padding: 12px;
  }
  
  .card-info-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }
  
  .card-footer {
    padding: 12px;
    border-top: 1px solid var(--garrix-border-grey);
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }
}

@media (max-width: 480px) {
  .user-album-links {
    padding: 16px 12px;
  }
  
  .platform-grid {
    grid-template-columns: 1fr;
  }
  
  .platform-item {
    grid-template-columns: 24px auto;
  }
  
  .platform-link {
    grid-column: 1 / -1;
    padding-left: 36px;
  }
}

/* 编辑对话框样式 */
.edit-dialog-content {
  padding: 0 10px;
}

.edit-album-title {
  font-size: 20px;
  font-weight: 600;
  margin: 0 0 8px;
}

.edit-album-artist {
  font-size: 16px;
  color: #666;
  margin: 0 0 20px;
}

.platform-links-form {
  margin-top: 20px;
}

.platform-links-form h4 {
  font-size: 16px;
  margin-bottom: 10px;
}

.form-tip {
  font-size: 14px;
  color: #999;
  margin-bottom: 20px;
}

.platform-input-row {
  display: flex;
  align-items: center;
  margin-bottom: 15px;
}

.platform-info {
  display: flex;
  align-items: center;
  width: 150px;
  margin-right: 15px;
}

.platform-icon {
  width: 24px;
  height: 24px;
  margin-right: 10px;
}

.platform-name {
  font-size: 14px;
  font-weight: 500;
}
</style> 