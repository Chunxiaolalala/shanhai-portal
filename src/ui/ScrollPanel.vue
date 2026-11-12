<script setup lang="ts">
/**
 * 规格书 04 章「v1 的走进建筑」＝ 镜头推进 → 门框遮罩 → 古风卷轴展开。
 * 第一人称室内漫游整体留给 v2；这里用 2D 卷轴承载殿内全部内容。
 *
 * 返回规则：ESC / 收卷回到「来路」；「回到山门」是显式的全站归位。
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  activePavilion,
  backToOverview,
  closeScroll,
  pauseScene,
  resumeScene,
  scrollOpen,
} from '@/core/journey'
import { cases } from '@/core/config'
import { site } from '@/core/config'
import { dropTour, portraitActive } from '@/core/tour'
import CaseViewer from './CaseViewer.vue'
import ScrollSection from './ScrollSection.vue'

const openCaseId = ref<string | null>(null)
const openCase = computed(() => cases.find((item) => item.id === openCaseId.value) ?? null)

function onKeydown(event: KeyboardEvent): void {
  if (event.key !== 'Escape' || !scrollOpen.value) return
  // 一次 Esc 只关一层：先看案例，再收卷轴
  if (openCaseId.value !== null) {
    openCaseId.value = null
    return
  }
  closeScroll()
}

function closeViewer(): void {
  openCaseId.value = null
}

function leave(): void {
  openCaseId.value = null
  closeScroll()
}

function home(): void {
  openCaseId.value = null
  // [CH14] 竖屏巡游里「回到山门」= 重选起点；先改 phase 再收卷，
  // 否则 watch(scrollOpen) 会误判成「本站看完」继续走向下一境。
  if (portraitActive.value) {
    dropTour('restart')
    closeScroll()
  } else {
    backToOverview()
  }
}

// 卷轴层是常驻组件，只有内部 v-if 控制显隐。
// 暂停/恢复必须由 scrollOpen 的变化驱动，写在 onMounted 会在首屏就误停 3D。
watch(scrollOpen, (open) => {
  if (open) pauseScene()
  else resumeScene()
})

onMounted(() => window.addEventListener('keydown', onKeydown))

onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <Transition name="scroll">
    <div v-if="scrollOpen && activePavilion" class="scroll-layer">
      <div class="scroll-layer__veil" @click="leave"></div>

      <article class="scroll" role="dialog" aria-modal="true" :aria-label="`${activePavilion.name} 卷轴`">
        <div class="scroll__rod scroll__rod--top" aria-hidden="true"></div>
        <header class="scroll__head">
          <div class="scroll__brand">
            <span class="scroll__seal" aria-hidden="true">颜</span>
            <div>
              <p class="scroll__eyebrow">{{ site.name }} · OPC · 第 {{ activePavilion.order }} 境</p>
              <h2>{{ activePavilion.name }}</h2>
            </div>
          </div>
          <button type="button" class="scroll__close" @click="leave" aria-label="收起卷轴并回到来路">
            收卷 ✕
          </button>
        </header>

        <div class="scroll__body">
          <CaseViewer
            v-if="openCase"
            :case-item="openCase"
            @close="closeViewer"
          />
          <template v-else>
            <ScrollSection
              v-for="(section, index) in activePavilion.sections"
              :key="`${activePavilion.id}-${index}`"
              :section="section"
              @open-case="openCaseId = $event"
            />
          </template>
        </div>

        <footer class="scroll__foot">
          <button type="button" @click="leave">← 回到来路</button>
          <span class="scroll__foot-note"></span>
          <button type="button" @click="home">{{ portraitActive ? '重选起点' : '回到山门' }}</button>
        </footer>
        <div class="scroll__rod scroll__rod--bottom" aria-hidden="true"></div>
      </article>
    </div>
  </Transition>
</template>
