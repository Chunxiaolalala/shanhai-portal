<script setup lang="ts">
/**
 * [CH14] 竖屏巡游外壳：把三个子组件编排成一条完整路径。
 *
 * SELECT（小地图选起点）→ GATE/WALK/ARRIVE（第一人称跟随）→ SCROLL（全局卷轴）→ 下一站 → END。
 * M0 / M1 共用一个进度源；M1 因帧率不足降级时只换渲染层，巡游状态、已看列表、链接都不重置。
 *
 * 卷轴 / 门框转场 / 光标由 App.vue 全局挂载，这里不重复创建。
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { pavilions, tour } from '@/core/config'
import { registerRenderControls } from '@/core/journey'
import {
  degradeToM0,
  disposeTour,
  dropTour,
  initTour,
  portraitActive,
  tourBackend,
  tourPhase,
  tourVisited,
} from '@/core/tour'
import type { RendererAdapter } from '@/core/RendererAdapter'
import type { TourBackend } from '@/types/contract'
import TourStartMap from './TourStartMap.vue'
import PortraitBackdrop from './PortraitBackdrop.vue'
import TourHud from './TourHud.vue'

const props = defineProps<{ backend: TourBackend }>()

const canvasHost = ref<HTMLElement | null>(null)
let adapter: RendererAdapter | null = null
let unregisterControls: (() => void) | null = null
let disposed = false

const showMap = computed(() => tourPhase.value === 'SELECT')
const showEnd = computed(() => tourPhase.value === 'END')
const showHud = computed(() => !showMap.value && !showEnd.value)
const useM1 = computed(() => tourBackend.value === 'm1' && showHud.value)

const visitedNames = computed(() => tourVisited.value
  .map((id) => pavilions.find((item) => item.id === id)?.name)
  .filter((name): name is string => name !== undefined))

function toDesktop(): void {
  const url = new URL(window.location.href)
  url.searchParams.set('mode', 'desktop')
  url.searchParams.delete('from')
  window.location.assign(url.toString())
}

async function mountM1(): Promise<void> {
  const host = canvasHost.value
  if (host === null || adapter !== null) return
  try {
    const { createTourSceneRoot } = await import('@/three/tour/TourSceneRoot')
    if (disposed || adapter !== null || tourBackend.value !== 'm1') return
    const created = createTourSceneRoot(host)
    adapter = created
    // 卷轴展开时暂停 3D 渲染，收卷再恢复（与桌面路径同一套控制）
    unregisterControls = registerRenderControls(created.pause, created.resume)
  } catch (error) {
    // WebGL context 创建失败 / 动态 import 失败都不能把访客留在空白层：
    // 竖版背景一直在下面，直接退回 M0 继续巡游。
    console.error('[tour] M1 初始化失败，自动降回 M0', error)
    if (import.meta.env.DEV) {
      document.body.dataset.tourError = error instanceof Error ? error.message : String(error)
    }
    degradeToM0()
  }
}

function destroyM1(): void {
  unregisterControls?.()
  unregisterControls = null
  adapter?.dispose()
  adapter = null
}

onMounted(() => {
  portraitActive.value = true
  initTour(props.backend)
  // 不在这里直接 mountM1：initTour 改了 phase，v-else 分支要等下一次 patch 才有 DOM。
  // 下面的 watch(flush:'post') 会在 DOM 就绪后再挂载 3D。
})

onBeforeUnmount(() => {
  disposed = true
  destroyM1()
  disposeTour()
  portraitActive.value = false
})

watch(useM1, (on) => {
  if (on) void mountM1()
  else destroyM1()
}, { flush: 'post' })
</script>

<template>
  <div class="pt-stage" :class="{ 'pt-stage--m1': useM1 }">
    <TourStartMap v-if="showMap" />

    <template v-else>
      <!-- [REF V12] M1 加载前 / 降级后都由竖版背景兜底，绝不白屏 -->
      <PortraitBackdrop />
      <div ref="canvasHost" class="pt-stage__canvas" aria-hidden="true"></div>

      <TourHud v-if="showHud" />

      <section v-if="showEnd" class="pt-end" aria-label="巡游结束">
        <p class="pt-end__eyebrow">山海八境 · 巡毕</p>
        <h2 class="pt-end__title">{{ tour.hud.endTitle }}</h2>
        <p class="pt-end__sub">{{ tour.hud.endSub }}</p>
        <p class="pt-end__list">{{ visitedNames.join(' · ') }}</p>
        <div class="pt-end__actions">
          <button type="button" class="pt-end__primary" @click="dropTour('restart')">
            {{ tour.hud.restart }}
          </button>
          <button type="button" class="pt-end__ghost" @click="toDesktop">
            {{ tour.hud.backToDesktop }}
          </button>
        </div>
      </section>
    </template>
  </div>
</template>
