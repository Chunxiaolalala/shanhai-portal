<script setup lang="ts">
/**
 * [CH14.3][REF V12] M0 第一人称巡游视觉：竖版山海 + 双层视差 + 小师妹带路。
 *
 * 不做「丑 3D 贴地走」：用 V12 水彩竖版做远景，云海裁片做近景，两层以不同速率位移，
 * 配合背景缓慢推近（zoom）表达「向前走」；单指拖动环顾（yaw/pitch 用位移模拟，±5.5% / ±3.2%）。
 * 小师妹是 2D 水彩立绘，始终在视线前方带路（C04：角色一律 2D，禁止 3D 建模）。
 *
 * M1 真 3D 由 TourSceneRoot 挂载在同一位置；两者共用 tourWalk 进度，降级不丢位置。
 */
import { computed, ref } from 'vue'

import { tour } from '@/core/config'
import { openNow, setLook, tourJoystick, tourLook, tourPhase, tourTargetName, tourWalk } from '@/core/tour'
import CharacterImage from '@/ui/CharacterImage.vue'

const dragging = ref(false)
let startX = 0
let startY = 0
let startLookX = 0
let startLookY = 0

const shiftX = computed(() => tourLook.value.x * tour.look.maxShiftX + tourJoystick.value.x * 1.8)
const shiftY = computed(() => tourLook.value.y * tour.look.maxShiftY - tourWalk.value * 1.6)
const zoom = computed(() =>
  tour.look.scaleFrom + tourWalk.value * (tour.look.scaleTo - tour.look.scaleFrom))

const backStyle = computed(() => ({
  transform: `translate3d(${shiftX.value}%, ${shiftY.value}%, 0) scale(${zoom.value})`,
}))
const foreStyle = computed(() => ({
  transform: `translate3d(${shiftX.value * 1.7}%, ${shiftY.value * 1.55 + tourWalk.value * 2.2}%, 0) scale(${zoom.value * 1.05})`,
}))
const arrived = computed(() => tourPhase.value === 'ARRIVE' || tourPhase.value === 'SCROLL')

function onDown(event: PointerEvent): void {
  dragging.value = true
  startX = event.clientX
  startY = event.clientY
  startLookX = tourLook.value.x
  startLookY = tourLook.value.y
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
}

function onMove(event: PointerEvent): void {
  if (!dragging.value) return
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  // 拖过半屏 = 环顾到极限（±35° 的 2D 等比表达）
  const dx = (event.clientX - startX) / (rect.width * 0.5)
  const dy = (event.clientY - startY) / (rect.height * 0.5)
  setLook(startLookX - dx, startLookY - dy)
}

function onUp(): void {
  if (!dragging.value) return
  dragging.value = false
  // 松手缓回正前方，继续跟着小师妹走
  setLook(0, 0)
}
</script>

<template>
  <div class="pt-view" :class="{ 'pt-view--arrived': arrived, 'is-dragging': dragging }">
    <div class="pt-view__sky" aria-hidden="true"></div>

    <!-- 同小地图：LQIP 铺底，高清 img 解码完成自然覆盖，不依赖 load 事件 -->
    <img class="pt-view__back" :src="tour.backdrop.lqip" alt="" aria-hidden="true" :style="backStyle" />
    <img
      class="pt-view__back pt-view__back--full"
      :src="tour.backdrop.image"
      :style="backStyle"
      alt=""
      aria-hidden="true"
    />
    <img
      class="pt-view__fore"
      :src="tour.backdrop.foreground"
      :style="foreStyle"
      alt=""
      aria-hidden="true"
    />

    <!-- 单指环顾层：只接管 canvas 区域，不抢 HUD / 殿门按钮 -->
    <div
      class="pt-view__look"
      :class="{ 'is-dragging': dragging }"
      @pointerdown="onDown"
      @pointermove="onMove"
      @pointerup="onUp"
      @pointercancel="onUp"
    ></div>

    <!-- 小师妹带路：越走越近一点，站定时回眸 -->
    <div class="pt-view__guide" :class="{ 'pt-view__guide--waiting': arrived }" aria-hidden="true">
      <span class="pt-view__trail"></span>
      <CharacterImage name="shimei" class="pt-view__shimei" glow eager>
        <template #fallback>
          <svg viewBox="0 0 64 72" aria-hidden="true">
            <circle cx="32" cy="20" r="11" fill="#f8f3e2" stroke="#33413c" stroke-width="1.4" />
            <path d="M32 30 C22 34 18 48 18 56 L46 56 C46 48 42 34 32 30 Z" fill="#f8f3e2" stroke="#33413c" stroke-width="1.4" />
          </svg>
        </template>
      </CharacterImage>
      <span class="pt-view__guide-tip">{{ arrived ? '到啦' : '随我来' }}</span>
    </div>

    <!-- 到站：殿门浮现，点一下立即展卷（也等 arriveMs 自动展开） -->
    <button
      v-if="tourPhase === 'ARRIVE'"
      type="button"
      class="pt-view__door"
      @click="openNow"
    >
      <span class="pt-view__door-seal" aria-hidden="true">颜</span>
      <span class="pt-view__door-name">{{ tourTargetName }}</span>
      <span class="pt-view__door-hint">{{ tour.hud.arriveHint }}</span>
    </button>

    <p class="pt-view__distance" aria-hidden="true">
      <span class="pt-view__distance-fill" :style="{ transform: `scaleX(${tourWalk})` }"></span>
    </p>
  </div>
</template>
