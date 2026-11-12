<script setup lang="ts">
/**
 * 规格书 01 章：给赶时间的人的「直梯」——不进 3D 也能看完整份能力清单。
 * 同时也是键盘可达的主入口（3D canvas 本身无法 tab 聚焦）。
 */
import { isMailConfigured, pavilions, site } from '@/core/config'
import { openPavilion } from '@/core/journey'
import { track } from '@/telemetry'
import type { PavilionRole } from '@/types/contract'

const ROLE_LABEL: Record<PavilionRole, string> = {
  proof: '先看成品',
  solution: '提效方案',
  acquisition: '获客工具',
  agent: 'AGENT 场景',
  tech: '技术佐证',
  resume: '履历',
  contact: '入口 / 联系',
}
</script>

<template>
  <nav class="text-index" aria-label="纯文字能力索引">
    <div class="text-index__head">
      <h2>按推荐顺序浏览</h2>
      <p>不想逛山也可以，这里每一条都能直接点开。</p>
    </div>
    <ol>
      <li v-for="item in pavilions" :key="item.id">
        <button type="button" @click="openPavilion(item.id, 'text-index')">
          <span class="text-index__no">{{ String(item.order).padStart(2, '0') }}</span>
          <span class="text-index__name">{{ item.name }}</span>
          <span class="text-index__role">{{ ROLE_LABEL[item.role] }}</span>
        </button>
      </li>
    </ol>
    <p class="text-index__contact">
      <a
        v-if="isMailConfigured()"
        :href="`mailto:${site.mailTo}`"
        @click="track('cta_click', { place: 'text-index' })"
      >直接联系 {{ site.name }} ↗</a>
      <span v-else>联系邮箱待配置（C10）· 改 src/config/site.json 即可生效</span>
    </p>
  </nav>
</template>
