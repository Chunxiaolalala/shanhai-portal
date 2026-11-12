<script setup lang="ts">
/**
 * [CH14.2][REF V12] 进场起始点小地图。
 *
 * - 不等 3D、不等高清图：36×64 的 LQIP 先铺底，高清 WebP 解码完淡入，1s 内必有画面。
 * - 8 个落点由 pavilions.order 生成，坐标来自 tour.json（4 个精确对齐 V12 原图亭子光晕）。
 * - 两步确认防误触：第一次点选中并显示该境说明，第二次点 / 按「由此入境」才起巡。
 * - 起点写进 ?from= 深链，可分享、可刷新、等价于桌面的 ?p= 深链。
 */
import { computed } from 'vue'
import { pavilions, spawnPointFor, tour } from '@/core/config'
import { startTour, tourSelected } from '@/core/tour'

const nodes = computed(() => pavilions.map((pavilion, index) => {
  const point = spawnPointFor(pavilion.id)
  return {
    id: pavilion.id,
    name: pavilion.name,
    order: pavilion.order,
    index,
    x: point.x,
    y: point.y,
    hint: tour.spawnPoints.find((item) => item.id === pavilion.id)?.hint ?? '由此起步，按推荐顺序往后巡',
    /** 对齐原图亭子光晕的 4 个点 */
    aligned: index >= 1 && index <= 4,
    flip: point.x > 64,
    /** 山门在最下，殿名翻到圈上方，避免压住底部操作条 */
    above: pavilion.order === 0,
  }
}))

const selectedNode = computed(() =>
  nodes.value.find((node) => node.id === tourSelected.value) ?? null)

/** 一条云路笔意，刻意不逐点连成网状（节点分散时直线会交叉成蜘蛛网） */
const routePath = 'M48 78 C22 68 80 58 30 46 C12 38 82 30 50 20'

function tap(id: string): void {
  // 第二次点同一个落点 = 确认起巡
  if (tourSelected.value === id) startTour(id)
  else tourSelected.value = id
}

function confirmSelection(): void {
  if (tourSelected.value !== null) startTour(tourSelected.value)
}

function startDefault(): void {
  startTour(tour.route.defaultStart)
}
</script>

<template>
  <section class="pt-map" aria-label="选择巡游起始点">
    <!-- 双层背景：LQIP 同步出图；高清 img 未解码时不绘制任何东西，
         下载完成自然盖住 LQIP，无需 JS 判 load（无头截图 / 弱网都不会卡在模糊底图）。[REF V12] -->
    <img class="pt-map__art" :src="tour.backdrop.lqip" alt="" aria-hidden="true" />
    <img class="pt-map__art pt-map__art--full" :src="tour.backdrop.image" alt="" aria-hidden="true" />
    <div class="pt-map__veil" aria-hidden="true"></div>

    <header class="pt-map__head">
      <p class="pt-map__eyebrow">山海八境 · 择一而入</p>
      <h1 class="pt-map__title">{{ tour.hud.selectTitle }}</h1>
      <p class="pt-map__sub">{{ tour.hud.selectSub }}</p>
    </header>

    <!-- 笔势路线：只取一横一撇的走向，不构成「颜」字（C03 极度抽象） -->
    <svg class="pt-map__route" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <path :d="routePath" fill="none" stroke="#6e8f84" stroke-width="1"
        stroke-dasharray="2 5" vector-effect="non-scaling-stroke" opacity="0.22" />
    </svg>

    <button
      v-for="node in nodes"
      :key="node.id"
      type="button"
      class="pt-map__node"
      :class="{
        'pt-map__node--selected': tourSelected === node.id,
        'pt-map__node--aligned': node.aligned,
        'pt-map__node--flip': node.flip,
        'pt-map__node--above': node.above,
      }"
      :style="{ left: `${node.x}%`, top: `${node.y}%` }"
      :aria-pressed="tourSelected === node.id"
      :aria-label="`第 ${node.order} 境 ${node.name}${tourSelected === node.id ? '，再点一次确认' : '，点击选中'}`"
      @click="tap(node.id)"
    >
      <span class="pt-map__ring" aria-hidden="true"></span>
      <span class="pt-map__no" aria-hidden="true">{{ node.order }}</span>
      <span class="pt-map__name">{{ node.name }}</span>
    </button>

    <footer class="pt-map__foot">
      <p class="pt-map__hint" aria-live="polite">
        {{ selectedNode !== null
          ? `第 ${selectedNode.order} 境 · ${selectedNode.name}｜${selectedNode.hint}`
          : '未选择时，默认随小师妹从山门出发。' }}
      </p>
      <div class="pt-map__actions">
        <button v-if="selectedNode" type="button" class="pt-map__primary" @click="confirmSelection">
          {{ tour.hud.confirm }} →
        </button>
        <button v-else type="button" class="pt-map__primary" @click="startDefault">
          {{ tour.hud.startDefault }} →
        </button>
      </div>
      <p class="pt-map__tip">起点会记在链接里，刷新或分享都能回到同一处</p>
    </footer>
  </section>
</template>
