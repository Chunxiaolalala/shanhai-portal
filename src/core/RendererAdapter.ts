/**
 * 规格书 04 章：两条渲染路径共用同一份 scene.json。
 *
 * 当前为骨架阶段，只跑通 Three.js / WebGL2 兜底路径。
 * WebGPU 能力做探测但不启用（WGSL 云雾、实例化流光、GPU 视锥剔除尚未实现），
 * 避免半成品把访客挡在门外。实现完成后在 selectBackend 里放开 'webgpu' 分支。
 */

export type RenderBackend = 'webgpu' | 'webgl2' | 'static'

export interface RenderCapabilities {
  webgpu: boolean
  webgl2: boolean
  reducedMotion: boolean
  coarsePointer: boolean
}

export interface RendererAdapter {
  readonly backend: RenderBackend
  /** 案例 iframe 打开时暂停主场景渲染循环，避免双 WebGL context（规格书 7.3） */
  pause(): void
  resume(): void
  dispose(): void
}

export function detectCapabilities(): RenderCapabilities {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return { webgpu: false, webgl2: false, reducedMotion: false, coarsePointer: false }
  }

  let webgl2 = false
  try {
    const probe = document.createElement('canvas')
    webgl2 = probe.getContext('webgl2') !== null
  } catch {
    webgl2 = false
  }

  return {
    webgpu: 'gpu' in navigator,
    webgl2,
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    coarsePointer: window.matchMedia('(pointer: coarse)').matches,
  }
}

/**
 * 移动端默认走 2D 静态降级（规格书 04 章）。
 * ?mode=static 强制静态，便于在无 WebGL 环境 / 截屏 / 排查时使用。
 */
export function selectBackend(caps: RenderCapabilities = detectCapabilities()): RenderBackend {
  if (typeof window !== 'undefined') {
    const forced = new URLSearchParams(window.location.search).get('mode')
    if (forced === 'static') return 'static'
    if (forced === 'webgl2') return 'webgl2'
  }
  if (!caps.webgl2) return 'static'
  if (caps.coarsePointer) return 'static'
  return 'webgl2'
}
