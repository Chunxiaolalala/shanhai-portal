/**
 * [REF V04] Lux3D 导出的殿阁 glb 加载与规整。
 *
 * 设计目标：把图生 3D 的写实模型规整成「可摆进山海场景」的标准单体，
 * 并把 PBR 材质降为 Lambert，贴合全站「低多边形水墨、拒绝 PBR 塑料感」规范（规格书 02 / 10 章）。
 *
 * 归一规则：
 *  - 水平居中（x / z 归零）
 *  - 底面贴地（min.y → 0；外层 wrapper 再把它抬到地形高度）
 *  - 按最大边 fit 到 targetSize（场景单位，与占位几何自然尺寸对齐，约 7）
 *
 * 注意：GLTFLoader 仅在 glb 启用 Draco 压缩时才会去拉解码器；普通非压缩文件不会触发网络请求。
 */
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'

const dracoLoader = new DRACOLoader()
// 解码器走 gstatic CDN：仅当 glb 启用 Draco 压缩时才会被拉取。
// 若要完全自托管：把 node_modules/three/examples/jsm/libs/draco/ 拷到 public/draco/，再改成 '/draco/'。
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/')

const gltfLoader = new GLTFLoader()
gltfLoader.setDRACOLoader(dracoLoader)

export interface LoadedPavilion {
  /** 已居中、贴地、归一缩放的模型根 Group，直接 add 进 wrapper 即可 */
  group: THREE.Group
  /** 释放几何体、原始 PBR 材质与新建 Lambert 材质（含 albedo 贴图由 Three 统一回收） */
  dispose: () => void
}

/**
 * @param url        相对 public 的路径，如 /assets/models/xxx.glb
 * @param targetSize 模型最大边归一到多少场景单位（占位几何自然尺寸约 7，wrapper 再乘 BASE_SCALE）
 */
export async function loadPavilionModel(url: string, targetSize = 7): Promise<LoadedPavilion> {
  const gltf = await gltfLoader.loadAsync(url)
  const group = gltf.scene

  // 1) 归一缩放：先算原始包围盒，按最大边缩放
  let box = new THREE.Box3().setFromObject(group)
  const size = box.getSize(new THREE.Vector3())
  const maxDim = Math.max(size.x, size.y, size.z) || 1
  group.scale.setScalar(targetSize / maxDim)

  // 2) 居中 + 贴地：缩放后重算包围盒
  box = new THREE.Box3().setFromObject(group)
  const center = box.getCenter(new THREE.Vector3())
  group.position.x -= center.x
  group.position.z -= center.z
  group.position.y -= box.min.y // 底面落到 y=0；外层 wrapper 负责抬到地形高度

  // 3) 材质降 PBR → Lambert（保留 albedo 贴图与顶点色），去掉高光塑料感
  const disposables: Array<{
    geometry: THREE.BufferGeometry
    src: THREE.Material
    lambert: THREE.Material
  }> = []
  group.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return
    const src = child.material as THREE.MeshStandardMaterial
    const lambert = new THREE.MeshLambertMaterial({
      side: THREE.DoubleSide,
      transparent: src.transparent ?? false,
      opacity: src.opacity ?? 1,
      vertexColors: (src as unknown as { vertexColors?: boolean }).vertexColors ?? false,
    })
    if (src.map) {
      src.map.colorSpace = THREE.SRGBColorSpace
      lambert.map = src.map
    } else if (src.color) {
      lambert.color.copy(src.color)
    }
    child.material = lambert
    disposables.push({ geometry: child.geometry, src, lambert })
  })

  const dispose = (): void => {
    for (const { geometry, src, lambert } of disposables) {
      geometry.dispose()
      src.dispose()
      lambert.dispose()
    }
  }

  return { group, dispose }
}
