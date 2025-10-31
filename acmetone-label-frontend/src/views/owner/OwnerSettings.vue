<template>
  <div class="owner-settings-page">
    <!-- Header -->
    <LabelHeader user-role="主理人" />

    <!-- 主容器 -->
    <div class="user-center-container">
      <!-- 页面头部 -->
      <div class="page-header">
        <h1 class="page-title">厂牌设置</h1>
        <p class="subtitle">管理您的厂牌信息和品牌形象</p>
      </div>

      <!-- 主要内容 -->
      <div class="user-center-content">
        <!-- Logo上传区域 -->
        <div class="form-section">
          <div class="section-grid">
            <div class="section-header">
              <h3 class="section-title">厂牌Logo</h3>
              <div class="header-actions">
                <button
                  v-if="labelInfo.logo_url"
                  @click="triggerLogoUpload"
                  class="garrix-btn"
                >
                  更换Logo
                </button>
              </div>
            </div>

            <div class="section-body">
              <div class="logo-upload-container">
                <div
                  class="logo-uploader-wrapper"
                  @click="triggerLogoUpload"
                >
                  <div v-if="labelInfo.logo_url" class="logo-preview">
                    <img
                      :src="logoDisplayUrl"
                      :alt="labelInfo.chinese_name"
                      class="logo-image"
                    />
                  </div>
                  <div v-else class="logo-placeholder">
                    <div class="placeholder-content">
                      <div class="placeholder-icon">📷</div>
                      <span class="placeholder-text">点击上传Logo</span>
                      <span class="placeholder-hint">支持 JPG、PNG 格式，最大 5MB</span>
                    </div>
                  </div>
                </div>
                <input
                  ref="logoInput"
                  type="file"
                  accept="image/*"
                  @change="handleLogoUpload"
                  style="display: none"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- 基本信息 -->
        <div class="form-section">
          <div class="section-grid">
            <div class="section-header">
              <h3 class="section-title">基本信息</h3>
              <div class="header-actions">
                <AcmetoneBtn
                  type="primary"
                  :loading="saving"
                  :disabled="saving"
                  @click="handleSave"
                >
                  保存设置
                </AcmetoneBtn>
              </div>
            </div>

            <div class="section-body">
              <div class="info-form">
                <div class="form-grid">
                  <div class="form-item">
                    <label class="form-label">厂牌中文名 <span class="required">*</span></label>
                    <input
                      v-model="labelInfo.chinese_name"
                      type="text"
                      class="form-input"
                      :class="{ 'error': errors.chinese_name }"
                      placeholder="请输入厂牌中文名"
                    />
                    <div v-if="errors.chinese_name" class="error-message">{{ errors.chinese_name }}</div>
                  </div>

                  <div class="form-item">
                    <label class="form-label">厂牌英文名</label>
                    <input
                      v-model="labelInfo.english_name"
                      type="text"
                      class="form-input"
                      :class="{ 'error': errors.english_name }"
                      placeholder="English Name"
                    />
                    <div v-if="errors.english_name" class="error-message">{{ errors.english_name }}</div>
                  </div>

                  <div class="form-item full-width">
                    <label class="form-label">厂牌描述</label>
                    <textarea
                      v-model="labelInfo.description"
                      class="form-textarea"
                      :class="{ 'error': errors.description }"
                      placeholder="描述您的厂牌理念、音乐风格、发展历程..."
                      rows="4"
                      maxlength="500"
                    ></textarea>
                    <div class="char-count">{{ (labelInfo.description || '').length }}/500</div>
                    <div v-if="errors.description" class="error-message">{{ errors.description }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 联系信息 -->
        <div class="form-section">
          <div class="section-grid">
            <div class="section-header">
              <h3 class="section-title">联系信息</h3>
            </div>

            <div class="section-body">
              <div class="info-form">
                <div class="form-grid">
                  <div class="form-item">
                    <label class="form-label">官方网站</label>
                    <input
                      v-model="labelInfo.website"
                      type="url"
                      class="form-input"
                      :class="{ 'error': errors.website }"
                      placeholder="https://www.example.com"
                    />
                    <div v-if="errors.website" class="error-message">{{ errors.website }}</div>
                  </div>

                  <div class="form-item">
                    <label class="form-label">联系邮箱</label>
                    <input
                      v-model="labelInfo.contact_email"
                      type="email"
                      class="form-input"
                      :class="{ 'error': errors.contact_email }"
                      placeholder="contact@example.com"
                    />
                    <div v-if="errors.contact_email" class="error-message">{{ errors.contact_email }}</div>
                  </div>



                  <div class="form-item">
                    <label class="form-label">成立年份</label>
                    <input
                      v-model="labelInfo.founded_year"
                      type="number"
                      class="form-input"
                      :class="{ 'error': errors.founded_year }"
                      placeholder="2020"
                      min="1900"
                      max="2025"
                    />
                    <div v-if="errors.founded_year" class="error-message">{{ errors.founded_year }}</div>
                  </div>

                  <div class="form-item">
                    <label class="form-label">所在地</label>
                    <input
                      v-model="labelInfo.location"
                      type="text"
                      class="form-input"
                      :class="{ 'error': errors.location }"
                      placeholder="北京市朝阳区"
                    />
                    <div v-if="errors.location" class="error-message">{{ errors.location }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 音乐风格 -->
        <div class="form-section">
          <div class="section-grid">
            <div class="section-header">
              <h3 class="section-title">音乐风格</h3>
            </div>

            <div class="section-body">
              <div class="info-form">
                <div class="form-grid">
                  <div class="form-item full-width">
                    <label class="form-label">主要音乐风格</label>
                    <input
                      v-model="labelInfo.genres"
                      type="text"
                      class="form-input"
                      :class="{ 'error': errors.genres }"
                      placeholder="例如：流行、电子、摇滚、嘻哈等"
                      maxlength="200"
                    />
                    <div class="char-count">{{ (labelInfo.genres || '').length }}/200</div>
                    <div v-if="errors.genres" class="error-message">{{ errors.genres }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 社交媒体 -->
        <div class="form-section">
          <div class="section-grid">
            <div class="section-header">
              <h3 class="section-title">社交媒体</h3>
            </div>

            <div class="section-body">
              <div class="info-form">
                <div class="form-grid">
                  <div class="form-item">
                    <label class="form-label">微博链接</label>
                    <input
                      v-model="socialMedia.weibo"
                      type="url"
                      class="form-input"
                      placeholder="https://weibo.com/your-account"
                    />
                  </div>

                  <div class="form-item">
                    <label class="form-label">微信公众号</label>
                    <input
                      v-model="socialMedia.wechat"
                      type="text"
                      class="form-input"
                      placeholder="微信公众号名称"
                    />
                  </div>

                  <div class="form-item">
                    <label class="form-label">抖音账号</label>
                    <input
                      v-model="socialMedia.douyin"
                      type="text"
                      class="form-input"
                      placeholder="抖音账号名称"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 节奏阵列设置 -->
        <div class="form-section">
          <div class="section-grid">
            <div class="section-header">
              <h3 class="section-title">节奏阵列设置</h3>
              <p class="section-description">配置节奏阵列平台的账号信息</p>
            </div>

            <div class="section-body">
              <div class="info-form">
                <div class="form-grid">
                  <div class="form-item">
                    <label class="form-label">节奏阵列账号</label>
                    <input
                      v-model="labelInfo.beatarray_account"
                      type="text"
                      class="form-input"
                      :class="{ 'error': errors.beatarray_account }"
                      placeholder="请输入节奏阵列账号"
                      maxlength="100"
                    />
                    <div v-if="errors.beatarray_account" class="error-message">{{ errors.beatarray_account }}</div>
                  </div>

                  <div class="form-item">
                    <label class="form-label">节奏阵列密码</label>
                    <input
                      v-model="labelInfo.beatarray_password"
                      type="password"
                      class="form-input"
                      :class="{ 'error': errors.beatarray_password }"
                      placeholder="输入新密码以修改，留空则不修改"
                      maxlength="100"
                    />
                    <div class="password-hint">密码将使用MD5加密保存，留空表示不修改当前密码</div>
                    <div v-if="errors.beatarray_password" class="error-message">{{ errors.beatarray_password }}</div>
                  </div>

                  <!-- 验证按钮 -->
                  <div class="form-item full-width" v-if="labelInfo.beatarray_account && labelInfo.beatarray_password">
                    <AcmetoneBtn
                      type="primary"
                      :loading="validating"
                      :disabled="validating"
                      @click="validateCredentials"
                    >
                      验证账号密码
                    </AcmetoneBtn>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- 通知组件 -->
  <AcmetoneNotification ref="notification" />
</template>

<script setup>
import { AcmetoneBtn } from '@/components/acmetone'
import AcmetoneNotification from '@/components/AcmetoneNotification.vue'
import LabelHeader from '@/components/LabelHeader.vue'
import api from '@/utils/api'
import { validateBeatArrayCredentials } from '@/utils/beatArrayValidation'
import { computed, onMounted, reactive, ref } from 'vue'

// 通知系统
const showNotification = (type, message) => {
  if (notification.value) {
    notification.value[type](message)
  }
}

// 表单数据 - 使用后端API的字段名（snake_case）
const labelInfo = reactive({
  chinese_name: '',
  english_name: '',
  description: '',
  logo_url: '',
  website: '',
  contact_email: '',
  founded_year: null,
  location: '',
  genres: '',
  social_media: {},
  beatarray_account: '',
  beatarray_password: ''
})

// 社交媒体数据
const socialMedia = reactive({
  weibo: '',
  wechat: '',
  douyin: ''
})

// 表单验证错误
const errors = reactive({
  chinese_name: '',
  english_name: '',
  description: '',
  website: '',
  contact_email: '',
  founded_year: '',
  location: '',
  genres: '',
  beatarray_account: '',
  beatarray_password: ''
})

// 状态
const saving = ref(false)
const validating = ref(false)
const logoInput = ref(null)
const notification = ref(null)



// Logo显示URL
const logoDisplayUrl = computed(() => {
  if (labelInfo.logo_url) {
    // 如果是完整URL，直接返回
    if (labelInfo.logo_url.startsWith('http')) {
      return labelInfo.logo_url
    }
    // 如果是相对路径，添加基础URL
    return `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'}${labelInfo.logo_url}`
  }
  return ''
})

// 触发Logo上传
const triggerLogoUpload = () => {
  logoInput.value?.click()
}

// 处理Logo上传
const handleLogoUpload = async (event) => {
  const file = event.target.files[0]
  if (!file) return

  // 验证文件类型
  if (!file.type.startsWith('image/')) {
    showNotification('error', '请选择图片文件')
    return
  }

  // 验证文件大小 (5MB)
  if (file.size > 5 * 1024 * 1024) {
    showNotification('error', '图片大小不能超过5MB')
    return
  }

  try {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('type', 'logo')

    const response = await api.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })

    // 根据后端响应结构更新logo_url
    if (response.data.success) {
      labelInfo.logo_url = response.data.data.url || response.data.data.path
      showNotification('success', 'Logo上传成功')
    } else {
      throw new Error(response.data.message || 'Logo上传失败')
    }
  } catch (error) {
    console.error('Logo上传失败:', error)
    showNotification('error', error.response?.data?.message || 'Logo上传失败')
  }

  // 清空input值，允许重复选择同一文件
  event.target.value = ''
}

// 验证表单
const validateForm = () => {
  // 清空之前的错误
  Object.keys(errors).forEach(key => {
    errors[key] = ''
  })

  let isValid = true

  // 验证中文名
  if (!labelInfo.chinese_name.trim()) {
    errors.chinese_name = '请输入厂牌中文名'
    isValid = false
  }

  // 验证邮箱格式
  if (labelInfo.contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(labelInfo.contact_email)) {
    errors.contact_email = '请输入有效的邮箱地址'
    isValid = false
  }



  // 验证网站URL格式
  if (labelInfo.website && !/^https?:\/\/.+/.test(labelInfo.website)) {
    errors.website = '请输入有效的网站地址（以http://或https://开头）'
    isValid = false
  }

  // 验证成立年份
  if (labelInfo.founded_year && (labelInfo.founded_year < 1900 || labelInfo.founded_year > 2025)) {
    errors.founded_year = '请输入有效的年份（1900-2025）'
    isValid = false
  }

  // 验证节奏阵列设置：如果填写了密码，则账号也必须填写
  if (labelInfo.beatarray_password && labelInfo.beatarray_password.trim()) {
    if (!labelInfo.beatarray_account || !labelInfo.beatarray_account.trim()) {
      errors.beatarray_account = '填写密码时必须同时填写账号'
      isValid = false
    }
  }

  return isValid
}

// 验证节奏阵列账号密码
const validateCredentials = async () => {
  if (!labelInfo.beatarray_account || !labelInfo.beatarray_password) {
    showNotification('error', '请先填写节奏阵列账号和密码')
    return
  }

  validating.value = true

  try {
    const result = await validateBeatArrayCredentials(
      labelInfo.beatarray_account.trim(),
      labelInfo.beatarray_password.trim()
    )

    if (result.success) {
      showNotification('success', '节奏阵列账号密码验证成功！')
    } else {
      showNotification('error', `验证失败: ${result.message}`)
    }
  } catch (error) {
    console.error('验证过程中出错:', error)
    showNotification('error', '验证过程中出错，请稍后重试')
  } finally {
    validating.value = false
  }
}

// 保存设置
const handleSave = async () => {
  if (!validateForm()) {
    return
  }

  saving.value = true

  try {
    // 准备保存数据
    const saveData = {
      ...labelInfo,
      social_media: {
        weibo: socialMedia.weibo,
        wechat: socialMedia.wechat,
        douyin: socialMedia.douyin
      }
    }

    // 如果更新了节奏阵列账号密码，先进行验证
    if (saveData.beatarray_account && saveData.beatarray_password && saveData.beatarray_password.trim()) {
      console.log('检测到节奏阵列账号密码更新，正在验证...')
      showNotification('info', '正在验证节奏阵列账号密码...')

      const validationResult = await validateBeatArrayCredentials(
        saveData.beatarray_account.trim(),
        saveData.beatarray_password.trim()
      )

      if (!validationResult.success) {
        showNotification('error', `节奏阵列账号密码验证失败: ${validationResult.message}`)
        return
      }

      console.log('节奏阵列账号密码验证成功')
      showNotification('success', '节奏阵列账号密码验证成功')
    }

    // 如果密码为空，则不发送密码字段（表示不修改密码）
    if (!saveData.beatarray_password || saveData.beatarray_password.trim() === '') {
      delete saveData.beatarray_password
    }

    // 调用API保存 - 使用正确的接口路径
    await api.put('/labels/info', saveData)

    showNotification('success', '设置保存成功')
  } catch (error) {
    console.error('保存设置失败:', error)
    showNotification('error', error.response?.data?.message || '保存设置失败')
  } finally {
    saving.value = false
  }
}

// 加载厂牌信息
const loadLabelInfo = async () => {
  try {
    const response = await api.get('/labels/info')
    const data = response.data.data

    // 填充表单数据 - 使用后端API返回的字段名
    Object.assign(labelInfo, {
      chinese_name: data.chineseName || '',
      english_name: data.englishName || '',
      description: data.description || '',
      logo_url: data.logoUrl || '',
      website: data.website || '',
      contact_email: data.contactEmail || '',
      founded_year: data.foundedYear || null,
      location: data.location || '',
      genres: data.genres || '',
      beatarray_account: data.beatArrayAccount || '',
      beatarray_password: '' // 密码不从后端返回，保持为空供用户修改
    })

    // 处理社交媒体 - 后端返回的是字符串，需要解析
    if (data.socialMedia) {
      const social = typeof data.socialMedia === 'string' ? JSON.parse(data.socialMedia) : data.socialMedia
      Object.assign(socialMedia, {
        weibo: social.weibo || '',
        wechat: social.wechat || '',
        douyin: social.douyin || ''
      })
    }
  } catch (error) {
    console.error('加载厂牌信息失败:', error)
    showNotification('error', '加载厂牌信息失败')
  }
}

// 组件挂载时加载数据
onMounted(() => {
  loadLabelInfo()
})
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap');

/* 页面容器 */
.owner-settings-page {
  min-height: 100vh;
  background-color: #ffffff;
}

/* 主容器 - 完全参考UserCenter.vue */
.user-center-container {
  max-width: 900px;
  margin: 0 auto;
  padding: 80px 20px;
  font-family: 'Montserrat', sans-serif;
  color: #000;
}

/* 页面头部 - 完全参考UserCenter.vue */
.page-header {
  padding: 40px 0;
  text-align: center;
  margin-bottom: 60px;
}

.page-title {
  margin: 0 0 10px;
  font-size: 4rem;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: -3px;
  line-height: 1;
}

.subtitle {
  margin: 0;
  color: #888;
  font-size: 1.1rem;
  font-weight: 400;
}

/* 主要内容 - 完全参考UserCenter.vue */
.user-center-content {
  display: flex;
  flex-direction: column;
  gap: 80px;
}

/* 表单区域 - 完全参考UserCenter.vue */
.section-grid {
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: 60px;
}

.section-header {
  grid-column: 1 / 2;
}

.section-title {
  font-size: 1.5rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: -1px;
  margin: 0 0 20px 0;
  line-height: 1.2;
  position: sticky;
  top: 100px;
}

.header-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.header-actions .garrix-btn {
  width: 100%;
}

.section-body {
  grid-column: 2 / 3;
  min-width: 0;
}

/* Logo上传区域 */
.logo-upload-container {
  display: flex;
  justify-content: center;
}

.logo-uploader-wrapper {
  width: 200px;
  height: 200px;
  border: 2px dashed #ccc;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  overflow: hidden;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.logo-uploader-wrapper:hover {
  border-color: #000;
  background-color: rgba(0, 0, 0, 0.02);
}

.logo-preview {
  width: 100%;
  height: 100%;
  position: relative;
}

.logo-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.logo-placeholder {
  text-align: center;
  color: #888;
}

.placeholder-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.placeholder-icon {
  font-size: 48px;
}

.placeholder-text {
  font-weight: 700;
  text-transform: uppercase;
  font-size: 0.9rem;
}

.placeholder-hint {
  font-size: 0.8rem;
  color: #aaa;
}

/* 表单样式 */

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 30px 40px;
  margin-bottom: 30px;
}

.form-item {
  display: flex;
  flex-direction: column;
}

.form-item.full-width {
  grid-column: 1 / -1;
}

.form-label {
  font-weight: 700;
  text-transform: uppercase;
  font-size: 0.9rem;
  margin-bottom: 8px;
  display: block;
}

.required {
  color: #e76f51;
}

.form-input,
.form-textarea {
  padding: 12px 16px;
  border: 2px solid #eee;
  border-radius: 4px;
  font-size: 1rem;
  color: #000;
  background-color: #fff;
  transition: all 0.3s ease;
  font-family: inherit;
}

.form-input:focus,
.form-textarea:focus {
  outline: none;
  border-color: #000;
}

.form-input.error,
.form-textarea.error {
  border-color: #e76f51;
}

.form-textarea {
  resize: vertical;
  min-height: 100px;
}

.char-count {
  text-align: right;
  font-size: 0.8rem;
  color: #888;
  margin-top: 4px;
}

.error-message {
  color: #e76f51;
  font-size: 0.8rem;
  margin-top: 4px;
  font-weight: 600;
}



/* Garrix Button Styles - 完全参考UserCenter.vue */
.garrix-btn {
  background: #000;
  border: 2px solid #000;
  color: #fff;
  font-weight: 800;
  padding: 12px 24px;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  position: relative;
  overflow: hidden;
  white-space: nowrap;
}

.garrix-btn:hover:not(:disabled) {
  background: #fff;
  color: #000;
  transform: translateY(-2px);
  box-shadow: 3px 3px 0 rgba(0, 0, 0, 0.2);
}

.garrix-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background-color: #ccc;
  border-color: #ccc;
  color: #888;
}

.garrix-btn:disabled:hover {
  transform: none;
  box-shadow: none;
}

/* 密码提示样式 */
.password-hint {
  font-size: 0.8rem;
  color: #666;
  margin-top: 4px;
  font-style: italic;
}



/* 响应式设计 - 完全参考UserCenter.vue */
@media (max-width: 768px) {
  .section-grid {
    grid-template-columns: 1fr;
    gap: 20px;
  }

  .section-header {
    text-align: center;
  }

  .section-title {
    position: static;
  }

  .header-actions {
    flex-direction: row;
    justify-content: center;
  }

  .logo-uploader-wrapper {
    width: 150px;
    height: 150px;
  }

  .form-grid {
    grid-template-columns: 1fr;
    gap: 20px;
  }



  .page-title {
    font-size: 3rem;
  }

  .user-center-container {
    padding: 60px 15px;
  }
}

@media (max-width: 480px) {
  .page-title {
    font-size: 2.5rem;
  }

  .garrix-btn {
    padding: 10px 20px;
    font-size: 0.7rem;
  }

  .logo-uploader-wrapper {
    width: 120px;
    height: 120px;
  }

  .placeholder-icon {
    font-size: 32px;
  }

  .placeholder-text {
    font-size: 0.8rem;
  }

  .placeholder-hint {
    font-size: 0.7rem;
  }
}
</style>