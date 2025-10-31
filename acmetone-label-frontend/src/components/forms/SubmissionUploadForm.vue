<template>
  <div class="submission-upload-form">
    <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
      <div class="form-grid">
        <div class="left-section">
          <!-- 基本信息 -->
          <div class="form-section">
            <h3>基本信息</h3>
            <el-form-item label="歌曲名称" prop="title">
              <el-input v-model="form.title" placeholder="请输入歌曲名称" />
            </el-form-item>
            
            <el-form-item label="艺人名称" prop="artistName">
              <el-input v-model="form.artistName" placeholder="请输入艺人名称" />
            </el-form-item>
            
            <el-form-item label="音乐类型" prop="genre">
              <el-select v-model="form.genre" placeholder="选择音乐类型">
                <el-option label="Electronic" value="electronic" />
                <el-option label="Pop" value="pop" />
                <el-option label="Rock" value="rock" />
                <el-option label="Hip-Hop" value="hiphop" />
                <el-option label="Jazz" value="jazz" />
                <el-option label="Classical" value="classical" />
              </el-select>
            </el-form-item>
            
            <el-form-item label="歌曲描述" prop="description">
              <el-input
                v-model="form.description"
                type="textarea"
                :rows="4"
                placeholder="请描述歌曲的风格、创作背景等"
              />
            </el-form-item>
          </div>

          <!-- 联系信息 -->
          <div class="form-section">
            <h3>联系信息</h3>
            <el-form-item label="联系邮箱" prop="email">
              <el-input v-model="form.email" placeholder="请输入联系邮箱" />
            </el-form-item>
            
            <el-form-item label="联系电话" prop="phone">
              <el-input v-model="form.phone" placeholder="请输入联系电话" />
            </el-form-item>
          </div>
        </div>

        <div class="right-section">
          <!-- 文件上传 -->
          <div class="form-section">
            <h3>文件上传</h3>
            
            <!-- 音频文件 -->
            <el-form-item label="音频文件 (MP3, ≤3MB)" prop="audioFile">
              <el-upload
                ref="audioUploadRef"
                class="audio-upload"
                :before-upload="beforeAudioUpload"
                :on-success="handleAudioSuccess"
                :on-error="handleUploadError"
                :file-list="audioFileList"
                accept=".mp3"
                :limit="1"
                drag
              >
                <div class="upload-content">
                  <el-icon class="upload-icon"><Upload /></el-icon>
                  <div class="upload-text">
                    <p>拖拽MP3文件到此处，或<em>点击上传</em></p>
                    <p class="upload-tip">文件大小不超过3MB</p>
                  </div>
                </div>
              </el-upload>
            </el-form-item>

            <!-- 封面图片 -->
            <el-form-item label="封面图片 (可选)">
              <el-upload
                ref="coverUploadRef"
                class="cover-upload"
                :before-upload="beforeCoverUpload"
                :on-success="handleCoverSuccess"
                :on-error="handleUploadError"
                :file-list="coverFileList"
                accept=".jpg,.jpeg,.png"
                :limit="1"
                list-type="picture-card"
              >
                <el-icon><Plus /></el-icon>
              </el-upload>
            </el-form-item>
          </div>

          <!-- 音乐平台链接 -->
          <div class="form-section">
            <h3>音乐平台链接 (可选)</h3>
            <el-form-item label="Spotify">
              <el-input v-model="form.spotifyUrl" placeholder="https://open.spotify.com/..." />
            </el-form-item>
            
            <el-form-item label="Apple Music">
              <el-input v-model="form.appleMusicUrl" placeholder="https://music.apple.com/..." />
            </el-form-item>
            
            <el-form-item label="SoundCloud">
              <el-input v-model="form.soundcloudUrl" placeholder="https://soundcloud.com/..." />
            </el-form-item>
          </div>
        </div>
      </div>

      <!-- 提交按钮 -->
      <div class="form-actions">
        <el-button @click="$emit('cancel')">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitForm">
          {{ submitting ? '提交中...' : '提交投稿' }}
        </el-button>
      </div>
    </el-form>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { Upload, Plus } from '@element-plus/icons-vue'

const emit = defineEmits(['success', 'cancel'])

const formRef = ref()
const audioUploadRef = ref()
const coverUploadRef = ref()
const submitting = ref(false)

const form = reactive({
  title: '',
  artistName: '',
  genre: '',
  description: '',
  email: '',
  phone: '',
  audioFile: null,
  coverFile: null,
  spotifyUrl: '',
  appleMusicUrl: '',
  soundcloudUrl: ''
})

const audioFileList = ref([])
const coverFileList = ref([])

const rules = {
  title: [
    { required: true, message: '请输入歌曲名称', trigger: 'blur' }
  ],
  artistName: [
    { required: true, message: '请输入艺人名称', trigger: 'blur' }
  ],
  genre: [
    { required: true, message: '请选择音乐类型', trigger: 'change' }
  ],
  email: [
    { required: true, message: '请输入联系邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }
  ],
  audioFile: [
    { required: true, message: '请上传音频文件', trigger: 'change' }
  ]
}

const beforeAudioUpload = (file) => {
  const isMP3 = file.type === 'audio/mpeg' || file.name.toLowerCase().endsWith('.mp3')
  const isLt3M = file.size / 1024 / 1024 < 3

  if (!isMP3) {
    ElMessage.error('只能上传MP3格式的音频文件!')
    return false
  }
  if (!isLt3M) {
    ElMessage.error('音频文件大小不能超过3MB!')
    return false
  }
  return true
}

const beforeCoverUpload = (file) => {
  const isImage = file.type.startsWith('image/')
  const isLt2M = file.size / 1024 / 1024 < 2

  if (!isImage) {
    ElMessage.error('只能上传图片文件!')
    return false
  }
  if (!isLt2M) {
    ElMessage.error('图片大小不能超过2MB!')
    return false
  }
  return true
}

const handleAudioSuccess = (response, file) => {
  form.audioFile = file
  audioFileList.value = [file]
  ElMessage.success('音频文件上传成功')
}

const handleCoverSuccess = (response, file) => {
  form.coverFile = file
  coverFileList.value = [file]
  ElMessage.success('封面图片上传成功')
}

const handleUploadError = (error) => {
  ElMessage.error('文件上传失败，请重试')
  console.error('Upload error:', error)
}

const submitForm = async () => {
  if (!formRef.value) return
  
  try {
    await formRef.value.validate()
    submitting.value = true
    
    // 模拟提交
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    ElMessage.success('投稿提交成功')
    emit('success')
  } catch (error) {
    console.error('Form validation failed:', error)
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.submission-upload-form {
  max-width: 800px;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 32px;
  margin-bottom: 32px;
}

.form-section {
  margin-bottom: 24px;
}

.form-section h3 {
  font-size: 16px;
  font-weight: 600;
  color: #000;
  margin: 0 0 16px 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 1px solid #eee;
  padding-bottom: 8px;
}

.audio-upload {
  width: 100%;
}

.upload-content {
  text-align: center;
  padding: 40px 20px;
}

.upload-icon {
  font-size: 48px;
  color: #ccc;
  margin-bottom: 16px;
}

.upload-text p {
  margin: 8px 0;
  color: #666;
}

.upload-tip {
  font-size: 12px;
  color: #999;
}

.cover-upload .el-upload {
  border: 1px dashed #d9d9d9;
  border-radius: 6px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: all 0.3s;
}

.cover-upload .el-upload:hover {
  border-color: #409eff;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 24px;
  border-top: 1px solid #eee;
}

@media (max-width: 768px) {
  .form-grid {
    grid-template-columns: 1fr;
    gap: 24px;
  }
}
</style>
