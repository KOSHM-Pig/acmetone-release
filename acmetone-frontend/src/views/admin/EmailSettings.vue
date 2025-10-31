<template>
  <div class="email-settings-container">
    <el-card class="settings-card box-card">
      <template #header>
        <div class="card-header">
          <h2>邮件通知设置</h2>
          <div class="header-actions">
            <el-button 
              type="primary" 
              @click="saveAllSettings" 
              :loading="emailSettingStore.loading"
              :disabled="!hasChanges"
            >
              保存所有更改
            </el-button>
          </div>
        </div>
      </template>

      <el-skeleton :loading="loading" animated :rows="6">
        <template #default>
          <div v-if="error" class="error-message">
            <el-alert
              :title="error"
              type="error"
              :closable="false"
              show-icon
            />
          </div>

          <div class="settings-description">
            <p>在此页面，您可以管理系统中的各种邮件通知设置。启用或禁用特定类型的邮件通知。</p>
          </div>

          <el-table
            :data="settingsData"
            style="width: 100%"
            border
            stripe
            v-if="settingsData.length > 0"
          >
            <el-table-column label="设置类型" min-width="180">
              <template #default="{ row }">
                <div class="setting-type">
                  <span class="setting-name">{{ getSettingName(row.settingType) }}</span>
                  <el-tag size="small" type="info">{{ row.settingType }}</el-tag>
                </div>
              </template>
            </el-table-column>
            
            <el-table-column label="描述" min-width="240">
              <template #default="{ row }">
                <div class="setting-description">
                  {{ row.description || getDefaultDescription(row.settingType) }}
                </div>
              </template>
            </el-table-column>
            
            <el-table-column label="状态" width="120" align="center">
              <template #default="{ row }">
                <el-switch
                  v-model="row.enabled"
                  active-text="启用"
                  inactive-text="禁用"
                  @change="markAsChanged(row.settingType)"
                />
              </template>
            </el-table-column>
            
            <el-table-column label="上次修改" width="180">
              <template #default="{ row }">
                <div v-if="row.updatedAt" class="last-modified">
                  <div>{{ formatDate(row.updatedAt) }}</div>
                  <div v-if="row.modifiedBy" class="modified-by">
                    {{ row.modifiedBy.username }}
                  </div>
                </div>
                <span v-else>-</span>
              </template>
            </el-table-column>
            
            <el-table-column label="操作" width="120" align="center">
              <template #default="{ row }">
                <el-button
                  type="primary"
                  size="small"
                  @click="saveSetting(row)"
                  :disabled="!changedSettings.includes(row.settingType)"
                >
                  保存
                </el-button>
              </template>
            </el-table-column>
          </el-table>

          <div v-else class="no-settings">
            <el-empty description="暂无邮件设置" />
          </div>
        </template>
      </el-skeleton>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useEmailSettingStore } from '../../stores/emailSetting';
import { ElMessage, ElMessageBox } from 'element-plus';

const emailSettingStore = useEmailSettingStore();
const loading = ref(true);
const error = ref(null);
const settingsData = ref([]);
const changedSettings = ref([]);

// 设置名称映射
const settingNames = {
  'verification_code': '邮箱验证码',
  'email_verification': '邮箱验证',
  'password_reset': '密码重置',
  'album_approved': '专辑审核通过通知',
  'album_rejected': '专辑审核拒绝通知',
  'verification_status_change': '实名认证状态变更通知'
};

// 默认描述映射
const defaultDescriptions = {
  'verification_code': '发送给用户的邮箱验证码',
  'email_verification': '用户注册后的邮箱验证链接',
  'password_reset': '用户请求重置密码时发送的邮件',
  'album_approved': '专辑审核通过时发送给用户的通知',
  'album_rejected': '专辑审核未通过时发送给用户的通知',
  'verification_status_change': '用户实名认证状态变更时发送的通知'
};

// 获取设置名称
const getSettingName = (settingType) => {
  return settingNames[settingType] || settingType;
};

// 获取默认描述
const getDefaultDescription = (settingType) => {
  return defaultDescriptions[settingType] || '无描述';
};

// 格式化日期
const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// 标记设置已更改
const markAsChanged = (settingType) => {
  if (!changedSettings.value.includes(settingType)) {
    changedSettings.value.push(settingType);
  }
};

// 计算是否有更改
const hasChanges = computed(() => {
  return changedSettings.value.length > 0;
});

// 保存单个设置
const saveSetting = async (setting) => {
  try {
    await emailSettingStore.updateSetting(setting.settingType, {
      enabled: setting.enabled,
      subject: setting.subject,
      description: setting.description
    });
    
    // 从已更改列表中移除
    const index = changedSettings.value.indexOf(setting.settingType);
    if (index !== -1) {
      changedSettings.value.splice(index, 1);
    }
    
    ElMessage.success(`${getSettingName(setting.settingType)}设置已保存`);
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '保存设置失败');
  }
};

// 保存所有更改
const saveAllSettings = async () => {
  try {
    // 确认保存
    await ElMessageBox.confirm(
      '确定要保存所有更改吗？',
      '保存确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'info'
      }
    );
    
    // 筛选出已更改的设置
    const changedSettingsData = settingsData.value.filter(
      setting => changedSettings.value.includes(setting.settingType)
    );
    
    // 批量保存
    await emailSettingStore.updateBatchSettings(changedSettingsData);
    
    // 清空已更改列表
    changedSettings.value = [];
    
    ElMessage.success('所有设置已保存');
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error.response?.data?.message || '保存设置失败');
    }
  }
};

// 加载设置数据
const loadSettings = async () => {
  loading.value = true;
  error.value = null;
  
  try {
    // 获取设置类型
    await emailSettingStore.fetchSettingTypes();
    
    // 获取设置数据
    await emailSettingStore.fetchSettings();
    
    // 更新本地数据
    settingsData.value = emailSettingStore.settings;
    
    // 清空已更改列表
    changedSettings.value = [];
  } catch (err) {
    console.error('加载邮件设置失败:', err);
    error.value = err.response?.data?.message || '加载邮件设置失败';
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  loadSettings();
});
</script>

<style scoped>
.email-settings-container {
  padding: 20px;
  background-color: #F5F7FA;
  min-height: 100vh;
}

.box-card {
  border: 2px solid #000;
  border-radius: 0;
  box-shadow: 5px 5px 0px 0px #000;
}

:deep(.el-card__header) {
  border-bottom: 2px solid #000;
  background-color: #fff;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-header h2 {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  text-transform: uppercase;
}

:deep(.el-table) {
  border: 2px solid #000;
  border-radius: 0;
}

:deep(.el-table th),
:deep(.el-table td) {
  border-color: #000;
  border-radius: 0;
}

:deep(.el-table thead) {
  background-color: #fff;
  color: #000;
  text-transform: uppercase;
  font-weight: 700;
}

:deep(.el-table th.el-table__cell) {
    background-color: #fff;
    color: #000;
}

:deep(.el-button) {
  border-radius: 0;
  border: 2px solid #000;
  background-color: #000;
  color: #fff;
  font-weight: bold;
  text-transform: uppercase;
}

:deep(.el-button.is-disabled) {
  background-color: #e0e0e0;
  border-color: #999;
  color: #999;
}


:deep(.el-button:hover:not(.is-disabled)) {
  background-color: #333;
  border-color: #000;
}

:deep(.el-button--primary) {
  background-color: #000;
  color: #fff;
}

:deep(.el-button--primary:hover:not(.is-disabled)) {
  background-color: #333;
}

.setting-name {
  font-weight: bold;
  color: #000;
  text-transform: uppercase;
}

.setting-description {
  color: #333;
  font-size: 14px;
}

:deep(.el-tag) {
    border-radius: 0;
    border: 1px solid #000;
    background: #fff;
    color: #000;
}

:deep(.el-switch__core) {
    border-radius: 0;
    border: 2px solid #000 !important;
}

:deep(.el-switch.is-checked .el-switch__core) {
    background-color: #000;
    border-color: #000;
}

:deep(.el-switch__action) {
    border-radius: 0;
    background-color: #fff;
    border: 2px solid #000;
}

:deep(.el-switch.is-checked .el-switch__action) {
    background-color: #fff;
}

.last-modified {
  font-size: 13px;
  color: #333;
}

.modified-by {
  margin-top: 3px;
  font-size: 12px;
  color: #666;
}

.error-message {
  margin-bottom: 20px;
}

.no-settings {
  padding: 40px 0;
  text-align: center;
}
</style> 