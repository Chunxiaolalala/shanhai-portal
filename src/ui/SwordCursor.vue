<script setup lang="ts">
/**
 * [REF V06] 御剑侠客动画光标 · 8 帧循环
 *
 * 为什么不直接把动图塞进 CSS cursor：浏览器对 APNG / 动画 WebP 作为 cursor 的支持不一致，
 * Chrome 会静默只显示第一帧。所以拆两层——
 *   1) 原生 CSS cursor = 静态第 1 帧（base.css / ornaments.css），覆盖无 JS、iframe、
 *      粗指针设备、reduced-motion 等所有场景，永远有兜底；
 *   2) 本组件 = 跟随指针的 DOM sprite，用 steps(8) 播真正的 8 帧飞行循环。
 *
 * 帧资源由 tools/images/prepare_cursor.py 从 V06 雪碧图切出：统一缩放、右边缘（剑尖）对齐、
 * 垂直烘焙飞行起伏；参数唯一来源是 src/config/cursor.json。
 *
 * 性能：pointermove 只记坐标，位置更新走 rAF 直接写 style.transform，不触发 Vue 渲染。
 * 降级：粗指针 / 触屏 / 失焦 / 标签页隐藏 / 指针离开文档（进入 iframe）时退回原生静态光标。
 */
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { cursor } from '@/core/config'

const root = ref<HTMLElement | null>(null)
const active = ref(false)
const visible = ref(false)
const interactive = ref(false)
const pressed = ref(false)

const base = cursor.scale ?? 0.95
const styleVars: Record<string, string> = {
  '--sword-duration': `${cursor.durationMs}ms`,
  '--sword-scale': String(base),
  '--sword-scale-hover': String(base * (cursor.hoverScale ?? 1.12)),
  '--sword-scale-pressed': String(base * 0.94),
  '--sword-glow': cursor.trail?.color ?? '#f2d790',
}

const INTERACTIVE =
  'a, button, [role="button"], .compass__node, .stone--published, .text-index li button'

let raf = 0
let px = 0
let py = 0
let mql: MediaQueryList | null = null
let teardown: (() => void) | null = null

function frame() {
  raf = 0
  const el = root.value
  if (el === null) return
  el.style.transform = `translate3d(${px - cursor.hotspot.x}px, ${py - cursor.hotspot.y}px, 0)`
}

function schedule() {
  if (raf === 0) raf = requestAnimationFrame(frame)
}

function onMove(event: PointerEvent) {
  px = event.clientX
  py = event.clientY
  if (!visible.value) visible.value = true
  const target = event.target
  interactive.value = target instanceof Element && target.closest(INTERACTIVE) !== null
  schedule()
}

function onDown() {
  pressed.value = true
}

function onUp() {
  pressed.value = false
}

function onBlur() {
  visible.value = false
  pressed.value = false
}

function onPointerOut(event: PointerEvent) {
  // 指针进入案例 iframe 后父文档收不到 pointermove，隐藏 DOM 层让原生静态光标露出
  if (event.relatedTarget === null) visible.value = false
}

function onVisibility() {
  if (document.hidden) onBlur()
}

onMounted(() => {
  mql = window.matchMedia('(hover: hover) and (pointer: fine)')
  const syncCapability = () => {
    const shouldEnable = mql?.matches ?? false
    if (shouldEnable === active.value) return
    active.value = shouldEnable
    if (shouldEnable) {
      document.body.classList.add('has-sword-cursor')
    } else {
      visible.value = false
      document.body.classList.remove('has-sword-cursor')
    }
  }
  syncCapability()

  // 免鼠标自检 / 截图用：?cursor=demo 把侠客停在舞台中央并亮起指尖柔光
  if (new URLSearchParams(window.location.search).get('cursor') === 'demo') {
    px = Math.round(window.innerWidth * 0.6)
    py = Math.round(window.innerHeight * 0.46)
    visible.value = true
    interactive.value = true
    void nextTick(() => frame())
  }

  window.addEventListener('pointermove', onMove, { passive: true })
  window.addEventListener('pointerdown', onDown, { passive: true })
  window.addEventListener('pointerup', onUp, { passive: true })
  window.addEventListener('blur', onBlur)
  document.addEventListener('pointerout', onPointerOut)
  document.addEventListener('visibilitychange', onVisibility)
  mql.addEventListener('change', syncCapability)

  teardown = () => {
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerdown', onDown)
    window.removeEventListener('pointerup', onUp)
    window.removeEventListener('blur', onBlur)
    document.removeEventListener('pointerout', onPointerOut)
    document.removeEventListener('visibilitychange', onVisibility)
    mql?.removeEventListener('change', syncCapability)
  }
})

onBeforeUnmount(() => {
  teardown?.()
  if (raf !== 0) cancelAnimationFrame(raf)
  document.body.classList.remove('has-sword-cursor')
})
</script>

<template>
  <div
    v-if="active"
    ref="root"
    class="sword-cursor"
    :class="{ 'is-visible': visible, 'is-interactive': interactive, 'is-pressed': pressed }"
    :style="styleVars"
    aria-hidden="true"
  >
    <div class="sword-cursor__scale">
      <span class="sword-cursor__glow"></span>
      <span class="sword-cursor__sprite"></span>
    </div>
  </div>
</template>
