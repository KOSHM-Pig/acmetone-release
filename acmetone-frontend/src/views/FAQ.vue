<template>
  <div class="page-container">
    <div class="content-wrapper">
      <h1 class="page-title">常见问题 (FAQ)</h1>
      <p class="page-subtitle">在这里找到您关于音乐发行、版税、版权等最常见问题的答案。</p>

      <el-collapse v-model="activeName" accordion class="faq-collapse">
        <el-collapse-item title="在 Acmetone 发行音乐需要多少费用？" name="1">
          <div>
            <p>我们提供多种灵活的发行方案以满足不同音乐人的需求。我们有免费的入门计划，也有提供更多增值服务（如加急处理、深度数据分析等）的付费计划。所有计划都确保您保留100%的版权和大部分的版税收入。详细信息请查看我们的"服务与定价"页面。</p>
          </div>
        </el-collapse-item>
        <el-collapse-item title="我的音乐需要多长时间才能在各大平台上架？" name="2">
          <div>
            <p>在您提交作品并通过我们的内容审核后，通常需要2到5个工作日，您的音乐就会在各大主流平台上线。部分平台可能会稍有延迟。我们也提供加急服务，最快可在48小时内完成上架。</p>
          </div>
        </el-collapse-item>
        <el-collapse-item title="我能获得多少版税？如何提现？" name="3">
          <div>
            <p>根据您选择的发行计划，您最高可以获得平台结算版税的70%~80%。我们会在收到平台账单后的次月自动将版税存入您的Acmetone账户。当您的账户余额达到50元时，您可以随时通过我们支持的支付方式（如银行转账）进行提现。</p>
          </div>
        </el-collapse-item>
        <el-collapse-item title="我需要为我的歌曲准备UPC和ISRC码吗？" name="4">
          <div>
            <p>不需要。如果您没有自己的UPC（通用产品代码）和ISRC（国际标准音像制品编码），Acmetone会为您免费生成并分配。这些是追踪您作品销售和播放量的行业标准代码。</p>
          </div>
        </el-collapse-item>
        <el-collapse-item title="我可以发行翻唱歌曲 (Cover Song) 吗？" name="5">
          <div>
            <p>可以，但您必须确保已经获得了翻唱作品的机械复制权授权。发行未获授权的翻唱作品是违法的，并可能导致您的作品被下架。</p>
          </div>
        </el-collapse-item>

      </el-collapse>

      <div class="support-link">
        <p>没有找到您的问题？请访问我们的 <router-link to="/support">帮助中心</router-link> 或直接 <router-link to="/contact">联系我们</router-link>。</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
const activeName = ref('1');
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
  margin-bottom: 50px;
  line-height: 1.7;
}

.faq-collapse {
  border-top: 1px solid #eee;
}
:deep(.el-collapse-item) {
  border-bottom: 1px solid #eee;
}
:deep(.el-collapse-item__header) {
  font-size: 18px;
  font-weight: 600;
  height: auto;
  line-height: 1.5;
  padding: 20px 0;
}
:deep(.el-collapse-item__wrap) {
  border-bottom: none;
  background-color: #fff;
}
:deep(.el-collapse-item__content) {
  padding: 0 0 20px 0;
  font-size: 16px;
  line-height: 1.8;
  color: #555;
}
.support-link {
  margin-top: 40px;
  font-size: 16px;
  text-align: center;
}
.support-link a {
  color: #007bff;
  text-decoration: none;
  border-bottom: 1px solid #007bff;
  padding-bottom: 1px;
}
.support-link a:hover {
  color: #0056b3;
  border-bottom-color: #0056b3;
}
</style>
