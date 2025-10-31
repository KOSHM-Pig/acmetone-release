<template>
  <div class="album-link-form">
    <el-form
      ref="formRef"
      :model="form"
      :rules="formRules"
      label-width="100px"
      label-position="left"
      @submit.prevent="submitForm"
    >
      <el-form-item label="页面标题" prop="title">
        <el-input v-model="form.title" placeholder="页面标题" />
      </el-form-item>
      
      <el-divider content-position="center">专辑信息</el-divider>
      
      <el-form-item label="专辑类型" prop="albumType">
        <el-radio-group v-model="form.albumType">
          <el-radio label="external">外部专辑</el-radio>
          <el-radio label="internal">内部专辑</el-radio>
        </el-radio-group>
        <div class="form-tip">
          外部专辑：手动填写专辑信息；内部专辑：关联到系统内已有专辑
        </div>
      </el-form-item>
      
      <template v-if="form.albumType === 'internal'">
        <el-form-item label="关联专辑" prop="internalAlbumId">
          <el-select 
            v-model="form.internalAlbumId"
            filterable
            remote
            reserve-keyword
            placeholder="搜索并选择系统内专辑"
            :remote-method="searchInternalAlbums"
            :loading="loadingAlbums"
            style="width: 100%;"
          >
            <el-option
              v-for="album in internalAlbums"
              :key="album.id"
              :label="`${album.title} - ${album.displayInfo}`"
              :value="album.id"
            >
              <div style="display: flex; align-items: center;">
                <div class="image-container" style="width: 40px; height: 40px; margin-right: 10px; position: relative;">
                  <el-image
                    style="width: 40px; height: 40px;"
                    :src="getAlbumThumbnailUrl(album)"
                    fit="cover"
                    @error="handleImageError"
                  />
                  <div v-if="isImageFailed(getAlbumThumbnailUrl(album))" class="image-failed-indicator" style="width: 40px; height: 40px;">
                    <el-icon size="small"><WarningFilled /></el-icon>
                  </div>
                </div>
                <div>
                  <div>{{ album.title }}</div>
                  <div style="font-size: 12px; color: #999;">{{ album.displayInfo }}</div>
                </div>
              </div>
            </el-option>
          </el-select>
          <div class="form-tip">
            选择关联的内部专辑后，将自动填充专辑信息
          </div>
        </el-form-item>
      </template>
      
      <template v-else>
        <el-form-item label="专辑名称" prop="albumName">
          <el-input v-model="form.albumName" placeholder="专辑名称" />
        </el-form-item>
        
        <el-form-item label="歌手名称" prop="artistName">
          <el-input v-model="form.artistName" placeholder="歌手名称" />
        </el-form-item>
        
        <el-form-item label="发布日期" prop="releaseDate">
          <el-date-picker
            v-model="form.releaseDate"
            type="date"
            placeholder="选择发布日期"
            style="width: 100%;"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>
      </template>
      
      <el-form-item label="页面标识符" prop="slug">
        <div class="slug-input-container">
          <el-input 
            v-model="form.slug" 
            placeholder="仅允许字母、数字和连字符"
            :disabled="isEditing || autoGenerateSlug"
          />
          <el-checkbox v-model="autoGenerateSlug" :disabled="isEditing" style="margin-left: 10px;">自动生成</el-checkbox>
        </div>
        <div class="form-tip" v-if="autoGenerateSlug">
          标识符将根据"专辑名-歌手名"自动生成
        </div>
        <div class="form-tip">
          生成的页面URL: /album/{{ form.slug || 'example' }}
        </div>
      </el-form-item>
      
      <el-form-item label="封面图片" prop="coverImage">
        <el-radio-group v-model="uploadType" style="margin-bottom: 10px;">
          <el-radio label="local">上传到本地服务器</el-radio>
          <el-radio label="remote">使用图床链接</el-radio>
        </el-radio-group>
        
        <div v-if="uploadType === 'local'">
          <el-upload
            class="upload-container"
            action="#"
            :http-request="handleFileUpload"
            :show-file-list="false"
            :before-upload="beforeUpload"
          >
            <div v-if="imageUrl" class="preview-container">
              <img :src="imageUrl" class="preview-image" @error="handleImageError" />
              <div v-if="isImageFailed(imageUrl)" class="image-failed-indicator">
                <el-tooltip content="图片加载失败" placement="top">
                  <el-icon><WarningFilled /></el-icon>
                </el-tooltip>
              </div>
              <div class="preview-actions">
                <el-button type="primary" size="small">更换图片</el-button>
              </div>
            </div>
            <el-button v-else type="primary" :loading="isCompressing">
              {{ isCompressing ? '压缩中...' : '上传封面图片' }}
            </el-button>
            <template #tip>
              <div class="el-upload__tip">
                仅支持JPG/PNG格式，建议尺寸为正方形，允许最大20MB (会自动压缩)
              </div>
            </template>
          </el-upload>
        </div>
        
        <div v-else>
          <el-input 
            v-model="form.externalImageUrl" 
            placeholder="请输入图床图片URL" 
            clearable
            @input="handleExternalImageInput"
          >
            <template #append>
              <el-button @click="previewExternalImage">预览</el-button>
            </template>
          </el-input>
          <div v-if="imageUrl" class="preview-container" style="margin-top: 10px;">
            <img :src="imageUrl" class="preview-image" @error="handleImageError" />
            <div v-if="isImageFailed(imageUrl)" class="image-failed-indicator">
              <el-tooltip content="图片加载失败" placement="top">
                <el-icon><WarningFilled /></el-icon>
              </el-tooltip>
            </div>
          </div>
          <div class="el-upload__tip">
            支持常见图床链接，如七牛云、阿里云OSS、腾讯云COS等
          </div>
        </div>
      </el-form-item>
      
      <el-form-item label="页面描述" prop="description">
        <el-input
          v-model="form.description"
          type="textarea"
          :rows="3"
          placeholder="页面描述，如不填写将使用默认描述"
        />
      </el-form-item>
      
      <el-divider content-position="center">音乐平台链接</el-divider>

      <el-form-item label="网易云音乐" prop="netease">
        <el-input v-model="form.netease" placeholder="请输入网易云音乐链接" />
      </el-form-item>
      <el-form-item label="QQ音乐" prop="qq">
        <el-input v-model="form.qq" placeholder="请输入QQ音乐链接" />
      </el-form-item>
      <el-form-item label="酷狗音乐" prop="kugou">
        <el-input v-model="form.kugou" placeholder="请输入酷狗音乐链接" />
      </el-form-item>
      <el-form-item label="酷我音乐" prop="kuwo">
        <el-input v-model="form.kuwo" placeholder="请输入酷我音乐链接" />
      </el-form-item>
      <el-form-item label="汽水音乐" prop="qishui">
        <el-input v-model="form.qishui" placeholder="请输入汽水音乐链接" />
      </el-form-item>
      <el-form-item label="Spotify" prop="spotify">
        <el-input v-model="form.spotify" placeholder="请输入Spotify链接" />
      </el-form-item>
      <el-form-item label="YouTube" prop="youtube">
        <el-input v-model="form.youtube" placeholder="请输入YouTube链接" />
      </el-form-item>
      <el-form-item label="Apple Music" prop="appleMusic">
        <el-input v-model="form.appleMusic" placeholder="请输入Apple Music链接" />
      </el-form-item>
      <el-form-item label="SoundCloud" prop="soundCloud">
        <el-input v-model="form.soundCloud" placeholder="请输入SoundCloud链接" />
      </el-form-item>
      
      <el-form-item v-if="isEditing" label="启用状态" prop="isActive">
        <el-switch v-model="form.isActive" />
      </el-form-item>
      
      <el-form-item>
        <el-button type="primary" @click="submitForm" :loading="submitting">
          {{ isEditing ? '保存修改' : '创建专辑链接' }}
        </el-button>
        <el-button @click="$emit('cancel')">取消</el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { WarningFilled, Refresh } from '@element-plus/icons-vue';
import { useAlbumLinkStore } from '@/stores/albumLink';
import imageCompression from 'browser-image-compression';
import { STATIC_BASE_URL } from '@/config';

// 创建一个Set来存储已知失败的图片URL
const failedImageUrls = new Set();

const props = defineProps({
  initialData: {
    type: Object,
    default: () => ({})
  },
  isEditing: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['submit', 'cancel']);

const albumLinkStore = useAlbumLinkStore();
const formRef = ref(null);
const submitting = ref(false);
const imageUrl = ref('');
const imageFile = ref(null);
const coverImageBase64 = ref(null);
const uploadType = ref('local');
const autoGenerateSlug = ref(true);
const loadingAlbums = ref(false);
const internalAlbums = ref([]);
const isCompressing = ref(false);

// 表单数据
const form = reactive({
  id: null,
  title: '',
  albumName: '',
  artistName: '',
  releaseDate: '',
  slug: '',
  description: '',
  coverImage: null,
  isActive: true,
  externalImageUrl: '',
  albumType: 'external',
  internalAlbumId: null,
  coverImageBase64: null,
  netease: '',
  qq: '',
  kugou: '',
  kuwo: '',
  qishui: '',
  spotify: '',
  youtube: '',
  appleMusic: '',
  soundCloud: ''
});

// 表单验证规则
const formRules = {
  title: [
    { required: true, message: '请输入页面标题', trigger: 'blur' },
    { min: 1, max: 100, message: '长度在1到100个字符之间', trigger: 'blur' }
  ],
  albumType: [
    { required: true, message: '请选择专辑类型', trigger: 'change' }
  ],
  albumName: [
    { 
      required: true, 
      message: '请输入专辑名称', 
      trigger: 'blur',
      // 仅当albumType为external时验证
      validator: (rule, value, callback) => {
        if (form.albumType === 'external' && !value) {
          callback(new Error('请输入专辑名称'));
        } else {
          callback();
        }
      }
    }
  ],
  artistName: [
    { 
      required: true, 
      message: '请输入歌手名称', 
      trigger: 'blur',
      // 仅当albumType为external时验证
      validator: (rule, value, callback) => {
        if (form.albumType === 'external' && !value) {
          callback(new Error('请输入歌手名称'));
        } else {
          callback();
        }
      }
    }
  ],
  internalAlbumId: [
    { 
      required: true, 
      message: '请选择关联专辑', 
      trigger: 'change',
      // 仅当albumType为internal时验证
      validator: (rule, value, callback) => {
        if (form.albumType === 'internal' && !value) {
          callback(new Error('请选择关联专辑'));
        } else {
          callback();
        }
      }
    }
  ],
  releaseDate: [
    { 
      required: true, 
      message: '请选择发布日期', 
      trigger: 'change',
      // 仅当albumType为external时验证
      validator: (rule, value, callback) => {
        if (form.albumType === 'external' && !value) {
          callback(new Error('请选择发布日期'));
        } else {
          callback();
        }
      }
    }
  ],
  slug: [
    { 
      required: true, 
      message: '请输入页面标识符或选择自动生成', 
      trigger: 'blur' 
    }
    // },
    // { 
    //   pattern: /^[a-z0-9-]+$/,
    //   message: '页面标识符只能包含小写字母、数字和连字符',
    //   trigger: 'blur'
    // }
  ],
  coverImage: [
    { required: true, message: '请上传封面图片', trigger: 'change' }
  ]
};

// 初始化表单数据
const initForm = () => {
  if (props.initialData && Object.keys(props.initialData).length > 0) {
    Object.keys(form).forEach(key => {
      if (props.initialData[key] !== undefined && props.initialData[key] !== null) {
        form[key] = props.initialData[key];
      }
    });
    
    // 如果平台链接是存储在 platformLinks 对象中
    if (props.initialData.platformLinks) {
      Object.keys(props.initialData.platformLinks).forEach(platform => {
        if (platform in form) {
          form[platform] = props.initialData.platformLinks[platform];
        }
      });
    }
    
    // 设置图片预览
    if (props.initialData.coverImage) {
      imageUrl.value = getImageUrl(props.initialData.coverImage);
      
      // 判断图片来源类型
      if (props.initialData.coverImage.startsWith('/uploads/')) {
        // 本地上传的图片
        uploadType.value = 'local';
        form.externalImageUrl = '';
      } else {
        // 外部图床链接
        uploadType.value = 'remote';
        form.externalImageUrl = props.initialData.coverImage;
      }
    }
    
    // 如果是编辑模式，禁用自动生成slug
    if (props.isEditing) {
      autoGenerateSlug.value = false;
    }
    
    // 在编辑模式下，检查是否是内部专辑类型
    if (props.isEditing && props.initialData.internalAlbumId) {
      console.log('检测到内部专辑ID:', props.initialData.internalAlbumId);
      console.log('当前专辑类型:', form.albumType);
      
      // 如果有internalAlbumId，说明这是内部专辑类型
      form.albumType = 'internal';
      form.internalAlbumId = props.initialData.internalAlbumId;
      
      console.log('设置为内部专辑类型，ID:', form.internalAlbumId);
      
      // 异步加载内部专辑信息
      loadInternalAlbumInfo(props.initialData.internalAlbumId);
    }
  }
};

// 加载内部专辑信息
const loadInternalAlbumInfo = async (albumId) => {
  if (!albumId) return;
  
  try {
    loadingAlbums.value = true;
    console.log('加载内部专辑信息，ID:', albumId);
    
    // 获取内部专辑列表，包含指定的专辑
    const albums = await albumLinkStore.fetchInternalAlbums({
      search: '', // 空搜索获取所有专辑
      status: 'approved'
    });
    
    // 查找指定的专辑
    const targetAlbum = albums.find(album => album.id === parseInt(albumId));
    
    if (targetAlbum) {
      console.log('找到目标内部专辑:', targetAlbum);
      
      // 将找到的专辑添加到内部专辑列表中
      internalAlbums.value = [targetAlbum];
      
      // 更新表单数据
      form.albumName = targetAlbum.title;
      form.artistName = targetAlbum.displayInfo;
      form.releaseDate = targetAlbum.releaseDate || new Date().toISOString().split('T')[0];
      
      // 如果没有上传封面，使用内部专辑封面
      if (!imageUrl.value) {
        if (targetAlbum.coverImageThumbnail) {
          const thumbnailUrl = getImageUrl(targetAlbum.coverImageThumbnail);
          console.log('使用内部专辑缩略图:', targetAlbum.coverImageThumbnail);
          imageUrl.value = thumbnailUrl;
          form.coverImage = targetAlbum.coverImageThumbnail;
        } else if (targetAlbum.coverImage) {
          const coverUrl = getImageUrl(targetAlbum.coverImage);
          console.log('使用内部专辑原图:', targetAlbum.coverImage);
          imageUrl.value = coverUrl;
          form.coverImage = targetAlbum.coverImage;
        }
      }
      
      console.log('内部专辑信息加载完成');
    } else {
      console.warn('未找到指定的内部专辑，ID:', albumId);
      ElMessage.warning('未找到关联的内部专辑信息');
    }
  } catch (error) {
    console.error('加载内部专辑信息失败:', error);
    ElMessage.error('加载内部专辑信息失败');
  } finally {
    loadingAlbums.value = false;
  }
};

// 搜索内部专辑
const searchInternalAlbums = async (query) => {
  if (query) {
    loadingAlbums.value = true;
    try {
      const albums = await albumLinkStore.fetchInternalAlbums({
        search: query,
        status: 'approved'
      });
      
      // 处理专辑数据，确保图片路径正确
      internalAlbums.value = albums.map(album => {
        // 记录原始数据，帮助调试
        console.log('获取到内部专辑:', album.title, '封面:', album.coverImage, '缩略图:', album.coverImageThumbnail);
        
        // 确保专辑对象有正确的封面图片属性
        if (!album.coverImage && !album.coverImageThumbnail) {
          console.warn('专辑缺少封面图片:', album.title);
        }
        
        return album;
      });
    } catch (error) {
      console.error('获取内部专辑列表失败:', error);
      ElMessage.error('获取内部专辑列表失败');
    } finally {
      loadingAlbums.value = false;
    }
  } else {
    internalAlbums.value = [];
  }
};

// 覆盖 el-upload 的默认上传行为
const handleFileUpload = async ({ file }) => {
  const isJpgOrPng = file.type === 'image/jpeg' || file.type === 'image/png';
  if (!isJpgOrPng) {
    ElMessage.error('只能上传 JPG/PNG 格式的图片!');
    return;
  }
  
  // 显示本地预览
  imageUrl.value = URL.createObjectURL(file);
  
  // 读取文件并转换为Base64
  const reader = new FileReader();
  reader.onload = (e) => {
    form.coverImageBase64 = e.target.result;
    ElMessage.success('图片已准备好，将随表单一同提交');
  };
  reader.onerror = (error) => {
    console.error('FileReader error: ', error);
    ElMessage.error('图片读取失败');
  };
  reader.readAsDataURL(file);
};

// 图片上传前的校验和压缩
const beforeUpload = async (rawFile) => {
  const isImage = rawFile.type.startsWith('image/');
  const isLt20M = rawFile.size / 1024 / 1024 < 20;
  
  if (!isImage) {
    ElMessage.error('只能上传图片文件');
    return false;
  }
  
  if (!isLt20M) {
    ElMessage.error('图片太大，不能超过20MB');
    return false;
  }
  
  return true;
};

// 处理外部图片输入
const handleExternalImageInput = () => {
  if (form.externalImageUrl) {
    // 检查URL是否在已知失败列表中
    if (failedImageUrls.has(form.externalImageUrl)) {
      ElMessage.warning('该图片URL之前已加载失败，请尝试使用其他图片URL');
    }
    
    imageUrl.value = form.externalImageUrl;
    form.coverImage = 'external';
  } else {
    imageUrl.value = '';
  }
};

// 预览外部图片
const previewExternalImage = () => {
  if (form.externalImageUrl) {
    // 检查URL是否在已知失败列表中
    if (failedImageUrls.has(form.externalImageUrl)) {
      ElMessage.warning('该图片URL之前已加载失败，请尝试使用其他图片URL');
    }
    
    imageUrl.value = form.externalImageUrl;
    form.coverImage = 'external';
  } else {
    ElMessage.warning('请先输入图片URL');
  }
};

// 处理图片URL
const getImageUrl = (imagePath) => {
  if (!imagePath) return '';
  
  // 构建完整URL
  let fullUrl = imagePath;
  
  // 如果是完整URL（以http开头或外部图床链接），直接使用
  if (!(imagePath.startsWith('http') || imagePath.startsWith('https'))) {
  // 如果以/uploads开头，拼接静态资源基础URL
  if (imagePath.startsWith('/uploads/')) {
      fullUrl = `${STATIC_BASE_URL}${imagePath}`;
  }
  // 如果路径没有以/开头，但仍是uploads路径，添加前导斜杠
    else if (imagePath.startsWith('uploads/')) {
      fullUrl = `${STATIC_BASE_URL}/${imagePath}`;
    }
  }
  
  // 检查URL是否在已知失败列表中，如果是则直接返回占位图
  if (failedImageUrls.has(fullUrl)) {
    console.log('跳过已知失败的图片URL:', fullUrl);
    return 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyMDAgMjAwIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2YwZjBmMCIvPjxwYXRoIGQ9Ik03NSA4MHYtMTVoNTB2MTVoLTUwem0wIDU1di0xNWg1MHYxNWgtNTB6IiBmaWxsPSIjZDBkMGQwIi8+PGNpcmNsZSBjeD0iMTAwIiBjeT0iMTAwIiByPSIzMCIgZmlsbD0iI2QwZDBkMCIvPjxwYXRoIGQ9Ik03MCA3MGw2MCA2ME02MCAxMDBoODBNNzAgMTMwbDYwLTYwIiBzdHJva2U9IiNhMGEwYTAiIHN0cm9rZS13aWR0aD0iNCIvPjwvc3ZnPg==';
  }
  
  return fullUrl;
};

// 处理图片加载错误
const handleImageError = (event) => {
  const errorSrc = event.target.src;
  console.error('图片加载失败:', errorSrc);
  
  // 如果已经在失败列表中，直接返回，避免重复处理
  if (failedImageUrls.has(errorSrc)) {
    return;
  }
  
  // 尝试修复图片URL
  if (errorSrc.includes('/admin/album-links/uploads/')) {
    // 错误的URL格式，包含了前端路由路径
    const fixedSrc = errorSrc.replace(/.*\/admin\/album-links(\/uploads\/.*)/, `${STATIC_BASE_URL}$1`);
    console.log('尝试修复图片URL:', fixedSrc);
    event.target.src = fixedSrc;
    return;
  }
  
  // 将失败的URL添加到Set中
  failedImageUrls.add(errorSrc);
  
  // 保存到localStorage，确保页面刷新后仍然记住失败的URL
  const savedFailedUrls = localStorage.getItem('failedImageUrls');
  let urlsArray = [];
  try {
    urlsArray = savedFailedUrls ? JSON.parse(savedFailedUrls) : [];
  } catch (e) {
    console.error('解析缓存的失败图片URL出错:', e);
  }
  
  if (!urlsArray.includes(errorSrc)) {
    urlsArray.push(errorSrc);
    localStorage.setItem('failedImageUrls', JSON.stringify(urlsArray));
  }
  
  // 使用不包含中文文本的简单SVG作为默认占位图片
  const defaultImageSrc = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyMDAgMjAwIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2YwZjBmMCIvPjxwYXRoIGQ9Ik03NSA4MHYtMTVoNTB2MTVoLTUwem0wIDU1di0xNWg1MHYxNWgtNTB6IiBmaWxsPSIjZDBkMGQwIi8+PGNpcmNsZSBjeD0iMTAwIiBjeT0iMTAwIiByPSIzMCIgZmlsbD0iI2QwZDBkMCIvPjxwYXRoIGQ9Ik03MCA3MGw2MCA2ME02MCAxMDBoODBNNzAgMTMwbDYwLTYwIiBzdHJva2U9IiNhMGEwYTAiIHN0cm9rZS13aWR0aD0iNCIvPjwvc3ZnPg==';
  event.target.src = defaultImageSrc;
  event.target.classList.add('image-error');
  
  // 防止再次触发onerror事件
  event.target.onerror = null;
};

// 转换为合法的URL slug
const toSlug = (text) => {
  if (!text) return '';
  
  // 转为小写，去除首尾空格
  let slug = text.toLowerCase().trim();
  
  // 替换中文字符和特殊字符为连字符
  slug = slug.replace(/[\s\u4e00-\u9fa5]+/g, '-');
  
  // 替换其他特殊字符
  slug = slug.replace(/[^\w\-]+/g, '-');
  
  // 移除多余的连字符
  slug = slug.replace(/\-+/g, '-');
  
  // 移除首尾连字符
  slug = slug.replace(/^-+|-+$/g, '');
  
  return slug;
};

// 自动生成slug
const generateSlug = () => {
  if (!autoGenerateSlug.value) return;
  
  if (form.albumType === 'external') {
    const albumName = form.albumName || '';
    const artistName = form.artistName || '';
    
    if (albumName && artistName) {
      form.slug = toSlug(`${albumName}-${artistName}`);
    }
  } else if (form.albumType === 'internal' && form.internalAlbumId) {
    // 查找选中的内部专辑
    const selectedAlbum = internalAlbums.value.find(album => album.id === form.internalAlbumId);
    if (selectedAlbum) {
      form.slug = toSlug(`${selectedAlbum.title}-${selectedAlbum.displayInfo}`);
    }
  }
};

// 监听专辑类型变化
watch(() => form.albumType, (newType) => {
  if (newType === 'internal') {
    // 如果切换到内部专辑，清空外部专辑信息
    if (!props.isEditing) {
      form.albumName = '';
      form.artistName = '';
      form.releaseDate = '';
    }
  } else {
    // 如果切换到外部专辑，清空内部专辑ID
    form.internalAlbumId = null;
  }
});

// 监听内部专辑选择变化
watch(() => form.internalAlbumId, async (newId) => {
  if (newId && form.albumType === 'internal') {
    // 查找选中的内部专辑
    const selectedAlbum = internalAlbums.value.find(album => album.id === newId);
    if (selectedAlbum) {
      console.log('选中的内部专辑:', selectedAlbum);
      
      // 自动填充专辑信息
      form.albumName = selectedAlbum.title;
      form.artistName = selectedAlbum.displayInfo;
      
      // 尝试获取发布日期
      if (selectedAlbum.releaseDate) {
        form.releaseDate = selectedAlbum.releaseDate;
      }
      
      // 如果没有上传封面，使用内部专辑封面（优先使用缩略图）
      if (!imageUrl.value) {
        if (selectedAlbum.coverImageThumbnail) {
          const thumbnailUrl = getImageUrl(selectedAlbum.coverImageThumbnail);
          console.log('使用内部专辑缩略图:', selectedAlbum.coverImageThumbnail);
          console.log('处理后的缩略图URL:', thumbnailUrl);
          imageUrl.value = thumbnailUrl;
          form.coverImage = selectedAlbum.coverImageThumbnail;
        } else if (selectedAlbum.coverImage) {
          const coverUrl = getImageUrl(selectedAlbum.coverImage);
          console.log('使用内部专辑原图:', selectedAlbum.coverImage);
          console.log('处理后的图片URL:', coverUrl);
          imageUrl.value = coverUrl;
          form.coverImage = selectedAlbum.coverImage;
        }
      }
      
      // 更新slug
      if (autoGenerateSlug.value) {
        generateSlug();
      }
    }
  }
});

// 监听专辑名和歌手名变化，自动生成slug
watch([() => form.albumName, () => form.artistName], () => {
  if (autoGenerateSlug.value && !props.isEditing && form.albumType === 'external') {
    generateSlug();
  }
});

// 提交表单
const handleSubmit = async () => {
  if (!formRef.value) return;

  await formRef.value.validate(async (valid) => {
    if (valid) {
      submitting.value = true;
      try {
        const isInternalType = form.albumType === 'internal';

        const platformLinks = {
          netease: form.netease || '',
          qq: form.qq || '',
          kugou: form.kugou || '',
          kuwo: form.kuwo || '',
          qishui: form.qishui || '',
          spotify: form.spotify || '',
          youtube: form.youtube || '',
          appleMusic: form.appleMusic || '',
          soundCloud: form.soundCloud || ''
        };

        const jsonData = {
          ...form,
          platformLinks
        };

        if (isInternalType) {
          // 获取选中的内部专辑信息
          let selectedAlbum = null;
          
          // 在编辑模式下，如果internalAlbums中没有找到，尝试从initialData中获取
          if (props.isEditing && props.initialData.internalAlbumId) {
            selectedAlbum = internalAlbums.value.find(album => album.id === form.internalAlbumId);
            
            // 如果还是没有找到，创建一个基本的专辑对象
            if (!selectedAlbum) {
              console.log('在编辑模式下未找到内部专辑，使用表单数据创建基本对象');
              selectedAlbum = {
                id: form.internalAlbumId,
                title: form.albumName,
                displayInfo: form.artistName,
                releaseDate: form.releaseDate,
                coverImage: form.coverImage,
                performers: form.performers || [],
                performer: form.performer || ''
              };
            }
          } else {
            // 创建模式下，从internalAlbums中查找
            selectedAlbum = internalAlbums.value.find(album => album.id === form.internalAlbumId);
          }
          
          if (!selectedAlbum) {
            ElMessage.error('未找到选中的内部专辑信息');
            submitting.value = false;
            return;
          }

          // 更新jsonData
          Object.assign(jsonData, {
            albumName: selectedAlbum.title,
            artistName: selectedAlbum.displayInfo,
            releaseDate: selectedAlbum.releaseDate || new Date().toISOString().split('T')[0],
            coverImage: selectedAlbum.coverImage,
            // 保存表演者信息 - 双重保存确保后端处理正确
            performers: selectedAlbum.performers || [],
            performer: selectedAlbum.performer || ''
          });
          
          console.log('提交内部专辑链接数据(含表演者):', jsonData);
          console.log('performer字段:', selectedAlbum.performer);
          console.log('performers字段:', selectedAlbum.performers);
          emit('submit', { jsonData, isInternalType, selectedAlbum });
        } else {
          // 外部专辑链接
          // 根据上传类型处理图片
          if (uploadType.value === 'local') {
            if (!imageFile.value && !form.coverImageBase64 && props.isEditing && props.initialData.coverImage) {
              jsonData.coverImage = props.initialData.coverImage;
            }
          } else if (uploadType.value === 'remote' && form.externalImageUrl) {
            jsonData.coverImage = form.externalImageUrl;
            jsonData.externalImageUrl = form.externalImageUrl;
          }
          
          if (props.isEditing) {
            jsonData.isActive = form.isActive;
          }
          
          console.log('提交外部专辑链接数据:', jsonData);
          emit('submit', { jsonData, isInternalType: false });
        }
      } catch (error) {
        ElMessage.error('处理表单数据时出错');
        console.error(error);
      } finally {
        submitting.value = false;
      }
    } else {
      ElMessage.error('请检查表单填写是否正确');
    }
  });
};

const submitForm = () => {
  handleSubmit();
};

// 添加isImageFailed函数检查图片是否已知失败
const isImageFailed = (imagePath) => {
  if (!imagePath) return false;
  
  // 调试信息
  console.log('检查图片是否失败:', imagePath);
  
  // 处理不同格式的图片路径
  let fullUrl = imagePath;
  
  // 如果是完整URL，直接使用
  if (imagePath.startsWith('http')) {
    fullUrl = imagePath;
  } 
  // 如果以/uploads开头，拼接静态资源基础URL
  else if (imagePath.startsWith('/uploads/')) {
    fullUrl = `${STATIC_BASE_URL}${imagePath}`;
  } 
  // 如果路径没有以/开头，但仍是uploads路径，添加前导斜杠
  else if (imagePath.startsWith('uploads/')) {
    fullUrl = `${STATIC_BASE_URL}/${imagePath}`;
  }
  
  // 检查是否在失败列表中
  const isFailed = failedImageUrls.has(fullUrl);
  if (isFailed) {
    console.log('图片已知失败:', fullUrl);
  }
  
  return isFailed;
};

// 在组件挂载时从localStorage加载失败的图片URL
onMounted(() => {
  // 从localStorage获取失败图片URL列表（如果有）
  const savedFailedUrls = localStorage.getItem('failedImageUrls');
  if (savedFailedUrls) {
    try {
      const urlsArray = JSON.parse(savedFailedUrls);
      // 将数组转换为Set
      urlsArray.forEach(url => failedImageUrls.add(url));
      console.log(`从缓存中恢复了${urlsArray.length}个失败的图片URL`);
    } catch (e) {
      console.error('解析缓存的失败图片URL出错:', e);
      // 如果解析出错，重置缓存
      localStorage.removeItem('failedImageUrls');
    }
  }
  
  // 调试信息，确认静态资源基础URL
  console.log('STATIC_BASE_URL:', STATIC_BASE_URL);
  
  // 初始化表单数据
  initForm();
});

const getAlbumThumbnailUrl = (album) => {
  if (!album) return '/placeholder-album.png';
  
  // 调试信息
  console.log('处理专辑缩略图:', album.title, album.coverImage, album.coverImageThumbnail);
  
  // 优先使用缩略图
  if (album.coverImageThumbnail) {
    // coverImageThumbnail 可能带 /uploads 前缀，也可能不带
    if (album.coverImageThumbnail.startsWith('http')) {
      return album.coverImageThumbnail;
    }
    if (album.coverImageThumbnail.startsWith('/')) {
      return `${STATIC_BASE_URL}${album.coverImageThumbnail}`;
    }
    return `${STATIC_BASE_URL}/${album.coverImageThumbnail}`;
  }
  
  // 如果没有缩略图但有原图
  if (album.coverImage) {
    // 处理原图路径
    if (album.coverImage.startsWith('http')) {
      return album.coverImage;
    }
    if (album.coverImage.startsWith('/')) {
      return `${STATIC_BASE_URL}${album.coverImage}`;
    }
    return `${STATIC_BASE_URL}/${album.coverImage}`;
  }
  
  // 没有图片，返回占位图
  return '/placeholder-album.png';
};
</script>

<style scoped>
.album-link-form {
  max-width: 800px;
  margin: 0 auto;
}

.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.upload-container {
  width: 100%;
}

.preview-container {
  position: relative;
  width: 200px;
  height: 200px;
  border-radius: 4px;
  overflow: hidden;
}

.preview-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.preview-actions {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 8px;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
}

.slug-input-container {
  display: flex;
  align-items: center;
}

.image-container {
  position: relative;
}

.image-failed-indicator {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(255, 255, 255, 0.5);
  border-radius: 4px;
}
</style>