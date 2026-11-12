<script setup lang="ts">
/**
 * 山门首屏：HTML 层同步渲染，不等 WebGL 初始化（规格书 01 章）。
 * 三件套：一句话主张 + 定位 + 行动入口。主张文案来自 src/config/site.json，禁止硬编码。
 * 「先看成品」是给老板的最短路径：不逛山也能一秒看到 demo。
 * 卡片可收起——3D 场景里左上角会挡住两座殿阁，访客看完主张要能自己让开。
 */
import { computed, ref } from 'vue'
import { isMailConfigured, site } from '@/core/config'
import { openPavilion } from '@/core/journey'
import { track } from '@/telemetry'

const collapsed = ref(false)
const mailHref = computed(() => `mailto:${site.mailTo}`)
</script>

<template>
  <header class="gate" :class="{ 'gate--collapsed': collapsed }">
    <button
      type="button"
      class="gate__toggle"
      :aria-expanded="!collapsed"
      @click="collapsed = !collapsed"
    >{{ collapsed ? '展开主张 ▾' : '收起主张 ▴' }}</button>

    <template v-if="!collapsed">
      <p class="gate__eyebrow">{{ site.name }} · OPC</p>
      <h1 class="gate__claim">{{ site.claim }}</h1>
      <p class="gate__tagline">{{ site.tagline }}</p>
      <p class="gate__signature">—— {{ site.name }}</p>
      <div class="gate__actions">
        <button type="button" class="gate__cta gate__cta--proof" @click="openPavilion('yanan-ge', 'gate')">
          先看成品
        </button>
        <a
          v-if="isMailConfigured()"
          class="gate__cta"
          :href="mailHref"
          @click="track('cta_click', { place: 'gate' })"
        >聊聊你的场景</a>
        <span v-else class="gate__cta gate__cta--pending" aria-label="联系邮箱尚未配置">
          联系邮箱待配置（C10）
        </span>
      </div>
    </template>
    <p v-else class="gate__mini">{{ site.name }} · OPC · {{ site.claimShort }}</p>
  </header>
</template>
