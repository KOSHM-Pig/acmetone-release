<template>
  <div class="submission-review-form">
    <div class="form-content">
      <!-- 投稿信息 -->
      <AcmetoneCard class="submission-info">
        <h3 class="section-title">投稿详情</h3>
        <div class="info-grid">
          <div class="info-item">
            <label>艺人名称</label>
            <span>{{ submission.artistName }}</span>
          </div>
          <div class="info-item">
            <label>歌曲标题</label>
            <span>{{ submission.title }}</span>
          </div>
          <div class="info-item">
            <label>音乐类型</label>
            <span>{{ submission.genre }}</span>
          </div>
          <div class="info-item">
            <label>投稿时间</label>
            <span>{{ formatDate(submission.submitDate) }}</span>
          </div>
        </div>
      </AcmetoneCard>

      <!-- 音频播放器 -->
      <AcmetoneCard class="audio-section">
        <h3 class="section-title">音频试听</h3>
        <div class="audio-player">
          <audio :src="submission.audioUrl" controls preload="metadata">
            您的浏览器不支持音频播放
          </audio>
          <div class="audio-info">
            <span class="duration">时长: {{ submission.duration || '未知' }}</span>
            <span class="size">大小: {{ formatFileSize(submission.fileSize) }}</span>
          </div>
        </div>
      </AcmetoneCard>

      <!-- 审核表单 -->
      <AcmetoneCard class="review-section">
        <h3 class="section-title">审核意见</h3>
        <form @submit.prevent="handleSubmit">
          <div class="form-group">
            <label class="form-label required">审核结果</label>
            <div class="radio-group">
              <label class="radio-item approved" :class="{ active: reviewForm.status === 'approved' }">
                <input 
                  type="radio" 
                  v-model="reviewForm.status" 
                  value="approved"
                  class="radio-input"
                />
                <span class="radio-icon">✓</span>
                <span class="radio-text">通过</span>
              </label>
              <label class="radio-item rejected" :class="{ active: reviewForm.status === 'rejected' }">
                <input 
                  type="radio" 
                  v-model="reviewForm.status" 
                  value="rejected"
                  class="radio-input"
                />
                <span class="radio-icon">✕</span>
                <span class="radio-text">拒绝</span>
              </label>
              <label class="radio-item revision" :class="{ active: reviewForm.status === 'revision' }">
                <input 
                  type="radio" 
                  v-model="reviewForm.status" 
                  value="revision"
                  class="radio-input"
                />
                <span class="radio-icon">✎</span>
                <span class="radio-text">需要修改</span>
              </label>
            </div>
            <span v-if="errors.status" class="error-text">{{ errors.status }}</span>
          </div>

          <div class="form-group">
            <label class="form-label">评分 (1-10)</label>
            <div class="rating-group">
              <div class="rating-stars">
                <button
                  v-for="n in 10"
                  :key="n"
                  type="button"
                  class="rating-star"
                  :class="{ active: n <= reviewForm.rating }"
                  @click="reviewForm.rating = n"
                >
                  ★
                </button>
              </div>
              <span class="rating-score">{{ reviewForm.rating }} 分</span>
            </div>
          </div>

          <div class="form-group">
            <AcmetoneInput
              v-model="reviewForm.comment"
              type="textarea"
              label="审核意见"
              placeholder="请输入详细的审核意见..."
              :maxlength="500"
              :rows="4"
              required
              :error="errors.comment"
            />
          </div>

          <!-- 拒绝或需要修改时的详细原因 -->
          <div 
            v-if="reviewForm.status === 'rejected' || reviewForm.status === 'revision'"
            class="form-group"
          >
            <label class="form-label">具体问题</label>
            <div class="checkbox-group">
              <label 
                v-for="issue in issueOptions"
                :key="issue.value"
                class="checkbox-item"
              >
                <input 
                  type="checkbox" 
                  :value="issue.value"
                  v-model="reviewForm.issues"
                  class="checkbox-input"
                />
                <span class="checkbox-mark"></span>
                <span class="checkbox-text">{{ issue.label }}</span>
              </label>
            </div>
            <span v-if="errors.issues" class="error-text">{{ errors.issues }}</span>
          </div>

          <!-- 通过时的标签建议 -->
          <div 
            v-if="reviewForm.status === 'approved'"
            class="form-group"
          >
            <label class="form-label">推荐标签</label>
            <div class="tags-input">
              <div class="selected-tags">
                <span 
                  v-for="tag in reviewForm.tags"
                  :key="tag"
                  class="tag-item"
                >
                  {{ tag }}
                  <button 
                    type="button"
                    @click="removeTag(tag)"
                    class="tag-remove"
                  >
                    ✕
                  </button>
                </span>
              </div>
              <AcmetoneSelect
                v-model="selectedTag"
                :options="tagOptions"
                placeholder="选择标签"
                @change="addTag"
              />
            </div>
          </div>

          <!-- 优先级设置 -->
          <div 
            v-if="reviewForm.status === 'approved'"
            class="form-group"
          >
            <label class="form-label">发行优先级</label>
            <div class="radio-group priority-group">
              <label class="radio-item high" :class="{ active: reviewForm.priority === 'high' }">
                <input 
                  type="radio" 
                  v-model="reviewForm.priority" 
                  value="high"
                  class="radio-input"
                />
                <span class="radio-text">高优先级</span>
              </label>
              <label class="radio-item medium" :class="{ active: reviewForm.priority === 'medium' }">
                <input 
                  type="radio" 
                  v-model="reviewForm.priority" 
                  value="medium"
                  class="radio-input"
                />
                <span class="radio-text">中等优先级</span>
              </label>
              <label class="radio-item low" :class="{ active: reviewForm.priority === 'low' }">
                <input 
                  type="radio" 
                  v-model="reviewForm.priority" 
                  value="low"
                  class="radio-input"
                />
                <span class="radio-text">低优先级</span>
              </label>
            </div>
          </div>
        </form>
      </AcmetoneCard>
    </div>

    <!-- 操作按钮 -->
    <div class="form-actions">
      <AcmetoneBtn @click="handleCancel">取消</AcmetoneBtn>
      <AcmetoneBtn 
        type="primary" 
        @click="handleSubmit"
        :loading="submitting"
      >
        提交审核
      </AcmetoneBtn>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import AcmetoneCard from '@/components/acmetone/AcmetoneCard.vue'
import AcmetoneBtn from '@/components/acmetone/AcmetoneBtn.vue'
import AcmetoneInput from '@/components/acmetone/AcmetoneInput.vue'
import AcmetoneSelect from '@/components/acmetone/AcmetoneSelect.vue'

// Props
const props = defineProps({
  submission: {
    type: Object,
    required: true
  }
})

// Emits
const emit = defineEmits(['success', 'cancel'])

// 状态
const submitting = ref(false)
const selectedTag = ref('')
const errors = ref({})

// 审核表单数据
const reviewForm = reactive({
  status: '',
  rating: 0,
  comment: '',
  issues: [],
  tags: [],
  priority: 'medium'
})

// 问题选项
const issueOptions = [
  { value: 'audio_quality', label: '音质问题' },
  { value: 'content_inappropriate', label: '内容不当' },
  { value: 'copyright_issue', label: '版权问题' },
  { value: 'genre_mismatch', label: '类型不符' },
  { value: 'technical_issue', label: '技术问题' },
  { value: 'incomplete_info', label: '信息不完整' },
  { value: 'style_mismatch', label: '风格不符' },
  { value: 'other', label: '其他问题' }
]

// 标签选项
const tagOptions = computed(() => [
  { value: 'Electronic', label: 'Electronic' },
  { value: 'House', label: 'House' },
  { value: 'Techno', label: 'Techno' },
  { value: 'Trance', label: 'Trance' },
  { value: 'Progressive', label: 'Progressive' },
  { value: 'Deep House', label: 'Deep House' },
  { value: 'Future House', label: 'Future House' },
  { value: 'Big Room', label: 'Big Room' },
  { value: 'Melodic', label: 'Melodic' },
  { value: 'Uplifting', label: 'Uplifting' },
  { value: 'Dark', label: 'Dark' },
  { value: 'Energetic', label: 'Energetic' },
  { value: 'Emotional', label: 'Emotional' },
  { value: 'Atmospheric', label: 'Atmospheric' },
  { value: 'Commercial', label: 'Commercial' }
])

// 方法
const formatDate = (date) => {
  return new Date(date).toLocaleString('zh-CN')
}

const formatFileSize = (bytes) => {
  if (!bytes) return '未知'
  const mb = bytes / (1024 * 1024)
  return `${mb.toFixed(2)} MB`
}

const addTag = (tag) => {
  if (tag && !reviewForm.tags.includes(tag)) {
    reviewForm.tags.push(tag)
  }
  selectedTag.value = ''
}

const removeTag = (tag) => {
  const index = reviewForm.tags.indexOf(tag)
  if (index > -1) {
    reviewForm.tags.splice(index, 1)
  }
}

const validateForm = () => {
  errors.value = {}
  
  if (!reviewForm.status) {
    errors.value.status = '请选择审核结果'
  }
  
  if (!reviewForm.comment || reviewForm.comment.length < 10) {
    errors.value.comment = '审核意见至少10个字符'
  }
  
  if ((reviewForm.status === 'rejected' || reviewForm.status === 'revision') && reviewForm.issues.length === 0) {
    errors.value.issues = '请选择具体问题'
  }
  
  return Object.keys(errors.value).length === 0
}

const handleSubmit = async () => {
  try {
    if (!validateForm()) return

    submitting.value = true

    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1000))

    const reviewData = {
      submissionId: props.submission.id,
      ...reviewForm,
      reviewDate: new Date().toISOString(),
      reviewerId: 'current-user-id'
    }

    console.log('提交审核数据:', reviewData)
    
    // 显示成功消息
    showMessage('审核提交成功', 'success')
    emit('success', reviewData)
  } catch (error) {
    console.error('审核提交失败:', error)
    showMessage('审核提交失败，请重试', 'error')
  } finally {
    submitting.value = false
  }
}

const handleCancel = () => {
  emit('cancel')
}

const showMessage = (message, type) => {
  // 简单的消息提示实现
  console.log(`${type.toUpperCase()}: ${message}`)
}
</script>

<style scoped>
.submission-review-form {
  max-height: 80vh;
  overflow-y: auto;
}

.form-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.section-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--garrix-black, #1d1d1f);
  margin: 0 0 20px 0;
  text-transform: uppercase;
  letter-spacing: 1px;
  border-bottom: 3px solid var(--garrix-black, #1d1d1f);
  padding-bottom: 12px;
  font-family: var(--garrix-font-primary, 'Montserrat', sans-serif);
}

/* 投稿信息 */
.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.info-item label {
  font-size: 12px;
  font-weight: 700;
  color: var(--garrix-grey, #86868b);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.info-item span {
  font-size: 16px;
  color: var(--garrix-black, #1d1d1f);
  font-weight: 600;
}

/* 音频播放器 */
.audio-player {
  background: var(--garrix-light-grey, #f8f9fa);
  border: 2px solid var(--garrix-black, #1d1d1f);
  padding: 24px;
  box-shadow: 4px 4px 0 rgba(0, 0, 0, 0.1);
}

.audio-player audio {
  width: 100%;
  margin-bottom: 16px;
  border: 2px solid var(--garrix-black, #1d1d1f);
}

.audio-info {
  display: flex;
  gap: 32px;
  font-size: 14px;
  color: var(--garrix-grey, #86868b);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* 表单组 */
.form-group {
  margin-bottom: 24px;
}

.form-label {
  display: block;
  font-size: 14px;
  font-weight: 700;
  color: var(--garrix-black, #1d1d1f);
  margin-bottom: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.form-label.required::after {
  content: ' *';
  color: #dc2626;
}

/* 单选按钮组 */
.radio-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.radio-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  border: 2px solid var(--garrix-border-grey, #e0e0e0);
  background: var(--garrix-white, #ffffff);
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.radio-item:hover {
  border-color: var(--garrix-black, #1d1d1f);
  box-shadow: 2px 2px 0 rgba(0, 0, 0, 0.1);
}

.radio-item.active {
  background: var(--garrix-black, #1d1d1f);
  color: var(--garrix-white, #ffffff);
  border-color: var(--garrix-black, #1d1d1f);
  box-shadow: 4px 4px 0 rgba(0, 0, 0, 0.1);
}

.radio-item.approved.active {
  background: #28a745;
  border-color: #28a745;
}

.radio-item.rejected.active {
  background: #dc3545;
  border-color: #dc3545;
}

.radio-item.revision.active {
  background: #ffc107;
  border-color: #ffc107;
  color: var(--garrix-black, #1d1d1f);
}

.radio-input {
  display: none;
}

.radio-icon {
  font-size: 18px;
  font-weight: bold;
}

.radio-text {
  flex: 1;
}

/* 评分组件 */
.rating-group {
  display: flex;
  align-items: center;
  gap: 16px;
}

.rating-stars {
  display: flex;
  gap: 4px;
}

.rating-star {
  background: none;
  border: none;
  font-size: 24px;
  color: var(--garrix-border-grey, #e0e0e0);
  cursor: pointer;
  transition: all 0.2s ease;
  padding: 4px;
}

.rating-star:hover,
.rating-star.active {
  color: #ffc107;
  transform: scale(1.1);
}

.rating-score {
  font-size: 16px;
  font-weight: 700;
  color: var(--garrix-black, #1d1d1f);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* 复选框组 */
.checkbox-group {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.checkbox-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border: 2px solid var(--garrix-border-grey, #e0e0e0);
  background: var(--garrix-white, #ffffff);
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-size: 12px;
}

.checkbox-item:hover {
  border-color: var(--garrix-black, #1d1d1f);
}

.checkbox-input {
  display: none;
}

.checkbox-input:checked + .checkbox-mark {
  background: var(--garrix-black, #1d1d1f);
  border-color: var(--garrix-black, #1d1d1f);
}

.checkbox-input:checked + .checkbox-mark::after {
  display: block;
}

.checkbox-mark {
  width: 20px;
  height: 20px;
  border: 2px solid var(--garrix-border-grey, #e0e0e0);
  background: var(--garrix-white, #ffffff);
  position: relative;
  transition: all 0.3s ease;
}

.checkbox-mark::after {
  content: '✓';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: var(--garrix-white, #ffffff);
  font-size: 12px;
  font-weight: bold;
  display: none;
}

.checkbox-text {
  flex: 1;
}

/* 标签输入 */
.tags-input {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.selected-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag-item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--garrix-black, #1d1d1f);
  color: var(--garrix-white, #ffffff);
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.tag-remove {
  background: none;
  border: none;
  color: var(--garrix-white, #ffffff);
  cursor: pointer;
  font-size: 14px;
  padding: 0;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tag-remove:hover {
  background: rgba(255, 255, 255, 0.2);
}

/* 优先级组 */
.priority-group .radio-item.high.active {
  background: #dc3545;
  border-color: #dc3545;
}

.priority-group .radio-item.medium.active {
  background: #ffc107;
  border-color: #ffc107;
  color: var(--garrix-black, #1d1d1f);
}

.priority-group .radio-item.low.active {
  background: #28a745;
  border-color: #28a745;
}

/* 错误文本 */
.error-text {
  display: block;
  color: #dc2626;
  font-size: 12px;
  font-weight: 600;
  margin-top: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* 操作按钮 */
.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 16px;
  padding: 24px 0;
  border-top: 2px solid var(--garrix-black, #1d1d1f);
  margin-top: 32px;
}

/* 响应式 */
@media (max-width: 768px) {
  .info-grid {
    grid-template-columns: 1fr;
  }
  
  .checkbox-group {
    grid-template-columns: 1fr;
  }
  
  .audio-info {
    flex-direction: column;
    gap: 12px;
  }
  
  .radio-group {
    gap: 8px;
  }
  
  .form-actions {
    flex-direction: column;
  }
}
</style>
