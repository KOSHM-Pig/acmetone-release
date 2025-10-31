# Acmetone 音乐发行平台

Acmetone是一个专业的音乐专辑发行管理平台，帮助音乐人按照规范格式准备和提交音乐作品，实现从创作到发行的全流程管理。平台提供专辑和歌曲管理、艺人信息维护、审核流程和格式检查等功能，确保音乐作品符合发行标准。

## 项目架构

本项目采用前后端分离架构：

- **前端**：基于Vue 3 + Vite构建的单页面应用
- **后端**：基于Express + Sequelize的REST API服务
- **数据库**：MySQL关系型数据库

## 核心功能

### 用户系统
- 用户注册与登录认证
- 基于JWT的身份验证
- 用户角色权限管理（普通用户/管理员）

### 专辑管理
- 专辑创建与元数据编辑
- 专辑封面上传与验证
- 专辑状态管理（草稿/待审核/已通过/已拒绝）
- 专辑审核流程，包含拒绝理由显示

### 歌曲管理
- WAV格式音频文件上传与处理
- 歌曲元数据编辑
- 歌手信息关联
- 音频预览功能

### 艺人信息管理
- 艺人信息库维护
- 艺人信息修改申请与审核
- 多平台音乐链接管理与验证
- 卡片式与列表式双视图模式

### 格式检查
- 音频文件格式验证
- 封面图片规格检查
- 平台链接格式验证
- 发行规则合规性检查

## 技术栈详情

### 前端

- **核心框架**：Vue 3.x（组合式API）
- **构建工具**：Vite
- **路由管理**：Vue Router 4.x
- **状态管理**：Pinia
- **UI组件库**：Element Plus
- **HTTP客户端**：Axios
- **样式处理**：SCSS/CSS

### 后端

- **服务框架**：Express.js
- **ORM**：Sequelize
- **数据库**：MySQL 8+
- **认证**：JWT (JSON Web Token)
- **文件处理**：Multer
- **API文档**：Swagger/OpenAPI
- **日志**：Winston

## 数据模型

系统包含以下核心数据模型及其关系：

- **User**：用户信息，包含普通用户与管理员角色
  - 字段：id, username, email, password, role, createdAt, updatedAt

- **Album**：专辑信息
  - 字段：id, title, type, releaseDate, coverImage, displayInfo, description, status, comment, submittedById, createdAt, updatedAt
  - 关系：belongsTo User, hasMany Song

- **Song**：歌曲元数据
  - 字段：id, title, genre, language, wavFile, duration, trackNumber, albumId, createdAt, updatedAt
  - 关系：belongsTo Album, belongsToMany Artist

- **Artist**：艺人信息
  - 字段：id, name, realName, netease, qq, kugou, kuwo, qishui, spotify, youtube, appleMusic, soundCloud, createdAt, updatedAt
  - 关系：belongsToMany Song

- **ArtistEditRequest**：艺人信息修改请求
  - 字段：id, artistId, requestedById, songId, status, comment, reason, newName, newRealName, newNetease, newQq, newKugou, newKuwo, newQishui, newSpotify, newYoutube, newAppleMusic, newSoundCloud, createdAt, updatedAt
  - 关系：belongsTo Artist, belongsTo User, belongsTo Song

## 功能亮点

### 1. 双视图艺人信息库
- 卡片视图：美观直观的艺人信息展示
- 列表视图：高效的信息浏览与管理
- 支持按艺人名称搜索过滤

### 2. 智能链接验证
- 支持多种音乐平台链接格式验证
- 实时反馈链接有效性
- 提供格式错误提示和示例

### 3. 完整审核流程
- 专辑从草稿到发行的全流程管理
- 管理员审核界面，支持批量处理
- 拒绝理由反馈机制

### 4. 歌手信息修改申请
- 用户可提交歌手信息修改申请
- 管理员审核机制
- 变更历史追踪

## 开发环境配置

### 前端开发

```bash
# 克隆仓库
git clone <repository-url>

# 进入前端目录
cd acmetone-frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

### 后端开发

```bash
# 进入后端目录
cd acmetone-backend

# 安装依赖
npm install

# 配置数据库
# 编辑 src/config/db.js 文件，设置数据库连接参数

# 运行数据库迁移
npx sequelize-cli db:migrate

# 启动开发服务器
npm run dev
```

## 生产环境部署

### 前端构建

```bash
cd acmetone-frontend
npm run build

# 构建产物将生成在 dist 目录中
# 可以将其部署到任何静态文件服务器
```

### 后端部署

```bash
cd acmetone-backend

# 设置环境变量
export NODE_ENV=production
export DB_HOST=your_db_host
export DB_USER=your_db_user
export DB_PASS=your_db_password
export DB_NAME=your_db_name
export JWT_SECRET=your_jwt_secret

# 启动服务
npm start

# 或使用PM2进行进程管理
pm2 start src/app.js --name acmetone-api
```

## 系统要求

- Node.js 16+
- MySQL 8+
- 现代浏览器支持（Chrome, Firefox, Safari, Edge）
- 至少 2GB RAM 和 1GB 存储空间（用于音频文件存储）

## 发行规则

本系统基于严格的音乐发行规则，详细规范见 `Release_Rule.md` 文件，主要包括：

- **文件结构规范**：专辑和歌曲的目录组织方式
- **音频文件要求**：WAV格式，至少16位深度，44.1KHz采样率
- **歌词文件规范**：LRC格式，多语言支持
- **封面图片规范**：JPG格式，3000x3000像素，内容合规性要求
- **艺人信息格式**：平台链接格式，实名与艺名规范

## 常见问题解决

### 数据库连接问题
如遇数据库连接错误，请检查：
1. 数据库服务是否运行
2. 连接参数是否正确
3. 用户权限是否配置

### 文件上传失败
如遇文件上传问题，请检查：
1. 上传目录权限
2. 文件大小限制配置
3. 文件格式是否符合要求

### 平台链接验证失败
如遇链接验证失败，请参考各平台的标准链接格式：
- 网易云音乐: https://music.163.com/#/artist?id=12345
- QQ音乐: https://y.qq.com/n/ryqq/singer/002J4UUk29y8BY
- 更多格式参见代码中的验证规则

## 贡献指南

欢迎贡献代码或提出建议，请遵循以下步骤：

1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建Pull Request

## 许可证

本项目采用 MIT 许可证 - 详情见 LICENSE 文件

# Acmetone 图片上传优化

## 问题修复

我们对Acmetone网站的图片上传逻辑进行了以下优化：

### 前端优化

1. **统一使用Base64上传方式**：
   - 移除FormData上传方式
   - 直接使用Base64方式上传图片
   - 改进错误处理和重试机制

2. **移除图片压缩**：
   - 按照要求移除了图片压缩代码
   - 直接使用原始图片上传

### 后端优化

1. **增强Base64上传支持**：
   - 优化Base64图片上传处理
   - 添加数据验证和错误处理
   - 支持处理带Data URL前缀的Base64数据
   - 使用异步文件写入提高性能

2. **临时文件管理**：
   - 添加自动清理临时文件的功能
   - 配置express-fileupload中间件自动清理临时文件
   - 创建定期清理脚本

## 定期清理脚本

我们添加了以下清理脚本：

1. **临时文件清理**：
   - 清理超过1小时未使用的临时文件
   - 可以通过`node acmetone-backend/src/scripts/cleanup-schedule.js`手动执行
   - 建议添加到crontab定期执行

2. **分片文件清理**：
   - 清理超过24小时的未完成分片上传
   - 防止磁盘空间被大量分片文件占满

3. **MP3缓存清理**：
   - 清理超过7天的MP3缓存文件
   - 优化磁盘空间使用

## 手动清理命令

如需立即清理临时文件，可以运行：

```bash
node acmetone-backend/src/scripts/cleanup-temp.js
```

如需全面清理（临时文件、分片文件和MP3缓存），可以运行：

```bash
node acmetone-backend/src/scripts/cleanup-schedule.js
``` 