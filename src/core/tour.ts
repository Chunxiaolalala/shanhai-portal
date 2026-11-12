/**
 * 规格书 14.4 巡游状态机：SELECT → GATE → WALK → ARRIVE → SCROLL →（下一站）→ END。
 *
 * 与 journey.ts 的 CameraState 并存、互不覆盖：
 * - 本模块只管「走到哪一站、还差多远、跟不跟着小师妹」；
 * - 卷轴开合、门框转场、埋点仍走 journey.openPavilion() / scrollOpen；
 * - 卷轴关闭由这里 watch(scrollOpen) 捕捉，自动走向下一站，不回山门。
 *
 * M0 / M1 共用同一份 tourWalk(0..1) 进度：M0 拿它做背景视差，M1 拿它插值相机位置。
 * 所以低帧率从 M1 降到 M0 时不会丢进度、不会把访客扔回起点。
 */
import { computed, ref, watch } from 'vue'
import type { Ref } from 'vue'
import { pavilions, tour as tourConfig } from '@/core/config'
import { openPavilion, scrollOpen } from '@/core/journey'
import { track } from '@/telemetry'
import type { TourBackend, TourPhase } from '@/types/contract'

export const tourPhase: Ref<TourPhase> = ref('SELECT')
export const tourBackend: Ref<TourBackend> = ref('m0')
/** 竖屏外壳是否接管页面（由 App.vue 设置，退出巡游不改变它） */
export const portraitActive: Ref<boolean> = ref(false)
export const tourFromId: Ref<string> = ref(tourConfig.route.defaultStart)
export const tourSelected: Ref<string | null> = ref(null)
export const tourIndex: Ref<number> = ref(0)
export const tourWalk: Ref<number> = ref(0)
export const tourLook: Ref<{ x: number; y: number }> = ref({ x: 0, y: 0 })
export const tourJoystick: Ref<{ x: number; y: number }> = ref({ x: 0, y: 0 })
export const tourVisited: Ref<string[]> = ref([])
/** 降级提示：M1 因帧率不足退回 M0 时，HUD 上给一句解释 */
export const tourDegraded: Ref<boolean> = ref(false)

export const tourTarget = computed(() => pavilions[tourIndex.value] ?? null)
export const tourTargetName = computed(() => tourTarget.value?.name ?? '山门')
export const tourStepLabel = computed(() =>
  `第 ${Math.min(tourIndex.value + 1, pavilions.length)} / ${pavilions.length} 境`)

let rafId: number | null = null
let lastTs = 0
let gateTimer: number | null = null
let arriveTimer: number | null = null
/** ?tour=walk|arrive|end 用于免交互验收，冻结进度不自动推进 */
let debugFreeze = false

function clamp(value: number, min = -1, max = 1): number {
  return Math.min(max, Math.max(min, value))
}

function clearTimers(): void {
  if (gateTimer !== null) window.clearTimeout(gateTimer)
  if (arriveTimer !== null) window.clearTimeout(arriveTimer)
  gateTimer = null
  arriveTimer = null
}

function writeDeepLink(from: string): void {
  const url = new URL(window.location.href)
  url.searchParams.set('from', from)
  url.searchParams.delete('p')
  window.history.replaceState(null, '', url)
}

function clearDeepLink(): void {
  const url = new URL(window.location.href)
  url.searchParams.delete('from')
  window.history.replaceState(null, '', url)
}

function step(ts: number): void {
  rafId = window.requestAnimationFrame(step)
  if (tourPhase.value !== 'WALK' || debugFreeze) {
    lastTs = ts
    return
  }
  const dt = Math.min(64, ts - (lastTs || ts))
  lastTs = ts
  // 摇杆前推(y<0)加速、后拉减速；最低 0.15 倍，防止卡死在路上
  const boost = clamp(1 - tourJoystick.value.y * 0.85, 0.15, 2)
  tourWalk.value = Math.min(1, tourWalk.value + (dt / tourConfig.route.walkMs) * boost)
  if (tourWalk.value >= 1) arriveAtStop()
}

function beginWalk(): void {
  clearTimers()
  tourWalk.value = 0
  tourLook.value = { x: 0, y: 0 }
  tourPhase.value = 'WALK'
}

function arriveAtStop(): void {
  const target = tourTarget.value
  if (target === null) {
    endTour()
    return
  }
  tourWalk.value = 1
  tourPhase.value = 'ARRIVE'
  tourVisited.value = [...tourVisited.value, target.id]
  track('tour_arrive', { id: target.id, backend: tourBackend.value })

  // 到站站定一下再展开卷轴；这期间用户点殿门可立刻入境（见 PortraitBackdrop）
  arriveTimer = window.setTimeout(() => {
    arriveTimer = null
    openNow()
  }, tourConfig.route.arriveMs)
}

/** 到站立即展开卷轴（自动计时或用户点殿门都走这里） */
export function openNow(): void {
  const target = tourTarget.value
  if (target === null || tourPhase.value === 'SCROLL') return
  if (arriveTimer !== null) window.clearTimeout(arriveTimer)
  arriveTimer = null
  tourPhase.value = 'SCROLL'
  openPavilion(target.id, 'tour')
}

export function nextStop(): void {
  const next = tourIndex.value + 1
  if (next >= pavilions.length) {
    if (tourConfig.route.loop) {
      tourIndex.value = 0
      beginWalk()
    } else {
      endTour()
    }
    return
  }
  tourIndex.value = next
  beginWalk()
}

function endTour(): void {
  clearTimers()
  tourPhase.value = 'END'
  tourWalk.value = 1
}

/** 从某个落点起巡；M03 默认山门 + 8 殿全开 */
export function startTour(fromId: string): void {
  const index = pavilions.findIndex((item) => item.id === fromId)
  if (index < 0) return
  clearTimers()
  tourFromId.value = fromId
  tourSelected.value = fromId
  tourIndex.value = index
  tourVisited.value = []
  tourWalk.value = 0
  tourLook.value = { x: 0, y: 0 }
  tourJoystick.value = { x: 0, y: 0 }
  tourPhase.value = 'GATE'
  track('tour_start', { from: fromId, backend: tourBackend.value })
  writeDeepLink(fromId)

  // 山门开场：短暂停在起点，让小师妹先出现，再开始走
  gateTimer = window.setTimeout(() => {
    gateTimer = null
    beginWalk()
  }, 700)
}

/** 中途退出 / 重选起点 / 巡游完毕重来 */
export function dropTour(reason: 'user' | 'restart' | 'perf_fallback' = 'user'): void {
  if (tourPhase.value !== 'SELECT' && tourVisited.value.length > 0) {
    track('tour_dropoff', {
      reason,
      at: tourTarget.value?.id ?? '',
      visited: tourVisited.value.length,
      backend: tourBackend.value,
    })
  }
  clearTimers()
  clearDeepLink()
  tourPhase.value = 'SELECT'
  tourSelected.value = null
  tourWalk.value = 0
  tourLook.value = { x: 0, y: 0 }
  tourJoystick.value = { x: 0, y: 0 }
  tourVisited.value = []
  if (reason !== 'perf_fallback') tourDegraded.value = false
}

/** M1 连续低帧率时调用：只切渲染后端，进度 / 站点 / 已看列表全部保留 */
export function degradeToM0(): void {
  if (tourBackend.value === 'm0' || debugFreeze) return
  tourDegraded.value = true
  tourBackend.value = 'm0'
  track('tour_dropoff', {
    reason: 'perf_fallback',
    at: tourTarget.value?.id ?? '',
    visited: tourVisited.value.length,
  })
}

export function setLook(x: number, y: number): void {
  tourLook.value = { x: clamp(x), y: clamp(y) }
}

export function setJoystick(x: number, y: number): void {
  tourJoystick.value = { x: clamp(x), y: clamp(y) }
}

/** 卷轴收起 = 本站看完，继续跟小师妹走下一境，不回山门（规格书 14.4） */
watch(scrollOpen, (open, previous) => {
  if (previous && !open && tourPhase.value === 'SCROLL') nextStop()
})

export function initTour(backend: TourBackend): void {
  tourBackend.value = backend
  const params = new URLSearchParams(window.location.search)
  // ?p= 是桌面深链；竖屏把它当起点的别名，分享出去的行为统一为「从这一境起巡」
  const from = params.get('from') ?? params.get('p')
  const valid = from !== null && pavilions.some((item) => item.id === from)
  const debug = params.get('tour')

  if (debug === 'walk' || debug === 'arrive' || debug === 'end' || debug === 'scroll') {
    debugFreeze = true
    startTour(valid && from !== null ? from : tourConfig.route.defaultStart)
    if (debug === 'walk') {
      clearTimers()
      tourWalk.value = 0.45
      tourPhase.value = 'WALK'
    } else if (debug === 'arrive') {
      clearTimers()
      tourWalk.value = 1
      tourPhase.value = 'ARRIVE'
    } else if (debug === 'end') {
      clearTimers()
      tourPhase.value = 'END'
    } else {
      // 免交互验收：直接展开当前境的卷轴
      clearTimers()
      tourWalk.value = 1
      tourPhase.value = 'SCROLL'
      openPavilion(tourTarget.value?.id ?? tourConfig.route.defaultStart, 'deeplink')
    }
  } else if (valid && from !== null) {
    startTour(from)
  } else {
    tourPhase.value = 'SELECT'
    tourSelected.value = null
  }

  if (rafId === null) rafId = window.requestAnimationFrame(step)
}

export function disposeTour(): void {
  clearTimers()
  if (rafId !== null) window.cancelAnimationFrame(rafId)
  rafId = null
}
