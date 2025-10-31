<template>
  <div class="admin-materials user-dynamic-covers">
    <div class="page-header">
      <h1>物料模板管理</h1>
      <acmetone-btn @click="showCreateDialog=true"><el-icon><Plus /></el-icon> 新建模板</acmetone-btn>
    </div>

    <div class="desktop-view" v-if="!isMobileView">
      <el-table v-loading="loading" :data="templates" style="width:100%" row-key="id" empty-text="暂无模板">
        <el-table-column label="ID" prop="id" width="80" />
        <el-table-column label="图片" width="100">
          <template #default="scope"><el-image :src="ensureFull(scope.row.imageUrl)" fit="cover" style="width:60px;height:60px" /></template>
        </el-table-column>
        <el-table-column label="名称" prop="name" min-width="180" />
        <el-table-column label="标签" min-width="180"><template #default="scope">{{ (scope.row.tags||[]).join(', ') }}</template></el-table-column>
        <el-table-column label="创建人" min-width="120"><template #default="scope">{{ scope.row.creator?.username || '系统' }}</template></el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="scope">
            <acmetone-btn size="small" @click="editTemplate(scope.row)">编辑</acmetone-btn>
            <acmetone-btn type="danger" size="small" @click="deleteTemplate(scope.row)">删除</acmetone-btn>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <div class="mobile-view" v-if="isMobileView">
      <div v-if="loading" class="loading-container"><el-loading :fullscreen="false"/></div>
      <div v-else-if="templates.length === 0" class="empty-state">暂无模板</div>
      <div v-else class="request-cards">
        <div v-for="item in templates" :key="item.id" class="request-card" @click="editTemplate(item)">
          <div class="card-header">
            <el-image :src="ensureFull(item.imageUrl)" fit="cover" class="card-album-cover" />
            <div class="card-header-info">
              <h3 class="card-title">{{ item.name }}</h3>
              <p class="card-artist">{{ (item.tags||[]).join(', ') }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 创建/编辑对话框 -->
    <el-dialog v-model="showCreateDialog" :title="form.id ? '编辑模板' : '新建模板'" width="700px" class="details-dialog" :append-to-body="true" :fullscreen="isMobileView">
      <el-form :model="form" label-position="top">
        <div class="material-dialog-grid">
          <div class="image-upload-container">
            <el-form-item label="模板图片">
              <el-upload
                  class="material-uploader"
                  action="#"
                  :show-file-list="false"
                  :auto-upload="false"
                  :on-change="handleImageChange"
                  accept="image/*"
              >
                <img v-if="form.imageUrl" :src="ensureFull(form.imageUrl)" class="material-image-preview" />
                <el-icon v-else class="material-uploader-icon"><Plus /></el-icon>
              </el-upload>
            </el-form-item>
          </div>
          <div class="form-fields-container">
            <el-form-item label="模板名称" required>
              <el-input v-model="form.name" placeholder="请输入模板名称" />
            </el-form-item>
            <el-form-item label="标签 (用逗号分隔)">
              <el-input v-model="tagsInput" placeholder="例如: 节日, 简约, 商务" />
            </el-form-item>
            <el-form-item label="模板描述">
              <el-input v-model="form.description" type="textarea" :rows="4" placeholder="请输入模板描述" />
            </el-form-item>
        </div>
            </div>
      </el-form>
      <template #footer>
        <acmetone-btn type="secondary" @click="showCreateDialog=false">取消</acmetone-btn>
        <acmetone-btn @click="submitForm">保存</acmetone-btn>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, onBeforeMount, onUnmounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus } from '@element-plus/icons-vue';
import materialService from '@/services/materialTemplateService';
import { ensureFullUrl as ensureFull } from '@/utils/urlHelper';
import AcmetoneBtn from '@/components/acmetone/AcmetoneBtn.vue';
import imageCompression from 'browser-image-compression';

const loading = ref(false);
const templates = ref([]);
const showCreateDialog = ref(false);
const form = ref({ id:null, name:'', imageUrl:'', description:'', tags:[] });
const tagsInput = ref('');
const isMobileView = ref(false);
const checkMobileView = () => { isMobileView.value = window.innerWidth < 768; };

onBeforeMount(() => { checkMobileView(); window.addEventListener('resize', checkMobileView); });
onUnmounted(() => { window.removeEventListener('resize', checkMobileView); });

const loadData = async ()=>{
  loading.value=true;
  try{
    const res = await materialService.getAllTemplates();
    templates.value = res.data;
  }catch(e){ console.error(e); }
  loading.value=false;
};

const resetForm=()=>{ form.value={ id:null,name:'',imageUrl:'',description:'',tags:[] }; tagsInput.value=''; };

const editTemplate=(row)=>{
  form.value={ ...row };
  tagsInput.value=(row.tags||[]).join(',');
  showCreateDialog.value=true;
};

const handleImageChange = async (uploadFile) => {
  const file = uploadFile.raw;
  if(!file) return;

  try {
    const options = {
      maxSizeMB: 1,
      maxWidthOrHeight: 1920,
      useWebWorker: true
    };
    
    const compressedFile = await imageCompression(file, options);
    const base64 = await imageCompression.getDataUrlFromFile(compressedFile);

    const res = await materialService.uploadImage(base64);
    form.value.imageUrl = res.data.imageUrl;
    ElMessage.success('图片上传成功');

  } catch (error) {
    console.error('图片处理或上传失败:', error);
    ElMessage.error('图片上传失败');
  }
};

const submitForm=async()=>{
  if(!form.value.name){ ElMessage.warning('名称不能为空'); return; }
  const payload={ ...form.value, tags: tagsInput.value.split(',').map(t=>t.trim()).filter(Boolean) };
  try{
    if(form.value.id){ await materialService.updateTemplate(form.value.id,payload); ElMessage.success('更新成功'); }
    else{ await materialService.createTemplate(payload); ElMessage.success('创建成功'); }
    showCreateDialog.value=false; resetForm(); loadData();
  }catch(e){ console.error(e); ElMessage.error('操作失败'); }
};

const deleteTemplate=(row)=>{
  ElMessageBox.confirm('确定删除该模板?','提示',{ type:'warning' }).then(async()=>{
    try{ await materialService.deleteTemplate(row.id); ElMessage.success('已删除'); loadData(); }catch(e){ ElMessage.error('删除失败'); }
  });
};

watch(showCreateDialog,(v)=>{ if(!v) resetForm(); });

onMounted(loadData);
</script>

<style scoped>
/* Keeping the base styles and variables from before */
:root {
  --garrix-black: #1d1d1f;
  --garrix-white: #ffffff;
  --garrix-grey: #86868b;
  --garrix-light-grey: #f5f7fa;
  --garrix-border-grey: #d2d2d7;
  --garrix-text-primary: #1d1d1f;
  --garrix-text-secondary: #86868b;
}

.user-dynamic-covers {
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
:deep(.garrix-input-wrapper .el-input__wrapper.is-focus),
:deep(.garrix-input-wrapper .el-select__wrapper.is-focus) {
  box-shadow: none !important;
}
:deep(.garrix-input-wrapper .el-input__prefix) {
  margin-right: 8px;
}
:deep(.garrix-input-wrapper .el-select .el-input__wrapper) {
  padding: 0 15px;
}


/* Dropdown popper styling */
:deep(.garrix-select-popper) {
  border-radius: 0 !important;
  border: 2px solid var(--garrix-black) !important;
  box-shadow: 4px 4px 0 rgba(0,0,0,0.1) !important;
  margin-top: 8px !important;
}
:deep(.garrix-select-popper .el-popper__arrow) {
  display: none;
}
:deep(.garrix-select-popper .el-select-dropdown__item.selected) {
    color: var(--garrix-black);
    font-weight: 700;
}
:deep(.garrix-select-popper .el-select-dropdown__item.hover),
:deep(.garrix-select-popper .el-select-dropdown__item:hover) {
    background-color: var(--garrix-light-grey);
}

/* Remove old filter styles */
:deep(.filter-bar .el-input__wrapper),
:deep(.filter-bar .el-select .el-input__wrapper) {
  border: none;
  background-color: transparent;
  padding: 5px 15px;
  height: 44px;
}

/* Table styling */
:deep(.el-table) {
  border-top: 1px solid var(--garrix-border-grey);
}
:deep(.el-table th),
:deep(.el-table td) {
  border-bottom: 1px solid var(--garrix-border-grey);
}
:deep(.el-table__header-wrapper) {
  border-bottom: 1px solid var(--garrix-black);
}
:deep(.el-table th) {
  color: var(--garrix-black);
  font-weight: 600;
}
:deep(.el-table__row:hover > td) {
    background-color: var(--garrix-light-grey);
}

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

.status-submitted {
  color: #1565C0;
  border-color: #2196F3;
}

.status-rejected {
  color: #C62828;
  border-color: #E53935;
}
.platform-icon {
  height: 20px;
  width: 20px;
  object-fit: contain;
}

/* Details Dialog Styling */
:deep(.details-dialog .el-dialog__body) {
  padding: 24px;
  overflow: auto;
  max-height: calc(90vh - 120px); /* 减去标题和底部的高度 */
}

:deep(.details-dialog .el-dialog) {
  max-width: 800px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  max-height: 90vh;
}

:deep(.details-dialog .el-dialog__header) {
  padding: 20px 24px;
  margin-right: 0;
  border-bottom: 1px solid var(--garrix-border-grey);
}

:deep(.details-dialog .el-dialog__footer) {
  padding: 16px 24px;
  border-top: 1px solid var(--garrix-border-grey);
}

/* 视频控制按钮样式优化 */
.dynamic-video::-webkit-media-controls-panel {
  background-color: rgba(0, 0, 0, 0.5);
}

/* 移动端优化 */
@media (max-width: 768px) {
  :deep(.details-dialog .el-dialog__body) {
    max-height: calc(100vh - 120px);
    padding: 16px;
  }
  
  :deep(.details-dialog .el-dialog) {
    max-height: 100vh;
    margin: 0;
    width: 100% !important;
    border-radius: 0;
  }
}

.dialog-layout {
  display: grid;
  grid-template-columns: 350px 1fr;
  gap: 30px;
}

/* Preview Column */
.preview-column {
  display: flex;
  flex-direction: column;
  gap: 30px;
}
.video-preview-wrapper h4 {
  font-size: 14px;
  font-weight: 600;
  margin: 0 0 10px;
  color: var(--garrix-text-secondary);
}
.video-container {
  position: relative;
  width: 100%;
  height: 0;
  padding-bottom: 100%; /* 1:1 aspect ratio */
  background-color: #000; /* Ensure background is black for video */
  border-radius: 0;
  border: 1px solid var(--garrix-border-grey);
  overflow: hidden;
}

/* 为竖版视频添加特殊样式 */
.video-preview-wrapper:nth-child(2) .video-container {
  padding-bottom: 133.33%; /* 3:4 aspect ratio */
}

.dynamic-video {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: contain; /* Ensure video fits within the container */
  background-color: #000; /* 确保视频背景是黑色 */
}

/* Details Column */
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
.info-item .status-badge {
  align-self: flex-start;
}
.info-item .platform-icon {
  height: 24px;
  width: 24px;
}

.file-info-section {
  margin-top: 12px;
}
.file-info-section h5 {
  font-size: 14px;
  font-weight: 600;
  margin: 0 0 8px;
  color: var(--garrix-text-primary);
}
.file-info-grid {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: var(--garrix-text-secondary);
}

.notice-box {
  padding: 16px;
  border-left: 3px solid;
  margin-bottom: 16px;
}
.notice-box h5 {
  margin: 0 0 8px;
  font-size: 14px;
  font-weight: 700;
}
.notice-box p {
  margin: 0;
  font-size: 14px;
}
.notice-box.rejected {
  background-color: rgba(229, 57, 53, 0.05);
  border-color: var(--garrix-danger);
  color: #C62828;
}
.notice-box.admin-comment {
  background-color: rgba(138, 145, 159, 0.05);
  border-color: var(--garrix-grey);
  color: #546E7A;
}

/* Responsive adjustments */
@media (max-width: 992px) {
  .dialog-layout {
    grid-template-columns: 300px 1fr;
    gap: 20px;
  }
}

@media (max-width: 768px) {
  .dialog-layout {
    grid-template-columns: 1fr;
    gap: 24px;
  }
  
  .preview-column {
    display: grid;
    grid-template-columns: 1fr;
    gap: 24px;
  }
  
  .details-column {
    padding-top: 16px;
    border-top: 1px solid var(--garrix-border-grey);
  }
  
  .info-grid {
    grid-template-columns: 1fr 1fr;
  }
  
  :deep(.details-dialog .el-dialog) {
    width: 95% !important;
    max-width: 100%;
    margin: 10px auto;
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
  
  .header-actions :deep(.acmetone-btn) {
    width: 100%;
    justify-content: center;
  }
  
  :deep(.el-table .el-table__cell) {
    padding: 8px;
  }
}

@media (max-width: 480px) {
  .user-dynamic-covers {
    padding: 16px 12px;
  }
  
  .info-grid {
    grid-template-columns: 1fr;
  }
  
  .admin-buttons {
    flex-direction: column;
    gap: 12px;
  }
  
  .admin-buttons :deep(.acmetone-btn) {
    width: 100%;
  }
  
  .preview-column {
    gap: 16px;
  }
  
  :deep(.details-dialog .el-dialog__header) {
    padding: 16px;
  }
  
  :deep(.details-dialog .el-dialog__body) {
    padding: 16px;
  }
  
  :deep(.details-dialog .el-dialog__footer) {
    padding: 16px;
  }
  
  :deep(.el-table) {
    font-size: 12px;
  }
}

.resubmit-actions {
  display: flex;
  gap: 10px;
  margin-top: 15px;
  flex-direction: column;
  align-items: stretch;
}

.notice-box.rejected .resubmit-actions :deep(.acmetone-btn) {
  font-size: 12px;
  padding: 6px 12px;
  margin-bottom: 8px;
}

@media (min-width: 768px) {
  .resubmit-actions {
    flex-direction: row;
    flex-wrap: wrap;
}
  
  .notice-box.rejected .resubmit-actions :deep(.acmetone-btn) {
    margin-bottom: 0;
  }
}

/* 移动端卡片视图样式 */
.mobile-view {
  display: none;
}

.request-cards {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  margin-bottom: 20px;
}

.request-card {
  background-color: var(--garrix-white);
  border: 1px solid var(--garrix-border-grey);
  border-radius: 0;
  overflow: hidden;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  cursor: pointer;
}

.request-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.card-header {
  display: flex;
  padding: 12px;
  border-bottom: 1px solid var(--garrix-border-grey);
  background-color: var(--garrix-light-grey);
}

.card-album-cover {
  width: 60px;
  height: 60px;
  object-fit: cover;
  border-radius: 0;
  border: 1px solid var(--garrix-border-grey);
}

.card-header-info {
  margin-left: 12px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 4px;
  color: var(--garrix-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 200px;
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
  font-size: 14px;
}

.card-info-row:last-child {
  margin-bottom: 0;
}

.card-label {
  color: var(--garrix-text-secondary);
  font-size: 13px;
}

.card-value {
  font-weight: 500;
  color: var(--garrix-text-primary);
}

.card-footer {
  padding: 12px;
  border-top: 1px solid var(--garrix-border-grey);
  display: flex;
  justify-content: flex-end;
}

.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
}

.empty-state {
  text-align: center;
  padding: 40px 0;
  color: var(--garrix-text-secondary);
  font-size: 14px;
}

/* 移动端布局适配 */
.mobile-layout {
  display: flex;
  flex-direction: column;
}

.mobile-layout .preview-column,
.mobile-layout .details-column {
  width: 100%;
}

.mobile-layout .preview-column {
  margin-bottom: 20px;
}

.mobile-layout .info-grid {
  grid-template-columns: 1fr;
  gap: 12px;
}

@media (max-width: 768px) {
  .desktop-view {
    display: none;
  }
  
  .mobile-view {
    display: block;
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
}

@media (max-width: 480px) {
  .user-dynamic-covers {
    padding: 16px 12px;
  }
  
  .card-header {
    padding: 10px;
  }
  
  .card-body, 
  .card-footer {
    padding: 10px;
  }
  
  .card-album-cover {
    width: 50px;
    height: 50px;
  }
  
  .card-title {
    font-size: 14px;
    max-width: 160px;
  }
  
  .card-artist {
    font-size: 12px;
  }
  
  .card-info-row {
    font-size: 13px;
  }
  
  .card-label {
    font-size: 12px;
  }
}
.admin-materials{padding:24px;}
.page-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;}
.selected-info{margin-top:4px;font-size:12px;color:#888;}
.preview-image{margin-top:8px;width:120px;height:120px;border:2px solid var(--garrix-border-grey,#d2d2d7);box-shadow:2px 2px 6px rgba(0,0,0,.08);object-fit:cover;}

.image-upload-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 24px; /* Add some space below the section */
}

.material-dialog-grid {
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: 24px;
}

.image-upload-container .el-form-item {
  margin-bottom: 0;
}

.material-uploader {
  width: 200px;
  height: 200px;
  border: 1px dashed var(--el-border-color);
  border-radius: 6px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: var(--el-fill-color-lighter);
  transition: var(--el-transition-duration-fast);
}

.material-uploader:hover {
  border-color: var(--el-color-primary);
}

.material-uploader-icon {
  font-size: 28px;
  color: #8c939d;
}

.material-image-preview {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.form-fields-container {
  display: flex;
  flex-direction: column;
}

@media (max-width: 768px) {
  .material-dialog-grid {
    grid-template-columns: 1fr;
  }
  .image-upload-container {
    display: flex;
    justify-content: center;
  }
}
</style> 