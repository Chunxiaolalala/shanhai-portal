/**
 * 规格书 06 章「殿阁数据契约」的 TypeScript 镜像。
 * 全站内容走 JSON；加一座殿、加一个案例、加一个 AGENT 场景只改数据，不动 3D 工程。
 * 修改本文件时必须同步 src/config/*.json 的字段，二者是同一份契约的两面。
 */

/** [REF V06] 御剑侠客序列帧光标。几何字段由 tools/images/prepare_cursor.py 生成，勿手改。 */
export interface CursorFrame {
  file: string
  dy: number
  sourceBox: number[]
}

export interface CursorConfig {
  frameCount: number
  cell: number
  sheetWidth: number
  hotspot: { x: number; y: number }
  sprite: string
  static: string
  durationMs: number
  scale: number
  hoverScale: number
  trail: { color: string; glow: number }
  frames: CursorFrame[]
}

export type SlotStatus = 'published' | 'reserved' | 'concept'
export type PavilionRole =
  | 'proof'
  | 'solution'
  | 'acquisition'
  | 'agent'
  | 'tech'
  | 'resume'
  | 'contact'

/**
 * 卷轴内页的区块类型。组件只负责渲染，不写死任何业务内容。
 * claim      一句话主张
 * metric     硬数字 + 一句生意结果（技术词不能单独当卖点）
 * steps      合作路径 / 流程
 * caseRef    引用 cases.json 中已发布案例 → 留影石照壁
 * caseSlot   N 个空卡槽（未启之境）
 * toolRef    引用 tools.json 的 concept 工具
 * evidenceRef 引用 evidenceSlots.json 的佐证图卡槽
 * resume     履历条目
 * cta        联系入口
 */
export type SectionType =
  | 'claim'
  | 'metric'
  | 'steps'
  | 'caseRef'
  | 'caseSlot'
  | 'toolRef'
  | 'evidenceRef'
  | 'resume'
  | 'cta'

/** steps / resume 的通用条目 */
export interface SectionItem {
  label: string
  desc?: string
  period?: string
  value?: string
}

export interface PavilionSection {
  type: SectionType
  title?: string
  text?: string
  desc?: string
  ref?: string
  slot?: number
  label?: string
  value?: string
  href?: string
  status?: SlotStatus
  items?: SectionItem[]
}

export interface Pavilion {
  id: string
  name: string
  order: number
  role: PavilionRole
  /** JSON 里是普通数组；约定长度 3，读取处做默认值兜底 */
  position: number[]
  anchor: string
  /** [V04] 可选 Lux3D 导出的 glb 文件名（放 public/assets/models/，只写文件名）；有则异步替换程序化占位几何 */
  model?: string
  /** [CH14] 竖屏小地图落点 [x%, y%]；缺省时回落 tour.json → spawnPoints */
  mobileSpawn?: number[]
  sections: PavilionSection[]
}

export interface CaseBreakdown {
  /** 场景拆解：客户原本卡在哪，把它变成了什么可点开的东西 */
  scene: string
  /** 技术实现：怎么做的，技术词只在佐证位出现 */
  tech: string
  /** 业务价值：客户拿到了什么结果 */
  value: string
}

export interface CaseItem {
  id: string
  title: string | null
  desc?: string
  biz?: string
  mode?: 'iframe' | 'link' | 'none'
  url?: string
  cover?: string
  mistPreview?: string
  breakdown?: CaseBreakdown
  tags?: string[]
  status: SlotStatus
}

export interface ConceptTool {
  id: string
  title: string
  desc: string
  value: string
  status: 'concept' | 'published'
}

export interface EvidenceSlot {
  id: string
  label: string
  image: string | null
  status: SlotStatus
}

export interface SiteConfig {
  name: string
  claim: string
  claimShort: string
  tagline: string
  mailTo: string
  version: string
}

export interface SceneConfig {
  terrain: {
    seed: number
    segments: number
    radius: number
    height: number
  }
  /** 约定每个锚点为 [x, y, z] */
  cameraAnchors: Record<string, number[]>
  /** 约定 durationMs 为 [min, max] */
  flight: { durationMs: number[]; curve: 'catmullrom' }
  /** 殿阁机位由殿阁位置 + 向外方向推导，加殿不必补机位 */
  cameraApproach: { outward: number; lift: number; lookLift: number; _comment?: string }
  budget: {
    mainBundleKB: number
    sceneAssetsMB: number
    desktopFps: number
    lowEndFps: number
  }
  /** [CH14] 竖屏设备分流参数，可缺省；细节节奏在 tour.json */
  mobile?: {
    enabled: boolean
    narrowPx: number
    preferM1: boolean
  }
}

/** 镜头状态机（规格书 05 章），任意时刻可中断，BACK 回到来路而非起点 */
export type CameraState =
  | 'OVERVIEW'
  | 'FOCUS'
  | 'APPROACH'
  | 'TRANSITION'
  | 'SCROLL'
  | 'BACK'

/* ---------------------------------------------------------------- 第 14 章 · 竖屏巡游 */

/** M0 = 竖版背景 2.5D 第一人称（默认）；M1 = 真 WebGL2 地面第一人称 */
export type TourBackend = 'm0' | 'm1'

/** 与桌面 CameraState 并存的巡游状态机，卷轴由 journey.openPavilion 承载 */
export type TourPhase = 'SELECT' | 'GATE' | 'WALK' | 'ARRIVE' | 'SCROLL' | 'END'

export interface TourSpawnPoint {
  /** 必须对应 pavilions.json 里的 id */
  id: string
  /** 竖版背景百分比坐标 */
  x: number
  y: number
  hint?: string
}

export interface TourConfig {
  version: string
  backdrop: {
    image: string
    lqip: string
    foreground: string
    /** 背景聚焦点 [x%, y%]，用于 cover 时的重点保留 */
    focus: number[]
  }
  spawnPoints: TourSpawnPoint[]
  route: {
    walkMs: number
    arriveMs: number
    defaultStart: string
    loop: boolean
    _comment?: string
  }
  camera: {
    fov: number
    eyeHeight: number
    pitchLimit: number
    yawRange: number
    walkSpeed: number
    followDistance: number
    _comment?: string
  }
  look: {
    maxShiftX: number
    maxShiftY: number
    scaleFrom: number
    scaleTo: number
    _comment?: string
  }
  hud: {
    selectTitle: string
    selectSub: string
    confirm: string
    startDefault: string
    lookHint: string
    arriveHint: string
    endTitle: string
    endSub: string
    restart: string
    exit: string
    backToDesktop: string
  }
  performance: {
    minFps: number
    sampleMs: number
    maxDpr: number
    /** M02 待确认：手机默认是否跑真 3D */
    m1Default: boolean
    _comment?: string
  }
  _comment?: string
}
