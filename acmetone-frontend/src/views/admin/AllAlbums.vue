<template>
  <div class="admin-all-albums-container">
    <div class="header-with-actions">
      <h2>所有用户专辑</h2>
      <div class="filter-actions">
        <el-select v-model="filterStatus" placeholder="专辑状态" clearable @change="handleFilterChange" class="apple-select">
          <el-option label="全部" value="" />
          <el-option label="草稿" value="draft" />
          <el-option label="待审核" value="pending" />
          <el-option label="已通过" value="approved" />
          <el-option label="已拒绝" value="rejected" />
        </el-select>
        <el-input
          v-model="searchQuery"
          placeholder="搜索专辑名称或描述"
          clearable
          @clear="handleFilterChange"
          @keyup.enter="handleFilterChange"
          class="apple-input"
        >
          <template #append>
            <el-button @click="handleFilterChange">
              <el-icon><Search /></el-icon>
            </el-button>
          </template>
        </el-input>
      </div>
    </div>

    <div v-if="loading" class="loading-container">
      <div class="submission-cards-container">
        <div class="submission-card is-loading" v-for="i in 6" :key="i">
          <div class="submission-card-content">
            <div class="submission-card-header skeleton-header"></div>
            <div class="submission-main-info">
              <div class="skeleton-title"></div>
              <div class="skeleton-author"></div>
            </div>
            <div class="submission-meta">
              <div class="skeleton-meta" v-for="j in 2" :key="j"></div>
            </div>
            <div class="submission-user">
              <div class="skeleton-user"></div>
            </div>
            <div class="submission-card-footer">
              <div class="skeleton-button"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <div v-else-if="errorMessage" class="error-container">
      <el-alert
        :title="errorMessage"
        type="error"
        description="请尝试刷新页面或联系管理员"
        show-icon
        class="error-alert"
      />
      <el-button class="refresh-btn apple-button refresh-button" type="primary" @click="fetchAlbums">
        <el-icon><RefreshRight /></el-icon>
        刷新
      </el-button>
    </div>
    
    <div v-else-if="albums.length === 0" class="empty-container">
      <el-empty description="暂无专辑数据" />
    </div>

    <!-- 卡片式专辑列表 -->
    <div v-else class="submission-cards-container">
      <div 
        v-for="album in albums" 
        :key="album.id"
        class="submission-card"
      >
        <div class="submission-card-content">
          <div class="submission-card-header">
            <div class="submission-status">
              <div class="status-indicator" :class="`status-${getStatusClass(getActualStatus(album))}`">
                <el-icon v-if="getActualStatus(album) === 'pending'"><WarningFilled /></el-icon>
                <el-icon v-else-if="getActualStatus(album) === 'draft'"><InfoFilled /></el-icon>
                <el-icon v-else-if="getActualStatus(album) === 'approved'"><CircleCheckFilled /></el-icon>
                <el-icon v-else-if="getActualStatus(album) === 'rejected'"><CircleCloseFilled /></el-icon>
              </div>
              <div class="status-text">{{ getStatusText(getActualStatus(album)) }}</div>
            </div>
            <div class="submission-date">
              <el-icon><Calendar /></el-icon>
              {{ formatDateTime(album.updatedAt) }}
            </div>
          </div>
          
          <div class="album-cover-container">
            <img 
              :src="album.coverImageUrl || '/placeholder-album.png'" 
              class="album-cover" 
              @error="handleImageError($event, album)"
              alt="专辑封面"
            />
          </div>
          
          <div class="submission-main-info">
            <h3 class="submission-title-text">{{ album.title }}</h3>
            <div class="submission-author-text">{{ album.performer || '未知艺术家' }}</div>
          </div>
          
          <div class="submission-meta">
            <div class="meta-item">
              <div class="meta-label">类型</div>
              <div class="meta-value">{{ album.type }}</div>
            </div>
            <div class="meta-item">
              <div class="meta-label">发行日期</div>
              <div class="meta-value">{{ formatDate(album.releaseDate) }}</div>
            </div>
          </div>
          
          <div class="submission-user">
            <div class="user-label">提交者</div>
            <div class="user-name">{{ album.submittedBy?.username || '未知用户' }}</div>
            <div class="user-email">歌曲数量: {{ album.Songs?.length || 0 }}</div>
          </div>
          
          <div class="submission-card-footer">
            <el-button 
              @click="handleView(album)" 
              link 
              type="primary"
              class="details-button-card"
            >
              <el-icon><Document /></el-icon>查看详情
            </el-button>
           
            <el-button 
              @click="handleDelete(album)" 
              link 
              type="danger"
              class="details-button-card delete-button"
            >
              <el-icon><Delete /></el-icon>删除
          </el-button>
          </div>
        </div>
      </div>
    </div>

    <div class="pagination-container" v-if="totalPages > 0">
      <el-pagination
        background
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        :total="total"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </div>

    <!-- 审核对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="50%"
    >
      <el-form
        ref="formRef"
        :model="form"
        label-width="100px"
      >
        <el-form-item label="审核意见">
          <el-input
            v-model="form.comment"
            type="textarea"
            :rows="4"
            placeholder="请输入审核意见"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleSubmit" :loading="submitLoading">
            确定
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 删除确认对话框 -->
    <el-dialog
      v-model="deleteDialogVisible"
      title="确认删除"
      width="30%"
    >
      <div class="delete-confirm-content">
        <el-icon class="delete-warning-icon"><WarningFilled /></el-icon>
        <p>确定要删除专辑 <strong>{{ albumToDelete?.title }}</strong> 吗？</p>
        <p class="delete-warning">此操作将永久删除该专辑及其所有相关文件，无法恢复！</p>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="deleteDialogVisible = false">取消</el-button>
          <el-button type="danger" @click="confirmDelete" :loading="deleteLoading">
            确认删除
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, nextTick } from 'vue';
import { useAlbumStore } from '../../stores/album';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useRouter } from 'vue-router';
import axios from 'axios';
import { STATIC_BASE_URL } from '../../config';
import { 
  Search, 
  Document, 
  Edit, 
  Delete,
  Calendar, 
  RefreshRight,
  WarningFilled, 
  InfoFilled, 
  CircleCheckFilled, 
  CircleCloseFilled 
} from '@element-plus/icons-vue';
import { deleteAlbum } from '../../services/adminService';

const albumStore = useAlbumStore();
const router = useRouter();
const dialogVisible = ref(false);
const dialogTitle = ref('');
const loading = ref(false);
const submitLoading = ref(false);
const errorMessage = ref('');
const currentAlbum = ref(null);
const currentAction = ref('');
const albums = ref([]);
const total = ref(0);
const currentPage = ref(1);
const pageSize = ref(20);
const totalPages = ref(0);
const filterStatus = ref('');
const searchQuery = ref('');
const staticBaseUrl = STATIC_BASE_URL;
const deleteDialogVisible = ref(false);
const albumToDelete = ref(null);
const deleteLoading = ref(false);

const form = reactive({
  comment: '',
});

const formatDate = (date) => {
  if (!date) return '未知';
  return new Date(date).toLocaleDateString('zh-CN');
};

const formatDateTime = (date) => {
  if (!date) return '未知';
  return new Date(date).toLocaleString('zh-CN');
};

// 判断专辑实际状态的函数
const getActualStatus = (album) => {
  // 如果状态为pending且评论为"DRAFT: 尚未提交审核"，则为草稿状态
  if (album.status === 'pending' && album.comment === 'DRAFT: 尚未提交审核') {
    return 'draft';
  }
  return album.status;
};

// 获取状态对应的CSS类名
const getStatusClass = (status) => {
  switch (status) {
    case 'approved': return '2';
    case 'rejected': return '-1';
    case 'pending': return '0';
    case 'draft': return '1';
    default: return '0';
  }
};

const getStatusType = (status) => {
  switch (status) {
    case 'approved': return 'success';
    case 'rejected': return 'danger';
    case 'pending': return 'warning';
    case 'draft': return 'info';
    default: return '';
  }
};

const getStatusText = (status) => {
  switch (status) {
    case 'approved': return '已通过';
    case 'rejected': return '已拒绝';
    case 'pending': return '待审核';
    case 'draft': return '草稿';
    default: return '未知';
  }
};

// 使用后端API获取缩略图路径
const requestThumbnail = async (originalPath) => {
  try {
    // 如果原图路径已经是完整URL
    if (originalPath.startsWith('http')) {
      // 检查URL是否已包含缩略图标识
      if (originalPath.includes('thumb_')) {
        return originalPath;
      } else {
        // 从URL中提取路径部分
        const url = new URL(originalPath);
        const pathParts = url.pathname.split('/');
        const fileName = pathParts[pathParts.length - 1];
        
        // 构建缩略图路径
        // 如果路径中包含thumbnails目录
        if (url.pathname.includes('/thumbnails/')) {
          // 在文件名前加上thumb_前缀
          const thumbFileName = `thumb_${fileName}`;
          const dirPath = pathParts.slice(0, -1).join('/');
          url.pathname = `${dirPath}/${thumbFileName}`;
        } else {
          // 添加thumbnails目录和thumb_前缀
          const dirPath = pathParts.slice(0, -1).join('/');
          url.pathname = `${dirPath}/thumbnails/thumb_${fileName}`;
        }
        
        return url.toString();
      }
    } else {
      // 本地路径处理
      const pathParts = originalPath.split('/');
      const fileName = pathParts[pathParts.length - 1];
      
      // 如果路径中包含thumbnails目录
      if (originalPath.includes('/thumbnails/')) {
        // 在文件名前加上thumb_前缀
        const thumbFileName = `thumb_${fileName}`;
        const dirPath = pathParts.slice(0, -1).join('/');
        return `${dirPath}/${thumbFileName}`;
      } else {
        // 添加thumbnails目录和thumb_前缀
        const dirPath = pathParts.slice(0, -1).join('/');
        return `${dirPath}/thumbnails/thumb_${fileName}`;
      }
    }
  } catch (error) {
    console.error('构建缩略图路径失败:', error);
    // 出错时返回原路径
    return originalPath;
  }
};

// 获取专辑封面URL
const getAlbumCoverUrl = async (album) => {
  try {
    // 如果没有封面图片，返回占位图
    if (!album.coverImage) {
      return '/placeholder-album.png';
    }
    
    // 如果coverImage已经是完整URL且包含缩略图路径(thumb_)，直接使用
    if (album.coverImage.startsWith('http') && album.coverImage.includes('thumb_')) {
      return album.coverImage;
    }
    
    // 优先使用缩略图
    if (album.coverImageThumbnail) {
      // 判断缩略图路径是否已包含完整URL
      if (album.coverImageThumbnail.startsWith('http')) {
        return album.coverImageThumbnail;
      }
      // 确保路径格式正确
      if (album.coverImageThumbnail.startsWith('/')) {
        return `${staticBaseUrl}${album.coverImageThumbnail}`;
      } else {
        return `${staticBaseUrl}/${album.coverImageThumbnail}`;
      }
    }
    
    // 构建缩略图路径
    const thumbnailPath = await requestThumbnail(album.coverImage);
    
    // 返回完整的缩略图URL
    if (thumbnailPath.startsWith('http')) {
      return thumbnailPath;
    } else if (thumbnailPath.startsWith('/')) {
      return `${staticBaseUrl}${thumbnailPath}`;
    } else {
      return `${staticBaseUrl}/${thumbnailPath}`;
    }
  } catch (error) {
    console.error('获取专辑封面URL失败:', error);
    
    // 出错时返回原图路径
    if (album.coverImage) {
      if (album.coverImage.startsWith('http')) {
        return album.coverImage;
      } else if (album.coverImage.startsWith('/')) {
        return `${staticBaseUrl}${album.coverImage}`;
      } else {
        return `${staticBaseUrl}/${album.coverImage}`;
      }
    }
    
    // 如果没有图片，返回占位图
    return '/placeholder-album.png';
  }
};

// 同步版本的获取封面URL函数，用于内部调用
const getAlbumCoverUrlSync = (album) => {
  // 如果没有封面图片，返回占位图
  if (!album.coverImage) {
    return '/placeholder-album.png';
  }
  
  // 如果coverImage已经是完整URL且包含缩略图路径(thumb_)，直接使用
  if (album.coverImage.startsWith('http') && album.coverImage.includes('thumb_')) {
    return album.coverImage;
  }
  
  // 优先使用缩略图
  if (album.coverImageThumbnail) {
    // 判断缩略图路径是否已包含完整URL
    if (album.coverImageThumbnail.startsWith('http')) {
      return album.coverImageThumbnail;
    }
    // 确保路径格式正确
    if (album.coverImageThumbnail.startsWith('/')) {
      return `${staticBaseUrl}${album.coverImageThumbnail}`;
    } else {
      return `${staticBaseUrl}/${album.coverImageThumbnail}`;
    }
  }
  
  // 构建缩略图路径
  try {
    // 如果原图路径已经是完整URL
    if (album.coverImage.startsWith('http')) {
      // 检查URL是否已包含缩略图标识
      if (album.coverImage.includes('thumb_')) {
        return album.coverImage;
      } else {
        // 从URL中提取路径部分
        const url = new URL(album.coverImage);
        const pathParts = url.pathname.split('/');
        const fileName = pathParts[pathParts.length - 1];
        
        // 构建缩略图路径
        // 如果路径中包含thumbnails目录
        if (url.pathname.includes('/thumbnails/')) {
          // 在文件名前加上thumb_前缀
          const thumbFileName = `thumb_${fileName}`;
          const dirPath = pathParts.slice(0, -1).join('/');
          url.pathname = `${dirPath}/${thumbFileName}`;
        } else {
          // 添加thumbnails目录和thumb_前缀
          const dirPath = pathParts.slice(0, -1).join('/');
          url.pathname = `${dirPath}/thumbnails/thumb_${fileName}`;
        }
        
        return url.toString();
      }
    } else {
      // 本地路径处理
      const pathParts = album.coverImage.split('/');
      const fileName = pathParts[pathParts.length - 1];
      
      // 如果路径中包含thumbnails目录
      if (album.coverImage.includes('/thumbnails/')) {
        // 在文件名前加上thumb_前缀
        const thumbFileName = `thumb_${fileName}`;
        const dirPath = pathParts.slice(0, -1).join('/');
        const thumbPath = `${dirPath}/${thumbFileName}`;
        
        // 返回缩略图URL
        if (thumbPath.startsWith('/')) {
          return `${staticBaseUrl}${thumbPath}`;
        } else {
          return `${staticBaseUrl}/${thumbPath}`;
        }
      } else {
        // 添加thumbnails目录和thumb_前缀
        const dirPath = pathParts.slice(0, -1).join('/');
        const thumbPath = `${dirPath}/thumbnails/thumb_${fileName}`;
        
        // 返回缩略图URL
        if (thumbPath.startsWith('/')) {
          return `${staticBaseUrl}${thumbPath}`;
        } else {
          return `${staticBaseUrl}/${thumbPath}`;
        }
      }
    }
  } catch (error) {
    console.error('构建缩略图URL失败:', error);
    
    // 出错时返回原图路径
    if (album.coverImage.startsWith('http')) {
      return album.coverImage;
    } else if (album.coverImage.startsWith('/')) {
      return `${staticBaseUrl}${album.coverImage}`;
    } else {
      return `${staticBaseUrl}/${album.coverImage}`;
    }
  }
};

// 处理图片加载失败
const handleImageError = (event, album) => {
  // 如果是缩略图加载失败，尝试加载原图
  if (event.target.src.includes('thumb_')) {
      // 构建原图URL
      let originalUrl;
    if (album.coverImage) {
      if (album.coverImage.startsWith('http')) {
        originalUrl = album.coverImage;
      } else if (album.coverImage.startsWith('/')) {
        originalUrl = `${staticBaseUrl}${album.coverImage}`;
      } else {
        originalUrl = `${staticBaseUrl}/${album.coverImage}`;
      }
      
      // 移除URL中的缩略图部分
      originalUrl = originalUrl.replace('/thumbnails/thumb_', '/');
      originalUrl = originalUrl.replace('thumb_', '');
      
      event.target.src = originalUrl;
      return;
    }
  }
  
  // 如果不是缩略图或找不到对应专辑，使用默认占位图
  event.target.src = '/placeholder-album.png';
  event.target.onerror = null; // 防止无限循环
};

const handleView = (album) => {
  router.push(`/albums/${album.id}`);
};

const handleEdit = (album) => {
  router.push(`/admin/all-albums/${album.id}`);
};

const handleApprove = (album) => {
  currentAlbum.value = album;
  currentAction.value = 'approved';
  dialogTitle.value = '审核通过';
  form.comment = '';
  dialogVisible.value = true;
};

const handleReject = (album) => {
  currentAlbum.value = album;
  currentAction.value = 'rejected';
  dialogTitle.value = '审核拒绝';
  form.comment = '';
  dialogVisible.value = true;
};

const handleSubmit = async () => {
  if (!currentAlbum.value || !currentAction.value) return;

  try {
    submitLoading.value = true;
    await albumStore.updateAlbumStatus(
      currentAlbum.value.id,
      currentAction.value,
      form.comment
    );
    await fetchAlbums();
    ElMessage.success('审核操作成功');
    dialogVisible.value = false;
  } catch (error) {
    console.error('审核操作失败:', error);
    ElMessage.error(error.toString());
  } finally {
    submitLoading.value = false;
    form.comment = '';
    currentAlbum.value = null;
    currentAction.value = '';
  }
};

const handleDelete = (album) => {
  albumToDelete.value = album;
  deleteDialogVisible.value = true;
};

const confirmDelete = async () => {
  if (!albumToDelete.value) return;
  
  try {
    deleteLoading.value = true;
    const result = await deleteAlbum(albumToDelete.value.id);
    
    if (result.success) {
      ElMessage.success(result.message || '专辑删除成功');
      // 刷新专辑列表
      await fetchAlbums();
    } else {
      ElMessage.error(result.message || '专辑删除失败');
    }
    
    deleteDialogVisible.value = false;
  } catch (error) {
    console.error('删除专辑失败:', error);
    ElMessage.error('删除专辑失败: ' + (error.message || '未知错误'));
  } finally {
    deleteLoading.value = false;
    albumToDelete.value = null;
  }
};

// 预加载所有专辑封面
const preloadAlbumCovers = async () => {
  for (const album of albums.value) {
    try {
      album.coverImageUrl = await getAlbumCoverUrl(album);
    } catch (error) {
      console.error(`加载专辑 ${album.id} 封面失败:`, error);
      album.coverImageUrl = '/placeholder-album.png';
    }
  }
};

const fetchAlbums = async () => {
  try {
    loading.value = true;
    errorMessage.value = '';
    
    const filters = {
      status: filterStatus.value,
      search: searchQuery.value
    };
    
    // 特殊处理草稿状态的筛选
    if (filters.status === 'draft') {
      // 后端API不支持直接筛选草稿状态，先获取所有待审核状态的专辑
      filters.status = 'pending';
    }
    
    const result = await albumStore.fetchAllAlbums(currentPage.value, pageSize.value, filters);
    
    // 如果筛选状态为草稿，手动过滤出草稿状态的专辑
    if (filterStatus.value === 'draft') {
      albums.value = result.albums.filter(album => 
        album.status === 'pending' && album.comment === 'DRAFT: 尚未提交审核'
      );
      // 更新总数和总页数
      total.value = albums.value.length;
      totalPages.value = Math.ceil(total.value / pageSize.value);
    } 
    // 如果筛选状态为待审核，排除草稿状态
    else if (filterStatus.value === 'pending') {
      albums.value = result.albums.filter(album => 
        !(album.status === 'pending' && album.comment === 'DRAFT: 尚未提交审核')
      );
      // 更新总数和总页数
      total.value = albums.value.length;
      totalPages.value = Math.ceil(total.value / pageSize.value);
    }
    else {
      albums.value = result.albums;
      total.value = result.total;
      totalPages.value = result.totalPages;
    }

    // 预加载专辑封面
    await preloadAlbumCovers();
  } catch (error) {
    console.error('获取专辑失败:', error);
    errorMessage.value = '获取专辑失败：' + (error.message || '未知错误');
    ElMessage.error('获取专辑失败');
  } finally {
    loading.value = false;
  }
};

const handleFilterChange = () => {
  currentPage.value = 1;
  fetchAlbums();
};

const handleSizeChange = (size) => {
  pageSize.value = size;
  fetchAlbums();
};

const handleCurrentChange = (page) => {
  currentPage.value = page;
  fetchAlbums();
};

onMounted(fetchAlbums);
</script>

<style scoped>
.admin-all-albums-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  width: 100%;
  box-sizing: border-box;
  overflow-x: hidden;
}

h2 {
  margin-bottom: 20px;
}

.dialog-footer {
  margin-top: 20px;
}

.loading-container, .error-container, .empty-container {
  margin: 40px 0;
  text-align: center;
}

.refresh-btn {
  margin-top: 20px;
}

.header-with-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.filter-actions {
  display: flex;
  gap: 10px;
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}

/* 卡片式专辑列表样式 */
.submission-cards-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
  margin-bottom: 24px;
}

.submission-card {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  transition: all 0.3s ease;
  height: 100%;
}

.submission-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.submission-card-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 0;
}

.submission-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: #f5f5f7;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.submission-status {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #f5f5f7;
  color: #86868b;
}

.status-indicator.status-0 {
  background: #fff8e6;
  color: #ff9500;
}

.status-indicator.status-1 {
  background: #e6f3ff;
  color: #0071e3;
}

.status-indicator.status-2 {
  background: #e6f4ea;
  color: #34c759;
}

.status-indicator.status--1 {
  background: #ffe6e6;
  color: #ff3b30;
}

.status-text {
  font-size: 14px;
  font-weight: 600;
  color: #1d1d1f;
}

.submission-date {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #86868b;
}

/* 专辑封面容器 */
.album-cover-container {
  width: 100%;
  height: 180px;
  overflow: hidden;
  position: relative;
  background-color: #f5f5f7;
  display: flex;
  align-items: center;
  justify-content: center;
}

.album-cover {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.submission-card:hover .album-cover {
  transform: scale(1.05);
}

.submission-main-info {
  padding: 20px 20px 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.submission-title-text {
  margin: 0 0 8px;
  font-size: 18px;
  font-weight: 600;
  color: #1d1d1f;
  line-height: 1.3;
}

.submission-author-text {
  font-size: 15px;
  color: #6e6e73;
}

.submission-meta {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  padding: 16px 20px;
  background: #fff;
}

.meta-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.meta-label {
  font-size: 12px;
  color: #86868b;
  font-weight: 500;
}

.meta-value {
  font-size: 14px;
  font-weight: 500;
  color: #1d1d1f;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.submission-user {
  padding: 12px 20px;
  background: #f5f5f7;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.user-label {
  font-size: 12px;
  color: #86868b;
  font-weight: 500;
  margin-bottom: 2px;
}

.user-name {
  font-size: 14px;
  font-weight: 500;
  color: #1d1d1f;
}

.user-email {
  font-size: 12px;
  color: #6e6e73;
  word-break: break-all;
}

.submission-card-footer {
  padding: 16px 20px;
  background: #fff;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
  display: flex;
  justify-content: space-between;
  gap: 10px;
}

.details-button-card {
  display: flex !important;
  align-items: center;
  gap: 6px;
  border-radius: 100px !important;
  padding: 8px 16px !important;
  font-size: 14px !important;
  font-weight: 500 !important;
  background: #0071e3 !important;
  border-color: #0071e3 !important;
  color: #fff !important;
  transition: all 0.3s ease;
  flex: 1;
  justify-content: center;
}

.details-button-card:hover {
  background: #0077ed !important;
  transform: translateY(-2px);
  box-shadow: 0 4px 10px rgba(0, 113, 227, 0.3);
}

.details-button-card.edit-button {
  background: #ff9500 !important;
  border-color: #ff9500 !important;
}

.details-button-card.edit-button:hover {
  background: #ffA530 !important;
  box-shadow: 0 4px 10px rgba(255, 149, 0, 0.3);
}

.details-button-card.delete-button {
  color: #f56c6c;
}

.details-button-card.delete-button:hover {
  color: #f78989;
}

/* 卡片加载状态 */
.submission-card.is-loading {
  pointer-events: none;
}

.skeleton-header {
  height: 56px;
  background: linear-gradient(90deg, #f0f0f2 25%, #f5f5f7 50%, #f0f0f2 75%);
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s infinite;
}

.skeleton-title {
  height: 22px;
  width: 80%;
  margin-bottom: 12px;
  border-radius: 4px;
  background: linear-gradient(90deg, #f0f0f2 25%, #f5f5f7 50%, #f0f0f2 75%);
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s infinite;
}

.skeleton-author {
  height: 16px;
  width: 50%;
  border-radius: 4px;
  background: linear-gradient(90deg, #f0f0f2 25%, #f5f5f7 50%, #f0f0f2 75%);
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s infinite;
}

.skeleton-meta {
  height: 40px;
  border-radius: 4px;
  background: linear-gradient(90deg, #f0f0f2 25%, #f5f5f7 50%, #f0f0f2 75%);
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s infinite;
}

.skeleton-user {
  height: 45px;
  border-radius: 4px;
  background: linear-gradient(90deg, #f0f0f2 25%, #f5f5f7 50%, #f0f0f2 75%);
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s infinite;
}

.skeleton-button {
  height: 32px;
  width: 100px;
  border-radius: 100px;
  background: linear-gradient(90deg, #f0f0f2 25%, #f5f5f7 50%, #f0f0f2 75%);
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s infinite;
}

@keyframes skeleton-loading {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

/* 响应式调整 */
@media screen and (max-width: 768px) {
  .admin-all-albums-container {
    padding: 16px;
  }

  .header-with-actions {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }

  .filter-actions {
    width: 100%;
    flex-direction: column;
  }

  .submission-cards-container {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  
  .submission-meta {
    padding: 12px 16px;
  }
  
  .submission-user {
    padding: 12px 16px;
  }
  
  .submission-card-header,
  .submission-main-info,
  .submission-card-footer {
    padding: 12px 16px;
  }
  
  .submission-title-text {
    font-size: 16px;
  }
  
  .skeleton-meta,
  .skeleton-user {
    height: 35px;
  }
}

/* 错误提示 */
.error-alert {
  margin-bottom: 16px;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  border: none;
}

/* 苹果风格按钮 */
.apple-button {
  border-radius: 8px !important;
  font-weight: 500 !important;
  display: flex !important;
  align-items: center !important;
  gap: 6px !important;
  transition: all 0.3s ease !important;
}

.apple-button.refresh-button {
  background: #0071e3 !important;
  border-color: #0071e3 !important;
  color: #fff !important;
}

.apple-button.refresh-button:hover {
  background: #0077ed !important;
  box-shadow: 0 2px 8px rgba(0, 113, 227, 0.3) !important;
}

/* 苹果风格选择器 */
.apple-select.el-select .el-input__wrapper {
  border-radius: 8px;
  background: #f5f5f7;
  box-shadow: none !important;
  border: 1px solid transparent;
}

.apple-select.el-select .el-input__wrapper:hover {
  background: #f0f0f2;
  border-color: #e5e5e5;
}

.apple-select.el-select .el-input__wrapper.is-focus {
  background: #fff;
  border-color: #0071e3;
}

.apple-input.el-input .el-input__wrapper {
  border-radius: 8px;
  background: #f5f5f7;
  box-shadow: none !important;
  border: 1px solid transparent;
}

.apple-input.el-input .el-input__wrapper:hover {
  background: #f0f0f2;
  border-color: #e5e5e5;
}

.apple-input.el-input .el-input__wrapper.is-focus {
  background: #fff;
  border-color: #0071e3;
}

.delete-confirm-content {
  text-align: center;
  padding: 20px 0;
}

.delete-warning-icon {
  font-size: 48px;
  color: #f56c6c;
  margin-bottom: 20px;
}

.delete-warning {
  color: #f56c6c;
  font-size: 14px;
  margin-top: 10px;
}
</style> 