<script setup lang="ts">
/**
 * [REF V11][REF V14] 例图 / 佐证图未到位时的程序化水墨占位。
 * 不编造「假案例截图」：线稿明确是占位，等真实图片放进 public/assets/ 后由 <img> 自动接管。
 */
withDefaults(defineProps<{
  label?: string
  variant?: 'case' | 'evidence'
}>(), {
  label: '图待补',
  variant: 'case',
})
</script>

<template>
  <div class="ink-placeholder" role="img" :aria-label="label">
    <svg viewBox="0 0 320 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <rect width="320" height="200" fill="#f3eedc" />
      <path d="M0 150 L48 116 L92 138 L146 92 L202 132 L256 104 L320 140 L320 200 L0 200 Z" fill="#d9dfd0" />
      <path d="M0 168 L60 146 L118 166 L180 138 L240 162 L320 144 L320 200 L0 200 Z" fill="#b9c9bb" />
      <g v-if="variant === 'case'" fill="none" stroke="#6e8f84" stroke-width="1.4" opacity="0.75">
        <path d="M120 152 L120 74 L164 58 L208 74 L208 152" />
        <path d="M120 74 L208 74 M120 96 L208 96 M120 118 L208 118 M120 140 L208 140" />
        <path d="M164 58 L164 152 M120 152 L100 164 L188 164 L208 152" />
        <path d="M138 74 L138 152 M186 74 L186 152" stroke-dasharray="4 4" />
      </g>
      <g v-else fill="none" stroke="#6e8f84" stroke-width="1.2" opacity="0.7">
        <circle cx="160" cy="86" r="42" />
        <circle cx="160" cy="86" r="26" />
        <path d="M96 86 H224 M160 22 V150 M118 44 L202 128 M202 44 L118 128" />
        <circle cx="160" cy="86" r="4" fill="#a8372a" stroke="none" />
      </g>
      <g fill="#ffffff" opacity="0.55">
        <ellipse cx="66" cy="52" rx="42" ry="9" />
        <ellipse cx="252" cy="40" rx="36" ry="7" />
      </g>
    </svg>
    <span class="ink-placeholder__label">{{ label }}</span>
  </div>
</template>
