<script setup lang="ts">
/**
 * [CH14.5] 竖屏 Touch HUD。
 *
 * 全部热区 ≥44px、避开刘海与 Home 条（env(safe-area-inset-*)）；
 * touch-action:none 只作用在摇杆与环顾层，页面其余部分（含卷轴）仍可原生滚动。
 * 底部摇杆：前推加速 / 后拉减速 / 左右带一点侧移，松手自动回中。
 */
import { computed, ref } from 'vue'
import { tour } from '@/core/config'
import { scrollOpen } from '@/core/journey'
import {
  dropTour,
  setJoystick,
  tourBackend,
  tourDegraded,
  tourPhase,
  tourStepLabel,
  tourTargetName,
  tourWalk,
} from '@/core/tour'

const pad = ref<HTMLElement | null>(null)
const knob = ref({ x: 0, y: 0 })
const active = ref(false)

const knobStyle = computed(() => ({
  transform: `translate(${knob.value.x * 26}px, ${knob.value.y * 26}px)`,
}))

const statusText = computed(() => {
  if (tourPhase.value === 'GATE') return '小师妹正在来接你…'
  if (tourPhase.value === 'ARRIVE') return `已到 ${tourTargetName.value}`
  if (tourPhase.value === 'SCROLL') return `${tourTargetName.value} · 卷轴中`
  return `下一境 · ${tourTargetName.value}`
})

function update(event: PointerEvent): void {
  const el = pad.value
  if (el === null) return
  const rect = el.getBoundingClientRect()
  const cx = rect.left + rect.width / 2
  const cy = rect.top + rect.height / 2
  const reach = rect.width * 0.32
  let x = (event.clientX - cx) / reach
  let y = (event.clientY - cy) / reach
  const length = Math.hypot(x, y)
  if (length > 1) { x /= length; y /= length }
  knob.value = { x, y }
  setJoystick(x, y)
}

function onDown(event: PointerEvent): void {
  active.value = true
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
  update(event)
}

function onMove(event: PointerEvent): void {
  if (active.value) update(event)
}

function onUp(): void {
  if (!active.value) return
  active.value = false
  knob.value = { x: 0, y: 0 }
  setJoystick(0, 0)
}

function toDesktop(): void {
  const url = new URL(window.location.href)
  url.searchParams.set('mode', 'desktop')
  url.searchParams.delete('from')
  window.location.assign(url.toString())
}
</script>

<template>
  <div class="pt-hud" :class="{ 'is-scroll': scrollOpen }" aria-label="巡游控制">
    <header class="pt-hud__top">
      <button type="button" class="pt-hud__exit" @click="dropTour('user')" aria-label="退出巡游，重选起点">
        ‹ {{ tour.hud.exit }}
      </button>
      <div class="pt-hud__meta">
        <strong>{{ tourStepLabel }}</strong>
        <span>{{ statusText }}</span>
      </div>
      <button type="button" class="pt-hud__desktop" @click="toDesktop">总览</button>
    </header>

    <p v-if="tourDegraded" class="pt-hud__degraded" role="status">
      已切到轻量的竖版巡游，进度不会丢
    </p>
    <p v-else-if="tourBackend === 'm1'" class="pt-hud__badge" aria-hidden="true">3D 巡游</p>

    <footer class="pt-hud__bottom">
      <div
        ref="pad"
        class="pt-hud__pad"
        :class="{ 'is-active': active }"
        role="slider"
        tabindex="0"
        aria-label="行进摇杆：前推加速，后拉减速"
        aria-valuemin="0"
        aria-valuemax="100"
        :aria-valuenow="Math.round(tourWalk * 100)"
        @pointerdown="onDown"
        @pointermove="onMove"
        @pointerup="onUp"
        @pointercancel="onUp"
        @keydown.up.prevent="setJoystick(0, -1)"
        @keydown.down.prevent="setJoystick(0, 1)"
        @keydown.left.prevent="setJoystick(-1, 0)"
        @keydown.right.prevent="setJoystick(1, 0)"
      >
        <span class="pt-hud__knob" :style="knobStyle" aria-hidden="true">✦</span>
      </div>
      <div class="pt-hud__hint">
        <p>{{ tour.hud.lookHint }}</p>
        <p class="pt-hud__progress">
          <span class="pt-hud__progress-fill" :style="{ transform: `scaleX(${tourWalk})` }"></span>
        </p>
      </div>
    </footer>
  </div>
</template>
