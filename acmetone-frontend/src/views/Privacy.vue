<template>
  <div class="legal-container">
    <div class="content-wrapper">
      <h1 class="page-title">隐私政策</h1>
      <p class="update-date">最后更新日期：2024年7月22日</p>
      
      <div class="legal-content">
        <p>Acmetone (极音记) 致力于保护您的隐私。本隐私政策解释了我们如何收集、使用、披露和保护您的信息。</p>

        <div class="disclaimer">
          <p><strong>重要提示：</strong>本隐私政策为通用模板，仅供参考。强烈建议您咨询法律专业人士，确保其完全符合您所在地的隐私保护法规（如GDPR, CCPA等）。</p>
        </div>

        <h2>1. 我们收集的信息</h2>
        <p>我们可能收集以下类型的信息：</p>
        <ul>
          <li><strong>个人身份信息：</strong>如您的姓名、电子邮件地址、邮寄地址、电话号码、支付信息等，这些信息在您注册账户、进行交易或联系我们时提供。</li>
          <li><strong>非个人身份信息：</strong>如您的浏览器类型、IP地址、操作系统、访问时间等，这些信息通过您与我们服务的交互自动收集。</li>
          <li><strong>使用数据：</strong>关于您如何使用我们服务的信息，包括您上传的作品、浏览的页面、点击的链接等。</li>
        </ul>

        <h2>2. 我们如何使用您的信息</h2>
        <p>我们使用收集到的信息用于以下目的：</p>
        <ul>
          <li>提供、运营和维护我们的服务。</li>
          <li>处理您的交易，向您支付版税。</li>
          <li>改善、个性化和扩展我们的服务。</li>
          <li>与您沟通，包括客户服务和发送服务更新、安全警报等。</li>
          <li>用于合规目的，包括执行我们的服务条款。</li>
        </ul>

        <h2>3. 信息共享与披露</h2>
        <p>我们不会将您的个人信息出售给第三方。我们仅在以下情况下共享您的信息：</p>
        <ul>
          <li><strong>服务提供商：</strong>我们可能与帮助我们运营业务的第三方服务提供商（如支付处理商、数据分析公司）共享信息。</li>
          <li><strong>法律要求：</strong>如果法律要求或为了响应有效的法律程序，我们可能会披露您的信息。</li>
          <li><strong>业务转让：</strong>在公司合并、收购或资产出售的情况下，您的个人信息可能会被转移。</li>
        </ul>

        <h2>4. 数据安全</h2>
        <p>我们采取合理的安全措施来保护您的个人信息，防止未经授权的访问、使用或披露。但是，没有任何通过互联网传输的方法或电子存储方法是100%安全的。</p>

        <h2>5. 您的权利</h2>
        <p>根据您所在的地区，您可能拥有访问、更正或删除您个人信息的权利。您可以登录您的账户直接修改大部分信息，或通过联系我们来行使您的权利。</p>

        <h2>6. 儿童隐私</h2>
        <p>我们的服务不面向13岁以下的儿童。我们不会有意收集13岁以下儿童的个人身份信息。</p>

        <h2>7. 政策变更</h2>
        <p>我们可能会不时更新本隐私政策。我们会通过在网站上发布新政策来通知您任何变更。我们建议您定期查看本隐私政策以了解任何变更。</p>

        <h2>8. 联系我们</h2>
        <p>如果您对本隐私政策有任何疑问，请通过 <router-link to="/contact">联系我们</router-link> 页面与我们联系。</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.legal-container {
  padding: 80px 40px;
  background-color: #fff;
  color: #333;
}
.content-wrapper {
  max-width: 800px;
  margin: 0 auto;
}
.page-title {
  font-size: 32px;
  font-weight: 700;
  margin-bottom: 8px;
}
.update-date {
  color: #888;
  margin-bottom: 40px;
  font-size: 14px;
}
.legal-content h2 {
  font-size: 24px;
  font-weight: 700;
  margin-top: 40px;
  margin-bottom: 20px;
}
.legal-content p, .legal-content li {
  font-size: 16px;
  line-height: 1.7;
  color: #555;
  margin-bottom: 16px;
}
.legal-content ul {
  padding-left: 20px;
  list-style-position: inside;
}
.disclaimer {
  background-color: #f8f8f8;
  border: 1px solid #eee;
  border-radius: 4px;
  padding: 20px;
  margin: 30px 0;
}
.disclaimer p {
  color: #555;
  margin: 0;
  font-size: 15px;
}
.legal-content a {
  color: #007bff;
  text-decoration: none;
  border-bottom: 1px solid #007bff;
  padding-bottom: 1px;
}
.legal-content a:hover {
  color: #0056b3;
  border-bottom-color: #0056b3;
}
</style>
