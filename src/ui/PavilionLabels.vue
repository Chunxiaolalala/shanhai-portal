<script setup lang="ts">
/**
 * 殿阁 HTML 标签层：3D 投影出来的屏幕坐标 → 可点击、可 tab 的真实按钮。
 * 这是键盘可达与屏幕阅读器的主入口：canvas 本身没有语义，不能只靠射线点击。
 * 标签只占自己那一小块，不遮挡 3D 拖拽热区。
 */
import { computed } from 'vue'
import {
  activePavilionId,
  anchors,
  guidedPavilionId,
  guideEnabled,
  openPavilion,
} from '@/core/journey'
import { pavilions as allPavilions } from '@/core/config'

const labels = computed(() => allPavilions.flatMap((pavilion) => {
  const anchor = anchors.value[pavilion.id]
  if (anchor === undefined || !anchor.visible) return []
  return [{
    pavilion,
    anchor,
    guided: guideEnabled.value && guidedPavilionId.value === pavilion.id,
    active: activePavilionId.value === pavilion.id,
  }]
}))
</script>

<template>
  <div class="labels" aria-label="山海殿阁">
    <button
      v-for="item in labels"
      :key="item.pavilion.id"
      type="button"
      class="labels__item"
      :class="{ 'labels__item--guided': item.guided, 'labels__item--active': item.active }"
      :style="{ left: item.anchor.x + 'px', top: item.anchor.y + 'px' }"
      @click="openPavilion(item.pavilion.id, 'label')"
    >
      <span class="labels__mark" aria-hidden="true"></span>
      <span class="labels__name">{{ item.pavilion.name }}</span>
    </button>
  </div>
</template>
