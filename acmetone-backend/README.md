## 艺术家Wiki功能

### 功能说明

艺术家Wiki功能允许用户浏览和管理艺术家详细信息，包括：

- 艺术家基本信息（艺名、实名、地区、类型等）
- 艺术家介绍
- 艺术家头像
- 平台链接（网易云音乐、QQ音乐等）
- 艺术家别名

### API路径

- `GET /api/artist-wiki/list` - 获取艺术家Wiki列表
- `GET /api/artist-wiki/:id` - 获取艺术家详情
- `POST /api/artist-wiki` - 创建新艺术家
- `PUT /api/artist-wiki/:id` - 更新艺术家信息
- `GET /api/artist-wiki/fetch-netease-info` - 获取网易云音乐艺术家信息
- `POST /api/artist-wiki/fetch-artist-info` - 管理员一键获取艺术家信息

### 数据库迁移

在使用艺术家Wiki功能前，需要执行数据库迁移，添加必要的字段：

```bash
node run-artist-wiki-migration.js
```

或使用`--force`参数强制执行：

```bash
node run-artist-wiki-migration.js --force
```

### 新增字段

- `description` - 艺人介绍
- `avatar` - 艺人头像文件路径
- `avatarThumbnail` - 艺人头像缩略图文件路径
- `region` - 艺人所在地区
- `artistType` - 艺人类型
- `alias` - 艺人别名（JSON格式数组）

### 网易云音乐信息获取

系统支持通过网易云音乐链接自动获取艺术家信息，包括简介、别名等。管理员可以使用"一键获取信息"功能，从网易云音乐API获取艺术家详情并填充到数据库中。 