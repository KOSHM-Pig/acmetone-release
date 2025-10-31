<template>
  <div class="artist-edit-form">
    <AcmetoneCard>
      <form @submit.prevent="handleSubmit">
        <div class="form-grid">
          <div class="form-group">
            <AcmetoneInput
              v-model="editForm.name"
              type="text"
              label="艺人姓名"
              placeholder="请输入艺人姓名"
              required
              :error="errors.name"
            />
          </div>

          <div class="form-group">
            <AcmetoneSelect
              v-model="editForm.genre"
              label="音乐类型"
              placeholder="选择音乐类型"
              required
              :options="genreOptions"
              :error="errors.genre"
            />
          </div>

          <div class="form-group">
            <AcmetoneSelect
              v-model="editForm.status"
              label="状态"
              placeholder="选择状态"
              required
              :options="statusOptions"
              :error="errors.status"
            />
          </div>

          <div class="form-group">
            <AcmetoneInput
              v-model="editForm.email"
              type="email"
              label="联系邮箱"
              placeholder="请输入联系邮箱"
              :error="errors.email"
            />
          </div>
        </div>

        <div class="form-group">
          <AcmetoneInput
            v-model="editForm.bio"
            type="textarea"
            label="艺人简介"
            placeholder="请输入艺人简介..."
            :maxlength="500"
            :rows="4"
          />
        </div>

        <div class="platforms-section">
          <h4 class="section-title">音乐平台链接</h4>
          <div class="platforms-grid">
            <div class="form-group">
              <AcmetoneInput
                v-model="editForm.platforms.spotify"
                type="text"
                label="Spotify"
                placeholder="https://open.spotify.com/artist/..."
              />
            </div>

            <div class="form-group">
              <AcmetoneInput
                v-model="editForm.platforms.appleMusic"
                type="text"
                label="Apple Music"
                placeholder="https://music.apple.com/artist/..."
              />
            </div>

            <div class="form-group">
              <AcmetoneInput
                v-model="editForm.platforms.soundcloud"
                type="text"
                label="SoundCloud"
                placeholder="https://soundcloud.com/..."
              />
            </div>

            <div class="form-group">
              <AcmetoneInput
                v-model="editForm.platforms.youtube"
                type="text"
                label="YouTube"
                placeholder="https://youtube.com/@..."
              />
            </div>
          </div>
        </div>
      </form>
    </AcmetoneCard>

    <div class="form-actions">
      <AcmetoneBtn @click="handleCancel">取消</AcmetoneBtn>
      <AcmetoneBtn 
        type="primary" 
        @click="handleSubmit"
        :loading="submitting"
      >
        保存更改
      </AcmetoneBtn>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, watch, computed } from 'vue'
import AcmetoneCard from '@/components/acmetone/AcmetoneCard.vue'
import AcmetoneBtn from '@/components/acmetone/AcmetoneBtn.vue'
import AcmetoneInput from '@/components/acmetone/AcmetoneInput.vue'
import AcmetoneSelect from '@/components/acmetone/AcmetoneSelect.vue'

// Props
const props = defineProps({
  artist: {
    type: Object,
    required: true
  }
})

// Emits
const emit = defineEmits(['success', 'cancel'])

// 状态
const submitting = ref(false)
const errors = ref({})

// 编辑表单数据
const editForm = reactive({
  name: '',
  genre: '',
  status: '',
  email: '',
  bio: '',
  platforms: {
    spotify: '',
    appleMusic: '',
    soundcloud: '',
    youtube: ''
  }
})

// 选项数据
const genreOptions = computed(() => [
  { value: 'electronic', label: 'Electronic' },
  { value: 'pop', label: 'Pop' },
  { value: 'rock', label: 'Rock' },
  { value: 'hiphop', label: 'Hip-Hop' },
  { value: 'jazz', label: 'Jazz' },
  { value: 'classical', label: 'Classical' }
])

const statusOptions = computed(() => [
  { value: 'active', label: '活跃' },
  { value: 'pending', label: '待确认' },
  { value: 'inactive', label: '已暂停' }
])

// 监听props变化，初始化表单数据
watch(() => props.artist, (newArtist) => {
  if (newArtist) {
    editForm.name = newArtist.name || ''
    editForm.genre = newArtist.genre || ''
    editForm.status = newArtist.status || ''
    editForm.email = newArtist.email || ''
    editForm.bio = newArtist.bio || ''
    editForm.platforms = {
      spotify: newArtist.platforms?.spotify || '',
      appleMusic: newArtist.platforms?.appleMusic || '',
      soundcloud: newArtist.platforms?.soundcloud || '',
      youtube: newArtist.platforms?.youtube || ''
    }
  }
}, { immediate: true })

// 方法
const validateForm = () => {
  errors.value = {}
  
  if (!editForm.name || editForm.name.length < 2) {
    errors.value.name = '请输入艺人姓名（至少2个字符）'
  }
  
  if (!editForm.genre) {
    errors.value.genre = '请选择音乐类型'
  }
  
  if (!editForm.status) {
    errors.value.status = '请选择状态'
  }
  
  if (editForm.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editForm.email)) {
    errors.value.email = '请输入正确的邮箱格式'
  }
  
  return Object.keys(errors.value).length === 0
}

const handleSubmit = async () => {
  try {
    if (!validateForm()) return

    submitting.value = true

    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1000))

    const updateData = {
      id: props.artist.id,
      ...editForm,
      updateDate: new Date().toISOString()
    }

    console.log('更新艺人数据:', updateData)
    
    showMessage('艺人信息已更新', 'success')
    emit('success', updateData)
  } catch (error) {
    console.error('更新艺人信息失败:', error)
    showMessage('更新失败，请重试', 'error')
  } finally {
    submitting.value = false
  }
}

const handleCancel = () => {
  emit('cancel')
}

const showMessage = (message, type) => {
  console.log(`${type.toUpperCase()}: ${message}`)
}
</script>

<style scoped>
.artist-edit-form {
  display: flex;
  flex-direction: column;
  gap: 24px;
  max-height: 70vh;
  overflow-y: auto;
}

/* 表单组 */
.form-group {
  margin-bottom: 24px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 24px;
  margin-bottom: 32px;
}

/* 平台链接部分 */
.platforms-section {
  margin-top: 32px;
}

.section-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--garrix-black, #1d1d1f);
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 2px solid var(--garrix-black, #1d1d1f);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-family: var(--garrix-font-primary, 'Montserrat', sans-serif);
}

.platforms-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
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
  .form-grid {
    grid-template-columns: 1fr;
    gap: 20px;
  }
  
  .platforms-grid {
    grid-template-columns: 1fr;
  }
}
</style>
