import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// 规格书 04 章：主包 < 1.5 MB。three 单独切 chunk，避免把 3D 引擎计入首屏主包。
// 静态托管、无后端，base 用相对路径，便于挂到任意子目录。
export default defineConfig({
  base: './',
  plugins: [vue()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    target: 'es2022',
    rollupOptions: {
      output: {
        manualChunks: { three: ['three'] },
      },
    },
  },
})
