<script setup lang="ts">
/**
 * 应用外壳：按设备形态分成两条完整路径（规格书 14.1）。
 *
 * 桌面：山门主张 + 3D 总览 / 2D 降级 + 罗盘 + 文字索引 + 卷轴内页。
 * 竖屏 Touch：起始点小地图 → 第一人称跟随巡游 → 同一套卷轴内页（见 ui/portrait/）。
 * 两条路径共用 ScrollPanel / TransitionMask / 数据契约 / 埋点，不复制业务代码。
 * 3D 走动态 import，保证首屏不被 WebGL 初始化阻塞（规格书 01 / 03 章）。
 */
import { onBeforeUnmount, onMounted, ref } from 'vue'
import GateHero from '@/ui/GateHero.vue'
import TextIndex from '@/ui/TextIndex.vue'
import ScrollPanel from '@/ui/ScrollPanel.vue'
import TransitionMask from '@/ui/TransitionMask.vue'
import PavilionLabels from '@/ui/PavilionLabels.vue'
import GuideShimei from '@/ui/GuideShimei.vue'
import CompassMap from '@/ui/CompassMap.vue'
import BeastBar from '@/ui/BeastBar.vue'
import StaticFallback from '@/ui/StaticFallback.vue'
import SwordCursor from '@/ui/SwordCursor.vue'
import PortraitTour from '@/ui/portrait/PortraitTour.vue'
import { detectCapabilities, selectBackend, type RendererAdapter } from '@/core/RendererAdapter'
import { detectDeviceProfile, type DeviceProfile } from '@/core/device'
import { registerRenderControls, openPavilion, startGuideTour, stopGuideTour } from '@/core/journey'
import { portraitActive } from '@/core/tour'
import { pavilions } from '@/core/config'

const canvasHost = ref<HTMLElement | null>(null)
const backendLabel = ref('检测中…')
const isStatic = ref(false)
const loading = ref(true)
const profile = ref<DeviceProfile | null>(null)
const isPortrait = ref(false)
let adapter: RendererAdapter | null = null
let unregisterControls: (() => void) | null = null
let unmounted = false

onMounted(async () => {
  const device = detectDeviceProfile()
  profile.value = device

  // [CH14] 竖屏巡游不走桌面 SceneRoot：小地图先出图，不等 WebGL
  if (device.viewMode === 'portrait') {
    // 竖屏巡游是全屏沉浸式，锁掉 body 滚动；卷轴内部仍可原生滚动
    document.documentElement.classList.add('is-portrait')
    isPortrait.value = true
    portraitActive.value = true
    loading.value = false
    return
  }

  const caps = detectCapabilities()
  const backend = selectBackend(caps)

  if (backend === 'static') {
    isStatic.value = true
    backendLabel.value = '2D 山海 · 静态降级路径（移动端 / 无 WebGL / ?mode=static）'
    loading.value = false
  } else {
    backendLabel.value = caps.webgpu
      ? 'Three.js / WebGL2 · 已探测 WebGPU，渐进增强待接入'
      : 'Three.js / WebGL2 · 拖拽旋转 / 点殿名入内'
    const container = canvasHost.value
    if (container !== null) {
      const { createSceneRoot } = await import('@/three/SceneRoot')
      // 动态 import 期间组件可能已卸载，此时不要再创建 WebGL context
      if (unmounted) return
      adapter = createSceneRoot(container, backend)
      unregisterControls = registerRenderControls(adapter.pause, adapter.resume)
      loading.value = false
    }
  }
  startGuideTour()

  // 深链：?p=yanan-ge 可直接把访客送进某座殿，便于分享与免点击验收
  const deepLink = new URLSearchParams(window.location.search).get('p')
  if (deepLink !== null && pavilions.some((item) => item.id === deepLink)) {
    openPavilion(deepLink, 'deeplink')
  }
})

onBeforeUnmount(() => {
  unmounted = true
  stopGuideTour()
  unregisterControls?.()
  adapter?.dispose()
  adapter = null
  portraitActive.value = false
  document.documentElement.classList.remove('is-portrait')
})
</script>

<template>
  <div
    class="app-shell"
    :class="{ 'app-shell--static': isStatic, 'app-shell--portrait': isPortrait }"
  >
    <PortraitTour v-if="isPortrait && profile !== null" :backend="profile.tourBackend" />

    <template v-else>
      <GateHero />
      <main>
        <div class="stage" role="region" aria-label="可旋转的三维山海，含八座可点击殿阁">
          <div ref="canvasHost" class="stage__canvas"></div>
          <StaticFallback v-if="isStatic" />
          <PavilionLabels v-else />
          <GuideShimei />
          <CompassMap />
          <BeastBar :backend-label="backendLabel" :loading="loading" />
        </div>
        <TextIndex />
      </main>
    </template>

    <!-- 两条路径共用：门框转场 / 卷轴内页 / 动画光标（触屏自动回落静态帧） -->
    <TransitionMask />
    <ScrollPanel />
    <SwordCursor />
  </div>
</template>
