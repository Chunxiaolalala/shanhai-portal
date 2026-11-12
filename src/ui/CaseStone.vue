<script setup lang="ts">
/**
 * [REF V11] 留影石照壁（C05 确认方案）
 * 表面只有朱砂刻字的大石名称；HOVER / focus 才浮出一团白雾，雾里显示**静态例图**。
 * 现代 demo 不贴石面上，也不在 hover 时跑 iframe —— 多次悬停不吃性能。
 * 移动端无 hover：点第一下出雾、第二下才入境；键盘 tabindex / Enter / Esc 全通路。
 */
import { computed, ref } from 'vue'
import InkPlaceholder from './InkPlaceholder.vue'
import type { SlotStatus } from '@/types/contract'

const props = withDefaults(defineProps<{
  title: string | null
  desc?: string
  status?: SlotStatus
  preview?: string
  hint?: string
}>(), {
  desc: '',
  status: 'reserved',
  preview: '',
  hint: '',
})

const emit = defineEmits<{ open: [] }>()

const mistShown = ref(false)
const imgFailed = ref(false)
const armed = ref(false)
const isPublished = computed(() => props.status === 'published')
const displayTitle = computed(() => props.title ?? '未启之境')

function reveal(): void {
  mistShown.value = true
}

function activate(): void {
  if (!isPublished.value) {
    // 空卡槽：只出雾，不入境；零焦虑，没有任何「还没做好」的惩罚性提示
    mistShown.value = true
    return
  }
  const coarse = typeof window !== 'undefined'
    && window.matchMedia('(pointer: coarse)').matches
  if (coarse && !mistShown.value) {
    mistShown.value = true
    armed.value = true
    return
  }
  if (coarse && !armed.value) {
    armed.value = true
    return
  }
  emit('open')
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    mistShown.value = false
    armed.value = false
    return
  }
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    activate()
  }
}
</script>

<template>
  <div
    class="stone"
    :class="{ 'stone--published': isPublished, 'stone--mist': mistShown }"
    tabindex="0"
    role="button"
    :aria-label="`${displayTitle}${isPublished ? '，' + hint : '，尚未启用'}`"
    :aria-expanded="mistShown"
    @mouseenter="reveal"
    @mouseleave="mistShown = false"
    @focus="reveal"
    @blur="mistShown = false"
    @click="activate"
    @keydown="onKeydown"
  >
    <div class="stone__face">
      <span class="stone__seal" aria-hidden="true">案</span>
      <h4 class="stone__title">{{ displayTitle }}</h4>
      <p v-if="desc" class="stone__desc">{{ desc }}</p>
      <span class="stone__status">{{ isPublished ? hint : '未启之境 · 台基已备' }}</span>
    </div>

    <div class="stone__mist" :class="{ 'stone__mist--on': mistShown }" aria-hidden="true">
      <div class="stone__mist-inner">
        <img
          v-if="preview && !imgFailed"
          :src="preview"
          alt=""
          @error="imgFailed = true"
        />
        <InkPlaceholder
          v-else
          :label="isPublished ? '例图待补 · 见真实 demo' : '待填入的场景'"
          variant="case"
        />
        <span class="stone__mist-tip">{{ isPublished ? '点击入境' : '位置已留 · 案例配置化投放' }}</span>
      </div>
    </div>
  </div>
</template>
