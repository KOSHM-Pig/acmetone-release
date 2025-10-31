<template>
  <div class="email-logs-container">
    <el-card class="box-card">
      <template #header>
        <div class="card-header-title">
      <h1>邮件发送记录</h1>
      <p class="subtitle">查看系统发送的所有邮件记录</p>
    </div>
      </template>
    <!-- 筛选区域 -->
    <div class="search-container">
      <div class="search-panel">
        <div class="search-header">
          <h3>高级筛选</h3>
          <el-button text type="primary" @click="toggleAdvancedSearch">
            {{ showAdvancedSearch ? '收起' : '展开' }}
            <el-icon class="el-icon--right">
              <ArrowDown v-if="!showAdvancedSearch" />
              <ArrowUp v-else />
            </el-icon>
          </el-button>
        </div>
        
        <div class="search-basic">
          <div class="search-input-group">
            <el-input 
              v-model="searchForm.to" 
              placeholder="收件人邮箱" 
              clearable
              class="search-input"
              prefix-icon="Message"
            >
              <template #prefix>
                <el-icon><Message /></el-icon>
              </template>
            </el-input>
            
            <el-input 
              v-model="searchForm.subject" 
              placeholder="邮件主题" 
              clearable
              class="search-input"
            >
              <template #prefix>
                <el-icon><Document /></el-icon>
              </template>
            </el-input>
            
            <el-button type="primary" class="search-btn" @click="handleSearch">
              <el-icon><Search /></el-icon>
              搜索
            </el-button>
            
            <el-button class="search-btn" @click="resetSearch">
              <el-icon><Refresh /></el-icon>
              重置
            </el-button>
          </div>
        </div>
        
        <el-collapse-transition>
          <div v-show="showAdvancedSearch" class="search-advanced">
            <div class="advanced-filters">
              <div class="filter-item">
                <div class="filter-label">邮件类型</div>
                <el-select 
                  v-model="searchForm.type" 
                  placeholder="全部类型" 
                  clearable
                  class="filter-select"
                >
                  <el-option v-for="type in emailTypes" :key="type.value" :label="type.label" :value="type.value" />
                </el-select>
              </div>
              
              <div class="filter-item">
                <div class="filter-label">发送状态</div>
                <el-select 
                  v-model="searchForm.status" 
                  placeholder="全部状态" 
                  clearable
                  class="filter-select"
                >
                  <el-option label="发送成功" value="success">
                    <div class="status-option">
                      <div class="status-dot success"></div>
                      <span>发送成功</span>
                    </div>
                  </el-option>
                  <el-option label="发送失败" value="failed">
                    <div class="status-option">
                      <div class="status-dot failed"></div>
                      <span>发送失败</span>
                    </div>
                  </el-option>
                </el-select>
              </div>
              
              <div class="filter-item filter-date">
                <div class="filter-label">发送时间</div>
                <el-date-picker
                  v-model="searchForm.dateRange"
                  type="daterange"
                  range-separator="至"
                  start-placeholder="开始日期"
                  end-placeholder="结束日期"
                  format="YYYY-MM-DD"
                  value-format="YYYY-MM-DD"
                  class="filter-date-picker"
                  :shortcuts="dateShortcuts"
                />
              </div>
            </div>
          </div>
        </el-collapse-transition>
      </div>
    </div>

    <!-- 统计信息 -->
    <div class="stats-container">
      <div class="stats-row">
        <div class="stat-card success">
          <div class="stat-icon-wrapper success">
            <div class="stat-icon">
              <el-icon><Check /></el-icon>
            </div>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.success }}</div>
            <div class="stat-label">发送成功</div>
          </div>
          <div class="stat-trend success">
            <el-icon><TrendCharts /></el-icon>
          </div>
        </div>
        
        <div class="stat-card failed">
          <div class="stat-icon-wrapper failed">
            <div class="stat-icon">
              <el-icon><Close /></el-icon>
            </div>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.failed }}</div>
            <div class="stat-label">发送失败</div>
          </div>
          <div class="stat-trend failed">
            <el-icon><TrendCharts /></el-icon>
          </div>
        </div>
        
        <div class="stat-card total">
          <div class="stat-icon-wrapper total">
            <div class="stat-icon">
              <el-icon><Collection /></el-icon>
            </div>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.total }}</div>
            <div class="stat-label">总发送量</div>
          </div>
          <div class="stat-trend total">
            <el-icon><TrendCharts /></el-icon>
          </div>
        </div>
        
        <div class="stat-card today">
          <div class="stat-icon-wrapper today">
            <div class="stat-icon">
              <el-icon><Calendar /></el-icon>
            </div>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.today }}</div>
            <div class="stat-label">今日发送</div>
          </div>
          <div class="stat-trend today">
            <el-icon><TrendCharts /></el-icon>
          </div>
        </div>
      </div>
    </div>

    <!-- 邮件列表 -->
    <div v-loading="loading" class="email-logs-list">
      <div class="list-header">
        <h3>邮件记录</h3>
        <div class="list-actions">
          <el-button type="primary" plain size="small" @click="fetchEmailLogs">
            <el-icon><Refresh /></el-icon>
            刷新
          </el-button>
        </div>
      </div>
      
      <div v-if="emailLogs.length === 0 && !loading" class="empty-state">
        <el-empty description="暂无邮件记录" />
      </div>
      
      <div v-else class="email-cards">
        <div 
          v-for="email in emailLogs" 
          :key="email.id" 
          class="email-card" 
          @click="viewEmailDetail(email)"
          :class="{ 'email-card-failed': email.status === 'failed' }"
        >
          <div class="email-card-status-indicator" :class="email.status"></div>
          
          <div class="email-card-header">
            <div class="email-subject">{{ email.subject }}</div>
            <el-tag 
              :type="email.status === 'success' ? 'success' : 'danger'" 
              size="small"
              effect="light"
              class="status-tag"
            >
              {{ email.status === 'success' ? '成功' : '失败' }}
            </el-tag>
          </div>
          
          <div class="email-card-content">
            <div class="email-meta">
              <div class="email-recipient">
                <el-icon><Message /></el-icon>
                <span class="meta-text">{{ email.to }}</span>
              </div>
              <div class="email-type">
                <el-icon><InfoFilled /></el-icon>
                <span class="meta-text">{{ getEmailTypeLabel(email.type) }}</span>
              </div>
              <div class="email-time">
                <el-icon><Clock /></el-icon>
                <span class="meta-text">{{ formatDate(email.createdAt) }}</span>
              </div>
            </div>
            
            <div class="email-card-preview">
              {{ getPreviewContent(email.content) }}
            </div>
          </div>
          
          <div class="email-card-footer">
            <el-button text size="small" @click.stop="viewEmailDetail(email)">
              <el-icon><View /></el-icon>
              查看详情
            </el-button>
          </div>
        </div>
      </div>

      <!-- 分页 -->
      <div class="pagination-container">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          :total="total"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </div>
    </el-card>
    <!-- 邮件详情对话框 -->
    <el-dialog
      v-model="dialogVisible"
      title="邮件详情"
      width="80%"
      class="email-detail-dialog"
      destroy-on-close
    >
      <template #header>
        <div class="dialog-header">
          <div class="dialog-title">
            <el-icon class="dialog-icon"><Message /></el-icon>
            <span>邮件详情</span>
          </div>
          <el-button
            class="dialog-close"
            icon="Close"
            circle
            @click="dialogVisible = false"
          />
        </div>
      </template>
      
      <div v-if="currentEmail" class="email-detail">
        <div class="detail-header">
          <div class="detail-header-content">
            <div class="detail-status-badge" :class="currentEmail.status"></div>
            <h2 class="detail-subject">{{ currentEmail.subject }}</h2>
          </div>
          <el-tag 
            :type="currentEmail.status === 'success' ? 'success' : 'danger'" 
            size="large"
            effect="light"
            class="detail-status-tag"
          >
            <el-icon class="status-icon">
              <Check v-if="currentEmail.status === 'success'" />
              <Close v-else />
            </el-icon>
            <span>{{ currentEmail.status === 'success' ? '发送成功' : '发送失败' }}</span>
          </el-tag>
        </div>
        
        <div class="detail-meta">
          <div class="meta-item">
            <div class="meta-label">收件人</div>
            <div class="meta-value">
              <el-icon><Message /></el-icon>
              <span>{{ currentEmail.to }}</span>
            </div>
          </div>
          <div class="meta-item">
            <div class="meta-label">类型</div>
            <div class="meta-value">
              <el-icon><InfoFilled /></el-icon>
              <span>{{ getEmailTypeLabel(currentEmail.type) }}</span>
            </div>
          </div>
          <div class="meta-item">
            <div class="meta-label">发送时间</div>
            <div class="meta-value">
              <el-icon><Clock /></el-icon>
              <span>{{ formatDate(currentEmail.createdAt) }}</span>
            </div>
          </div>
          <div class="meta-item">
            <div class="meta-label">消息ID</div>
            <div class="meta-value">
              <el-icon><Document /></el-icon>
              <span>{{ currentEmail.messageId || '无' }}</span>
            </div>
          </div>
        </div>
        
        <el-tabs v-model="activeTab">
          <el-tab-pane label="文本内容" name="text">
            <template #label>
              <div class="tab-label">
                <el-icon><Document /></el-icon>
                <span>文本内容</span>
              </div>
            </template>
            <div class="email-text-content">{{ currentEmail.content }}</div>
          </el-tab-pane>
          
          <el-tab-pane label="HTML内容" name="html">
            <template #label>
              <div class="tab-label">
                <el-icon><Promotion /></el-icon>
                <span>HTML内容</span>
              </div>
            </template>
            <div v-if="currentEmail.htmlContent" class="html-preview-container">
              <iframe :srcdoc="currentEmail.htmlContent" class="html-preview"></iframe>
            </div>
            <div v-else class="empty-html">
              <el-empty description="无HTML内容" />
            </div>
          </el-tab-pane>
          
          <el-tab-pane v-if="currentEmail.error" label="错误信息" name="error">
            <template #label>
              <div class="tab-label">
                <el-icon><Warning /></el-icon>
                <span>错误信息</span>
              </div>
            </template>
            <div class="email-error">
              <div class="error-header">
                <el-icon class="error-icon"><Warning /></el-icon>
                <span>发送失败原因</span>
              </div>
              <div class="error-content">{{ currentEmail.error }}</div>
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="dialogVisible = false">关闭</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { Search, Refresh, Check, Close, Collection, Calendar, Message, InfoFilled, Clock, ArrowDown, ArrowUp, Document, TrendCharts, View, Promotion, Warning } from '@element-plus/icons-vue';
import axios from 'axios';
import { API_BASE_URL } from '@/config';

// 状态变量
const emailLogs = ref([]);
const loading = ref(false);
const currentPage = ref(1);
const pageSize = ref(20);
const total = ref(0);
const dialogVisible = ref(false);
const currentEmail = ref(null);
const activeTab = ref('text');
const showAdvancedSearch = ref(false);

// 统计数据
const stats = reactive({
  success: 0,
  failed: 0,
  total: 0,
  today: 0
});

// 搜索表单
const searchForm = reactive({
  to: '',
  subject: '',
  type: '',
  status: '',
  dateRange: []
});

// 邮件类型选项
const emailTypes = [
  { label: '验证码邮件', value: 'verification_code' },
  { label: '专辑审核通过', value: 'album_approved' },
  { label: '专辑审核拒绝', value: 'album_rejected' },
  { label: '节奏阵列审核通过', value: 'beat_array_approved' },
  { label: '节奏阵列审核拒绝', value: 'beat_array_rejected' },
  { label: '实名认证状态', value: 'verification_status' },
  { label: '密码重置', value: 'password_reset' },
  { label: '其他', value: 'other' }
];

// 获取邮件类型标签
const getEmailTypeLabel = (type) => {
  const found = emailTypes.find(item => item.value === type);
  return found ? found.label : type || '未分类';
};

// 获取预览内容
const getPreviewContent = (content) => {
  if (!content) return '无内容';
  return content.length > 100 ? content.substring(0, 100) + '...' : content;
};

// 格式化日期
const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('zh-CN');
};

// 格式化日期时间
const formatDateTime = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleString('zh-CN');
};

// 查看邮件详情
const viewEmailDetail = (email) => {
  currentEmail.value = email;
  dialogVisible.value = true;
  activeTab.value = 'text';
};

// 搜索
const handleSearch = async () => {
  currentPage.value = 1;
  await fetchEmailLogs();
};

// 重置搜索
const resetSearch = () => {
  Object.keys(searchForm).forEach(key => {
    if (key === 'dateRange') {
      searchForm[key] = [];
    } else {
      searchForm[key] = '';
    }
  });
  handleSearch();
};

// 处理分页大小变化
const handleSizeChange = (size) => {
  pageSize.value = size;
  fetchEmailLogs();
};

// 处理页码变化
const handleCurrentChange = (page) => {
  currentPage.value = page;
  fetchEmailLogs();
};

// 获取邮件日志列表
const fetchEmailLogs = async () => {
  try {
    loading.value = true;
    
    // 构建查询参数
    const params = {
      page: currentPage.value,
      pageSize: pageSize.value,
      to: searchForm.to || undefined,
      subject: searchForm.subject || undefined,
      type: searchForm.type || undefined,
      status: searchForm.status || undefined
    };
    
    // 添加日期范围
    if (searchForm.dateRange && searchForm.dateRange.length === 2) {
      params.startDate = searchForm.dateRange[0];
      params.endDate = searchForm.dateRange[1];
    }
    
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('未登录');
    }
    
    const response = await axios.get(`${API_BASE_URL}/admin/email-logs`, {
      params,
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    emailLogs.value = response.data.logs;
    total.value = response.data.total;
    
    // 更新统计数据
    stats.success = response.data.stats?.success || 0;
    stats.failed = response.data.stats?.failed || 0;
    stats.total = response.data.stats?.total || 0;
    stats.today = response.data.stats?.today || 0;
    
  } catch (error) {
    console.error('获取邮件日志失败:', error);
    ElMessage.error('获取邮件日志失败: ' + (error.response?.data?.message || error.message));
  } finally {
    loading.value = false;
  }
};

// 页面加载时获取数据
onMounted(() => {
  fetchEmailLogs();
});

// 切换高级搜索
const toggleAdvancedSearch = () => {
  showAdvancedSearch.value = !showAdvancedSearch.value;
};

// 添加日期快捷选项
const dateShortcuts = [
  {
    text: '今天',
    value: [new Date(), new Date()]
  },
  {
    text: '昨天',
    value: [new Date(Date.now() - 24 * 60 * 60 * 1000), new Date(Date.now() - 24 * 60 * 60 * 1000)]
  },
  {
    text: '一周内',
    value: [new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), new Date()]
  },
  {
    text: '一个月内',
    value: [new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), new Date()]
  }
];
</script>

<style scoped>
.email-logs-container {
  padding: 20px;
  background-color: #fff;
  min-height: 100vh;
}

.box-card {
  border: none;
  border-radius: 0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  background-color: #fff;
  font-family: 'Montserrat', 'Helvetica Neue', Helvetica, Arial, sans-serif;
}

:deep(.el-card__header) {
  border-bottom: 1px solid #eee;
  padding: 30px;
  background-color: #fff;
}

.card-header-title h1 {
  margin: 0;
  font-size: 28px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.card-header-title .subtitle {
  margin: 8px 0 0;
  font-size: 14px;
  color: #666;
  letter-spacing: 0.5px;
}

:deep(.el-card__body) {
  padding: 30px;
}

.search-container {
  border: none;
  padding: 30px;
  margin-bottom: 30px;
  background-color: #f9f9f9;
}

.search-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  padding-bottom: 15px;
  border-bottom: 1px solid #eee;
}

.search-header h3 {
  margin: 0;
  font-size: 18px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.search-input-group {
  display: flex;
  gap: 15px;
  align-items: center;
  flex-wrap: wrap;
}

.search-input {
  flex: 1;
  min-width: 200px;
}

.search-btn {
  flex-shrink: 0;
  min-width: 100px;
  height: 40px;
  font-weight: 500;
  letter-spacing: 0.5px;
}

.search-advanced {
  margin-top: 30px;
  padding-top: 30px;
  border-top: 1px solid #eee;
}

.advanced-filters {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 30px;
}

.filter-item {
  display: flex;
  flex-direction: column;
}

.filter-label {
  font-weight: 600;
  margin-bottom: 10px;
  text-transform: uppercase;
  font-size: 12px;
  letter-spacing: 1px;
}

.filter-select {
  width: 100%;
}

.filter-date-picker {
  width: 100%;
}

.status-option {
  display: flex;
  align-items: center;
  padding: 8px 0;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 10px;
}

.status-dot.success {
  background-color: #10b981;
}

.status-dot.failed {
  background-color: #ef4444;
}

.stats-container, .email-logs-list {
  border: none;
  padding: 0;
  margin-bottom: 40px;
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
}

.stat-card {
  border: none;
  padding: 25px;
  display: flex;
  align-items: center;
  background-color: #f9f9f9;
  transition: transform 0.2s ease;
}

.stat-card:hover {
  transform: translateY(-5px);
}

.stat-icon-wrapper {
  width: 50px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 20px;
  border: none;
  color: #fff;
  border-radius: 0;
}

.stat-icon-wrapper.success { background-color: #000; }
.stat-icon-wrapper.failed { background-color: #000; }
.stat-icon-wrapper.total { background-color: #000; }
.stat-icon-wrapper.today { background-color: #000; }

.stat-icon { font-size: 22px; }
.stat-value { font-size: 28px; font-weight: 700; letter-spacing: 1px; }
.stat-label { font-size: 14px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 5px; }

.email-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 25px;
}

.email-card {
  border: none;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
  overflow: hidden;
}

.email-card:hover {
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
  transform: translateY(-5px);
}

.email-card-status-indicator {
  position: absolute;
  top: 0;
  left: 0;
  width: 4px;
  height: 100%;
}

.email-card-status-indicator.success {
  background-color: #10b981;
}

.email-card-status-indicator.failed {
  background-color: #ef4444;
}

.email-card-header {
  border-bottom: 1px solid #eee;
  padding: 20px 25px;
  padding-left: 15px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.email-subject {
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding-left: 10px;
}

.email-card-content {
  padding: 20px 25px; 
  padding-left: 15px;
}

.email-meta {
  margin-bottom: 15px; 
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.email-recipient, .email-type, .email-time {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  color: #666;
  padding-left: 10px;
}

.email-card-preview {
  background-color: #f9f9f9;
  padding: 15px;
  border: none;
  font-size: 14px;
  line-height: 1.5;
  color: #555;
  margin-left: 10px;
}

.email-card-footer {
  border-top: 1px solid #eee;
  padding: 15px 25px;
  text-align: right;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 25px;
  padding-bottom: 15px;
  border-bottom: 1px solid #eee;
}

.list-header h3 {
  margin: 0;
  font-size: 18px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.pagination-container {
  margin-top: 30px;
  display: flex;
  justify-content: center;
}

:deep(.el-button) {
  border-radius: 0;
  border: 1px solid #000;
  background-color: #000;
  color: #fff;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  transition: all 0.2s ease;
}

:deep(.el-button:hover) {
  background-color: #333;
  border-color: #333;
  transform: translateY(-2px);
}

:deep(.el-button.is-plain), :deep(.el-button[text]) {
  background-color: transparent;
  color: #000;
}

:deep(.el-button.is-plain:hover) {
  background-color: #f0f0f0;
  color: #000;
}

:deep(.el-button--primary) {
  background-color: #000;
  color: #fff;
  border: 1px solid #000;
}

:deep(.el-button--primary:hover) {
  background-color: #333;
}

:deep(.el-button--primary.is-plain) {
  background-color: transparent;
  color: #000;
}

:deep(.el-button--primary.is-plain:hover) {
  background-color: #f0f0f0;
  color: #000;
}

:deep(.el-input__wrapper), :deep(.el-select__wrapper) {
  border-radius: 0;
  border: 1px solid #ddd;
  box-shadow: none;
}

:deep(.el-input__wrapper.is-focus), :deep(.el-select__wrapper.is-focus) {
  border-color: #000;
  box-shadow: none !important;
}

:deep(.el-date-editor) {
  width: 100%;
}

:deep(.el-range-input) {
  font-size: 14px;
}

:deep(.el-date-editor .el-range-separator) {
  color: #000;
  font-weight: 600;
}

:deep(.el-pagination button), :deep(.el-pager li) {
  border-radius: 0 !important;
  border: 1px solid #ddd !important;
  background-color: #fff !important;
  color: #000 !important;
  margin: 0 2px !important;
  transition: all 0.2s ease;
}

:deep(.el-pager li.is-active) {
  background-color: #000 !important;
  color: #fff !important;
}

:deep(.el-dialog) {
  border-radius: 0;
  border: none;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
}

:deep(.el-dialog__header) {
  border-bottom: 1px solid #eee;
  padding: 25px 30px;
}

:deep(.el-dialog__title) {
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
}

:deep(.el-tag) {
  border-radius: 0;
  border: none;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 600;
}

:deep(.el-tabs__nav-wrap::after) {
  height: 1px;
  background-color: #eee;
}

:deep(.el-tabs__active-bar) {
  height: 2px;
  background-color: #000;
}

:deep(.el-tabs__item) {
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
}

:deep(.el-tabs__item.is-active) {
  color: #000;
}

:deep(.el-tabs__item:hover) {
  color: #333;
}

.html-preview-container {
  border: 1px solid #eee;
  margin-top: 15px;
}

.html-preview {
  width: 100%;
  height: 500px;
  border: none;
}

.email-text-content, .email-error {
  border: 1px solid #eee;
  padding: 20px;
  margin-top: 15px;
  line-height: 1.6;
}

.empty-state {
  padding: 60px 0;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.dialog-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 18px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  }
  
.dialog-icon {
  font-size: 20px;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 25px;
}

.detail-header-content {
  display: flex;
  align-items: center;
}

.detail-status-badge {
  width: 4px;
  height: 24px;
  margin-right: 15px;
}

.detail-status-badge.success {
  background-color: #10b981;
}

.detail-status-badge.failed {
  background-color: #ef4444;
}

.detail-subject {
  font-size: 22px;
  font-weight: 700;
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.detail-meta {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 1px solid #eee;
}

.meta-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.meta-label {
  font-size: 12px;
  font-weight: 600;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.meta-value {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.tab-label {
  display: flex;
  align-items: center;
  gap: 8px;
}

.error-header {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 600;
  margin-bottom: 15px;
  color: #ef4444;
}

.error-icon {
  font-size: 18px;
}

.error-content {
  font-family: monospace;
  white-space: pre-wrap;
  background-color: #f9f9f9;
  padding: 15px;
  color: #555;
}
</style> 