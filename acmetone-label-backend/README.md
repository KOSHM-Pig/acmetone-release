# Acmetone Label Backend

Acmetone标签管理系统的后端服务，采用微服务架构设计。

## 项目概述

这是一个专门为标签管理功能设计的后端微服务，与主后端服务(acmetone-backend)协同工作。认证和用户管理功能通过代理方式访问主后端服务，实现分布式架构下的统一认证。

## 功能特性

- 🔐 **统一认证**: 通过代理方式使用主后端的认证服务
- 🏷️ **标签管理**: 提供完整的标签CRUD操作API
- 🛡️ **安全防护**: 集成Helmet、速率限制等安全中间件
- 🔍 **健康检查**: 提供服务健康状态监控
- 🚀 **微服务架构**: 独立部署，易于扩展

## 技术栈

- **Node.js** + **Express.js**: 后端框架
- **JWT**: 身份认证
- **Axios**: HTTP客户端 (用于与主后端通信)
- **Helmet**: 安全中间件
- **CORS**: 跨域资源共享
- **Express Rate Limit**: 速率限制

## 快速开始

### 1. 安装依赖

```bash
cd acmetone-label-backend
npm install
```

### 2. 环境配置

复制环境变量模板并配置：

```bash
cp .env.example .env
```

编辑 `.env` 文件，配置以下关键参数：

```env
PORT=3002
MAIN_BACKEND_URL=http://localhost:3000
JWT_SECRET=your-jwt-secret-key
NODE_ENV=development
```

### 3. 启动服务

开发模式：
```bash
npm run dev
```

生产模式：
```bash
npm start
```

服务将在 `http://localhost:3002` 启动。

## API 文档

### 健康检查

- `GET /api/health` - 基础健康检查
- `GET /api/health/detailed` - 详细健康检查（包括依赖服务状态）

### 认证相关 (代理到主后端)

- `POST /api/auth/login` - 用户登录
- `POST /api/auth/register` - 用户注册
- `GET /api/auth/verify` - 验证token
- `POST /api/auth/refresh` - 刷新token
- `POST /api/auth/logout` - 用户登出
- `GET /api/auth/me` - 获取当前用户信息

### 标签管理 (需要认证)

- `GET /api/labels` - 获取标签列表
- `GET /api/labels/:id` - 获取单个标签详情
- `POST /api/labels` - 创建新标签
- `PUT /api/labels/:id` - 更新标签
- `DELETE /api/labels/:id` - 删除标签

## 架构设计

### 微服务架构

```
┌─────────────────────┐    ┌─────────────────────┐
│  acmetone-frontend  │    │ acmetone-label-     │
│                     │    │ frontend            │
└─────────┬───────────┘    └─────────┬───────────┘
          │                          │
          │                          │
          ▼                          ▼
┌─────────────────────┐    ┌─────────────────────┐
│  acmetone-backend   │◄───┤ acmetone-label-     │
│  (主后端服务)        │    │ backend             │
│  - 用户认证          │    │ (标签管理微服务)     │
│  - 核心业务逻辑      │    │ - 标签CRUD          │
│  - 数据库管理        │    │ - 认证代理          │
└─────────────────────┘    └─────────────────────┘
```

### 认证流程

1. 前端发送登录请求到 `acmetone-label-backend`
2. `acmetone-label-backend` 代理请求到 `acmetone-backend`
3. `acmetone-backend` 验证用户凭据并返回JWT token
4. 后续API请求携带token，由认证中间件验证

## 开发指南

### 添加新的API路由

1. 在 `src/routes/` 目录下创建新的路由文件
2. 在 `src/app.js` 中注册路由
3. 如需认证，使用 `authMiddleware` 中间件

### 扩展标签管理功能

当前标签管理路由提供了基础的CRUD操作框架，可以根据业务需求进行扩展：

- 添加数据库模型
- 实现具体的业务逻辑
- 添加数据验证
- 集成文件上传等功能

## 部署说明

### Docker部署 (推荐)

```dockerfile
# Dockerfile示例
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3002
CMD ["npm", "start"]
```

### 环境变量配置

生产环境需要配置以下环境变量：

- `PORT`: 服务端口
- `NODE_ENV`: 环境模式 (production)
- `MAIN_BACKEND_URL`: 主后端服务地址
- `JWT_SECRET`: JWT密钥

## 监控和日志

- 健康检查端点：`/api/health/detailed`
- 日志级别通过 `LOG_LEVEL` 环境变量控制
- 建议集成APM工具进行性能监控

## 贡献指南

1. Fork 项目
2. 创建功能分支
3. 提交更改
4. 推送到分支
5. 创建 Pull Request

## 许可证

ISC License
