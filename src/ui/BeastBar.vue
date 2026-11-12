<script setup lang="ts">
/**
 * [REF V08] 四兽 2D 职能位（C04：全部 2D 动画风，不建 3D 模型）。
 * 形象已定稿：鹿蜀=白身虎纹赤鬃小马｜精卫=白喙赤足胖鸟｜毕方=一足青质白鹤｜烛龙=青鳞金角小龙。
 * 烛龙睁眼 = 昼夜切换｜精卫衔石 = 场景加载｜毕方 = 引导伴飞｜鹿蜀 = 守空卡槽 / 归位。
 * 另放引导开关与总览归位：全程「零焦虑」，任意处可跳过、可返回。
 */
import { computed } from 'vue'
import {
  backToOverview,
  guideEnabled,
  guideDocked,
  toggleGuide,
  timeOfDay,
  toggleTimeOfDay,
} from '@/core/journey'
import { track } from '@/telemetry'
import CharacterImage from '@/ui/CharacterImage.vue'

defineProps<{ backendLabel: string; loading?: boolean }>()

const guideLabel = computed(() =>
  guideEnabled.value && !guideDocked.value ? '跳过引导' : '重新引导')
const timeLabel = computed(() => timeOfDay.value === 'day' ? '烛龙睁眼' : '烛龙闭眼')

function onGuide(): void {
  if (guideEnabled.value && !guideDocked.value) track('guide_skip', {})
  toggleGuide()
}
</script>

<template>
  <div class="beastbar">
    <p class="beastbar__backend">{{ backendLabel }}</p>
    <div class="beastbar__actions">
      <!-- 精卫：只在 3D 初始化期间出现，衔石落定不转圈 -->
      <span v-if="loading" class="beastbar__jingwei" role="status">
        <CharacterImage name="jingwei" class="beastbar__icon" />
        精卫衔石 · 山海将启
      </span>
      <button type="button" @click="toggleTimeOfDay()" :aria-label="timeLabel">
        <CharacterImage name="zhulong" class="beastbar__icon" />
        {{ timeLabel }}
      </button>
      <button type="button" @click="onGuide">
        <CharacterImage name="bifang" class="beastbar__icon" />
        {{ guideLabel }}
      </button>
      <button type="button" @click="backToOverview()">
        <CharacterImage name="lushu" class="beastbar__icon" />
        回到山门
      </button>
    </div>
  </div>
</template>
