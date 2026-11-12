<script setup lang="ts">
/**
 * [REF V05][REF V08] 引导小师妹 + 毕方伴飞（C04：四兽一律 2D 动画风，禁止 3D 建模）。
 * billboard 2D 水彩立绘叠在 3D 上：不占渲染预算、不进 Lux3D、不产生「丑 3D 角色」。
 *
 * 形象已定稿：V05 黄绿水彩小师妹（双丸子头 / 叶饰 / 指尖青绿法术旋涡），
 * V08 毕方作伴飞灵禽。两者都由 CharacterImage 载入透明 WebP；
 * 图缺失时回落到内联 SVG，保证不出现空白引导。
 *
 * 规格书 06 章：按 pavilions.order 在殿阁之间飞；用户点任意殿阁即接管，退到角落待命；
 * 「跳过引导」常驻；全程 pointer-events:none，不遮挡任何点击热区。
 * 月白柔光既遮住水彩白底在青碧山体上的残影，也呼应「指尖法术 / 踏云」设定。
 */
import { computed } from 'vue'
import {
  anchors,
  guideDocked,
  guideEnabled,
  guidedPavilionId,
} from '@/core/journey'
import { pavilions } from '@/core/config'
import CharacterImage from '@/ui/CharacterImage.vue'

const docked = computed(() => guideDocked.value || !guideEnabled.value)
const target = computed(() => {
  if (docked.value) return null
  const anchor = anchors.value[guidedPavilionId.value ?? '']
  return anchor !== undefined && anchor.visible ? anchor : null
})
const style = computed(() => target.value === null
  ? undefined
  : { left: `${target.value.x}px`, top: `${target.value.y - 68}px` })
const nextName = computed(() =>
  pavilions.find((item) => item.id === guidedPavilionId.value)?.name ?? '山门')

// [TEMP] 临时隐藏小师妹身边的毕方伴飞；要恢复伴飞改回 true 即可
const showBifangCompanion = false
</script>

<template>
  <div
    class="shimei"
    :class="{ 'shimei--docked': docked, 'shimei--hidden': target === null && !docked }"
    :style="style"
    aria-hidden="true"
  >
    <div class="shimei__body">
      <!-- 毕方：伴飞的一点亮色，压小尺寸不抢主体 -->
      <CharacterImage v-if="showBifangCompanion" name="bifang" class="shimei__bifang" glow>
        <template #fallback>
          <svg viewBox="0 0 36 24" aria-hidden="true">
            <path d="M2 16 Q10 6 18 14 Q26 6 34 14" fill="none" stroke="#c25a49" stroke-width="2" stroke-linecap="round" />
            <circle cx="18" cy="14" r="2.2" fill="#a8372a" />
          </svg>
        </template>
      </CharacterImage>

      <CharacterImage name="shimei" class="shimei__figure" eager>
        <template #fallback>
          <svg viewBox="0 0 64 72" aria-hidden="true">
            <path d="M6 60 L54 50 L58 53 L10 64 Z" fill="#6e8f84" stroke="#33413c" stroke-width="1.2" />
            <path d="M32 30 C22 34 18 48 18 56 L46 56 C46 48 42 34 32 30 Z" fill="#f8f3e2" stroke="#33413c" stroke-width="1.4" />
            <circle cx="32" cy="20" r="11" fill="#f8f3e2" stroke="#33413c" stroke-width="1.4" />
            <path d="M24 18 Q26 15 29 18 M35 18 Q38 15 40 18" fill="none" stroke="#33413c" stroke-width="1.2" />
            <path d="M29 25 Q32 27 35 25" fill="none" stroke="#a8372a" stroke-width="1.2" />
            <path d="M21 16 Q22 4 32 5 Q42 4 43 16 Q38 11 32 11 Q26 11 21 16 Z" fill="#33413c" />
            <path d="M21 15 Q32 9 43 15" fill="none" stroke="#a8372a" stroke-width="2.4" />
          </svg>
        </template>
      </CharacterImage>
    </div>
    <span v-if="!docked" class="shimei__tip">随我逛 · {{ nextName }}</span>
  </div>
</template>
