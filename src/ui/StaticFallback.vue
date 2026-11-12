<script setup lang="ts">
/**
 * [REF V12] 2D 静态降级视觉：无 WebGL / 移动端 / prefers-reduced-motion / ?mode=static。
 * 不是「坏掉的 3D」——它是同一份内容契约的另一条完整浏览路径，热区、卷轴、索引全部可用。
 * 这里也写入 setAnchors，让小师妹与罗盘在 2D 路径下照常工作。
 */
import { onBeforeUnmount, onMounted } from 'vue'
import { pavilions } from '@/core/config'
import CharacterImage from '@/ui/CharacterImage.vue'
import { openPavilion, setAnchors, type ScreenAnchor } from '@/core/journey'
import type { Pavilion } from '@/types/contract'

const RADIUS = 60

function pointFor(pavilion: Pavilion): { left: number; top: number } {
  const [x = 0, , z = 0] = pavilion.position
  return {
    left: 50 + (x / RADIUS) * 40,
    top: 46 + (z / RADIUS) * 30,
  }
}

function syncAnchors(): void {
  const stage = document.querySelector<HTMLElement>('.stage')
  if (stage === null) return
  const rect = stage.getBoundingClientRect()
  const next: Record<string, ScreenAnchor> = {}
  for (const pavilion of pavilions) {
    const point = pointFor(pavilion)
    next[pavilion.id] = {
      x: (point.left / 100) * rect.width,
      y: (point.top / 100) * rect.height,
      visible: true,
    }
  }
  setAnchors(next)
}

onMounted(() => {
  syncAnchors()
  window.addEventListener('resize', syncAnchors)
})

onBeforeUnmount(() => window.removeEventListener('resize', syncAnchors))
</script>

<template>
  <div class="fallback">
    <svg class="fallback__art" viewBox="0 0 1200 700" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <rect width="1200" height="700" fill="#f8f3e2" />
      <circle cx="920" cy="150" r="86" fill="#f0e5ca" opacity="0.8" />
      <path d="M0 470 L150 350 L280 420 L440 250 L600 400 L760 270 L920 390 L1060 300 L1200 400 L1200 700 L0 700 Z" fill="#d9dfd0" />
      <path d="M0 540 L170 440 L330 500 L500 350 L660 470 L820 380 L1000 480 L1200 420 L1200 700 L0 700 Z" fill="#b9c9bb" />
      <path d="M0 620 L220 540 L420 590 L620 490 L820 570 L1030 520 L1200 570 L1200 700 L0 700 Z" fill="#8eaca2" opacity="0.72" />
      <ellipse cx="600" cy="430" rx="640" ry="52" fill="#f8f3e2" opacity="0.66" />
      <ellipse cx="380" cy="360" rx="420" ry="30" fill="#f8f3e2" opacity="0.5" />
      <g fill="#a8372a" opacity="0.82">
        <path d="M596 244 L604 244 L604 252 L596 252 Z" />
        <path d="M588 252 L612 252 L608 258 L592 258 Z" />
      </g>
      <path d="M600 258 L600 272" stroke="#a8372a" stroke-width="2" opacity="0.7" />
    </svg>

    <!-- [REF V08] 烛龙作天际远景：2D 降级路径也要有山海经气息，淡到不抢殿名热区 -->
    <CharacterImage name="zhulong" class="fallback__zhulong" />

    <button
      v-for="pavilion in pavilions"
      :key="pavilion.id"
      type="button"
      class="fallback__hotspot"
      :style="{ left: pointFor(pavilion).left + '%', top: pointFor(pavilion).top + '%' }"
      @click="openPavilion(pavilion.id, 'static')"
    >
      <span class="fallback__dot" aria-hidden="true"></span>
      <span class="fallback__name">{{ pavilion.name }}</span>
    </button>
    <p class="fallback__hint">2D 山海 · 点击殿名直接展开卷轴</p>
  </div>
</template>
