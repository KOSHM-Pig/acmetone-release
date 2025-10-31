# JavaScript代码混淆配置说明

## 概述

本项目集成了JavaScript代码混淆功能，用于保护前端代码不被轻易逆向工程。混淆器会在生产环境构建时自动运行。

## 安装依赖

```bash
npm install --save-dev javascript-obfuscator
```

## 构建命令

### 开发构建（无混淆）
```bash
npm run build:dev
```

### 标准生产构建（普通混淆）
```bash
npm run build
# 或
npm run build:obfuscated
```

### 高强度混淆构建
```bash
npm run build:high-obfuscated
```

## 混淆级别

### 1. 开发环境 (development)
- 不进行混淆或轻度混淆
- 保留可读性，便于调试
- 适用于开发和测试环境

### 2. 普通混淆 (normal)
- 平衡混淆强度和性能
- 适用于大多数生产环境
- 包含基础的代码保护

### 3. 高强度混淆 (high)
- 最强的混淆保护
- 可能影响运行性能
- 适用于敏感代码或高安全要求

## 配置文件

### obfuscator.config.js
包含不同环境和级别的混淆配置：
- `development`: 开发环境配置
- `production`: 生产环境配置
- `high`: 高强度混淆配置

### vite-obfuscator-plugin.js
Vite插件实现，负责在构建过程中执行混淆。

## 自定义配置

### 修改混淆级别
在 `vite.config.js` 中：
```javascript
obfuscatorPlugin({
  level: 'high' // 'normal' | 'high'
})
```

### 添加保留标识符
在 `obfuscator.config.js` 中的 `reservedNames` 数组添加：
```javascript
reservedNames: [
  'myCustomFunction',
  'MyClass',
  // ... 其他需要保留的标识符
]
```

### 添加保留字符串
在 `obfuscator.config.js` 中的 `reservedStrings` 数组添加：
```javascript
reservedStrings: [
  'my-custom-string',
  'api-endpoint',
  // ... 其他需要保留的字符串
]
```

### 排除文件
在 `vite-obfuscator-plugin.js` 中的 `exclude` 数组添加：
```javascript
exclude: [
  /node_modules/,
  /vendor/,
  /\.min\.js$/,
  /my-special-file\.js$/
]
```

## 注意事项

### 1. 性能影响
- 混淆会增加构建时间
- 高强度混淆可能影响运行时性能
- 建议在开发时使用无混淆构建

### 2. 调试困难
- 混淆后的代码难以调试
- 生产环境错误追踪会变得困难
- 建议配置source map（但会暴露源码）

### 3. 兼容性
- 某些第三方库可能不兼容混淆
- 动态代码执行（eval）可能受影响
- 需要测试混淆后的代码功能

### 4. 保留配置
- Vue、Element Plus等框架相关标识符已预配置保留
- API相关字符串已预配置保留
- 根据项目需要调整保留列表

## 故障排除

### 混淆后代码不工作
1. 检查控制台错误信息
2. 添加相关标识符到 `reservedNames`
3. 添加相关字符串到 `reservedStrings`
4. 降低混淆强度

### 构建失败
1. 检查是否有语法错误
2. 确认所有依赖已安装
3. 检查混淆配置是否正确

### 性能问题
1. 降低混淆强度
2. 减少混淆选项
3. 排除不需要混淆的文件

## 安全建议

1. **不要过度依赖前端混淆**：混淆只是增加逆向难度，不是绝对安全
2. **敏感逻辑放后端**：重要的业务逻辑应该在服务器端处理
3. **定期更新混淆配置**：避免使用固定的混淆模式
4. **结合其他安全措施**：如HTTPS、CSP、SRI等

## 示例

### 混淆前
```javascript
function calculatePrice(basePrice, discount) {
  const finalPrice = basePrice * (1 - discount);
  return finalPrice;
}
```

### 混淆后（示例）
```javascript
function _0x1a2b(_0x3c4d,_0x5e6f){const _0x7g8h=_0x3c4d*(0x1-_0x5e6f);return _0x7g8h;}
```

## 更多信息

- [javascript-obfuscator 官方文档](https://github.com/javascript-obfuscator/javascript-obfuscator)
- [Vite 插件开发指南](https://vitejs.dev/guide/api-plugin.html)
