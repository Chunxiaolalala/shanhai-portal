/**
 * 全站导航的唯一状态源：镜头状态机 + 卷轴开合 + 小师妹引导 + 3D 屏幕锚点。
 *
 * 规格书 05 / 06 章：
 * - 任意时刻可中断飞行；ESC / 返回回到「来路」而不是起点。
 * - order 一处改动，文字索引、罗盘、引导顺序同步（都读 pavilions）。
 * - 用户手动点任意殿阁即视为接管，小师妹退到角落待命，全程不遮挡点击热区。
 *
 * 这里刻意不 import three：3D 侧通过 registerFlightHandler 注入飞行能力，
 * 2D 静态降级路径不注入即可，UI 层完全共用。
 */
import { computed, ref } from 'vue'
import type { Ref } from 'vue'
import { CameraStateMachine } from '@/core/cameraState'
import { pavilions, scene } from '@/core/config'
import { track } from '@/telemetry'
import type { CameraState } from '@/types/contract'

export interface ScreenAnchor {
  x: number
  y: number
  /** 殿阁被山体挡住或转到镜头背面时不显示引导标记 */
  visible: boolean
}

export type TimeOfDay = 'day' | 'night'

const machine = new CameraStateMachine()

export const activePavilionId: Ref<string | null> = ref(null)
export const activePavilion = computed(() =>
  pavilions.find((item) => item.id === activePavilionId.value) ?? null,
)
export const scrollOpen: Ref<boolean> = ref(false)
/** 门框遮罩：镜头推进到一半时罩上，卷轴展开时淡出 */
export const transitionMask: Ref<boolean> = ref(false)
export const cameraState: Ref<CameraState> = ref<CameraState>('OVERVIEW')

export const guideEnabled: Ref<boolean> = ref(true)
export const guideDocked: Ref<boolean> = ref(false)
export const guideIndex: Ref<number> = ref(0)
export const guidedPavilionId = computed(() => pavilions[guideIndex.value]?.id ?? null)
export const anchors: Ref<Record<string, ScreenAnchor>> = ref({})
export const timeOfDay: Ref<TimeOfDay> = ref('day')

type FlightHandler = (id: string | null) => void
let flightHandler: FlightHandler | null = null
let renderPause: (() => void) | null = null
let renderResume: (() => void) | null = null
let maskTimer: number | null = null
let scrollTimer: number | null = null
let tourTimer: number | null = null
let dwellStart = 0
/** 打开新殿之前所在的位置，用来实现「回来路」 */
let returnToId: string | null = null

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** 3D 场景装配完后注入；返回注销函数 */
export function registerFlightHandler(handler: FlightHandler): () => void {
  flightHandler = handler
  return () => { flightHandler = null }
}

/** 3D 投影 / 2D 降级各自写入同一份锚点，小师妹与罗盘共用 */
export function setAnchors(next: Record<string, ScreenAnchor>): void {
  anchors.value = next
}

/**
 * 案例 iframe 打开时暂停主场景渲染、关闭时恢复（规格书 7.3：避免双 WebGL context）。
 * 2D 静态降级路径不注册，下面两个调用就是 no-op。
 */
export function registerRenderControls(pause: () => void, resume: () => void): () => void {
  renderPause = pause
  renderResume = resume
  return () => { renderPause = null; renderResume = null }
}

export function pauseScene(): void { renderPause?.() }
export function resumeScene(): void { renderResume?.() }

function clearTimers(): void {
  if (maskTimer !== null) window.clearTimeout(maskTimer)
  if (scrollTimer !== null) window.clearTimeout(scrollTimer)
  maskTimer = null
  scrollTimer = null
}

function flightDuration(): number {
  if (prefersReducedMotion()) return 0
  const [min = 1200] = scene.flight.durationMs
  return min
}

export function openPavilion(id: string, from = 'scene'): void {
  const target = pavilions.find((item) => item.id === id)
  if (target === undefined) return

  clearTimers()
  track('pavilion_click', { id, from })

  // 从一座殿直接跳到另一座时，记下来路；从总览进入则回到总览
  if (scrollOpen.value && activePavilionId.value !== null && activePavilionId.value !== id) {
    returnToId = activePavilionId.value
  } else if (!scrollOpen.value) {
    returnToId = null
  }

  // 手动点击即接管引导（规格书 06 章）
  guideDocked.value = true
  stopGuideTour()

  activePavilionId.value = id
  scrollOpen.value = false
  transitionMask.value = false

  machine.go('FOCUS')
  machine.go('APPROACH')
  cameraState.value = machine.state

  flightHandler?.(id)

  const duration = flightDuration()
  maskTimer = window.setTimeout(() => { transitionMask.value = true }, duration * 0.55)
  scrollTimer = window.setTimeout(() => {
    machine.go('TRANSITION')
    machine.go('SCROLL')
    cameraState.value = machine.state
    scrollOpen.value = true
    transitionMask.value = false
    dwellStart = Date.now()
  }, duration)
}

export function closeScroll(): void {
  if (!scrollOpen.value && cameraState.value !== 'APPROACH') return
  clearTimers()

  if (dwellStart > 0 && activePavilionId.value !== null) {
    track('scroll_dwell', { id: activePavilionId.value, ms: Date.now() - dwellStart })
  }
  dwellStart = 0
  scrollOpen.value = false
  transitionMask.value = false

  // 回来路：从另一座殿跳过来的，镜头回到那座殿但不展开它的卷轴。
  // 若还在飞行途中（SCROLL 之外的状态），直接归位，避免被状态机的合法迁移挡住。
  const target = returnToId ?? null
  if (cameraState.value === 'SCROLL') {
    machine.back(target === null ? 'OVERVIEW' : 'FOCUS')
  } else {
    machine.reset()
  }
  cameraState.value = machine.state
  flightHandler?.(cameraState.value === 'OVERVIEW' ? null : target)
  returnToId = null
}

export function backToOverview(): void {
  clearTimers()
  scrollOpen.value = false
  transitionMask.value = false
  activePavilionId.value = null
  returnToId = null
  guideDocked.value = false
  machine.reset()
  cameraState.value = machine.state
  flightHandler?.(null)
  startGuideTour()
}

export function skipGuide(): void {
  guideEnabled.value = false
  guideDocked.value = true
  stopGuideTour()
}

export function resumeGuide(): void {
  guideEnabled.value = true
  guideDocked.value = false
  startGuideTour()
}

export function toggleGuide(): void {
  if (guideEnabled.value && !guideDocked.value) skipGuide()
  else resumeGuide()
}

export function startGuideTour(): void {
  stopGuideTour()
  if (!guideEnabled.value || guideDocked.value || prefersReducedMotion()) return
  tourTimer = window.setInterval(() => {
    guideIndex.value = (guideIndex.value + 1) % pavilions.length
  }, 5200)
}

export function stopGuideTour(): void {
  if (tourTimer !== null) window.clearInterval(tourTimer)
  tourTimer = null
}

/** 烛龙睁眼 = 昼夜切换；3D 侧在渲染循环里读取这个值做雾与光的插值 */
export function toggleTimeOfDay(): void {
  timeOfDay.value = timeOfDay.value === 'day' ? 'night' : 'day'
  document.documentElement.dataset.time = timeOfDay.value
}
