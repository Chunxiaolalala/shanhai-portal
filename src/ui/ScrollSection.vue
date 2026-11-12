<script setup lang="ts">
/**
 * 卷轴区块渲染器：只认 src/config/*.json 的数据，不写死任何业务内容。
 * 规格书 06 章 —— 加一个企业级场景只改 JSON，不动 3D 工程、不动组件。
 */
import { computed } from 'vue'
import { cases, evidenceSlots, isMailConfigured, site, tools } from '@/core/config'
import { track } from '@/telemetry'
import CaseStone from './CaseStone.vue'
import InkPlaceholder from './InkPlaceholder.vue'
import type { PavilionSection } from '@/types/contract'

const props = defineProps<{ section: PavilionSection }>()
const emit = defineEmits<{ openCase: [id: string] }>()

const referencedCase = computed(() =>
  cases.find((item) => item.id === props.section.ref) ?? null,
)
const slotItems = computed(() => props.section.items ?? [])
const mailHref = computed(() => `mailto:${site.mailTo}`)
</script>

<template>
  <section class="sec" :class="`sec--${section.type}`">
    <!-- 一句话主张 -->
    <template v-if="section.type === 'claim'">
      <h3 v-if="section.title" class="sec__title">{{ section.title }}</h3>
      <p class="sec__claim">{{ section.text }}</p>
    </template>

    <!-- 硬数字：技术词后面必须跟一句生意结果 -->
    <template v-else-if="section.type === 'metric'">
      <div class="metric">
        <strong class="metric__value">{{ section.value }}</strong>
        <div>
          <span class="metric__label">{{ section.label }}</span>
          <p class="metric__desc">{{ section.desc }}</p>
        </div>
      </div>
    </template>

    <!-- 合作路径 -->
    <template v-else-if="section.type === 'steps'">
      <h3 class="sec__title">{{ section.title }}</h3>
      <ol class="steps">
        <li v-for="(item, index) in slotItems" :key="item.label">
          <span class="steps__no">{{ index + 1 }}</span>
          <div>
            <strong>{{ item.label }}</strong>
            <p>{{ item.desc }}</p>
          </div>
        </li>
      </ol>
    </template>

    <!-- 已发布案例 → 留影石照壁 -->
    <template v-else-if="section.type === 'caseRef' && referencedCase">
      <CaseStone
        :title="referencedCase.title"
        :desc="referencedCase.biz"
        status="published"
        :preview="referencedCase.mistPreview"
        @open="emit('openCase', referencedCase.id)"
      />
      <div v-if="referencedCase.breakdown" class="case-brief">
        <div><span>场景拆解</span><p>{{ referencedCase.breakdown.scene }}</p></div>
        <div><span>技术实现</span><p>{{ referencedCase.breakdown.tech }}</p></div>
        <div><span>业务价值</span><p>{{ referencedCase.breakdown.value }}</p></div>
      </div>
    </template>

    <!-- 空卡槽：未启之境 -->
    <template v-else-if="section.type === 'caseSlot'">
      <h3 class="sec__title">{{ section.title }}</h3>
      <p v-if="section.desc" class="sec__note">{{ section.desc }}</p>
      <div class="stone-grid">
        <CaseStone
          v-for="item in slotItems"
          :key="item.label"
          :title="item.label"
          :desc="item.desc"
          :status="section.status"
        />
      </div>
    </template>

    <!-- 引客台：concept 工具，不承诺已落地 -->
    <template v-else-if="section.type === 'toolRef'">
      <h3 class="sec__title">{{ section.title }}</h3>
      <div class="tool-grid">
        <article v-for="tool in tools" :key="tool.id" class="tool">
          <span class="tool__badge">{{ tool.status === 'concept' ? '方向示例' : '已上线' }}</span>
          <h4>{{ tool.title }}</h4>
          <p>{{ tool.desc }}</p>
          <p class="tool__value">客户拿到的：{{ tool.value }}</p>
        </article>
      </div>
    </template>

    <!-- 观星台佐证：图片卡槽，图没放时显示线稿占位 -->
    <template v-else-if="section.type === 'evidenceRef'">
      <h3 class="sec__title">{{ section.title }}</h3>
      <p v-if="section.desc" class="sec__note">{{ section.desc }}</p>
      <div class="evidence-grid">
        <figure v-for="slot in evidenceSlots" :key="slot.id">
          <img v-if="slot.image" :src="slot.image" :alt="slot.label" />
          <InkPlaceholder v-else :label="slot.label + ' · 截图待补'" variant="evidence" />
          <figcaption>{{ slot.label }}</figcaption>
        </figure>
      </div>
    </template>

    <!-- 履历 -->
    <template v-else-if="section.type === 'resume'">
      <ol class="timeline">
        <li v-for="item in slotItems" :key="item.label">
          <span class="timeline__period">{{ item.period }}</span>
          <div>
            <strong>{{ item.label }}</strong>
            <p>{{ item.desc }}</p>
          </div>
        </li>
      </ol>
    </template>

    <!-- 传书亭 -->
    <template v-else-if="section.type === 'cta'">
      <a
        v-if="isMailConfigured()"
        class="sec__cta"
        :href="mailHref"
        @click="track('cta_click', { place: 'scroll' })"
      >{{ section.text }} ↗</a>
      <p v-else class="sec__cta sec__cta--pending">联系邮箱待配置（C10）</p>
    </template>
  </section>
</template>
