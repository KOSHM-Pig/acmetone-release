<template>
  <footer class="app-footer">
    <div class="container">
      <div class="footer-grid">
        <div class="footer-col">
          <div class="footer-logo">
            <span class="logo-text">ACMETONE</span>
            <span class="logo-sub">Forum</span>
          </div>
          <p class="footer-desc">电子音乐交流平台，连接所有热爱电子音乐的人</p>
          <div class="social-links">
            <a href="#" class="social-link" title="微博">
              <i class="el-icon">
                <svg viewBox="0 0 1024 1024" width="20" height="20">
                  <path
                    d="M851.4 590.2c-22.5-66.7-90.4-103.6-157.1-82.5-66.7 21.1-103.6 90.4-81 157.1 22.5 66.7 90.4 103.6 157.1 82.5 67.2-22.6 103.6-90.4 81-157.1zm-103.6 133.1c-12.7 4.2-26.8-2.5-31-15.2-4.2-12.7 2.5-26.3 15.2-30.5 12.7-4.2 26.8 2.5 31 15.2 4.2 12.2-2.5 26.3-15.2 30.5zm45.1-45.1c-4.2 7.6-15.2 10.1-22.7 5.9-7.6-4.2-10.1-13.1-5.9-20.7 4.2-7.6 15.2-10.1 22.7-5.9 7.6 3.7 10.1 13.1 5.9 20.7zm-404.8 4.2c-105.6 27.3-221-19.8-265.8-103.6-45.1-85.3-1.7-180.7 100.6-211.2 102.8-30.5 223.2 14.3 269.1 102.3 47.2 86.8 6 182.2-103.9 212.5zm37.3-346.6c-210.8-31-385.7 73.5-385.7 234 0 160.6 172.5 285.8 383.2 285.8 221 0 392.4-142.5 392.4-285.8.5-143-177.5-203.6-389.9-234zM554.2 391.5c-30.5-12.7-72.3.5-94.4 30.5-22.1 30-14.3 66.2 17.3 82 31.5 15.7 68.9 1.7 91-28.8 21.6-32.1 10.6-69.4-13.9-83.7zm104.6-105.1c-10.6-3.7-23.7.5-30 10.6-5.9 10.6-2.5 22.7 8.4 27.3 10.6 4.2 23.7 0 29.5-10.6 6-10.2 2.6-22.3-7.9-27.3zm136.1 364.5v.5h-3c-1.7 92.8-78.5 166.3-171.9 166.3h-3.5c-94.4-2.5-169.6-78.5-167.4-173v-2.5c-1.7-92.8 67.2-171.9 159.9-180.2h10.1c95.1 2.1 173.1 85.3 175.8 188.9z"
                    fill="currentColor"></path>
                </svg>
              </i>
            </a>
            <a href="#" class="social-link" title="微信">
              <i class="el-icon">
                <svg viewBox="0 0 1024 1024" width="20" height="20">
                  <path
                    d="M668.9 328.8c10.1 0 20.2.8 30.1 1.9-27-126.2-161.3-220.1-314.9-220.1-171.5 0-312.3 116.9-312.3 266.8 0 86.2 47.1 157.1 125.8 211.8L173 697.6l109.2-54.6c39.1 7.7 70.4 15.7 109.4 15.7 9.8 0 19.5-.5 29.1-1.2-6.1-20.9-9.6-43.1-9.6-65.9 0-138.6 119.2-251.8 257.8-251.8zM500.7 254.9c23.5 0 39.1 15.5 39.1 39.1 0 23.5-15.5 39.1-39.1 39.1-23.5 0-47.1-15.5-47.1-39.1.1-23.5 23.7-39.1 47.1-39.1zm-219.9 78.1c-23.5 0-47.2-15.5-47.2-39.1 0-23.5 23.7-39.1 47.2-39.1s39.1 15.5 39.1 39.1c0 23.6-15.5 39.1-39.1 39.1zm681.7 251.9c0-126.2-125.8-228.8-266.8-228.8-149.5 0-267.9 102.6-267.9 228.8 0 126.4 118.5 228.8 267.9 228.8 31.3 0 62.7-7.9 94.1-15.7l86.2 47.1-23.5-78.2c62.8-47.2 110-110 110-182zM615.7 511.1c-15.5 0-31.3-15.5-31.3-31.3 0-15.5 15.9-31.3 31.3-31.3 23.7 0 39.3 15.8 39.3 31.3 0 15.8-15.6 31.3-39.3 31.3zM781.6 511.1c-15.5 0-31.1-15.5-31.1-31.3 0-15.5 15.5-31.3 31.1-31.3 23.5 0 39.1 15.8 39.1 31.3.1 15.8-15.5 31.3-39.1 31.3z"
                    fill="currentColor"></path>
                </svg>
              </i>
            </a>
            <a href="#" class="social-link" title="抖音">
              <i class="el-icon">
                <svg viewBox="0 0 1024 1024" width="20" height="20">
                  <path
                    d="M777.514667 131.669333v226.112c-63.530667 0-122.282667-20.053333-170.666667-54.186666v266.325333c0 191.018667-154.88 346.24-345.856 346.24-62.293333 0-120.704-16.554667-171.008-45.632 54.613333 54.186667 129.578667 87.552 212.224 87.552 166.826667 0 302.08-135.253333 302.08-302.08V389.973333c48.384 34.133333 107.136 54.186667 170.666667 54.186667v-226.112c15.317333 0 29.994667 2.56 43.690667 7.125333a259.754667 259.754667 0 0 0-20.778667-69.973333c-49.493333-23.68-102.485333-23.509333-102.4-23.509333-9.685333 0-19.2.597333-28.629333 1.536-6.826667-5.12-26.624-12.458667-42.496-15.445334a338.773333 338.773333 0 0 0-58.026667-5.034666h-.213333C405.248 113.92 262.314667 271.189333 262.314667 464.469333v42.496a171.008 171.008 0 0 1-42.666667-27.904c-28.629333-26.026667-44.629333-60.586667-44.586667-97.28v-.042666c.853333-69.546667 60.373333-131.84 131.84-131.84 38.912 0 74.752 16.128 99.925334 42.24V143.402667c-42.453333-30.72-93.866667-44.501333-147.370667-38.912-63.573333 6.570667-119.466667 44.288-150.186667 101.461333a183.68 183.68 0 0 0-22.016 87.68v.426667c0 91.605333 67.925333 167.594667 156.330667 180.224a169.002667 169.002667 0 0 0 30.08 2.773333c79.786667 0 146.688-55.338667 164.693333-129.578667a633.514667 633.514667 0 0 0 4.693334 70.570667c3.754667 26.112 9.514667 51.712 17.066666 76.373333a173.525333 173.525333 0 0 1-44.8 27.52c-26.453333 11.008-55.04 16.896-84.48 16.938667h-.384c-57.685333-.042667-109.013333-21.589333-148.394666-56.874667a341.76 341.76 0 0 0 148.778666 56.832 343.893333 343.893333 0 0 0 78.634667 1.706667c118.101333-8.533333 225.024-71.808 291.84-171.52v167.253333c0 140.032-113.493333 253.696-253.44 254.08h-.64c-108.373333 0-200.661333-67.925333-237.568-163.370666 29.781333 129.962667 145.066667 227.370667 285.568 227.370666 161.024-.384 291.285333-130.986667 291.285333-292.010666V434.688c48.341333 34.133333 107.093333 54.186667 170.666667 54.186667z"
                    fill="currentColor"></path>
                </svg>
              </i>
            </a>
          </div>
        </div>

        <div class="footer-col">
          <h4 class="footer-title">平台导航</h4>
          <ul class="footer-links">
            <li><router-link to="/">首页</router-link></li>
            <li><router-link to="/forum">论坛</router-link></li>
            <li><router-link to="/music-rating">音乐评分</router-link></li>
            <li><router-link to="/labels">厂牌专区</router-link></li>
          </ul>
        </div>

        <div class="footer-col">
          <h4 class="footer-title">热门厂牌</h4>
          <ul class="footer-links">
            <li><router-link to="/labels/spinnin">Spinnin' Records</router-link></li>
            <li><router-link to="/labels/revealed">Revealed Recordings</router-link></li>
            <li><router-link to="/labels/protocol">Protocol Recordings</router-link></li>
            <li><router-link to="/labels/stmpd">STMPD RCRDS</router-link></li>
          </ul>
        </div>

        <div class="footer-col">
          <h4 class="footer-title">关于我们</h4>
          <ul class="footer-links">
            <li><a href="#">关于Acmetone</a></li>
            <li><a href="#">联系我们</a></li>
            <li><a href="#">用户协议</a></li>
            <li><a href="#">隐私政策</a></li>
          </ul>
        </div>
      </div>

      <div class="footer-bottom">
        <p class="copyright">© {{ currentYear }} Acmetone音乐交流平台. All Rights Reserved.</p>
      </div>
    </div>
  </footer>
</template>

<script setup>
import { computed } from 'vue'

const currentYear = computed(() => new Date().getFullYear())
</script>

<style lang="scss" scoped>
.app-footer {
  background-color: var(--acmetone-dark-gray);
  padding: 60px 0 30px;
  color: var(--acmetone-text-secondary);
}

.footer-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 30px;
  margin-bottom: 40px;
}

.footer-col {
  .footer-logo {
    display: flex;
    flex-direction: column;
    margin-bottom: 15px;

    .logo-text {
      font-size: 20px;
      font-weight: 800;
      letter-spacing: 2px;
      color: var(--acmetone-text);
    }

    .logo-sub {
      font-size: 12px;
      letter-spacing: 1px;
      color: var(--acmetone-white);
      text-transform: uppercase;
    }
  }

  .footer-desc {
    margin-bottom: 20px;
    line-height: 1.6;
  }
}

.social-links {
  display: flex;
  gap: 15px;

  .social-link {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background-color: var(--acmetone-gray);
    color: var(--acmetone-text-secondary);
    transition: var(--acmetone-transition);

    &:hover {
      background-color: var(--acmetone-white);
      color: var(--acmetone-black);
      transform: translateY(-3px);
    }
  }
}

.footer-title {
  color: var(--acmetone-text);
  font-size: 16px;
  margin-bottom: 20px;
  position: relative;
  padding-bottom: 10px;

  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    width: 30px;
    height: 2px;
    background-color: var(--acmetone-white);
  }
}

.footer-links {
  list-style: none;

  li {
    margin-bottom: 10px;

    a {
      color: var(--acmetone-text-secondary);
      transition: var(--acmetone-transition);

      &:hover {
        color: var(--acmetone-white);
        padding-left: 5px;
      }
    }
  }
}

.footer-bottom {
  padding-top: 30px;
  border-top: 1px solid var(--acmetone-border);
  text-align: center;

  .copyright {
    font-size: 14px;
  }
}

/* 响应式设计 */
@media (max-width: $breakpoint-lg) {
  .footer-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: $breakpoint-sm) {
  .app-footer {
    padding: 40px 0 20px;
  }

  .footer-grid {
    grid-template-columns: 1fr;
    gap: 30px;
  }
}
</style>