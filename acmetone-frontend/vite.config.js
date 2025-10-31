import vue from '@vitejs/plugin-vue'
import path from 'path'
import { defineConfig } from 'vite'
import { obfuscatorPlugin } from './vite-obfuscator-plugin.js'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    // 生产环境代码混淆
    obfuscatorPlugin({
      level: 'normal' // 可选: 'normal' | 'high'
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  // 添加哈希值到构建文件名，禁用浏览器缓存
  build: {
    rollupOptions: {
      output: {
        entryFileNames: `assets/[name].[hash].js`,
        chunkFileNames: `assets/[name].[hash].js`,
        assetFileNames: `assets/[name].[hash].[ext]`
      }
    }
  },
  // 开发服务器配置
  server: {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Surrogate-Control': 'no-store'
    }
  }
})
