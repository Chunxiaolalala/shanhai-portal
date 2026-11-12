<script setup lang="ts">
/**
 * 规格书 04 章：镜头推进 → 门框遮罩 → 卷轴展开。
 * v1 不做 3D 室内漫游，靠这一层给出「进去了」的体感；墨迹用 CSS 径向渐变，不用粒子。
 */
import { transitionMask } from '@/core/journey'
</script>

<template>
  <Transition name="mask">
    <div v-if="transitionMask" class="gate-mask" aria-hidden="true">
      <div class="gate-mask__door gate-mask__door--left"></div>
      <div class="gate-mask__door gate-mask__door--right"></div>
      <div class="gate-mask__ink"></div>
    </div>
  </Transition>
</template>
