/**
 * [REF V02] 水脉笔势 → references/V02_yan_glyph/yan-reference.jpg
 * 配置源：references/reference-mapping.json → V02.consumedBy → src/three/terrain/waterSpline.ts
 * 状态：ready
 *
 * 借手写「颜」字「彦」部三撇的节奏：三条由右上向左下、间距递增的水脉。
 * 同样只取节奏，不构成字形；上线时是环状云带 / 水脉，不是字。
 */

export interface WaterVein {
  readonly id: string
  /** 归一化控制点 [x, z]，右上 → 左下 */
  readonly points: readonly (readonly [number, number])[]
  readonly width: number
}

export const WATER_VEINS: readonly WaterVein[] = [
  {
    id: 'vein-1',
    points: [
      [0.82, 0.55],
      [0.5, 0.3],
      [0.12, 0.08],
      [-0.3, -0.12],
    ],
    width: 0.09,
  },
  {
    id: 'vein-2',
    points: [
      [0.7, 0.12],
      [0.38, -0.12],
      [0.0, -0.34],
      [-0.44, -0.54],
    ],
    width: 0.07,
  },
  {
    id: 'vein-3',
    points: [
      [0.55, -0.3],
      [0.24, -0.52],
      [-0.16, -0.72],
    ],
    width: 0.05,
  },
] as const

/** 水脉处压低地形，形成环山云带 / 弱水的凹陷（返回 0..1 的下压强度） */
export function waterDepression(x: number, z: number, radius: number): number {
  const xNorm = x / radius
  const zNorm = z / radius
  let strongest = 0

  for (const vein of WATER_VEINS) {
    const pts = vein.points
    for (let i = 0; i < pts.length - 1; i += 1) {
      const a = pts[i]
      const b = pts[i + 1]
      const dx = b[0] - a[0]
      const dy = b[1] - a[1]
      const lenSq = dx * dx + dy * dy
      if (lenSq === 0) continue
      const t = Math.max(0, Math.min(1, ((xNorm - a[0]) * dx + (zNorm - a[1]) * dy) / lenSq))
      const px = a[0] + dx * t
      const py = a[1] + dy * t
      const distance = Math.hypot(xNorm - px, zNorm - py)
      const strength = Math.max(0, 1 - distance / vein.width)
      if (strength > strongest) strongest = strength
    }
  }
  return strongest
}
