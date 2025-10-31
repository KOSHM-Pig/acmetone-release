<template>
  <div class="release-monitor-container">
    <div class="page-header">
      <h1>专辑上架检测设置</h1>
      <p class="subtitle">配置音乐平台专辑上架监控参数</p>
    </div>

    <!-- 统计信息 -->
    <div class="stats-container">
      <div class="stat-card">
        <div class="stat-content">
          <div class="stat-value">{{ stats.detected }}</div>
          <div class="stat-label">已检测到</div>
        </div>
        <div class="stat-icon-wrapper success">
          <el-icon><Check /></el-icon>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-content">
          <div class="stat-value">{{ stats.pending }}</div>
          <div class="stat-label">待检测</div>
        </div>
        <div class="stat-icon-wrapper total">
          <el-icon><Collection /></el-icon>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-content">
          <div class="stat-value">{{ stats.today }}</div>
          <div class="stat-label">今日检测</div>
        </div>
        <div class="stat-icon-wrapper today">
          <el-icon><Calendar /></el-icon>
        </div>
      </div>
    </div>

    <!-- 检测设置 -->
    <el-card class="settings-card">
      <template #header>
        <div class="settings-header">
          <h2>检测设置</h2>
          <el-button type="primary" @click="saveSettings">
            <el-icon><Check /></el-icon>
            保存设置
          </el-button>
        </div>
      </template>

      <div class="settings-form">
        <el-form :model="settings" label-position="top">
          <el-row :gutter="24">
            <el-col :md="12" :sm="24">
              <el-form-item label="检测频率">
                <el-select v-model="settings.checkFrequency" placeholder="选择检测频率">
                  <el-option label="每X分钟" value="minutes" />
                  <el-option label="每小时" value="hourly" />
                  <el-option label="每6小时" value="6hours" />
                  <el-option label="每12小时" value="12hours" />
                  <el-option label="每天" value="daily" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :md="12" :sm="24">
              <el-form-item label="检测时间" v-if="settings.checkFrequency === 'daily'">
                <el-time-picker
                  v-model="settings.checkTime"
                  format="HH:mm"
                  placeholder="选择每日检测时间"
                />
              </el-form-item>
              <el-form-item label="分钟间隔" v-if="settings.checkFrequency === 'minutes'">
                <el-input-number
                  v-model="settings.minutesInterval"
                  :min="1"
                  :max="59"
                  :step="1"
                  placeholder="输入分钟间隔"
                />
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="24">
            <el-col :md="12" :sm="24">
              <el-form-item label="匹配阈值">
                <el-tooltip content="当检测到的歌手数量大于等于此值时，判定为上架成功" placement="top">
                  <el-input-number
                    v-model="settings.matchThreshold"
                    :min="1"
                    :max="10"
                    :step="1"
                  />
                </el-tooltip>
              </el-form-item>
            </el-col>
            <el-col :md="12" :sm="24">
              <el-form-item label="检测状态">
                <el-switch
                  v-model="settings.enabled"
                  active-text="启用"
                  inactive-text="禁用"
                />
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="24">
            <el-col :span="24">
              <el-form-item label="检测平台">
                <el-checkbox-group v-model="settings.platforms">
                  <el-checkbox label="netease">网易云音乐</el-checkbox>
                  <el-checkbox label="qq">QQ音乐</el-checkbox>
                  <el-checkbox label="spotify" disabled>Spotify</el-checkbox>
                  <el-checkbox label="apple" disabled>Apple Music</el-checkbox>
                </el-checkbox-group>
              </el-form-item>
            </el-col>
          </el-row>
        </el-form>
      </div>
    </el-card>

    <!-- 手动检测 -->
    <el-card class="settings-card">
      <template #header>
        <div class="settings-header">
          <h2>手动检测</h2>
          <el-button type="primary" @click="runManualCheck" :loading="manualCheckLoading">
            <el-icon><VideoPlay /></el-icon>
            开始检测
          </el-button>
        </div>
      </template>

      <div class="manual-check-form">
        <el-form :model="manualCheck" label-position="top">
          <el-row :gutter="24">
            <el-col :md="12" :sm="24">
              <el-form-item label="专辑ID">
                <el-select
                  v-model="manualCheck.albumId"
                  filterable
                  remote
                  :remote-method="searchAlbums"
                  :loading="albumsLoading"
                  placeholder="输入专辑名称搜索"
                >
                  <el-option
                    v-for="album in albumOptions"
                    :key="album.id"
                    :label="album.title"
                    :value="album.id"
                  >
                    <div class="album-option">
                      <span>{{ album.title }}</span>
                      <span class="album-option-artist">{{ album.performer }}</span>
                    </div>
                  </el-option>
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :md="12" :sm="24">
              <el-form-item label="平台">
                <el-select v-model="manualCheck.platform" placeholder="选择检测平台">
                  <el-option label="网易云音乐" value="netease" />
                  <el-option label="QQ音乐" value="qq" />
                  <el-option label="Spotify" value="spotify" disabled />
                  <el-option label="Apple Music" value="apple" disabled />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>
        </el-form>

        <div v-if="manualCheckResult" class="check-result">
          <el-alert
            :title="manualCheckResult.detected ? '已检测到专辑上架' : '未检测到专辑上架'"
            :type="manualCheckResult.detected ? 'success' : 'info'"
            :description="manualCheckResult.message"
            show-icon
          />
          
          <div v-if="manualCheckResult.data" class="result-details">
            <h3>检测详情</h3>
            <el-descriptions border>
              <el-descriptions-item label="专辑名称">{{ manualCheckResult.data.albumName }}</el-descriptions-item>
              <el-descriptions-item label="歌手">{{ manualCheckResult.data.artistName }}</el-descriptions-item>
              <el-descriptions-item label="平台">{{ getPlatformName(manualCheckResult.data.platform) }}</el-descriptions-item>
              <el-descriptions-item label="检测时间">{{ formatDateTime(manualCheckResult.data.checkTime) }}</el-descriptions-item>
              <el-descriptions-item label="匹配结果">{{ manualCheckResult.data.matchCount }}/{{ settings.matchThreshold }}</el-descriptions-item>
            </el-descriptions>
            
            <div class="api-response" v-if="manualCheckApiResponse">
              <h3>API 响应数据</h3>
              <ApiResponseViewer :responseData="manualCheckApiResponse" />
            </div>
          </div>
        </div>
      </div>
    </el-card>

    <!-- 检测历史 -->
    <el-card class="settings-card">
      <template #header>
        <div class="settings-header">
          <h2>检测历史</h2>
          <div class="button-group">
            <el-button type="success" @click="checkAllAlbums" :loading="checkAllLoading">
              <el-icon><VideoPlay /></el-icon>
              一键检测所有专辑
            </el-button>
            <el-button type="primary" @click="fetchHistory">
              <el-icon><Refresh /></el-icon>
              刷新
            </el-button>
          </div>
        </div>
      </template>
      <el-table
        v-loading="historyLoading"
        :data="historyData"
        style="width: 100%"
      >
        <el-table-column prop="albumName" label="专辑名称" min-width="180" />
        <el-table-column prop="artistName" label="歌手" min-width="150" />
        <el-table-column prop="platform" label="平台" min-width="120">
          <template #default="scope">
            {{ getPlatformName(scope.row.platform) }}
          </template>
        </el-table-column>
        <el-table-column prop="checkTime" label="检测时间" min-width="180">
          <template #default="scope">
            {{ formatDateTime(scope.row.checkTime) }}
          </template>
        </el-table-column>
        <el-table-column prop="detected" label="状态" width="120">
          <template #default="scope">
            <el-tag :type="scope.row.detected ? 'success' : 'info'">
              {{ scope.row.detected ? '已上架' : '未上架' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="matchCount" label="匹配数" width="100">
          <template #default="scope">
            {{ scope.row.matchCount }}/{{ settings.matchThreshold }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="scope">
            <el-button link type="primary" @click="viewDetails(scope.row)">
              详情
            </el-button>
            <el-button link type="danger" @click="deleteRecord(scope.row.id)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

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
    </el-card>

    <!-- 详情对话框 -->
    <el-dialog
      v-model="detailDialogVisible"
      title="检测详情"
      width="70%"
      class="detail-dialog"
    >
      <div v-if="selectedRecord" class="detail-content">
        <el-descriptions title="基本信息" :column="2" border>
          <el-descriptions-item label="专辑名称">{{ selectedRecord.albumName }}</el-descriptions-item>
          <el-descriptions-item label="歌手">{{ selectedRecord.artistName }}</el-descriptions-item>
          <el-descriptions-item label="平台">{{ getPlatformName(selectedRecord.platform) }}</el-descriptions-item>
          <el-descriptions-item label="检测时间">{{ formatDateTime(selectedRecord.checkTime) }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="selectedRecord.detected ? 'success' : 'info'">
              {{ selectedRecord.detected ? '已上架' : '未上架' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="匹配数">{{ selectedRecord.matchCount }}/{{ settings.matchThreshold }}</el-descriptions-item>
        </el-descriptions>

        <div class="api-response">
          <h3>API 响应数据</h3>
          <ApiResponseViewer :responseData="selectedRecord.apiResponse" />
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import axios from 'axios';
import { API_BASE_URL } from '@/config';
import { Check, Refresh, Collection, Calendar, TrendCharts, VideoPlay } from '@element-plus/icons-vue';
import ApiResponseViewer from '@/components/ApiResponseViewer.vue';

// 统计数据
const stats = reactive({
  detected: 0,
  pending: 0,
  today: 0
});

// 设置表单
const settings = reactive({
  checkFrequency: 'daily',
  checkTime: new Date(new Date().setHours(9, 0, 0, 0)),
  minutesInterval: 5,
  matchThreshold: 1,
  enabled: true,
  platforms: ['netease']
});

// 手动检测
const manualCheck = reactive({
  albumId: '',
  platform: 'netease'
});
const manualCheckLoading = ref(false);
const manualCheckResult = ref(null);
const manualCheckApiResponse = ref(null);
const albumOptions = ref([]);
const albumsLoading = ref(false);

// 检测历史
const historyData = ref([]);
const historyLoading = ref(false);
const currentPage = ref(1);
const pageSize = ref(20);
const total = ref(0);

// 详情对话框
const detailDialogVisible = ref(false);
const selectedRecord = ref(null);

// 一键检测所有专辑
const checkAllLoading = ref(false);
const checkAllAlbums = async () => {
  try {
    checkAllLoading.value = true;
    
    const token = localStorage.getItem('token');
    const response = await axios.post(`${API_BASE_URL}/admin/release-monitor/check-all`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    ElMessage.success(response.data.message);
    
    // 2秒后刷新历史记录和统计数据
    setTimeout(() => {
      fetchStats(); // 先更新统计数据
      fetchHistory(); // 再更新历史记录
      checkAllLoading.value = false;
    }, 2000);
  } catch (error) {
    console.error('一键检测所有专辑失败:', error);
    ElMessage.error('一键检测所有专辑失败: ' + (error.response?.data?.message || error.message));
    checkAllLoading.value = false;
  }
};

// 获取统计数据
const fetchStats = async () => {
  try {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_BASE_URL}/admin/release-monitor/settings`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    // 更新统计数据
    if (response.data.stats) {
      stats.detected = response.data.stats.detected || 0;
      stats.pending = response.data.stats.pending || 0;
      stats.today = response.data.stats.today || 0;
    }
  } catch (error) {
    console.error('获取统计数据失败:', error);
  }
};

// 获取设置
const fetchSettings = async () => {
  try {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_BASE_URL}/admin/release-monitor/settings`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (response.data.settings) {
      const data = response.data.settings;
      settings.checkFrequency = data.checkFrequency;
      settings.minutesInterval = data.minutesInterval || 5;
      settings.matchThreshold = data.matchThreshold;
      settings.enabled = data.enabled;
      settings.platforms = data.platforms;
      
      if (data.checkTime) {
        const [hours, minutes] = data.checkTime.split(':').map(Number);
        settings.checkTime = new Date(new Date().setHours(parseInt(hours), parseInt(minutes), 0, 0));
      }
    }
    
    // 更新统计数据
    if (response.data.stats) {
      stats.detected = response.data.stats.detected || 0;
      stats.pending = response.data.stats.pending || 0;
      stats.today = response.data.stats.today || 0;
    }
  } catch (error) {
    console.error('获取设置失败:', error);
    ElMessage.error('获取设置失败');
  }
};

// 保存设置
const saveSettings = async () => {
  try {
    const token = localStorage.getItem('token');
    const formattedCheckTime = settings.checkTime ? 
      `${settings.checkTime.getHours().toString().padStart(2, '0')}:${settings.checkTime.getMinutes().toString().padStart(2, '0')}` : 
      '09:00';
    
    const response = await axios.post(`${API_BASE_URL}/admin/release-monitor/settings`, {
      checkFrequency: settings.checkFrequency,
      minutesInterval: settings.minutesInterval,
      checkTime: formattedCheckTime,
      matchThreshold: settings.matchThreshold,
      enabled: settings.enabled,
      platforms: settings.platforms
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    ElMessage.success('设置保存成功');
  } catch (error) {
    console.error('保存设置失败:', error);
    ElMessage.error('保存设置失败');
  }
};

// 搜索专辑
const searchAlbums = async (query) => {
  if (query.length < 2) return;
  
  albumsLoading.value = true;
  try {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_BASE_URL}/admin/albums/search`, {
      params: { search: query },
      headers: { Authorization: `Bearer ${token}` }
    });
    
    albumOptions.value = response.data.albums || [];
  } catch (error) {
    console.error('搜索专辑失败:', error);
  } finally {
    albumsLoading.value = false;
  }
};

// 手动检测
const runManualCheck = async () => {
  if (!manualCheck.albumId) {
    ElMessage.warning('请选择要检测的专辑');
    return;
  }
  
  manualCheckLoading.value = true;
  manualCheckResult.value = null;
  manualCheckApiResponse.value = null;
  
  try {
    const token = localStorage.getItem('token');
    const response = await axios.post(`${API_BASE_URL}/admin/release-monitor/check`, {
      albumId: manualCheck.albumId,
      platform: manualCheck.platform
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    manualCheckResult.value = response.data;
    
    // 提取API响应数据
    if (response.data && response.data.apiResponse) {
      manualCheckApiResponse.value = response.data.apiResponse;
    } else if (response.data && response.data.data && response.data.data.apiResponse) {
      try {
        manualCheckApiResponse.value = JSON.parse(response.data.data.apiResponse);
      } catch (e) {
        console.error('解析API响应数据失败:', e);
        manualCheckApiResponse.value = response.data.data.apiResponse;
      }
    }
    
    // 刷新历史记录
    fetchStats(); // 先更新统计数据
    fetchHistory();
  } catch (error) {
    console.error('检测失败:', error);
    ElMessage.error('检测失败: ' + (error.response?.data?.message || error.message));
  } finally {
    manualCheckLoading.value = false;
  }
};

// 获取历史记录
const fetchHistory = async () => {
  historyLoading.value = true;
  
  try {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_BASE_URL}/admin/release-monitor/history`, {
      params: {
        page: currentPage.value,
        pageSize: pageSize.value
      },
      headers: { Authorization: `Bearer ${token}` }
    });
    
    
    
    // 处理API响应
    if (response.data.data && Array.isArray(response.data.data)) {
      // 解析每条记录中的apiResponse字段
      historyData.value = response.data.data.map(item => {
        if (item.apiResponse && typeof item.apiResponse === 'string') {
          try {
            item.apiResponse = JSON.parse(item.apiResponse);
          } catch (e) {
            console.error('解析apiResponse失败:', e);
            item.apiResponse = null;
          }
        }
        return item;
      });
    } else {
      historyData.value = [];
    }
    
    total.value = response.data.total || 0;
  } catch (error) {
    console.error('获取历史记录失败:', error);
    ElMessage.error('获取历史记录失败');
  } finally {
    historyLoading.value = false;
  }
};

// 查看详情
const viewDetails = (record) => {
  selectedRecord.value = record;
  detailDialogVisible.value = true;
};

// 删除记录
const deleteRecord = async (id) => {
  try {
    await ElMessageBox.confirm('确定要删除此记录吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    });
    
    const token = localStorage.getItem('token');
    await axios.delete(`${API_BASE_URL}/admin/release-monitor/history/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    ElMessage.success('删除成功');
    fetchHistory();
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除记录失败:', error);
      ElMessage.error('删除记录失败');
    }
  }
};

// 处理分页
const handleSizeChange = (size) => {
  pageSize.value = size;
  fetchHistory();
};

const handleCurrentChange = (page) => {
  currentPage.value = page;
  fetchHistory();
};

// 格式化日期时间
const formatDateTime = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleString('zh-CN');
};

// 获取平台名称
const getPlatformName = (platform) => {
  const platforms = {
    netease: '网易云音乐',
    qq: 'QQ音乐',
    spotify: 'Spotify',
    apple: 'Apple Music'
  };
  return platforms[platform] || platform;
};

// 页面加载时获取数据
onMounted(() => {
  fetchSettings();
  fetchHistory();
});
</script>

<style scoped>
/* Martin Garrix Design Language - White Theme */
.release-monitor-container {
  padding: 24px;
  background-color: #f5f5f7;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
}

.page-header {
  margin-bottom: 24px;
  padding: 24px;
  background-color: #000;
  color: #fff;
}
.page-header h1 {
  font-size: 24px;
  font-weight: 700;
  margin: 0 0 8px 0;
  text-transform: uppercase;
  letter-spacing: 2px;
}
.subtitle {
  color: #999;
  font-size: 14px;
  margin: 0;
}

/* Stats Cards */
.stats-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 24px;
  margin-bottom: 24px;
}
.stat-card {
  background-color: #ffffff;
  border: 1px solid #000;
  padding: 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: all 0.2s ease;
}
.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 4px 4px 0 0 #000;
}
.stat-content .stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #000;
}
.stat-content .stat-label {
  font-size: 13px;
  color: #666;
  text-transform: uppercase;
}
.stat-icon-wrapper {
  font-size: 28px;
}
.stat-icon-wrapper.success { color: #28a745; }
.stat-icon-wrapper.total { color: #409eff; }
.stat-icon-wrapper.today { color: #e6a23c; }

/* Settings Cards */
.settings-card {
  background-color: #ffffff;
  border-radius: 0;
  border: 1px solid #000000;
  box-shadow: 5px 5px 0px 0px rgba(0,0,0,1);
  margin-bottom: 24px;
  overflow: visible;
}
:deep(.el-card__header) {
  border-bottom: 1px solid #000;
}
.settings-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.settings-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1.5px;
}
.button-group {
  display: flex;
  gap: 10px;
}

/* Form Elements */
:deep(.el-form-item__label) {
  color: #666;
  text-transform: uppercase;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.2;
}
:deep(.el-input__wrapper), 
:deep(.el-select .el-input__wrapper),
:deep(.el-input-number) {
  background-color: #ffffff;
  border: 2px solid #000 !important;
  border-radius: 0;
  box-shadow: none !important;
  transition: all 0.2s ease;
  width: 100%;
}
:deep(.el-input__wrapper:hover), 
:deep(.el-select .el-input__wrapper:hover),
:deep(.el-input-number:hover) {
  background-color: #f5f5f7;
}

:deep(.el-switch) {
  --el-switch-on-color: #000000;
  --el-switch-off-color: #ccc;
}

:deep(.el-checkbox__input.is-checked .el-checkbox__inner) {
  background-color: #000;
  border-color: #000;
}
:deep(.el-checkbox__inner) {
  border-width: 2px;
}
:deep(.el-checkbox__label) {
  font-weight: 500;
}

/* Table and Pagination */
:deep(.el-table) {
  border: 1px solid #000;
  --el-table-border-color: #eaeaea;
  --el-table-header-bg-color: #ffffff;
}
:deep(.el-table th.el-table__cell) {
  font-weight: 700;
  text-transform: uppercase;
  font-size: 11px;
  border-bottom: 2px solid #000;
  color: #666;
}
:deep(.el-table td.el-table__cell) {
  padding: 12px 10px;
}
:deep(.el-tag) {
  border-radius: 0;
  font-weight: 700;
  font-size: 10px;
  border-width: 2px;
  border-style: solid;
}
:deep(.el-tag--success) { background-color: transparent; border-color: #28a745; color: #28a745; }
:deep(.el-tag--info) { background-color: transparent; border-color: #6c757d; color: #6c757d; }

.pagination-container {
  margin-top: 24px;
}
:deep(.el-pagination .btn-prev),
:deep(.el-pagination .btn-next),
:deep(.el-pagination .el-pager li) {
  border-radius: 0;
  border: 2px solid #000;
  margin: 0 4px;
}
:deep(.el-pagination .el-pager li.is-active) {
  background: #000;
  color: #fff;
}

/* Dialog */
:deep(.el-dialog) {
  border-radius: 0;
  border: 2px solid #000;
  box-shadow: 6px 6px 0 0 #000;
}
:deep(.el-dialog__header) {
  border-bottom: 2px solid #000;
}
:deep(.el-dialog__title) {
  text-transform: uppercase;
  font-weight: 700;
}

:deep(.el-descriptions) {
  border: 2px solid #000;
}
:deep(.el-descriptions__label) {
  font-weight: 700;
  text-transform: uppercase;
  background: #f5f5f7 !important;
}

/* Buttons */
:deep(.el-button) {
  border-radius: 0;
  font-weight: 700;
  text-transform: uppercase;
  border-width: 2px;
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
</style> 