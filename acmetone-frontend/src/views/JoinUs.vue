<template>
  <div class="page-container">
    <div class="content-wrapper">
      <h1 class="page-title">与我们合作</h1>
      <p class="page-subtitle">我们致力于为音乐人提供专业的数字音乐发行服务，帮助您的音乐传递到全球各大音乐平台。</p>

      <div class="content-body">
        <section>
          <h2>为什么选择 Acmetone？</h2>
          <p>作为专业的数字音乐发行公司，我们拥有丰富的行业经验和广泛的平台资源。我们不仅提供音乐发行服务，还为音乐人提供版权保护、数据分析、营销推广等全方位支持。我们的使命是帮助每一位音乐人实现梦想，让优质音乐被更多人听见。</p>
        </section>

        <!-- <section>
          <h2>我们的优势</h2>
          <div class="service-list">
            <div class="service-item">
              <h3>全球发行网络</h3>
              <p>覆盖 Spotify、Apple Music、网易云音乐等200+音乐平台</p>
            </div>
            <div class="service-item">
              <h3>专业版权保护</h3>
              <p>完善的版权登记和保护机制，守护您的音乐作品</p>
            </div>
            <div class="service-item">
              <h3>数据分析支持</h3>
              <p>实时数据追踪，助您了解作品表现和听众反馈</p>
            </div>
          </div>
        </section> -->
        
        <section class="contact-info">
          <h2>开始合作</h2>
          <p>如果您想要发行音乐作品，欢迎随时与我们联系。请将您的作品样本和个人介绍发送至 <a href="mailto:service@acmetone.com">service@acmetone.com</a>，我们的工作人员会尽快与您取得联系。</p>
          <p>期待与您的合作！</p>
        </section>
      </div>
    </div>
  </div>
</template>

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
  margin-bottom: 50px;
  line-height: 1.7;
}
.content-body section {
  margin-bottom: 50px;
}
.content-body h2 {
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 25px;
}
.content-body p {
  font-size: 16px;
  line-height: 1.8;
  color: #555;
}
.service-list {
  border-top: 1px solid #eee;
}
.service-item {
  padding: 25px 0;
  border-bottom: 1px solid #eee;
}
.service-item h3 {
  font-size: 20px;
  font-weight: 600;
  margin: 0 0 5px 0;
}
.service-item p {
  margin: 0;
  color: #888;
}
.contact-info a {
  color: #007bff;
  text-decoration: none;
  border-bottom: 1px solid #007bff;
  padding-bottom: 1px;
}
.contact-info a:hover {
  color: #0056b3;
  border-bottom-color: #0056b3;
}
</style>
