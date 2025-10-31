<template>
  <div class="admin-shipments user-dynamic-covers">
    <div class="page-header">
      <h1>物流记录管理</h1>
      <acmetone-btn @click="openCreateDialog"><el-icon><Plus /></el-icon> 新建物流</acmetone-btn>
    </div>
    <div class="desktop-view" v-if="!isMobileView">
      <el-table v-loading="loading" :data="shipments" style="width:100%" row-key="id" empty-text="暂无记录">
        <el-table-column label="ID" prop="id" width="80" />
        <el-table-column label="用户" min-width="120"><template #default="scope">{{ scope.row.User?.username }}</template></el-table-column>
        <el-table-column label="物料" min-width="200"><template #default="scope">{{ scope.row.materialTemplate?.name }}</template></el-table-column>
        <el-table-column label="快递公司" prop="carrier" min-width="120" />
        <el-table-column label="运单号" prop="trackingNumber" min-width="160" />
        <el-table-column label="发货时间" width="180"><template #default="scope">{{ formatDate(scope.row.shippedAt) }}</template></el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="scope">
            <acmetone-btn size="small" @click="viewDetails(scope.row)">详情</acmetone-btn>
            <acmetone-btn size="small" @click="editRow(scope.row)">编辑</acmetone-btn>
            <acmetone-btn size="small" type="danger" @click="deleteRow(scope.row)">删除</acmetone-btn>
          </template>
        </el-table-column>
      </el-table>

      <!-- 编辑对话框 -->
      <el-dialog v-model="showDialog" title="编辑物流" :width="isMobileView ? '95%' : '500px'" class="details-dialog" :append-to-body="true">
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">快递公司</span>
            <el-input v-model="form.carrier" />
          </div>
          <div class="info-item">
            <span class="info-label">运单号</span>
            <el-input v-model="form.trackingNumber" />
          </div>
          <div class="info-item">
            <span class="info-label">发货时间</span>
            <el-date-picker v-model="form.shippedAt" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" />
          </div>
        </div>
        <div class="info-item">
          <span class="info-label">管理员备注</span>
          <el-input v-model="form.adminNotes" type="textarea" :rows="3" />
        </div>
        <template #footer>
          <acmetone-btn type="secondary" @click="showDialog=false">取消</acmetone-btn>
          <acmetone-btn @click="save">保存</acmetone-btn>
        </template>
      </el-dialog>

      <!-- 创建物流对话框 -->
      <el-dialog v-if="!isMobileView" v-model="showCreate" title="新建物流" :width="isMobileView ? '95%' : '600px'" class="details-dialog" :append-to-body="true" :fullscreen="isMobileView">
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">选择用户</span>
            <AcmetoneSearchDropdown
              v-model="userKeyword"
              :results="userResults"
              placeholder="搜索用户名/邮箱"
              text-field="username"
              subtext-field="email"
              @search="fetchUsers"
              @select="handleUserSelect"
            />
            <div v-if="createForm.userId" class="selected-info">已选择用户ID: {{ createForm.userId }}</div>
          </div>
          <div class="info-item">
            <span class="info-label">物料模板</span>
            <AcmetoneSearchDropdown
              v-model="templateKeyword"
              :results="templateResults"
              placeholder="搜索物料模板"
              @search="filterTemplates"
              @select="handleTemplateSelect"
            />
            <div v-if="createForm.materialTemplateId" class="selected-info">已选择模板ID: {{ createForm.materialTemplateId }}</div>
          </div>
          <div class="info-item">
            <span class="info-label">运单号</span>
            <el-input v-model="createForm.trackingNumber" />
          </div>
          <div class="info-item">
            <span class="info-label">发货时间</span>
            <el-date-picker v-model="createForm.shippedAt" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" />
          </div>
        </div>
        <div class="info-item">
          <span class="info-label">管理员备注</span>
          <el-input v-model="createForm.adminNotes" type="textarea" :rows="3" />
        </div>
        <template #footer>
          <acmetone-btn type="secondary" @click="showCreate=false">取消</acmetone-btn>
          <acmetone-btn @click="submitCreate">创建</acmetone-btn>
        </template>
      </el-dialog>
    </div>

    <!-- Mobile Edit Dialog -->
    <el-dialog v-if="isMobileView" v-model="showDialog" title="编辑物流" fullscreen append-to-body>
      <div class="mobile-form">
        <div class="form-item">
          <span class="info-label">快递公司</span>
          <el-input v-model="form.carrier" class="full-width" />
        </div>
        <div class="form-item">
          <span class="info-label">运单号</span>
          <el-input v-model="form.trackingNumber" class="full-width" />
        </div>
        <div class="form-item">
          <span class="info-label">发货时间</span>
          <el-date-picker v-model="form.shippedAt" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" class="full-width" />
        </div>
        <div class="form-item">
          <span class="info-label">管理员备注</span>
          <el-input v-model="form.adminNotes" type="textarea" :rows="3" class="full-width" />
        </div>
      </div>
      <template #footer>
        <acmetone-btn type="secondary" @click="showDialog=false">取消</acmetone-btn>
        <acmetone-btn @click="save">保存</acmetone-btn>
      </template>
    </el-dialog>

    <!-- Mobile Create Dialog -->
    <el-dialog v-if="isMobileView" v-model="showCreate" title="新建物流" fullscreen append-to-body>
      <div class="mobile-form">
        <div class="form-item">
          <span class="info-label">选择用户</span>
          <AcmetoneSearchDropdown
            v-model="userKeyword"
            :results="userResults"
            placeholder="搜索用户名/邮箱"
            text-field="username"
            subtext-field="email"
            @search="fetchUsers"
            @select="handleUserSelect"
            class="full-width"
          />
          <div v-if="createForm.userId" class="selected-info">已选择用户ID: {{ createForm.userId }}</div>
        </div>
        <div class="form-item">
          <span class="info-label">物料模板</span>
          <AcmetoneSearchDropdown
            v-model="templateKeyword"
            :results="templateResults"
            placeholder="搜索物料模板"
            @search="filterTemplates"
            @select="handleTemplateSelect"
            class="full-width"
          />
          <div v-if="createForm.materialTemplateId" class="selected-info">已选择模板ID: {{ createForm.materialTemplateId }}</div>
        </div>
        <div class="form-item">
          <span class="info-label">运单号</span>
          <el-input v-model="createForm.trackingNumber" class="full-width" />
        </div>
        <div class="form-item">
          <span class="info-label">发货时间</span>
          <el-date-picker v-model="createForm.shippedAt" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" class="full-width" />
        </div>
        <div class="form-item">
          <span class="info-label">管理员备注</span>
          <el-input v-model="createForm.adminNotes" type="textarea" :rows="3" class="full-width" />
        </div>
      </div>
      <template #footer>
        <acmetone-btn type="secondary" @click="showCreate=false">取消</acmetone-btn>
        <acmetone-btn @click="submitCreate">创建</acmetone-btn>
      </template>
    </el-dialog>

    <!-- 物流详情对话框 -->
    <el-dialog v-model="detailsVisible" title="物流详情" :width="isMobileView ? '95%' : '600px'" destroy-on-close class="details-dialog" :append-to-body="true" :fullscreen="isMobileView">
      <div v-if="currentShipment">
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">ID</span>
            <span>{{ currentShipment.id }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">用户</span>
            <span>{{ currentShipment.User?.username || '未知用户' }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">物料</span>
            <span>{{ currentShipment.materialTemplate?.name || '未知物料' }}</span>
          </div>

          <div class="info-item" v-if="currentShipment.carrier">
            <span class="info-label">快递公司</span>
            <span>{{ currentShipment.carrier }}</span>
          </div>
          <div class="info-item" v-if="currentShipment.trackingNumber">
            <span class="info-label">运单号</span>
            <span>{{ currentShipment.trackingNumber }}</span>
          </div>
          <div class="info-item" v-if="currentShipment.shippedAt">
            <span class="info-label">发货时间</span>
            <span>{{ formatDate(currentShipment.shippedAt) }}</span>
          </div>
        </div>
        <div v-if="currentShipment.adminNotes" class="notice-box admin-comment">
          <h5>管理员备注</h5>
          <p>{{ currentShipment.adminNotes }}</p>
        </div>
      </div>
      <!-- 物流轨迹已移除 -->
      <template #footer>
        <acmetone-btn type="secondary" @click="detailsVisible = false">关闭</acmetone-btn>
        <acmetone-btn @click="editRow(currentShipment)">编辑</acmetone-btn>
        <acmetone-btn type="danger" @click="deleteRow(currentShipment)">删除</acmetone-btn>
      </template>
    </el-dialog>

    <div class="mobile-view" v-if="isMobileView" v-loading="loading">
      <template v-if="!loading">
        <div v-if="shipments.length === 0" class="empty-state">暂无记录</div>
        <div v-else class="request-cards">
          <div v-for="item in shipments" :key="item.id" class="request-card" @click="viewDetails(item)">
            <div class="card-header">
              <div class="card-header-info">
                <h3 class="card-title">To: {{ item.User?.username }}</h3>
                <p class="card-artist">{{ item.materialTemplate?.name }}</p>
              </div>
              <div class="card-actions">
                <acmetone-btn size="small" type="danger" @click.stop="deleteRow(item)">删除</acmetone-btn>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeMount, onUnmounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import shipmentService from '@/services/shipmentsService';
import AcmetoneBtn from '@/components/acmetone/AcmetoneBtn.vue';
import { Plus } from '@element-plus/icons-vue';
import adminUserService from '@/services/adminUserService';
import materialService from '@/services/materialTemplateService';
import AcmetoneSearchDropdown from '@/components/acmetone/AcmetoneSearchDropdown.vue';

const loading=ref(false);
const shipments=ref([]);
const showDialog=ref(false);
const form=ref({});

// 状态相关代码已移除
const formatDate=(d)=>d?new Date(d).toLocaleString('zh-CN',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}):'';

const load=async()=>{
  loading.value=true;
  try{ const res=await shipmentService.getAllShipments(); shipments.value=res.data; }catch(e){console.error(e);} loading.value=false;
};

const detailsVisible = ref(false);
const currentShipment = ref(null);
const trackingLoading = ref(false);
const trackingData = ref([]);

// 查看详情
const viewDetails = (row) => {
  currentShipment.value = row;
  detailsVisible.value = true;
  fetchTracking();
};

// 物流跟踪功能已移除
const fetchTracking = () => {
    trackingData.value = [];
  trackingLoading.value = false;
};

const editRow=(row)=>{ form.value={...row}; showDialog.value=true; };
const save=async()=>{
  try{
    await shipmentService.updateShipment(form.value.id,form.value);
    ElMessage.success('保存成功');
    showDialog.value=false; load();
  }catch(e){ ElMessage.error('保存失败'); }
};

const deleteRow = (row) => {
  ElMessageBox.confirm(`确定要删除发往 "${row.User?.username}" 的物料 "${row.materialTemplate?.name}" 的物流记录吗？`, '确认删除', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  }).then(async () => {
    try {
      await shipmentService.deleteShipment(row.id);
      ElMessage.success('删除成功');
      load(); // 重新加载数据
    } catch (e) {
      ElMessage.error('删除失败');
    }
  }).catch(() => {
    // 用户取消操作
  });
};

const showCreate = ref(false);
const createForm = ref({ userId:null, materialTemplateId:null, carrier:'', trackingNumber:'', shippedAt:'', adminNotes:'' });

// search dropdown states
const userKeyword = ref('');
const userResults = ref([]);
const templateKeyword = ref('');
const templateResults = ref([]);
let allTemplates = [];

const openCreateDialog = async () => {
  if(allTemplates.length===0){
    const res = await materialService.getAllTemplates();
    allTemplates = res.data || [];
  }
  templateResults.value = allTemplates;
  showCreate.value = true;
};

const fetchUsers = async (keyword) => {
  if(!keyword) { userResults.value=[]; return; }
  try{
    const res = await adminUserService.searchUsers(keyword,1,10);
    userResults.value = res.data.users || [];
  }catch(e){ console.error(e); userResults.value=[]; }
};

const handleUserSelect = (item) => {
  createForm.value.userId = item.id;
  userKeyword.value = item.username || item.email;
};

const filterTemplates = (keyword) => {
  if(!keyword){ templateResults.value = allTemplates; return; }
  const lower = keyword.toLowerCase();
  templateResults.value = allTemplates.filter(t=> t.name.toLowerCase().includes(lower));
};

const handleTemplateSelect = (item) => {
  createForm.value.materialTemplateId = item.id;
  templateKeyword.value = item.name;
};

const submitCreate = async () => {
  if(!createForm.value.userId || !createForm.value.materialTemplateId){ ElMessage.warning('请选择用户和物料模板'); return; }
  try{
    await shipmentService.createShipment(createForm.value);
    ElMessage.success('创建成功');
    showCreate.value=false;
    load();
  }catch(e){ ElMessage.error('创建失败'); }
};

const isMobileView = ref(false);
const checkMobileView = () => { isMobileView.value = window.innerWidth < 768; };
onBeforeMount(() => { checkMobileView(); window.addEventListener('resize', checkMobileView); });
onUnmounted(() => { window.removeEventListener('resize', checkMobileView); });

onMounted(load);
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
  justify-content: space-between;
  align-items: center;
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
.admin-shipments{padding:24px;}
.page-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;}
.selected-info{margin-top:4px;font-size:12px;color:#888;}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(0, 0, 0, 0.1);
  border-radius: 50%;
  border-top-color: #409eff;
  animation: spin 1s ease-in-out infinite;
  margin: 0 auto;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.mobile-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 15px;
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.full-width {
  width: 100%;
}

/* Add this to ensure proper spacing on mobile */
@media (max-width: 768px) {
  .el-dialog__body {
    padding: 15px;
  }
}
</style> 