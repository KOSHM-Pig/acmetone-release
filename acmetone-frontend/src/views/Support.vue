<template>
  <div class="page-container">
    <div class="content-wrapper">
      <h1 class="page-title">帮助与支持中心</h1>
      <p class="page-subtitle">我们在这里帮助您解决问题。您可以搜索或浏览下列主题。</p>

      <div class="search-bar">
        <el-input
          v-model="searchQuery"
          placeholder="搜索帮助文章，例如“如何上传封面”"
          size="large"
          :prefix-icon="Search"
        />
      </div>

      <div class="content-body">
        <section>
          <h2>帮助主题</h2>
          <div class="category-list">
            <div class="category-item">
              <h3><router-link to="/support/account">账户与设置</router-link></h3>
              <p>管理您的个人资料、密码和通知设置。</p>
            </div>
            <div class="category-item">
              <h3><router-link to="/support/uploading">作品上传与审核</router-link></h3>
              <p>了解音频、封面和元数据的要求与最佳实践。</p>
            </div>
            <div class="category-item">
              <h3><router-link to="/support/distribution">发行与上架</router-link></h3>
              <p>查询发行状态、平台规则和上架时间线。</p>
            </div>
            <div class="category-item">
              <h3><router-link to="/support/royalties">版税与数据报告</router-link></h3>
              <p>学习如何解读您的收入报告和播放数据。</p>
            </div>
            <div class="category-item">
              <h3><router-link to="/support/copyright">版权与内容ID</router-link></h3>
              <p>关于版权保护、YouTube Content ID等。</p>
            </div>
            <div class="category-item">
              <h3><router-link to="/faq">其他常见问题 (FAQ)</router-link></h3>
              <p>浏览我们的FAQ，找到更多问题的答案。</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { Search } from '@element-plus/icons-vue';

const searchQuery = ref('');
</script>

<style scoped>
.page-container {
  padding: 80px 40px;
  background-color: #fff;
  color: #333;
}
.content-wrapper {
  max-width: 800px;
  margin: 0 auto;
}
.page-title {
  font-size: 40px;
  font-weight: 700;
  margin-bottom: 16px;
}
.page-subtitle {
  font-size: 18px;
  color: #555;
  margin-bottom: 40px;
  line-height: 1.7;
}
.search-bar {
  margin-bottom: 50px;
}
:deep(.el-input__wrapper) {
  border-radius: 8px !important;
  padding: 8px 15px;
}
.content-body h2 {
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 25px;
}
.category-list {
  border-top: 1px solid #eee;
}
.category-item {
  padding: 25px 0;
  border-bottom: 1px solid #eee;
}
.category-item h3 {
  margin: 0 0 8px 0;
}
.category-item h3 a {
  font-size: 20px;
  font-weight: 600;
  color: #333;
  text-decoration: none;
}
.category-item h3 a:hover {
  color: #007bff;
}
.category-item p {
  margin: 0;
  color: #555;
  font-size: 16px;
  line-height: 1.7;
}
</style>
