import JavaScriptObfuscator from 'javascript-obfuscator';
import { getObfuscatorConfig } from './obfuscator.config.js';

export function obfuscatorPlugin(options = {}) {
  // 获取环境和混淆级别
  const env = process.env.NODE_ENV || 'development';
  const level = options.level || process.env.OBFUSCATE_LEVEL || 'normal';

  // 从配置文件获取基础配置
  const baseConfig = getObfuscatorConfig(env, level);

  const defaultOptions = {
    ...baseConfig,

    // 排除某些文件不混淆
    exclude: [
      /node_modules/,
      /vendor/,
      /\.min\.js$/,
      /config\.js$/,
      /\.es\.js$/,
      /\.esm\.js$/,
      /\.umd\.js$/
    ],

    // 文件大小限制（字节）
    maxFileSize: 1024 * 1024 * 2, // 2MB

    // 超时设置（毫秒）
    timeout: 30000 // 30秒
  };

  const finalOptions = { ...defaultOptions, ...options };

  return {
    name: 'vite-obfuscator',
    apply: 'build', // 只在构建时应用
    generateBundle(_, bundle) {
      // 只在生产环境混淆
      if (process.env.NODE_ENV !== 'production') {
        return;
      }

      Object.keys(bundle).forEach(fileName => {
        const chunk = bundle[fileName];

        // 只处理JS文件
        if (chunk.type === 'chunk' && fileName.endsWith('.js')) {
          try {
            // 检查文件是否应该被排除
            const shouldExclude = finalOptions.exclude?.some(pattern => {
              if (pattern instanceof RegExp) {
                return pattern.test(fileName);
              }
              return fileName.includes(pattern);
            });

            if (shouldExclude) {
              console.log(`跳过混淆文件: ${fileName} (已排除)`);
              return;
            }

            // 检查文件大小
            const fileSize = Buffer.byteLength(chunk.code, 'utf8');
            if (finalOptions.maxFileSize && fileSize > finalOptions.maxFileSize) {
              console.log(`跳过混淆文件: ${fileName} (文件过大: ${(fileSize / 1024 / 1024).toFixed(2)}MB)`);
              return;
            }

            console.log(`正在混淆文件: ${fileName} (${(fileSize / 1024).toFixed(2)}KB)`);

            // 执行混淆（同步方式）
            const obfuscationResult = JavaScriptObfuscator.obfuscate(
              chunk.code,
              finalOptions
            );

            // 替换原始代码
            chunk.code = obfuscationResult.getObfuscatedCode();
            console.log(`文件混淆完成: ${fileName}`);

          } catch (error) {
            console.warn(`混淆文件失败 ${fileName}:`, error.message);
          }
        }
      });
    }
  };
}
