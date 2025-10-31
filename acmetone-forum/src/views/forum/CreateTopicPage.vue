<!--
 * 发布话题页面组件
 * 
 * 该组件提供发布新话题的功能，包括选择分类、输入标题和内容。
 * 设计风格与主页保持一致。
 * 
 * @module views/forum/CreateTopicPage
 * @requires vue
 * @requires vue-router
 * @requires element-plus
 * @requires @/stores/forum
 -->
<template>
  <div class="create-topic-container">
    <div class="create-topic-header">
      <h1 class="create-topic-title">发布新话题</h1>
      <p class="create-topic-subtitle">分享您的想法和创作</p>
    </div>

    <div class="create-topic-content">
      <el-card class="topic-form-card">
        <el-form
          ref="topicFormRef"
          :model="topicForm"
          :rules="topicRules"
          label-position="top"
          @submit.prevent="handleSubmit"
        >
          <el-form-item label="分类" prop="categoryId">
            <el-select
              v-model="topicForm.categoryId"
              placeholder="请选择话题分类"
              style="width: 100%"
            >
              <el-option
                v-for="category in forumStore.categories"
                :key="category.id"
                :label="category.name"
                :value="category.id"
              >
                <span :style="{ color: category.color }">{{ category.name }}</span>
              </el-option>
            </el-select>
          </el-form-item>

          <el-form-item label="标题" prop="title">
            <el-input
              v-model="topicForm.title"
              placeholder="请输入话题标题"
              maxlength="200"
              show-word-limit
            />
          </el-form-item>

          <el-form-item label="内容" prop="content">
            <el-input
              v-model="topicForm.content"
              type="textarea"
              :rows="10"
              placeholder="请输入话题内容"
              maxlength="10000"
              show-word-limit
            />
          </el-form-item>

          <el-form-item>
            <el-button
              type="primary"
              native-type="submit"
              :loading="forumStore.loading"
              class="submit-button"
            >
              发布话题
            </el-button>
            <el-button @click="goBack">取消</el-button>
          </el-form-item>
        </el-form>

        <div v-if="forumStore.error" class="form-error">
          {{ forumStore.error }}
        </div>
      </el-card>

      <div class="topic-guidelines">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>发帖指南</span>
            </div>
          </template>
          <div class="guidelines-content">
            <h4>发帖须知</h4>
            <ul>
              <li>请选择合适的分类，以便其他用户更容易找到您的话题</li>
              <li>标题应简明扼要，能够清晰表达主题</li>
              <li>内容应详细充实，可以包含图片、链接等</li>
              <li>请遵守社区规则，不发布违规内容</li>
            </ul>
            
            <h4>格式技巧</h4>
            <ul>
              <li>可以使用Markdown格式来美化您的内容</li>
              <li>添加适当的段落和标题，使内容更易阅读</li>
              <li>如果分享音乐作品，请提供试听链接</li>
            </ul>
          </div>
        </el-card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 发布话题页面组件
 * 
 * @component
 */
import { ref, reactive, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { useForumStore } from '@/stores/forum';

// 路由实例
const router = useRouter();

// 论坛状态
const forumStore = useForumStore();

// 表单引用
const topicFormRef = ref(null);

// 话题表单
const topicForm = reactive({
  categoryId: '',
  title: '',
  content: '',
});

// 表单验证规则
const topicRules = {
  categoryId: [
    { required: true, message: '请选择话题分类', trigger: 'change' },
  ],
  title: [
    { required: true, message: '请输入话题标题', trigger: 'blur' },
    { min: 5, max: 200, message: '标题长度应在5-200个字符之间', trigger: 'blur' },
  ],
  content: [
    { required: true, message: '请输入话题内容', trigger: 'blur' },
    { min: 10, max: 10000, message: '内容长度应在10-10000个字符之间', trigger: 'blur' },
  ],
};

/**
 * 处理表单提交
 */
const handleSubmit = async () => {
  if (!topicFormRef.value) return;
  
  try {
    // @ts-ignore - 忽略类型检查，表单验证方法在运行时存在
    await topicFormRef.value.validate();
    
    const topicId = await forumStore.publishTopic({
      categoryId: Number(topicForm.categoryId),
      title: topicForm.title,
      content: topicForm.content,
    });
    
    ElMessage.success('话题发布成功');
    router.push(`/forum/topic/${topicId}`);
  } catch (error) {
    console.error('发布话题失败:', error);
  }
};

/**
 * 返回上一页
 */
const goBack = () => {
  router.back();
};

/**
 * 组件挂载时获取分类列表
 */
onMounted(async () => {
  if (forumStore.categories.length === 0) {
    try {
      await forumStore.fetchCategories();
    } catch (error) {
      console.error('获取分类失败:', error);
    }
  }
});
</script>

<style scoped>
.create-topic-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.create-topic-header {
  margin-bottom: 30px;
  text-align: center;
}

.create-topic-title {
  font-size: 28px;
  font-weight: 600;
  color: #303133;
  margin: 0;
}

.create-topic-subtitle {
  font-size: 16px;
  color: #909399;
  margin: 10px 0 0;
}

.create-topic-content {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 20px;
}

.topic-form-card {
  margin-bottom: 20px;
}

.submit-button {
  min-width: 120px;
}

.form-error {
  margin-top: 15px;
  padding: 10px;
  color: #f56c6c;
  background-color: #fef0f0;
  border-radius: 4px;
}

.card-header {
  font-weight: bold;
}

.guidelines-content h4 {
  margin: 15px 0 10px;
  color: #303133;
}

.guidelines-content ul {
  padding-left: 20px;
  margin: 10px 0;
}

.guidelines-content li {
  margin-bottom: 5px;
  color: #606266;
}

@media (max-width: 768px) {
  .create-topic-container {
    padding: 10px;
  }
  
  .create-topic-title {
    font-size: 24px;
  }
  
  .create-topic-subtitle {
    font-size: 14px;
  }
  
  .create-topic-content {
    grid-template-columns: 1fr;
  }
}
</style> 