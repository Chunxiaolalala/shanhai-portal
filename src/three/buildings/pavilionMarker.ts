/**
 * [REF V04] 殿阁占位几何 → references/V04_pavilion_arch/
 * 配置源：references/reference-mapping.json → V04.consumedBy → src/three/buildings/pavilionStyle.ts
 *
 * 状态：已接。Lux3D 导出的殿阁 glb（pavilions.json 的 model 字段）会在占位几何基础上异步加载并替换，
 * 摆位仍读 src/config/pavilions.json，不改本文件的装配逻辑。未配置 model 的殿继续走程序化占位。
 *
 * 刻意：低多边形折面 + Lambert 无高光 + 朱砂点题，拒绝 PBR 塑料感（规格书 02 / 10 章）。
 * 殿阁只做「单体」，整座山海地形由 mainPeak.ts 程序化生成，不交给 Lux3D。
 */
import * as THREE from 'three'
import { pavilions } from '@/core/config'
import { PAVILION_STYLE } from './pavilionStyle'
import { loadPavilionModel } from './loadPavilionModel'

const WOOD = new THREE.Color(PAVILION_STYLE.wood)
const TILE = new THREE.Color(PAVILION_STYLE.tile)
const STONE = new THREE.Color('#cfc9ad')
const CINNABAR = new THREE.Color('#a8372a')
const INK = new THREE.Color('#33413c')

/** 殿阁在开场机位下的基准缩放；hover 高亮在此基础上微放，不要重置成 1 */
const BASE_SCALE = 1.3
/** glb 模型归一到此自然尺寸（约等于占位几何的自身尺寸，wrapper 再乘 BASE_SCALE） */
const MODEL_TARGET_SIZE = 7

function lambert(color: THREE.Color, opacity = 1): THREE.MeshLambertMaterial {
  return new THREE.MeshLambertMaterial({
    color,
    flatShading: true,
    transparent: opacity < 1,
    opacity,
    side: THREE.DoubleSide,
  })
}

/** 四坡顶：四个檐角上翘，屋脊沿 x 轴。非索引几何 + 折面法线，水墨味靠轮廓不靠贴图 */
function makeRoof(w: number, d: number, baseY: number, roofH: number): THREE.BufferGeometry {
  const rise = PAVILION_STYLE.eave * 2.2
  const corner = [
    new THREE.Vector3(-w, baseY + rise, -d),
    new THREE.Vector3(w, baseY + rise, -d),
    new THREE.Vector3(w, baseY + rise, d),
    new THREE.Vector3(-w, baseY + rise, d),
  ]
  const ridgeL = new THREE.Vector3(-w * 0.42, baseY + roofH, 0)
  const ridgeR = new THREE.Vector3(w * 0.42, baseY + roofH, 0)

  const triangles: THREE.Vector3[] = []
  const tri = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3): void => {
    triangles.push(a, b, c)
  }
  tri(corner[3], corner[2], ridgeR)
  tri(corner[3], ridgeR, ridgeL)
  tri(corner[1], corner[0], ridgeL)
  tri(corner[1], ridgeL, ridgeR)
  tri(corner[0], corner[3], ridgeL)
  tri(corner[2], corner[1], ridgeR)

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(triangles.flatMap((v) => [v.x, v.y, v.z]), 3),
  )
  geometry.computeVertexNormals()
  return geometry
}

function box(
  w: number, h: number, d: number, y: number, color: THREE.Color,
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), lambert(color))
  mesh.position.y = y
  return mesh
}

/** 山门：双柱牌坊 + 朱砂横匾 */
function makeGate(): THREE.Group {
  const group = new THREE.Group()
  for (const x of [-2.4, 2.4]) {
    const pillar = box(0.55, 6, 0.55, 3, WOOD)
    pillar.position.x = x
    group.add(pillar)
  }
  group.add(box(6.4, 0.7, 0.75, 5.6, TILE))
  group.add(box(3.1, 1.05, 0.2, 4.7, CINNABAR))
  return group
}

/** 观星台：六边形月台 + 浑仪环（不写字、不做丑 3D 角色） */
function makePlatform(): THREE.Group {
  const group = new THREE.Group()
  const base = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 4, 1.1, 6), lambert(STONE))
  base.position.y = 0.55
  group.add(base)
  const ring = new THREE.Mesh(new THREE.TorusGeometry(2, 0.16, 4, 24), lambert(CINNABAR))
  ring.position.y = 3.3
  ring.rotation.x = Math.PI * 0.28
  group.add(ring)
  const axis = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 5.4, 6), lambert(WOOD))
  axis.position.y = 3.2
  group.add(axis)
  return group
}

/** 传书亭：四柱无墙，屋顶敞开 */
function makePavilion(open: boolean): THREE.Group {
  const group = new THREE.Group()
  const w = 2.5
  const d = 2.1
  const wallH = 3.3

  const base = new THREE.Mesh(new THREE.CylinderGeometry(3.3, 3.6, 0.9, 6), lambert(STONE))
  base.position.y = 0.45
  group.add(base)

  if (open) {
    for (const x of [-w, w]) {
      for (const z of [-d, d]) {
        const pillar = box(0.42, wallH, 0.42, 0.9 + wallH / 2, WOOD)
        pillar.position.x = x
        pillar.position.z = z
        group.add(pillar)
      }
    }
    group.add(box(1.5, 0.42, 1.5, 1.5, CINNABAR))
  } else {
    group.add(box(w * 1.8, wallH, d * 1.8, 0.9 + wallH / 2, WOOD))
    // 朱砂门匾：唯一明确的点题色
    const plaque = box(1.9, 0.62, 0.16, 0.9 + wallH * 0.72, CINNABAR)
    plaque.position.z = d * 0.92 + 0.08
    group.add(plaque)
  }

  const roofY = 0.9 + wallH
  const roofGeo = makeRoof(w * 1.28, d * 1.32, roofY, 2.5)
  group.add(new THREE.Mesh(roofGeo, lambert(TILE)))

  // 屋脊与檐口轮廓线：1px 墨线，比贴图更贴「平面化插画质感」
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(roofGeo, 18),
    new THREE.LineBasicMaterial({ color: INK, transparent: true, opacity: 0.32 }),
  )
  group.add(edges)

  // 斗拱层：PAVILION_STYLE.bracket 决定层数
  for (let i = 0; i < PAVILION_STYLE.bracket; i += 1) {
    const bracket = box(w * 2.1 + i * 0.22, 0.16, d * 2.1 + i * 0.22, roofY - 0.2 - i * 0.28, TILE)
    group.add(bracket)
  }
  return group
}

function tag(object: THREE.Object3D, id: string): void {
  object.userData.pavilionId = id
  object.traverse((child) => { child.userData.pavilionId = id })
}

function disposeGroup(object: THREE.Object3D): void {
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh || child instanceof THREE.LineSegments)) return
    child.geometry.dispose()
    const materials = Array.isArray(child.material) ? child.material : [child.material]
    for (const material of materials) material.dispose()
  })
}

export interface PavilionMarkers {
  group: THREE.Group
  clickables: THREE.Object3D[]
  /** 供投影计算屏幕锚点：HTML 标签、罗盘、小师妹共用 */
  nodes: Map<string, THREE.Group>
  setHighlight: (id: string | null) => void
  dispose: () => void
}

/**
 * 摆位读 pavilions.json 的 x/z；y 一律取地形高度，避免配置里的 y 让殿阁浮空或埋进山里。
 * 加一座殿只要改 JSON，这里自动多生成一座。
 * 若某殿带 model 字段，则异步加载 Lux3D glb 替换占位几何，期间先显示占位、加载完无缝切到模型。
 */
export function createPavilionMarkers(heightAt: (x: number, z: number) => number): PavilionMarkers {
  const group = new THREE.Group()
  group.name = 'pavilion-markers'
  const nodes = new Map<string, THREE.Group>()
  const clickables: THREE.Object3D[] = []
  const loadedDisposers: Array<() => void> = []
  let disposed = false

  for (const pavilion of pavilions) {
    const [x = 0, , z = 0] = pavilion.position
    // 稳定的 wrapper：承载摆位（位置 / 旋转 / 基准缩放）与高亮，模型替换时不动它
    const wrapper = new THREE.Group()
    wrapper.name = `pavilion-${pavilion.id}`

    let marker: THREE.Group
    if (pavilion.anchor === 'gate') marker = makeGate()
    else if (pavilion.anchor === 'platform') marker = makePlatform()
    else marker = makePavilion(pavilion.anchor === 'table')

    wrapper.add(marker)
    wrapper.position.set(x, heightAt(x, z) + 0.15, z)
    // 实测：山半径 60，原尺寸殿阁在开场机位里太小；统一放大到基准 1.3
    wrapper.scale.setScalar(BASE_SCALE)
    // 让门面大致朝向山外，避免 8 座殿全部一个朝向显得像复制粘贴
    wrapper.rotation.y = Math.atan2(x, z) * 0.55
    tag(wrapper, pavilion.id)
    nodes.set(pavilion.id, wrapper)
    group.add(wrapper)

    // 若有 Lux3D glb，异步加载并替换占位；加载期间与失败都保留占位几何
    if (pavilion.model !== undefined) {
      loadPavilionModel(`${import.meta.env.BASE_URL}assets/models/${pavilion.model}`, MODEL_TARGET_SIZE)
        .then(({ group: modelGroup, dispose: disposeModel }) => {
          if (disposed) {
            disposeModel()
            return
          }
          wrapper.remove(marker)
          disposeGroup(marker)
          modelGroup.traverse((child) => {
            if (child instanceof THREE.Mesh) child.userData.fromModel = true
          })
          wrapper.add(modelGroup)
          tag(modelGroup, pavilion.id)
          rebuildClickables()
          loadedDisposers.push(disposeModel)
        })
        .catch((err) => {
          console.warn(`[pavilionMarker] 加载 ${pavilion.model} 失败，保留占位几何`, err)
        })
    }
  }

  function rebuildClickables(): void {
    clickables.length = 0
    group.traverse((child) => {
      if (child instanceof THREE.Mesh) clickables.push(child)
    })
  }
  rebuildClickables()

  let highlighted: string | null = null
  function setHighlight(id: string | null): void {
    if (highlighted === id) return
    if (highlighted !== null) nodes.get(highlighted)?.scale.setScalar(BASE_SCALE)
    highlighted = id
    if (id !== null) nodes.get(id)?.scale.setScalar(BASE_SCALE * 1.09)
  }

  function dispose(): void {
    disposed = true
    for (const disposeModel of loadedDisposers) disposeModel()
    loadedDisposers.length = 0
    group.traverse((child) => {
      if (!(child instanceof THREE.Mesh || child instanceof THREE.LineSegments)) return
      // 来自 glb 的网格：几何体与材质已由 loadedDisposers 释放，跳过避免重复 dispose
      if (child.userData.fromModel) return
      child.geometry.dispose()
      const materials = Array.isArray(child.material) ? child.material : [child.material]
      for (const material of materials) material.dispose()
    })
  }

  return { group, clickables, nodes, setHighlight, dispose }
}
