// JavaScript混淆器配置文件
export const obfuscatorConfig = {
  // 开发环境配置（轻度混淆，便于调试）
  development: {
    compact: false,
    controlFlowFlattening: false,
    deadCodeInjection: false,
    debugProtection: false,
    disableConsoleOutput: false,
    identifierNamesGenerator: 'mangled',
    log: true,
    renameGlobals: false,
    selfDefending: false,
    stringArray: false,
    transformObjectKeys: false,
    unicodeEscapeSequence: false
  },

  // 生产环境配置（轻度混淆，避免栈溢出）
  production: {
    // 基础设置
    compact: true,
    log: false,

    // 控制流混淆 - 降低强度
    controlFlowFlattening: false,
    controlFlowFlatteningThreshold: 0.3,

    // 死代码注入 - 降低强度
    deadCodeInjection: false,
    deadCodeInjectionThreshold: 0.2,

    // 调试保护 - 保持轻度
    debugProtection: false,
    debugProtectionInterval: 0,

    // 控制台输出
    disableConsoleOutput: true,

    // 标识符生成 - 使用简单模式
    identifierNamesGenerator: 'mangled',

    // 数字转表达式 - 关闭
    numbersToExpressions: false,

    // 全局变量重命名
    renameGlobals: false,

    // 自我防护 - 关闭
    selfDefending: false,

    // 代码简化 - 关闭
    simplify: false,

    // 字符串分割 - 关闭
    splitStrings: false,
    splitStringsChunkLength: 10,

    // 字符串数组 - 简化配置
    stringArray: true,
    stringArrayCallsTransform: false,
    stringArrayEncoding: [],
    stringArrayIndexShift: false,
    stringArrayRotate: false,
    stringArrayShuffle: false,
    stringArrayWrappersCount: 1,
    stringArrayWrappersChainedCalls: false,
    stringArrayWrappersParametersMaxCount: 2,
    stringArrayWrappersType: 'variable',
    stringArrayThreshold: 0.5,

    // 对象键转换 - 关闭
    transformObjectKeys: false,

    // Unicode转义
    unicodeEscapeSequence: false,
    
    // 保留的标识符（不被混淆）
    reservedNames: [
      // Vue相关
      'Vue',
      'VueRouter',
      'createApp',
      'createRouter',
      'createWebHistory',
      
      // 状态管理
      'Pinia',
      'createPinia',
      'defineStore',
      'useStore',
      
      // UI库
      'ElementPlus',
      'ElMessage',
      'ElMessageBox',
      'ElNotification',
      
      // HTTP库
      'axios',
      'fetch',
      
      // 工具库
      'dayjs',
      'lodash',
      '_',
      
      // 浏览器API
      'localStorage',
      'sessionStorage',
      'console',
      'window',
      'document',
      'navigator',
      
      // 自定义保留
      'acmetone',
      'garrix'
    ],
    
    // 保留的字符串（不被混淆）
    reservedStrings: [
      // API相关
      'api',
      'token',
      'authorization',
      'content-type',
      'application/json',
      
      // 路由相关
      'router',
      'route',
      'path',
      'query',
      'params',
      
      // 存储相关
      'store',
      'state',
      'getters',
      'mutations',
      'actions',
      
      // 事件相关
      'click',
      'change',
      'input',
      'submit',
      'load',
      
      // CSS类名前缀
      'acmetone-',
      'garrix-',
      'el-'
    ]
  },

  // 高强度混淆配置（用于敏感代码，但避免栈溢出）
  high: {
    compact: true,
    controlFlowFlattening: false,
    controlFlowFlatteningThreshold: 0.5,
    deadCodeInjection: false,
    deadCodeInjectionThreshold: 0.3,
    debugProtection: true,
    debugProtectionInterval: 2000,
    disableConsoleOutput: true,
    domainLock: [], // 可以设置域名锁定
    identifierNamesGenerator: 'hexadecimal',
    log: false,
    numbersToExpressions: false,
    renameGlobals: false,
    selfDefending: false,
    simplify: false,
    splitStrings: false,
    splitStringsChunkLength: 10,
    stringArray: true,
    stringArrayCallsTransform: false,
    stringArrayEncoding: ['base64'],
    stringArrayIndexShift: true,
    stringArrayRotate: false,
    stringArrayShuffle: false,
    stringArrayWrappersCount: 1,
    stringArrayWrappersChainedCalls: false,
    stringArrayWrappersParametersMaxCount: 2,
    stringArrayWrappersType: 'variable',
    stringArrayThreshold: 0.7,
    transformObjectKeys: false,
    unicodeEscapeSequence: false
  }
};

// 根据环境获取配置
export function getObfuscatorConfig(env = 'production', level = 'normal') {
  if (env === 'development') {
    return obfuscatorConfig.development;
  }
  
  if (level === 'high') {
    return obfuscatorConfig.high;
  }
  
  return obfuscatorConfig.production;
}
