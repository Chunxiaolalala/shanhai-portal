/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
  export default component
}

// WebGPU 能力用 `'gpu' in navigator` 属性探测，不在此声明全局接口，
// 避免实现 WGSL 路径引入 @webgpu/types 后出现全局声明冲突。
