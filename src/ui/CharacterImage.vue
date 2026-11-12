<script setup lang="ts">
/**
 * [REF V05][REF V08] 角色资产统一入口。
 *
 * 参考图是白底 JPEG（另存时还混进了棋盘格），由 tools/images/prepare_characters.py
 * 统一去底后输出 /assets/characters/*.webp。组件不直接写死图片路径之外的内容：
 * 后续换形象、加表情差分，只改 assets，不动这里的调用方。
 *
 * 资产缺失时走 <slot name="fallback">，保证构建与页面都不崩（MAPPING 约定：
 * status 非 ready 时组件用兜底默认值）。
 */
import { computed, ref } from 'vue'

export type CharacterName = 'shimei' | 'lushu' | 'jingwei' | 'bifang' | 'zhulong'

const props = withDefaults(defineProps<{
  name: CharacterName
  alt?: string
  eager?: boolean
  glow?: boolean
}>(), {
  alt: '',
  eager: false,
  glow: false,
})

const failed = ref(false)
const src = computed(() => `${import.meta.env.BASE_URL}assets/characters/${props.name}.webp`)
</script>

<template>
  <span
    class="character"
    :class="{ 'character--glow': glow }"
    :data-character="name"
  >
    <img
      v-if="!failed"
      :src="src"
      :alt="alt"
      :loading="eager ? 'eager' : 'lazy'"
      decoding="async"
      draggable="false"
      @error="failed = true"
    />
    <span v-else class="character__fallback" aria-hidden="true">
      <slot name="fallback">✧</slot>
    </span>
  </span>
</template>
