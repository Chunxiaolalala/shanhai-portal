/**
 * [REF V01] 雾参数 → references/V01_moodboard/mood-master.png
 * 配置源：references/reference-mapping.json → V01.consumedBy → src/three/materials/fog.ts
 * 状态：ready（色值取自母版月白 #F8F3E2；雾浓度已按无头浏览器实测标定：0.0042 太浓、山体发灰，收到 0.0026）
 *
 * 用 FogExp2 而非 Fog：水墨雾是需要连续衰减的空气感，near/far 硬切会出边界线。
 */
export const FOG = {
  /** 与 tokens.css --moon 对应 */
  color: 0xf8f3e2,
  density: 0.0026,
  ambientIntensity: 1.0,
} as const

export type FogParams = typeof FOG
