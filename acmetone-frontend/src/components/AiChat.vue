<template>
  <div 
    class="ai-chat-container" 
    :class="{ 'chat-expanded': isExpanded }" 
    :style="{ top: position.top + 'px', left: position.left + 'px' }"
    ref="chatContainer"
  >
    <div class="chat-card">
      <div class="chat-header" @mousedown="startDrag">
        <div class="h2">AI 助手</div>
        <div class="header-actions">
          <el-button v-if="messages.length > 1" type="text" @click.stop="clearHistory">
            <el-icon><Delete /></el-icon>
          </el-button>
          <el-icon class="toggle-icon" :class="{ 'is-expanded': isExpanded }" @click.stop="toggleChat">
            <ArrowDown />
          </el-icon>
        </div>
      </div>
      <div class="chat-body" ref="chatBody" @scroll="handleScroll" v-show="isExpanded">
        <div v-for="(message, index) in messages" :key="index" 
             class="message" 
             :class="message.type">
          <p v-if="message.type === 'outgoing'" v-html="formatMessage(message.content)"></p>
          <div v-else>
            <div class="typing-container">
              <p class="typing-text" :class="{ 'typing': message.isTyping }" v-html="formatMessage(message.displayContent)"></p>
              <span v-if="message.isTyping" class="cursor"></span>
            </div>
            <div v-if="message.reasoning" class="reasoning-container">
              <div class="reasoning-header" @click="toggleReasoning(index)">
                <span>思考过程</span>
                <el-icon :class="{ 'is-expanded': message.showReasoning }">
                  <ArrowDown />
                </el-icon>
              </div>
              <div v-show="message.showReasoning" class="reasoning-content" v-html="formatMessage(message.displayReasoning)">
              </div>
            </div>
          </div>
        </div>
        <div v-if="loading" class="message incoming">
          <p class="thinking">
            <span class="dot"></span>
            <span class="dot"></span>
            <span class="dot"></span>
          </p>
        </div>
        
        <!-- 滚动到底部按钮 -->
        <div v-if="showScrollButton" class="scroll-to-bottom" @click="scrollToBottom">
          <el-icon><ArrowDown /></el-icon>
        </div>
      </div>
      <div class="chat-footer" v-show="isExpanded">
        <div class="footer-options">
          <el-switch
            v-model="enableThinking"
            active-text="思考模式"
            inactive-text=""
            size="small"
            class="thinking-switch"
            @change="handleThinkingChange"
          />
          <div v-if="!userStore.isAuthenticated" class="login-tip">
            <el-link type="primary" @click="goToLogin">登录</el-link>
          </div>
        </div>
        <div class="input-container">
          <div class="chat-input-wrapper">
        <el-input
          v-model="userInput"
          placeholder="输入您的问题"
          :disabled="loading"
          @keyup.enter="sendMessage"
              class="chat-input"
            />
            <el-button 
              :loading="loading"
              @click="sendMessage"
              class="send-btn"
              style="width: 80px; min-width: 80px;"
            >
              发送
            </el-button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick, watch, onBeforeUnmount } from 'vue';
import { ArrowDown, Delete } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import axios from 'axios';
import { useUserStore } from '../stores/user';

const userStore = useUserStore();
const isExpanded = ref(false);
const userInput = ref('');
const messages = ref([
  {
    type: 'incoming',
    content: '您好！我是 AI 助手，有什么可以帮您的吗？',
    displayContent: '',
    isTyping: true,
    reasoning: null,
    displayReasoning: '',
    isReasoningTyping: false,
    showReasoning: false
  }
]);
const loading = ref(false);
const chatBody = ref(null);
const chatContainer = ref(null);
const typingSpeed = 30; // 打字速度，单位：毫秒/字符
const enableThinking = ref(false); // 是否启用深度思考
const showScrollButton = ref(false);

// 拖动相关变量
const position = ref({ top: 100, left: 20 });
let isDragging = false;
let startPos = { x: 0, y: 0 };
let offset = { x: 0, y: 0 };
let hasMoved = false;

// 开始拖动
const startDrag = (event) => {
  // 如果点击了按钮或展开图标，不启动拖动
  if (event.target.closest('.el-button') || event.target.closest('.toggle-icon')) {
    return;
  }
  
  isDragging = true;
  hasMoved = false;
  
  // 记录起始位置
  startPos.x = event.clientX;
  startPos.y = event.clientY;
  
  // 计算鼠标相对于窗口的偏移量
  const rect = chatContainer.value.getBoundingClientRect();
  offset.x = event.clientX - rect.left;
  offset.y = event.clientY - rect.top;
  
  // 添加鼠标移动和松开事件监听
  document.addEventListener('mousemove', handleDrag);
  document.addEventListener('mouseup', stopDrag);
  
  // 阻止默认行为
  event.preventDefault();
};

// 处理拖动过程
const handleDrag = (event) => {
  if (!isDragging) return;
  
  // 检测是否确实移动了（超过5像素）
  const moveX = Math.abs(event.clientX - startPos.x);
  const moveY = Math.abs(event.clientY - startPos.y);
  
  if (moveX > 5 || moveY > 5) {
    hasMoved = true;
  }
  
  // 根据鼠标位置和初始偏移量计算新位置
  position.value.left = event.clientX - offset.x;
  position.value.top = event.clientY - offset.y;
  
  // 防止拖出屏幕
  if (position.value.left < 0) position.value.left = 0;
  if (position.value.top < 0) position.value.top = 0;
  
  // 防止拖到屏幕右侧或底部之外
  const maxLeft = window.innerWidth - chatContainer.value.offsetWidth;
  const maxTop = window.innerHeight - 50; // 至少保留header可见
  
  if (position.value.left > maxLeft) position.value.left = maxLeft;
  if (position.value.top > maxTop) position.value.top = maxTop;
  
  // 保存位置到本地存储
  localStorage.setItem('ai_chat_position', JSON.stringify(position.value));
};

// 停止拖动
const stopDrag = (event) => {
  isDragging = false;
  document.removeEventListener('mousemove', handleDrag);
  document.removeEventListener('mouseup', stopDrag);
};

// 切换聊天窗口展开/收起状态
const toggleChat = () => {
  // 如果正在拖动且已经移动，不触发切换
  if (isDragging && hasMoved) return;
  
  isExpanded.value = !isExpanded.value;
  
  // 保存状态到本地存储
  localStorage.setItem('ai_chat_expanded', isExpanded.value ? 'true' : 'false');
  
  // 如果是第一次展开并且用户已登录，加载历史记录
  if (isExpanded.value && userStore.isAuthenticated && messages.value[0].displayContent === '') {
    loadHistory();
  }
  
  // 如果展开，滚动到底部
  if (isExpanded.value) {
    nextTick(() => {
      scrollToBottom();
    });
  }
};

// 处理深度思考开关变化
const handleThinkingChange = (value) => {
  localStorage.setItem('ai_enable_thinking', value ? 'true' : 'false');
  ElMessage.info(value ? '已启用深度思考模式' : '已关闭深度思考模式');
};

// 切换显示/隐藏思考过程
const toggleReasoning = (index) => {
  const message = messages.value[index];
  if (!message.reasoning) return;
  
  // 切换显示状态
  message.showReasoning = !message.showReasoning;
  
  // 确保思考过程内容已设置
  if (message.showReasoning && message.displayReasoning === '') {
    message.displayReasoning = message.reasoning;
  }
  
  // 滚动到底部
  nextTick(() => {
    scrollToBottom();
  });
};

// 打字机效果
const typeWriter = async (message, index) => {
  // 先显示消息内容
  const text = message.content;
  message.displayContent = '';
  message.isTyping = true;
  
  // 添加光标效果
  const cursor = '<span class="cursor"></span>';
  
  for (let i = 0; i < text.length; i++) {
    message.displayContent += text[i];
    await new Promise(resolve => setTimeout(resolve, typingSpeed));
    // 每添加一个字符就滚动到底部
    scrollToBottom();
  }
  
  message.isTyping = false;
  
  // 如果有思考过程，自动展开并直接显示（不使用打字机效果）
  if (message.reasoning) {
    message.showReasoning = true;
    message.displayReasoning = message.reasoning;
    message.isReasoningTyping = false;
    scrollToBottom();
  }
};

// 清空历史记录
const clearHistory = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要清空所有聊天记录吗？',
      '清空聊天记录',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );
    
    messages.value = [
      {
        type: 'incoming',
        content: '聊天记录已清空，有什么可以帮您的吗？',
        displayContent: '',
        isTyping: true,
        reasoning: null,
        displayReasoning: '',
        isReasoningTyping: false,
        showReasoning: false
      }
    ];
    
    // 使用打字机效果显示欢迎消息
    await typeWriter(messages.value[0], 0);
    
  } catch (error) {
    // 用户取消操作
  }
};

// 加载历史记录
const loadHistory = async () => {
  try {
    const response = await axios.get('/ai/history');
    const history = response.data;
    
    if (history.length === 0) {
      // 如果没有历史记录，显示欢迎消息
      await typeWriter(messages.value[0], 0);
      return;
    }
    
    // 清空当前消息
    messages.value = [];
    
    // 添加最近的5条历史消息
    const recentHistory = history.slice(0, 5).reverse();
    
    for (const log of recentHistory) {
      // 添加用户消息
      messages.value.push({
        type: 'outgoing',
        content: log.userMessage,
        displayContent: log.userMessage,
        isTyping: false
      });
      
      // 添加 AI 回复
      messages.value.push({
        type: 'incoming',
        content: log.aiResponse,
        displayContent: log.aiResponse,
        isTyping: false,
        reasoning: log.reasoningContent || null,
        displayReasoning: log.reasoningContent || '',
        isReasoningTyping: false,
        showReasoning: false
      });
    }
    
    // 添加欢迎回来的消息
    messages.value.push({
      type: 'incoming',
      content: '欢迎回来！我可以继续为您提供帮助。',
      displayContent: '',
      isTyping: true,
      reasoning: null,
      displayReasoning: '',
      isReasoningTyping: false,
      showReasoning: false
    });
    
    // 使用打字机效果显示欢迎消息
    await typeWriter(messages.value[messages.value.length - 1], messages.value.length - 1);
  } catch (error) {
    console.error('加载历史记录失败:', error);
    // 如果加载失败，显示欢迎消息
    await typeWriter(messages.value[0], 0);
  }
};

// 滚动到底部
const scrollToBottom = async () => {
  await nextTick();
  if (chatBody.value) {
    chatBody.value.scrollTop = chatBody.value.scrollHeight;
  }
};

// 监听消息变化，自动滚动到底部
watch(messages, () => {
  scrollToBottom();
}, { deep: true });

// 发送消息
const sendMessage = async () => {
  if (!userInput.value.trim() || loading.value) return;
  
  // 添加用户消息
  messages.value.push({
    type: 'outgoing',
    content: userInput.value,
    displayContent: userInput.value,
    isTyping: false
  });
  
  const question = userInput.value;
  userInput.value = '';
  loading.value = true;
  
  // 重试计数器
  let retries = 0;
  const maxRetries = 2;
  
  async function attemptSend() {
    try {
      // 先检查 AI API 是否可用
      if (retries > 0) {
        console.log(`[AI Chat] 第 ${retries} 次重试...`);
      }
      
      // 根据登录状态选择不同的 API 路径
      const apiPath = userStore.isAuthenticated ? '/ai/chat' : '/ai/chat/guest';
      
      const response = await axios.post(apiPath, {
        message: question,
        enableThinking: enableThinking.value
      });
      
      // 添加 AI 回复
      const aiMessage = {
        type: 'incoming',
        content: response.data.message,
        displayContent: '',
        isTyping: true,
        reasoning: response.data.reasoning || null,
        displayReasoning: '',
        isReasoningTyping: false,
        showReasoning: false
      };
      messages.value.push(aiMessage);
      
      // 使用打字机效果显示 AI 回复
      await typeWriter(aiMessage, messages.value.length - 1);
    } catch (error) {
      console.error('AI 回复失败:', error);
      
      if (retries < maxRetries) {
        retries++;
        // 等待 1 秒后重试
        await new Promise(resolve => setTimeout(resolve, 1000));
        return attemptSend();
      }
      
      // 所有重试都失败了
      if (error.response?.status === 401) {
        ElMessage.error('请先登录后再使用 AI 助手');
        
        // 添加提示消息
        messages.value.push({
          type: 'incoming',
          content: '您需要登录才能使用 AI 助手的全部功能。登录后可以保存聊天历史并享受更多功能。',
          displayContent: '您需要登录才能使用 AI 助手的全部功能。登录后可以保存聊天历史并享受更多功能。',
          isTyping: false,
          reasoning: null,
          displayReasoning: '',
          isReasoningTyping: false,
          showReasoning: false
        });
      } else if (error.response?.status === 429) {
        // 请求限制错误
        ElMessage.error('请求过于频繁，请稍后再试');
        
        // 添加提示消息
        const limitMessage = userStore.isAuthenticated 
          ? '您的请求过于频繁，请稍后再试。' 
          : '您的请求过于频繁，请稍后再试或登录账号继续使用。登录用户有更高的请求限制。';
          
        messages.value.push({
          type: 'incoming',
          content: limitMessage,
          displayContent: limitMessage,
          isTyping: false,
          reasoning: null,
          displayReasoning: '',
          isReasoningTyping: false,
          showReasoning: false
        });
      } else {
        // 添加错误消息
        messages.value.push({
          type: 'incoming',
          content: '抱歉，我现在无法回答您的问题。请稍后再试。',
          displayContent: '抱歉，我现在无法回答您的问题。请稍后再试。',
          isTyping: false,
          reasoning: null,
          displayReasoning: '',
          isReasoningTyping: false,
          showReasoning: false
        });
        
        ElMessage.error('AI 服务暂时不可用，请稍后再试');
      }
    } finally {
      loading.value = false;
    }
  }
  
  await attemptSend();
};

// 格式化消息，处理换行符
const formatMessage = (text) => {
  if (!text) return '';
  
  // 转义 HTML 特殊字符
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
  
  // 将换行符转换为 <br>
  return escaped.replace(/\n/g, '<br>');
};

// 跳转到登录页面
const goToLogin = () => {
  // 根据您的路由配置调整
  window.location.href = '/login';
};

onMounted(() => {
  // 从本地存储加载深度思考设置
  const savedThinking = localStorage.getItem('ai_enable_thinking');
  if (savedThinking !== null) {
    enableThinking.value = savedThinking === 'true';
  }
  
  // 从本地存储加载聊天窗口展开状态
  const savedExpanded = localStorage.getItem('ai_chat_expanded');
  if (savedExpanded !== null) {
    isExpanded.value = savedExpanded === 'true';
  } else {
    isExpanded.value = false; // 默认折叠
  }
  
  // 从本地存储加载位置
  const savedPosition = localStorage.getItem('ai_chat_position');
  if (savedPosition) {
    try {
      const pos = JSON.parse(savedPosition);
      position.value = pos;
    } catch (e) {
      console.error('解析保存的位置失败:', e);
    }
  }
  
  // 如果用户已登录并且聊天窗口已展开，加载历史记录
  if (userStore.isAuthenticated && isExpanded.value) {
    loadHistory();
  } else if (!isExpanded.value) {
    // 如果是折叠状态，不需要加载消息
    messages.value[0].displayContent = messages.value[0].content;
    messages.value[0].isTyping = false;
  } else {
    // 否则，只显示欢迎消息
    typeWriter(messages.value[0], 0);
  }
});

onBeforeUnmount(() => {
  // 移除可能的事件监听器
  document.removeEventListener('mousemove', handleDrag);
  document.removeEventListener('mouseup', stopDrag);
});

// 处理滚动事件
const handleScroll = () => {
  if (!chatBody.value) return;
  
  const { scrollTop, scrollHeight, clientHeight } = chatBody.value;
  // 如果滚动位置距离底部超过100px，显示滚动按钮
  showScrollButton.value = scrollHeight - scrollTop - clientHeight > 100;
};

// 强制刷新滚动条
const refreshScrollbar = () => {
  if (!chatBody.value) return;
  
  // 临时修改滚动位置来触发滚动条刷新
  const currentScroll = chatBody.value.scrollTop;
  chatBody.value.scrollTop = currentScroll + 1;
  setTimeout(() => {
    chatBody.value.scrollTop = currentScroll;
  }, 5);
};

// 监听展开/折叠状态变化，刷新滚动条
watch(isExpanded, (newVal) => {
  if (newVal) {
    nextTick(() => {
      refreshScrollbar();
      scrollToBottom();
    });
  }
});
</script>

<style scoped>
.ai-chat-container {
  position: fixed;
  z-index: 1000;
  transition: all 0.3s ease;
  max-width: 90vw;
  font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif;
}

.chat-card {
  width: 150px;
  background-color: rgba(0, 0, 0, 0.9);
  border-radius: 0;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
  overflow: hidden;
  transition: all 0.3s ease;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.chat-expanded .chat-card {
  width: 350px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .chat-expanded .chat-card {
    width: 90vw;
    max-width: 650px;
  }
  
  .chat-body {
    -webkit-overflow-scrolling: touch;
  }
}

.chat-header {
  padding: 12px 15px;
  background-color: #000;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: move; /* 添加移动光标 */
  transition: all 0.3s ease;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  user-select: none; /* 防止拖动时选中文本 */
}

/* 展开状态下的header样式 */
.chat-expanded .chat-header {
  padding: 20px 30px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

/* 收缩状态下的hover效果 */
.chat-header:hover {
  background-color: #111;
}

/* 收缩状态下的标题样式 */
.chat-header .h2 {
  font-size: 12px;
  color: #fff;
  margin: 0;
  font-weight: 400;
  text-transform: uppercase;
  letter-spacing: 1.5px;
}

/* 展开状态下的标题样式 */
.chat-expanded .chat-header .h2 {
  font-size: 15px;
  letter-spacing: 2.5px;
}

.header-actions {
  display: flex;
  align-items: center;
}

.header-actions .el-button {
  color: #fff;
  margin-right: 8px;
  padding: 2px;
}

.toggle-icon {
  color: #fff;
  transition: transform 0.3s ease;
  font-size: 14px;
  cursor: pointer; /* 明确图标是可点击的 */
}

.toggle-icon.is-expanded {
  transform: rotate(180deg);
}

.chat-body {
  height: 400px;
  padding: 30px;
  overflow-y: scroll !important;
  background-color: #000;
  transition: all 0.3s ease;
  scrollbar-width: thin;
  scrollbar-color: #333 #000;
  position: relative;
  -ms-overflow-style: scrollbar !important;
}

/* Webkit 浏览器的滚动条样式 */
.chat-body::-webkit-scrollbar {
  width: 2px;
}

.chat-body::-webkit-scrollbar-track {
  background: #000;
  border-radius: 0;
}

.chat-body::-webkit-scrollbar-thumb {
  background-color: rgba(255, 255, 255, 0.3);
  border-radius: 0;
}

.chat-body::-webkit-scrollbar-thumb:hover {
  background-color: rgba(255, 255, 255, 0.5);
}

.message {
  margin-bottom: 16px;
  padding: 16px;
  border-radius: 0;
  max-width: 75%;
  word-wrap: break-word;
  overflow-wrap: break-word;
  word-break: break-word;
  position: relative;
}

.incoming {
  background-color: rgba(25, 25, 25, 0.8);
  margin-right: auto;
  color: #fff;
  border-left: 2px solid rgba(255, 255, 255, 0.8);
}

.outgoing {
  background-color: rgba(255, 255, 255, 0.9);
  margin-left: auto;
  color: #000;
  border-left: none;
  border-right: 2px solid rgba(0, 0, 0, 0.2);
}

.message p {
  font-size: 15px;
  margin: 0;
  line-height: 1.6;
  white-space: pre-wrap;
  font-weight: 400;
}

.chat-footer {
  padding: 20px;
  background-color: #000;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.input-container {
  display: flex;
  width: 100%;
  padding: 0 5px;
}

.chat-expanded .input-container {
  max-width: 95%;
  margin: 0 auto;
}

.chat-input-wrapper {
  display: flex;
  width: 100%;
  position: relative;
  align-items: stretch;
}

.chat-input {
  flex: 1;
}

.chat-input :deep(.el-input__wrapper) {
  box-shadow: none !important;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background-color: rgba(0, 0, 0, 0.8);
  border-radius: 0;
  height: 40px;
}

.chat-expanded .chat-input :deep(.el-input__wrapper) {
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.chat-input :deep(.el-input__inner) {
  color: #fff;
  background-color: transparent;
  height: 40px;
  line-height: 40px;
  font-size: 14px;
  font-weight: 400;
}

.chat-expanded .chat-input :deep(.el-input__inner) {
  font-size: 16px;
}

.chat-input :deep(.el-input__inner::placeholder) {
  color: rgba(255, 255, 255, 0.5);
  font-size: 13px;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

.send-btn {
  color: #000;
  border: none;
  font-weight: 500;
  height: 40px;
  padding: 0 15px;
  border-radius: 0;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 2px;
  min-width: 80px;
  background-color: #fff;
  margin-left: -1px;
}

.send-btn:hover {
  background-color: rgba(255, 255, 255, 0.9);
}

.chat-expanded .send-btn {
  min-width: 90px;
}

.chat-footer :deep(.el-button:hover) {
  background-color: rgba(255, 255, 255, 0.9);
}

.chat-expanded .chat-footer :deep(.el-button) {
  font-size: 14px;
  letter-spacing: 2px;
}

.footer-options {
  margin-bottom: 15px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.thinking-switch {
  --el-switch-on-color: #fff;
}

.footer-options :deep(.el-switch__label) {
  color: rgba(255, 255, 255, 0.7);
  font-size: 11px;
  letter-spacing: 1px;
  text-transform: uppercase;
}

.footer-options :deep(.el-switch__label.is-active) {
  color: #fff;
}

.login-tip {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  margin-left: 10px;
}

.login-tip :deep(.el-link) {
  color: #fff;
  font-weight: 400;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 1.5px;
}

.login-tip :deep(.el-link:hover) {
  color: rgba(255, 255, 255, 0.8);
  text-decoration: underline;
}

.typing-container {
  position: relative;
  display: inline-block;
}

.typing-text {
  position: relative;
  white-space: pre-wrap;
}

.typing-container .cursor {
  display: inline-block;
  width: 2px;
  height: 16px;
  background-color: #fff;
  margin-left: 2px;
  animation: blink 1s infinite;
  vertical-align: middle;
  position: absolute;
  right: -4px;
  bottom: 0;
}

.reasoning-container {
  margin-top: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding-top: 15px;
}

.reasoning-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
  padding: 4px 0;
  text-transform: uppercase;
  letter-spacing: 2.5px;
}

.reasoning-header .el-icon {
  font-size: 12px;
  transition: transform 0.3s ease;
}

.reasoning-header .el-icon.is-expanded {
  transform: rotate(180deg);
}

.reasoning-content {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.9);
  background-color: rgba(40, 40, 40, 0.6);
  padding: 15px;
  border-radius: 0;
  border-left: 2px solid #fff;
  margin-top: 8px;
  white-space: pre-wrap;
  max-height: 200px;
  overflow-y: scroll !important;
  scrollbar-width: thin;
  scrollbar-color: #333 #222;
  -ms-overflow-style: scrollbar !important;
}

/* Webkit 浏览器的滚动条样式 */
.reasoning-content::-webkit-scrollbar {
  width: 4px;
}

.reasoning-content::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 0;
}

.reasoning-content::-webkit-scrollbar-thumb {
  background-color: #333;
  border-radius: 0;
}

.reasoning-content::-webkit-scrollbar-thumb:hover {
  background-color: #444;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

.thinking {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 20px;
}

.dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  margin: 0 2px;
  background-color: #fff;
  border-radius: 50%;
  animation: bounce 1.4s infinite ease-in-out both;
}

.dot:nth-child(1) {
  animation-delay: -0.32s;
}

.dot:nth-child(2) {
  animation-delay: -0.16s;
}

@keyframes bounce {
  0%, 80%, 100% { transform: scale(0); }
  40% { transform: scale(1); }
}

@keyframes chatAnimation {
  0% {
    opacity: 0;
    transform: translateY(5px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

.message {
  animation: chatAnimation 0.3s ease-in-out;
  animation-fill-mode: both;
}

.message:nth-child(even) {
  animation-delay: 0.1s;
}

.message:nth-child(odd) {
  animation-delay: 0.2s;
}

.scroll-to-bottom {
  position: absolute;
  bottom: 20px;
  right: 20px;
  background-color: #fff;
  border-radius: 0;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  z-index: 10;
}

.scroll-to-bottom:hover {
  background-color: rgba(255, 255, 255, 0.9);
}

.scroll-to-bottom .el-icon {
  color: #000;
  font-size: 16px;
}

.chat-footer :deep(.send-button) {
  color: #000;
  border: none;
  font-weight: 500;
  height: 40px;
  padding: 0 15px;
  border-radius: 0;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 2px;
  min-width: 80px;
  width: 100%;
  background-color: #fff;
}

.chat-footer :deep(.send-button:hover) {
  background-color: rgba(255, 255, 255, 0.9);
}
</style> 