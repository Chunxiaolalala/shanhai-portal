<script setup lang="ts">
/**
 * 案例「入境」层：古风画框包住现代 demo（规格书 7.3）。
 * - iframe **懒加载**：只有点开才创建，关闭即销毁，不常驻 WebGL context。
 * - 主山海渲染的暂停/恢复由 ScrollPanel 按 scrollOpen 统一驱动（卷轴开即暂停），
 *   这里不再各自 pause/resume，避免嵌套组件重复恢复。
 * - 常驻「打开原页面」兜底：demo 依赖 jsdelivr importmap，第三方 CDN 不稳时仍可看。
 * - 移动端不嵌 iframe（全屏 canvas + 独立循环体验差），改封面 + 新标签。
 * - 卡片固定三段式：场景拆解 → 技术实现 → 业务价值。展示的是「拆场景的能力」，不是 demo 本身。
 */
import { computed, onMounted, ref } from 'vue'
import { track } from '@/telemetry'
import InkPlaceholder from './InkPlaceholder.vue'
import type { CaseItem } from '@/types/contract'

const props = defineProps<{ caseItem: CaseItem }>()
const emit = defineEmits<{ close: [] }>()

const coverFailed = ref(false)
const isCoarse = ref(false)
const url = computed(() => props.caseItem.url ?? '')
const breakdown = computed(() => props.caseItem.breakdown)

// ESC 由 ScrollPanel 统一处理（一次只关一层），这里不另挂 window 监听，
// 否则两个 listener 会在同一次按键里把案例和卷轴一起关掉。
onMounted(() => {
  isCoarse.value = window.matchMedia('(pointer: coarse)').matches
  track('case_open', { id: props.caseItem.id })
})
</script>

<template>
  <section class="viewer" role="dialog" aria-modal="true" :aria-label="caseItem.title ?? '案例'">
    <header class="viewer__head">
      <div>
        <p class="viewer__eyebrow">留影石 · 入境</p>
        <h3>{{ caseItem.title }}</h3>
        <p class="viewer__biz">{{ caseItem.biz }}</p>
      </div>
      <button type="button" class="viewer__close" @click="emit('close')" aria-label="关闭并回到卷轴">
        收卷 ✕
      </button>
    </header>

    <div class="viewer__frame">
      <iframe
        v-if="!isCoarse && caseItem.mode === 'iframe' && url"
        :src="url"
        :title="caseItem.title ?? '在线 demo'"
        loading="lazy"
        referrerpolicy="no-referrer"
        allow="fullscreen"
      ></iframe>
      <div v-else class="viewer__cover">
        <img
          v-if="caseItem.cover && !coverFailed"
          :src="caseItem.cover"
          alt=""
          @error="coverFailed = true"
        />
        <InkPlaceholder v-else label="移动端请打开原页面查看" variant="case" />
      </div>
      <a v-if="url" class="viewer__external" :href="url" target="_blank" rel="noopener noreferrer">
        在新标签打开原页面 ↗
      </a>
    </div>

    <div v-if="breakdown" class="viewer__breakdown">
      <div><span>场景拆解</span><p>{{ breakdown.scene }}</p></div>
      <div><span>技术实现</span><p>{{ breakdown.tech }}</p></div>
      <div><span>业务价值</span><p>{{ breakdown.value }}</p></div>
    </div>
    <p v-if="caseItem.tags?.length" class="viewer__tags">
      <span v-for="tag in caseItem.tags" :key="tag">{{ tag }}</span>
    </p>
  </section>
</template>
