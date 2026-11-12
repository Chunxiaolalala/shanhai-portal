/**
 * 规格书 14.1 设备分流：桌面总览 / 竖屏第一人称巡游。
 *
 * 三条硬规则：
 * 1. 桌面端永远走原来的总览 + 卷轴路径，本章不改动它。
 * 2. 粗指针 + 窄屏 → 竖屏巡游；M1（真 3D）需要 WebGL2 且未关闭动画。
 * 3. M02 尚未拍板，所以 tour.json → performance.m1Default 默认 false：
 *    手机默认跑 M0（V12 竖版背景 2.5D 第一人称），?mode=m1 可强制体验 M1。
 *    连续低帧率时由 tour.ts 自动降回 M0，且不丢巡游进度。
 */
import { scene, tour } from '@/core/config'
import type { TourBackend } from '@/types/contract'

export type ViewMode = 'desktop' | 'portrait'

export interface DeviceProfile {
  viewMode: ViewMode
  tourBackend: TourBackend
  isTouch: boolean
  isPortrait: boolean
  isNarrow: boolean
  webgl2: boolean
  reducedMotion: boolean
  /** URL 里的强制模式，便于验收与分享 */
  forced: string | null
}

function hasWebGL2(): boolean {
  try {
    return document.createElement('canvas').getContext('webgl2') !== null
  } catch {
    return false
  }
}

export function detectDeviceProfile(): DeviceProfile {
  const forced = new URLSearchParams(window.location.search).get('mode')
  const narrowPx = scene.mobile?.narrowPx ?? 820
  const isTouch = window.matchMedia('(pointer: coarse)').matches
    || navigator.maxTouchPoints > 0
  const isNarrow = window.innerWidth <= narrowPx
  const isPortrait = window.innerHeight >= window.innerWidth
  const webgl2 = hasWebGL2()
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const m1Ready = webgl2 && !reducedMotion

  const base: DeviceProfile = {
    viewMode: 'desktop',
    tourBackend: 'm0',
    isTouch,
    isPortrait,
    isNarrow,
    webgl2,
    reducedMotion,
    forced,
  }

  // URL 强制模式：验收 / 分享 / 排查用，优先级高于自动判定
  if (forced === 'desktop' || forced === 'static' || forced === 'webgl2') return base
  if (forced === 'portrait' || forced === 'm0' || forced === 'm1') {
    const wantM1 = forced === 'm1'
      || (forced === 'portrait' && (tour.performance.m1Default || scene.mobile?.preferM1 === true))
    return {
      ...base,
      viewMode: 'portrait',
      // 设备不达标时强制 m1 也不硬上，静默回落 M0
      tourBackend: wantM1 && m1Ready ? 'm1' : 'm0',
    }
  }

  const enabled = scene.mobile?.enabled !== false
  if (!enabled || !isTouch || !isNarrow) return base

  const wantM1 = tour.performance.m1Default || scene.mobile?.preferM1 === true
  return {
    ...base,
    viewMode: 'portrait',
    tourBackend: wantM1 && m1Ready ? 'm1' : 'm0',
  }
}
