<script setup lang="ts">
/**
 * 罗盘小地图：殿阁按 order 落在笔势走向的节点上（C03 极度抽象——只取笔意，不构成字形）。
 * 朱砂方印「颜」是全站唯一明确见字处。鹿蜀守着未启之境的空卡槽。
 * [REF V02][REF V10] 位置与印章形制待参考图 ready 后微调，节点仍由 order 驱动。
 */
import { computed } from 'vue'
import { pavilions } from '@/core/config'
import CharacterImage from '@/ui/CharacterImage.vue'
import {
  activePavilionId,
  guidedPavilionId,
  guideEnabled,
  openPavilion,
} from '@/core/journey'

/** 沿一横一撇 + 三撇节奏散布，刻意不排成规整圆环 */
const NODES: readonly (readonly [number, number])[] = [
  [60, 17], [34, 32], [86, 38], [28, 60],
  [88, 66], [60, 82], [34, 99], [92, 101],
]

const nodes = computed(() => pavilions.map((pavilion, index) => ({
  pavilion,
  x: NODES[index % NODES.length][0],
  y: NODES[index % NODES.length][1],
  active: activePavilionId.value === pavilion.id,
  guided: guideEnabled.value && guidedPavilionId.value === pavilion.id,
})))
</script>

<template>
  <aside class="compass" aria-label="山海罗盘 · 按推荐顺序浏览">
    <svg viewBox="0 0 120 120" class="compass__dial" aria-hidden="true">
      <circle cx="60" cy="60" r="57" fill="rgba(248,243,226,0.78)" stroke="#8eaca2" stroke-width="1" />
      <circle cx="60" cy="60" r="50" fill="none" stroke="#a8bcae" stroke-width="0.6" stroke-dasharray="2 4" />
      <path d="M18 46 Q44 34 60 52 Q78 72 102 56" fill="none" stroke="#a8bcae" stroke-width="0.8" opacity="0.8" />
      <path d="M30 78 Q52 70 74 88" fill="none" stroke="#a8bcae" stroke-width="0.8" opacity="0.7" />
      <g
        v-for="node in nodes"
        :key="node.pavilion.id"
        class="compass__node"
        role="button"
        tabindex="0"
        :aria-label="`第 ${node.pavilion.order} 境 ${node.pavilion.name}`"
        @click="openPavilion(node.pavilion.id, 'compass')"
        @keydown.enter.prevent="openPavilion(node.pavilion.id, 'compass')"
        @keydown.space.prevent="openPavilion(node.pavilion.id, 'compass')"
      >
        <title>{{ node.pavilion.name }}</title>
        <circle
          :cx="node.x" :cy="node.y" r="6.5"
          :fill="node.active ? '#a8372a' : '#f8f3e2'"
          :stroke="node.guided ? '#a8372a' : '#6e8f84'"
          stroke-width="1.4"
          :class="{ 'compass__pulse': node.guided }"
        />
        <text :x="node.x" :y="node.y + 2.6" text-anchor="middle" font-size="6"
          :fill="node.active ? '#f8f3e2' : '#33413c'">{{ node.pavilion.order }}</text>
      </g>
      <!-- 唯一明确见字处 -->
      <rect x="51" y="51" width="18" height="18" rx="2" fill="#a8372a" />
      <text x="60" y="63.5" text-anchor="middle" font-size="12" fill="#f8f3e2" font-family="serif">颜</text>
    </svg>
    <div class="compass__buttons">
      <button
        v-for="node in nodes"
        :key="node.pavilion.id"
        type="button"
        :class="{ 'compass__btn--active': node.active }"
        @click="openPavilion(node.pavilion.id, 'compass')"
      >{{ node.pavilion.order }} {{ node.pavilion.name }}</button>
    </div>
    <p class="compass__lushu">
      <CharacterImage name="lushu" class="compass__beast" />
      <span aria-hidden="true">✧</span> 鹿蜀守境
    </p>
  </aside>
</template>
