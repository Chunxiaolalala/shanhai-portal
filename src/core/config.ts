/**
 * 全站配置的唯一读取入口。
 * 组件禁止直接 import JSON —— 统一走这里，便于日后接远程配置 / 做字段校验。
 * 规格书 06 章：order 一处改动，同时驱动小师妹飞行顺序、文字索引顺序、罗盘节点顺序。
 */
import casesJson from '@/config/cases.json'
import cursorJson from '@/config/cursor.json'
import evidenceJson from '@/config/evidenceSlots.json'
import pavilionsJson from '@/config/pavilions.json'
import sceneJson from '@/config/scene.json'
import siteJson from '@/config/site.json'
import toolsJson from '@/config/tools.json'
import tourJson from '@/config/tour.json'
import type {
  CaseItem,
  ConceptTool,
  CursorConfig,
  EvidenceSlot,
  Pavilion,
  SceneConfig,
  SiteConfig,
  TourConfig,
  TourSpawnPoint,
} from '@/types/contract'

export const site = siteJson as SiteConfig
export const scene = sceneJson as SceneConfig
/** [REF V06] 御剑侠客序列帧：几何字段由 tools/images/prepare_cursor.py 生成 */
export const cursor = cursorJson as CursorConfig
/** [CH14][REF V12] 竖屏巡游：落点 / 节奏 / 镜头 / HUD 文案 / 性能阈值的唯一来源 */
export const tour = tourJson as TourConfig

/** 按 order 升序；所有导航、罗盘、引导都消费这一份排序结果 */
export const pavilions: Pavilion[] = [...(pavilionsJson.pavilions as Pavilion[])].sort(
  (a, b) => a.order - b.order,
)

export const cases: CaseItem[] = casesJson.cases as CaseItem[]
export const tools: ConceptTool[] = toolsJson.tools as ConceptTool[]
export const evidenceSlots: EvidenceSlot[] = evidenceJson.slots as EvidenceSlot[]

/** 邮箱占位未替换时，组件应渲染提示而不是一个坏掉的 mailto 链接 */
export function isMailConfigured(): boolean {
  return site.mailTo.length > 0 && !site.mailTo.includes('MAIL_TO_BE_FILLED')
}

/** 只返回已发布案例；reserved 槽位交给空态石壁组件 */
export function publishedCases(): CaseItem[] {
  return cases.filter((item) => item.status === 'published')
}

export function reservedCases(): CaseItem[] {
  return cases.filter((item) => item.status === 'reserved')
}

/**
 * [CH14] 竖屏小地图落点：殿阁自带 mobileSpawn 时优先，否则回落 tour.json。
 * 加一座殿却忘了配落点也不会崩——按 order 均匀铺在云海带上。
 */
export function spawnPointFor(id: string): TourSpawnPoint {
  const pavilion = pavilions.find((item) => item.id === id)
  const override = pavilion?.mobileSpawn
  if (override !== undefined && override.length >= 2) {
    return { id, x: override[0], y: override[1] }
  }
  const configured = tour.spawnPoints.find((point) => point.id === id)
  if (configured !== undefined) return configured
  const index = Math.max(0, pavilions.findIndex((item) => item.id === id))
  return { id, x: 18 + (index % 4) * 21, y: 68 + Math.floor(index / 4) * 12 }
}
