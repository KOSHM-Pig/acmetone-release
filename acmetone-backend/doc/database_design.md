# 极音记发行系统数据库设计

## 用户模型 (User)

存储系统用户信息，包括普通用户和管理员。

| 字段 | 类型 | 约束 | 描述 |
|------|------|------|------|
| id | INTEGER | PK, AUTO_INCREMENT | 用户ID |
| username | STRING | NOT NULL, UNIQUE | 用户名 |
| email | STRING | NOT NULL, UNIQUE | 邮箱地址 |
| password | STRING | NOT NULL | 加密密码 |
| role | ENUM('user', 'admin') | NOT NULL, DEFAULT 'user' | 用户角色 |
| createdAt | DATE | NOT NULL | 创建时间 |
| updatedAt | DATE | NOT NULL | 更新时间 |

## 艺人模型 (Artist)

存储歌手/艺人信息。

| 字段 | 类型 | 约束 | 描述 |
|------|------|------|------|
| id | INTEGER | PK, AUTO_INCREMENT | 艺人ID |
| name | STRING | NOT NULL | 艺名 |
| realName | STRING | | 真实姓名 |
| netease | STRING | | 网易云音乐链接 |
| qq | STRING | | QQ音乐链接 |
| kugou | STRING | | 酷狗音乐链接 |
| kuwo | STRING | | 酷我音乐链接 |
| qishui | STRING | | 汽水音乐链接 |
| spotify | STRING | | Spotify链接 |
| youtube | STRING | | YouTube链接 |
| appleMusic | STRING | | Apple Music链接 |
| soundCloud | STRING | | SoundCloud链接 |
| createdAt | DATE | NOT NULL | 创建时间 |
| updatedAt | DATE | NOT NULL | 更新时间 |

## 专辑模型 (Album)

存储专辑信息。

| 字段 | 类型 | 约束 | 描述 |
|------|------|------|------|
| id | INTEGER | PK, AUTO_INCREMENT | 专辑ID |
| title | STRING | NOT NULL | 专辑标题 |
| coverImage | STRING | NOT NULL | 专辑封面路径 |
| type | STRING | NOT NULL | 专辑类型 |
| releaseDate | DATE | NOT NULL | 发行日期 |
| displayInfo | STRING | NOT NULL | 发行外显信息 |
| description | TEXT | NOT NULL | 专辑描述 |
| status | ENUM('pending', 'approved', 'rejected') | NOT NULL, DEFAULT 'pending' | 专辑状态 |
| comment | STRING | | 审核评论 |
| submittedById | INTEGER | FK | 提交用户ID |
| createdAt | DATE | NOT NULL | 创建时间 |
| updatedAt | DATE | NOT NULL | 更新时间 |

## 歌曲模型 (Song)

存储歌曲信息。

| 字段 | 类型 | 约束 | 描述 |
|------|------|------|------|
| id | INTEGER | PK, AUTO_INCREMENT | 歌曲ID |
| title | STRING | NOT NULL | 歌曲标题 |
| wavFile | STRING | NOT NULL | WAV文件路径 |
| genre | STRING | NOT NULL | 歌曲风格 |
| language | STRING | NOT NULL | 歌曲语言 |
| duration | INTEGER | | 歌曲时长(秒) |
| trackNumber | INTEGER | NOT NULL, DEFAULT 1 | 专辑中的曲目序号 |
| albumId | INTEGER | FK, NOT NULL | 所属专辑ID |
| isrc | STRING(12) | | ISRC国际标准录音制品代码，12位字符格式 |
| createdAt | DATE | NOT NULL | 创建时间 |
| updatedAt | DATE | NOT NULL | 更新时间 |

## 艺人编辑请求模型 (ArtistEditRequest)

存储艺人信息编辑请求。

| 字段 | 类型 | 约束 | 描述 |
|------|------|------|------|
| id | INTEGER | PK, AUTO_INCREMENT | 请求ID |
| status | ENUM('pending', 'approved', 'rejected') | NOT NULL, DEFAULT 'pending' | 请求状态 |
| comment | STRING | | 审核评论 |
| newName | STRING | | 新艺名 |
| newRealName | STRING | | 新真实姓名 |
| newNetease | STRING | | 新网易云音乐链接 |
| newQq | STRING | | 新QQ音乐链接 |
| newKugou | STRING | | 新酷狗音乐链接 |
| newKuwo | STRING | | 新酷我音乐链接 |
| newQishui | STRING | | 新汽水音乐链接 |
| newSpotify | STRING | | 新Spotify链接 |
| newYoutube | STRING | | 新YouTube链接 |
| newAppleMusic | STRING | | 新Apple Music链接 |
| newSoundCloud | STRING | | 新SoundCloud链接 |
| artistId | INTEGER | FK | 对应艺人ID |
| songId | INTEGER | FK | 对应歌曲ID |
| requestedById | INTEGER | FK | 请求提交用户ID |
| createdAt | DATE | NOT NULL | 创建时间 |
| updatedAt | DATE | NOT NULL | 更新时间 |

## 关联表 (SongArtists)

关联歌曲和艺人的多对多关系表。

| 字段 | 类型 | 约束 | 描述 |
|------|------|------|------|
| SongId | INTEGER | PK, FK | 歌曲ID |
| ArtistId | INTEGER | PK, FK | 艺人ID |
| createdAt | DATE | NOT NULL | 创建时间 |
| updatedAt | DATE | NOT NULL | 更新时间 |

## 关联关系

1. **用户与专辑**：一对多，一个用户可以创建多个专辑
   - `User.hasMany(Album, { foreignKey: 'submittedById' })`
   - `Album.belongsTo(User, { as: 'submittedBy', foreignKey: 'submittedById' })`

2. **专辑与歌曲**：一对多，一个专辑可以包含多首歌曲
   - `Album.hasMany(Song, { onDelete: 'CASCADE' })`
   - `Song.belongsTo(Album)`

3. **歌曲与艺人**：多对多，一首歌曲可以有多位艺人，一位艺人可以演唱多首歌曲
   - `Song.belongsToMany(Artist, { through: 'SongArtists', as: 'Artists' })`
   - `Artist.belongsToMany(Song, { through: 'SongArtists', as: 'Songs' })`

4. **用户与艺人编辑请求**：一对多，一个用户可以提交多个编辑请求
   - `ArtistEditRequest.belongsTo(User, { as: 'requestedBy', foreignKey: 'requestedById' })`

5. **艺人编辑请求与歌曲**：多对一，多个编辑请求可以关联到同一首歌曲
   - `ArtistEditRequest.belongsTo(Song)`

6. **艺人编辑请求与艺人**：多对一，多个编辑请求可以关联到同一位艺人
   - `ArtistEditRequest.belongsTo(Artist)`

## 业务逻辑处理

1. **草稿模式实现**：专辑初始创建时，在comment字段添加`DRAFT:`前缀，表示处于草稿状态。
   - API返回时添加`isDraft`和`virtualStatus`属性，用于前端显示。
   - 提交审核时，移除comment字段中的`DRAFT:`前缀。

2. **权限控制**：
   - 普通用户只能查看/编辑自己创建的专辑
   - 管理员可以查看/审核所有用户的专辑
   - 普通用户只能查看与自己上传专辑关联的艺人信息

3. **数据完整性**：
   - 删除专辑时级联删除关联的歌曲
   - 保持歌曲与艺人的关联关系
   - 确保专辑状态变更符合工作流规则 