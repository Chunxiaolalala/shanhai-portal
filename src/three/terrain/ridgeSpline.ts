/**
 * [REF V02] 主山脊笔势 → references/V02_yan_glyph/yan-reference.jpg
 * 配置源：references/reference-mapping.json → V02.consumedBy → src/three/terrain/ridgeSpline.ts
 * 状态：ready（图已提供；下列控制点为待人工标定的占位，按手写「颜」字的「页」部一横一撇节奏预置）
 *
 * C03「极度抽象」硬约束：只取笔意的起承转合，绝不构成任何字形。
 * 这些点是山脊的走向，不是字的轮廓；不要把它们画出来、描边或做成贴图。
 * 图本身不上线，只给开发对照。
 */

/** 归一化到 [-1, 1] 的 [x, z] 控制点：起笔平缓一横 → 转撇向左下收势 */
export const RIDGE_CONTROL_POINTS: readonly (readonly [number, number])[] = [
  [-0.9, 0.12],
  [-0.45, 0.17],
  [0.05, 0.2],
  [0.42, 0.08],
  [0.3, -0.28],
  [0.04, -0.62],
] as const

/** 在给定 x 上求脊线的 z；控制点之外做端点保持，不产生额外折线 */
export function ridgeZAt(xNorm: number): number {
  const pts = RIDGE_CONTROL_POINTS
  if (xNorm <= pts[0][0]) return pts[0][1]
  const last = pts[pts.length - 1]
  if (xNorm >= last[0]) return last[1]

  for (let i = 0; i < pts.length - 1; i += 1) {
    const a = pts[i]
    const b = pts[i + 1]
    if (xNorm >= a[0] && xNorm <= b[0]) {
      const t = (xNorm - a[0]) / (b[0] - a[0])
      return a[1] + (b[1] - a[1]) * t
    }
  }
  return last[1]
}

/**
 * 脊线影响强度 0..1，供主峰高度函数叠加。
 * x/z 为世界坐标，radius 为地形半径。
 */
export function ridgeInfluence(x: number, z: number, radius: number): number {
  const xNorm = x / radius
  const zNorm = z / radius
  const distance = Math.abs(zNorm - ridgeZAt(xNorm))
  return Math.max(0, 1 - distance / 0.42)
}
