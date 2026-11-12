/**
 * [REF V04] 殿阁建筑参考 → references/V04_pavilion_arch/
 * 配置源：references/reference-mapping.json → V04.consumedBy → src/three/buildings/pavilionStyle.ts
 * 状态：pending（参考图未提供前，使用下列兜底默认值；放图后把 MAPPING 的 status 改 ready 再人工标定，不改组件代码）
 *
 * 注意：整座山海地形不交给 Lux3D；这里只描述单体殿阁的飞檐/斗拱/木构配色，
 * 未来由 tools/lux3d/batch.json 生成的 glb 拼装，摆位读 src/config/pavilions.json。
 */
export const PAVILION_STYLE = {
  /** 檐角上翘比例 */
  eave: 0.42,
  /** 斗拱层数 */
  bracket: 2,
  wood: '#8a6a4f',
  tile: '#7e9a8e',
  /** 单体面数上限，规格书 04 章 */
  maxFaces: 30000,
} as const

export type PavilionStyle = typeof PAVILION_STYLE
