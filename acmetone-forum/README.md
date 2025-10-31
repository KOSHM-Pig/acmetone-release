# Acmetone 音乐交流平台

基于Vue 3和Element Plus构建的电子音乐交流平台前端项目，风格采用Martin Garrix主题的黑色设计。

## 功能特点

- **滚动Banner广告位**：展示平台重要活动和广告
- **随机音乐评分系统**：用户可以发现新音乐并进行评分和评论
- **厂牌专区**：展示各大电子音乐厂牌信息
- **论坛交流**：用户可以发帖讨论电子音乐相关话题
- **近期活动展示**：推广即将举行的电子音乐活动和音乐节

## 技术栈

- **Vue 3**：前端框架
- **Vue Router**：路由管理
- **Pinia**：状态管理
- **Element Plus**：UI组件库
- **SASS/SCSS**：CSS预处理器
- **Vite**：构建工具

## 运行项目

### 环境要求

- Node.js >= 16.0.0
- npm >= 8.0.0

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

### 构建生产版本

```bash
npm run build
```

### 预览生产版本

```bash
npm run preview
```

## 项目结构（示例）

```
acmetone-forum/
├── public/                # 1. 静态资源，直接提供给浏览器，不经Vite处理
│   ├── favicon.ico
│   └── images/            # 例如：logo.png (如果直接在index.html中引用)
├── src/
│   ├── api/               # 2. 集中处理后端API请求的模块（替代旧的services/）
│   │   ├── auth.js        # 例如：用户认证相关的API
│   │   ├── forum.js       # 例如：论坛帖子相关的API
│   │   └── index.js       # 导出所有API模块
│   ├── assets/            # 3. 项目资源文件，会被Vite处理和优化 (如图片、字体)
│   │   ├── fonts/
│   │   ├── images/        # 组件或页面中引用的图片
│   │   └── svg-icons/     # SVG图标 (可以作为组件导入或CSS background)
│   ├── components/        # 4. 可复用的UI组件 (独立于具体业务)
│   │   ├── common/        # 通用UI组件，如按钮、输入框、加载动画
│   │   │   ├── Button.vue
│   │   │   └── LoadingSpinner.vue
│   │   ├── global/        # 只在App.vue中注册一次的全局组件（例如：Header, Footer）
│   │   │   ├── AppFooter.vue
│   │   │   └── AppHeader.vue
│   │   ├── layouts/       # 布局组件（例如：标准布局、带侧边栏布局）
│   │   │   └── MainLayout.vue
│   │   └── domain/        # 领域特定但可复用的业务组件（例如：用户卡片，产品列表项）
│   │       ├── UserCard.vue
│   │       ├── MusicPlayer.vue
│   │       └── LabelCard.vue (你的 LabelCard.vue 可以放这里)
│   ├── composables/       # 5. 可复用的逻辑（Vue 3 组合式 API 函数）
│   │   ├── useAuth.js     # 例如：认证逻辑（登录、注册等）
│   │   ├── useFormValidation.js # 表单验证逻辑
│   │   └── useDebounce.js # 防抖函数
│   ├── constants/         # 6. 全局常量、枚举等
│   │   ├── api.js         # API 相关的常量
│   │   └── statusCodes.js # 状态码
│   ├── router/            # 7. 路由配置
│   │   └── index.js       # 主路由文件
│   │   └── routes/        # 存放按模块划分的路由文件（可选，项目大了用）
│   │       ├── forum.js
│   │       └── music.js
│   ├── stores/            # 8. Pinia 状态管理模块
│   │   ├── auth.js        # 用户认证商店
│   │   ├── forum.js       # 论坛相关商店
│   │   └── index.js       # 导出所有商店
│   ├── styles/            # 9. 全局样式和工具样式
│   │   ├── base/          # 基础样式（reset, typography）
│   │   ├── mixins/        # SCSS 混入
│   │   ├── variables/     # SCSS 变量
│   │   ├── utilities/     # 工具类（例如：.text-center, .margin-top-md）
│   │   └── main.scss      # 全局样式入口
│   ├── utils/             # 10. 通用工具函数（不依赖Vue API）
│   │   ├── date.js        # 日期格式化
│   │   └── helpers.js     # 其他辅助函数
│   ├── views/             # 11. 页面级视图组件（通常直接由路由映射）
│   │   ├── Home.vue
│   │   ├── NotFound.vue
│   │   ├── auth/          # 认证相关页面
│   │   │   ├── LoginPage.vue
│   │   │   └── RegisterPage.vue
│   │   ├── forum/         # 论坛相关页面
│   │   │   ├── ForumListPage.vue  (你的 ForumList.vue)
│   │   │   └── TopicDetailPage.vue (你的 TopicDetail.vue)
│   │   ├── labels/        # 厂牌相关页面
│   │   │   ├── LabelDetailPage.vue (你的 LabelDetail.vue)
│   │   │   └── LabelsListPage.vue  (你的 LabelsList.vue)
│   │   └── music/         # 音乐相关页面
│   │       ├── MusicListPage.vue   (你的 MusicList.vue)
│   │       └── MusicRatingPage.vue (你的 MusicRating.vue)
│   ├── App.vue            # 12. 根组件，定义应用整体布局和路由出口
│   └── main.js            # 13. 应用入口文件，Vue 应用的创建和配置
├── index.html             # HTML 模板文件
├── package.json           # 项目依赖和脚本配置
└── vite.config.js         # Vite 构建工具配置
```

## 设计主题

项目使用Martin Garrix风格的黑色主题设计，主要色彩为：

- 主色：#00c8ff（蓝色）
- 辅助色：#ff00a8（粉色）
- 背景色：#000000（黑色）
- 文本色：#ffffff（白色）

## 开发计划

- [x] 项目基础结构搭建
- [x] 主题设计和样式实现
- [x] 首页布局和组件
- [ ] 论坛模块开发
- [ ] 音乐评分模块完善
- [ ] 厂牌专区详情页
- [ ] 用户认证功能
- [ ] 后端API集成
