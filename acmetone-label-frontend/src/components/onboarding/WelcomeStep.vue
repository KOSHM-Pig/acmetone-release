<template>
  <div class="welcome-step">
    <div class="grid-container">
      <div class="left-panel">
        <h1 class="step-title">欢迎使用 Acmetone LABEL</h1>
        <p class="step-subtitle">您的账户设置已完成！现在可以开始使用 Acmetone LABEL 的所有功能。</p>
      </div>

      <div class="right-panel">
        <!-- 根据用户类型显示不同的欢迎信息 -->
        <div class="user-summary">
          <div v-if="userType === 'artist'" class="artist-summary">
            <h3>音乐人设置完成</h3>
            <div class="summary-item">
              <strong>艺名：</strong>{{ artistInfo.stageName }}
            </div>
            <div v-if="artistInfo.musicLinks.length > 0" class="summary-item">
              <strong>音乐平台：</strong>已添加 {{ artistInfo.musicLinks.length }} 个平台链接
            </div>
          </div>

          <div v-else-if="userType === 'label'" class="label-summary">
            <h3>厂牌设置完成</h3>
            <div class="summary-item">
              <strong>厂牌：</strong>{{ labelInfo.chineseName }}
              <span v-if="labelInfo.englishName">（{{ labelInfo.englishName }}）</span>
            </div>
            <div class="summary-item">
              <strong>身份：</strong>{{ getRoleLabel(labelInfo.role) }}
            </div>
            <div v-if="labelInfo.isInJiYinJi" class="summary-item">
              <strong>极音记：</strong>已入驻
            </div>
            <div v-if="labelInfo.isInBeatArray" class="summary-item">
              <strong>节奏阵列：</strong>已认证
            </div>
          </div>
        </div>

        <div class="next-steps">
          <h3>接下来您可以：</h3>
          <ul>
            <li v-if="userType === 'artist'">
              浏览厂牌列表，寻找心仪的厂牌
            </li>
            <li v-if="userType === 'artist'">
              上传您的音乐作品进行投稿
            </li>
            <li v-if="userType === 'label'">
              查看厂牌数据统计和分析
          </li>
          <li v-if="userType === 'label'">
            管理收到的音乐投稿
          </li>
          <li v-if="userType === 'label'">
            在个人设置中上传厂牌头像
          </li>
          <li>在设置中完善个人资料</li>
          <li>使用 AI 助手获取帮助</li>
        </ul>
      </div>

        <div class="welcome-actions">
          <button
            @click="handleComplete"
            :disabled="isSubmitting"
            class="acmetone-btn large primary"
            type="button"
          >
            {{ isSubmitting ? '正在设置...' : '开始使用 Acmetone LABEL' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import OnboardingService from '../../services/OnboardingService'

const props = defineProps({
  modelValue: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['complete'])

const isSubmitting = ref(false)

// 计算属性
const userType = computed(() => props.modelValue.userType)
const artistInfo = computed(() => props.modelValue.artistInfo)
const labelInfo = computed(() => props.modelValue.labelInfo)

// 获取身份标签
const getRoleLabel = (role) => {
  const roleMap = {
    'owner': '主理人',
    'reviewer': '审核',
    'designer': '美工',
    'copywriter': '文案'
  }
  return roleMap[role] || role
}

// 处理完成 - 统一发送所有向导数据
const handleComplete = async () => {
  if (isSubmitting.value) return

  try {
    isSubmitting.value = true
    console.log('WelcomeStep: 开始提交向导数据', props.modelValue)

    // 1. 设置用户目的
    await OnboardingService.setPurpose(props.modelValue.userType)
    console.log('WelcomeStep: 用户目的设置成功')

    if (props.modelValue.userType === 'label') {
      // 2. 设置极音记状态（如果有选择）
      if (props.modelValue.labelInfo.isInJiYinJi !== null) {
        await OnboardingService.setJiYinJiStatus(props.modelValue.labelInfo.isInJiYinJi)
        console.log('WelcomeStep: 极音记状态设置成功')
      }

      // 3. 设置厂牌信息
      if (props.modelValue.labelInfo.chineseName) {
        const labelData = {
          chineseName: props.modelValue.labelInfo.chineseName,
          englishName: props.modelValue.labelInfo.englishName,
          description: props.modelValue.labelInfo.description,
          website: props.modelValue.labelInfo.website
        }
        await OnboardingService.setLabelInfo(labelData)
        console.log('WelcomeStep: 厂牌信息设置成功')
      }

      // 4. 设置厂牌角色
      if (props.modelValue.labelInfo.role) {
        await OnboardingService.setRole(props.modelValue.labelInfo.role)
        console.log('WelcomeStep: 厂牌角色设置成功')
      }
    } else if (props.modelValue.userType === 'artist') {
      // 设置艺人信息
      if (props.modelValue.artistInfo.stageName) {
        const artistData = {
          stageName: props.modelValue.artistInfo.stageName,
          musicLinks: props.modelValue.artistInfo.musicLinks || []
        }
        await OnboardingService.setArtistInfo(artistData)
        console.log('WelcomeStep: 艺人信息设置成功')
      }
    }

    // 5. 完成向导流程
    await OnboardingService.complete()
    console.log('WelcomeStep: 向导流程完成')

    // 发送完成事件
    emit('complete')
  } catch (error) {
    console.error('WelcomeStep: 提交向导数据失败:', error)
    alert('设置失败，请重试：' + (error.response?.data?.message || error.message))
  } finally {
    isSubmitting.value = false
  }
}
</script>

<style scoped>
.welcome-step {
  width: 100%;
}

.grid-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10%;
  align-items: center;
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
}

.left-panel {
  max-width: 450px;
}

.step-title {
  font-size: 64px;
  font-weight: 900;
  line-height: 1.1;
  margin-bottom: 24px;
  color: #1a1a1a;
}

.step-subtitle {
  font-size: 16px;
  color: #555;
  line-height: 1.6;
  margin: 0;
}

.right-panel {
  max-width: 400px;
}

.user-summary {
  background: #f8f9fa;
  border: 1px solid #e0e0e0;
  padding: 24px;
  text-align: left;
  margin-bottom: 28px;
}

.artist-summary h3,
.label-summary h3 {
  font-size: 18px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0 0 16px 0;
}

.summary-item {
  font-size: 14px;
  color: #666;
  margin-bottom: 8px;
  line-height: 1.5;
}

.summary-item:last-child {
  margin-bottom: 0;
}

.summary-item strong {
  color: #1a1a1a;
}

.next-steps {
  text-align: left;
}

.next-steps h3 {
  font-size: 18px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0 0 16px 0;
}

.next-steps ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.next-steps li {
  font-size: 14px;
  color: #666;
  margin-bottom: 8px;
  line-height: 1.5;
  padding-left: 0;
}

.next-steps li:last-child {
  margin-bottom: 0;
}

.welcome-actions {
  margin-top: 10px;
}

.acmetone-btn {
  width: 100%;
  padding: 24px;
  font-size: 16px;
  font-weight: 700;
  background: #1a1a1a;
  color: #fff;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.acmetone-btn:hover {
  background: #333;
}

/* 响应式设计 */
@media (max-width: 992px) {
  .grid-container {
    grid-template-columns: 1fr;
    gap: 60px;
    text-align: center;
  }

  .left-panel, .right-panel {
    margin: 0 auto;
  }

  .step-title {
    font-size: 48px;
  }
}

@media (max-width: 768px) {
  .step-title {
    font-size: 36px;
  }

  .user-summary {
    padding: 20px;
  }
}
</style>
