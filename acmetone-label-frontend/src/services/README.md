# 认证服务架构文档

## 概述

acmetone-label-frontend 采用分布式微服务架构，认证服务直接连接到 acmetone-backend，而业务逻辑通过 acmetone-label-backend 处理。

## 架构图

```
acmetone-label-frontend
    ↓ (认证请求)
acmetone-backend (主后端)
    ↓ (业务请求)
acmetone-label-backend (厂牌后端)
```

## 服务分工

### 1. acmetone-backend (主后端)
- **职责**: 统一认证服务
- **端口**: 3000
- **功能**:
  - 用户登录/注册
  - Token验证和刷新
  - 用户权限管理
  - 密码重置

### 2. acmetone-label-backend (厂牌后端)
- **职责**: 厂牌业务逻辑
- **端口**: 3001
- **功能**:
  - 厂牌管理
  - 艺人管理
  - 专辑管理
  - 发行管理

### 3. acmetone-label-frontend (厂牌前端)
- **职责**: 用户界面
- **端口**: 5174
- **功能**:
  - 用户登录界面
  - 厂牌管理界面
  - 数据展示和交互

## 认证流程

### 登录流程
1. 用户在前端输入用户名和密码
2. 前端直接调用 `acmetone-backend` 的 `/api/auth/login` 接口
3. 后端验证用户凭据，返回 JWT token 和用户信息
4. 前端保存 token 到 localStorage 和 Pinia store
5. 后续业务请求携带 token 访问 `acmetone-label-backend`

### Token验证流程
1. 前端发起业务请求时，自动在请求头添加 `Authorization: Bearer <token>`
2. `acmetone-label-backend` 收到请求后，可以选择：
   - 本地验证 token (如果配置了相同的 JWT secret)
   - 代理到 `acmetone-backend` 验证 token
3. 验证通过后处理业务逻辑

## 文件结构

```
src/
├── services/
│   ├── AuthService.js          # 认证服务类
│   └── README.md              # 本文档
├── utils/
│   └── api.js                 # API客户端配置
├── stores/
│   └── authStore.js           # 认证状态管理
├── config/
│   └── api.js                 # API配置文件
└── views/
    └── Login.vue              # 登录页面
```

## 核心组件

### AuthService.js
认证服务的核心类，负责：
- 用户登录/注册
- Token验证和刷新
- 本地存储管理
- 错误处理

### authStore.js
Pinia状态管理，负责：
- 用户状态管理
- Token状态管理
- 认证状态计算
- 权限检查

### api.js
API客户端配置，包含：
- `authApi`: 连接到 acmetone-backend
- `api`: 连接到 acmetone-label-backend
- 请求/响应拦截器
- 错误处理

## 使用示例

### 在组件中使用认证
```javascript
import { useAuthStore } from '@/stores/authStore'
import { AuthService } from '@/services/AuthService'

// 使用 store 进行登录
const authStore = useAuthStore()
const result = await authStore.login({ username, password })

// 直接使用 service
const result = await AuthService.login({ username, password })

// 检查认证状态
if (authStore.isAuthenticated) {
  // 用户已登录
}

// 获取当前用户
const user = authStore.user
```

### API请求示例
```javascript
import { authApi } from '@/utils/api'

// 认证相关请求 (连接到 acmetone-backend)
const loginResult = await authApi.post('/auth/login', credentials)
const verifyResult = await authApi.get('/auth/validate')

// 业务相关请求 (连接到 acmetone-label-backend)
import api from '@/utils/api'
const labelsResult = await api.get('/api/labels')
```

## 配置说明

### 开发环境
- acmetone-backend: `http://localhost:3000`
- acmetone-label-backend: `http://localhost:3001`
- acmetone-label-frontend: `http://localhost:5174`

### 生产环境
- acmetone-backend: `https://api.acmetone.com`
- acmetone-label-backend: `https://label-api.acmetone.com`
- acmetone-label-frontend: `https://label.acmetone.com`

## 安全考虑

1. **Token存储**: JWT token 存储在 localStorage，生产环境建议考虑 httpOnly cookie
2. **HTTPS**: 生产环境必须使用 HTTPS
3. **CORS**: 后端正确配置 CORS 策略
4. **Token过期**: 实现自动刷新机制
5. **错误处理**: 不暴露敏感信息

## 故障排除

### 常见问题
1. **CORS错误**: 检查后端 CORS 配置
2. **Token无效**: 检查 JWT secret 配置
3. **网络错误**: 检查服务端口和防火墙
4. **权限错误**: 检查用户角色和权限配置

### 调试技巧
1. 开启浏览器开发者工具的网络面板
2. 查看控制台日志输出
3. 检查 localStorage 中的 token
4. 使用 Postman 测试 API 端点
